// ============================================================
//  SCRIPT.JS v4.0 — Leandro Imóveis
//  Região cards, tempo real, notificações corrigidas
// ============================================================

// ── Firebase ──────────────────────────────────────────────
let db;
function initFirebase() {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    if (window._secureLog) window._secureLog('🔥 Firebase pronto');
}
initFirebase();

// ── Globais ────────────────────────────────────────────────
let imoveis = [];
let imoveisCarregados = false;
const FAVORITOS_KEY = '_lb_favoritos';

// ── Cache sessionStorage (2 min) ───────────────────────────
const _CACHE_KEY = '_lb_imoveis_v3';
const _CACHE_TTL = 2 * 60 * 1000;

function _saveImoveisCache(data) {
    try { sessionStorage.setItem(_CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch (_) { }
}
function _loadImoveisCache() {
    try {
        const raw = sessionStorage.getItem(_CACHE_KEY);
        if (!raw) return null;
        const { ts, data } = JSON.parse(raw);
        if (!data || !data.length || Date.now() - ts > _CACHE_TTL) { sessionStorage.removeItem(_CACHE_KEY); return null; }
        return data;
    } catch (_) { return null; }
}

// ── Config do site (cache) ─────────────────────────────────
let _siteCfg = null;
async function loadSiteCfgCached() {
    if (_siteCfg) return _siteCfg;
    try {
        const cached = sessionStorage.getItem('_lb_site_cfg');
        if (cached) _siteCfg = JSON.parse(cached);
    } catch { }
    if (_siteCfg) return _siteCfg;
    try {
        const doc = await db.collection('config').doc('site').get();
        _siteCfg = doc.exists ? (doc.data() || {}) : {};
        try { sessionStorage.setItem('_lb_site_cfg', JSON.stringify(_siteCfg)); } catch { }
    } catch {
        _siteCfg = _siteCfg || {};
    }
    return _siteCfg;
}

// Estado dos filtros de região/bairro
const filtroState = {
    region: null,      // 'zona-sul' | 'barra-recreio' | null
    bairro: null,      // nome exato do bairro ou null
    tipo: null,        // 'Terreno' | null (para filtro rápido por tipo)
};

// Mapa de bairros por região
const REGIOES = {
    'zona-sul': ['Ipanema', 'Leblon', 'Copacabana', 'Botafogo', 'Flamengo'],
    'barra-recreio': [
        'Barra da Tijuca', 'Barra Olímpica', 'Recreio dos Bandeirantes',
        'Jacarepaguá', 'Vargem Grande', 'Vargem Pequena',
        'Pedra de Guaratiba', 'Grumari', 'Camorim', 'Taquara', 'Curicica',
    ],
};

// ══════════════════════════════════════════════════════════
//  UTILITÁRIOS
// ══════════════════════════════════════════════════════════
function safeEl(id) { return document.getElementById(id) || null; }
function safeText(id, v) { const el = safeEl(id); if (el) el.textContent = v; }
function safeHTML(id, v) { const el = safeEl(id); if (el) el.innerHTML = v; }
function safeAttr(id, attr, v) { const el = safeEl(id); if (el) el.setAttribute(attr, v); }

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ══════════════════════════════════════════════════════════
//  TOAST SYSTEM
// ══════════════════════════════════════════════════════════
function showToast(message, type = 'success', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle', 'favorito-toast': 'fa-heart' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => { toast.remove(); if (!container.children.length) container.remove(); }, 300);
    }, duration);
}

// ══════════════════════════════════════════════════════════
//  NOTIFICAÇÕES TEMPO REAL — SEM BUG (fila gerenciada)
// ══════════════════════════════════════════════════════════
const _notifQ = [];
let _notifActive = false;

function showNotification(title, body, color = 'blue') {
    _notifQ.push({ title, body, color });
    if (!_notifActive) _nextNotif();
}

function _nextNotif() {
    if (!_notifQ.length) { _notifActive = false; return; }
    _notifActive = true;
    const { title, body, color } = _notifQ.shift();
    const colors = { blue: 'var(--primary)', green: '#22c55e', amber: '#f59e0b', red: '#ef4444', purple: '#a855f7' };
    const c = colors[color] || colors.blue;

    let el = document.getElementById('_realtime-notif');
    if (!el) {
        el = document.createElement('div');
        el.id = '_realtime-notif';
        Object.assign(el.style, {
            position: 'fixed', bottom: '5.5rem', right: '1.5rem', zIndex: '9999',
            minWidth: '260px', maxWidth: '320px',
            background: 'var(--bg-card, #111)', borderRadius: '14px',
            padding: '.9rem 1.1rem',
            boxShadow: '0 8px 32px rgba(0,0,0,.6)',
            display: 'flex', gap: '.75rem', alignItems: 'flex-start',
            transform: 'translateX(calc(100% + 2.5rem))',
            transition: 'transform .35s cubic-bezier(.22,1,.36,1)',
            willChange: 'transform',
        });
        document.body.appendChild(el);
    }

    // Reset sem transição → animação de entrada
    el.style.transition = 'none';
    el.style.transform = 'translateX(calc(100% + 2.5rem))';
    el.style.borderLeft = `3px solid ${c}`;
    el.innerHTML = `
        <div style="width:8px;height:8px;border-radius:50%;background:${c};margin-top:.3rem;
            flex-shrink:0;box-shadow:0 0 6px ${c};animation:pulse 1.2s infinite;"></div>
        <div>
            <div style="font-weight:600;font-size:.82rem;color:#f1f5f9;">${title}</div>
            <div style="font-size:.74rem;color:rgba(255,255,255,.5);margin-top:.1rem;">${body}</div>
        </div>`;

    void el.offsetWidth; // force reflow
    el.style.transition = 'transform .35s cubic-bezier(.22,1,.36,1)';
    el.style.transform = 'translateX(0)';

    const hideTimer = setTimeout(() => {
        el.style.transform = 'translateX(calc(100% + 2.5rem))';
        setTimeout(() => {
            _notifActive = false;
            _nextNotif();
        }, 380);
    }, 4200);

    // Clique fecha imediatamente
    el.onclick = () => {
        clearTimeout(hideTimer);
        el.style.transform = 'translateX(calc(100% + 2.5rem))';
        setTimeout(() => { _notifActive = false; _nextNotif(); }, 380);
    };
}

// ══════════════════════════════════════════════════════════
//  FAVORITOS
// ══════════════════════════════════════════════════════════
function getFavoritos() { try { return JSON.parse(localStorage.getItem(FAVORITOS_KEY) || '[]'); } catch { return []; } }
function saveFavoritos(f) { try { localStorage.setItem(FAVORITOS_KEY, JSON.stringify(f)); } catch { } }
function isFavorito(id) { return getFavoritos().includes(String(id)); }

function toggleFavorito(id, event) {
    if (event) event.stopPropagation();
    const favs = getFavoritos();
    const sid = String(id);
    const idx = favs.indexOf(sid);
    if (idx === -1) {
        favs.push(sid);
        showToast('❤️ Adicionado aos favoritos!', 'favorito-toast');
    } else {
        favs.splice(idx, 1);
        showToast('🗑️ Removido dos favoritos', 'info');
    }
    saveFavoritos(favs);
    updateFavBtn(id);
    return favs.includes(sid);
}

function updateFavBtn(id) {
    const btn = document.querySelector(`.favorito-btn[data-id="${id}"]`);
    if (!btn) return;
    const fav = isFavorito(id);
    btn.innerHTML = fav ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
    btn.classList.toggle('favorito-ativo', fav);
}

// ══════════════════════════════════════════════════════════
//  CARREGAR IMÓVEIS + TEMPO REAL
// ══════════════════════════════════════════════════════════
let _imoveisUnsubscribe = null;
let _renderDebounceTimer = null; // debounce do re-render do onSnapshot
let _imoveisFirstSnapshot = true;

function startImoveisListener() {
    if (_imoveisUnsubscribe) return;

    // Exibe cache imediatamente enquanto Firestore carrega
    const cached = _loadImoveisCache();
    if (cached && !imoveisCarregados) {
        imoveis = cached;
        imoveisCarregados = true;
        atualizarContadoresRegiao();
        popularChipsBairros();
        aplicarFiltros();
        hideSkeleton();
    }

    _imoveisUnsubscribe = db.collection('imoveis').onSnapshot(snap => {
        const novos = snap.docs.map(d => ({
            id: d.id, ...d.data(),
            status: d.data().status || 'disponivel',
            tipo: d.data().tipo || 'Apartamento',
            vagas: d.data().vagas || 0,
            condominio: d.data().condominio || 0,
            iptu: d.data().iptu || 0,
            createdAt: d.data().createdAt || { seconds: 0 },
        }));

        if (!_imoveisFirstSnapshot) {
            snap.docChanges().forEach(change => {
                if (change.type === 'added') showNotification('Novo imovel', change.doc.data().titulo || '', 'green');
                if (change.type === 'modified') showNotification('Imovel atualizado', change.doc.data().titulo || '', 'amber');
                if (change.type === 'removed') showNotification('Imovel removido', change.doc.data().titulo || '', 'red');
            });
        }
        _imoveisFirstSnapshot = false;

        imoveis = novos.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        imoveisCarregados = true;

        // Salva cache com os dados mais recentes
        _saveImoveisCache(imoveis);

        // Debounce: evita múltiplos re-renders em sequência rápida
        clearTimeout(_renderDebounceTimer);
        _renderDebounceTimer = setTimeout(() => {
            atualizarContadoresRegiao();
            popularChipsBairros();
            aplicarFiltros();
            hideSkeleton();
        }, 80);
    }, err => {
        console.error('imoveis listener:', err);
        handleImoveisLoadFail();
    });
}

async function carregarImoveis() {
    const gallery = safeEl('gallery');
    if (!gallery) return;
    startImoveisListener();
}

async function handleImoveisLoadFail() {
    const cfg = await loadSiteCfgCached();
    const allowFallback = !!cfg?.conteudoPublico?.fallbackExemplos;
    if (allowFallback) {
        carregarImoveisEstaticos();
        return;
    }
    // Sem fallback: evita “imóveis falsos” — lista fica vazia
    imoveis = [];
    imoveisCarregados = true;
    atualizarContadoresRegiao();
    popularChipsBairros();
    aplicarFiltros();
    hideSkeleton();
    showToast('Sem conexão com o banco — aguardando imóveis do painel', 'warning', 4200);
}

