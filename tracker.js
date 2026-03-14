//=============================================
//  TRACKER DE VISITAS v2.0 — Leandro Imóveis
//  Com rastreamento de eventos e tempo
// =============================================

(function() {
    'use strict';

    function waitForFirebase(cb, attempts) {
        attempts = attempts || 0;
        if (attempts > 40) return;
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
            cb();
        } else {
            setTimeout(function() { waitForFirebase(cb, attempts + 1); }, 100);
        }
    }

    function getDeviceId() {
        var id = localStorage.getItem('_lb_did');
        if (!id) {
            id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
            localStorage.setItem('_lb_did', id);
        }
        return id;
    }

    function getPageName() {
        var path = window.location.pathname;
        if (path.includes('imoveis'))  return 'Imóveis';
        if (path.includes('contato'))  return 'Contato';
        return 'Início';
    }

    // ========== RASTREAMENTO DE TEMPO ==========
    let sessionStartTime = Date.now();
    let currentImovelId = null;
    let imovelViewStartTime = null;

    // Função para registrar tempo de permanência
    function trackTimeSpent(page, timeSpentSeconds) {
        if (timeSpentSeconds < 5) return; // Ignora sessões muito curtas
        
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

    // Rastreia quando o usuário sai da página
    window.addEventListener('beforeunload', function() {
        var page = getPageName();
        var timeSpent = Math.round((Date.now() - sessionStartTime) / 1000);
        trackTimeSpent(page, timeSpent);
        
        // Se estava vendo um imóvel, registra o tempo
        if (currentImovelId && imovelViewStartTime) {
            var imovelTime = Math.round((Date.now() - imovelViewStartTime) / 1000);
            trackImovelTimeSpent(currentImovelId, imovelTime);
        }
    });

    // ========== RASTREAMENTO DE EVENTOS ==========
    window.trackEvent = function(eventName, eventData = {}) {
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

    // Rastreia clique no WhatsApp
    window.trackWhatsAppClick = function(imovelInfo = null) {
        trackEvent('whatsapp_click', { imovelInfo: imovelInfo });
    };

    // Rastreia tempo em imóvel específico
    window.startImovelView = function(imovelId, titulo) {
        currentImovelId = imovelId;
        imovelViewStartTime = Date.now();
        trackEvent('imovel_view_start', { imovelId: imovelId, titulo: titulo });
    };

    function trackImovelTimeSpent(imovelId, timeSpent) {
        if (timeSpent < 3) return; // Ignora visualizações muito curtas
        
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

    // ========== RASTREAMENTO DE VISITAS (ORIGINAL) ==========
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
                    
                    // Registra nova visita como evento
                    trackEvent('nova_visita', { page: page });
                }
            }).catch(function() {});
        } catch(e) {}
    }

    // ========== FUNÇÕES ORIGINAIS (MANTIDAS) ==========
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
                
                trackEvent('imovel_view', { imovelId: imovelId, titulo: titulo, bairro: bairro });
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
                
                trackEvent('link_copiado', { imovelId: imovelId, titulo: imovelTitulo });
            } catch(e) {}
        });
    };

    // Inicia rastreamento
    waitForFirebase(trackVisit);

})();
