// firebase-config.js
// ⚠️ SEGURANÇA: Restrinja esta API Key no Google Cloud Console
// para apenas o domínio leandrobomfim.com.br
// Console: https://console.cloud.google.com/apis/credentials
const firebaseConfig = {
    apiKey: "AIzaSyCO9MlZmvUU-sDHokVO9fHkNStanrgWp4g",
    authDomain: "corretor-imoveis-3dab8.firebaseapp.com",
    projectId: "corretor-imoveis-3dab8",
    storageBucket: "corretor-imoveis-3dab8.firebasestorage.app",
    messagingSenderId: "967985829934",
    appId: "1:967985829934:web:7565b4602dbe3ea5a267bf"
};

// Logger seguro — silencioso em produção
const _isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
window._secureLog = _isDev ? console.log.bind(console) : () => { };

// Inicializar Firebase (APENAS UMA VEZ)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    window._secureLog('✅ Firebase inicializado');

    // 🛡️ FIREBASE APP CHECK (Proteção contra Bots e Ataques de Custo)
    try {
        if (typeof firebase.appCheck === 'function') {
            if (_isDev) {
                window._secureLog('⚠️ App Check temporariamente desativado no ambiente de teste local.');
            } else {
                const appCheck = firebase.appCheck();
                appCheck.activate(
                    // Substitua essa chave de teste pela KEY real do ReCaptcha V3
                    new firebase.appCheck.ReCaptchaV3Provider('6LcY4L0sAAAAAHfwTCyH89_XNaSYGZ-S87Lz98yu'),
                    true // Isso força a atualização automática do token
                );
                window._secureLog('✅ App Check ativado.');
            }
        } else {
            console.warn('⚠️ Biblioteca do App Check não carregada. Certifique-se de importar do CDN no index.html e admin.html');
        }
    } catch (e) {
        window._secureLog('❌ Erro no App Check:', e);
    }
}
// NÃO declarar auth/db aqui — serão inicializados pelo admin.js via initFirebase()