// Dados estáticos fallback
function carregarImoveisEstaticos() {
    imoveis = [
        { id: '1', bairro: 'Ipanema', quartos: 2, preco: 850000, area: 80, vagas: 1, condominio: 850, iptu: 350, tipo: 'Apartamento', status: 'disponivel', titulo: 'Apartamento Moderno em Ipanema', descricao: 'Lindo apartamento com 2 quartos a poucos passos da praia. Totalmente reformado com acabamentos de alto padrão.', imagem: 'https://remax.azureedge.net/userimages/60/LargeWM/L_b74eaab9-55e3-43c2-8814-06f6152a1f05.jpg', fotos: ['https://remax.azureedge.net/userimages/60/LargeWM/L_b74eaab9-55e3-43c2-8814-06f6152a1f05.jpg', 'https://files.catbox.moe/ihe3p5.png', 'https://files.catbox.moe/ta8pp6.png'], createdAt: { seconds: Date.now() / 1000 } },
        { id: '2', bairro: 'Barra da Tijuca', quartos: 3, preco: 1200000, area: 140, vagas: 2, condominio: 1200, iptu: 500, tipo: 'Cobertura', status: 'disponivel', titulo: 'Cobertura na Barra da Tijuca', descricao: 'Cobertura ampla com 3 quartos, piscina privativa e acabamentos de altíssimo padrão com vista deslumbrante.', imagem: 'https://imovio.com.br/wp-content/uploads/2023/02/3478296843.jpg', fotos: ['https://imovio.com.br/wp-content/uploads/2023/02/3478296843.jpg', 'https://files.catbox.moe/o4xhj9.png'], createdAt: { seconds: Date.now() / 1000 - 100 } },
        { id: '3', bairro: 'Recreio dos Bandeirantes', quartos: 2, preco: 520000, area: 70, vagas: 1, condominio: 600, iptu: 250, tipo: 'Apartamento', status: 'vendido', titulo: 'Apartamento no Recreio', descricao: 'Apartamento compacto e moderno no Recreio, próximo à praia e comércios locais.', imagem: 'https://files.catbox.moe/ihe3p5.png', fotos: ['https://files.catbox.moe/ihe3p5.png'], createdAt: { seconds: Date.now() / 1000 - 200 } },
    ];
    imoveisCarregados = true;
    atualizarContadoresRegiao();
    popularChipsBairros();
    aplicarFiltros();
    hideSkeleton();
    showToast('Usando dados de exemplo (permitido no painel)', 'info');
}

// ══════════════════════════════════════════════════════════
//  CONTADORES DAS REGIÕES
// ══════════════════════════════════════════════════════════
function atualizarContadoresRegiao() {
    const mostrarVendidos = safeEl('mostrar-vendidos')?.checked;

    const lista = imoveis.filter(i => mostrarVendidos || (i.status !== 'vendido' && i.status !== 'alugado'));

    // Conta por região
    let cZS = 0, cBR = 0;
    lista.forEach(i => {
        if (REGIOES['zona-sul'].includes(i.bairro)) cZS++;
        else if (REGIOES['barra-recreio'].includes(i.bairro)) cBR++;
    });

    safeText('count-zona-sul', cZS);
    safeText('count-barra-recreio', cBR);

    // Conta terrenos
    const terrenos = lista.filter(i => i.tipo === 'Terreno');
    safeText('count-terrenos', terrenos.length);

    // Popula chips dos bairros dos terrenos dinamicamente
    const chipsTerrenos = safeEl('chips-terrenos');
    if (chipsTerrenos) {
        const bairrosTerrenos = [...new Set(terrenos.map(i => i.bairro))].filter(Boolean);
        chipsTerrenos.innerHTML = bairrosTerrenos.map(b =>
            `<span class="rc-chip" data-bairro="${b}" onclick="selectBairroChip(event,'${b.replace(/'/g, "\\'")}')">
                ${b}
            </span>`
        ).join('');
    }

    // Mostra/oculta card de terrenos
    const cardTerrenos = safeEl('card-terrenos');
    if (cardTerrenos) {
        cardTerrenos.style.display = terrenos.length > 0 ? '' : 'none';
    }

    // Atualiza chips dentro dos cards de região
    ['zona-sul', 'barra-recreio'].forEach(reg => {
        const container = safeEl('chips-' + reg);
        if (!container) return;
        container.querySelectorAll('.rc-chip').forEach(chip => {
            const bairroNome = chip.dataset.bairro;
            if (!bairroNome) return;
            const n = lista.filter(i => i.bairro === bairroNome).length;
            chip.title = `${n} imóve${n !== 1 ? 'is' : 'l'}`;
        });
    });
}

// ══════════════════════════════════════════════════════════
//  CHIPS DE BAIRROS DIRETOS
// ══════════════════════════════════════════════════════════
function popularChipsBairros() {
    const row = safeEl('bairros-chips-row');
    if (!row) return;

    const mostrarVendidos = safeEl('mostrar-vendidos')?.checked;
    const lista = imoveis.filter(i => mostrarVendidos || (i.status !== 'vendido' && i.status !== 'alugado'));

    const contagem = {};
    lista.forEach(i => { if (i.bairro) contagem[i.bairro] = (contagem[i.bairro] || 0) + 1; });

    const bairros = Object.entries(contagem).sort((a, b) => b[1] - a[1]);

    row.innerHTML = bairros.map(([b, n]) => {
        const esc = String(b).replace(/"/g, '&quot;');
        const on = String(b).replace(/'/g, "\\'");
        return `
        <span class="bchip ${filtroState.bairro === b ? 'ativo' : ''}" data-bairro="${esc}"
              onclick="selectBairro('${on}')">
            ${escapeHtml(b)} <span class="bchip-count">${n}</span>
        </span>`;
    }).join('');
}

// ══════════════════════════════════════════════════════════
//  LÓGICA DE FILTRO POR REGIÃO / BAIRRO
// ══════════════════════════════════════════════════════════
function toggleRegion(reg) {
    if (filtroState.region === reg && !filtroState.bairro) {
        // Desativa
        filtroState.region = null;
        filtroState.bairro = null;
    } else {
        filtroState.region = reg;
        filtroState.bairro = null;
    }
    syncRegionUI();
    aplicarFiltros();
}

function selectBairroChip(event, bairro) {
    event.stopPropagation(); // não ativa o card de região
    if (filtroState.bairro === bairro) {
        filtroState.bairro = null;
        // mantém região ativa
    } else {
        filtroState.bairro = bairro;
        // detecta qual região pertence
        for (const [reg, lista] of Object.entries(REGIOES)) {
            if (lista.includes(bairro)) { filtroState.region = reg; break; }
        }
    }
    syncRegionUI();
    aplicarFiltros();
}

function selectBairro(bairro) {
    if (filtroState.bairro === bairro) {
        filtroState.bairro = null;
        filtroState.region = null;
    } else {
        filtroState.bairro = bairro;
        for (const [reg, lista] of Object.entries(REGIOES)) {
            if (lista.includes(bairro)) { filtroState.region = reg; break; }
        }
    }
    syncRegionUI();
    aplicarFiltros();
}

// ── Filtro rápido por tipo (ex: Terreno) ──
function toggleTipo(tipo) {
    const sel = safeEl('tipo');
    if (!sel) return;
    if (filtroState.tipo === tipo) {
        // Desativa
        filtroState.tipo = null;
        sel.value = '';
        const card = safeEl('card-terrenos');
        if (card) card.classList.remove('active');
    } else {
        // Ativa
        filtroState.tipo = tipo;
        sel.value = tipo;
        // Limpa filtros de região ao selecionar terrenos
        filtroState.region = null;
        filtroState.bairro = null;
        syncRegionUI();
        const card = safeEl('card-terrenos');
        if (card) card.classList.add('active');
    }
    aplicarFiltros();
}

function syncRegionUI() {
    // Cards de região
    ['zona-sul', 'barra-recreio'].forEach(reg => {
        const card = safeEl('card-' + reg);
        if (card) card.classList.toggle('active', filtroState.region === reg);
    });

    // Card terrenos: ativo quando filtroState.tipo === 'Terreno'
    const cardTerrenos = safeEl('card-terrenos');
    if (cardTerrenos) cardTerrenos.classList.toggle('active', filtroState.tipo === 'Terreno');

    // Chips dentro dos cards de região
    document.querySelectorAll('.rc-chip').forEach(chip => {
        chip.classList.toggle('ativo', chip.dataset.bairro === filtroState.bairro);
    });

    document.querySelectorAll('.bchip').forEach(chip => {
        const b = chip.dataset.bairro;
        chip.classList.toggle('ativo', b === filtroState.bairro);
    });
}

// ══════════════════════════════════════════════════════════
//  FILTROS GERAIS
// ══════════════════════════════════════════════════════════
function ordenarImoveis(lista, criterio) {
    const c = [...lista];
    switch (criterio) {
        case 'destaque': return c.sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0));
        case 'recentes': return c.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        case 'menor-preco': return c.sort((a, b) => parseFloat(a.preco || 0) - parseFloat(b.preco || 0));
        case 'maior-preco': return c.sort((a, b) => parseFloat(b.preco || 0) - parseFloat(a.preco || 0));
        case 'maior-area': return c.sort((a, b) => parseFloat(b.area || 0) - parseFloat(a.area || 0));
        default: return c;
    }
}

function aplicarFiltros() {
    const quartos = safeEl('quartos')?.value || '';
    const preco = safeEl('preco')?.value || '';
    // tipo: usa o select OU o filtroState.tipo (card terrenos) — select tem precedência se preenchido
    const tipoSelect = safeEl('tipo')?.value || '';
    const tipoFiltro = tipoSelect || filtroState.tipo || '';
    const ordem = safeEl('ordenar')?.value || 'destaque';
    const vendidos = safeEl('mostrar-vendidos')?.checked;
    const busca = (safeEl('busca-texto-top')?.value || '').toLowerCase().trim();

    let filtrados = imoveis.filter(imo => {
        if (!vendidos && (imo.status === 'vendido' || imo.status === 'alugado')) return false;

        // Filtro de região/bairro (ignorado quando filtrando por tipo terreno sem bairro específico)
        if (filtroState.bairro) {
            if (imo.bairro !== filtroState.bairro) return false;
        } else if (filtroState.region) {
            if (!REGIOES[filtroState.region]?.includes(imo.bairro)) return false;
        }

        const matchQ = !quartos || (quartos === '4' ? parseInt(imo.quartos) >= 4 : String(imo.quartos) === quartos);
        const matchT = !tipoFiltro || imo.tipo === tipoFiltro;
        const matchB = !busca || [imo.titulo, imo.bairro, imo.descricao, imo.tipo].some(v => (v || '').toLowerCase().includes(busca));

        let matchP = true;
        if (preco) {
            const n = parseFloat(imo.preco);
            if (preco === '0-600000') matchP = n <= 600000;
            else if (preco === '600001-1000000') matchP = n > 600000 && n <= 1000000;
            else if (preco === '1000001+') matchP = n > 1000000;
        }

        return matchQ && matchP && matchT && matchB;
    });

    filtrados = ordenarImoveis(filtrados, ordem);

    // Atualiza barra de resultados
    const bar = safeEl('results-bar-new');
    const txt = safeEl('results-text-new');
    const temFiltro = !!(filtroState.region || filtroState.bairro || filtroState.tipo || quartos || preco || tipoSelect || busca || vendidos);

    if (bar) bar.classList.toggle('vis', true);
    if (txt) {
        const total = filtrados.length;
        let msg = total === 0 ? 'Nenhum imóvel encontrado' : `<strong>${total}</strong> imóve${total !== 1 ? 'is encontrados' : 'l encontrado'}`;
        if (filtroState.bairro) msg += ` em <strong>${filtroState.bairro}</strong>`;
        else if (filtroState.region) msg += ` na <strong>${filtroState.region === 'zona-sul' ? 'Zona Sul' : 'Barra & Recreio'}</strong>`;
        else if (filtroState.tipo === 'Terreno') msg += ` do tipo <strong>Terreno</strong>`;
        txt.innerHTML = msg;
    }

    // Botão limpar
    const btnClear = safeEl('btn-clear-all');
    if (btnClear) btnClear.classList.toggle('vis', temFiltro);

    // URL sync
    try {
        const url = new URL(window.location.href);
        if (filtroState.bairro) url.searchParams.set('bairro', filtroState.bairro);
        else url.searchParams.delete('bairro');
        if (filtroState.region) url.searchParams.set('region', filtroState.region);
        else url.searchParams.delete('region');
        ['quartos', 'preco', 'tipo'].forEach(k => {
            const v = safeEl(k)?.value;
            if (v) url.searchParams.set(k, v);
            else url.searchParams.delete(k);
        });
        history.replaceState(null, '', url.toString());
    } catch { }

    renderGallery(filtrados);
    popularChipsBairros();
    atualizarContadoresRegiao();
}

