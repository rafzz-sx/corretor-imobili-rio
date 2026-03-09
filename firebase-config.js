// ========== CONFIGURAÇÃO DO FIREBASE ==========
// 
// INSTRUÇÕES:
// 1. Acesse https://console.firebase.google.com/
// 2. Crie um novo projeto
// 3. Clique no ícone de engrenagem ⚙️ > "Configurações do projeto"
// 4. Em "Seus aplicativos", clique no ícone </> (Web)
// 5. Copie o objeto firebaseConfig e cole abaixo
// 6. Substitua TODO o conteúdo deste arquivo
//
// EXEMPLO DE CONFIGURAÇÃO:
// const firebaseConfig = {
//     apiKey: "AIzaSyABC123...",
//     authDomain: "meu-projeto-12345.firebaseapp.com",
//     projectId: "meu-projeto-12345",
//     storageBucket: "meu-projeto-12345.appspot.com",
//     messagingSenderId: "123456789012",
//     appId: "1:123456789012:web:abcdef1234567890"
// };

const firebaseConfig = {
    apiKey: "SUBSTITUA_AQUI_SUA_API_KEY",
    authDomain: "SUBSTITUA_AQUI_SEU_PROJECT_ID.firebaseapp.com",
    projectId: "SUBSTITUA_AQUI_SEU_PROJECT_ID",
    storageBucket: "SUBSTITUA_AQUI_SEU_PROJECT_ID.appspot.com",
    messagingSenderId: "SUBSTITUA_AQUI",
    appId: "SUBSTITUA_AQUI"
};

// Exportar para uso nos outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = firebaseConfig;
}