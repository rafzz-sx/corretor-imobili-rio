// =============================================
//  TRACKER DE VISITAS — Leandro Imóveis v2
//  - Visitas únicas por dispositivo/página/dia
//  - Rastreamento de imóveis visualizados
// =============================================

(function() {
    'use strict';

    function waitForFirebase(cb, attempts) {
        attempts = attempts || 0;
        if (attempts > 40) { console.warn('⚠️ Tracker: Firebase não disponível'); return; }
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            cb();
        } else {
            setTimeout(function() { waitForFirebase(cb, attempts + 1); }, 100);
        }
    }

    function getDeviceId() {
        try {
            var id = localStorage.getItem('_lb_did');
            if (!id) {
                id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
                localStorage.setItem('_lb_did', id);
            }
            return id;
        } catch(e) {
            return 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
        }
    }

    function getPageName() {
        var path = window.location.pathname;
        if (path.includes('imoveis'))  return 'Imoveis';
        if (path.includes('contato'))  return 'Contato';
        return 'Inicio';
    }

    // Registra visita de página
    function trackVisit() {
        try {
            var db       = firebase.firestore();
            var deviceId = getDeviceId();
            var page     = getPageName();
            var today    = new Date().toISOString().slice(0, 10);
            var visitKey = deviceId + '_' + page + '_' + today;
            var ref      = db.collection('visitas').doc(visitKey);

            ref.get().then(function(doc) {
                if (!doc.exists) {
                    return ref.set({
                        deviceId:  deviceId,
                        page:      page,
                        date:      today,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        userAgent: navigator.userAgent.slice(0, 200),
                    });
                }
            }).then(function() {
                console.log('📊 Tracker: visita registrada —', page);
            }).catch(function(err) {
                console.warn('⚠️ Tracker: erro ao registrar visita:', err.code, err.message);
            });
        } catch (e) {
            console.warn('⚠️ Tracker erro:', e);
        }
    }

    // Registra visualização de imóvel específico
    window.trackImovelView = function(imovelId, imovelTitulo, imovelBairro) {
        waitForFirebase(function() {
            try {
                var db       = firebase.firestore();
                var deviceId = getDeviceId();
                var today    = new Date().toISOString().slice(0, 10);
                var key      = deviceId + '_imovel_' + imovelId + '_' + today;
                var ref      = db.collection('visitas_imoveis').doc(key);

                ref.get().then(function(doc) {
                    if (!doc.exists) {
                        return ref.set({
                            deviceId:   deviceId,
                            imovelId:   imovelId,
                            titulo:     imovelTitulo || '',
                            bairro:     imovelBairro || '',
                            date:       today,
                            timestamp:  firebase.firestore.FieldValue.serverTimestamp(),
                        });
                    } else {
                        // Já viu hoje, apenas atualiza contador
                        return ref.update({
                            views: firebase.firestore.FieldValue.increment(1),
                            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                    }
                }).catch(function() {});
            } catch(e) {}
        });
    };

    waitForFirebase(trackVisit);
})();