function limparFiltros() {
    filtroState.region = null;
    filtroState.bairro = null;
    filtroState.tipo = null;
    ['quartos', 'preco', 'tipo'].forEach(id => { const el = safeEl(id); if (el) el.value = ''; });
    const mv = safeEl('mostrar-vendidos'); if (mv) mv.checked = false;
    const busca = safeEl('busca-texto-top'); if (busca) busca.value = '';
    // Remove active do card terrenos
    const cardTerrenos = safeEl('card-terrenos');
    if (cardTerrenos) cardTerrenos.classList.remove('active');
    syncRegionUI();
    aplicarFiltros();
}

// ══════════════════════════════════════════════════════════
//  RENDERIZAR GALERIA
// ══════════════════════════════════════════════════════════

// IntersectionObserver para blur-up nas imagens dos cards
let _cardImgObserver = null;
function _setupCardImgObserver() {
    if (!('IntersectionObserver' in window)) return;
    if (_cardImgObserver) _cardImgObserver.disconnect();
    _cardImgObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const img = entry.target;
            const reveal = () => {
                img.style.transition = 'filter 0.35s ease';
                img.style.filter = '';
                img.style.willChange = 'auto';
            };
            if (img.complete && img.naturalWidth > 0) { reveal(); }
            else { img.addEventListener('load', reveal, { once: true }); }
            if (img.decode) img.decode().catch(() => { });
            _cardImgObserver.unobserve(img);
        });
    }, { rootMargin: '250px 0px', threshold: 0 });
}

function renderGallery(lista, containerId = 'gallery') {
    const gallery = safeEl(containerId);
    if (!gallery) return;

    hideSkeleton();

    if (!lista.length) {
        gallery.innerHTML = `
            <div class="empty-state-gallery">
                <div class="empty-state-icon"><i class="fas fa-search"></i></div>
                <h3>Nenhum imóvel encontrado</h3>
                <p>Tente ajustar os filtros ou limpar a busca.</p>
                <button onclick="limparFiltros()" class="btn-empty-clear">
                    <i class="fas fa-times"></i> Limpar filtros
                </button>
            </div>`;
        return;
    }

    gallery.innerHTML = lista.map(imo => {
        const isTerreno = imo.tipo === 'Terreno';
        const isLancamento = imo.precoModo === 'lancamento';
        const precoNum = parseFloat(imo.preco).toLocaleString('pt-BR');
        const precoLabel = isLancamento
            ? `<span class="lb-launch-pill">Lançamento</span>`
            : ((isTerreno && imo.precoTipo === 'por_m2')
                ? `R$ ${precoNum}/m²`
                : `R$ ${precoNum}`);
        const isFav = isFavorito(imo.id);

        let statusBadge = '';
        if (imo.status === 'vendido') statusBadge = '<div class="imovel-vendido-badge"><i class="fas fa-check-circle"></i> Vendido</div>';
        else if (imo.status === 'alugado') statusBadge = '<div class="imovel-vendido-badge" style="border-color:var(--primary);color:var(--primary);"><i class="fas fa-key"></i> Alugado</div>';
        else if (imo.status === 'reservado') statusBadge = '<div class="imovel-vendido-badge" style="border-color:var(--warning);color:var(--warning);"><i class="fas fa-clock"></i> Reservado</div>';

        // Tags adaptadas por tipo
        let detailTags = `<span class="detail-tag"><i class="fas fa-ruler-combined"></i> ${imo.area} m²</span>`;
        if (isTerreno) {
            if (imo.frente) detailTags += `<span class="detail-tag"><i class="fas fa-arrows-alt-h"></i> ${escapeHtml(imo.frente)}m frente</span>`;
            if (imo.zoneamento) detailTags += `<span class="detail-tag"><i class="fas fa-layer-group"></i> ${escapeHtml(imo.zoneamento)}</span>`;
            if (imo.topografia) detailTags += `<span class="detail-tag"><i class="fas fa-mountain"></i> ${escapeHtml(imo.topografia)}</span>`;
            if (imo.localidade) detailTags += `<span class="detail-tag"><i class="fas fa-map-pin"></i> ${escapeHtml(imo.localidade)}</span>`;
        } else {
            if (imo.quartos) detailTags += `<span class="detail-tag"><i class="fas fa-bed"></i> ${imo.quartos} qto${imo.quartos > 1 ? 's' : ''}</span>`;
            if (imo.vagas) detailTags += `<span class="detail-tag"><i class="fas fa-car"></i> ${imo.vagas}</span>`;
            if (imo.suites) detailTags += `<span class="detail-tag"><i class="fas fa-bath"></i> ${imo.suites} suíte${imo.suites > 1 ? 's' : ''}</span>`;
            if (imo.banheiros) detailTags += `<span class="detail-tag"><i class="fas fa-shower"></i> ${imo.banheiros} banh.</span>`;
            const solIcons = { manha: '☀️ Manhã', tarde: '🌅 Tarde', 'manha-tarde': '☀️ Manhã/Tarde', noite: '🌙 Sem sol' };
            if (imo.sol && solIcons[imo.sol]) detailTags += `<span class="detail-tag">${solIcons[imo.sol]}</span>`;
            if (imo.andar) detailTags += `<span class="detail-tag"><i class="fas fa-layer-group"></i> ${imo.andar}º andar</span>`;
        }
        if (imo.tipo) detailTags += `<span class="detail-tag">${escapeHtml(imo.tipo)}</span>`;

        return `
            <div class="imovel" onclick="openModal('${imo.id}')">
                <div class="imovel-img-wrap">
                    <img src="${escapeHtml(imo.imagem)}" alt="${escapeHtml(imo.titulo)}" loading="lazy" width="400" height="300"
                         onerror="this.src='https://via.placeholder.com/400x300/1a1a2e/fff?text=${isTerreno ? 'Terreno' : 'Imovel'}'">
                    <button class="favorito-btn ${isFav ? 'favorito-ativo' : ''}"
                            data-id="${imo.id}"
                            onclick="toggleFavorito('${imo.id}', event)">
                        <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <div class="imovel-badge">${escapeHtml(imo.bairro)}</div>
                    ${imo.destaque ? '<div class="imovel-destaque-badge"><i class="fas fa-star"></i> Destaque</div>' : ''}
                    <div class="imovel-fotos-count">
                        <i class="fas fa-images"></i> ${imo.fotos ? imo.fotos.length : 1} foto${(imo.fotos?.length || 1) > 1 ? 's' : ''}
                    </div>
                    ${statusBadge}
                </div>
                <div class="imovel-content">
                    <h3>${escapeHtml(imo.titulo)}</h3>
                    <div class="imovel-details-row">${detailTags}</div>
                    <p class="imovel-preco">${precoLabel}</p>
                    ${(!isTerreno && imo.condominio) ? `<p class="imovel-condominio"><small>Cond. R$ ${imo.condominio.toLocaleString('pt-BR')}/mês</small></p>` : ''}
                    ${(isTerreno && imo.iptu) ? `<p class="imovel-condominio"><small>IPTU R$ ${imo.iptu.toLocaleString('pt-BR')}/ano</small></p>` : ''}
                    <p class="imovel-desc">${escapeHtml(imo.descricao)}</p>
                    <button class="btn-saiba-mais" onclick="openModal('${imo.id}');event.stopPropagation()">
                        <span>Saiba Mais</span><i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>`;
    }).join('');

    // Aplica blur-up + IntersectionObserver nas imagens dos cards
    _setupCardImgObserver();
    gallery.querySelectorAll('.imovel-img-wrap img').forEach(img => {
        if (!img.complete || img.naturalWidth === 0) {
            img.style.filter = 'blur(3px)';
            img.style.willChange = 'filter';
            _cardImgObserver && _cardImgObserver.observe(img);
        }
    });
}

// ══════════════════════════════════════════════════════════
//  SKELETON
// ══════════════════════════════════════════════════════════
function hideSkeleton() {
    const skel = safeEl('gallery-skeleton');
    const gal = safeEl('gallery');
    if (skel) skel.style.display = 'none';
    if (gal) gal.style.display = '';
}

// ══════════════════════════════════════════════════════════
//  MODAL SAIBA MAIS
// ══════════════════════════════════════════════════════════
let currentPhotoIndex = 0;
let currentImovelFotos = [];
let currentImovelVideo = null;
let currentImovel = null;
let lightboxIndex = 0;
let _modalFocusTrapHandler = null;
let _modalLastFocusEl = null;

