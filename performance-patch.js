// ============================================================
//  PERFORMANCE PATCH v3.0 — Leandro Bomfim Imóveis
//  Suporta: 20+ vídeos (YouTube, Vimeo, MP4, WebM, qualquer)
//           100+ fotos  —  sem travamento em nenhum caso
//
//  INCLUA após script.js em imoveis.html:
//  <script src="performance-patch.js"></script>
//
//  ┌─────────────────────────────────────────────────────┐
//  │  O QUE ESTE ARQUIVO FAZ                             │
//  ├─────────────────────────────────────────────────────┤
//  │  GALERIA DE CARDS                                   │
//  │  • Debounce 80ms no renderGallery                   │
//  │  • IntersectionObserver nas imgs (rootMargin 400px) │
//  │  • decode() assíncrono fora do main thread          │
//  │  • will-change só durante transição, removido depois│
//  │  • Cache sessionStorage TTL 5min + quota-safe       │
//  │                                                     │
//  │  MODAL — foco principal                             │
//  │  • renderModalPhotos completamente substituído      │
//  │  • THUMBS VIRTUALIZADAS: janela deslizante de 8    │
//  │    nós DOM — com 120 mídias zero DOM extra          │
//  │  • YouTube: thumbnail hqdefault (0 byte de vídeo)  │
//  │  • Vimeo: thumbnail via oEmbed open API            │
//  │  • MP4/WebM/3rd-party: placeholder escuro puro,    │
//  │    sem qualquer requisição de rede                  │
//  │  • iframe/<video> só criado ao clicar em play      │
//  │  • Ao navegar: pause → src='' → load() (libera RAM)│
//  │  • Foto: preload off-screen com abort ao trocar    │
//  │  • Barra de progresso real no player nativo        │
//  │                                                     │
//  │  MEMÓRIA                                            │
//  │  • Fechar modal: descarta vídeo, iframe, observers  │
//  │  • Aborta pre-fetch em andamento                    │
//  │  • Zero memory leak: sem referências circulares     │
//  │                                                     │
//  │  VISUAL E COMPATIBILIDADE                           │
//  │  • IDs, classes e CSS do HTML original: intactos   │
//  │  • Swipe, teclado, lightbox do script.js: mantidos │
//  │  • Fallback gracioso sem IntersectionObserver       │
//  └─────────────────────────────────────────────────────┘
// ============================================================

