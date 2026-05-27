// ============================================================
//  INDEX ENHANCEMENTS — Leandro Bomfim Imóveis
//  v4.0 — Quiz enxuto, filtros alinhados ao catálogo, anúncios refinados
// ============================================================

(function () {
    'use strict';

    let _adsData = [], _adIndex = 0, _adTimer = null, _adEl = null, _adDismissed = false;

    const QUIZ_REGIOES = {
        'zona-sul': ['Ipanema', 'Leblon', 'Copacabana', 'Botafogo', 'Flamengo'],
        'barra-recreio': [
            'Barra da Tijuca', 'Barra Olímpica', 'Recreio dos Bandeirantes',
            'Jacarepaguá', 'Vargem Grande', 'Vargem Pequena',
            'Pedra de Guaratiba', 'Grumari', 'Camorim', 'Taquara', 'Curicica',
        ],
    };

    // Sugestões de autocompletar para o campo de localização livre
    const LOCATION_SUGGESTIONS = [
        'Ipanema', 'Leblon', 'Copacabana', 'Botafogo', 'Flamengo',
        'Barra da Tijuca', 'Barra Olímpica', 'Recreio dos Bandeirantes',
        'Jacarepaguá', 'Vargem Grande', 'Vargem Pequena', 'Pedra de Guaratiba',
        'Grumari', 'Camorim', 'Taquara', 'Curicica',
        'Tijuca', 'Vila Isabel', 'Méier', 'Madureira', 'Campo Grande',
        'Santa Teresa', 'Glória', 'Catete', 'Lapa', 'Centro',
        'Humaitá', 'Laranjeiras', 'Cosme Velho', 'Urca',
        'São Conrado', 'Joá', 'Itanhangá', 'Barra de Guaratiba',
        'Zona Sul', 'Zona Norte', 'Zona Oeste',
    ];

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function safePageHref(href) {
        const s = String(href || '').trim();
        if (/^javascript:/i.test(s)) return 'imoveis.html';
        if (/^https?:\/\//i.test(s)) return s;
        if (/^[a-z0-9_.-]+\.html(\?.*)?$/i.test(s)) return s;
        if (s.startsWith('/') && !s.startsWith('//')) return s;
        return 'imoveis.html';
    }

    function injectAdStyles() {
        if (document.getElementById('_lb-ad-styles')) return;
        const s = document.createElement('style');
        s.id = '_lb-ad-styles';
        s.textContent = `
        #lb-floating-ad {
            position: fixed;
            bottom: calc(6rem + env(safe-area-inset-bottom, 0px));
            right: max(1rem, env(safe-area-inset-right, 0px));
            width: 280px;
            max-width: calc(100vw - 2rem);
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
        .lb-ad-dot.active { background:#3498db;width:18px;height:5px;border-radius:999px; }
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
        .hero-scroll-reveal { opacity:0;transform:translateY(30px);transition:opacity .7s ease,transform .7s cubic-bezier(.22,1,.36,1); }
        .hero-scroll-reveal.revealed { opacity:1;transform:translateY(0); }
        @media(max-width:768px){
            #lb-urgency-bar{top:60px;font-size:.67rem;padding:.32rem 2.2rem .32rem .7rem;}
        }
        @media(max-width:600px){
            #lb-floating-ad{
                width:calc(100vw - 2rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px));
                right:max(1rem, env(safe-area-inset-right, 0px));
                left:auto;
                bottom:calc(5.5rem + env(safe-area-inset-bottom, 0px));
            }
            #lb-urgency-bar{font-size:.64rem;}
        }
        @media(max-width:380px){ #lb-urgency-bar{font-size:.6rem;} }
        `;
        document.head.appendChild(s);
    }

    function quizModalOpen() {
        const m = document.getElementById('quiz-modal');
        return m && m.classList.contains('active');
    }

    function buildAdEl(ad) {
        const el = document.createElement('div');
        el.id = 'lb-floating-ad';
        const isTerreno = ad.tipo === 'Terreno';
        const meta = isTerreno
            ? `<span><i class="fas fa-ruler-combined" style="font-size:.6rem;"></i>${ad.area}m²</span>`
            : `<span><i class="fas fa-bed" style="font-size:.6rem;"></i>${ad.quartos} qts</span><span><i class="fas fa-ruler-combined" style="font-size:.6rem;"></i>${ad.area}m²</span>`;
        const tituloEsc = escapeHtml(ad.titulo);
        const bairroEsc = escapeHtml(ad.bairro);
        const badgeEsc = escapeHtml(ad.destaque);
        el.innerHTML = `
            <div class="lb-ad-image-wrap">
                <img src="${escapeHtml(ad.img)}" alt="${tituloEsc}" loading="lazy" onerror="this.src='https://via.placeholder.com/280x130/1a1a2e/fff?text=Imóvel'">
                <span class="lb-ad-badge">${badgeEsc}</span>
                <button type="button" class="lb-ad-close" id="lb-ad-close-btn" aria-label="Fechar anuncio">&#10005;</button>
            </div>
            <div class="lb-ad-body">
                <div class="lb-ad-titulo">${tituloEsc}</div>
                <div class="lb-ad-meta">
                    <span><i class="fas fa-map-marker-alt" style="color:#3498db;font-size:.6rem;"></i>${bairroEsc}</span>
                    ${meta}
                </div>
                <div class="lb-ad-preco">${escapeHtml(ad.preco)}</div>
                <button type="button" class="lb-ad-cta" id="lb-ad-cta-btn"><i class="fas fa-eye" style="font-size:.75rem;"></i> Ver Imóvel</button>
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
            dot.addEventListener('click', () => showAd(parseInt(dot.dataset.i, 10)));
        });
    }

    function showAd(index) {
        if (_adDismissed || !_adsData.length || quizModalOpen()) return;
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
        if (_adDismissed || !_adEl || quizModalOpen()) return;
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
            titulo: data.titulo || 'Imovel Disponivel',
            bairro: data.bairro || 'Rio de Janeiro',
            tipo: data.tipo || 'Apartamento',
            preco: data.precoModo === 'lancamento'
                ? 'Lancamento'
                : (isTerreno && data.precoTipo === 'por_m2'
                    ? 'R$ ' + Number(data.preco).toLocaleString('pt-BR') + '/m2'
                    : 'R$ ' + Number(data.preco).toLocaleString('pt-BR')),
            quartos: data.quartos || 0,
            area: data.area || 0,
            destaque: data.precoModo === 'lancamento'
                ? 'Lancamento'
                : (isTerreno ? 'Terreno' : (data.destaque ? 'Destaque' : (data.tipo || 'Disponivel'))),
            img: data.imagem || '',
        };
    }

    function startAds() {
        const dismissed = sessionStorage.getItem('_lb_ad_dismissed');
        if (dismissed && (Date.now() - parseInt(dismissed, 10)) < 10 * 60 * 1000) return;
        if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
        try {
            const agora = new Date().toISOString();
            firebase.firestore().collection('imoveis')
                .where('anuncioAtivo', '==', true)
                .limit(20).get()
                .then(snap => {
                    const validos = snap.docs
                        .filter(d => {
                            const data = d.data();
                            if (data.status === 'vendido' || data.status === 'alugado') return false;
                            const exp = data.anuncioExpiraEm;
                            if (exp && exp <= agora) return false;
                            return true;
                        })
                        .sort((a, b) => {
                            const as = a.data()?.createdAt?.seconds || 0;
                            const bs = b.data()?.createdAt?.seconds || 0;
                            return bs - as;
                        })
                        .slice(0, 8);

                    if (validos.length > 0) {
                        _adsData = validos.map(_mapAdData);
                        setTimeout(() => showAd(0), 5000);
                    }
                })
                .catch(() => {});
        } catch (e) {}
    }

    function initUrgencyBar() {
        if (sessionStorage.getItem('_lb_bar_dismissed')) return;
        if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
        firebase.firestore().collection('config').doc('site').get()
            .then(doc => {
                if (!doc.exists) return;
                const ub = doc.data().urgencyBar;
                if (!ub || !ub.ativo) return;
                const texto = ub.texto || 'Novidade no site!';
                const link = safePageHref(ub.link || 'imoveis.html');
                const bairro = ub.bairro || '';
                const bar = document.createElement('div');
                bar.id = 'lb-urgency-bar';
                bar.setAttribute('role', 'alert');
                const textoEsc = escapeHtml(texto);
                const bairroEsc = escapeHtml(bairro);
                bar.innerHTML = `
                    <span class="lb-live-dot" style="width:6px;height:6px;background:#22c55e;border-radius:50%;box-shadow:0 0 5px #22c55e;flex-shrink:0;animation:livePulse 1.5s infinite;display:inline-block;"></span>
                    <span>${textoEsc}${bairro ? ' em <strong>' + bairroEsc + '</strong>' : ''}</span>
                    <a href="${link.replace(/"/g, '&quot;')}">Ver agora →</a>
                    <button type="button" id="lb-urgency-close" aria-label="Fechar">&#10005;</button>
                `;
                document.body.appendChild(bar);
                document.getElementById('lb-urgency-close').addEventListener('click', () => {
                    bar.classList.remove('show');
                    setTimeout(() => { if (bar.parentNode) bar.remove(); }, 500);
                    sessionStorage.setItem('_lb_bar_dismissed', '1');
                });
                setTimeout(() => bar.classList.add('show'), 2500);
            }).catch(() => {});
    }

    function initScrollReveal() {
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); } });
        }, { threshold: 0.15 });
        document.querySelectorAll('.hero-scroll-reveal').forEach(el => obs.observe(el));
    }

    function initNumberGlow() {
        document.querySelectorAll('.trust-number').forEach(el => {
            el.addEventListener('mouseenter', () => { el.style.textShadow = '0 0 20px rgba(52,152,219,.5)'; el.style.transform = 'scale(1.1)'; el.style.transition = 'all .3s ease'; });
            el.addEventListener('mouseleave', () => { el.style.textShadow = ''; el.style.transform = ''; });
        });
    }

    function normTxt(s) {
        return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }

    function imovelMatchesQuiz(imo, q) {
        const st = imo.status || 'disponivel';
        if (st === 'vendido' || st === 'alugado') return false;

        const bairro = imo.bairro || '';

        if (q.region === 'zona-sul') {
            if (!QUIZ_REGIOES['zona-sul'].includes(bairro)) return false;
        } else if (q.region === 'barra-recreio') {
            if (!QUIZ_REGIOES['barra-recreio'].includes(bairro)) return false;
        } else if (q.region === 'ambas') {
            const ok = QUIZ_REGIOES['zona-sul'].includes(bairro) || QUIZ_REGIOES['barra-recreio'].includes(bairro);
            if (!ok) return false;
        }

        if (q.tipo && String(imo.tipo || '') !== q.tipo) return false;

        if (q.quartos) {
            const nq = parseInt(imo.quartos || 0, 10);
            const need = parseInt(q.quartos, 10);
            if (need === 4) { if (nq < 4) return false; }
            else if (nq !== need) return false;
        }

        if (q.preco) {
            const n = parseFloat(imo.preco);
            if (q.preco === '0-600000' && !(n <= 600000)) return false;
            if (q.preco === '600001-1000000' && !(n > 600000 && n <= 1000000)) return false;
            if (q.preco === '1000001+' && !(n > 1000000)) return false;
        }

        if (q.livre) {
            const blob = normTxt([imo.titulo, imo.bairro, imo.descricao, imo.tipo].join(' '));
            const words = normTxt(q.livre).split(/\s+/).filter(w => w.length > 2);
            if (words.length && !words.every(w => blob.includes(w))) return false;
        }

        return true;
    }

    function collectQuizFormState() {
        const livre = (document.getElementById('quiz-livre') && document.getElementById('quiz-livre').value || '').trim();
        const precoEl = document.getElementById('quiz-preco');
        return {
            region: (window.quizData && window.quizData.region) || '',
            tipo: (window.quizData && window.quizData.tipo) || '',
            quartos: (window.quizData && window.quizData.quartos) || '',
            preco: precoEl ? precoEl.value : '',
            livre: livre.slice(0, 2000),
        };
    }

    function regiaoLabel(region) {
        if (region === 'zona-sul') return 'Zona Sul';
        if (region === 'barra-recreio') return 'Barra e Oeste';
        if (region === 'ambas') return 'Zona Sul e Barra/Oeste';
        return 'Indiferente';
    }

    function wireQuizChips() {
        // chips de tipo e quartos (apenas — região virou input livre)
        document.querySelectorAll('.quiz-chip-row').forEach(row => {
            row.querySelectorAll('.quiz-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    const field = btn.getAttribute('data-quiz-field');
                    const val = btn.getAttribute('data-value') || '';
                    row.querySelectorAll('.quiz-chip').forEach(b => b.classList.remove('quiz-chip-active'));
                    btn.classList.add('quiz-chip-active');
                    if (!window.quizData) window.quizData = {};
                    window.quizData[field] = val;
                });
            });
        });

        // ── Autocomplete de localização ──
        const locInput = document.getElementById('quiz-localizacao');
        const suggestEl = document.getElementById('quiz-location-suggestions');
        if (!locInput || !suggestEl) return;

        function normLoc(s) {
            return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        }

        function renderSuggestions(val) {
            const q = normLoc(val);
            if (!q || q.length < 2) { suggestEl.innerHTML = ''; suggestEl.classList.remove('open'); return; }
            const matches = LOCATION_SUGGESTIONS.filter(s => normLoc(s).includes(q)).slice(0, 6);
            if (!matches.length) { suggestEl.innerHTML = ''; suggestEl.classList.remove('open'); return; }
            suggestEl.innerHTML = matches.map(s =>
                `<div class="quiz-loc-item" tabindex="0">${s}</div>`
            ).join('');
            suggestEl.classList.add('open');
            suggestEl.querySelectorAll('.quiz-loc-item').forEach(item => {
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    locInput.value = item.textContent;
                    suggestEl.innerHTML = '';
                    suggestEl.classList.remove('open');
                });
                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        locInput.value = item.textContent;
                        suggestEl.innerHTML = '';
                        suggestEl.classList.remove('open');
                        locInput.focus();
                    }
                });
            });
        }

        locInput.addEventListener('input', (e) => renderSuggestions(e.target.value));
        locInput.addEventListener('blur', () => setTimeout(() => { suggestEl.classList.remove('open'); }, 150));
        locInput.addEventListener('focus', (e) => renderSuggestions(e.target.value));

        // ── Contador de chars no textarea livre ──
        const livre = document.getElementById('quiz-livre');
        const counter = document.getElementById('quiz-livre-count');
        if (livre && counter) {
            livre.addEventListener('input', () => { counter.textContent = livre.value.length; });
        }
    }

    function resetQuizUi() {
        window.quizData = { tipo: '', quartos: '' };
        document.querySelectorAll('.quiz-chip-row').forEach(row => {
            const field = row.querySelector('.quiz-chip') && row.querySelector('.quiz-chip').getAttribute('data-quiz-field');
            row.querySelectorAll('.quiz-chip').forEach(b => b.classList.remove('quiz-chip-active'));
            const emptyVal = row.querySelector(`[data-quiz-field="${field}"][data-value=""]`);
            if (emptyVal) emptyVal.classList.add('quiz-chip-active');
        });
        const preco = document.getElementById('quiz-preco');
        if (preco) preco.value = '';
        const livre = document.getElementById('quiz-livre');
        if (livre) livre.value = '';
        const counter = document.getElementById('quiz-livre-count');
        if (counter) counter.textContent = '0';
        const loc = document.getElementById('quiz-localizacao');
        if (loc) loc.value = '';
        const sug = document.getElementById('quiz-location-suggestions');
        if (sug) { sug.innerHTML = ''; sug.classList.remove('open'); }
        const nome = document.getElementById('quiz-nome');
        const zap = document.getElementById('quiz-whatsapp');
        if (nome) nome.value = '';
        if (zap) zap.value = '';
    }

    let _quizKeydownBound = false;
    function bindQuizEscape() {
        if (_quizKeydownBound) return;
        _quizKeydownBound = true;
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('quiz-modal');
            if (!modal || !modal.classList.contains('active')) return;
            if (e.key === 'Escape') { e.preventDefault(); window.closeQuizModal(); }
        });
    }

    window.openQuizModal = function () {
        const modal = document.getElementById('quiz-modal');
        if (!modal) return;
        resetQuizUi();
        modal.classList.add('active');
        document.body.classList.add('quiz-modal-open');
        window.showQuizStep(1);
        bindQuizEscape();
        requestAnimationFrame(() => {
            const btn = document.getElementById('quiz-to-step2');
            if (btn) btn.focus();
        });
    };

    window.closeQuizModal = function () {
        const modal = document.getElementById('quiz-modal');
        if (modal) modal.classList.remove('active');
        document.body.classList.remove('quiz-modal-open');
        const t = document.getElementById('quiz-submit-text');
        if (t) t.textContent = 'Buscar no catálogo';
    };

    window.showQuizStep = function (step) {
        document.querySelectorAll('.quiz-step').forEach(el => el.classList.remove('active'));
        const el = document.getElementById('quiz-step-' + step);
        if (el) el.classList.add('active');
        const bar = document.getElementById('quiz-progress-bar');
        if (bar) {
            const perc = step === 1 ? 35 : (step === 2 ? 72 : 100);
            bar.style.width = perc + '%';
        }
    };

    window.submitQuiz = async function (event) {
        event.preventDefault();
        const nome = (document.getElementById('quiz-nome') && document.getElementById('quiz-nome').value || '').trim();
        const zap = (document.getElementById('quiz-whatsapp') && document.getElementById('quiz-whatsapp').value || '').trim();
        const btnText = document.getElementById('quiz-submit-text');
        const q = collectQuizFormState();

        if (btnText) btnText.textContent = 'Buscando…';

        const db = typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null;

        async function saveLead(matchesCount, extra) {
            if (!db) return;
            const payload = {
                nome,
                whatsapp: zap,
                regiao_buscada: regiaoLabel(q.region),
                quartos_buscados: q.quartos || '',
                tipo_buscado: q.tipo || '',
                faixa_preco: q.preco || '',
                descricao_livre: q.livre || '',
                matches_count: matchesCount,
                status: 'novo',
                origem: 'quiz_home',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            };
            if (extra) Object.assign(payload, extra);
            try {
                await db.collection('leads').add(payload);
            } catch (e) {
                try {
                    await db.collection('leads').add({
                        nome, whatsapp: zap, regiao_buscada: regiaoLabel(q.region),
                        quartos_buscados: q.quartos || '', status: 'novo', origem: 'quiz_home',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                } catch (e2) {}
            }
        }

        function buildWhatsAppMessage(matchesCount) {
            const lines = [
                `Olá Leandro! Preenchi o questionário no site.`,
                `Nome: ${nome}`,
                `Região: ${regiaoLabel(q.region)}`,
                q.tipo ? `Tipo: ${q.tipo}` : null,
                q.quartos ? `Quartos: ${q.quartos === '4' ? '4+' : q.quartos}` : null,
                q.preco ? `Faixa: ${q.preco}` : null,
                q.livre ? `Detalhes: ${q.livre}` : null,
                matchesCount === 0 ? 'Não encontrei match no catálogo online — pode me ajudar?' : `Vi cerca de ${matchesCount} opção(ões) no site; quero priorizar as melhores.`,
            ].filter(Boolean);
            return lines.join('\n');
        }

        function applyPrefsToSession(matchesCount) {
            const prefs = {
                region: q.region || null,
                bairro: null,
                quartos: q.quartos || '',
                tipo: q.tipo || '',
                preco: q.preco || '',
                busca: q.livre || '',
                fromQuiz: true,
                matchesCount,
            };
            try {
                sessionStorage.setItem('_lb_quiz_prefs', JSON.stringify(prefs));
            } catch (e) {}
        }

        if (!db) {
            window.open('https://wa.me/5521981424469?text=' + encodeURIComponent(buildWhatsAppMessage(0)), '_blank', 'noopener');
            window.closeQuizModal();
            if (btnText) btnText.textContent = 'Buscar no catálogo';
            return;
        }

        try {
            const snap = await db.collection('imoveis').get();
            const imoveis = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const match = imoveis.filter(i => imovelMatchesQuiz(i, q));

            await saveLead(match.length, {});

            if (match.length > 0) {
                applyPrefsToSession(match.length);
                document.getElementById('quiz-success-title').textContent = 'Encontramos opções para você!';
                document.getElementById('quiz-success-msg').textContent =
                    `Há ${match.length} imóve${match.length !== 1 ? 'is' : 'l'} alinhado${match.length !== 1 ? 's' : ''} ao seu perfil. Abrindo o catálogo filtrado…`;
                window.showQuizStep(3);
                const go = document.getElementById('quiz-go-imoveis');
                const jump = () => { window.location.href = 'imoveis.html'; };
                if (go) go.onclick = jump;
                setTimeout(jump, 2200);
            } else {
                window.open('https://wa.me/5521981424469?text=' + encodeURIComponent(buildWhatsAppMessage(0)), '_blank', 'noopener');
                window.closeQuizModal();
            }
        } catch (e) {
            window.open('https://wa.me/5521981424469?text=' + encodeURIComponent(buildWhatsAppMessage(0)), '_blank', 'noopener');
            window.closeQuizModal();
        }
        if (btnText) btnText.textContent = 'Buscar no catálogo';
    };

    function init() {
        injectAdStyles();
        initUrgencyBar();
        wireQuizChips();
        const to2 = document.getElementById('quiz-to-step2');
        if (to2) to2.addEventListener('click', () => window.showQuizStep(2));
        const back = document.getElementById('quiz-back-1');
        if (back) back.addEventListener('click', () => window.showQuizStep(1));
        startAds();
        initScrollReveal();
        initNumberGlow();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