function openModal(imovelId) {
    const imo = imoveis.find(i => String(i.id) === String(imovelId));
    if (!imo) return;

    currentImovel = imo;
    window.lbActiveImovel = imo;
    window.lbLastImovel = imo;
    currentImovelFotos = imo.fotos && imo.fotos.length ? imo.fotos : [imo.imagem];
    const videoList = Array.isArray(imo.videos) && imo.videos.length ? imo.videos : (imo.video ? [imo.video] : []);
    currentImovelVideo = videoList.length ? videoList : null;
    currentPhotoIndex = 0;

    safeText('modal-title', imo.titulo);
    safeText('modal-descricao', imo.descricao);

    // Tags
    const tags = safeEl('modal-tags');
    const isTerreno = imo.tipo === 'Terreno';
    const isLancamento = imo.precoModo === 'lancamento';
    const precoLabel = isLancamento
        ? 'Lançamento'
        : ((isTerreno && imo.precoTipo === 'por_m2')
            ? 'R$ ' + parseFloat(imo.preco).toLocaleString('pt-BR') + '/m²'
            : 'R$ ' + parseFloat(imo.preco).toLocaleString('pt-BR'));
    safeText('modal-preco', precoLabel);
    if (tags) {
        let html = `<span class="modal-tag"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(imo.bairro)}</span>`;
        html += `<span class="modal-tag"><i class="fas fa-ruler-combined"></i> ${imo.area} m²</span>`;
        if (isLancamento) {
            const ap = imo?.lancamento?.aPartirDe ? `R$ ${Number(imo.lancamento.aPartirDe).toLocaleString('pt-BR')}` : null;
            const en = imo?.lancamento?.entrada ? `R$ ${Number(imo.lancamento.entrada).toLocaleString('pt-BR')}` : null;
            const pa = imo?.lancamento?.parcelas ? String(imo.lancamento.parcelas) : null;
            html += `<span class="modal-tag" style="border-color:rgba(168,85,247,.35);color:#c084f5;">Lançamento</span>`;
            if (ap) html += `<span class="modal-tag"><i class="fas fa-tag"></i> A partir de ${ap}</span>`;
            if (en) html += `<span class="modal-tag"><i class="fas fa-coins"></i> Entrada ${en}</span>`;
            if (pa) html += `<span class="modal-tag"><i class="fas fa-list-ol"></i> ${pa}</span>`;
        }
        if (isTerreno) {
            if (imo.frente) html += `<span class="modal-tag"><i class="fas fa-arrows-alt-h"></i> ${escapeHtml(imo.frente)}m frente</span>`;
            if (imo.zoneamento) html += `<span class="modal-tag"><i class="fas fa-layer-group"></i> ${escapeHtml(imo.zoneamento)}</span>`;
            if (imo.topografia) html += `<span class="modal-tag"><i class="fas fa-mountain"></i> ${escapeHtml(imo.topografia)}</span>`;
            if (imo.localidade) html += `<span class="modal-tag"><i class="fas fa-map-pin"></i> ${escapeHtml(imo.localidade)}</span>`;
            if (imo.iptu) html += `<span class="modal-tag"><i class="fas fa-file-invoice-dollar"></i> IPTU R$ ${Number(imo.iptu).toLocaleString('pt-BR')}/ano</span>`;
        } else {
            if (imo.quartos) html += `<span class="modal-tag"><i class="fas fa-bed"></i> ${imo.quartos} quartos</span>`;
            if (imo.vagas) html += `<span class="modal-tag"><i class="fas fa-car"></i> ${imo.vagas} vaga${imo.vagas > 1 ? 's' : ''}</span>`;
            if (imo.condominio) html += `<span class="modal-tag"><i class="fas fa-home"></i> Cond. R$ ${imo.condominio.toLocaleString('pt-BR')}</span>`;
            if (imo.suites) html += `<span class="modal-tag"><i class="fas fa-bath"></i> ${imo.suites} suíte${imo.suites > 1 ? 's' : ''}</span>`;
            if (imo.banheiros) html += `<span class="modal-tag"><i class="fas fa-shower"></i> ${imo.banheiros} banheiro${imo.banheiros > 1 ? 's' : ''}</span>`;
            if (imo.andar) html += `<span class="modal-tag"><i class="fas fa-layer-group"></i> ${imo.andar}º andar${imo.totalAndares ? ' de ' + imo.totalAndares : ''}</span>`;
            if (imo.sol) { const sm = { manha: '☀️ Sol da manhã', tarde: '🌅 Sol da tarde', 'manha-tarde': '☀️ Sol manhã e tarde', noite: '🌙 Sem sol direto' }; if (sm[imo.sol]) html += `<span class="modal-tag">${sm[imo.sol]}</span>`; }
            if (imo.posicao) html += `<span class="modal-tag"><i class="fas fa-compass"></i> ${escapeHtml(imo.posicao.charAt(0).toUpperCase() + imo.posicao.slice(1))}</span>`;
            if (imo.mobiliado && imo.mobiliado !== 'nao') { const mm = { semi: 'Semi-mobiliado', sim: 'Mobiliado' }; html += `<span class="modal-tag"><i class="fas fa-couch"></i> ${mm[imo.mobiliado] || ''}</span>`; }
            if (imo.areaPrivativa) html += `<span class="modal-tag"><i class="fas fa-ruler-combined"></i> ${imo.areaPrivativa}m² privativa</span>`;
        }
        tags.innerHTML = html;
    }

    // WhatsApp
    const waPrecoTxt = isLancamento
        ? 'Lançamento'
        : ('R$ ' + parseFloat(imo.preco).toLocaleString('pt-BR'));
    const waMsg = encodeURIComponent(`Olá Leandro! Tenho interesse no imóvel: *${imo.titulo}* — ${imo.bairro}, ${waPrecoTxt}. Pode me dar mais informações?`);
    const waLink = safeEl('modal-whatsapp');
    if (waLink) waLink.href = `https://wa.me/5521981424469?text=${waMsg}`;

    // Share
    const shareBtn = safeEl('modal-share-btn');
    if (shareBtn) {
        shareBtn.onclick = function () {
            const url = window.location.origin + '/imoveis.html?imovel=' + imo.id;
            navigator.clipboard?.writeText(url).then(() => {
                shareBtn.innerHTML = '<i class="fas fa-check"></i><span>Copiado!</span>';
                shareBtn.classList.add('share-copied');
                setTimeout(() => {
                    shareBtn.innerHTML = '<i class="fas fa-share-alt"></i><span>Compartilhar</span>';
                    shareBtn.classList.remove('share-copied');
                }, 2500);
                if (typeof window.trackLinkCopiado === 'function') window.trackLinkCopiado(String(imo.id), imo.titulo);
                // Notificação no admin via tracker
            });
        };
    }

    const modal = safeEl('imovel-modal');
    if (modal) {
        _modalLastFocusEl = document.activeElement;
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        const focusables = [...modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')]
            .filter(el => !el.disabled && el.offsetParent !== null);
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (_modalFocusTrapHandler) {
            modal.removeEventListener('keydown', _modalFocusTrapHandler);
            _modalFocusTrapHandler = null;
        }
        if (focusables.length) {
            _modalFocusTrapHandler = (e) => {
                if (e.key !== 'Tab') return;
                if (e.shiftKey) {
                    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
                } else {
                    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            };
            modal.addEventListener('keydown', _modalFocusTrapHandler);
            requestAnimationFrame(() => { (first || modal.querySelector('.modal-close'))?.focus(); });
        }
    }

    // Área principal já; faixa de miniaturas no próximo frame (evita congelar no clique)
    renderModalPhotos({ deferThumbs: true });

    const runSideEffects = () => {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('imovel', imo.id);
            history.replaceState(null, '', url.toString());
            document.title = `${imo.titulo} | Leandro Bomfim`;
        } catch { }
        injectSchemaOrg(imo);
        if (typeof window.trackImovelView === 'function') {
            window.trackImovelView(String(imo.id), imo.titulo, imo.bairro);
        }
        if (typeof window.startImovelView === 'function') {
            window.startImovelView(imo.id, imo.titulo);
        }
    };
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(runSideEffects, { timeout: 500 });
    } else {
        setTimeout(runSideEffects, 0);
    }
}

function closeModal() {
    const modalTrap = safeEl('imovel-modal');
    if (modalTrap && _modalFocusTrapHandler) {
        modalTrap.removeEventListener('keydown', _modalFocusTrapHandler);
        _modalFocusTrapHandler = null;
    }
    try { _modalLastFocusEl && _modalLastFocusEl.focus && _modalLastFocusEl.focus(); } catch { }
    _modalLastFocusEl = null;

    _modalThumbsToken++;
    const thumbs = safeEl('modal-thumbs');
    if (thumbs) {
        thumbs.classList.remove('modal-thumbs-loading');
        if (_modalThumbScrollHandler) {
            thumbs.removeEventListener('scroll', _modalThumbScrollHandler);
            _modalThumbScrollHandler = null;
        }
    }

    // Para e remove vídeo nativo
    const nativeVideo = document.querySelector('.modal-main-photo-wrap video.lb-modal-video');
    if (nativeVideo) { nativeVideo.pause(); nativeVideo.removeAttribute('src'); nativeVideo.load(); nativeVideo.remove(); }
    // Remove placeholder de vídeo
    document.querySelector('.modal-main-photo-wrap .lb-video-ph')?.remove();
    document.querySelector('.modal-main-photo-wrap .lb-video-spinner')?.remove();
    // Limpa iframe (YouTube/terceiros)
    const iframe = document.querySelector('iframe.modal-video-embed');
    if (iframe) { if (iframe._vfh) window.removeEventListener('message', iframe._vfh); iframe.src = ''; iframe.remove(); }
    closeLightbox();
    const modal = safeEl('imovel-modal');
    if (modal) modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    window.lbActiveImovel = null;
    try {
        const url = new URL(window.location.href);
        url.searchParams.delete('imovel');
        history.replaceState(null, '', url.toString());
        document.title = 'Imóveis à Venda no Rio de Janeiro | Leandro Bomfim';
    } catch { }
}