(function () {
    'use strict';

    // ─────────────────────────────────────────────────────
    //  UTILITÁRIOS
    // ─────────────────────────────────────────────────────

    // Aguarda script.js definir as funções que vamos patchear
    function waitReady(cb, tries) {
        tries = tries || 0;
        if (tries > 140) return;
        if (
            typeof window.renderGallery     === 'function' &&
            typeof window.aplicarFiltros    === 'function' &&
            typeof window.renderModalPhotos === 'function'
        ) {
            cb();
        } else {
            setTimeout(function () { waitReady(cb, tries + 1); }, 50);
        }
    }

    // Roda na janela ociosa — não bloqueia scroll nem input
    function onIdle(cb, fallbackMs) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(cb, { timeout: fallbackMs || 2000 });
        } else {
            setTimeout(cb, fallbackMs || 200);
        }
    }

    // Bloqueia URLs perigosas
    function safeSrc(src) {
        if (!src || typeof src !== 'string') return '';
        var s = src.trim().toLowerCase();
        if (s.indexOf('javascript:') === 0 || s.indexOf('data:text') === 0) return '';
        return src.trim();
    }

    // GIF transparente 1x1 — placeholder de lazy loading
    var _BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    // Debounce simples
    function _debounce(fn, ms) {
        var t;
        return function () {
            var args = arguments;
            var ctx  = this;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(ctx, args); }, ms);
        };
    }

    // ─────────────────────────────────────────────────────
    //  DETECÇÃO DE TIPO DE MÍDIA
    // ─────────────────────────────────────────────────────

    function getYTId(url) {
        if (!url) return null;
        var m;
        if ((m = url.match(/shorts\/([a-zA-Z0-9_-]{11})/)))    return m[1];
        if ((m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)))      return m[1];
        if ((m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/))) return m[1];
        return null;
    }

    function getVimeoId(url) {
        if (!url) return null;
        var m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return m ? m[1] : null;
    }

    function isNativeVideo(src) {
        if (!src) return false;
        var clean = src.split('?')[0].split('#')[0];
        var ext   = clean.split('.').pop().toLowerCase();
        if (['mp4','webm','ogg','mov','m4v','mkv'].indexOf(ext) !== -1) return true;
        var lower = src.toLowerCase();
        // URLs sem extensão mas com indicadores de vídeo
        return lower.indexOf('.m3u8') !== -1 ||
               (lower.indexOf('video') !== -1 && lower.indexOf('youtube') === -1 && lower.indexOf('vimeo') === -1);
    }

    // Retorna: 'youtube' | 'vimeo' | 'native' | 'photo'
    function classifyMedia(src) {
        if (!src) return 'photo';
        if (getYTId(src))    return 'youtube';
        if (getVimeoId(src)) return 'vimeo';
        if (isNativeVideo(src)) return 'native';
        return 'photo';
    }

    // ─────────────────────────────────────────────────────
    //  1. CACHE DO FIRESTORE — sessionStorage, TTL 5 min
    // ─────────────────────────────────────────────────────
    var CACHE_KEY = '_lb_imoveis_v3';
    var CACHE_TTL = 5 * 60 * 1000;

    function saveCache(data) {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
        } catch (_) {
            try {
                Object.keys(sessionStorage)
                    .filter(function (k) { return k.indexOf('_lb_') === 0; })
                    .forEach(function (k) { sessionStorage.removeItem(k); });
                sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
            } catch (_2) { /* quota permanece cheia — continua sem cache */ }
        }
    }

    function loadCache() {
        try {
            var raw = sessionStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed.data || Date.now() - parsed.ts > CACHE_TTL) {
                sessionStorage.removeItem(CACHE_KEY);
                return null;
            }
            return parsed.data;
        } catch (_) { return null; }
    }

    function patchFirestoreCache() {
        var origStart = window.startImoveisListener;
        if (typeof origStart !== 'function') return;

        window.startImoveisListener = function () {
            var cached = loadCache();
            if (cached && cached.length > 0 && !window.imoveisCarregados) {
                window.imoveis           = cached;
                window.imoveisCarregados = true;
                if (typeof window.atualizarContadoresRegiao === 'function') window.atualizarContadoresRegiao();
                if (typeof window.popularChipsBairros       === 'function') window.popularChipsBairros();
                if (typeof window.aplicarFiltros            === 'function') window.aplicarFiltros();
                if (typeof window.hideSkeleton              === 'function') window.hideSkeleton();
            }
            origStart();
        };

        var origAplicar = window.aplicarFiltros;
        if (typeof origAplicar === 'function') {
            var _t = null;
            window.aplicarFiltros = function () {
                origAplicar.apply(this, arguments);
                clearTimeout(_t);
                _t = setTimeout(function () {
                    onIdle(function () {
                        if (window.imoveis && window.imoveis.length > 0) saveCache(window.imoveis);
                    }, 1500);
                }, 800);
            };
        }
    }

    // ─────────────────────────────────────────────────────
    //  2. DEBOUNCE NO renderGallery — 80 ms
    // ─────────────────────────────────────────────────────
    function patchSnapshotDebounce() {
        var orig = window.renderGallery;
        if (typeof orig !== 'function') return;
        var _t = null;
        window.renderGallery = function (lista, containerId) {
            clearTimeout(_t);
            _t = setTimeout(function () {
                orig(lista, containerId);
                onIdle(setupCardImageLazy, 150);
            }, 80);
        };
    }

    // ─────────────────────────────────────────────────────
    //  3. LAZY NAS IMAGENS DOS CARDS
    // ─────────────────────────────────────────────────────
    var _cardObs = null;

    function setupCardImageLazy() {
        if (!('IntersectionObserver' in window)) return;
        if (_cardObs) { _cardObs.disconnect(); _cardObs = null; }

        _cardObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var img = entry.target;
                _cardObs.unobserve(img);

                function reveal() {
                    img.style.willChange = 'filter';
                    img.style.transition = 'filter 0.4s ease';
                    img.style.filter     = '';
                    setTimeout(function () { img.style.willChange = 'auto'; }, 500);
                }

                if (img.complete && img.naturalWidth > 0) {
                    reveal();
                } else {
                    img.addEventListener('load',  reveal,                                                        { once: true });
                    img.addEventListener('error', function () { img.style.filter = ''; img.style.willChange = 'auto'; }, { once: true });
                }
                if (img.decode) img.decode().catch(function () {});
            });
        }, { rootMargin: '400px 0px 100px 0px', threshold: 0 });

        document.querySelectorAll('#gallery .imovel-img-wrap img').forEach(function (img) {
            if (!img.complete || img.naturalWidth === 0) {
                img.style.filter = 'blur(6px)';
                _cardObs.observe(img);
            }
        });
    }

    // ─────────────────────────────────────────────────────
    //  4. MODAL — RENDERIZAÇÃO COMPLETAMENTE SUBSTITUÍDA
    //
    //  PROBLEMA ORIGINAL com 20 vídeos + 100 fotos:
    //  script.js cria 120 nós DOM de uma vez. Para YouTube,
    //  cada thumb dispara uma requisição de imagem.
    //  Para vídeos de terceiros / MP4, o browser pode tentar
    //  pré-buscar metadados de todos simultaneamente.
    //  Resultado: UI congela na abertura do modal.
    //
    //  SOLUÇÃO v3 — THUMBS VIRTUALIZADAS:
    //  Apenas THUMB_WINDOW (8) nós existem no DOM de uma vez.
    //  O espaço dos itens fora da janela é simulado com
    //  padding-left / padding-right no container.
    //  Rolar a faixa recalcula a janela e re-renderiza
    //  apenas o intervalo visível.
    //
    //  VÍDEOS — ZERO DOWNLOAD ANTES DO CLIQUE:
    //  • YouTube  → thumbnail hqdefault.jpg (imagem, não vídeo)
    //  • Vimeo    → thumbnail via oEmbed API (fetch leve)
    //  • Qualquer → placeholder escuro, sem requisição alguma
    //  • iframe / <video> criado SOMENTE ao clicar em play
    //  • Ao navegar: pause → src='' → load() libera buffer RAM
    // ─────────────────────────────────────────────────────

    var THUMB_W      = 98;  // largura de cada thumb em px (90px + 8px gap)
    var THUMB_WINDOW = 8;   // nós DOM máximos visíveis ao mesmo tempo

    // Estado interno do modal
    var _medias    = [];
    var _activeIdx = 0;
    var _winStart  = 0;
    var _thumbObs  = null;
    var _photoAbort = null;
    var _vimeoCache = {};

    function patchModalRender() {
        if (typeof window.renderModalPhotos !== 'function') return;

        window.renderModalPhotos = function () {
            var mainWrap = document.querySelector('.modal-main-photo-wrap');
            var mainImg  = document.getElementById('modal-main-photo');
            var thumbsEl = document.getElementById('modal-thumbs');
            var counter  = document.getElementById('modal-photo-counter');
            if (!mainWrap || !thumbsEl) return;

            // Reconstrói lista de mídias a partir das globais do script.js
            var videos = window.currentImovelVideo || [];
            var fotos  = window.currentImovelFotos || [];
            var idx    = window.currentPhotoIndex  || 0;

            _medias = [];
            videos.forEach(function (v) {
                var src = safeSrc(v);
                if (!src) return;
                var kind = classifyMedia(src);
                _medias.push({
                    type: 'video', src: src, kind: kind,
                    ytId: getYTId(src), vimeoId: getVimeoId(src)
                });
            });
            fotos.forEach(function (f) {
                var src = safeSrc(f);
                if (src) _medias.push({ type: 'foto', src: src, kind: 'photo' });
            });

            if (!_medias.length) return;

            _activeIdx = Math.max(0, Math.min(idx, _medias.length - 1));
            window.currentPhotoIndex = _activeIdx;

            if (counter) counter.textContent = (_activeIdx + 1) + ' / ' + _medias.length;

            _cleanMainWrap(mainWrap);

            var m = _medias[_activeIdx];
            if (m.type === 'video') {
                if (mainImg) mainImg.style.display = 'none';
                _showVideoPlaceholder(mainWrap, m);
            } else {
                _showPhoto(mainWrap, mainImg, m.src, _activeIdx, videos.length);
            }

            _renderThumbsVirtual(thumbsEl);
        };
    }

    // ── Limpeza completa da área principal ─────────────────
    function _cleanMainWrap(mainWrap) {
        // Para e descarta vídeo nativo — libera buffer de RAM
        var video = mainWrap.querySelector('video._lb_player');
        if (video) {
            video.pause();
            video.removeAttribute('src');
            video.load();
            video.remove();
        }

        // Para iframe YouTube / Vimeo / qualquer embed
        var iframe = mainWrap.querySelector('iframe._lb_iframe');
        if (iframe) {
            if (iframe._evh) window.removeEventListener('message', iframe._evh);
            iframe.src = 'about:blank';
            iframe.remove();
        }

        // Remove placeholders e fallbacks anteriores
        mainWrap.querySelectorAll('._lb_placeholder, ._lb_fallback, ._lb_spinner')
            .forEach(function (el) { el.remove(); });

        // Aborta preload de foto em andamento
        if (_photoAbort) { _photoAbort.src = ''; _photoAbort = null; }
    }

    // ─────────────────────────────────────────────────────
    //  EXIBIÇÃO DA FOTO PRINCIPAL
    // ─────────────────────────────────────────────────────
    function _showPhoto(mainWrap, mainImg, src, idx, videoCount) {
        var activeVideo = mainWrap.querySelector('video._lb_player');
        if (activeVideo) {
            activeVideo.pause();
            activeVideo.removeAttribute('src');
            activeVideo.load();
            activeVideo.remove();
        }

        if (!mainImg) return;
        mainImg.style.display = 'block';
        mainImg.style.cursor  = 'zoom-in';

        if (mainImg.src !== src) {
            mainImg.style.transition = 'none';
            mainImg.style.filter     = 'blur(8px)';
        }

        var preloader   = new Image();
        _photoAbort     = preloader;

        preloader.onload = function () {
            if (_photoAbort !== preloader) return;
            _photoAbort = null;
            mainImg.src = src;
            mainImg.style.willChange = 'filter';
            mainImg.style.transition = 'filter 0.3s ease';
            mainImg.style.filter     = '';
            setTimeout(function () { mainImg.style.willChange = 'auto'; }, 400);
        };

        preloader.onerror = function () {
            if (_photoAbort !== preloader) return;
            _photoAbort          = null;
            mainImg.src          = 'https://via.placeholder.com/800x500/111827/fff?text=Foto+indispon%C3%ADvel';
            mainImg.style.filter = '';
        };

        preloader.src = src;

        var fotoIdx = Math.max(0, idx - videoCount);
        mainImg.onclick = function () {
            if (typeof window.openLightbox === 'function') window.openLightbox(fotoIdx);
        };
    }

    // ─────────────────────────────────────────────────────
    //  PLACEHOLDER DE VÍDEO (qualquer fonte)
    //  Nenhum byte de vídeo é baixado aqui.
    // ─────────────────────────────────────────────────────
    function _showVideoPlaceholder(mainWrap, media) {
        var ph = document.createElement('div');
        ph.className = '_lb_placeholder';

        if (media.kind === 'youtube' && media.ytId) {
            // Thumbnail do YouTube — imagem estática (~25 KB), não é vídeo
            var ytId = media.ytId;
            ph.innerHTML =
                '<img src="https://img.youtube.com/vi/' + ytId + '/hqdefault.jpg"' +
                '     alt="Thumbnail"' +
                '     style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:16px;"' +
                '     onerror="this.style.display=\'none\'">' +
                '<div style="position:absolute;inset:0;background:rgba(0,0,0,.38);border-radius:16px;"></div>' +
                '<div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:.7rem;">' +
                '  <div class="lb-play-icon-wrap">' +
                '    <i class="fab fa-youtube" style="color:#ff0000;font-size:1.8rem;"></i>' +
                '  </div>' +
                '  <span class="lb-play-label">Clique para reproduzir</span>' +
                '</div>';
            ph.addEventListener('click', function () {
                ph.remove();
                _loadYouTubeEmbed(mainWrap, ytId);
            });

        } else if (media.kind === 'vimeo' && media.vimeoId) {
            var vid = media.vimeoId;
            ph.innerHTML =
                '<div class="lb-play-icon-wrap">' +
                '  <i class="fas fa-play" style="color:#fff;font-size:1.4rem;margin-left:4px;"></i>' +
                '</div>' +
                '<span class="lb-play-label">Clique para reproduzir (Vimeo)</span>';

            // Tenta carregar thumbnail do Vimeo de forma assíncrona
            if (_vimeoCache[vid]) {
                _applyVimeoThumb(ph, _vimeoCache[vid]);
            } else {
                fetch('https://vimeo.com/api/oembed.json?url=https://vimeo.com/' + vid + '&width=640')
                    .then(function (r) { return r.json(); })
                    .then(function (d) {
                        if (d.thumbnail_url && ph.parentNode) {
                            _vimeoCache[vid] = d.thumbnail_url;
                            _applyVimeoThumb(ph, d.thumbnail_url);
                        }
                    })
                    .catch(function () {});
            }

            ph.addEventListener('click', function () {
                ph.remove();
                _loadVimeoEmbed(mainWrap, vid);
            });

        } else {
            // Vídeo nativo (MP4/WebM) ou 3rd-party desconhecido
            // Placeholder escuro puro — zero requisição de rede
            ph.innerHTML =
                '<div class="lb-play-icon-wrap">' +
                '  <i class="fas fa-play" style="color:#fff;font-size:1.4rem;margin-left:4px;"></i>' +
                '</div>' +
                '<span class="lb-play-label">Clique para reproduzir o vídeo</span>';
            var src = media.src;
            ph.addEventListener('click', function () {
                ph.remove();
                _loadNativeVideo(mainWrap, src);
            });
        }

        mainWrap.appendChild(ph);
    }

    function _applyVimeoThumb(ph, thumbUrl) {
        var img = document.createElement('img');
        img.src = thumbUrl;
        img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:16px;z-index:0;';
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,.38);border-radius:16px;z-index:1;';
        ph.insertBefore(overlay, ph.firstChild);
        ph.insertBefore(img, ph.firstChild);
        // Coloca play e label acima do overlay
        ph.querySelectorAll('.lb-play-icon-wrap, .lb-play-label').forEach(function (el) {
            el.style.position = 'relative';
            el.style.zIndex   = '2';
        });
    }

    // ─────────────────────────────────────────────────────
    //  PLAYERS (criados APENAS ao clicar em play)
    // ─────────────────────────────────────────────────────

    function _loadYouTubeEmbed(mainWrap, ytId) {
        var iframe = document.createElement('iframe');
        // Mantém classes originais para não quebrar CSS existente
        iframe.className = '_lb_iframe modal-video-embed';
        iframe.allow     = 'accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;fullscreen';
        iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:16px;display:block;';
        // autoplay=1 pois o usuário acabou de clicar
        iframe.src = 'https://www.youtube.com/embed/' + ytId + '?rel=0&playsinline=1&autoplay=1&enablejsapi=1';

        var evh = function (e) {
            try {
                var d = JSON.parse(e.data);
                if (d.event === 'onError') _showIframeFallback(mainWrap, iframe, 'https://youtu.be/' + ytId);
            } catch(_) {}
        };
        window.addEventListener('message', evh);
        iframe._evh = evh;
        mainWrap.appendChild(iframe);
    }

    function _loadVimeoEmbed(mainWrap, vimeoId) {
        var iframe = document.createElement('iframe');
        iframe.className = '_lb_iframe modal-video-embed';
        iframe.allow     = 'autoplay;fullscreen;picture-in-picture';
        iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:16px;display:block;';
        iframe.src = 'https://player.vimeo.com/video/' + vimeoId + '?autoplay=1&badge=0&autopause=0';
        mainWrap.appendChild(iframe);
    }

    function _loadNativeVideo(mainWrap, src) {
        var video = document.createElement('video');
        // Mantém classe original para CSS existente não quebrar
        video.className   = '_lb_player lb-video-player';
        video.controls    = true;
        video.playsInline = true;
        // preload=metadata: baixa só os primeiros bytes (duração, dimensões)
        // NÃO usa preload=auto para não baixar o vídeo inteiro antes do play
        video.preload     = 'metadata';
        video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;border-radius:16px;background:#000;';

        // Spinner com barra de progresso de buffer
        var spinner = document.createElement('div');
        spinner.className = '_lb_spinner';
        spinner.style.cssText = [
            'position:absolute;inset:0;z-index:1;pointer-events:none;border-radius:16px;',
            'display:flex;flex-direction:column;align-items:center;justify-content:center;',
            'gap:.8rem;background:rgba(0,0,0,.7);'
        ].join('');
        spinner.innerHTML =
            '<div style="width:40px;height:40px;border-radius:50%;' +
            '            border:3px solid rgba(255,255,255,.15);' +
            '            border-top-color:#3498db;' +
            '            animation:_lbSpin .7s linear infinite;"></div>' +
            '<div style="width:160px;height:4px;background:rgba(255,255,255,.1);' +
            '            border-radius:99px;overflow:hidden;">' +
            '  <div class="_lb_progbar" style="height:100%;width:0%;background:#3498db;' +
            '       border-radius:99px;transition:width .3s ease;"></div>' +
            '</div>' +
            '<span style="font-size:.7rem;color:rgba(255,255,255,.45);">Carregando vídeo…</span>';

        mainWrap.appendChild(spinner);
        mainWrap.appendChild(video);

        // Atualiza barra conforme o buffer avança
        video.addEventListener('progress', function () {
            try {
                if (video.buffered.length && video.duration) {
                    var pct = Math.min((video.buffered.end(0) / video.duration) * 100, 100);
                    var bar = spinner.querySelector('._lb_progbar');
                    if (bar) bar.style.width = pct + '%';
                }
            } catch(_) {}
        });

        video.addEventListener('canplay', function () {
            spinner.remove();
            video.play().catch(function () {});
        }, { once: true });

        video.addEventListener('error', function () {
            spinner.remove();
            video.remove();
            _showNativeFallback(mainWrap, src);
        }, { once: true });

        // Só agora o browser começa a baixar
        video.src = src;
    }

    // ─────────────────────────────────────────────────────
    //  FALLBACKS DE ERRO DE VÍDEO
    // ─────────────────────────────────────────────────────

    function _showIframeFallback(mainWrap, iframe, src) {
        if (mainWrap.querySelector('._lb_fallback')) return;
        iframe.style.display = 'none';
        var div = document.createElement('div');
        div.className = '_lb_fallback';
        div.style.cssText = [
            'position:absolute;inset:0;border-radius:16px;cursor:pointer;',
            'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.8rem;',
            'background:linear-gradient(135deg,#090e18,#111827);'
        ].join('');
        div.innerHTML =
            '<div class="lb-play-icon-wrap" style="background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.4);">' +
            '  <i class="fas fa-exclamation-triangle" style="color:#ef4444;font-size:1.3rem;"></i>' +
            '</div>' +
            '<span class="lb-play-label">Erro ao carregar — abrir externamente</span>';
        div.onclick = function () { window.open(src, '_blank', 'noopener'); };
        mainWrap.appendChild(div);
    }

    function _showNativeFallback(mainWrap, src) {
        var div = document.createElement('div');
        // reutiliza .lb-video-placeholder do CSS existente
        div.className = '_lb_fallback lb-video-placeholder';
        div.innerHTML =
            '<div class="lb-play-icon-wrap" style="background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.4);">' +
            '  <i class="fas fa-exclamation-triangle" style="color:#ef4444;font-size:1.3rem;"></i>' +
            '</div>' +
            '<span class="lb-play-label">Não foi possível reproduzir</span>' +
            '<button class="_lb_ext_btn" style="background:#3498db;border:none;color:#fff;' +
            '  padding:.5rem 1.2rem;border-radius:8px;cursor:pointer;' +
            '  font-size:.83rem;font-family:inherit;margin-top:.25rem;">' +
            '  <i class="fas fa-external-link-alt"></i> Abrir em nova aba' +
            '</button>';
        div.querySelector('._lb_ext_btn').onclick = function () { window.open(src, '_blank', 'noopener'); };
        mainWrap.appendChild(div);
    }

    // ─────────────────────────────────────────────────────
    //  THUMBS VIRTUALIZADAS
    //  Apenas THUMB_WINDOW nós existem no DOM ao mesmo tempo.
    //  Padding simula o espaço dos itens fora da janela.
    // ─────────────────────────────────────────────────────

    function _renderThumbsVirtual(container) {
        if (_thumbObs) { _thumbObs.disconnect(); _thumbObs = null; }

        var total = _medias.length;

        // Com poucas mídias a virtualização não é necessária
        if (total <= THUMB_WINDOW * 2) {
            _renderThumbsAll(container);
            return;
        }

        // Janela centrada no item ativo
        _winStart = Math.max(0, Math.min(
            _activeIdx - Math.floor(THUMB_WINDOW / 2),
            total - THUMB_WINDOW
        ));
        var winEnd = Math.min(_winStart + THUMB_WINDOW, total);
        var padL   = _winStart * THUMB_W;
        var padR   = (total - winEnd) * THUMB_W;

        container.style.paddingLeft  = padL + 'px';
        container.style.paddingRight = padR + 'px';
        container.innerHTML = '';

        for (var i = _winStart; i < winEnd; i++) {
            container.appendChild(_buildThumb(_medias[i], i));
        }

        _scrollThumbIntoView(container);
        container.onscroll = _debounce(function () { _onThumbScroll(container); }, 80);
    }

    // Renderização completa — usada quando total ≤ 16 mídias
    function _renderThumbsAll(container) {
        container.style.paddingLeft  = '';
        container.style.paddingRight = '';
        container.innerHTML = '';
        container.onscroll  = null;

        for (var i = 0; i < _medias.length; i++) {
            container.appendChild(_buildThumb(_medias[i], i));
        }

        // Lazy nas thumbs fora do viewport horizontal
        if ('IntersectionObserver' in window) {
            _thumbObs = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (!e.isIntersecting) return;
                    var img = e.target;
                    if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
                    _thumbObs.unobserve(img);
                });
            }, { root: container, rootMargin: '80px', threshold: 0 });

            container.querySelectorAll('img[data-src]').forEach(function (img) {
                _thumbObs.observe(img);
            });
        }

        _scrollThumbIntoView(container);
    }

    // Constrói um único nó de thumb
    function _buildThumb(media, idx) {
        var isActive = (idx === _activeIdx);
        var div = document.createElement('div');
        div.className    = 'modal-thumb' + (isActive ? ' active' : '');
        div.style.position   = 'relative';
        div.style.flexShrink = '0';

        if (media.type === 'video') {

            if (media.kind === 'youtube' && media.ytId) {
                // Thumbnail do YouTube (imagem leve, não vídeo)
                var img = document.createElement('img');
                img.alt = 'Vídeo ' + (idx + 1);
                img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px;display:block;';
                img.onerror = function () { this.style.display = 'none'; };
                // Só as primeiras 2 ou o item ativo carregam imediatamente
                if (idx < 2 || isActive) {
                    img.src = 'https://img.youtube.com/vi/' + media.ytId + '/sddefault.jpg';
                } else {
                    img.dataset.src = 'https://img.youtube.com/vi/' + media.ytId + '/sddefault.jpg';
                    img.src = _BLANK;
                    img.style.background = '#0f1923';
                }
                div.appendChild(img);

                var ic = document.createElement('div');
                ic.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3);border-radius:8px;pointer-events:none;';
                ic.innerHTML = '<i class="fab fa-youtube" style="color:#ff0000;font-size:1.1rem;"></i>';
                div.appendChild(ic);

            } else if (media.kind === 'vimeo' && media.vimeoId && _vimeoCache[media.vimeoId]) {
                // Thumbnail Vimeo já em cache
                var vi = document.createElement('img');
                vi.src = _vimeoCache[media.vimeoId];
                vi.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px;display:block;';
                div.appendChild(vi);
                var vic = document.createElement('div');
                vic.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3);border-radius:8px;pointer-events:none;';
                vic.innerHTML = '<i class="fas fa-play-circle" style="color:#1ab7ea;font-size:1.1rem;"></i>';
                div.appendChild(vic);

            } else {
                // Vídeo nativo ou 3rd-party — placeholder escuro puro
                // Zero requisição de rede
                div.innerHTML =
                    '<div style="width:100%;height:100%;background:linear-gradient(135deg,#0d1520,#1a2a40);' +
                    '     display:flex;flex-direction:column;align-items:center;justify-content:center;' +
                    '     border-radius:8px;gap:.2rem;">' +
                    '  <i class="fas fa-play-circle" style="color:#3498db;font-size:1.1rem;"></i>' +
                    '  <span style="font-size:.5rem;color:rgba(255,255,255,.35);letter-spacing:.04em;">VÍDEO</span>' +
                    '</div>';
            }

        } else {
            // Foto
            var fimg = document.createElement('img');
            fimg.alt = 'Foto ' + (idx + 1);
            fimg.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px;display:block;';
            fimg.onerror = function () { this.src = 'https://via.placeholder.com/90x62/111827/fff?text=Foto'; };

            if (idx < 2 || isActive) {
                fimg.src = media.src;
            } else {
                fimg.dataset.src = media.src;
                fimg.src         = _BLANK;
                fimg.style.background = '#111827';
            }
            div.appendChild(fimg);
        }

        // Clique navega para esta mídia
        div.addEventListener('click', function () {
            var lazy = div.querySelector('img[data-src]');
            if (lazy) { lazy.src = lazy.dataset.src; delete lazy.dataset.src; }
            window.currentPhotoIndex = idx;
            window.renderModalPhotos();
        });

        return div;
    }

    // Recalcula janela ao rolar a faixa de thumbs
    function _onThumbScroll(container) {
        var total = _medias.length;
        if (total <= THUMB_WINDOW * 2) return;

        var scrolled = container.scrollLeft;
        var newStart = Math.max(0, Math.min(
            Math.floor(scrolled / THUMB_W) - 2,
            total - THUMB_WINDOW
        ));
        if (newStart === _winStart) return;

        _winStart = newStart;
        var winEnd = Math.min(_winStart + THUMB_WINDOW, total);
        var padL   = _winStart * THUMB_W;
        var padR   = (total - winEnd) * THUMB_W;

        container.style.paddingLeft  = padL + 'px';
        container.style.paddingRight = padR + 'px';
        container.innerHTML          = '';

        for (var i = _winStart; i < winEnd; i++) {
            container.appendChild(_buildThumb(_medias[i], i));
        }
    }

    // Scroll suave para o thumb ativo dentro da janela virtual
    function _scrollThumbIntoView(container) {
        var localIdx = _activeIdx - _winStart;
        var thumbs   = container.querySelectorAll('.modal-thumb');
        var target   = thumbs[localIdx] || thumbs[0];
        if (target) target.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }

    // ─────────────────────────────────────────────────────
    //  LIBERAÇÃO DE MEMÓRIA AO FECHAR O MODAL
    // ─────────────────────────────────────────────────────
    function patchCloseModal() {
        var orig = window.closeModal;
        if (typeof orig !== 'function') return;

        window.closeModal = function () {
            var mainWrap = document.querySelector('.modal-main-photo-wrap');
            if (mainWrap) _cleanMainWrap(mainWrap);

            if (_thumbObs) { _thumbObs.disconnect(); _thumbObs = null; }

            var thumbsEl = document.getElementById('modal-thumbs');
            if (thumbsEl) { thumbsEl.onscroll = null; }

            // Libera referências de dados do imóvel anterior
            _medias    = [];
            _activeIdx = 0;
            _winStart  = 0;

            orig.apply(this, arguments);
        };
    }

    // ─────────────────────────────────────────────────────
    //  5. PRECONNECT + DNS-PREFETCH
    // ─────────────────────────────────────────────────────
    function addPreconnects() {
        var domains = [
            'https://files.catbox.moe',
            'https://remax.azureedge.net',
            'https://imovio.com.br',
            'https://images.unsplash.com',
            'https://img.youtube.com',
            'https://i.ytimg.com',
            'https://vimeo.com',
            'https://player.vimeo.com',
        ];
        var existing = new Set(
            Array.from(document.querySelectorAll('link[rel="preconnect"],link[rel="dns-prefetch"]'))
                .map(function (l) { return l.href.replace(/\/$/, ''); })
        );
        var head = document.head;
        domains.forEach(function (d) {
            if (existing.has(d)) return;
            var pc = document.createElement('link');
            pc.rel = 'preconnect'; pc.href = d; pc.crossOrigin = 'anonymous';
            head.appendChild(pc);
            var dp = document.createElement('link');
            dp.rel = 'dns-prefetch'; dp.href = d;
            head.appendChild(dp);
        });
    }

    // ─────────────────────────────────────────────────────
    //  6. CSS — apenas elementos novos adicionados por este patch
    //     Nenhum estilo existente é sobrescrito
    // ─────────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('_lb_perf_v3')) return;
        var s = document.createElement('style');
        s.id = '_lb_perf_v3';
        s.textContent = [
            '/* Spinner do player nativo */',
            '@keyframes _lbSpin { to { transform: rotate(360deg); } }',

            '/* Placeholder comum a todos os tipos de vídeo */',
            '._lb_placeholder {',
            '  position: absolute; inset: 0;',
            '  display: flex; flex-direction: column;',
            '  align-items: center; justify-content: center; gap: .9rem;',
            '  background: linear-gradient(135deg, #090e18, #111827);',
            '  border-radius: 16px; cursor: pointer;',
            '  user-select: none; -webkit-user-select: none;',
            '}',

            '/* Botão play reutilizável */',
            '.lb-play-icon-wrap {',
            '  width: 72px; height: 72px; border-radius: 50%; flex-shrink: 0;',
            '  background: rgba(52,152,219,.18); border: 2px solid rgba(52,152,219,.45);',
            '  display: flex; align-items: center; justify-content: center;',
            '  transition: transform .2s, background .2s, border-color .2s;',
            '}',
            '._lb_placeholder:hover .lb-play-icon-wrap,',
            '._lb_fallback:hover .lb-play-icon-wrap {',
            '  transform: scale(1.12);',
            '  background: rgba(52,152,219,.32);',
            '  border-color: rgba(52,152,219,.8);',
            '}',

            '.lb-play-label {',
            '  color: rgba(255,255,255,.5); font-size: .8rem;',
            '  letter-spacing: .04em; font-family: inherit;',
            '  text-align: center; position: relative; z-index: 1;',
            '}',

            '/* Player nativo */',
            'video._lb_player { display: block; background: #000; }',

            '/* Thumbs lazy: fundo enquanto carrega */',
            '.modal-thumb img[data-src] { background: rgba(255,255,255,.04); }',

            '/* Faixa de thumbs: scroll suave horizontal */',
            '#modal-thumbs { scroll-behavior: smooth; box-sizing: content-box; }',

            '/* Cards da galeria: contain reduz reflow do browser */',
            '#gallery .imovel { contain: layout; }',
        ].join('\n');
        document.head.appendChild(s);
    }

    // ─────────────────────────────────────────────────────
    //  INIT
    // ─────────────────────────────────────────────────────
    function init() {
        addPreconnects();
        injectStyles();
        patchFirestoreCache();
        patchSnapshotDebounce();
        patchModalRender();
        patchCloseModal();

        // Observer no gallery: lazy nas imagens de novos cards
        var gallery = document.getElementById('gallery');
        if (gallery) {
            new MutationObserver(function () {
                onIdle(setupCardImageLazy, 100);
            }).observe(gallery, { childList: true });
        }
    }

    waitReady(init);

})();
