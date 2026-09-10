// Copie esse arquivo pra "js/config.js" (fora do git, olha o .gitignore) se
// quiser o login com Google. Sem isso o site funciona normalmente no modo
// visitante, so' o botao "Entrar com Google" fica desabilitado.
//
// Repare que NAO tem chave da IGDB aqui: a IGDB exige um Client Secret, que
// nunca pode aparecer num arquivo que vai pro navegador. Esse aqui fica so'
// nas variaveis de ambiente da Netlify (veja o README, secao "Configurando
// a busca de jogos (IGDB)").
//
// FIREBASE_CONFIG:
//   1. Crie um projeto de graca em https://console.firebase.google.com
//   2. Build > Authentication > Sign-in method > ativa "Google"
//   3. Build > Firestore Database > cria o banco (modo de producao ou teste)
//   4. Configuracoes do projeto > Geral > Seus apps > cria um "app da Web"
//   5. Cola o objeto de config que o Firebase gera aqui embaixo

export const FIREBASE_CONFIG = {
  apiKey: "coloque-aqui",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "coloque-aqui",
  appId: "coloque-aqui",
};