// YouTube helpers
function getYouTubeId(url) {
    if (!url) return null;
    let m;
    const s = String(url);
    if ((m = s.match(/shorts\/([a-zA-Z0-9_-]{11})/))) return m[1];
    if ((m = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/))) return m[1];
    if ((m = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/))) return m[1];
    if ((m = s.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/))) return m[1];
    return null;
}
function getYouTubeEmbedUrl(url) {
    const id = getYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?rel=0&playsinline=1&enablejsapi=1` : null;
}

function getVimeoId(url) {
    if (!url) return null;
    const m = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? m[1] : null;
}

function getDailymotionId(url) {
    if (!url) return null;
    const m = String(url).match(/dailymotion\.com\/(?:embed\/)?video\/([a-zA-Z0-9]+)/);
    return m ? m[1] : null;
}

/** Converte links comuns em URL de iframe incorporável (terceiros) */
const _EMBED_ALLOWED = [
    'www.dailymotion.com', 'dailymotion.com', 'drive.google.com', 'streamable.com',
    'player.vimeo.com', 'www.youtube.com', 'youtube.com', 'youtu.be',
];
function resolveThirdPartyEmbedUrl(url) {
    if (!url) return null;
    const u = String(url).trim();
    const dm = getDailymotionId(u);
    if (dm) return `https://www.dailymotion.com/embed/video/${dm}`;
    const gd = u.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;
    const st = u.match(/streamable\.com\/(?:e\/)?([a-z0-9]+)/i);
    if (st) return `https://streamable.com/e/${st[1]}`;
    if (!/^https?:\/\//i.test(u)) return null;
    try {
        const host = new URL(u).hostname.replace(/^www\./, '');
        const ok = _EMBED_ALLOWED.some(h => host === h.replace(/^www\./, '') || host.endsWith('.' + h.replace(/^www\./, '')));
        if (ok) return u;
    } catch { return null; }
    return null;
}

/** MP4/WebM etc. — não confundir com páginas do YouTube/Vimeo */
function isNativeVideoUrl(src) {
    if (!src) return false;
    const clean = src.split('?')[0].split('#')[0];
    const ext = clean.split('.').pop().toLowerCase();
    if (['mp4', 'webm', 'ogg', 'mov', 'm4v', 'mkv'].includes(ext)) return true;
    const lower = src.toLowerCase();
    return lower.includes('.m3u8') ||
        (lower.includes('video') && !lower.includes('youtube') && !lower.includes('youtu.') && !lower.includes('vimeo'));
}

// Miniaturas virtualizadas (centenas de mídias sem travar o DOM)
const _MODAL_THUMB_STRIP_W = 98; // ~90px thumb + gap
const _MODAL_THUMB_WINDOW = 8;
let _modalThumbWinStart = 0;
let _vimeoThumbCache = {};
const _vimeoOembedPending = new Set();

function _ensureVimeoThumb(vimeoId) {
    if (!vimeoId || _vimeoThumbCache[vimeoId] || _vimeoOembedPending.has(vimeoId)) return;
    _vimeoOembedPending.add(vimeoId);
    fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${vimeoId}&width=640`)
        .then(r => r.json())
        .then(d => {
            if (d.thumbnail_url) _vimeoThumbCache[vimeoId] = d.thumbnail_url;
            const modal = safeEl('imovel-modal');
            if (modal?.classList.contains('active')) renderModalPhotos({ deferThumbs: false });
        })
        .catch(() => { })
        .finally(() => { _vimeoOembedPending.delete(vimeoId); });
}

let _modalThumbScrollHandler = null;
/** Cancela preenchimento assíncrono das miniaturas (evita trabalho obsoleto) */
let _modalThumbsToken = 0;

function _scheduleModalThumbsFill(thumbs, medias) {
    if (_modalThumbScrollHandler) {
        thumbs.removeEventListener('scroll', _modalThumbScrollHandler);
        _modalThumbScrollHandler = null;
    }
    const token = ++_modalThumbsToken;
    thumbs.replaceChildren();
    thumbs.classList.add('modal-thumbs-loading');
    requestAnimationFrame(() => {
        if (token !== _modalThumbsToken) return;
        requestAnimationFrame(() => {
            if (token !== _modalThumbsToken) return;
            thumbs.classList.remove('modal-thumbs-loading');
            _fillModalThumbs(thumbs, medias, { scrollSmooth: false });
        });
    });
}

function _debounce(fn, ms) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), ms);
    };
}

const _BLANK_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function _createModalThumbEl(m, idx, medias, loadEager) {
    const thumb = document.createElement('div');
    thumb.className = 'modal-thumb' + (idx === currentPhotoIndex ? ' active' : '');
    thumb.style.position = 'relative';

    if (m.type === 'video') {
        const ytId = getYouTubeId(m.src);
        const vimeoId = getVimeoId(m.src);
        if (ytId) {
            const img = document.createElement('img');
            img.alt = 'Vídeo';
            img.decoding = 'async';
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px;display:block;';
            img.onerror = function () { this.src = _BLANK_GIF; };
            if (loadEager || idx < 2) {
                img.src = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
            } else {
                img.dataset.src = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
                img.src = _BLANK_GIF;
                img.style.background = '#0f1923';
            }
            thumb.appendChild(img);
            const ic = document.createElement('div');
            ic.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);border-radius:8px;pointer-events:none;';
            ic.innerHTML = '<i class="fab fa-youtube" style="color:#ff0000;font-size:1.3rem;"></i>';
            thumb.appendChild(ic);
        } else if (vimeoId && _vimeoThumbCache[vimeoId]) {
            const vi = document.createElement('img');
            vi.src = _vimeoThumbCache[vimeoId];
            vi.alt = '';
            vi.decoding = 'async';
            vi.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px;display:block;';
            thumb.appendChild(vi);
            const vic = document.createElement('div');
            vic.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);border-radius:8px;pointer-events:none;';
            vic.innerHTML = '<i class="fas fa-play-circle" style="color:#1ab7ea;font-size:1.1rem;"></i>';
            thumb.appendChild(vic);
        } else if (vimeoId) {
            thumb.innerHTML = `
                <div style="width:100%;height:100%;background:linear-gradient(135deg,#0d1520,#1a2a40);
                     display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:8px;">
                    <i class="fas fa-play-circle" style="color:#1ab7ea;font-size:1.1rem;"></i>
                    <span style="font-size:.5rem;color:rgba(255,255,255,.4);">VÍDEO</span>
                </div>`;
            _ensureVimeoThumb(vimeoId);
        } else if (getDailymotionId(m.src)) {
            const dmId = getDailymotionId(m.src);
            const dmImg = document.createElement('img');
            dmImg.alt = '';
            dmImg.decoding = 'async';
            dmImg.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px;display:block;';
            dmImg.onerror = function () { this.src = _BLANK_GIF; };
            const dmThumb = `https://www.dailymotion.com/thumbnail/video/${dmId}`;
            if (loadEager || idx < 2) {
                dmImg.src = dmThumb;
            } else {
                dmImg.dataset.src = dmThumb;
                dmImg.src = _BLANK_GIF;
                dmImg.style.background = '#0f1923';
            }
            thumb.appendChild(dmImg);
            const dmIc = document.createElement('div');
            dmIc.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);border-radius:8px;pointer-events:none;';
            dmIc.innerHTML = '<i class="fas fa-play-circle" style="color:#fff;font-size:1.1rem;"></i>';
            thumb.appendChild(dmIc);
        } else if (isNativeVideoUrl(m.src)) {
            thumb.innerHTML = `
                <div style="width:100%;height:100%;background:linear-gradient(135deg,#0d1520,#1a2a40);
                     display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:8px;">
                    <i class="fas fa-film" style="color:var(--primary);font-size:1.1rem;"></i>
                    <span style="font-size:.5rem;color:rgba(255,255,255,.4);letter-spacing:.05em;">VÍDEO</span>
                </div>`;
        } else if (resolveThirdPartyEmbedUrl(m.src)) {
            thumb.innerHTML = `
                <div style="width:100%;height:100%;background:linear-gradient(135deg,#0d1520,#1a2a40);
                     display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:8px;">
                    <i class="fas fa-window-maximize" style="color:var(--primary);font-size:1rem;"></i>
                    <span style="font-size:.5rem;color:rgba(255,255,255,.4);">WEB</span>
                </div>`;
        } else {
            thumb.innerHTML = `
                <div style="width:100%;height:100%;background:linear-gradient(135deg,#1a1520,#2a1a40);
                     display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:8px;">
                    <i class="fas fa-question" style="color:rgba(255,255,255,.45);font-size:1rem;"></i>
                    <span style="font-size:.5rem;color:rgba(255,255,255,.35);">?</span>
                </div>`;
        }
    } else {
        const img = document.createElement('img');
        img.alt = `Foto ${idx + 1}`;
        img.decoding = 'async';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px;display:block;';
        img.onerror = function () { this.src = 'https://via.placeholder.com/90x62/1a1a2e/fff?text=Foto'; };

        if (loadEager || idx < 3) {
            img.src = m.src;
        } else {
            img.dataset.src = m.src;
            img.src = _BLANK_GIF;
            img.style.background = '#111827';
        }
        thumb.appendChild(img);
    }

    thumb.addEventListener('click', () => {
        const lazyImg = thumb.querySelector('img[data-src]');
        if (lazyImg) { lazyImg.src = lazyImg.dataset.src; delete lazyImg.dataset.src; }
        currentPhotoIndex = idx;
        renderModalPhotos();
    });
    return thumb;
}

function _fillModalThumbs(thumbs, medias, thumbOpts) {
    const scrollSmooth = thumbOpts && thumbOpts.scrollSmooth !== false;
    if (_modalThumbScrollHandler) {
        thumbs.removeEventListener('scroll', _modalThumbScrollHandler);
        _modalThumbScrollHandler = null;
    }
    thumbs.style.paddingLeft = '';
    thumbs.style.paddingRight = '';

    const total = medias.length;
    const useVirtual = total > _MODAL_THUMB_WINDOW * 2;

    if (!useVirtual) {
        thumbs.innerHTML = '';
        medias.forEach((m, idx) => {
            const eager = idx === currentPhotoIndex || idx < 3;
            thumbs.appendChild(_createModalThumbEl(m, idx, medias, eager));
        });
        _setupThumbObserver(thumbs);
        const activeThumb = thumbs.querySelectorAll('.modal-thumb')[currentPhotoIndex];
        if (activeThumb) {
            activeThumb.scrollIntoView({
                inline: 'center',
                behavior: scrollSmooth ? 'smooth' : 'auto',
                block: 'nearest',
            });
        }
        return;
    }

    _modalThumbWinStart = Math.max(0, Math.min(
        currentPhotoIndex - Math.floor(_MODAL_THUMB_WINDOW / 2),
        total - _MODAL_THUMB_WINDOW
    ));
    const winEnd = Math.min(_modalThumbWinStart + _MODAL_THUMB_WINDOW, total);
    thumbs.style.paddingLeft = `${_modalThumbWinStart * _MODAL_THUMB_STRIP_W}px`;
    thumbs.style.paddingRight = `${(total - winEnd) * _MODAL_THUMB_STRIP_W}px`;
    thumbs.innerHTML = '';

    for (let i = _modalThumbWinStart; i < winEnd; i++) {
        const eager = i === currentPhotoIndex || i < _modalThumbWinStart + 2;
        thumbs.appendChild(_createModalThumbEl(medias[i], i, medias, eager));
    }

    const onScroll = _debounce(() => {
        const scrolled = thumbs.scrollLeft;
        const newStart = Math.max(0, Math.min(
            Math.floor(scrolled / _MODAL_THUMB_STRIP_W) - 2,
            total - _MODAL_THUMB_WINDOW
        ));
        if (newStart === _modalThumbWinStart) return;
        _modalThumbWinStart = newStart;
        const we = Math.min(_modalThumbWinStart + _MODAL_THUMB_WINDOW, total);
        thumbs.style.paddingLeft = `${_modalThumbWinStart * _MODAL_THUMB_STRIP_W}px`;
        thumbs.style.paddingRight = `${(total - we) * _MODAL_THUMB_STRIP_W}px`;
        thumbs.innerHTML = '';
        for (let j = _modalThumbWinStart; j < we; j++) {
            const eg = j === currentPhotoIndex || j < _modalThumbWinStart + 2;
            thumbs.appendChild(_createModalThumbEl(medias[j], j, medias, eg));
        }
    }, 80);

    _modalThumbScrollHandler = onScroll;
    thumbs.addEventListener('scroll', onScroll, { passive: true });

    const localIdx = currentPhotoIndex - _modalThumbWinStart;
    const tlist = thumbs.querySelectorAll('.modal-thumb');
    const target = tlist[localIdx] || tlist[0];
    if (target) {
        target.scrollIntoView({
            inline: 'center',
            behavior: scrollSmooth ? 'smooth' : 'auto',
            block: 'nearest',
        });
    }
}

