// =============================================
//  TRACKER DE VISITAS — Leandro Imóveis
//  Registra visitas únicas por dispositivo
//  no Firestore, sem contar repetidos
// =============================================

(function() {
    'use strict';

    // Espera o Firebase estar disponível
    function waitForFirebase(cb, attempts) {
        attempts = attempts || 0;
        if (attempts > 20) return; // desiste após 2s
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
            cb();
        } else {
            setTimeout(() => waitForFirebase(cb, attempts + 1), 100);
        }
    }

    // Gera ou recupera um ID único para este dispositivo/browser
    function getDeviceId() {
        let id = localStorage.getItem('_lb_did');
        if (!id) {
            id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
            localStorage.setItem('_lb_did', id);
        }
        return id;
    }

    // Nome amigável da página
    function getPageName() {
        const path = window.location.pathname;
        if (path.includes('imoveis'))  return 'Imóveis';
        if (path.includes('contato'))  return 'Contato';
        return 'Início';
    }

    function trackVisit() {
        try {
            const db       = firebase.firestore();
            const deviceId = getDeviceId();
            const page     = getPageName();
            const today    = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

            // Chave única: dispositivo + página + dia
            // Isso garante: 1 contagem por dispositivo por página por dia
            const visitKey = `${deviceId}_${page}_${today}`;
            const ref      = db.collection('visitas').doc(visitKey);

            ref.get().then(doc => {
                if (!doc.exists) {
                    // Nova visita única — registra
                    ref.set({
                        deviceId:  deviceId,
                        page:      page,
                        date:      today,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        userAgent: navigator.userAgent.slice(0, 200),
                    }).catch(() => {}); // silencia erros de rede
                }
                // Se já existe, ignora (visitante repetido hoje nessa página)
            }).catch(() => {});

        } catch (e) {
            // Nunca quebra a página
        }
    }

    waitForFirebase(trackVisit);
})();