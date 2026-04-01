//=============================================
//  TRACKER DE VISITAS v3.1 — Leandro Imóveis
//  Fix: links_copiados agora persiste no Firestore
//  Fix: regras do Firebase respeitadas (campos exatos)
//  Otim: debounce, cache, retry inteligente
// =============================================

(function() {
    'use strict';

    // ── Storage seguro ──
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

    var _fbReady = false;
    var _fbCallbacks = [];

    function waitForFirebase(cb, attempts) {
        attempts = attempts || 0;
        if (attempts > 150) return;
        if (_fbReady) { cb(); return; }
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
            _fbReady = true;
            var pending = _fbCallbacks.splice(0);
            pending.forEach(function(fn) { try { fn(); } catch(e) {} });
            cb();
        } else {
            setTimeout(function() { waitForFirebase(cb, attempts + 1); }, 200);
        }
    }

    function getDb() {
        return firebase.firestore();
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

    function getToday() {
        return new Date().toISOString().slice(0, 10);
    }

    // ── Servertime shortcut ──
    function srvTs() {
        return firebase.firestore.FieldValue.serverTimestamp();
    }

    // ========== ERROS DO CLIENTE ==========
    var _errQueue = [];
    var _errSending = false;
    var _errLastSentAt = 0;
    var _errCount = 0;

    function _pushErr(payload) {
        if (_errCount > 20) return; // evita flood
        _errCount++;
        try {
            payload = payload || {};
            payload.page = getPageName();
            payload.path = String(window.location.pathname).slice(0, 120);
            payload.deviceId = getDeviceId();
            payload.date = getToday();
            _errQueue.push(payload);
            if (!_errSending) setTimeout(_flushErrQueue, 500);
        } catch (e) {}
    }

    function _flushErrQueue() {
        if (_errSending || !_errQueue.length) return;
        var now = Date.now();
        if (now - _errLastSentAt < 4000) { setTimeout(_flushErrQueue, 4000 - (now - _errLastSentAt)); return; }
        _errSending = true;
        _errLastSentAt = now;
        waitForFirebase(function() {
            try {
                var item = _errQueue.shift();
                getDb().collection('eventos').add({
                    deviceId: item.deviceId,
                    eventName: 'client_error',
                    page: item.page,
                    date: item.date,
                    timestamp: srvTs(),
                    eventData: {
                        path: (item.path || '').slice(0, 140),
                        kind: (item.kind || 'error').slice(0, 24),
                        message: (item.message || '').slice(0, 240),
                        source: (item.source || '').slice(0, 140),
                        stack: (item.stack || '').slice(0, 500),
                    }
                }).catch(function() {});
            } catch (e) {}
            finally {
                _errSending = false;
                if (_errQueue.length) setTimeout(_flushErrQueue, 1000);
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
    var _presencaInterval = null;
    var _presencaSent = false;

    function updatePresence() {
        waitForFirebase(function() {
            try {
                var deviceId = getDeviceId();
                // Campos EXATOS permitidos pelas regras do Firestore
                getDb().collection('presenca').doc(deviceId).set({
                    deviceId: deviceId,
                    page: getPageName(),
                    lastSeen: srvTs(),
                    date: getToday(),
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
                var deviceId = getDeviceId();
                var today = getToday();
                getDb().collection('tempo_permanencia').add({
                    deviceId: deviceId,
                    page: page,
                    timeSpent: timeSpentSeconds,
                    date: today,
                    sessionId: deviceId + '_' + today + '_' + sessionStartTime,
                    timestamp: srvTs()
                }).catch(function() {});
            } catch(e) {}
        });
    }

    function trackImovelTimeSpent(imovelId, timeSpent) {
        if (timeSpent < 3) return;
        waitForFirebase(function() {
            try {
                getDb().collection('tempo_imovel').add({
                    deviceId: getDeviceId(),
                    imovelId: String(imovelId),
                    timeSpent: timeSpent,
                    date: getToday(),
                    timestamp: srvTs()
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

    // ========== EVENTOS GENÉRICOS ==========
    window.trackEvent = function(eventName, eventData) {
        eventData = eventData || {};
        waitForFirebase(function() {
            try {
                getDb().collection('eventos').add({
                    deviceId: getDeviceId(),
                    eventName: eventName,
                    eventData: eventData,
                    page: getPageName(),
                    date: getToday(),
                    timestamp: srvTs()
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

    // ========== VISITAS POR IMÓVEL ==========
    window.trackImovelView = function(imovelId, titulo, bairro) {
        waitForFirebase(function() {
            try {
                var deviceId = getDeviceId();
                var today = getToday();
                var key = deviceId + '_view_' + String(imovelId).slice(0, 40) + '_' + today;
                // Campos EXATOS das regras: deviceId, imovelId, titulo, bairro, date, timestamp
                getDb().collection('visitas_imoveis').doc(key).set({
                    deviceId: deviceId,
                    imovelId: String(imovelId),
                    titulo: (titulo || '').slice(0, 120),
                    bairro: (bairro || '').slice(0, 80),
                    date: today,
                    timestamp: srvTs(),
                }, { merge: true }).catch(function() {});
                window.trackEvent('imovel_view', { imovelId: imovelId, titulo: titulo, bairro: bairro });
            } catch(e) {}
        });
    };

    // ========== LINKS COPIADOS ==========
    // CORRIGIDO: campos EXATOS que as regras do Firestore aceitam:
    // keys().hasAll(['deviceId','imovelId','titulo','date','timestamp'])
    // Qualquer campo extra (como 'path') causava falha silenciosa!
    window.trackLinkCopiado = function(imovelId, imovelTitulo) {
        waitForFirebase(function() {
            try {
                var today = getToday();
                // Exatamente os campos que as regras do Firestore esperam
                getDb().collection('links_copiados').add({
                    deviceId: getDeviceId(),
                    imovelId: String(imovelId || ''),
                    titulo: (imovelTitulo || '').slice(0, 120),
                    date: today,
                    timestamp: srvTs(),
                }).catch(function(err) {
                    // Tenta novamente após 2s em caso de erro de rede
                    setTimeout(function() {
                        try {
                            getDb().collection('links_copiados').add({
                                deviceId: getDeviceId(),
                                imovelId: String(imovelId || ''),
                                titulo: (imovelTitulo || '').slice(0, 120),
                                date: today,
                                timestamp: srvTs(),
                            }).catch(function() {});
                        } catch(e2) {}
                    }, 2000);
                });
                window.trackEvent('link_copiado', { imovelId: imovelId, titulo: imovelTitulo });
            } catch(e) {}
        });
    };

    // ========== VISITAS DE PÁGINA ==========
    function trackVisit() {
        try {
            var deviceId = getDeviceId();
            var page = getPageName();
            var today = getToday();
            var visitKey = deviceId + '_' + page + '_' + today;
            var ref = getDb().collection('visitas').doc(visitKey);

            ref.get().then(function(doc) {
                if (!doc.exists) {
                    // Campos EXATOS: deviceId, page, date, timestamp, userAgent
                    ref.set({
                        deviceId: deviceId,
                        page: page,
                        date: today,
                        timestamp: srvTs(),
                        userAgent: navigator.userAgent.slice(0, 200),
                    }).catch(function() {});
                    window.trackEvent('nova_visita', { page: page });
                }
            }).catch(function() {
                setTimeout(function() {
                    try {
                        ref.set({
                            deviceId: deviceId,
                            page: page,
                            date: today,
                            timestamp: srvTs(),
                            userAgent: navigator.userAgent.slice(0, 200),
                        }, { merge: true }).catch(function() {});
                    } catch(e2) {}
                }, 3000);
            });
        } catch(e) {
            setTimeout(function() { waitForFirebase(trackVisit); }, 3000);
        }
    }

    // ========== INIT ==========
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