function renderModalPhotos(opts) {
    opts = opts || {};
    const deferThumbs = !!opts.deferThumbs;
    const mainWrap = document.querySelector('.modal-main-photo-wrap');
    const mainImg = safeEl('modal-main-photo');
    const thumbs = safeEl('modal-thumbs');
    const counter = safeEl('modal-photo-counter');
    if (!mainWrap || !thumbs) return;

    // ── Monta lista de mídias (vídeos primeiro, depois fotos) ──
    const medias = [];
    if (currentImovelVideo) currentImovelVideo.forEach(v => medias.push({ type: 'video', src: v }));
    currentImovelFotos.forEach(f => medias.push({ type: 'foto', src: f }));
    if (!medias.length) return;

    // Garante que o índice é válido
    if (currentPhotoIndex >= medias.length) currentPhotoIndex = 0;
    const media = medias[currentPhotoIndex];
    if (counter) counter.textContent = `${currentPhotoIndex + 1} / ${medias.length}`;

    // ── Limpa estado anterior ──
    // Para e remove vídeo nativo (mp4/webm)
    const oldVideo = mainWrap.querySelector('video.lb-modal-video');
    if (oldVideo) { oldVideo.pause(); oldVideo.removeAttribute('src'); oldVideo.load(); oldVideo.remove(); }
    // Remove placeholder de vídeo
    const oldPlaceholder = mainWrap.querySelector('.lb-video-ph');
    if (oldPlaceholder) oldPlaceholder.remove();
    // Remove iframe (YouTube/terceiros)
    const oldIframe = mainWrap.querySelector('iframe.modal-video-embed');
    if (oldIframe) { if (oldIframe._vfh) window.removeEventListener('message', oldIframe._vfh); oldIframe.src = ''; oldIframe.remove(); }
    // Remove fallback antigo
    const oldFallback = mainWrap.querySelector('.video-embed-fallback');
    if (oldFallback) oldFallback.remove();

    // ── Exibe mídia principal ──
    if (media.type === 'video') {
        if (mainImg) mainImg.style.display = 'none';

        const ytId = getYouTubeId(media.src);
        const vimeoId = getVimeoId(media.src);

        const ph = document.createElement('div');
        ph.className = 'lb-video-ph';

        if (ytId) {
            ph.innerHTML = `
                <img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg"
                     alt="Thumbnail" decoding="async" fetchpriority="low"
                     style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:16px;"
                     onerror="this.style.display='none'">
                <div style="position:absolute;inset:0;background:rgba(0,0,0,.35);border-radius:16px;"></div>
                <div class="lb-play-wrap">
                    <i class="fab fa-youtube" style="color:#ff0000;font-size:2rem;"></i>
                </div>
                <span class="lb-play-label">Clique para reproduzir</span>`;
            ph.addEventListener('click', () => {
                ph.remove();
                _openVideoIframe(mainWrap, mainImg, media.src, ytId);
            });
        } else if (vimeoId) {
            ph.innerHTML = `
                <div class="lb-play-wrap">
                    <i class="fas fa-play" style="color:#fff;font-size:1.5rem;margin-left:4px;"></i>
                </div>
                <span class="lb-play-label">Clique para reproduzir (Vimeo)</span>`;
            if (_vimeoThumbCache[vimeoId]) {
                const t = document.createElement('img');
                t.src = _vimeoThumbCache[vimeoId];
                t.alt = '';
                t.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:16px;';
                ph.insertBefore(t, ph.firstChild);
                const ov = document.createElement('div');
                ov.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,.35);border-radius:16px;';
                ph.insertBefore(ov, ph.querySelector('.lb-play-wrap'));
            } else {
                _ensureVimeoThumb(vimeoId);
            }
            ph.addEventListener('click', () => {
                ph.remove();
                _openVimeoIframe(mainWrap, mainImg, vimeoId);
            });
        } else if (getDailymotionId(media.src)) {
            const dmId = getDailymotionId(media.src);
            ph.innerHTML = `
                <img src="https://www.dailymotion.com/thumbnail/video/${dmId}"
                     alt="" decoding="async" fetchpriority="low"
                     style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:16px;"
                     onerror="this.style.display='none'">
                <div style="position:absolute;inset:0;background:rgba(0,0,0,.35);border-radius:16px;"></div>
                <div class="lb-play-wrap">
                    <i class="fas fa-play" style="color:#fff;font-size:1.5rem;margin-left:4px;"></i>
                </div>
                <span class="lb-play-label">Clique para reproduzir</span>`;
            ph.addEventListener('click', () => {
                ph.remove();
                _openDailymotionIframe(mainWrap, mainImg, dmId);
            });
        } else if (isNativeVideoUrl(media.src)) {
            ph.innerHTML = `
                <div class="lb-play-wrap">
                    <i class="fas fa-play" style="color:#fff;font-size:1.5rem;margin-left:4px;"></i>
                </div>
                <span class="lb-play-label">Clique para reproduzir o vídeo</span>`;
            ph.addEventListener('click', () => {
                ph.remove();
                _openVideoNative(mainWrap, mainImg, media.src);
            });
        } else {
            const embedSrc = resolveThirdPartyEmbedUrl(media.src);
            if (embedSrc) {
                ph.innerHTML = `
                    <div class="lb-play-wrap">
                        <i class="fas fa-play" style="color:#fff;font-size:1.5rem;margin-left:4px;"></i>
                    </div>
                    <span class="lb-play-label">Clique para reproduzir na página</span>`;
                ph.addEventListener('click', () => {
                    ph.remove();
                    _openGenericEmbedIframe(mainWrap, mainImg, embedSrc);
                });
            } else {
                ph.innerHTML = `
                    <div class="lb-play-wrap">
                        <i class="fas fa-link" style="color:#fff;font-size:1.35rem;"></i>
                    </div>
                    <span class="lb-play-label">URL de vídeo não reconhecida</span>
                    <span class="lb-play-label" style="font-size:.72rem;max-width:280px;line-height:1.35;">
                        Use link direto .mp4/.webm, YouTube, Vimeo, Dailymotion ou página com opção de incorporar.
                    </span>`;
            }
        }

        mainWrap.appendChild(ph);

    } else {
        // ── FOTO: pré-carrega e exibe com blur-up suave ──
        if (mainImg) {
            mainImg.style.display = 'block';
            mainImg.style.filter = 'blur(6px)';
            mainImg.style.transition = 'none';

            const preloader = new Image();
            preloader.onload = () => {
                mainImg.src = media.src;
                requestAnimationFrame(() => {
                    mainImg.style.transition = 'filter 0.3s ease';
                    mainImg.style.filter = '';
                });
            };
            preloader.onerror = () => {
                mainImg.src = 'https://via.placeholder.com/800x500/1a1a2e/fff?text=Imóvel';
                mainImg.style.filter = '';
            };
            preloader.src = media.src;

            const videoCount = currentImovelVideo ? currentImovelVideo.length : 0;
            const fotoIdx = Math.max(0, currentPhotoIndex - videoCount);
            mainImg.style.cursor = 'zoom-in';
            mainImg.onclick = () => openLightbox(fotoIdx);
        }
    }

    // ── Miniaturas: trabalho pesado sai da mesma fatia do clique ──
    if (deferThumbs) {
        _scheduleModalThumbsFill(thumbs, medias);
    } else {
        _modalThumbsToken++;
        thumbs.classList.remove('modal-thumbs-loading');
        _fillModalThumbs(thumbs, medias, { scrollSmooth: true });
    }
}

// ── IntersectionObserver para thumbs fora da faixa visível ──
let _thumbObs = null;
function _setupThumbObserver(container) {
    if (!('IntersectionObserver' in window)) {
        // Fallback: carrega tudo
        container.querySelectorAll('img[data-src]').forEach(img => { img.src = img.dataset.src; delete img.dataset.src; });
        return;
    }
    if (_thumbObs) _thumbObs.disconnect();
    _thumbObs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            const img = e.target;
            if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
            _thumbObs.unobserve(img);
        });
    }, { root: container, rootMargin: '50px', threshold: 0 });
    container.querySelectorAll('img[data-src]').forEach(img => _thumbObs.observe(img));
}

// ── Abre iframe de vídeo (YouTube/terceiros) ──
function _openVideoIframe(mainWrap, mainImg, src, ytId) {
    if (mainImg) mainImg.style.display = 'none';
    const embedSrc = getYouTubeEmbedUrl(src) || src;
    const iframe = document.createElement('iframe');
    iframe.className = 'modal-video-embed';
    iframe.setAttribute('title', 'YouTube');
    iframe.allow = 'accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;fullscreen';
    iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:16px;display:block;background:#000;';
    mainWrap.appendChild(iframe);
    iframe.src = embedSrc;
    const handler = e => { try { const d = JSON.parse(e.data); if (d.event === 'onError') showVideoFallback(mainWrap, iframe, src, ytId); } catch { } };
    window.addEventListener('message', handler);
    iframe._vfh = handler;
}

function _openVimeoIframe(mainWrap, mainImg, vimeoId) {
    if (mainImg) mainImg.style.display = 'none';
    const iframe = document.createElement('iframe');
    iframe.className = 'modal-video-embed';
    iframe.setAttribute('title', 'Vimeo');
    iframe.allow = 'autoplay;fullscreen;picture-in-picture';
    iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:16px;display:block;background:#000;';
    mainWrap.appendChild(iframe);
    iframe.src = `https://player.vimeo.com/video/${vimeoId}?autoplay=1&badge=0&autopause=0`;
}

function _openDailymotionIframe(mainWrap, mainImg, dmId) {
    if (mainImg) mainImg.style.display = 'none';
    const iframe = document.createElement('iframe');
    iframe.className = 'modal-video-embed';
    iframe.setAttribute('title', 'Dailymotion');
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:16px;display:block;background:#000;';
    mainWrap.appendChild(iframe);
    iframe.src = `https://www.dailymotion.com/embed/video/${dmId}?autoplay=1`;
}

function _openGenericEmbedIframe(mainWrap, mainImg, embedSrc) {
    if (mainImg) mainImg.style.display = 'none';
    const iframe = document.createElement('iframe');
    iframe.className = 'modal-video-embed';
    iframe.setAttribute('title', 'Vídeo');
    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:16px;display:block;background:#000;';
    mainWrap.appendChild(iframe);
    iframe.src = embedSrc;
}

// ── Cria <video> nativo — download leve até o play; sem preload=auto em arquivos grandes ──
function _openVideoNative(mainWrap, mainImg, src) {
    if (mainImg) mainImg.style.display = 'none';

    const spinner = document.createElement('div');
    spinner.className = 'lb-video-spinner';
    spinner.innerHTML = `<div class="lb-spinner-ring"></div>
        <div style="margin-top:.6rem;width:140px;height:3px;background:rgba(255,255,255,.12);border-radius:99px;overflow:hidden;">
        <div class="_lb_buf" style="height:100%;width:0%;background:var(--primary);transition:width .25s;"></div></div>
        <span style="font-size:.72rem;color:rgba(255,255,255,.45);margin-top:.35rem;">Carregando vídeo…</span>`;
    mainWrap.appendChild(spinner);

    const video = document.createElement('video');
    video.className = 'lb-modal-video';
    video.controls = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'metadata';
    video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;border-radius:16px;background:#000;';

    const bufBar = spinner.querySelector('._lb_buf');
    video.addEventListener('progress', () => {
        try {
            if (video.buffered.length && video.duration && bufBar) {
                const pct = Math.min(100, (video.buffered.end(0) / video.duration) * 100);
                bufBar.style.width = pct + '%';
            }
        } catch { }
    });

    video.addEventListener('canplay', () => {
        spinner.remove();
        video.play().catch(() => { });
    }, { once: true });

    video.addEventListener('error', () => {
        spinner.remove();
        video.remove();
        const fb = document.createElement('div');
        fb.className = 'lb-video-ph';
        fb.innerHTML = `
            <div class="lb-play-wrap" style="background:rgba(239,68,68,.2);border-color:rgba(239,68,68,.4);">
                <i class="fas fa-exclamation-triangle" style="color:#ef4444;font-size:1.3rem;"></i>
            </div>
            <span class="lb-play-label">Não foi possível reproduzir nesta página</span>
            <p style="font-size:.72rem;color:rgba(255,255,255,.45);text-align:center;max-width:260px;margin:.3rem 0 0;">
                Verifique se o link é um arquivo .mp4/.webm direto (HTTPS) ou abra no site de origem.
            </p>
            <button type="button" class="_lb_open_ext_vid" style="margin-top:.5rem;background:var(--primary);border:none;color:#fff;
                padding:.45rem 1.1rem;border-radius:8px;cursor:pointer;font-size:.82rem;font-family:inherit;">
                <i class="fas fa-external-link-alt"></i> Abrir vídeo em nova aba
            </button>`;
        mainWrap.appendChild(fb);
        fb.querySelector('._lb_open_ext_vid').onclick = () => window.open(src, '_blank', 'noopener');
    });

    mainWrap.appendChild(video);
    video.src = src;
}

