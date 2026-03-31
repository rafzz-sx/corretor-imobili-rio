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

// ── Config do site (cache) ─────────────────────────────────
let _siteCfg = null;
async function loadSiteCfgCached() {
    if (_siteCfg) return _siteCfg;
    try {
        const cached = sessionStorage.getItem('_lb_site_cfg');
        if (cached) _siteCfg = JSON.parse(cached);
    } catch {}
    if (_siteCfg) return _siteCfg;
    try {
        const doc = await db.collection('config').doc('site').get();
        _siteCfg = doc.exists ? (doc.data() || {}) : {};
        try { sessionStorage.setItem('_lb_site_cfg', JSON.stringify(_siteCfg)); } catch {}
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
    'zona-sul': ['Ipanema','Leblon','Copacabana','Botafogo','Flamengo'],
    'barra-recreio': [
        'Barra da Tijuca','Barra Olímpica','Recreio dos Bandeirantes',
        'Jacarepaguá','Vargem Grande','Vargem Pequena',
        'Pedra de Guaratiba','Grumari','Camorim','Taquara','Curicica',
    ],
};

// ══════════════════════════════════════════════════════════
//  UTILITÁRIOS
// ══════════════════════════════════════════════════════════
function safeEl(id) { return document.getElementById(id) || null; }
function safeText(id, v) { const el = safeEl(id); if (el) el.textContent = v; }
function safeHTML(id, v) { const el = safeEl(id); if (el) el.innerHTML = v; }
function safeAttr(id, attr, v) { const el = safeEl(id); if (el) el.setAttribute(attr, v); }

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
    const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle', 'favorito-toast':'fa-heart' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type]||icons.success}"></i><span>${message}</span>`;
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
    const colors = { blue:'var(--primary)', green:'#22c55e', amber:'#f59e0b', red:'#ef4444', purple:'#a855f7' };
    const c = colors[color] || colors.blue;

    let el = document.getElementById('_realtime-notif');
    if (!el) {
        el = document.createElement('div');
        el.id = '_realtime-notif';
        Object.assign(el.style, {
            position:'fixed', bottom:'5.5rem', right:'1.5rem', zIndex:'9999',
            minWidth:'260px', maxWidth:'320px',
            background:'var(--bg-card, #111)', borderRadius:'14px',
            padding:'.9rem 1.1rem',
            boxShadow:'0 8px 32px rgba(0,0,0,.6)',
            display:'flex', gap:'.75rem', alignItems:'flex-start',
            transform:'translateX(calc(100% + 2.5rem))',
            transition:'transform .35s cubic-bezier(.22,1,.36,1)',
            willChange:'transform',
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
function getFavoritos() { try { return JSON.parse(localStorage.getItem(FAVORITOS_KEY)||'[]'); } catch { return []; } }
function saveFavoritos(f) { try { localStorage.setItem(FAVORITOS_KEY, JSON.stringify(f)); } catch {} }
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

function startImoveisListener() {
    if (_imoveisUnsubscribe) return;
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

        // Notifica mudanças após carregamento inicial
        if (imoveisCarregados) {
            snap.docChanges().forEach(change => {
                if (change.type === 'added')    showNotification('🏠 Novo imóvel!', change.doc.data().titulo || '', 'green');
                if (change.type === 'modified') showNotification('✏️ Imóvel atualizado', change.doc.data().titulo || '', 'amber');
                if (change.type === 'removed')  showNotification('🗑️ Imóvel removido', change.doc.data().titulo || '', 'red');
            });
        }

        imoveis = novos.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
        imoveisCarregados = true;
        atualizarContadoresRegiao();
        popularChipsBairros();
        aplicarFiltros();
        hideSkeleton();
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
        { id:'1', bairro:'Ipanema', quartos:2, preco:850000, area:80, vagas:1, condominio:850, iptu:350, tipo:'Apartamento', status:'disponivel', titulo:'Apartamento Moderno em Ipanema', descricao:'Lindo apartamento com 2 quartos a poucos passos da praia. Totalmente reformado com acabamentos de alto padrão.', imagem:'https://remax.azureedge.net/userimages/60/LargeWM/L_b74eaab9-55e3-43c2-8814-06f6152a1f05.jpg', fotos:['https://remax.azureedge.net/userimages/60/LargeWM/L_b74eaab9-55e3-43c2-8814-06f6152a1f05.jpg','https://files.catbox.moe/ihe3p5.png','https://files.catbox.moe/ta8pp6.png'], createdAt:{seconds:Date.now()/1000} },
        { id:'2', bairro:'Barra da Tijuca', quartos:3, preco:1200000, area:140, vagas:2, condominio:1200, iptu:500, tipo:'Cobertura', status:'disponivel', titulo:'Cobertura na Barra da Tijuca', descricao:'Cobertura ampla com 3 quartos, piscina privativa e acabamentos de altíssimo padrão com vista deslumbrante.', imagem:'https://imovio.com.br/wp-content/uploads/2023/02/3478296843.jpg', fotos:['https://imovio.com.br/wp-content/uploads/2023/02/3478296843.jpg','https://files.catbox.moe/o4xhj9.png'], createdAt:{seconds:Date.now()/1000-100} },
        { id:'3', bairro:'Recreio dos Bandeirantes', quartos:2, preco:520000, area:70, vagas:1, condominio:600, iptu:250, tipo:'Apartamento', status:'vendido', titulo:'Apartamento no Recreio', descricao:'Apartamento compacto e moderno no Recreio, próximo à praia e comércios locais.', imagem:'https://files.catbox.moe/ihe3p5.png', fotos:['https://files.catbox.moe/ihe3p5.png'], createdAt:{seconds:Date.now()/1000-200} },
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
            `<span class="rc-chip" data-bairro="${b}" onclick="selectBairroChip(event,'${b.replace(/'/g,"\\'")}')">
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
    ['zona-sul','barra-recreio'].forEach(reg => {
        const container = safeEl('chips-' + reg);
        if (!container) return;
        container.querySelectorAll('.rc-chip').forEach(chip => {
            const bairroNome = chip.dataset.bairro;
            if (!bairroNome) return;
            const n = lista.filter(i => i.bairro === bairroNome).length;
            chip.title = `${n} imóve${n!==1?'is':'l'}`;
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
    lista.forEach(i => { if (i.bairro) contagem[i.bairro] = (contagem[i.bairro]||0)+1; });

    const bairros = Object.entries(contagem).sort((a,b) => b[1]-a[1]);

    row.innerHTML = bairros.map(([b, n]) => `
        <span class="bchip ${filtroState.bairro === b ? 'ativo' : ''}" 
              onclick="selectBairro('${b.replace(/'/g,"\\'")}')">
            ${b} <span class="bchip-count">${n}</span>
        </span>
    `).join('');
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
    ['zona-sul','barra-recreio'].forEach(reg => {
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

    // Chips diretos
    document.querySelectorAll('.bchip').forEach(chip => {
        chip.classList.toggle('ativo', chip.textContent.trim().replace(/\d+/g,'').trim() === filtroState.bairro);
    });
}

// ══════════════════════════════════════════════════════════
//  FILTROS GERAIS
// ══════════════════════════════════════════════════════════
function ordenarImoveis(lista, criterio) {
    const c = [...lista];
    switch (criterio) {
        case 'destaque':    return c.sort((a,b) => (b.destaque?1:0)-(a.destaque?1:0));
        case 'recentes':    return c.sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
        case 'menor-preco': return c.sort((a,b) => parseFloat(a.preco||0)-parseFloat(b.preco||0));
        case 'maior-preco': return c.sort((a,b) => parseFloat(b.preco||0)-parseFloat(a.preco||0));
        case 'maior-area':  return c.sort((a,b) => parseFloat(b.area||0)-parseFloat(a.area||0));
        default:            return c;
    }
}

function aplicarFiltros() {
    const quartos = safeEl('quartos')?.value || '';
    const preco   = safeEl('preco')?.value || '';
    // tipo: usa o select OU o filtroState.tipo (card terrenos) — select tem precedência se preenchido
    const tipoSelect = safeEl('tipo')?.value || '';
    const tipoFiltro = tipoSelect || filtroState.tipo || '';
    const ordem   = safeEl('ordenar')?.value || 'destaque';
    const vendidos= safeEl('mostrar-vendidos')?.checked;
    const busca   = (safeEl('busca-texto-top')?.value || '').toLowerCase().trim();

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
        const matchB = !busca || [imo.titulo,imo.bairro,imo.descricao,imo.tipo].some(v=>(v||'').toLowerCase().includes(busca));

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
        ['quartos','preco','tipo'].forEach(k => {
            const v = safeEl(k)?.value;
            if (v) url.searchParams.set(k, v);
            else url.searchParams.delete(k);
        });
        history.replaceState(null, '', url.toString());
    } catch {}

    renderGallery(filtrados);
    popularChipsBairros();
    atualizarContadoresRegiao();
}

function limparFiltros() {
    filtroState.region = null;
    filtroState.bairro = null;
    filtroState.tipo = null;
    ['quartos','preco','tipo'].forEach(id => { const el = safeEl(id); if (el) el.value = ''; });
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
            if (imo.frente) detailTags += `<span class="detail-tag"><i class="fas fa-arrows-alt-h"></i> ${imo.frente}m frente</span>`;
            if (imo.zoneamento) detailTags += `<span class="detail-tag"><i class="fas fa-layer-group"></i> ${imo.zoneamento}</span>`;
            if (imo.topografia) detailTags += `<span class="detail-tag"><i class="fas fa-mountain"></i> ${imo.topografia}</span>`;
            if (imo.localidade) detailTags += `<span class="detail-tag"><i class="fas fa-map-pin"></i> ${imo.localidade}</span>`;
        } else {
            if (imo.quartos) detailTags += `<span class="detail-tag"><i class="fas fa-bed"></i> ${imo.quartos} qto${imo.quartos > 1 ? 's' : ''}</span>`;
            if (imo.vagas) detailTags += `<span class="detail-tag"><i class="fas fa-car"></i> ${imo.vagas}</span>`;
        }
        if (imo.tipo) detailTags += `<span class="detail-tag">${imo.tipo}</span>`;

        return `
            <div class="imovel" onclick="openModal('${imo.id}')">
                <div class="imovel-img-wrap">
                    <img src="${imo.imagem}" alt="${imo.titulo}" loading="lazy"
                         onerror="this.src='https://via.placeholder.com/400x300/1a1a2e/fff?text=${isTerreno?'Terreno':'Imóvel'}'">
                    <button class="favorito-btn ${isFav?'favorito-ativo':''}"
                            data-id="${imo.id}"
                            onclick="toggleFavorito('${imo.id}', event)">
                        <i class="${isFav?'fas':'far'} fa-heart"></i>
                    </button>
                    <div class="imovel-badge">${imo.bairro}</div>
                    ${imo.destaque ? '<div class="imovel-destaque-badge"><i class="fas fa-star"></i> Destaque</div>' : ''}
                    <div class="imovel-fotos-count">
                        <i class="fas fa-images"></i> ${imo.fotos ? imo.fotos.length : 1} foto${(imo.fotos?.length||1) > 1 ? 's' : ''}
                    </div>
                    ${statusBadge}
                </div>
                <div class="imovel-content">
                    <h3>${imo.titulo}</h3>
                    <div class="imovel-details-row">${detailTags}</div>
                    <p class="imovel-preco">${precoLabel}</p>
                    ${(!isTerreno && imo.condominio) ? `<p class="imovel-condominio"><small>Cond. R$ ${imo.condominio.toLocaleString('pt-BR')}/mês</small></p>` : ''}
                    ${(isTerreno && imo.iptu) ? `<p class="imovel-condominio"><small>IPTU R$ ${imo.iptu.toLocaleString('pt-BR')}/ano</small></p>` : ''}
                    <p class="imovel-desc">${imo.descricao}</p>
                    <button class="btn-saiba-mais" onclick="openModal('${imo.id}');event.stopPropagation()">
                        <span>Saiba Mais</span><i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>`;
    }).join('');
}

// ══════════════════════════════════════════════════════════
//  SKELETON
// ══════════════════════════════════════════════════════════
function hideSkeleton() {
    const skel = safeEl('gallery-skeleton');
    const gal  = safeEl('gallery');
    if (skel) skel.style.display = 'none';
    if (gal)  gal.style.display = '';
}

// ══════════════════════════════════════════════════════════
//  MODAL SAIBA MAIS
// ══════════════════════════════════════════════════════════
let currentPhotoIndex = 0;
let currentImovelFotos = [];
let currentImovelVideo = null;
let currentImovel = null;
let lightboxIndex = 0;

function openModal(imovelId) {
    const imo = imoveis.find(i => String(i.id) === String(imovelId));
    if (!imo) return;

    currentImovel = imo;
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
        let html = `<span class="modal-tag"><i class="fas fa-map-marker-alt"></i> ${imo.bairro}</span>`;
        html += `<span class="modal-tag"><i class="fas fa-ruler-combined"></i> ${imo.area} m²</span>`;
        if (isLancamento) {
            const ap = imo?.lancamento?.aPartirDe ? `R$ ${Number(imo.lancamento.aPartirDe).toLocaleString('pt-BR')}` : null;
            const en = imo?.lancamento?.entrada   ? `R$ ${Number(imo.lancamento.entrada).toLocaleString('pt-BR')}`   : null;
            const pa = imo?.lancamento?.parcelas  ? String(imo.lancamento.parcelas) : null;
            html += `<span class="modal-tag" style="border-color:rgba(168,85,247,.35);color:#c084f5;">Lançamento</span>`;
            if (ap) html += `<span class="modal-tag"><i class="fas fa-tag"></i> A partir de ${ap}</span>`;
            if (en) html += `<span class="modal-tag"><i class="fas fa-coins"></i> Entrada ${en}</span>`;
            if (pa) html += `<span class="modal-tag"><i class="fas fa-list-ol"></i> ${pa}</span>`;
        }
        if (isTerreno) {
            if (imo.frente)      html += `<span class="modal-tag"><i class="fas fa-arrows-alt-h"></i> ${imo.frente}m frente</span>`;
            if (imo.zoneamento)  html += `<span class="modal-tag"><i class="fas fa-layer-group"></i> ${imo.zoneamento}</span>`;
            if (imo.topografia)  html += `<span class="modal-tag"><i class="fas fa-mountain"></i> ${imo.topografia}</span>`;
            if (imo.localidade)  html += `<span class="modal-tag"><i class="fas fa-map-pin"></i> ${imo.localidade}</span>`;
            if (imo.iptu)        html += `<span class="modal-tag"><i class="fas fa-file-invoice-dollar"></i> IPTU R$ ${Number(imo.iptu).toLocaleString('pt-BR')}/ano</span>`;
        } else {
            if (imo.quartos) html += `<span class="modal-tag"><i class="fas fa-bed"></i> ${imo.quartos} quartos</span>`;
            if (imo.vagas)   html += `<span class="modal-tag"><i class="fas fa-car"></i> ${imo.vagas} vaga${imo.vagas>1?'s':''}</span>`;
            if (imo.condominio) html += `<span class="modal-tag"><i class="fas fa-home"></i> Cond. R$ ${imo.condominio.toLocaleString('pt-BR')}</span>`;
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
        shareBtn.onclick = function() {
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

    renderModalPhotos();

    const modal = safeEl('imovel-modal');
    if (modal) { modal.classList.add('active'); document.body.classList.add('modal-open'); }

    // URL
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('imovel', imo.id);
        history.replaceState(null, '', url.toString());
        document.title = `${imo.titulo} | Leandro Bomfim`;
    } catch {}

    injectSchemaOrg(imo);
    if (typeof window.trackImovelView === 'function') window.trackImovelView(String(imo.id), imo.titulo, imo.bairro);
    if (typeof window.startImovelView === 'function') window.startImovelView(imo.id, imo.titulo);
}

function closeModal() {
    // Limpa vídeo
    const iframe = document.querySelector('iframe.modal-video-embed');
    if (iframe) { if (iframe._vfh) window.removeEventListener('message', iframe._vfh); iframe.src = ''; }
    closeLightbox();
    const modal = safeEl('imovel-modal');
    if (modal) modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    try {
        const url = new URL(window.location.href);
        url.searchParams.delete('imovel');
        history.replaceState(null, '', url.toString());
        document.title = 'Imóveis à Venda no Rio de Janeiro | Leandro Bomfim';
    } catch {}
}

// YouTube helpers
function getYouTubeId(url) {
    if (!url) return null;
    let m;
    if ((m = url.match(/shorts\/([a-zA-Z0-9_-]{11})/))) return m[1];
    if ((m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/))) return m[1];
    if ((m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/))) return m[1];
    return null;
}
function getYouTubeEmbedUrl(url) {
    const id = getYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?rel=0&playsinline=1&enablejsapi=1` : null;
}

function renderModalPhotos() {
    const mainWrap = document.querySelector('.modal-main-photo-wrap');
    const mainImg  = safeEl('modal-main-photo');
    const thumbs   = safeEl('modal-thumbs');
    const counter  = safeEl('modal-photo-counter');
    if (!mainWrap || !thumbs) return;

    const medias = [];
    if (currentImovelVideo) currentImovelVideo.forEach(v => medias.push({type:'video',src:v}));
    currentImovelFotos.forEach(f => medias.push({type:'foto',src:f}));
    if (!medias.length) return;

    const media = medias[currentPhotoIndex] || medias[0];
    if (counter) counter.textContent = `${currentPhotoIndex+1} / ${medias.length}`;

    // Limpar estado anterior
    const old = mainWrap.querySelector('iframe.modal-video-embed');
    if (old) { if (old._vfh) window.removeEventListener('message',old._vfh); old.remove(); }
    const oldF = mainWrap.querySelector('.video-embed-fallback');
    if (oldF) oldF.remove();

    if (media.type === 'video') {
        const embedSrc = getYouTubeEmbedUrl(media.src) || media.src;
        const ytId = getYouTubeId(media.src);
        const iframe = document.createElement('iframe');
        iframe.className = 'modal-video-embed';
        iframe.allow = 'accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;fullscreen';
        mainWrap.appendChild(iframe);
        iframe.src = embedSrc;
        iframe.style.display = 'block';
        if (mainImg) mainImg.style.display = 'none';
        const handler = e => { try { const d=JSON.parse(e.data); if(d.event==='onError') showVideoFallback(mainWrap,iframe,media.src,ytId); } catch{} };
        window.addEventListener('message', handler);
        iframe._vfh = handler;
    } else {
        if (mainImg) {
            mainImg.style.display = 'block';
            mainImg.src = media.src;
            mainImg.onerror = function(){this.src='https://via.placeholder.com/800x500/1a1a2e/fff?text=Imóvel';};
            const videoCount = currentImovelVideo ? currentImovelVideo.length : 0;
            const fotoIdx = currentPhotoIndex - videoCount;
            mainImg.style.cursor = 'zoom-in';
            mainImg.onclick = () => openLightbox(fotoIdx);
        }
    }

    // Thumbs
    thumbs.innerHTML = '';
    medias.forEach((m, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'modal-thumb' + (idx === currentPhotoIndex ? ' active' : '');
        if (m.type === 'video') {
            const ytId = getYouTubeId(m.src);
            thumb.innerHTML = ytId
                ? `<img src="https://img.youtube.com/vi/${ytId}/mqdefault.jpg" alt="Vídeo" style="width:100%;height:100%;object-fit:cover"><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3)"><i class="fas fa-play-circle" style="font-size:1.5rem;color:#fff"></i></div>`
                : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#111"><i class="fas fa-play-circle" style="color:var(--primary)"></i></div>';
            thumb.style.position = 'relative';
        } else {
            const img = document.createElement('img');
            img.src = m.src; img.alt = `Foto ${idx+1}`;
            img.onerror = function(){this.src='https://via.placeholder.com/150x100/1a1a2e/fff?text=Foto';};
            thumb.appendChild(img);
        }
        thumb.addEventListener('click', () => { currentPhotoIndex = idx; renderModalPhotos(); });
        thumbs.appendChild(thumb);
    });
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
    lightboxIndex = Math.max(0, Math.min(fotoIdx, currentImovelFotos.length-1));
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
    if (img) { img.src = currentImovelFotos[lightboxIndex]||''; img.onerror=function(){this.src='https://via.placeholder.com/1200x800/1a1a2e/fff?text=Imóvel';}; }
    if (ctr) ctr.textContent = `${lightboxIndex+1} / ${currentImovelFotos.length}`;
}
function closeLightbox() { const lb = safeEl('lightbox-overlay'); if (lb) lb.classList.remove('active'); }
function lbPrev() { lightboxIndex = (lightboxIndex-1+currentImovelFotos.length)%currentImovelFotos.length; _renderLb(); }
function lbNext() { lightboxIndex = (lightboxIndex+1)%currentImovelFotos.length; _renderLb(); }

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
            const a = Math.ceil(words.length/3);
            title.innerHTML = `<span class="title-line">${words.slice(0,a).join(' ')}</span>
                <span class="title-line gradient-text">${words.slice(a,a*2).join(' ')}</span>
                <span class="title-line">${words.slice(a*2).join(' ')}</span>`;
        }
        const desc = safeEl('cfg-hero-desc'); if (desc && cfg.heroDesc) desc.textContent = cfg.heroDesc;
        ['anos:anosExperiencia','imoveis-neg:imoveisNegociados','satisfacao:satisfacao'].forEach(pair => {
            const [id, key] = pair.split(':');
            const el = safeEl('cfg-'+id); if (el && cfg[key]) { el.setAttribute('data-target', cfg[key]); el.textContent = '0'; }
        });
        const velD = safeEl('cfg-velocidade-d'); if (velD && cfg.velocidade) velD.textContent = cfg.velocidade;
        const velM = safeEl('cfg-velocidade-m'); if (velM && cfg.velocidade) velM.textContent = cfg.velocidade;
        const depTrack = safeEl('cfg-depoimentos');
        if (depTrack && cfg.depoimentos?.length) {
            depTrack.innerHTML = cfg.depoimentos.map(d => `
                <div class="testimonial-card">
                    <div class="testimonial-quote">"</div>
                    <p class="testimonial-text">${d.texto||''}</p>
                    <div class="testimonial-author"><span>${d.autor||''}</span><span class="author-location">• ${d.local||''}</span></div>
                </div>`).join('');
            const dots = document.querySelector('.carousel-dots');
            if (dots) dots.innerHTML = cfg.depoimentos.map((_,i) => `<span class="dot${i===0?' active':''}"></span>`).join('');
            if (window._carousel) { window._carousel.destroy(); }
            window._carousel = new TestimonialsCarousel();
        }
        const bairrosTrack = safeEl('cfg-bairros-track');
        if (bairrosTrack && cfg.bairros) {
            const lista = cfg.bairros.split(',').map(b=>b.trim()).filter(Boolean);
            const items = lista.map(b=>`<span>${b}</span><span class="separator">✦</span>`).join('');
            bairrosTrack.innerHTML = items+items;
        }
    }).catch(()=>{});
}

