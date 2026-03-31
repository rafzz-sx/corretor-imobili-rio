//=============================================
//  TRACKER DE VISITAS v3.0 — Leandro Imóveis
//  Correções: mobile, presença ao vivo, sessionStorage fallback
// =============================================

(function() {
    'use strict';

    // ── Storage seguro (fallback sessionStorage para iOS restrito) ──
    function storageGet(key) {
        try { return localStorage.getItem(key); } catch(e) {
            try { return sessionStorage.getItem(key); } catch(e2) { return null; }
        }
    }
    function storageSet(key, val) {
        try { localStorage.setItem(key, val); } catch(e) {
            try { sessionStorage.setItem(key, val); } catch(e2) {}
        }
    }

    function waitForFirebase(cb, attempts) {
        attempts = attempts || 0;
        // 150 tentativas x 200ms = até 30s — garante carregamento mesmo em 3G lento
        if (attempts > 150) return;
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
            cb();
        } else {
            setTimeout(function() { waitForFirebase(cb, attempts + 1); }, 200);
        }
    }

    function getDeviceId() {
        var id = storageGet('_lb_did');
        if (!id) {
            id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
            storageSet('_lb_did', id);
        }
        return id;
    }

    function getPageName() {
        var path = window.location.pathname;
        if (path.includes('imoveis'))  return 'Imóveis';
        if (path.includes('contato'))  return 'Contato';
        return 'Início';
    }

    // ========== ERROS DO CLIENTE (saúde do sistema) ==========
    // Envia erros do site público para /eventos com eventName="client_error".
    // O admin lê esses logs; nada é exibido ao visitante.
    var _errQueue = [];
    var _errSending = false;
    var _errLastSentAt = 0;

    function _pushErr(payload) {
        try {
            // Evita loop se erro acontecer dentro do próprio logger
            payload = payload || {};
            payload.page = getPageName();
            payload.path = (window.location && window.location.pathname) ? String(window.location.pathname).slice(0, 120) : '';
            payload.deviceId = getDeviceId();
            payload.date = new Date().toISOString().slice(0, 10);
            payload.timestamp = (typeof firebase !== 'undefined' && firebase.firestore)
                ? firebase.firestore.FieldValue.serverTimestamp()
                : null;
            _errQueue.push(payload);
            _flushErrQueue();
        } catch (e) {}
    }

    function _flushErrQueue() {
        if (_errSending) return;
        var now = Date.now();
        // rate limit simples: no máximo 1 envio a cada 4s
        if (now - _errLastSentAt < 4000) return;
        if (!_errQueue.length) return;
        _errSending = true;
        _errLastSentAt = now;
        waitForFirebase(function() {
            try {
                var db = firebase.firestore();
                var item = _errQueue.shift();
                // timestamp pode ser null se firebase não está pronto; substitui
                if (!item.timestamp) item.timestamp = firebase.firestore.FieldValue.serverTimestamp();
                db.collection('eventos').add({
                    deviceId: item.deviceId,
                    eventName: 'client_error',
                    page: item.page,
                    date: item.date,
                    timestamp: item.timestamp,
                    eventData: {
                        path: item.path || '',
                        kind: (item.kind || 'error').slice(0, 24),
                        message: (item.message || '').slice(0, 240),
                        source: (item.source || '').slice(0, 140),
                        stack: (item.stack || '').slice(0, 500),
                    }
                }).catch(function() {});
            } catch (e) {}
            finally {
                _errSending = false;
                // tenta enviar próximo (se houver)
                if (_errQueue.length) setTimeout(_flushErrQueue, 800);
            }
        });
    }

    window.addEventListener('error', function(ev) {
        try {
            var err = ev && ev.error;
            _pushErr({
                kind: 'error',
                message: (ev && ev.message) ? String(ev.message) : (err && err.message ? String(err.message) : 'Erro'),
                source: (ev && ev.filename) ? String(ev.filename) + ':' + (ev.lineno || 0) : '',
                stack: err && err.stack ? String(err.stack) : ''
            });
        } catch (e) {}
    });

    window.addEventListener('unhandledrejection', function(ev) {
        try {
            var r = ev && ev.reason;
            _pushErr({
                kind: 'promise',
                message: r && r.message ? String(r.message) : String(r || 'Promise rejeitada'),
                source: '',
                stack: r && r.stack ? String(r.stack) : ''
            });
        } catch (e) {}
    });

    // ========== PRESENÇA AO VIVO ==========
    // Atualiza doc em /presenca/{deviceId} a cada 60s
    // O admin filtra lastSeen >= agora-5min para "online agora"
    var _presencaInterval = null;

    function updatePresence() {
        waitForFirebase(function() {
            try {
                var db = firebase.firestore();
                var deviceId = getDeviceId();
                var page = getPageName();
                var today = new Date().toISOString().slice(0, 10);
                db.collection('presenca').doc(deviceId).set({
                    deviceId: deviceId,
                    page: page,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                    date: today,
                }, { merge: true }).catch(function() {});
            } catch(e) {}
        });
    }

    function startPresence() {
        updatePresence();
        if (_presencaInterval) clearInterval(_presencaInterval);
        _presencaInterval = setInterval(updatePresence, 60000);
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) updatePresence();
        });
    }

    // ========== RASTREAMENTO DE TEMPO ==========
    var sessionStartTime = Date.now();
    var currentImovelId = null;
    var imovelViewStartTime = null;

    function trackTimeSpent(page, timeSpentSeconds) {
        if (timeSpentSeconds < 5) return;
        waitForFirebase(function() {
            try {
                var db = firebase.firestore();
                var deviceId = getDeviceId();
                var today = new Date().toISOString().slice(0, 10);
                var sessionId = deviceId + '_' + today + '_' + sessionStartTime;
                db.collection('tempo_permanencia').add({
                    deviceId: deviceId,
                    page: page,
                    timeSpent: timeSpentSeconds,
                    date: today,
                    sessionId: sessionId,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(function() {});
            } catch(e) {}
        });
    }

    window.addEventListener('beforeunload', function() {
        var page = getPageName();
        var timeSpent = Math.round((Date.now() - sessionStartTime) / 1000);
        trackTimeSpent(page, timeSpent);
        if (currentImovelId && imovelViewStartTime) {
            var imovelTime = Math.round((Date.now() - imovelViewStartTime) / 1000);
            trackImovelTimeSpent(currentImovelId, imovelTime);
        }
    });

    // ========== RASTREAMENTO DE EVENTOS ==========
    window.trackEvent = function(eventName, eventData) {
        eventData = eventData || {};
        waitForFirebase(function() {
            try {
                var db = firebase.firestore();
                var deviceId = getDeviceId();
                var today = new Date().toISOString().slice(0, 10);
                db.collection('eventos').add({
                    deviceId: deviceId,
                    eventName: eventName,
                    eventData: eventData,
                    page: getPageName(),
                    date: today,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(function() {});
            } catch(e) {}
        });
    };

    window.trackWhatsAppClick = function(imovelInfo) {
        window.trackEvent('whatsapp_click', { imovelInfo: imovelInfo || null });
    };

    window.startImovelView = function(imovelId, titulo) {
        currentImovelId = imovelId;
        imovelViewStartTime = Date.now();
        window.trackEvent('imovel_view_start', { imovelId: imovelId, titulo: titulo });
    };

    function trackImovelTimeSpent(imovelId, timeSpent) {
        if (timeSpent < 3) return;
        waitForFirebase(function() {
            try {
                var db = firebase.firestore();
                var deviceId = getDeviceId();
                var today = new Date().toISOString().slice(0, 10);
                db.collection('tempo_imovel').add({
                    deviceId: deviceId,
                    imovelId: String(imovelId),
                    timeSpent: timeSpent,
                    date: today,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(function() {});
            } catch(e) {}
        });
    }

    // ========== RASTREAMENTO DE VISITAS ==========
    function trackVisit() {
        try {
            var db = firebase.firestore();
            var deviceId = getDeviceId();
            var page = getPageName();
            var today = new Date().toISOString().slice(0, 10);
            var visitKey = deviceId + '_' + page + '_' + today;
            var ref = db.collection('visitas').doc(visitKey);

            ref.get().then(function(doc) {
                if (!doc.exists) {
                    ref.set({
                        deviceId: deviceId,
                        page: page,
                        date: today,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        userAgent: navigator.userAgent.slice(0, 200),
                    }).catch(function() {});
                    window.trackEvent('nova_visita', { page: page });
                }
            }).catch(function() {
                // Retry único em caso de erro de rede (comum em 3G/mobile)
                setTimeout(function() {
                    try {
                        ref.set({
                            deviceId: deviceId,
                            page: page,
                            date: today,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                            userAgent: navigator.userAgent.slice(0, 200),
                        }, { merge: true }).catch(function() {});
                    } catch(e2) {}
                }, 3000);
            });
        } catch(e) {
            setTimeout(function() { waitForFirebase(trackVisit); }, 3000);
        }
    }

    // ========== FUNÇÕES ORIGINAIS ==========
    window.trackImovelView = function(imovelId, titulo, bairro) {
        waitForFirebase(function() {
            try {
                var db = firebase.firestore();
                var deviceId = getDeviceId();
                var today = new Date().toISOString().slice(0, 10);
                var key = deviceId + '_view_' + imovelId + '_' + today;
                db.collection('visitas_imoveis').doc(key).set({
                    deviceId: deviceId,
                    imovelId: String(imovelId),
                    titulo: titulo || '',
                    bairro: bairro || '',
                    date: today,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                }, { merge: true }).catch(function() {});
                window.trackEvent('imovel_view', { imovelId: imovelId, titulo: titulo, bairro: bairro });
            } catch(e) {}
        });
    };

    window.trackLinkCopiado = function(imovelId, imovelTitulo) {
        waitForFirebase(function() {
            try {
                var db = firebase.firestore();
                var deviceId = getDeviceId();
                var today = new Date().toISOString().slice(0, 10);
                db.collection('links_copiados').add({
                    deviceId: deviceId,
                    imovelId: String(imovelId || ''),
                    titulo: imovelTitulo || '',
                    date: today,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                }).catch(function() {});
                window.trackEvent('link_copiado', { imovelId: imovelId, titulo: imovelTitulo });
            } catch(e) {}
        });
    };

    // ── Inicia tudo após DOM pronto (garante Firebase carregado no mobile) ──
    function init() {
        waitForFirebase(trackVisit);
        startPresence();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

})();
