// ============================================================
//  COOKIE & PRIVACY BANNER (LGPD) — Leandro Bomfim Imóveis
// ============================================================

(function () {
    'use strict';

    const CONSENT_KEY = '_lb_lgpd_consent';

    function initCookieBanner() {
        // Se já consentiu, não exibe
        try {
            if (localStorage.getItem(CONSENT_KEY) === 'true') return;
        } catch (e) {
            return;
        }

        // Não exibir no painel administrativo
        if (document.body && document.body.classList.contains('admin-page')) return;
        if (window.location.pathname.includes('admin')) return;

        // Injeta estilos
        if (!document.getElementById('_lb-cookie-banner-styles')) {
            const style = document.createElement('style');
            style.id = '_lb-cookie-banner-styles';
            style.textContent = `
            #lb-cookie-banner {
                position: fixed;
                bottom: max(1.2rem, env(safe-area-inset-bottom, 0px));
                right: max(1.2rem, env(safe-area-inset-right, 0px));
                left: auto;
                max-width: 440px;
                width: calc(100vw - 2.4rem);
                background: rgba(15, 23, 42, 0.94);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                border: 1px solid rgba(59, 130, 246, 0.28);
                border-radius: 16px;
                padding: 1.25rem 1.35rem;
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
                z-index: 10030;
                display: flex;
                flex-direction: column;
                gap: 0.85rem;
                font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
                color: #e2e8f0;
                transform: translateY(120%);
                opacity: 0;
                transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease;
                box-sizing: border-box;
            }
            #lb-cookie-banner.show {
                transform: translateY(0);
                opacity: 1;
            }
            .lb-cookie-header {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.92rem;
                font-weight: 700;
                color: #fff;
            }
            .lb-cookie-header i {
                color: #3b82f6;
                font-size: 1.1rem;
            }
            .lb-cookie-body {
                font-size: 0.82rem;
                line-height: 1.55;
                color: #94a3b8;
                margin: 0;
            }
            .lb-cookie-body a {
                color: #3b82f6;
                text-decoration: underline;
                transition: color 0.2s;
            }
            .lb-cookie-body a:hover {
                color: #60a5fa;
            }
            .lb-cookie-actions {
                display: flex;
                align-items: center;
                gap: 0.65rem;
                margin-top: 0.2rem;
            }
            .lb-cookie-btn-accept {
                flex: 1;
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: #ffffff;
                border: none;
                border-radius: 99px;
                padding: 0.6rem 1rem;
                font-size: 0.82rem;
                font-weight: 700;
                cursor: pointer;
                text-align: center;
                transition: transform 0.15s, box-shadow 0.2s, background 0.2s;
                box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
                font-family: inherit;
            }
            .lb-cookie-btn-accept:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 18px rgba(59, 130, 246, 0.5);
                background: #2563eb;
            }
            .lb-cookie-btn-details {
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.15);
                color: #cbd5e1;
                border-radius: 99px;
                padding: 0.58rem 0.9rem;
                font-size: 0.78rem;
                font-weight: 600;
                text-decoration: none;
                cursor: pointer;
                transition: background 0.2s, border-color 0.2s;
                font-family: inherit;
                white-space: nowrap;
            }
            .lb-cookie-btn-details:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.3);
                color: #fff;
            }

            @media (max-width: 600px) {
                #lb-cookie-banner {
                    bottom: max(0.8rem, env(safe-area-inset-bottom, 0px));
                    right: 0.8rem;
                    left: 0.8rem;
                    width: auto;
                    max-width: none;
                    padding: 1.1rem;
                }
                .lb-cookie-actions {
                    flex-direction: column;
                }
                .lb-cookie-btn-accept, .lb-cookie-btn-details {
                    width: 100%;
                    text-align: center;
                    box-sizing: border-box;
                }
            }
            `;
            document.head.appendChild(style);
        }

        // Cria o elemento
        const banner = document.createElement('div');
        banner.id = 'lb-cookie-banner';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Aviso de Privacidade e Armazenamento');

        banner.innerHTML = `
            <div class="lb-cookie-header">
                <i class="fas fa-shield-alt" aria-hidden="true"></i>
                <span>Privacidade & Armazenamento</span>
            </div>
            <p class="lb-cookie-body">
                Utilizamos armazenamento local para salvar seus imóveis favoritos, filtros de busca e assegurar a proteção e velocidade da navegação, de acordo com a nossa <a href="privacidade.html" target="_blank">Política de Privacidade (LGPD)</a>.
            </p>
            <div class="lb-cookie-actions">
                <button type="button" class="lb-cookie-btn-accept" id="_lb-accept-cookie-btn">Concordar e Fechar</button>
                <a href="privacidade.html" class="lb-cookie-btn-details">Saiba Mais</a>
            </div>
        `;

        document.body.appendChild(banner);

        // Exibe suavemente com pequeno delay
        setTimeout(function () {
            banner.classList.add('show');
        }, 800);

        // Evento de clique
        const acceptBtn = document.getElementById('_lb-accept-cookie-btn');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', function () {
                try {
                    localStorage.setItem(CONSENT_KEY, 'true');
                } catch (e) { }
                banner.classList.remove('show');
                setTimeout(function () {
                    if (banner.parentNode) banner.parentNode.removeChild(banner);
                }, 450);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCookieBanner);
    } else {
        setTimeout(initCookieBanner, 300);
    }
})();