function showVideoFallback(mainWrap, iframe, src, ytId) {
    if (mainWrap.querySelector('.video-embed-fallback')) return;
    iframe.style.display = 'none';
    const div = document.createElement('div');
    div.className = 'video-embed-fallback';
    div.onclick = () => window.open(src, '_blank', 'noopener');
    const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '';
    div.innerHTML = thumb
        ? `<img src="${thumb}" class="vef-thumb" alt=""><div class="vef-play"><i class="fab fa-youtube"></i></div>`
        : `<div class="vef-icon"><i class="fab fa-youtube"></i></div>`;
    mainWrap.appendChild(div);
}

function prevPhoto() {
    const vc = currentImovelVideo ? currentImovelVideo.length : 0;
    const total = currentImovelFotos.length + vc;
    if (!total) return;
    currentPhotoIndex = (currentPhotoIndex - 1 + total) % total;
    renderModalPhotos();
}
function nextPhoto() {
    const vc = currentImovelVideo ? currentImovelVideo.length : 0;
    const total = currentImovelFotos.length + vc;
    if (!total) return;
    currentPhotoIndex = (currentPhotoIndex + 1) % total;
    renderModalPhotos();
}

// ══════════════════════════════════════════════════════════
//  LIGHTBOX
// ══════════════════════════════════════════════════════════
function openLightbox(fotoIdx) {
    lightboxIndex = Math.max(0, Math.min(fotoIdx, currentImovelFotos.length - 1));
    let lb = safeEl('lightbox-overlay');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'lightbox-overlay';
        lb.innerHTML = `<button class="lb-close" onclick="closeLightbox()"><i class="fas fa-times"></i></button>
            <button class="lb-prev" onclick="lbPrev()"><i class="fas fa-chevron-left"></i></button>
            <button class="lb-next" onclick="lbNext()"><i class="fas fa-chevron-right"></i></button>
            <img id="lb-img" src="" alt="Foto ampliada">
            <div id="lb-counter" class="lb-counter"></div>`;
        lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
        document.body.appendChild(lb);
    }
    _renderLb();
    lb.classList.add('active');
}
function _renderLb() {
    const img = safeEl('lb-img');
    const ctr = safeEl('lb-counter');
    if (img) { img.src = currentImovelFotos[lightboxIndex] || ''; img.onerror = function () { this.src = 'https://via.placeholder.com/1200x800/1a1a2e/fff?text=Imóvel'; }; }
    if (ctr) ctr.textContent = `${lightboxIndex + 1} / ${currentImovelFotos.length}`;
}
function closeLightbox() { const lb = safeEl('lightbox-overlay'); if (lb) lb.classList.remove('active'); }
function lbPrev() { lightboxIndex = (lightboxIndex - 1 + currentImovelFotos.length) % currentImovelFotos.length; _renderLb(); }
function lbNext() { lightboxIndex = (lightboxIndex + 1) % currentImovelFotos.length; _renderLb(); }

// ══════════════════════════════════════════════════════════
//  CONFIG DO SITE
// ══════════════════════════════════════════════════════════
function loadSiteConfig() {
    const hasHero = !!safeEl('cfg-hero-title');
    if (!hasHero) return;
    db.collection('config').doc('site').get().then(doc => {
        if (!doc.exists) return;
        const cfg = doc.data();
        const foto = safeEl('cfg-foto'); if (foto && cfg.fotoPerfil) foto.src = cfg.fotoPerfil;
        const title = safeEl('cfg-hero-title');
        if (title && cfg.heroTitulo) {
            const words = cfg.heroTitulo.trim().split(' ');
            const a = Math.ceil(words.length / 3);
            title.innerHTML = `<span class="title-line">${words.slice(0, a).join(' ')}</span>
                <span class="title-line gradient-text">${words.slice(a, a * 2).join(' ')}</span>
                <span class="title-line">${words.slice(a * 2).join(' ')}</span>`;
        }
        const desc = safeEl('cfg-hero-desc'); if (desc && cfg.heroDesc) desc.textContent = cfg.heroDesc;
        ['anos:anosExperiencia', 'imoveis-neg:imoveisNegociados', 'satisfacao:satisfacao'].forEach(pair => {
            const [id, key] = pair.split(':');
            const el = safeEl('cfg-' + id); if (el && cfg[key]) { el.setAttribute('data-target', cfg[key]); el.textContent = '0'; }
        });
        const velD = safeEl('cfg-velocidade-d'); if (velD && cfg.velocidade) velD.textContent = cfg.velocidade;
        const velM = safeEl('cfg-velocidade-m'); if (velM && cfg.velocidade) velM.textContent = cfg.velocidade;
        const depTrack = safeEl('cfg-depoimentos');
        if (depTrack && cfg.depoimentos?.length) {
            let list = cfg.depoimentos;
            if (list.length === 1) {
                list = [list[0], list[0]];
            }
            depTrack.innerHTML = list.map(d => `
                <div class="testimonial-card">
                    <div class="testimonial-quote">"</div>
                    <p class="testimonial-text">${escapeHtml(d.texto || '')}</p>
                    <div class="testimonial-author"><span>${escapeHtml(d.autor || '')}</span><span class="author-location">• ${escapeHtml(d.local || '')}</span></div>
                </div>`).join('');
            const dots = document.querySelector('.carousel-dots');
            if (dots) {
                dots.setAttribute('role', 'tablist');
                dots.setAttribute('aria-label', 'Navegação dos depoimentos');
                dots.innerHTML = list.map((_, i) =>
                    `<button type="button" class="dot${i === 0 ? ' active' : ''}" role="tab" aria-selected="${i === 0 ? 'true' : 'false'}" aria-label="Depoimento ${i + 1}"></button>`
                ).join('');
            }
            if (window._carousel) { window._carousel.destroy(); }
            window._carousel = new TestimonialsCarousel();
        }
        const bairrosTrack = safeEl('cfg-bairros-track');
        if (bairrosTrack && cfg.bairros) {
            let lista = [];
            if (Array.isArray(cfg.bairros)) {
                lista = cfg.bairros.map(b => String(b).trim()).filter(Boolean);
            } else if (typeof cfg.bairros === 'string') {
                lista = cfg.bairros.split(',').map(b => b.trim()).filter(Boolean);
            }
            if (lista.length) {
                const items = lista.map(b => `<span>${escapeHtml(b)}</span><span class="separator">✦</span>`).join('');
                bairrosTrack.innerHTML = items + items;
            }
        }
    }).catch(() => { });
}

// ══════════════════════════════════════════════════════════
//  CARROSSEL DE DEPOIMENTOS
// ══════════════════════════════════════════════════════════
class TestimonialsCarousel {
    constructor() {
        this.idx = 0;
        this.track = document.querySelector('.testimonial-track');
        if (!this.track) return;
        const cards = this.track.querySelectorAll('.testimonial-card');
        if (cards.length === 1) {
            this.track.appendChild(cards[0].cloneNode(true));
            const dotsWrap = document.querySelector('.carousel-dots');
            if (dotsWrap) {
                dotsWrap.setAttribute('role', 'tablist');
                dotsWrap.setAttribute('aria-label', 'Navegação dos depoimentos');
                dotsWrap.innerHTML = '<button type="button" class="dot active" role="tab" aria-selected="true" aria-label="Depoimento 1"></button><button type="button" class="dot" role="tab" aria-selected="false" aria-label="Depoimento 2"></button>';
            }
        }
        this.total = this.track.querySelectorAll('.testimonial-card').length;
        this.timer = null;
        this.dots = document.querySelectorAll('.dot');
        if (!this.dots.length) return;
        this.bindEvents();
        this.autoPlay();
        this.updateDots();
        this._announceSlide(0);
    }
    _announceSlide(i) {
        const live = document.getElementById('testimonial-live');
        if (!live || !this.track) return;
        const cards = this.track.querySelectorAll('.testimonial-card');
        const c = cards[i];
        if (!c) return;
        const txt = (c.querySelector('.testimonial-text')?.textContent || '').replace(/\s+/g, ' ').trim();
        const who = c.querySelector('.testimonial-author span')?.textContent || '';
        live.textContent = who ? `${txt.slice(0, 220)} — ${who}` : txt.slice(0, 240);
    }
    goto(i) {
        this.idx = i;
        this.track.style.transform = `translateX(-${i * 100}%)`;
        this.updateDots();
        this._announceSlide(i);
    }
    updateDots() {
        this.dots.forEach((d, i) => {
            const on = i === this.idx;
            d.classList.toggle('active', on);
            d.setAttribute('aria-selected', on ? 'true' : 'false');
        });
    }
    autoPlay() {
        if (this.timer || this.total <= 1) return;
        this.timer = setInterval(() => { this.idx = (this.idx + 1) % this.total; this.goto(this.idx); }, 5000);
    }
    stopPlay() { clearInterval(this.timer); this.timer = null; }
    bindEvents() {
        this.dots.forEach((dot, i) => dot.addEventListener('click', () => { this.stopPlay(); this.goto(i); this.autoPlay(); }));
        const c = document.querySelector('.testimonials-carousel');
        if (c) {
            c.addEventListener('mouseenter', () => this.stopPlay());
            c.addEventListener('mouseleave', () => this.autoPlay());
            let tx = 0;
            c.addEventListener('touchstart', e => { tx = e.changedTouches[0].screenX; this.stopPlay(); }, { passive: true });
            c.addEventListener('touchend', e => { const dx = tx - e.changedTouches[0].screenX; if (Math.abs(dx) > 50) this.goto(dx > 0 ? (this.idx + 1) % this.total : (this.idx - 1 + this.total) % this.total); this.autoPlay(); }, { passive: true });
        }
    }
    destroy() { this.stopPlay(); }
}

// ══════════════════════════════════════════════════════════
//  SETUP MENU MOBILE
// ══════════════════════════════════════════════════════════
function setupMobileMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const ul = document.querySelector('nav ul');
    if (!toggle || !ul) return;
    const openClose = () => {
        toggle.classList.toggle('active');
        ul.classList.toggle('active');
        const spans = toggle.querySelectorAll('span');
        if (toggle.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(8px,8px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(8px,-8px)';
        } else {
            spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
        }
    };
    toggle.addEventListener('click', openClose);
    toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openClose(); }
    });
    ul.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        toggle.classList.remove('active');
        ul.classList.remove('active');
        toggle.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }));
}

// ══════════════════════════════════════════════════════════
//  CONTADORES HERO ANIMADOS
// ══════════════════════════════════════════════════════════
function setupCounters() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const target = parseInt(el.getAttribute('data-target'));
            if (isNaN(target)) return;
            let current = 0;
            const inc = target / 50;
            const tick = () => {
                if (current < target) { current += inc; el.textContent = Math.ceil(current); requestAnimationFrame(tick); }
                else {
                    el.textContent = target + (el.id === 'cfg-satisfacao' ? '%' : '+');
                }
            };
            tick();
            obs.unobserve(el);
        });
    }, { threshold: .5 });
    document.querySelectorAll('.trust-number').forEach(el => obs.observe(el));
}

// ══════════════════════════════════════════════════════════
//  PARALLAX / PARTÍCULAS
// ══════════════════════════════════════════════════════════
function setupParallax() {
    document.addEventListener('mousemove', e => {
        const sphere = document.querySelector('.gradient-sphere');
        if (!sphere) return;
        const mx = (e.clientX - window.innerWidth / 2) * .01;
        const my = (e.clientY - window.innerHeight / 2) * .01;
        sphere.style.transform = `translate(calc(-50% + ${mx}px), calc(-50% + ${my}px)) scale(1.2)`;
    });
}

