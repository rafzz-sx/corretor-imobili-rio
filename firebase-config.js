// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCO9MlZmvUU-sDHokVO9fHkNStanrgWp4g",
  authDomain: "corretor-imoveis-3dab8.firebaseapp.com",
  projectId: "corretor-imoveis-3dab8",
  storageBucket: "corretor-imoveis-3dab8.firebasestorage.app",
  messagingSenderId: "967985829934",
  appId: "1:967985829934:web:7565b4602dbe3ea5a267bf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Exportar para uso nos outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = firebaseConfig;
}
