# Leandro Bomfim | Corretor de Imóveis (CRECI-RJ 97315)

Site oficial e plataforma de catálogo para venda de imóveis de alto padrão na Zona Sul e Barra da Tijuca / Recreio dos Bandeirantes, Rio de Janeiro.

## 🚀 Tecnologias Utilizadas
- **Frontend:** HTML5, CSS3 moderno (Dark theme cinemático, Glassmorphism, CSS Grid/Flexbox), Vanilla JavaScript.
- **Backend & Cloud:** Google Firebase
  - **Firebase Hosting:** Hospedagem com CDN e compressão HTTP.
  - **Cloud Firestore:** Banco de dados NoSQL em tempo real para catálogo de imóveis, CRM de leads e telemetria.
  - **Firebase Authentication:** Autenticação restrita e segura para o painel administrativo.
  - **Firebase App Check:** Proteção com reCAPTCHA v3.
- **Segurança & LGPD:**
  - Em total conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
  - Sem necessidade de login para visitantes (preservando taxa de conversão).
  - Política de Privacidade (`privacidade.html`), Termos de Uso (`termos.html`) e componente de consentimento de cookies/armazenamento (`cookie-banner.js`).

## 📁 Estrutura de Páginas
- `index.html`: Landing page institucional com Hero cinemático, quiz interativo de recomendação e depoimentos.
- `imoveis.html`: Catálogo completo de imóveis com filtros dinâmicos por região/bairro, quartos, tipo e faixa de preço.
- `contato.html`: Canais diretos de atendimento (WhatsApp, Instagram, E-mail e Telefone).
- `privacidade.html`: Política de Privacidade e Proteção de Dados.
- `termos.html`: Termos e Condições de Uso da plataforma.
- `admin.html`: Painel administrativo completo para gestão de imóveis, leads e telemetria.
- `404.html`: Página amigável de erro para rotas não encontradas.

