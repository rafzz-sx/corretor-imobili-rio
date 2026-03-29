// ============================================================
//  MAPA DE BAIRROS — REDESIGN VISUAL
//  Substitui a função inserirMapaBairros() do melhorias-visuais.js
//  Cole esta versão OU inclua mapa-bairros-redesign.js após melhorias-visuais.js
// ============================================================

(function () {
    'use strict';
  
    const ZONAS = [
      {
        id: 'zona-sul',
        nome: 'Zona Sul',
        emoji: '🌊',
        color: 'rgba(52,152,219,.8)',
        colorText: 'rgba(125,211,252,.9)',
        bairros: ['Ipanema', 'Leblon', 'Copacabana', 'Botafogo', 'Flamengo'],
      },
      {
        id: 'zona-barra',
        nome: 'Barra & Recreio',
        emoji: '🏙️',
        color: 'rgba(168,85,247,.8)',
        colorText: 'rgba(216,180,254,.9)',
        bairros: ['Barra da Tijuca', 'Barra Olímpica', 'Recreio dos Bandeirantes'],
      },
    ];
  
    function contarPorBairro() {
      const counts = {};
      (window.imoveis || []).forEach(im => {
        if (im.bairro && (!im.status || im.status === 'disponivel' || im.status === 'reservado'))
          counts[im.bairro] = (counts[im.bairro] || 0) + 1;
      });
      return counts;
    }
  
    function inserirMapaBairrosRedesign() {
      const filtersSection = document.querySelector('.filters');
      if (!filtersSection || document.querySelector('.lb-bairros-map-section')) return;
  
      const counts = contarPorBairro();
  
      const section = document.createElement('div');
      section.className = 'lb-bairros-map-section';
  
      section.innerHTML = `
        <div class="lb-bairros-map-title">Filtrar por região</div>
        <div class="lb-zonas-grid">
          ${ZONAS.map(z => {
            const total = z.bairros.reduce((s, b) => s + (counts[b] || 0), 0);
            return `
            <div class="lb-zona-card" id="${z.id}"
                 style="--zona-color:${z.color};--zona-color-text:${z.colorText}"
                 onclick="lbToggleZona('${z.id}')">
              <span class="lb-zona-icon-bg">${z.emoji}</span>
              <div class="lb-zona-top">
                <div class="lb-zona-icon-wrap">${z.emoji}</div>
                <div class="lb-zona-count-badge">
                  <span class="lb-zona-count-num" id="lb-zcount-${z.id}">${total}</span>
                  <span class="lb-zona-count-label">imóveis</span>
                </div>
              </div>
              <div class="lb-zona-name">${z.nome}</div>
              <div class="lb-zona-bairros">
                ${z.bairros.map(b => `<span>${b}</span>`).join('')}
              </div>
            </div>`;
          }).join('')}
        </div>
  
        <div class="lb-bairros-map-title" style="margin-top:14px">ou escolha o bairro</div>
        <div class="lb-bairros-map" id="lb-pills-wrap">
          ${ZONAS.flatMap(z => z.bairros.map(b => {
            const n = counts[b] || 0;
            if (n === 0) return '';
            return `<span class="lb-bairro-pill" data-bairro="${b}" data-zona="${z.id}"
                         onclick="lbTogglePill(this)">${b}<span class="pill-count">${n}</span></span>`;
          })).join('')}
        </div>
      `;
  
      // Insere antes dos filtros nativos
      const filterContainer = filtersSection.querySelector('.filter-container') ||
                              filtersSection.querySelector('.search-text-wrap');
      if (filterContainer) {
        filtersSection.insertBefore(section, filterContainer);
      } else {
        filtersSection.appendChild(section);
      }
    }
  
    // ── Toggle zona ──
    window.lbToggleZona = function (zonaId) {
      const card = document.getElementById(zonaId);
      if (!card) return;
      const wasActive = card.classList.contains('active');
  
      document.querySelectorAll('.lb-zona-card').forEach(c => c.classList.remove('active'));
      document.querySelectorAll('.lb-bairro-pill').forEach(p => p.classList.remove('active'));
  
      if (!wasActive) {
        card.classList.add('active');
        document.querySelectorAll(`.lb-bairro-pill[data-zona="${zonaId}"]`)
          .forEach(p => p.classList.add('active'));
  
        // Filtra pela zona inteira
        const zona = ZONAS.find(z => z.id === zonaId);
        if (zona) filtrarPorBairros(zona.bairros);
      } else {
        filtrarPorBairros([]);
      }
    };
  
    // ── Toggle pill individual ──
    window.lbTogglePill = function (el) {
      const wasActive = el.classList.contains('active');
      document.querySelectorAll('.lb-bairro-pill').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.lb-zona-card').forEach(c => c.classList.remove('active'));
  
      if (!wasActive) {
        el.classList.add('active');
        const zonaId = el.dataset.zona;
        const zonaCard = document.getElementById(zonaId);
        if (zonaCard) zonaCard.classList.add('active');
        filtrarPorBairros([el.dataset.bairro]);
      } else {
        filtrarPorBairros([]);
      }
    };
  
    function filtrarPorBairros(bairros) {
      const sel = document.getElementById('bairro');
      if (sel) sel.value = bairros.length === 1 ? bairros[0] : '';
      if (typeof window.aplicarFiltros === 'function') window.aplicarFiltros();
    }
  
    // ── Atualiza contagens quando imóveis mudam ──
    function atualizarContagens() {
      if (!document.querySelector('.lb-bairros-map-section')) return;
      const counts = contarPorBairro();
  
      ZONAS.forEach(z => {
        const el = document.getElementById('lb-zcount-' + z.id);
        if (el) el.textContent = z.bairros.reduce((s, b) => s + (counts[b] || 0), 0);
      });
  
      document.querySelectorAll('.lb-bairro-pill').forEach(pill => {
        const b = pill.dataset.bairro;
        const countEl = pill.querySelector('.pill-count');
        if (countEl) countEl.textContent = counts[b] || 0;
        pill.style.display = counts[b] ? '' : 'none';
      });
    }
  
    // ── Init: aguarda imóveis via MutationObserver ──
    function init() {
      const gallery = document.getElementById('gallery');
      if (!gallery) return;
  
      const obs = new MutationObserver(() => {
        const cards = gallery.querySelectorAll('.imovel');
        if (cards.length > 0) {
          inserirMapaBairrosRedesign();
          atualizarContagens();
        }
      });
      obs.observe(gallery, { childList: true });
  
      // Patch renderGallery para re-sincronizar contagens
      setTimeout(() => {
        const orig = window.renderGallery;
        if (orig && orig !== window._lbMapaPatch) {
          window._lbMapaPatch = function (...args) {
            orig(...args);
            setTimeout(atualizarContagens, 200);
          };
          window.renderGallery = window._lbMapaPatch;
        }
      }, 600);
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();