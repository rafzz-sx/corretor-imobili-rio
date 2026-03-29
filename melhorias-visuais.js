// ============================================================
//  MELHORIAS-VISUAIS.JS — Leandro Bomfim Imóveis
//  1. Galeria fullscreen imersiva
//  2. Mapa visual de bairros interativo
//  3. Quick-view nos cards
//  Inclua APÓS o script.js em imoveis.html e index.html
// ============================================================

(function () {
    'use strict';
  
    /* ════════════════════════════════════════
       1. GALERIA FULLSCREEN
       ════════════════════════════════════════ */
  
    let fgFotos = [];
    let fgIdx = 0;
    let fgTitulo = '';
    let fgTouchStartX = 0;
  
    function criarFullscreenGallery() {
      if (document.getElementById('lb-fullscreen-gallery')) return;
      const el = document.createElement('div');
      el.id = 'lb-fullscreen-gallery';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-label', 'Galeria de fotos');
      el.innerHTML = `
        <div class="lbfg-header">
          <div class="lbfg-title" id="lbfg-title"></div>
          <div class="lbfg-counter" id="lbfg-counter">1 / 1</div>
          <button class="lbfg-close" id="lbfg-close" aria-label="Fechar galeria">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="lbfg-main" id="lbfg-main">
          <button class="lbfg-arrow prev" id="lbfg-prev" aria-label="Foto anterior">
            <i class="fas fa-chevron-left"></i>
          </button>
          <img id="lbfg-img" class="lbfg-img" src="" alt="Foto do imóvel" draggable="false">
          <button class="lbfg-arrow next" id="lbfg-next" aria-label="Próxima foto">
            <i class="fas fa-chevron-right"></i>
          </button>
          <div class="lbfg-swipe-hint" id="lbfg-swipe-hint">← Deslize para navegar →</div>
        </div>
        <div class="lbfg-strip" id="lbfg-strip"></div>
      `;
      document.body.appendChild(el);
  
      // Eventos
      document.getElementById('lbfg-close').onclick = fecharFullscreen;
      document.getElementById('lbfg-prev').onclick = () => fgNavegar(-1);
      document.getElementById('lbfg-next').onclick = () => fgNavegar(1);
  
      el.addEventListener('click', (e) => { if (e.target === el) fecharFullscreen(); });
  
      // Touch/swipe
      const main = document.getElementById('lbfg-main');
      main.addEventListener('touchstart', (e) => { fgTouchStartX = e.changedTouches[0].screenX; }, { passive: true });
      main.addEventListener('touchend', (e) => {
        const dx = fgTouchStartX - e.changedTouches[0].screenX;
        if (Math.abs(dx) > 40) fgNavegar(dx > 0 ? 1 : -1);
      }, { passive: true });
  
      // Teclado
      document.addEventListener('keydown', (e) => {
        const fg = document.getElementById('lb-fullscreen-gallery');
        if (!fg || !fg.classList.contains('open')) return;
        if (e.key === 'Escape') fecharFullscreen();
        if (e.key === 'ArrowLeft') fgNavegar(-1);
        if (e.key === 'ArrowRight') fgNavegar(1);
      });
    }
  
    window.abrirFullscreenGallery = function (fotos, indiceInicial, titulo) {
      criarFullscreenGallery();
      fgFotos = fotos || [];
      fgIdx = indiceInicial || 0;
      fgTitulo = titulo || '';
  
      const el = document.getElementById('lb-fullscreen-gallery');
      document.getElementById('lbfg-title').textContent = titulo || '';
      renderFG();
      el.classList.add('open');
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
  
      // Esconde hint após 4s
      const hint = document.getElementById('lbfg-swipe-hint');
      if (hint) setTimeout(() => hint.remove(), 4500);
    };
  
    function fecharFullscreen() {
      const el = document.getElementById('lb-fullscreen-gallery');
      if (el) el.classList.remove('open');
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
  
    function fgNavegar(dir) {
      if (!fgFotos.length) return;
      const img = document.getElementById('lbfg-img');
      img.classList.add('switching');
      setTimeout(() => {
        fgIdx = (fgIdx + dir + fgFotos.length) % fgFotos.length;
        renderFG();
        img.classList.remove('switching');
      }, 180);
    }
  
    function renderFG() {
      const img = document.getElementById('lbfg-img');
      const counter = document.getElementById('lbfg-counter');
      const strip = document.getElementById('lbfg-strip');
      if (!img) return;
  
      img.src = fgFotos[fgIdx];
      img.alt = `${fgTitulo} — foto ${fgIdx + 1}`;
      counter.textContent = `${fgIdx + 1} / ${fgFotos.length}`;
  
      strip.innerHTML = '';
      fgFotos.forEach((src, i) => {
        const thumb = document.createElement('div');
        thumb.className = 'lbfg-thumb' + (i === fgIdx ? ' active' : '');
        thumb.innerHTML = `<img src="${src}" alt="Miniatura ${i + 1}" loading="lazy">`;
        thumb.onclick = () => {
          fgIdx = i;
          renderFG();
        };
        strip.appendChild(thumb);
      });
  
      // Scroll thumb ativo para vista
      const activeThumb = strip.querySelectorAll('.lbfg-thumb')[fgIdx];
      if (activeThumb) activeThumb.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  
  
    /* ════════════════════════════════════════
       2. MAPA VISUAL DE BAIRROS
       ════════════════════════════════════════ */
  
    const ZONAS = [
      {
        nome: 'Zona Sul',
        emoji: '🌊',
        color: 'rgba(52,152,219,.7)',
        bairros: ['Ipanema', 'Leblon', 'Copacabana', 'Botafogo', 'Flamengo'],
      },
      {
        nome: 'Barra & Recreio',
        emoji: '🏙️',
        color: 'rgba(155,89,182,.7)',
        bairros: ['Barra da Tijuca', 'Barra Olímpica', 'Recreio dos Bandeirantes'],
      },
    ];
  
    function inserirMapaBairros() {
      const filtersSection = document.querySelector('.filters');
      if (!filtersSection || document.querySelector('.lb-bairros-map-section')) return;
  
      // Conta imóveis por bairro (usa dados globais se disponíveis)
      const contagem = contarImovelPorBairro();
  
      const section = document.createElement('div');
      section.className = 'lb-bairros-map-section';
  
      section.innerHTML = `
        <div class="lb-bairros-map-title">📍 Filtrar por região</div>
        <div class="lb-zonas-grid">
          ${ZONAS.map(z => `
            <div class="lb-zona-card" data-zona="${z.nome}" style="--zona-color:${z.color}">
              <span class="lb-zona-count" id="lb-zona-count-${z.nome.replace(/\s/g,'_')}">
                ${z.bairros.reduce((s, b) => s + (contagem[b] || 0), 0)}
              </span>
              <div class="lb-zona-name">${z.emoji} ${z.nome}</div>
              <div class="lb-zona-bairros">${z.bairros.join(' · ')}</div>
            </div>
          `).join('')}
        </div>
        <div class="lb-bairros-map">
          <div class="lb-bairros-map-title" style="width:100%;margin-bottom:.3rem">ou escolha o bairro:</div>
          ${gerarPills(contagem)}
        </div>
      `;
  
      // Inserir antes do filter-container
      const filterContainer = filtersSection.querySelector('.filter-container') ||
                               filtersSection.querySelector('.search-text-wrap');
      if (filterContainer) {
        filtersSection.insertBefore(section, filterContainer);
      } else {
        filtersSection.appendChild(section);
      }
  
      // Eventos das zonas
      section.querySelectorAll('.lb-zona-card').forEach(card => {
        card.addEventListener('click', () => {
          const zonaName = card.dataset.zona;
          const zona = ZONAS.find(z => z.nome === zonaName);
          if (!zona) return;
  
          const allAtivo = card.classList.contains('active');
          section.querySelectorAll('.lb-zona-card').forEach(c => c.classList.remove('active'));
          section.querySelectorAll('.lb-bairro-pill').forEach(p => p.classList.remove('active'));
  
          if (!allAtivo) {
            card.classList.add('active');
            // Filtra mostrando todos os bairros da zona
            filtrarPorBairros(zona.bairros);
  
            // Marca pills correspondentes
            zona.bairros.forEach(b => {
              const pill = section.querySelector(`.lb-bairro-pill[data-bairro="${b}"]`);
              if (pill) pill.classList.add('active');
            });
          } else {
            // Limpa filtro
            filtrarPorBairros([]);
          }
        });
      });
  
      // Eventos das pills
      section.querySelectorAll('.lb-bairro-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const bairro = pill.dataset.bairro;
          const isActive = pill.classList.contains('active');
  
          // Desativa zona cards
          section.querySelectorAll('.lb-zona-card').forEach(c => c.classList.remove('active'));
          section.querySelectorAll('.lb-bairro-pill').forEach(p => p.classList.remove('active'));
  
          if (!isActive) {
            pill.classList.add('active');
            filtrarPorBairros([bairro]);
          } else {
            filtrarPorBairros([]);
          }
        });
      });
    }
  
    function gerarPills(contagem) {
      const todosBairros = ZONAS.flatMap(z => z.bairros);
      return todosBairros.map(b => {
        const n = contagem[b] || 0;
        if (n === 0) return '';
        return `<span class="lb-bairro-pill" data-bairro="${b}">${b}<span class="pill-count">${n}</span></span>`;
      }).join('');
    }
  
    function contarImovelPorBairro() {
      const counts = {};
      const imoveis = window.imoveis || [];
      imoveis.forEach(im => {
        if (im.bairro) counts[im.bairro] = (counts[im.bairro] || 0) + 1;
      });
      return counts;
    }
  
    function filtrarPorBairros(bairros) {
      // Atualiza o select nativo de bairro
      const sel = document.getElementById('bairro');
      if (sel) {
        if (bairros.length === 1) {
          sel.value = bairros[0];
        } else {
          sel.value = '';
        }
      }
  
      // Usa a função de filtro existente no script.js
      if (typeof window.aplicarFiltros === 'function') {
        window.aplicarFiltros();
      }
    }
  
    // Atualiza contagens quando imóveis carregam
    function atualizarContagensBairros() {
      if (!document.querySelector('.lb-bairros-map-section')) return;
      const contagem = contarImovelPorBairro();
  
      // Atualiza pills
      document.querySelectorAll('.lb-bairro-pill').forEach(pill => {
        const b = pill.dataset.bairro;
        const countEl = pill.querySelector('.pill-count');
        if (countEl) countEl.textContent = contagem[b] || 0;
      });
  
      // Atualiza zonas
      ZONAS.forEach(z => {
        const el = document.getElementById('lb-zona-count-' + z.nome.replace(/\s/g, '_'));
        if (el) el.textContent = z.bairros.reduce((s, b) => s + (contagem[b] || 0), 0);
      });
  
      // Remove pills com 0 imóveis
      document.querySelectorAll('.lb-bairro-pill').forEach(pill => {
        const b = pill.dataset.bairro;
        if (!contagem[b]) pill.style.display = 'none';
        else pill.style.display = '';
      });
    }
  
  
    /* ════════════════════════════════════════
       3. QUICK-VIEW NOS CARDS (patch no renderGallery)
       ════════════════════════════════════════ */
  
    function injetarQuickViewNosCards() {
      document.querySelectorAll('.imovel').forEach((card, i) => {
        if (card.querySelector('.imovel-quick-view')) return;
  
        // Delay de animação stagger
        card.classList.add('animate-d' + Math.min(i + 1, 6));
  
        // Dados do imóvel (via onclick do btn já existente)
        const btnSaiba = card.querySelector('.btn-saiba-mais');
        const imovelId = btnSaiba
          ? (btnSaiba.getAttribute('onclick') || '').match(/'([^']+)'/)?.[1]
          : null;
  
        if (!imovelId) return;
  
        const imo = (window.imoveis || []).find(im => String(im.id) === String(imovelId));
        if (!imo) return;
  
        const fotos = imo.fotos && imo.fotos.length ? imo.fotos : [imo.imagem];
        const waMsg = encodeURIComponent(
          `Olá Leandro! Vi o imóvel *${imo.titulo}* — ${imo.bairro}, R$ ${Number(imo.preco).toLocaleString('pt-BR')}. Pode me ajudar?`
        );
  
        const wrap = card.querySelector('.imovel-img-wrap');
        if (!wrap) return;
  
        const qv = document.createElement('div');
        qv.className = 'imovel-quick-view';
        qv.innerHTML = `
          <button class="imovel-quick-btn qv-gallery" title="Ver todas as fotos">
            <i class="fas fa-images"></i> <span>Ver ${fotos.length} foto${fotos.length > 1 ? 's' : ''}</span>
          </button>
          <button class="imovel-quick-btn qv-wa" title="Falar no WhatsApp">
            <i class="fab fa-whatsapp"></i> <span>Interesse</span>
          </button>
        `;
  
        qv.querySelector('.qv-gallery').addEventListener('click', (e) => {
          e.stopPropagation();
          window.abrirFullscreenGallery(fotos, 0, imo.titulo);
        });
  
        qv.querySelector('.qv-wa').addEventListener('click', (e) => {
          e.stopPropagation();
          window.open(`https://wa.me/5521981424469?text=${waMsg}`, '_blank');
        });
  
        wrap.appendChild(qv);
      });
    }
  
    /* ════════════════════════════════════════
       PATCH: abre fullscreen ao clicar na foto do modal
       ════════════════════════════════════════ */
  
    function patchModalFotoClick() {
      // Sobrescreve o openLightbox original para usar nosso fullscreen
      const origOpenLightbox = window.openLightbox;
      window.openLightbox = function (idx) {
        const fotos = window.currentImovelFotos || [];
        const titulo = document.getElementById('modal-title')?.textContent || '';
        if (fotos.length) {
          window.abrirFullscreenGallery(fotos, idx || 0, titulo);
        } else if (origOpenLightbox) {
          origOpenLightbox(idx);
        }
      };
    }
  
  
    /* ════════════════════════════════════════
       INIT & OBSERVERS
       ════════════════════════════════════════ */
  
    function init() {
      const isImoveisPage = !!document.getElementById('gallery');
  
      if (isImoveisPage) {
        // Espera imóveis carregarem
        const observer = new MutationObserver(() => {
          const cards = document.querySelectorAll('#gallery .imovel');
          if (cards.length > 0) {
            inserirMapaBairros();
            atualizarContagensBairros();
            injetarQuickViewNosCards();
            patchModalFotoClick();
          }
        });
        observer.observe(document.getElementById('gallery'), { childList: true });
  
        // Também observa atualizações futuras
        window._lbOriginalRenderGallery = window.renderGallery;
        const patchRender = () => {
          const origRender = window.renderGallery;
          if (origRender && origRender !== window._lbPatchedRender) {
            window._lbPatchedRender = function (list, containerId) {
              origRender(list, containerId);
              setTimeout(() => {
                atualizarContagensBairros();
                injetarQuickViewNosCards();
              }, 200);
            };
            window.renderGallery = window._lbPatchedRender;
          }
        };
        setTimeout(patchRender, 500);
      }
  
      patchModalFotoClick();
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  
    // Expõe globalmente
    window.abrirFullscreenGallery = window.abrirFullscreenGallery || (() => {});
  
  })();