// ══════════════════════════════════════════════════════════
//  SCROLL TO TOP
// ══════════════════════════════════════════════════════════
function setupScrollToTop() {
    const btn = safeEl('scroll-top-btn');
    if (!btn) return;
    window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400), { passive: true });
}

// ══════════════════════════════════════════════════════════
//  SCHEMA ORG
// ══════════════════════════════════════════════════════════
function injectSchemaOrg(imo) {
    const ex = safeEl('schema-imovel'); if (ex) ex.remove();
    const s = document.createElement('script');
    s.type = 'application/ld+json'; s.id = 'schema-imovel';
    s.textContent = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'RealEstateListing',
        name: imo.titulo, description: imo.descricao, image: imo.imagem,
        offers: {
            '@type': 'Offer', price: imo.preco, priceCurrency: 'BRL',
            availability: (imo.status === 'vendido' || imo.status === 'alugado')
                ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock'
        },
        address: { '@type': 'PostalAddress', addressLocality: imo.bairro, addressRegion: 'RJ', addressCountry: 'BR' },
        numberOfRooms: imo.quartos,
        floorSize: { '@type': 'QuantitativeValue', value: imo.area, unitCode: 'MTK' }
    });
    document.head.appendChild(s);
}

// ══════════════════════════════════════════════════════════
//  BANNER PROMOCIONAL DINÂMICO
// ══════════════════════════════════════════════════════════
function loadPromoBanner() {
    const container = safeEl('promo-banner-container');
    if (!container || !db) return;
    db.collection('config').doc('banner').get().then(doc => {
        if (!doc.exists) return;
        const cfg = doc.data();
        if (!cfg.ativo) return;
        const rawImg = String(cfg.imagemUrl || '').trim();
        const img = /^https:\/\//i.test(rawImg) ? rawImg.replace(/'/g, '') : '';
        const titulo = cfg.titulo || '';
        const sub = cfg.subtitulo || '';
        const btnTexto = cfg.btnTexto || '';
        let btnLink = String(cfg.btnLink || '').trim();
        if (btnLink && !/^https?:\/\//i.test(btnLink) && !/^[a-z0-9_.-]+\.html/i.test(btnLink) && !btnLink.startsWith('/')) btnLink = '#';
        if (!img && !titulo) return;

        container.innerHTML = `
            <div class="promo-banner" style="background:${img ? `linear-gradient(135deg,rgba(10,15,30,.78),rgba(10,15,30,.45)),url('${img}') center/cover no-repeat` : 'linear-gradient(135deg,#1a1f35,#0f1420)'};">
                <div class="promo-banner-content">
                    ${titulo ? `<h2 class="promo-banner-title">${escapeHtml(titulo)}</h2>` : ''}
                    ${sub ? `<p class="promo-banner-subtitle">${escapeHtml(sub)}</p>` : ''}
                    ${btnTexto ? `<a href="${escapeHtml(btnLink || '#')}" class="promo-banner-cta">${escapeHtml(btnTexto)} <i class="fas fa-arrow-right"></i></a>` : ''}
                </div>
                <button type="button" class="promo-banner-close" onclick="this.closest('.promo-banner').style.display='none'" aria-label="Fechar banner">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        container.style.animation = 'fadeInBanner .5s ease both';
    }).catch(() => { });
}

// ══════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    loadSiteConfig();
    loadPromoBanner();
    const hv = document.querySelector('.hero-video');
    if (hv && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        hv.pause();
        try { hv.removeAttribute('autoplay'); hv.currentTime = 0; } catch (e) { }
    }
    if (document.querySelector('.testimonials-carousel')) window._carousel = new TestimonialsCarousel();
    setupMobileMenu();
    setupParallax();
    setupCounters();
    setupScrollToTop();

    // Fade-ins
    document.querySelectorAll('.fade-in').forEach((el, i) => {
        setTimeout(() => el.style.animationPlayState = 'running', i * 150);
    });

    // Preconnects dinâmicos para domínios de imagem/vídeo
    ['https://files.catbox.moe', 'https://remax.azureedge.net', 'https://imovio.com.br',
        'https://images.unsplash.com', 'https://img.youtube.com'].forEach(domain => {
            if (document.querySelector(`link[href="${domain}"]`)) return;
            const l = document.createElement('link');
            l.rel = 'preconnect'; l.href = domain; l.crossOrigin = 'anonymous';
            document.head.appendChild(l);
        });

    // Injeta estilos do player de vídeo inline e placeholder
    if (!document.getElementById('_lb-modal-video-styles')) {
        const s = document.createElement('style');
        s.id = '_lb-modal-video-styles';
        s.textContent = `
            @keyframes _lbSpin { to { transform: rotate(360deg); } }
            .lb-video-ph {
                position:absolute;inset:0;
                display:flex;flex-direction:column;align-items:center;justify-content:center;
                gap:.9rem;background:linear-gradient(135deg,#090e18,#111827);
                border-radius:16px;cursor:pointer;user-select:none;
            }
            .lb-play-wrap {
                width:72px;height:72px;border-radius:50%;
                background:rgba(52,152,219,.18);border:2px solid rgba(52,152,219,.45);
                display:flex;align-items:center;justify-content:center;
                transition:transform .2s,background .2s,border-color .2s;
            }
            .lb-video-ph:hover .lb-play-wrap {
                transform:scale(1.1);background:rgba(52,152,219,.35);border-color:rgba(52,152,219,.8);
            }
            .lb-play-label { color:rgba(255,255,255,.45);font-size:.8rem;letter-spacing:.04em; }
            video.lb-modal-video { display:block;background:#000; }
            .lb-video-spinner {
                position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
                background:rgba(0,0,0,.55);border-radius:16px;z-index:2;pointer-events:none;
            }
            .lb-spinner-ring {
                width:36px;height:36px;border-radius:50%;
                border:3px solid rgba(255,255,255,.15);border-top-color:#3498db;
                animation:_lbSpin .7s linear infinite;
            }
            #gallery .imovel-img-wrap img { will-change:filter; }
        `;
        document.head.appendChild(s);
    }

    // Página de imóveis
    if (safeEl('gallery')) {
        carregarImoveis();

        // Eventos nos filtros extras
        ['quartos', 'preco', 'tipo', 'ordenar'].forEach(id => safeEl(id)?.addEventListener('change', aplicarFiltros));
        safeEl('mostrar-vendidos')?.addEventListener('change', () => { atualizarContadoresRegiao(); popularChipsBairros(); aplicarFiltros(); });

        // Busca com debounce
        let _bT;
        safeEl('busca-texto-top')?.addEventListener('input', () => { clearTimeout(_bT); _bT = setTimeout(aplicarFiltros, 250); });

        // URL params
        const params = new URLSearchParams(window.location.search);
        if (params.get('bairro')) { filtroState.bairro = params.get('bairro'); for (const [r, l] of Object.entries(REGIOES)) { if (l.includes(filtroState.bairro)) filtroState.region = r; } syncRegionUI(); }
        if (params.get('region')) { filtroState.region = params.get('region'); syncRegionUI(); }
        ['quartos', 'preco', 'tipo'].forEach(k => { const v = params.get(k); if (v) { const el = safeEl(k); if (el) el.value = v; } });

        try {
            const rawQ = sessionStorage.getItem('_lb_quiz_prefs');
            if (rawQ) {
                const q = JSON.parse(rawQ);
                sessionStorage.removeItem('_lb_quiz_prefs');
                if (q.region) {
                    filtroState.region = q.region;
                    filtroState.bairro = q.bairro || null;
                }
                if (q.tipo === 'Terreno') {
                    filtroState.tipo = 'Terreno';
                    safeEl('card-terrenos')?.classList.add('active');
                } else {
                    filtroState.tipo = null;
                    safeEl('card-terrenos')?.classList.remove('active');
                }
                if (q.quartos) { const el = safeEl('quartos'); if (el) el.value = q.quartos; }
                if (q.preco) { const el = safeEl('preco'); if (el) el.value = q.preco; }
                if (q.tipo) { const el = safeEl('tipo'); if (el) el.value = q.tipo; }
                if (q.busca) { const el = safeEl('busca-texto-top'); if (el) el.value = q.busca; }
                syncRegionUI();
            }
        } catch (e) { }

        // Abre modal da URL
        const imovelId = params.get('imovel');
        if (imovelId) {
            const waitAndOpen = () => {
                if (imoveisCarregados) { setTimeout(() => openModal(imovelId), 300); }
                else setTimeout(waitAndOpen, 200);
            };
            waitAndOpen();
        }
    }

    // Modal
    const modal = safeEl('imovel-modal');
    if (modal) {
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

        // Swipe down fecha modal
        let _sY = 0;
        modal.addEventListener('touchstart', e => { _sY = e.touches[0].clientY; }, { passive: true });
        modal.addEventListener('touchmove', e => {
            const dy = e.touches[0].clientY - _sY;
            const c = modal.querySelector('.modal-container');
            if (c && dy > 0) c.style.transform = `translateY(${Math.min(dy, 180)}px)`;
        }, { passive: true });
        modal.addEventListener('touchend', e => {
            const dy = e.changedTouches[0].clientY - _sY;
            const c = modal.querySelector('.modal-container');
            if (c) { c.style.transition = 'transform .25s'; c.style.transform = ''; setTimeout(() => c.style.transition = '', 250); }
            if (dy > 100) closeModal();
        }, { passive: true });

        // Swipe fotos
        const mwrap = document.querySelector('.modal-main-photo-wrap');
        if (mwrap) {
            let _mx = 0, _my = 0;
            mwrap.addEventListener('touchstart', e => { _mx = e.changedTouches[0].screenX; _my = e.changedTouches[0].screenY; }, { passive: true });
            mwrap.addEventListener('touchend', e => {
                const dx = _mx - e.changedTouches[0].screenX;
                const dy = Math.abs(_my - e.changedTouches[0].screenY);
                if (Math.abs(dx) > 40 && dy < 60) dx > 0 ? nextPhoto() : prevPhoto();
            }, { passive: true });
        }
    }

    // Teclado
    document.addEventListener('keydown', e => {
        const lb = safeEl('lightbox-overlay');
        if (lb?.classList.contains('active')) {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') lbPrev();
            if (e.key === 'ArrowRight') lbNext();
            return;
        }
        const m = safeEl('imovel-modal');
        if (!m?.classList.contains('active')) return;
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') prevPhoto();
        if (e.key === 'ArrowRight') nextPhoto();
    });

    // Pausar animações em background
    document.addEventListener('visibilitychange', () => {
        document.body.classList.toggle('page-hidden', document.hidden);
    });
});

// ══════════════════════════════════════════════════════════
//  EXPOR FUNÇÕES GLOBAIS
// ══════════════════════════════════════════════════════════
window.openModal = openModal;
window.closeModal = closeModal;
window.prevPhoto = prevPhoto;
window.nextPhoto = nextPhoto;
window.toggleFavorito = toggleFavorito;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.lbPrev = lbPrev;
window.lbNext = lbNext;
window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.toggleRegion = toggleRegion;
window.toggleTipo = toggleTipo;
window.selectBairroChip = selectBairroChip;
window.selectBairro = selectBairro;
window.showToast = showToast;
window.showNotification = showNotification;
window.getFavoritos = getFavoritos;
window.isFavorito = isFavorito;
