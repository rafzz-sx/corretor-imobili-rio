// ============================================================
//  INDEX ENHANCEMENTS — Leandro Bomfim Imóveis
//  Anúncios flutuantes, micro-interações, contador ao vivo
// ============================================================

(function () {
    'use strict';

    /* ── Dados dos anúncios flutuantes (busca imóveis do Firestore) ── */
    const ADS_FALLBACK = [
        { titulo: 'Cobertura em Ipanema', bairro: 'Ipanema', preco: 'R$ 1,8M', quartos: 3, area: 180, destaque: '🔥 Novo!', img: 'https://remax.azureedge.net/userimages/60/LargeWM/L_b74eaab9-55e3-43c2-8814-06f6152a1f05.jpg' },
        { titulo: 'Apartamento no Leblon', bairro: 'Leblon', preco: 'R$ 1,2M', quartos: 2, area: 95, destaque: '⭐ Destaque', img: 'https://files.catbox.moe/ta8pp6.png' },
        { titulo: 'Cobertura na Barra', bairro: 'Barra da Tijuca', preco: 'R$ 950k', quartos: 3, area: 140, destaque: '🏖️ Vista Mar', img: 'https://imovio.com.br/wp-content/uploads/2023/02/3478296843.jpg' },
        { titulo: 'Studio em Copacabana', bairro: 'Copacabana', preco: 'R$ 420k', quartos: 1, area: 42, destaque: '💎 Oportunidade', img: 'https://files.catbox.moe/ihe3p5.png' },
    ];

    let _adsData = [];
    let _adIndex = 0;
    let _adTimer = null;
    let _adEl = null;
    let _adDismissed = false;
    let _liveCount = 0;

    /* ══════════════════════════════════════════
       1. ANÚNCIOS FLUTUANTES
    ══════════════════════════════════════════ */

    function injectAdStyles() {
        if (document.getElementById('_lb-ad-styles')) return;
        const s = document.createElement('style');
        s.id = '_lb-ad-styles';
        s.textContent = `
        /* ── Anúncio Flutuante ── */
        #lb-floating-ad {
            position: fixed;
            bottom: 6rem;
            right: 1.5rem;
            width: 280px;
            background: #0f1923;
            border: 1px solid rgba(52,152,219,.35);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0,0,0,.6), 0 0 0 1px rgba(52,152,219,.1);
            z-index: 850;
            transform: translateX(calc(100% + 2rem));
            transition: transform .45s cubic-bezier(.22,1,.36,1), opacity .35s;
            opacity: 0;
            will-change: transform;
        }
        #lb-floating-ad.show {
            transform: translateX(0);
            opacity: 1;
        }
        #lb-floating-ad.hide {
            transform: translateX(calc(100% + 2rem));
            opacity: 0;
        }
        .lb-ad-image-wrap {
            position: relative;
            height: 130px;
            overflow: hidden;
        }
        .lb-ad-image-wrap img {
            width: 100%; height: 100%; object-fit: cover;
            transition: transform 6s ease;
        }
        #lb-floating-ad.show .lb-ad-image-wrap img {
            transform: scale(1.06);
        }
        .lb-ad-badge {
            position: absolute;
            top: .6rem; left: .6rem;
            background: linear-gradient(135deg, #3498db, #2c3e50);
            color: #fff;
            font-size: .65rem; font-weight: 700;
            padding: .2rem .65rem;
            border-radius: 99px;
            backdrop-filter: blur(4px);
            letter-spacing: .02em;
        }
        .lb-ad-close {
            position: absolute;
            top: .5rem; right: .5rem;
            width: 24px; height: 24px;
            background: rgba(0,0,0,.55);
            border: none; border-radius: 50%;
            color: rgba(255,255,255,.7);
            font-size: .6rem; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: background .2s;
        }
        .lb-ad-close:hover { background: rgba(239,68,68,.6); color: #fff; }
        .lb-ad-body {
            padding: .85rem 1rem;
        }
        .lb-ad-titulo {
            font-size: .88rem;
            font-weight: 700;
            color: #f1f5f9;
            margin-bottom: .25rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .lb-ad-meta {
            display: flex;
            align-items: center;
            gap: .5rem;
            font-size: .72rem;
            color: rgba(255,255,255,.45);
            margin-bottom: .7rem;
            flex-wrap: wrap;
        }
        .lb-ad-meta span { display: flex; align-items: center; gap: .2rem; }
        .lb-ad-preco {
            font-size: 1.1rem;
            font-weight: 800;
            color: #3498db;
            margin-bottom: .7rem;
            font-family: 'Playfair Display', serif;
        }
        .lb-ad-cta {
            width: 100%;
            padding: .6rem;
            background: linear-gradient(135deg, #3498db, #2c3e50);
            color: #fff;
            border: none;
            border-radius: 10px;
            font-size: .8rem;
            font-weight: 700;
            cursor: pointer;
            font-family: inherit;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: .4rem;
            transition: opacity .2s, transform .15s;
            letter-spacing: .02em;
        }
        .lb-ad-cta:hover { opacity: .9; transform: translateY(-1px); }
        .lb-ad-dots {
            display: flex;
            justify-content: center;
            gap: .35rem;
            padding: .5rem 0 .7rem;
        }
        .lb-ad-dot {
            width: 5px; height: 5px;
            border-radius: 50%;
            background: rgba(255,255,255,.15);
            cursor: pointer;
            transition: all .25s;
        }
        .lb-ad-dot.active {
            background: #3498db;
            width: 14px;
            border-radius: 3px;
        }

        /* ── Contador ao vivo de visitantes ── */
        #lb-live-badge {
            position: fixed;
            top: 90px;
            right: 1.2rem;
            background: rgba(15,25,35,.9);
            border: 1px solid rgba(34,197,94,.3);
            border-radius: 10px;
            padding: .4rem .8rem;
            display: flex;
            align-items: center;
            gap: .5rem;
            font-size: .72rem;
            color: rgba(255,255,255,.7);
            z-index: 700;
            opacity: 0;
            transform: translateY(-10px);
            transition: opacity .4s, transform .4s;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 16px rgba(0,0,0,.4);
            pointer-events: none;
        }
        #lb-live-badge.show { opacity: 1; transform: translateY(0); }
        #lb-live-badge .lb-live-dot {
            width: 6px; height: 6px;
            background: #22c55e;
            border-radius: 50%;
            box-shadow: 0 0 6px #22c55e;
            animation: livePulse 1.5s ease-in-out infinite;
            flex-shrink: 0;
        }
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.5;transform:scale(1.4);} }

        /* ── Micro-interação no scroll do hero ── */
        .hero-scroll-reveal {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity .7s ease, transform .7s cubic-bezier(.22,1,.36,1);
        }
        .hero-scroll-reveal.revealed {
            opacity: 1;
            transform: translateY(0);
        }

        /* ── Barra de urgência ── */
        #lb-urgency-bar {
            position: fixed;
            top: 80px;
            left: 0; right: 0;
            background: linear-gradient(90deg, #1a2634, #2c3e50, #1a2634);
            border-bottom: 1px solid rgba(52,152,219,.2);
            padding: .45rem 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: .8rem;
            font-size: .78rem;
            color: rgba(255,255,255,.75);
            z-index: 99;
            transform: translateY(-100%);
            transition: transform .5s cubic-bezier(.22,1,.36,1);
        }
        #lb-urgency-bar.show { transform: translateY(0); }
        #lb-urgency-bar strong { color: #3498db; }
        #lb-urgency-bar a {
            color: #fff;
            text-decoration: none;
            background: rgba(52,152,219,.2);
            border: 1px solid rgba(52,152,219,.3);
            padding: .2rem .7rem;
            border-radius: 99px;
            font-size: .72rem;
            font-weight: 600;
            transition: background .2s;
        }
        #lb-urgency-bar a:hover { background: rgba(52,152,219,.4); }
        #lb-urgency-close {
            position: absolute;
            right: 1rem;
            background: none;
            border: none;
            color: rgba(255,255,255,.3);
            cursor: pointer;
            font-size: .7rem;
            padding: .2rem;
        }
        #lb-urgency-close:hover { color: rgba(255,255,255,.7); }

        @media(max-width:600px){
            #lb-floating-ad { width:calc(100vw - 2rem); right:1rem; }
            #lb-urgency-bar { font-size:.7rem; gap:.5rem; padding:.4rem .8rem; }
            #lb-live-badge { top:82px; font-size:.65rem; }
        }
        `;
        document.head.appendChild(s);
    }

    function buildAdEl(ad) {
        const el = document.createElement('div');
        el.id = 'lb-floating-ad';
        el.innerHTML = `
            <div class="lb-ad-image-wrap">
                <img src="${ad.img}" alt="${ad.titulo}" loading="lazy" onerror="this.src='https://via.placeholder.com/280x130/1a1a2e/fff?text=Imóvel'">
                <span class="lb-ad-badge">${ad.destaque}</span>
                <button class="lb-ad-close" id="lb-ad-close-btn" aria-label="Fechar anúncio">✕</button>
            </div>
            <div class="lb-ad-body">
                <div class="lb-ad-titulo">${ad.titulo}</div>
                <div class="lb-ad-meta">
                    <span><i class="fas fa-map-marker-alt" style="color:#3498db;font-size:.6rem;"></i>${ad.bairro}</span>
                    <span><i class="fas fa-bed" style="font-size:.6rem;"></i>${ad.quartos} qts</span>
                    <span><i class="fas fa-ruler-combined" style="font-size:.6rem;"></i>${ad.area}m²</span>
                </div>
                <div class="lb-ad-preco">${ad.preco}</div>
                <button class="lb-ad-cta" id="lb-ad-cta-btn">
                    <i class="fas fa-eye" style="font-size:.75rem;"></i> Ver Imóvel
                </button>
            </div>
            <div class="lb-ad-dots" id="lb-ad-dots"></div>
        `;
        return el;
    }

    function renderAdDots(total, active) {
        const dots = document.getElementById('lb-ad-dots');
        if (!dots) return;
        dots.innerHTML = Array.from({ length: total }, (_, i) =>
            `<span class="lb-ad-dot ${i === active ? 'active' : ''}" data-i="${i}"></span>`
        ).join('');
        dots.querySelectorAll('.lb-ad-dot').forEach(dot => {
            dot.addEventListener('click', () => showAd(parseInt(dot.dataset.i)));
        });
    }

    function showAd(index) {
        if (_adDismissed) return;
        const ads = _adsData.length ? _adsData : ADS_FALLBACK;
        if (!ads.length) return;
        _adIndex = index % ads.length;
        const ad = ads[_adIndex];

        // Remove ad existente
        if (_adEl) { _adEl.remove(); _adEl = null; }

        _adEl = buildAdEl(ad);
        document.body.appendChild(_adEl);

        _adEl.querySelector('#lb-ad-close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            dismissAd();
        });

        const ctaBtn = _adEl.querySelector('#lb-ad-cta-btn');
        ctaBtn.addEventListener('click', () => {
            window.location.href = 'imoveis.html?bairro=' + encodeURIComponent(ad.bairro);
        });

        renderAdDots(ads.length, _adIndex);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (_adEl) _adEl.classList.add('show');
            });
        });

        // Rotação automática: próximo ad em 8s
        clearTimeout(_adTimer);
        _adTimer = setTimeout(() => {
            rotateAd();
        }, 8000);
    }

    function rotateAd() {
        if (_adDismissed || !_adEl) return;
        _adEl.classList.add('hide');
        setTimeout(() => {
            showAd(_adIndex + 1);
        }, 500);
    }

    function dismissAd() {
        _adDismissed = true;
        clearTimeout(_adTimer);
        if (_adEl) {
            _adEl.classList.add('hide');
            setTimeout(() => { if (_adEl) { _adEl.remove(); _adEl = null; } }, 500);
        }
        // Não mostra mais por 10min na sessão
        sessionStorage.setItem('_lb_ad_dismissed', Date.now().toString());
    }

    function startAds() {
        // Se já dispensou na sessão, não mostra
        const dismissed = sessionStorage.getItem('_lb_ad_dismissed');
        if (dismissed && (Date.now() - parseInt(dismissed)) < 10 * 60 * 1000) return;

        // Tenta carregar imóveis do Firestore
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
            try {
                const db = firebase.firestore();
                db.collection('imoveis')
                    .where('status', '==', 'disponivel')
                    .orderBy('createdAt', 'desc')
                    .limit(6)
                    .get()
                    .then(snap => {
                        if (snap.size > 0) {
                            _adsData = snap.docs.map(d => {
                                const data = d.data();
                                return {
                                    id: d.id,
                                    titulo: data.titulo || 'Imóvel Disponível',
                                    bairro: data.bairro || 'Rio de Janeiro',
                                    preco: 'R$ ' + Number(data.preco).toLocaleString('pt-BR'),
                                    quartos: data.quartos || 1,
                                    area: data.area || 0,
                                    destaque: data.destaque ? '⭐ Destaque' : (data.tipo || 'Disponível'),
                                    img: data.imagem || '',
                                };
                            });
                        }
                        // Mostra após 5s de carregamento
                        setTimeout(() => showAd(0), 5000);
                    })
                    .catch(() => setTimeout(() => showAd(0), 5000));
            } catch(e) {
                setTimeout(() => showAd(0), 5000);
            }
        } else {
            setTimeout(() => showAd(0), 5000);
        }
    }

    /* ══════════════════════════════════════════
       2. BARRA DE URGÊNCIA (top)
    ══════════════════════════════════════════ */

    function initUrgencyBar() {
        if (sessionStorage.getItem('_lb_bar_dismissed')) return;
        const bar = document.createElement('div');
        bar.id = 'lb-urgency-bar';
        bar.innerHTML = `
            <span class="lb-live-dot" style="width:6px;height:6px;background:#22c55e;border-radius:50%;box-shadow:0 0 5px #22c55e;flex-shrink:0;animation:livePulse 1.5s infinite;display:inline-block;"></span>
            <span>Novo imóvel adicionado em <strong>Ipanema</strong> esta semana!</span>
            <a href="imoveis.html?bairro=Ipanema">Ver agora →</a>
            <button id="lb-urgency-close" aria-label="Fechar aviso">✕</button>
        `;
        document.body.appendChild(bar);

        document.getElementById('lb-urgency-close').addEventListener('click', () => {
            bar.classList.remove('show');
            setTimeout(() => bar.remove(), 500);
            sessionStorage.setItem('_lb_bar_dismissed', '1');
        });

        // Exibe após 2s
        setTimeout(() => bar.classList.add('show'), 2000);
    }

    /* ══════════════════════════════════════════
       3. CONTADOR DE VISITANTES AO VIVO
    ══════════════════════════════════════════ */

    function initLiveCounter() {
        const badge = document.createElement('div');
        badge.id = 'lb-live-badge';
        badge.innerHTML = `<span class="lb-live-dot"></span><span id="lb-live-count">?</span> pessoas visitando agora`;
        document.body.appendChild(badge);

        // Simula contagem com dado real se disponível
        function updateCount() {
            const baseCount = Math.floor(Math.random() * 4) + 2; // 2-5 visitantes
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
                try {
                    const db = firebase.firestore();
                    const hoje = new Date().toISOString().slice(0, 10);
                    db.collection('visitas').where('date', '==', hoje).get().then(snap => {
                        const real = Math.min(snap.size, 99);
                        const displayed = real > 0 ? Math.max(real, baseCount) : baseCount;
                        document.getElementById('lb-live-count').textContent = displayed;
                        badge.classList.add('show');
                        // Atualiza a cada 30s
                        setTimeout(updateCount, 30000);
                    }).catch(() => {
                        document.getElementById('lb-live-count').textContent = baseCount;
                        badge.classList.add('show');
                    });
                } catch(e) {
                    document.getElementById('lb-live-count').textContent = baseCount;
                    badge.classList.add('show');
                }
            } else {
                document.getElementById('lb-live-count').textContent = baseCount;
                badge.classList.add('show');
            }
        }

        setTimeout(updateCount, 3000);
    }

    /* ══════════════════════════════════════════
       4. SCROLL REVEAL — elementos extras
    ══════════════════════════════════════════ */

    function initScrollReveal() {
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        document.querySelectorAll('.hero-scroll-reveal').forEach(el => obs.observe(el));
    }

    /* ══════════════════════════════════════════
       5. CURSOR SPOTLIGHT no hero (desktop)
    ══════════════════════════════════════════ */

    function initCursorSpotlight() {
        if (window.innerWidth < 768) return;
        const hero = document.querySelector('.hero-cinematic');
        if (!hero) return;

        let spotlight = document.createElement('div');
        spotlight.style.cssText = `
            position:absolute;pointer-events:none;
            width:300px;height:300px;border-radius:50%;
            background:radial-gradient(circle,rgba(52,152,219,.06) 0%,transparent 70%);
            transform:translate(-50%,-50%);
            transition:left .15s ease,top .15s ease;
            z-index:0;
        `;
        hero.style.position = 'relative';
        hero.appendChild(spotlight);

        hero.addEventListener('mousemove', e => {
            const rect = hero.getBoundingClientRect();
            spotlight.style.left = (e.clientX - rect.left) + 'px';
            spotlight.style.top = (e.clientY - rect.top) + 'px';
        });
    }

    /* ══════════════════════════════════════════
       6. MICRO-ANIMAÇÃO nos números do hero
    ══════════════════════════════════════════ */

    function initNumberGlow() {
        document.querySelectorAll('.trust-number').forEach(el => {
            el.addEventListener('mouseenter', () => {
                el.style.textShadow = '0 0 20px rgba(52,152,219,.5)';
                el.style.transform = 'scale(1.1)';
                el.style.transition = 'all .3s ease';
            });
            el.addEventListener('mouseleave', () => {
                el.style.textShadow = '';
                el.style.transform = '';
            });
        });
    }

    /* ── Init ── */
    function init() {
        injectAdStyles();
        initUrgencyBar();
        startAds();
        initLiveCounter();
        initScrollReveal();
        initCursorSpotlight();
        initNumberGlow();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();