// ============================================================
//  CONSENT GATE & PROTEÇÃO LGPD / TERMOS DE USO
//  Leandro Bomfim Imóveis (CRECI-RJ 97315)
// ============================================================

(function () {
    'use strict';

    const CONSENT_KEY = '_lb_lgpd_consent';
    const CONSENT_DATE_KEY = '_lb_lgpd_consent_date';

    function isConsentGiven() {
        try {
            return localStorage.getItem(CONSENT_KEY) === 'true';
        } catch (e) {
            return false;
        }
    }

    function setConsentGiven() {
        try {
            localStorage.setItem(CONSENT_KEY, 'true');
            localStorage.setItem(CONSENT_DATE_KEY, new Date().toISOString());
        } catch (e) { }
    }

    function initConsentProtection() {
        // Se já aceitou, libera acesso total sem interrupção
        if (isConsentGiven()) return;

        const path = window.location.pathname.toLowerCase();

        // Nunca bloquear o painel administrativo (já possui login próprio)
        if (path.includes('admin') || (document.body && document.body.classList.contains('admin-page'))) {
            return;
        }

        // Se o usuário está lendo a página de termos ou privacidade, não bloqueia a tela inteira
        // apenas exibe uma barra flutuante discreta para que ele possa ler com calma
        const isReadingLegalPage = path.includes('privacidade') || path.includes('termos');

        // Injeta estilos da proteção
        if (!document.getElementById('_lb-consent-gate-styles')) {
            const style = document.createElement('style');
            style.id = '_lb-consent-gate-styles';
            style.textContent = `
            /* ── OVERLAY DE PROTEÇÃO DE ACESSO ── */
            #lb-consent-gate-overlay {
                position: fixed;
                inset: 0;
                background: rgba(10, 15, 26, 0.88);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                z-index: 2147483640;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1.5rem;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.35s ease, visibility 0.35s ease;
                box-sizing: border-box;
                font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
            }
            #lb-consent-gate-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            /* ── CARD CENTRAL DO MODAL ── */
            .lb-consent-card {
                background: linear-gradient(165deg, rgba(15, 23, 42, 0.98) 0%, rgba(17, 28, 48, 0.96) 100%);
                border: 1px solid rgba(59, 130, 246, 0.35);
                border-radius: 24px;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.06);
                max-width: 540px;
                width: 100%;
                padding: 2.2rem 2.4rem;
                color: #e2e8f0;
                text-align: left;
                transform: scale(0.94);
                transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
                box-sizing: border-box;
            }
            #lb-consent-gate-overlay.active .lb-consent-card {
                transform: scale(1);
            }
            .lb-consent-card.shake {
                animation: lb-shake 0.4s ease;
            }
            @keyframes lb-shake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-8px); }
                40%, 80% { transform: translateX(8px); }
            }

            /* ── ELEMENTOS VISUAIS DO CARD ── */
            .lb-consent-header {
                display: flex;
                align-items: flex-start;
                gap: 1rem;
                margin-bottom: 1.25rem;
            }
            .lb-consent-icon-badge {
                width: 52px;
                height: 52px;
                border-radius: 14px;
                background: rgba(59, 130, 246, 0.15);
                border: 1px solid rgba(59, 130, 246, 0.35);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #3b82f6;
                font-size: 1.5rem;
                flex-shrink: 0;
            }
            .lb-consent-title-wrap h2 {
                font-family: 'Playfair Display', Georgia, serif;
                font-size: 1.35rem;
                font-weight: 700;
                color: #ffffff;
                margin: 0 0 0.25rem 0;
                letter-spacing: -0.01em;
            }
            .lb-consent-title-wrap p {
                font-size: 0.78rem;
                color: #94a3b8;
                margin: 0;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                font-weight: 600;
            }

            .lb-consent-intro {
                font-size: 0.88rem;
                line-height: 1.6;
                color: #cbd5e1;
                margin: 0 0 1.2rem 0;
            }

            .lb-consent-pillars {
                display: flex;
                flex-direction: column;
                gap: 0.65rem;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 14px;
                padding: 1rem 1.15rem;
                margin-bottom: 1.4rem;
            }
            .lb-pillar-item {
                display: flex;
                align-items: flex-start;
                gap: 0.6rem;
                font-size: 0.82rem;
                line-height: 1.5;
                color: #cbd5e1;
            }
            .lb-pillar-item i {
                color: #22c55e;
                margin-top: 0.2rem;
                font-size: 0.85rem;
                flex-shrink: 0;
            }

            .lb-consent-links {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 1.2rem;
                font-size: 0.82rem;
                margin-bottom: 1.4rem;
                flex-wrap: wrap;
            }
            .lb-consent-link {
                color: #60a5fa;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 0.35rem;
                font-weight: 600;
                transition: color 0.2s, text-decoration 0.2s;
            }
            .lb-consent-link:hover {
                color: #93c5fd;
                text-decoration: underline;
            }
            .lb-consent-link-separator {
                color: rgba(255, 255, 255, 0.2);
            }

            /* ── BOTÃO DE CONCORDÂNCIA E ACESSO ── */
            .lb-consent-btn-accept {
                width: 100%;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: #ffffff;
                border: none;
                border-radius: 14px;
                padding: 0.95rem 1.5rem;
                font-size: 0.95rem;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.6rem;
                box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
                transition: transform 0.15s, box-shadow 0.2s, background 0.2s;
                font-family: inherit;
                box-sizing: border-box;
            }
            .lb-consent-btn-accept:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 28px rgba(59, 130, 246, 0.55);
                background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
            }
            .lb-consent-btn-accept:active {
                transform: translateY(0);
            }

            /* ── MODO DISCRETO NAS PÁGINAS LEGAIS ── */
            #lb-legal-floating-banner {
                position: fixed;
                bottom: max(1.2rem, env(safe-area-inset-bottom, 0px));
                right: max(1.2rem, env(safe-area-inset-right, 0px));
                background: rgba(15, 23, 42, 0.96);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 16px;
                padding: 1rem 1.25rem;
                box-shadow: 0 12px 36px rgba(0,0,0,0.6);
                z-index: 10030;
                display: flex;
                align-items: center;
                gap: 1rem;
                font-family: inherit;
                color: #fff;
                font-size: 0.85rem;
            }

            @media (max-width: 600px) {
                .lb-consent-card {
                    padding: 1.6rem 1.4rem;
                    border-radius: 20px;
                }
                .lb-consent-title-wrap h2 {
                    font-size: 1.2rem;
                }
                .lb-consent-pillars {
                    padding: 0.85rem 0.95rem;
                }
                .lb-pillar-item {
                    font-size: 0.78rem;
                }
                #lb-legal-floating-banner {
                    left: 1rem;
                    right: 1rem;
                    flex-direction: column;
                }
                #lb-legal-floating-banner button {
                    width: 100%;
                }
            }
            `;
            document.head.appendChild(style);
        }

        // Caso esteja lendo as páginas /privacidade ou /termos, exibe apenas a barra flutuante
        if (isReadingLegalPage) {
            const legalBanner = document.createElement('div');
            legalBanner.id = 'lb-legal-floating-banner';
            legalBanner.innerHTML = `
                <div>
                    <strong>Termos e LGPD:</strong> Concorda com os termos para continuar navegando?
                </div>
                <button type="button" class="lb-consent-btn-accept" id="_lb-accept-legal-btn" style="padding:0.6rem 1.2rem;font-size:0.82rem;border-radius:99px;width:auto;">
                    <i class="fas fa-check-circle"></i> Concordar e Liberar
                </button>
            `;
            document.body.appendChild(legalBanner);

            const acceptBtn = document.getElementById('_lb-accept-legal-btn');
            if (acceptBtn) {
                acceptBtn.addEventListener('click', function () {
                    setConsentGiven();
                    legalBanner.remove();
                });
            }
            return;
        }

        // ── CRIAÇÃO DO GATE DE PROTEÇÃO (MODAL BLOQUEANTE) ──
        const overlay = document.createElement('div');
        overlay.id = 'lb-consent-gate-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'lb-consent-title');

        overlay.innerHTML = `
            <div class="lb-consent-card" id="lb-consent-card-el">
                <div class="lb-consent-header">
                    <div class="lb-consent-icon-badge">
                        <i class="fas fa-shield-alt" aria-hidden="true"></i>
                    </div>
                    <div class="lb-consent-title-wrap">
                        <h2 id="lb-consent-title">Termos de Uso & Privacidade</h2>
                        <p>Leandro Bomfim Imóveis · CRECI-RJ 97315</p>
                    </div>
                </div>

                <p class="lb-consent-intro">
                    Para acessar o catálogo exclusivo de imóveis, utilizar nosso questionário e os canais de atendimento, é necessário confirmar que está ciente e de acordo com as nossas diretrizes de privacidade e termos de uso.
                </p>

                <div class="lb-consent-pillars">
                    <div class="lb-pillar-item">
                        <i class="fas fa-check-circle" aria-hidden="true"></i>
                        <span><strong>Proteção Total (LGPD):</strong> Seus dados de contato fornecidos no Quiz são confidenciais e nunca comercializados com terceiros.</span>
                    </div>
                    <div class="lb-pillar-item">
                        <i class="fas fa-check-circle" aria-hidden="true"></i>
                        <span><strong>Catálogo e Imagens:</strong> As fotos de imóveis de alto padrão são exclusivas e protegidas por direitos autorais.</span>
                    </div>
                    <div class="lb-pillar-item">
                        <i class="fas fa-check-circle" aria-hidden="true"></i>
                        <span><strong>Armazenamento Local:</strong> Usamos a memória do seu navegador para guardar seus imóveis favoritos e garantir segurança contra robôs.</span>
                    </div>
                </div>

                <div class="lb-consent-links">
                    <a href="termos.html" target="_blank" class="lb-consent-link" rel="noopener">
                        <i class="fas fa-file-contract" aria-hidden="true"></i> Ler Termos de Uso
                    </a>
                    <span class="lb-consent-link-separator">•</span>
                    <a href="privacidade.html" target="_blank" class="lb-consent-link" rel="noopener">
                        <i class="fas fa-user-shield" aria-hidden="true"></i> Ler Política de Privacidade
                    </a>
                </div>

                <button type="button" class="lb-consent-btn-accept" id="_lb-gate-accept-btn">
                    <i class="fas fa-check-circle" aria-hidden="true"></i>
                    <span>Concordar e Acessar o Site</span>
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Bloqueia rolagem da página por baixo
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Animação de entrada
        setTimeout(function () {
            overlay.classList.add('active');
        }, 150);

        // Se o usuário clicar fora do card ou tentar ignorar, aplica o shake no card
        const card = document.getElementById('lb-consent-card-el');
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay && card) {
                card.classList.remove('shake');
                void card.offsetWidth; // força reflow
                card.classList.add('shake');
            }
        });

        // Botão de Aceite
        const btn = document.getElementById('_lb-gate-accept-btn');
        if (btn) {
            btn.addEventListener('click', function () {
                setConsentGiven();
                overlay.classList.remove('active');
                document.body.style.overflow = originalOverflow || '';
                setTimeout(function () {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                }, 400);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initConsentProtection);
    } else {
        setTimeout(initConsentProtection, 100);
    }
})();
