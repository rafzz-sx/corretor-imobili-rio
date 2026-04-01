// ============================================================
//  PERFORMANCE PATCH v1.0 — Leandro Bomfim Imóveis
//  Inclua APÓS script.js em imoveis.html:
//  <script src="performance-patch.js"></script>
//
//  OTIMIZAÇÕES APLICADAS:
//  1. Cache Firestore no sessionStorage (2 min) — elimina
//     o "loading" a cada reload na mesma aba
//  2. Vídeo mp4/webm: LAZY — só carrega quando o usuário
//     clicar no play, não ao abrir o modal
//  3. Thumbs do modal: lazy loading com IntersectionObserver
//  4. IntersectionObserver + blur-up nas imagens dos cards
//  5. Debounce no re-render do onSnapshot do Firestore
//  6. Preconnect dinâmico para domínios de imagem
// ============================================================

(function () {
    'use strict';

    // ──────────────────────────────────────────────────────
    //  Aguarda script.js estar pronto antes de patchear
    // ──────────────────────────────────────────────────────
    function waitReady(cb, tries) {
        tries = tries || 0;
        if (tries > 100) return;
        if (typeof window.renderGallery === 'function' &&
            typeof window.aplicarFiltros === 'function' &&
            typeof window.renderModalPhotos === 'function') {
            cb();
        } else {
            setTimeout(() => waitReady(cb, tries + 1), 50);
        }
    }

    // ══════════════════════════════════════════════════════
    //  1. CACHE DO FIRESTORE NO sessionStorage
    //     Mostra dados instantaneamente no reload
    // ══════════════════════════════════════════════════════
    const CACHE_KEY = '_lb_imoveis_v2';
    const CACHE_TTL = 2 * 60 * 1000; // 2 minutos

    function saveCache(data) {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
        } catch (_) {}
    }

    function loadCache() {
        try {
            const raw = sessionStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const { ts, data } = JSON.parse(raw);
            if (!data || Date.now() - ts > CACHE_TTL) {
                sessionStorage.removeItem(CACHE_KEY);
                return null;
            }
            return data;
        } catch (_) { return null; }
    }

    function patchFirestoreCache() {
        const origStart = window.startImoveisListener;
        if (typeof origStart !== 'function') return;

        window.startImoveisListener = function () {
            // Exibe cache imediatamente enquanto o Firestore ainda carrega
            const cached = loadCache();
            if (cached && cached.length > 0 && !window.imoveisCarregados) {
                window.imoveis = cached;
                window.imoveisCarregados = true;
                if (typeof window.atualizarContadoresRegiao === 'function') window.atualizarContadoresRegiao();
                if (typeof window.popularChipsBairros === 'function') window.popularChipsBairros();
                if (typeof window.aplicarFiltros === 'function') window.aplicarFiltros();
                if (typeof window.hideSkeleton === 'function') window.hideSkeleton();
            }
            // Listener tempo real do Firestore continua normalmente
            origStart();
        };

        // Salva cache após cada aplicação de filtros (dados reais)
        const origAplicar = window.aplicarFiltros;
        if (typeof origAplicar === 'function') {
            let _saveTimer = null;
            window.aplicarFiltros = function () {
                origAplicar.apply(this, arguments);
                clearTimeout(_saveTimer);
                _saveTimer = setTimeout(() => {
                    if (window.imoveis && window.imoveis.length > 0) {
                        saveCache(window.imoveis);
                    }
                }, 1000);
            };
        }
    }

    // ══════════════════════════════════════════════════════
    //  2. DEBOUNCE NO re-render DO FIRESTORE
    //     Evita múltiplos renders em sequência rápida
    // ══════════════════════════════════════════════════════
    function patchSnapshotDebounce() {
        const origRender = window.renderGallery;
        if (typeof origRender !== 'function') return;

        let _renderTimer = null;
        window.renderGallery = function (lista, containerId) {
            clearTimeout(_renderTimer);
            _renderTimer = setTimeout(() => {
                origRender(lista, containerId);
                setupCardImageLazy(); // lazy nas imagens novas
            }, 80);
        };
    }

    // ══════════════════════════════════════════════════════
    //  3. LAZY LOADING NAS IMAGENS DOS CARDS
    //     IntersectionObserver + blur-up suave
    // ══════════════════════════════════════════════════════
    let _cardImgObserver = null;

    function setupCardImageLazy() {
        if (!('IntersectionObserver' in window)) return;
        if (_cardImgObserver) _cardImgObserver.disconnect();

        _cardImgObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const img = entry.target;

                // Remove blur quando a imagem terminar de carregar
                const reveal = () => {
                    img.style.transition = 'filter 0.35s ease';
                    img.style.filter = '';
                };
                if (img.complete && img.naturalWidth > 0) {
                    reveal();
                } else {
                    img.addEventListener('load', reveal, { once: true });
                }

                // Usa decode() assíncrono para não travar o thread principal
                if (img.decode) img.decode().catch(() => {});

                _cardImgObserver.unobserve(img);
            });
        }, {
            rootMargin: '300px 0px', // pré-carrega 300px antes de aparecer
            threshold: 0,
        });

        document.querySelectorAll('#gallery .imovel-img-wrap img').forEach(img => {
            if (!img.complete || img.naturalWidth === 0) {
                img.style.filter = 'blur(4px)';
                _cardImgObserver.observe(img);
            }
        });
    }

    // ══════════════════════════════════════════════════════
    //  4. VÍDEO MP4/WEBM: LAZY — SÓ BAIXA AO CLICAR NO PLAY
    //     Maior ganho: um vídeo de 50s pode ter 50–200MB.
    //     Antes ele começava a baixar ao abrir o modal.
    //     Agora só começa quando o usuário clicar em play.
    // ══════════════════════════════════════════════════════
    function patchVideoLazy() {
        const origRenderModalPhotos = window.renderModalPhotos;
        if (typeof origRenderModalPhotos !== 'function') return;

        window.renderModalPhotos = function () {
            const mainWrap = document.querySelector('.modal-main-photo-wrap');
            const mainImg  = document.getElementById('modal-main-photo');
            const thumbsEl = document.getElementById('modal-thumbs');
            const counter  = document.getElementById('modal-photo-counter');
            if (!mainWrap || !thumbsEl) return;

            const currentVideo = window.currentImovelVideo;
            const currentFotos = window.currentImovelFotos || [];
            const currentIdx   = window.currentPhotoIndex  || 0;

            const medias = [];
            if (currentVideo && currentVideo.length) {
                currentVideo.forEach(v => medias.push({ type: 'video', src: v }));
            }
            currentFotos.forEach(f => medias.push({ type: 'foto', src: f }));
            if (!medias.length) return;

            const media = medias[currentIdx] || medias[0];
            if (counter) counter.textContent = `${currentIdx + 1} / ${medias.length}`;

            // ── Limpa estado anterior ──
            const oldVideo = mainWrap.querySelector('video.lb-video-player');
            if (oldVideo) { oldVideo.pause(); oldVideo.removeAttribute('src'); oldVideo.load(); oldVideo.remove(); }
            const oldPlaceholder = mainWrap.querySelector('.lb-video-placeholder');
            if (oldPlaceholder) oldPlaceholder.remove();
            // Remove iframe antigo (YouTube legado, se existir)
            const oldIframe = mainWrap.querySelector('iframe.modal-video-embed');
            if (oldIframe) { if (oldIframe._vfh) window.removeEventListener('message', oldIframe._vfh); oldIframe.src = ''; oldIframe.remove(); }

            // ── VÍDEO: mostra placeholder com botão de play ──
            if (media.type === 'video') {
                if (mainImg) mainImg.style.display = 'none';

                const ext = (media.src.split('?')[0].split('.').pop() || '').toLowerCase();
                const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'm4v'].includes(ext) || media.src.includes('video');

                const placeholder = document.createElement('div');
                placeholder.className = 'lb-video-placeholder';
                placeholder.innerHTML = `
                    <div class="lb-play-icon-wrap">
                        <i class="fas fa-play" style="color:#fff;font-size:1.5rem;margin-left:5px;"></i>
                    </div>
                    <span class="lb-play-label">Clique para reproduzir o vídeo</span>
                `;
                placeholder.addEventListener('click', () => {
                    placeholder.remove();
                    _loadAndPlayVideo(mainWrap, media.src);
                });
                mainWrap.appendChild(placeholder);

            // ── FOTO: pré-carrega antes de exibir (sem flash) ──
            } else {
                // Para o vídeo se estava tocando
                const videoEl = mainWrap.querySelector('video.lb-video-player');
                if (videoEl) { videoEl.pause(); videoEl.removeAttribute('src'); videoEl.load(); videoEl.remove(); }

                if (mainImg) {
                    mainImg.style.display = 'block';
                    mainImg.style.filter = 'blur(6px)';

                    const preloader = new Image();
                    preloader.onload = () => {
                        mainImg.src = media.src;
                        mainImg.style.transition = 'filter 0.3s ease';
                        mainImg.style.filter = '';
                    };
                    preloader.onerror = () => {
                        mainImg.src = 'https://via.placeholder.com/800x500/1a1a2e/fff?text=Imóvel';
                        mainImg.style.filter = '';
                    };
                    preloader.src = media.src;

                    const videoCount = (currentVideo && currentVideo.length) ? currentVideo.length : 0;
                    const fotoIdx = currentIdx - videoCount;
                    mainImg.style.cursor = 'zoom-in';
                    mainImg.onclick = () => {
                        if (typeof window.openLightbox === 'function') window.openLightbox(Math.max(0, fotoIdx));
                    };
                }
            }

            // ── Thumbs com lazy loading ──
            thumbsEl.innerHTML = '';
            medias.forEach((m, idx) => {
                const thumb = document.createElement('div');
                thumb.className = 'modal-thumb' + (idx === currentIdx ? ' active' : '');
                thumb.style.position = 'relative';

                if (m.type === 'video') {
                    // Thumb do vídeo: só ícone, sem carregar nada
                    thumb.innerHTML = `
                        <div style="
                            width:100%;height:100%;
                            background:linear-gradient(135deg,#0d1520,#1a2a40);
                            display:flex;align-items:center;justify-content:center;
                            border-radius:8px;gap:.3rem;flex-direction:column;
                        ">
                            <i class="fas fa-film" style="color:var(--primary);font-size:1.1rem;"></i>
                            <span style="font-size:.55rem;color:rgba(255,255,255,.4);letter-spacing:.04em;">VÍDEO</span>
                        </div>
                    `;
                } else {
                    const img = document.createElement('img');
                    img.alt = `Foto ${idx + 1}`;
                    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px;display:block;';
                    img.onerror = function () { this.src = 'https://via.placeholder.com/90x62/1a1a2e/fff?text=Foto'; };

                    if (idx === currentIdx || idx === 0) {
                        // Thumb ativa e a primeira: carregam imediatamente
                        img.src = m.src;
                    } else {
                        // Demais: lazy via data-src
                        img.dataset.src = m.src;
                        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1px transparente
                        img.style.background = '#111827';
                    }

                    thumb.appendChild(img);
                }

                thumb.addEventListener('click', () => {
                    // Ao clicar, força carregamento da imagem lazy
                    const lazyImg = thumb.querySelector('img[data-src]');
                    if (lazyImg) {
                        lazyImg.src = lazyImg.dataset.src;
                        delete lazyImg.dataset.src;
                    }
                    window.currentPhotoIndex = idx;
                    window.renderModalPhotos();
                });

                thumbsEl.appendChild(thumb);
            });

            // Lazy nas thumbs visíveis na faixa de scroll
            _setupThumbLazy(thumbsEl);

            // Scrolla para thumb ativa
            const activeThumb = thumbsEl.querySelectorAll('.modal-thumb')[currentIdx];
            if (activeThumb) {
                activeThumb.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
            }
        };
    }

    // Cria o <video> e começa o download + play
    function _loadAndPlayVideo(mainWrap, src) {
        const video = document.createElement('video');
        video.className = 'lb-video-player';
        video.controls = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.style.cssText = `
            position:absolute;inset:0;
            width:100%;height:100%;
            object-fit:contain;
            border-radius:16px;
            background:#000;
        `;

        // Spinner enquanto o vídeo carrega
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            position:absolute;inset:0;
            display:flex;align-items:center;justify-content:center;
            background:rgba(0,0,0,.6);border-radius:16px;z-index:1;
            pointer-events:none;
        `;
        spinner.innerHTML = `<div style="
            width:36px;height:36px;border-radius:50%;
            border:3px solid rgba(255,255,255,.2);
            border-top-color:#3498db;
            animation:_lbSpin .7s linear infinite;
        "></div>`;
        mainWrap.appendChild(spinner);

        video.addEventListener('canplay', () => {
            spinner.remove();
            video.play().catch(() => {});
        }, { once: true });

        video.addEventListener('error', () => {
            spinner.remove();
            video.remove();
            // Fallback: botão para abrir em nova aba
            const fallback = document.createElement('div');
            fallback.className = 'lb-video-placeholder';
            fallback.innerHTML = `
                <div class="lb-play-icon-wrap" style="background:rgba(239,68,68,.2);border-color:rgba(239,68,68,.4);">
                    <i class="fas fa-exclamation-triangle" style="color:#ef4444;font-size:1.3rem;"></i>
                </div>
                <span class="lb-play-label">Não foi possível reproduzir</span>
                <button onclick="window.open('${src}','_blank','noopener')"
                    style="margin-top:.5rem;background:#3498db;border:none;color:#fff;
                    padding:.5rem 1.2rem;border-radius:8px;cursor:pointer;
                    font-size:.83rem;font-family:inherit;">
                    <i class="fas fa-external-link-alt"></i> Abrir em nova aba
                </button>
            `;
            mainWrap.appendChild(fallback);
        });

        video.src = src;
        mainWrap.appendChild(video);
    }

    // IntersectionObserver para as thumbs na faixa de scroll horizontal
    let _thumbObserver = null;
    function _setupThumbLazy(container) {
        if (_thumbObserver) _thumbObserver.disconnect();

        if (!('IntersectionObserver' in window)) {
            // Fallback sem observer: carrega tudo
            container.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.dataset.src;
                delete img.dataset.src;
            });
            return;
        }

        _thumbObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    delete img.dataset.src;
                }
                _thumbObserver.unobserve(img);
            });
        }, { root: container, rootMargin: '60px', threshold: 0 });

        container.querySelectorAll('img[data-src]').forEach(img => {
            _thumbObserver.observe(img);
        });
    }

    // ══════════════════════════════════════════════════════
    //  5. PRECONNECT DINÂMICO PARA DOMÍNIOS DE IMAGEM
    //     Abre conexão TCP/TLS antecipadamente
    // ══════════════════════════════════════════════════════
    function addPreconnects() {
        const domains = [
            'https://files.catbox.moe',
            'https://remax.azureedge.net',
            'https://imovio.com.br',
            'https://images.unsplash.com',
        ];
        const existing = new Set(
            Array.from(document.querySelectorAll('link[rel="preconnect"]'))
                .map(l => l.href.replace(/\/$/, ''))
        );
        domains.forEach(domain => {
            if (existing.has(domain)) return;
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = domain;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        });
    }

    // ══════════════════════════════════════════════════════
    //  6. ESTILOS DO PLAYER E PLACEHOLDER DE VÍDEO
    // ══════════════════════════════════════════════════════
    function injectStyles() {
        if (document.getElementById('_lb-perf-styles')) return;
        const s = document.createElement('style');
        s.id = '_lb-perf-styles';
        s.textContent = `
            /* Spinner do vídeo */
            @keyframes _lbSpin {
                to { transform: rotate(360deg); }
            }

            /* Placeholder de vídeo */
            .lb-video-placeholder {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: .9rem;
                background: linear-gradient(135deg, #090e18, #111827);
                border-radius: 16px;
                cursor: pointer;
                user-select: none;
            }

            .lb-play-icon-wrap {
                width: 72px;
                height: 72px;
                border-radius: 50%;
                background: rgba(52, 152, 219, 0.18);
                border: 2px solid rgba(52, 152, 219, 0.45);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform .2s, background .2s, border-color .2s;
            }
            .lb-video-placeholder:hover .lb-play-icon-wrap {
                transform: scale(1.1);
                background: rgba(52, 152, 219, 0.35);
                border-color: rgba(52, 152, 219, 0.8);
            }

            .lb-play-label {
                color: rgba(255, 255, 255, 0.45);
                font-size: .8rem;
                letter-spacing: .04em;
                font-family: inherit;
            }

            /* Player de vídeo */
            video.lb-video-player {
                display: block;
                background: #000;
            }

            /* Blur-up nas imagens dos cards enquanto carregam */
            #gallery .imovel-img-wrap img {
                will-change: filter;
            }

            /* Placeholder 1px das thumbs lazy */
            .modal-thumb img[data-src] {
                background: rgba(255, 255, 255, 0.04);
            }
        `;
        document.head.appendChild(s);
    }

    // ══════════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════════
    function init() {
        addPreconnects();
        injectStyles();
        patchFirestoreCache();
        patchSnapshotDebounce();
        patchVideoLazy();

        // Observer no gallery para lazy nas imagens de novos cards
        const gallery = document.getElementById('gallery');
        if (gallery) {
            new MutationObserver(() => setupCardImageLazy())
                .observe(gallery, { childList: true });
        }
    }

    waitReady(init);

})();