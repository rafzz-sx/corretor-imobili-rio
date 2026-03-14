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
const _isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
window._secureLog = _isDev ? console.log.bind(console) : () => {};

// Inicializar Firebase (APENAS UMA VEZ)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    window._secureLog('✅ Firebase inicializado');
}