// ══════════════════════════════════════════════════════════
//  CARROSSEL DE DEPOIMENTOS
// ══════════════════════════════════════════════════════════
class TestimonialsCarousel {
    constructor() {
        this.idx = 0;
        this.total = document.querySelectorAll('.testimonial-card').length;
        this.timer = null;
        this.track = document.querySelector('.testimonial-track');
        this.dots  = document.querySelectorAll('.dot');
        if (!this.track || !this.dots.length) return;
        this.bindEvents();
        this.autoPlay();
        this.updateDots();
    }
    goto(i) {
        this.idx = i;
        this.track.style.transform = `translateX(-${i*100}%)`;
        this.updateDots();
    }
    updateDots() { this.dots.forEach((d,i) => d.classList.toggle('active', i===this.idx)); }
    autoPlay() {
        if (this.timer || this.total <= 1) return;
        this.timer = setInterval(() => { this.idx=(this.idx+1)%this.total; this.goto(this.idx); }, 5000);
    }
    stopPlay() { clearInterval(this.timer); this.timer=null; }
    bindEvents() {
        this.dots.forEach((dot,i) => dot.addEventListener('click', () => { this.stopPlay(); this.goto(i); this.autoPlay(); }));
        const c = document.querySelector('.testimonials-carousel');
        if (c) {
            c.addEventListener('mouseenter', () => this.stopPlay());
            c.addEventListener('mouseleave', () => this.autoPlay());
            let tx=0;
            c.addEventListener('touchstart', e=>{tx=e.changedTouches[0].screenX;this.stopPlay();},{passive:true});
            c.addEventListener('touchend', e=>{const dx=tx-e.changedTouches[0].screenX;if(Math.abs(dx)>50)this.goto(dx>0?(this.idx+1)%this.total:(this.idx-1+this.total)%this.total);this.autoPlay();},{passive:true});
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
    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        ul.classList.toggle('active');
        const spans = toggle.querySelectorAll('span');
        if (toggle.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(8px,8px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(8px,-8px)';
        } else {
            spans.forEach(s => { s.style.transform=''; s.style.opacity=''; });
        }
    });
    ul.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        toggle.classList.remove('active');
        ul.classList.remove('active');
        toggle.querySelectorAll('span').forEach(s => { s.style.transform=''; s.style.opacity=''; });
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
            const inc = target/50;
            const tick = () => {
                if (current < target) { current+=inc; el.textContent=Math.ceil(current); requestAnimationFrame(tick); }
                else { el.textContent = target+(el.dataset.target==='100'?'%':'+'); }
            };
            tick();
            obs.unobserve(el);
        });
    }, { threshold:.5 });
    document.querySelectorAll('.trust-number').forEach(el => obs.observe(el));
}

