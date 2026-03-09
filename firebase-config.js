// firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyCO9MlZmvUU-sDHokVO9fHkNStanrgWp4g",
    authDomain: "corretor-imoveis-3dab8.firebaseapp.com",
    projectId: "corretor-imoveis-3dab8",
    storageBucket: "corretor-imoveis-3dab8.firebasestorage.app",
    messagingSenderId: "967985829934",
    appId: "1:967985829934:web:7565b4602dbe3ea5a267bf"
  };
  
  // Inicializar Firebase (APENAS UMA VEZ)
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado com sucesso!');
  } else {
    console.log('✅ Firebase já estava inicializado');
  }
  
  // NÃO declarar auth/db aqui — serão inicializados pelo admin.js via initFirebase()
  console.log('🔥 Firebase Config Carregado');
  console.log('📧 Auth Domain:', firebaseConfig.authDomain);
