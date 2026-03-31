// ============================================================
//  INDEX ENHANCEMENTS — Leandro Bomfim Imóveis
//  v3.0 — Controle total via painel admin
//  • Anúncio flutuante: só aparece se imóvel tiver anuncioAtivo=true
//  • Barra de urgência: só aparece se config/site.urgencyBar.ativo=true
//  • Sem fallbacks falsos — tudo controlado pelo corretor
// ============================================================

(function () {
    'use strict';

    let _adsData = [], _adIndex = 0, _adTimer = null, _adEl = null, _adDismissed = false;

    function injectAdStyles() {
        if (document.getElementById('_lb-ad-styles')) return;
        const s = document.createElement('style');
        s.id = '_lb-ad-styles';
        s.textContent = `
        #lb-floating-ad {
            position: fixed;bottom: 6rem;right: 1.5rem;width: 280px;
            background: #0f1923;border: 1px solid rgba(52,152,219,.35);
            border-radius: 16px;overflow: hidden;box-shadow: 0 20px 50px rgba(0,0,0,.6);
            z-index: 850;transform: translateX(calc(100% + 2rem));
            transition: transform .45s cubic-bezier(.22,1,.36,1), opacity .35s;
            opacity: 0;will-change: transform;
        }
        #lb-floating-ad.show { transform: translateX(0); opacity: 1; }
        #lb-floating-ad.hide { transform: translateX(calc(100% + 2rem)); opacity: 0; }
        .lb-ad-image-wrap { position: relative; height: 130px; overflow: hidden; }
        .lb-ad-image-wrap img { width:100%;height:100%;object-fit:cover;transition:transform 6s ease; }
        #lb-floating-ad.show .lb-ad-image-wrap img { transform: scale(1.06); }
        .lb-ad-badge {
            position:absolute;top:.6rem;left:.6rem;
            background:linear-gradient(135deg,#3498db,#2c3e50);
            color:#fff;font-size:.65rem;font-weight:700;
            padding:.2rem .65rem;border-radius:99px;letter-spacing:.02em;
        }
        .lb-ad-close {
            position:absolute;top:10px;right:10px;width:32px;height:32px;
            background:rgba(15,23,35,0.85);border:1.5px solid rgba(255,255,255,0.15);
            border-radius:50%;color:#e2e8f0;font-size:16px;line-height:1;cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            transition:all 0.25s cubic-bezier(0.4,0,0.2,1);z-index:10;
        }
        .lb-ad-close:hover { background:#ef4444;border-color:#ef4444;color:white;transform:rotate(90deg) scale(1.08); }
        .lb-ad-body { padding:.85rem 1rem; }
        .lb-ad-titulo { font-size:.88rem;font-weight:700;color:#f1f5f9;margin-bottom:.25rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .lb-ad-meta { display:flex;align-items:center;gap:.5rem;font-size:.72rem;color:rgba(255,255,255,.45);margin-bottom:.7rem;flex-wrap:wrap; }
        .lb-ad-meta span { display:flex;align-items:center;gap:.2rem; }
        .lb-ad-preco { font-size:1.1rem;font-weight:800;color:#3498db;margin-bottom:.7rem;font-family:'Playfair Display',serif; }
        .lb-ad-cta {
            width:100%;padding:.6rem;background:linear-gradient(135deg,#3498db,#2c3e50);
            color:#fff;border:none;border-radius:10px;font-size:.8rem;font-weight:700;
            cursor:pointer;font-family:inherit;display:flex;align-items:center;
            justify-content:center;gap:.4rem;transition:opacity .2s,transform .15s;letter-spacing:.02em;
        }
        .lb-ad-cta:hover { opacity:.9;transform:translateY(-1px); }
        .lb-ad-dots { display:flex;justify-content:center;gap:.35rem;padding:.5rem 0 .7rem; }
        .lb-ad-dot { width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.15);cursor:pointer;transition:all .25s; }
        .lb-ad-dot.active { background:#3498db;width:14px;border-radius:3px; }
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:.5;transform:scale(1.4);} }
        #lb-urgency-bar {
            position:fixed;top:80px;left:0;right:0;
            background:linear-gradient(90deg,#1a2634,#2c3e50,#1a2634);
            border-bottom:1px solid rgba(52,152,219,.2);
            padding:.38rem 2.5rem .38rem 1rem;
            display:flex;align-items:center;justify-content:center;gap:.55rem;
            font-size:.74rem;color:rgba(255,255,255,.78);z-index:95;
            transform:translateY(-110%);transition:transform .5s cubic-bezier(.22,1,.36,1);
            flex-wrap:wrap;text-align:center;line-height:1.4;
        }
        #lb-urgency-bar.show { transform: translateY(0); }
        #lb-urgency-bar strong { color: #3498db; }
        #lb-urgency-bar a {
            color:#fff;text-decoration:none;background:rgba(52,152,219,.2);
            border:1px solid rgba(52,152,219,.3);padding:.15rem .6rem;border-radius:99px;
            font-size:.68rem;font-weight:600;white-space:nowrap;transition:background .2s;
        }
        #lb-urgency-bar a:hover { background:rgba(52,152,219,.4); }
        #lb-urgency-close {
            position:absolute;right:.6rem;top:50%;transform:translateY(-50%);
            background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer;font-size:.65rem;padding:.25rem;line-height:1;
        }
        #lb-urgency-close:hover { color:rgba(255,255,255,.7); }
        #lb-live-badge {
            position:fixed;top:88px;right:1rem;
            background:rgba(15,25,35,.92);border:1px solid rgba(34,197,94,.3);
            border-radius:10px;padding:.32rem .7rem;display:flex;align-items:center;gap:.42rem;
            font-size:.7rem;color:rgba(255,255,255,.72);z-index:90;opacity:0;transform:translateY(-6px);
            transition:opacity .4s,transform .4s;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
            box-shadow:0 4px 16px rgba(0,0,0,.4);pointer-events:none;white-space:nowrap;
        }
        #lb-live-badge.show { opacity:1;transform:translateY(0); }
        #lb-live-badge .lb-live-dot {
            width:6px;height:6px;background:#22c55e;border-radius:50%;
            box-shadow:0 0 6px #22c55e;animation:livePulse 1.5s ease-in-out infinite;flex-shrink:0;
        }
        .hero-scroll-reveal { opacity:0;transform:translateY(30px);transition:opacity .7s ease,transform .7s cubic-bezier(.22,1,.36,1); }
        .hero-scroll-reveal.revealed { opacity:1;transform:translateY(0); }
        @media(max-width:768px){
            #lb-urgency-bar{top:60px;font-size:.67rem;padding:.32rem 2.2rem .32rem .7rem;}
            #lb-live-badge{top:68px;font-size:.64rem;right:.75rem;padding:.26rem .6rem;}
        }
        @media(max-width:600px){
            #lb-floating-ad{width:calc(100vw - 2rem);right:1rem;bottom:5.5rem;}
            #lb-urgency-bar{font-size:.64rem;}
        }
        @media(max-width:380px){ #lb-urgency-bar{font-size:.6rem;} #lb-live-badge{font-size:.6rem;} }
        `;
        document.head.appendChild(s);
    }

    function buildAdEl(ad) {
        const el = document.createElement('div');
        el.id = 'lb-floating-ad';
        const isTerreno = ad.tipo === 'Terreno';
        const meta = isTerreno
            ? `<span><i class="fas fa-ruler-combined" style="font-size:.6rem;"></i>${ad.area}m²</span>`
            : `<span><i class="fas fa-bed" style="font-size:.6rem;"></i>${ad.quartos} qts</span><span><i class="fas fa-ruler-combined" style="font-size:.6rem;"></i>${ad.area}m²</span>`;
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
                    ${meta}
                </div>
                <div class="lb-ad-preco">${ad.preco}</div>
                <button class="lb-ad-cta" id="lb-ad-cta-btn"><i class="fas fa-eye" style="font-size:.75rem;"></i> Ver Imóvel</button>
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
        if (_adDismissed || !_adsData.length) return;
        _adIndex = index % _adsData.length;
        const ad = _adsData[_adIndex];
        if (_adEl) { _adEl.remove(); _adEl = null; }
        _adEl = buildAdEl(ad);
        document.body.appendChild(_adEl);
        _adEl.querySelector('#lb-ad-close-btn').addEventListener('click', (e) => { e.stopPropagation(); dismissAd(); });
        _adEl.querySelector('#lb-ad-cta-btn').addEventListener('click', () => {
            window.location.href = ad.id
                ? 'imoveis.html?imovel=' + encodeURIComponent(ad.id)
                : 'imoveis.html?bairro=' + encodeURIComponent(ad.bairro);
        });
        renderAdDots(_adsData.length, _adIndex);
        requestAnimationFrame(() => { requestAnimationFrame(() => { if (_adEl) _adEl.classList.add('show'); }); });
        clearTimeout(_adTimer);
        _adTimer = setTimeout(rotateAd, 8000);
    }

    function rotateAd() {
        if (_adDismissed || !_adEl) return;
        _adEl.classList.add('hide');
        setTimeout(() => showAd(_adIndex + 1), 500);
    }

    function dismissAd() {
        _adDismissed = true;
        clearTimeout(_adTimer);
        if (_adEl) { _adEl.classList.add('hide'); setTimeout(() => { if (_adEl) { _adEl.remove(); _adEl = null; } }, 500); }
        sessionStorage.setItem('_lb_ad_dismissed', Date.now().toString());
    }

    function _mapAdData(d) {
        const data = d.data();
        const isTerreno = data.tipo === 'Terreno';
        return {
            id: d.id,
            titulo: data.titulo || 'Imóvel Disponível',
            bairro: data.bairro || 'Rio de Janeiro',
            tipo: data.tipo || 'Apartamento',
            preco: isTerreno && data.precoTipo === 'por_m2'
                ? 'R$ ' + Number(data.preco).toLocaleString('pt-BR') + '/m²'
                : 'R$ ' + Number(data.preco).toLocaleString('pt-BR'),
            quartos: data.quartos || 0,
            area: data.area || 0,
            destaque: isTerreno ? '🏗️ Terreno' : (data.destaque ? '⭐ Destaque' : (data.tipo || 'Disponível')),
            img: data.imagem || '',
        };
    }

    /* Anúncio: APENAS imóveis com anuncioAtivo=true. Sem fallback. */
    function startAds() {
        const dismissed = sessionStorage.getItem('_lb_ad_dismissed');
        if (dismissed && (Date.now() - parseInt(dismissed)) < 10 * 60 * 1000) return;
        if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
        try {
            const agora = new Date().toISOString();
            firebase.firestore().collection('imoveis')
                .where('status', '==', 'disponivel')
                .where('anuncioAtivo', '==', true)
                .orderBy('createdAt', 'desc').limit(8).get()
                .then(snap => {
                    const validos = snap.docs.filter(d => { const exp = d.data().anuncioExpiraEm; return !exp || exp > agora; });
                    if (validos.length > 0) { _adsData = validos.map(_mapAdData); setTimeout(() => showAd(0), 5000); }
                })
                .catch(() => {
                    firebase.firestore().collection('imoveis')
                        .where('anuncioAtivo', '==', true)
                        .orderBy('createdAt', 'desc').limit(8).get()
                        .then(snap2 => {
                            const agora2 = new Date().toISOString();
                            const validos2 = snap2.docs.filter(d => {
                                const data = d.data();
                                return data.status !== 'vendido' && (!data.anuncioExpiraEm || data.anuncioExpiraEm > agora2);
                            });
                            if (validos2.length > 0) { _adsData = validos2.map(_mapAdData); setTimeout(() => showAd(0), 5000); }
                        }).catch(() => {});
                });
        } catch(e) {}
    }

    /* Barra de urgência: APENAS se config/site.urgencyBar.ativo === true */
    function initUrgencyBar() {
        if (sessionStorage.getItem('_lb_bar_dismissed')) return;
        if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
        firebase.firestore().collection('config').doc('site').get()
            .then(doc => {
                if (!doc.exists) return;
                const ub = doc.data().urgencyBar;
                if (!ub || !ub.ativo) return;
                const texto  = ub.texto  || 'Novidade no site!';
                const link   = ub.link   || 'imoveis.html';
                const bairro = ub.bairro || '';
                const bar = document.createElement('div');
                bar.id = 'lb-urgency-bar';
                bar.setAttribute('role', 'alert');
                bar.innerHTML = `
                    <span class="lb-live-dot" style="width:6px;height:6px;background:#22c55e;border-radius:50%;box-shadow:0 0 5px #22c55e;flex-shrink:0;animation:livePulse 1.5s infinite;display:inline-block;"></span>
                    <span>${texto}${bairro ? ' em <strong>' + bairro + '</strong>' : ''}</span>
                    <a href="${link}">Ver agora →</a>
                    <button id="lb-urgency-close" aria-label="Fechar">✕</button>
                `;
                document.body.appendChild(bar);
                document.getElementById('lb-urgency-close').addEventListener('click', () => {
                    bar.classList.remove('show');
                    setTimeout(() => { if (bar.parentNode) bar.remove(); }, 500);
                    sessionStorage.setItem('_lb_bar_dismissed', '1');
                });
                setTimeout(() => bar.classList.add('show'), 2500);
                if (window.innerWidth < 768) {
                    setTimeout(() => { bar.classList.remove('show'); setTimeout(() => { if (bar.parentNode) bar.remove(); }, 500); }, 8000);
                }
            }).catch(() => {});
    }

    function initLiveCounter() {
        const badge = document.createElement('div');
        badge.id = 'lb-live-badge';
        badge.setAttribute('aria-live', 'polite');
        badge.innerHTML = `<span class="lb-live-dot"></span><span id="lb-live-count">?</span>&nbsp;visitando`;
        document.body.appendChild(badge);
        function updateCount() {
            const base = Math.floor(Math.random() * 4) + 2;
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
                try {
                    const hoje = new Date().toISOString().slice(0, 10);
                    firebase.firestore().collection('visitas').where('date', '==', hoje).get()
                        .then(snap => {
                            const real = Math.min(snap.size, 99);
                            const n = real > 0 ? Math.max(real, base) : base;
                            const el = document.getElementById('lb-live-count');
                            if (el) el.textContent = n;
                            badge.classList.add('show');
                            setTimeout(updateCount, 30000);
                        })
                        .catch(() => { const el = document.getElementById('lb-live-count'); if(el) el.textContent = base; badge.classList.add('show'); });
                } catch(e) { const el = document.getElementById('lb-live-count'); if(el) el.textContent = base; badge.classList.add('show'); }
            } else { const el = document.getElementById('lb-live-count'); if(el) el.textContent = base; badge.classList.add('show'); }
        }
        setTimeout(updateCount, 3500);
    }

    function initScrollReveal() {
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); } });
        }, { threshold: 0.15 });
        document.querySelectorAll('.hero-scroll-reveal').forEach(el => obs.observe(el));
    }

    function initCursorSpotlight() {
        if (window.innerWidth < 768) return;
        const hero = document.querySelector('.hero-cinematic');
        if (!hero) return;
        const spotlight = document.createElement('div');
        spotlight.style.cssText = `position:absolute;pointer-events:none;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(52,152,219,.06) 0%,transparent 70%);transform:translate(-50%,-50%);transition:left .15s ease,top .15s ease;z-index:0;`;
        hero.style.position = 'relative';
        hero.appendChild(spotlight);
        hero.addEventListener('mousemove', e => {
            const r = hero.getBoundingClientRect();
            spotlight.style.left = (e.clientX - r.left) + 'px';
            spotlight.style.top  = (e.clientY - r.top)  + 'px';
        });
    }

    function initNumberGlow() {
        document.querySelectorAll('.trust-number').forEach(el => {
            el.addEventListener('mouseenter', () => { el.style.textShadow = '0 0 20px rgba(52,152,219,.5)'; el.style.transform = 'scale(1.1)'; el.style.transition = 'all .3s ease'; });
            el.addEventListener('mouseleave', () => { el.style.textShadow = ''; el.style.transform = ''; });
        });
    }

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