// ══════════════════════════════════════════════════════════
//  PARALLAX / PARTÍCULAS
// ══════════════════════════════════════════════════════════
function setupParallax() {
    document.addEventListener('mousemove', e => {
        const sphere = document.querySelector('.gradient-sphere');
        if (!sphere) return;
        const mx = (e.clientX - window.innerWidth/2) * .01;
        const my = (e.clientY - window.innerHeight/2) * .01;
        sphere.style.transform = `translate(calc(-50% + ${mx}px), calc(-50% + ${my}px)) scale(1.2)`;
    });
}

// ══════════════════════════════════════════════════════════
//  SCROLL TO TOP
// ══════════════════════════════════════════════════════════
function setupScrollToTop() {
    const btn = safeEl('scroll-top-btn');
    if (!btn) return;
    window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400), { passive:true });
}

// ══════════════════════════════════════════════════════════
//  SCHEMA ORG
// ══════════════════════════════════════════════════════════
function injectSchemaOrg(imo) {
    const ex = safeEl('schema-imovel'); if (ex) ex.remove();
    const s = document.createElement('script');
    s.type = 'application/ld+json'; s.id = 'schema-imovel';
    s.textContent = JSON.stringify({
        '@context':'https://schema.org','@type':'RealEstateListing',
        name:imo.titulo, description:imo.descricao, image:imo.imagem,
        offers:{'@type':'Offer',price:imo.preco,priceCurrency:'BRL',
            availability: (imo.status==='vendido'||imo.status==='alugado')
                ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock'},
        address:{'@type':'PostalAddress',addressLocality:imo.bairro,addressRegion:'RJ',addressCountry:'BR'},
        numberOfRooms:imo.quartos,
        floorSize:{'@type':'QuantitativeValue',value:imo.area,unitCode:'MTK'}
    });
    document.head.appendChild(s);
}

// ══════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    loadSiteConfig();
    if (document.querySelector('.testimonials-carousel')) window._carousel = new TestimonialsCarousel();
    setupMobileMenu();
    setupParallax();
    setupCounters();
    setupScrollToTop();

    // Fade-ins
    document.querySelectorAll('.fade-in').forEach((el,i) => {
        setTimeout(() => el.style.animationPlayState='running', i*150);
    });

    // Página de imóveis
    if (safeEl('gallery')) {
        carregarImoveis();

        // Eventos nos filtros extras
        ['quartos','preco','tipo','ordenar'].forEach(id => safeEl(id)?.addEventListener('change', aplicarFiltros));
        safeEl('mostrar-vendidos')?.addEventListener('change', () => { atualizarContadoresRegiao(); popularChipsBairros(); aplicarFiltros(); });

        // Busca com debounce
        let _bT;
        safeEl('busca-texto-top')?.addEventListener('input', () => { clearTimeout(_bT); _bT = setTimeout(aplicarFiltros, 250); });

        // URL params
        const params = new URLSearchParams(window.location.search);
        if (params.get('bairro')) { filtroState.bairro = params.get('bairro'); for(const[r,l] of Object.entries(REGIOES)){if(l.includes(filtroState.bairro))filtroState.region=r;} syncRegionUI(); }
        if (params.get('region')) { filtroState.region = params.get('region'); syncRegionUI(); }
        ['quartos','preco','tipo'].forEach(k => { const v=params.get(k); if(v){ const el=safeEl(k); if(el) el.value=v; } });

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
        modal.addEventListener('touchstart', e => { _sY = e.touches[0].clientY; }, {passive:true});
        modal.addEventListener('touchmove', e => {
            const dy = e.touches[0].clientY - _sY;
            const c = modal.querySelector('.modal-container');
            if (c && dy > 0) c.style.transform = `translateY(${Math.min(dy,180)}px)`;
        }, {passive:true});
        modal.addEventListener('touchend', e => {
            const dy = e.changedTouches[0].clientY - _sY;
            const c = modal.querySelector('.modal-container');
            if (c) { c.style.transition = 'transform .25s'; c.style.transform = ''; setTimeout(()=>c.style.transition='',250); }
            if (dy > 100) closeModal();
        }, {passive:true});

        // Swipe fotos
        const mwrap = document.querySelector('.modal-main-photo-wrap');
        if (mwrap) {
            let _mx = 0, _my = 0;
            mwrap.addEventListener('touchstart', e => { _mx=e.changedTouches[0].screenX; _my=e.changedTouches[0].screenY; }, {passive:true});
            mwrap.addEventListener('touchend', e => {
                const dx = _mx-e.changedTouches[0].screenX;
                const dy = Math.abs(_my-e.changedTouches[0].screenY);
                if (Math.abs(dx)>40 && dy<60) dx>0?nextPhoto():prevPhoto();
            }, {passive:true});
        }
    }

    // Teclado
    document.addEventListener('keydown', e => {
        const lb = safeEl('lightbox-overlay');
        if (lb?.classList.contains('active')) {
            if (e.key==='Escape') closeLightbox();
            if (e.key==='ArrowLeft') lbPrev();
            if (e.key==='ArrowRight') lbNext();
            return;
        }
        const m = safeEl('imovel-modal');
        if (!m?.classList.contains('active')) return;
        if (e.key==='Escape') closeModal();
        if (e.key==='ArrowLeft') prevPhoto();
        if (e.key==='ArrowRight') nextPhoto();
    });

    // Pausar animações em background
    document.addEventListener('visibilitychange', () => {
        document.body.classList.toggle('page-hidden', document.hidden);
    });
});

// ══════════════════════════════════════════════════════════
//  EXPOR FUNÇÕES GLOBAIS
// ══════════════════════════════════════════════════════════
window.openModal       = openModal;
window.closeModal      = closeModal;
window.prevPhoto       = prevPhoto;
window.nextPhoto       = nextPhoto;
window.toggleFavorito  = toggleFavorito;
window.openLightbox    = openLightbox;
window.closeLightbox   = closeLightbox;
window.lbPrev          = lbPrev;
window.lbNext          = lbNext;
window.aplicarFiltros  = aplicarFiltros;
window.limparFiltros   = limparFiltros;
window.toggleRegion    = toggleRegion;
window.toggleTipo      = toggleTipo;
window.selectBairroChip= selectBairroChip;
window.selectBairro    = selectBairro;
window.showToast       = showToast;
window.showNotification= showNotification;
window.getFavoritos    = getFavoritos;
window.isFavorito      = isFavorito;
