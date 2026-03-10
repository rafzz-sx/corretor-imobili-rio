// =============================================
//  TRACKER DE VISITAS — Leandro Imóveis
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
                    ref.set({
                        deviceId:  deviceId,
                        page:      page,
                        date:      today,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        userAgent: navigator.userAgent.slice(0, 200),
                    }).catch(function() {});
                }
            }).catch(function() {});
        } catch(e) {}
    }

    // Rastreia visualização de imóvel (chamado pelo script.js)
    window.trackImovelView = function(imovelId, titulo, bairro) {
        waitForFirebase(function() {
            try {
                var db       = firebase.firestore();
                var deviceId = getDeviceId();
                var today    = new Date().toISOString().slice(0, 10);
                var key      = deviceId + '_view_' + imovelId + '_' + today;
                db.collection('visitas_imoveis').doc(key).set({
                    deviceId:  deviceId,
                    imovelId:  String(imovelId),
                    titulo:    titulo || '',
                    bairro:    bairro || '',
                    date:      today,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                }, { merge: true }).catch(function() {});
            } catch(e) {}
        });
    };

    // Rastreia cópia de link de imóvel (chamado pelo script.js)
    window.trackLinkCopiado = function(imovelId, imovelTitulo) {
        waitForFirebase(function() {
            try {
                var db       = firebase.firestore();
                var deviceId = getDeviceId();
                var today    = new Date().toISOString().slice(0, 10);
                db.collection('links_copiados').add({
                    deviceId:  deviceId,
                    imovelId:  String(imovelId || ''),
                    titulo:    imovelTitulo || '',
                    date:      today,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                }).catch(function() {});
            } catch(e) {}
        });
    };

    waitForFirebase(trackVisit);

})();
