// ============================================================
//  BOTÃO WHATSAPP FLUTUANTE — Leandro Bomfim Imóveis
// ============================================================

(function () {
    'use strict';

    // Guard: nunca executar duas vezes na mesma página
    if (window._lbWaWidgetLoaded) return;
    window._lbWaWidgetLoaded = true;

    // ── Contato ──
    const KB = {
        wa: (txt) => `https://wa.me/5521981424469?text=${encodeURIComponent(txt || 'Olá Leandro!')}`,
    };

    // ── Cria o widget ──
    function createWidget() {
        if (document.getElementById('lb-contact-dock')) return;

        // Remove botões flutuantes de WhatsApp duplicados que possam existir na página
        document.querySelectorAll('a.whatsapp-float').forEach((el) => el.remove());

        const style = document.createElement('style');
        style.id = '_lb-wa-styles';
        style.textContent = `
        /* ── Base ── */
        #lb-contact-dock {
            visibility: visible !important;
            box-sizing: border-box;
            font-family: 'Montserrat', sans-serif;
        }

        /* ── Dock (canto inferior ESQUERDO) ── */
        #lb-contact-dock {
            position: fixed;
            bottom: max(1.1rem, env(safe-area-inset-bottom, 0px));
            left: max(1rem, env(safe-area-inset-left, 0px));
            z-index: 10040;
            display: flex;
            flex-direction: column-reverse;
            align-items: flex-start;
            gap: 0.65rem;
            animation: lb-bounceIn .55s cubic-bezier(.22,1,.36,1) both;
            animation-delay: 1s;
        }

        /* ── Botão WhatsApp ── */
        #lb-wa-dock {
            position: relative; flex-shrink: 0;
            width: 56px; height: 56px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            text-decoration: none; color: #25d366;
            background: linear-gradient(165deg, #0f172a 0%, #152535 100%);
            border: 2px solid rgba(37, 211, 102, 0.55);
            box-shadow: 0 4px 22px rgba(0,0,0,.45), 0 0 0 1px rgba(59,130,246,.22);
            transition: transform .22s, box-shadow .22s, border-color .22s;
        }
        #lb-wa-dock:hover {
            transform: translateY(-2px) scale(1.04);
            border-color: rgba(37, 211, 102, 0.88);
            box-shadow: 0 8px 28px rgba(37, 211, 102, 0.22), 0 0 0 1px rgba(59,130,246,.35);
        }
        .lb-dock-wa-pulse {
            position: absolute; inset: 0; border-radius: 50%; pointer-events: none; z-index: 0;
            background: rgba(37, 211, 102, 0.35); animation: lb-waPulse 2.2s ease-out infinite;
        }
        #lb-wa-dock .fab { position: relative; z-index: 1; font-size: 1.42rem; line-height: 1; }
        @keyframes lb-waPulse { 0%{transform:scale(1);opacity:.65;} 70%{transform:scale(1.2);opacity:0;} 100%{opacity:0;} }

        /* ── Tooltip label (aparece ao hover) ── */
        .lb-fab-label {
            position: absolute; left: 66px; top: 50%;
            transform: translateY(-50%) translateX(-6px);
            background: rgba(16,26,40,.97); color: #f1f5f9;
            padding: 6px 12px; border-radius: 8px;
            font-size: 12px; font-weight: 600; white-space: nowrap; pointer-events: none;
            opacity: 0; transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
            box-shadow: 0 6px 20px rgba(0,0,0,0.5); border: 1px solid rgba(59,130,246,.22);
            font-family: inherit; z-index: 1;
        }
        #lb-wa-dock:hover .lb-fab-label {
            opacity: 1; transform: translateY(-50%) translateX(0);
        }

        /* ── Animações ── */
        @keyframes lb-bounceIn { from{opacity:0;transform:scale(.4) translateY(20px);}to{opacity:1;transform:scale(1) translateY(0);} }

        /* ── Responsive Mobile ── */
        @media (max-width: 600px) {
            #lb-contact-dock {
                bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));
                left: max(0.75rem, env(safe-area-inset-left, 0px));
                gap: 0.5rem;
            }
            #lb-wa-dock { width: 52px; height: 52px; }
            #lb-wa-dock .fab { font-size: 1.3rem; }
            /* Tooltips: oculta no mobile */
            .lb-fab-label { display: none !important; }
        }

        /* Painel Admin: oculta widget */
        @media (max-width: 768px) {
            body.admin-page #lb-contact-dock { display: none !important; }
        }
        `;
        document.head.appendChild(style);

        // ── Dock container ──
        const dock = document.createElement('div');
        dock.id = 'lb-contact-dock';

        // ── Botão WhatsApp ──
        const wa = document.createElement('a');
        wa.id = 'lb-wa-dock';
        wa.href = KB.wa('Olá Leandro! Tenho interesse em imóveis. Pode me ajudar?');
        wa.target = '_blank';
        wa.rel = 'noopener noreferrer';
        wa.setAttribute('aria-label', 'Falar com Leandro no WhatsApp');
        wa.innerHTML = '<span class="lb-dock-wa-pulse" aria-hidden="true"></span><i class="fab fa-whatsapp" aria-hidden="true"></i><span class="lb-fab-label">WhatsApp</span>';

        dock.appendChild(wa);
        document.body.appendChild(dock);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget, { once: true });
    } else {
        createWidget();
    }

})();
