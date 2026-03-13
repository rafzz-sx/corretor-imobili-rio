// ========== INICIALIZAR FIREBASE ==========
let db;

function initFirebase() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    console.log('🔥 Firebase inicializado no script.js');
}

initFirebase();

// ========== VARIÁVEIS GLOBAIS ==========
let imoveis = [];
let imoveisCarregados = false;
const FAVORITOS_KEY = '_lb_favoritos';

function safeId(id) {
    return document.getElementById(id) || null;
}

function safeText(id, value) {
    const el = safeId(id);
    if (el) el.textContent = value;
}

function safeHTML(id, value) {
    const el = safeId(id);
    if (el) el.innerHTML = value;
}

function safeAttr(id, attr, value) {
    const el = safeId(id);
    if (el) el.setAttribute(attr, value);
}

// Versão que aceita null sem erro
function safeOptional(id, callback) {
    const el = document.getElementById(id);
    if (el && callback) callback(el);
}
// ========== SISTEMA DE TOAST ==========
function showToast(message, type = 'success', duration = 3000) {
    // Criar container se não existir
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // Criar toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Ícone baseado no tipo
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    if (type === 'info') icon = 'fa-info-circle';
    if (type === 'favorito-toast') icon = 'fa-heart';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Remover após duration
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
            // Remover container se vazio
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, duration);
}

// ========== SISTEMA DE FAVORITOS ==========

// Buscar favoritos do localStorage
function getFavoritos() {
    try {
        const favs = localStorage.getItem(FAVORITOS_KEY);
        return favs ? JSON.parse(favs) : [];
    } catch (e) {
        console.error('Erro ao ler favoritos:', e);
        return [];
    }
}

// Salvar favoritos no localStorage
function saveFavoritos(favoritos) {
    try {
        localStorage.setItem(FAVORITOS_KEY, JSON.stringify(favoritos));
    } catch (e) {
        console.error('Erro ao salvar favoritos:', e);
    }
}

// Verificar se imóvel é favorito
function isFavorito(imovelId) {
    return getFavoritos().includes(String(imovelId));
}

// Alternar favorito
function toggleFavorito(imovelId, event) {
    // Prevenir propagação do evento se existir
    if (event) {
        event.stopPropagation();
    }
    
    const favoritos = getFavoritos();
    const id = String(imovelId);
    const index = favoritos.indexOf(id);
    
    if (index === -1) {
        favoritos.push(id);
        showToast('❤️ Imóvel adicionado aos favoritos!', 'favorito-toast');
        
        // Rastrear evento de favorito
        if (typeof window.trackEvent === 'function') {
            window.trackEvent('favorito_adicionado', { imovelId: id });
        }
    } else {
        favoritos.splice(index, 1);
        showToast('🗑️ Imóvel removido dos favoritos', 'info');
        
        // Rastrear evento de remoção
        if (typeof window.trackEvent === 'function') {
            window.trackEvent('favorito_removido', { imovelId: id });
        }
    }
    
    saveFavoritos(favoritos);
    updateFavoritoButton(imovelId);
    return favoritos.includes(id);
}

// Atualizar UI do botão de favorito
function updateFavoritoButton(imovelId) {
    const btn = document.querySelector(`.favorito-btn[data-id="${imovelId}"]`);
    if (btn) {
        const isFav = isFavorito(imovelId);
        btn.innerHTML = isFav ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
        btn.classList.toggle('favorito-ativo', isFav);
    }
}

// Limpar todos os favoritos
function limparTodosFavoritos() {
    if (getFavoritos().length === 0) {
        showToast('Nenhum favorito para limpar', 'info');
        return;
    }
    
    if (confirm('Tem certeza que deseja remover todos os favoritos?')) {
        localStorage.removeItem(FAVORITOS_KEY);
        showToast('🗑️ Todos os favoritos foram removidos', 'info');
        
        // Atualizar todos os botões na página atual
        document.querySelectorAll('.favorito-btn').forEach(btn => {
            const id = btn.getAttribute('data-id');
            btn.innerHTML = '<i class="far fa-heart"></i>';
            btn.classList.remove('favorito-ativo');
        });
        
        // Se estiver na página de favoritos, recarregar
        if (window.location.pathname.includes('favoritos.html')) {
            carregarFavoritos();
        }
    }
}

// ========== CARREGAR IMÓVEIS DO FIREBASE (SEM ÍNDICE) ==========
async function carregarImoveis() {
    try {
        const gallery = document.getElementById('gallery');
        if (!gallery) return;

        // Skeleton loading
        gallery.innerHTML = Array(6).fill(0).map(() => `
            <div class="imovel skeleton-card">
                <div class="skeleton-img"></div>
                <div class="imovel-content">
                    <div class="skeleton-line w80"></div>
                    <div class="skeleton-line w50" style="margin-top:.5rem"></div>
                    <div class="skeleton-line w40" style="margin-top:.5rem"></div>
                    <div class="skeleton-line w60" style="margin-top:.5rem"></div>
                    <div class="skeleton-btn"></div>
                </div>
            </div>`).join('');

        // Buscar sem ordenação (não precisa de índice)
        const snapshot = await db.collection('imoveis').get();
        
        // Mapear imóveis e ordenar no JavaScript
        imoveis = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                status: data.status || 'disponivel',
                tipo: data.tipo || 'Apartamento',
                vagas: data.vagas || 0,
                condominio: data.condominio || 0,
                iptu: data.iptu || 0,
                // Garantir que createdAt existe para ordenação
                createdAt: data.createdAt || { seconds: 0 }
            };
        });

        // Ordenar no JavaScript por createdAt (mais recentes primeiro)
        imoveis.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });

        console.log(`📊 Total de imóveis carregados: ${imoveis.length}`);
        console.log('🏠 Imóveis:', imoveis.map(i => ({ titulo: i.titulo, status: i.status })));

        imoveisCarregados = true;
        popularFiltros(imoveis);
        aplicarFiltros();
        
        return imoveis;

    } catch (error) {
        console.error('❌ Erro ao carregar imóveis:', error);
        showToast('Erro ao carregar imóveis. Usando dados locais.', 'error');
        carregarImoveisEstaticos();
    }
}

// ========== DADOS ESTÁTICOS DE FALLBACK ==========
function carregarImoveisEstaticos() {
    imoveis = [
        {
            id: '1',
            bairro: 'Ipanema',
            quartos: 2,
            preco: 850000,
            area: 80,
            vagas: 1,
            condominio: 850,
            iptu: 350,
            tipo: 'Apartamento',
            status: 'disponivel',
            titulo: 'Apartamento Moderno em Ipanema',
            descricao: 'Lindo apartamento com 2 quartos a poucos passos da praia. Totalmente reformado com acabamentos de alto padrão.',
            imagem: 'https://remax.azureedge.net/userimages/60/LargeWM/L_b74eaab9-55e3-43c2-8814-06f6152a1f05.jpg',
            fotos: [
                'https://remax.azureedge.net/userimages/60/LargeWM/L_b74eaab9-55e3-43c2-8814-06f6152a1f05.jpg',
                'https://files.catbox.moe/ihe3p5.png',
                'https://files.catbox.moe/ta8pp6.png',
                'https://files.catbox.moe/0tg1le.png'
            ]
        },
        {
            id: '2',
            bairro: 'Barra da Tijuca',
            quartos: 3,
            preco: 1200000,
            area: 140,
            vagas: 2,
            condominio: 1200,
            iptu: 500,
            tipo: 'Cobertura',
            status: 'disponivel',
            titulo: 'Cobertura na Barra da Tijuca',
            descricao: 'Cobertura ampla com 3 quartos, piscina privativa e acabamentos de altíssimo padrão com vista deslumbrante.',
            imagem: 'https://imovio.com.br/wp-content/uploads/2023/02/3478296843.jpg',
            fotos: [
                'https://imovio.com.br/wp-content/uploads/2023/02/3478296843.jpg',
                'https://files.catbox.moe/o4xhj9.png',
                'https://files.catbox.moe/ta8pp6.png',
                'https://files.catbox.moe/ihe3p5.png'
            ]
        },
        {
            id: '3',
            bairro: 'Recreio dos Bandeirantes',
            quartos: 2,
            preco: 520000,
            area: 70,
            vagas: 1,
            condominio: 600,
            iptu: 250,
            tipo: 'Apartamento',
            status: 'vendido',
            titulo: 'Apartamento Moderno no Recreio',
            descricao: 'Apartamento compacto e moderno no Recreio, próximo à praia e comércios locais.',
            imagem: 'https://files.catbox.moe/ihe3p5.png',
            fotos: [
                'https://files.catbox.moe/ihe3p5.png',
                'https://files.catbox.moe/0tg1le.png'
            ]
        }
    ];
    
    popularFiltros(imoveis);
    aplicarFiltros();
    
    showToast('Mostrando imóveis de exemplo', 'info');
}

// ========== FILTROS ==========
function popularFiltros(lista) {
    const sel = document.getElementById('bairro');
    if (!sel) return;
    
    const bairros = [...new Set(lista.map(i => i.bairro).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">Todos os bairros</option>' +
        bairros.map(b => `<option value="${b}">${b}</option>`).join('');

    // Restaurar filtros da URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('bairro')) sel.value = params.get('bairro');
    if (params.get('quartos')) {
        const q = document.getElementById('quartos');
        if (q) q.value = params.get('quartos');
    }
    if (params.get('preco')) {
        const p = document.getElementById('preco');
        if (p) p.value = params.get('preco');
    }
    if (params.get('tipo')) {
        const t = document.getElementById('tipo');
        if (t) t.value = params.get('tipo');
    }
}

function ordenarImoveis(lista, criterio) {
    const copia = [...lista];
    switch (criterio) {
        case 'destaque':
            return copia.sort((a, b) => (b.destaque === true ? 1 : 0) - (a.destaque === true ? 1 : 0));
        case 'recentes':
            return copia.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        case 'menor-preco':
            return copia.sort((a, b) => parseFloat(a.preco || 0) - parseFloat(b.preco || 0));
        case 'maior-preco':
            return copia.sort((a, b) => parseFloat(b.preco || 0) - parseFloat(a.preco || 0));
        case 'maior-area':
            return copia.sort((a, b) => parseFloat(b.area || 0) - parseFloat(a.area || 0));
        default:
            return copia;
    }
}

function aplicarFiltros() {
    const bairro = document.getElementById('bairro')?.value || '';
    const quartos = document.getElementById('quartos')?.value || '';
    const preco = document.getElementById('preco')?.value || '';
    const tipo = document.getElementById('tipo')?.value || '';
    const ordem = document.getElementById('ordenar')?.value || 'destaque';
    const mostrarVendidos = document.getElementById('mostrar-vendidos')?.checked || false;
    const busca = (document.getElementById('busca-texto')?.value || '').toLowerCase().trim();

    let filtrados = imoveis.filter(imo => {
        if (!mostrarVendidos && (imo.status === 'vendido' || imo.status === 'alugado')) return false;

        const matchBairro = !bairro || imo.bairro === bairro;
        const matchQuartos = !quartos || (quartos === '4'
            ? parseInt(imo.quartos) >= 4
            : imo.quartos?.toString() === quartos);
        const matchTipo = !tipo || imo.tipo === tipo;
        const matchBusca = !busca || [imo.titulo, imo.bairro, imo.descricao, imo.tipo]
            .some(v => (v || '').toLowerCase().includes(busca));

        let matchPreco = true;
        if (preco) {
            const n = parseFloat(imo.preco);
            if (preco === '0-600000') matchPreco = n <= 600000;
            else if (preco === '600001-1000000') matchPreco = n > 600000 && n <= 1000000;
            else if (preco === '1000001+') matchPreco = n > 1000000;
        }

        return matchBairro && matchQuartos && matchPreco && matchTipo && matchBusca;
    });

    filtrados = ordenarImoveis(filtrados, ordem);

    // Contador de resultados
    const resultsBar = document.getElementById('results-bar');
    const resultsCount = document.getElementById('results-count');
    const btnLimpar = document.getElementById('btn-limpar-filtros');
    const temFiltro = bairro || quartos || preco || tipo || busca || mostrarVendidos;

    if (resultsBar) resultsBar.style.display = 'flex';
    if (resultsCount) {
        const total = filtrados.length;
        let texto = total === 0
            ? 'Nenhum imóvel encontrado'
            : total === 1 ? '1 imóvel encontrado' : `${total} imóveis encontrados`;
        if (bairro) texto += ` em <strong>${bairro}</strong>`;
        resultsCount.innerHTML = texto;
    }
    if (btnLimpar) btnLimpar.style.display = temFiltro ? 'inline-flex' : 'none';

    // Sincronizar URL
    const urlObj = new URL(window.location.href);
    ['bairro', 'quartos', 'preco', 'tipo'].forEach(k => {
        const val = document.getElementById(k)?.value;
        if (val) urlObj.searchParams.set(k, val);
        else urlObj.searchParams.delete(k);
    });
    history.replaceState(null, '', urlObj.toString());

    renderGallery(filtrados);
}

function limparFiltros() {
    ['bairro', 'quartos', 'preco', 'tipo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const mvEl = document.getElementById('mostrar-vendidos');
    if (mvEl) mvEl.checked = false;
    const buscaEl = document.getElementById('busca-texto');
    if (buscaEl) buscaEl.value = '';
    aplicarFiltros();
}

// ========== RENDERIZAR GALERIA ==========
function renderGallery(imoveisList, containerId = 'gallery') {
    const gallery = document.getElementById(containerId);
    if (!gallery) return;

    if (imoveisList.length === 0) {
        gallery.innerHTML = `
            <div class="empty-state-gallery">
                <div class="empty-state-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3>Nenhum imóvel encontrado</h3>
                <p>Tente ajustar os filtros ou limpar a busca para ver mais opções.</p>
                <button onclick="limparFiltros()" class="btn-empty-clear">
                    <i class="fas fa-times"></i> Limpar filtros
                </button>
            </div>`;
        return;
    }

    gallery.innerHTML = imoveisList.map(imo => {
        const preco = parseFloat(imo.preco).toLocaleString('pt-BR');
        const isFav = isFavorito(imo.id);
        const favIcon = isFav ? 'fas fa-heart' : 'far fa-heart';
        const favClass = isFav ? 'favorito-ativo' : '';
        
        // Badge de status
        let statusBadge = '';
        if (imo.status === 'vendido') {
            statusBadge = '<div class="imovel-vendido-badge"><i class="fas fa-check-circle"></i> Vendido</div>';
        } else if (imo.status === 'alugado') {
            statusBadge = '<div class="imovel-vendido-badge" style="border-color: var(--primary); color: var(--primary);"><i class="fas fa-key"></i> Alugado</div>';
        } else if (imo.status === 'reservado') {
            statusBadge = '<div class="imovel-vendido-badge" style="border-color: var(--warning); color: var(--warning);"><i class="fas fa-clock"></i> Reservado</div>';
        }
        
        return `
            <div class="imovel">
                <div class="imovel-img-wrap">
                    <img src="${imo.imagem}" alt="${imo.titulo}" loading="lazy"
                         onerror="this.src='https://via.placeholder.com/400x300/1a1a2e/fff?text=Imóvel'">
                    <button class="favorito-btn ${favClass}" 
                            data-id="${imo.id}" 
                            onclick="toggleFavorito('${imo.id}', event)">
                        <i class="${favIcon}"></i>
                    </button>
                    <div class="imovel-badge">${imo.bairro}</div>
                    ${imo.destaque ? '<div class="imovel-destaque-badge"><i class="fas fa-star"></i> Destaque</div>' : ''}
                    <div class="imovel-fotos-count">
                        <i class="fas fa-images"></i> ${imo.fotos ? imo.fotos.length : 1} foto${(imo.fotos?.length || 1) > 1 ? 's' : ''}
                    </div>
                    ${statusBadge}
                </div>
                <div class="imovel-content">
                    <h3>${imo.titulo}</h3>
                    <div class="imovel-details-row">
                        <span class="detail-tag"><i class="fas fa-ruler-combined"></i> ${imo.area} m²</span>
                        <span class="detail-tag"><i class="fas fa-bed"></i> ${imo.quartos} quarto${imo.quartos > 1 ? 's' : ''}</span>
                        ${imo.vagas ? `<span class="detail-tag"><i class="fas fa-car"></i> ${imo.vagas} vaga${imo.vagas > 1 ? 's' : ''}</span>` : ''}
                        ${imo.tipo ? `<span class="detail-tag">${imo.tipo}</span>` : ''}
                    </div>
                    <p class="imovel-preco">R$ ${preco}</p>
                    ${imo.condominio ? `<p class="imovel-condominio"><small>Condomínio: R$ ${imo.condominio.toLocaleString('pt-BR')}</small></p>` : ''}
                    <p class="imovel-desc">${imo.descricao}</p>
                    <button class="btn-saiba-mais" onclick="openModal('${imo.id}')">
                        <span>Saiba Mais</span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>`;
    }).join('');

    // Animar entrada dos cards
    gallery.querySelectorAll('.imovel').forEach((el, i) => {
        setTimeout(() => el.classList.add('animate'), i * 80);
    });
}

// ========== MODAL SAIBA MAIS ==========
let currentPhotoIndex = 0;
let currentImovelFotos = [];
let currentImovelVideo = null;
let currentImovel = null;
let lightboxIndex = 0;

function openModal(imovelId) {
    console.log('🔍 Abrindo modal do imóvel:', imovelId);
    
    const imo = imoveis.find(i => i.id === imovelId || String(i.id) === String(imovelId));
    
    if (!imo) {
        console.error('❌ Imóvel não encontrado:', imovelId);
        showToast('Erro ao carregar imóvel', 'error');
        return;
    }

    currentImovel = imo;
    currentImovelFotos = imo.fotos && imo.fotos.length ? imo.fotos : [imo.imagem];
    currentImovelVideo = imo.video || null;
    currentPhotoIndex = 0;

    // USANDO AS FUNÇÕES SEGURAS - NENHUM ERRO VAI APARECER
    safeText('modal-title', imo.titulo);
    safeText('modal-bairro', imo.bairro);
    safeText('modal-quartos', imo.quartos);
    safeText('modal-area', imo.area + ' m²');
    safeText('modal-preco', 'R$ ' + parseFloat(imo.preco).toLocaleString('pt-BR'));
    safeText('modal-descricao', imo.descricao);

    // Tags dinâmicas com verificação
    const modalTags = safeId('modal-tags');
    if (modalTags) {
        let tagsHtml = `
            <span class="modal-tag"><i class="fas fa-map-marker-alt"></i> ${imo.bairro}</span>
            <span class="modal-tag"><i class="fas fa-bed"></i> ${imo.quartos} quartos</span>
            <span class="modal-tag"><i class="fas fa-ruler-combined"></i> ${imo.area} m²</span>
        `;
        if (imo.vagas) {
            tagsHtml += `<span class="modal-tag"><i class="fas fa-car"></i> ${imo.vagas} vaga${imo.vagas > 1 ? 's' : ''}</span>`;
        }
        if (imo.condominio) {
            tagsHtml += `<span class="modal-tag"><i class="fas fa-home"></i> Cond. R$ ${imo.condominio.toLocaleString('pt-BR')}</span>`;
        }
        if (imo.iptu) {
            tagsHtml += `<span class="modal-tag"><i class="fas fa-file-invoice"></i> IPTU R$ ${imo.iptu.toLocaleString('pt-BR')}</span>`;
        }
        modalTags.innerHTML = tagsHtml;
    }

    renderModalPhotos();

    // WhatsApp com verificação
    const waMsg = encodeURIComponent(
        `Olá Leandro! Tenho interesse no imóvel: *${imo.titulo}* — ${imo.bairro}, R$ ${parseFloat(imo.preco).toLocaleString('pt-BR')}. Poderia me dar mais informações?`
    );
    const waLink = safeId('modal-whatsapp');
    if (waLink) waLink.href = `https://wa.me/5521981424469?text=${waMsg}`;

    // Botão compartilhar com verificação
    const shareBtn = safeId('modal-share-btn');
    if (shareBtn) {
        shareBtn.onclick = function() {
            const finalUrl = window.location.origin + '/imoveis.html#imovel-' + imo.id;
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(finalUrl).then(() => {
                    safeHTML('modal-share-btn', '<i class="fas fa-check"></i><span>Link copiado!</span>');
                    shareBtn.classList.add('share-copied');
                    setTimeout(() => {
                        safeHTML('modal-share-btn', '<i class="fas fa-share-alt"></i><span>Compartilhar</span>');
                        shareBtn.classList.remove('share-copied');
                    }, 2500);
                    
                    if (typeof window.trackLinkCopiado === 'function') {
                        window.trackLinkCopiado(String(imo.id), imo.titulo);
                    }
                });
            }
        };
    }

    const modal = safeId('imovel-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Atualizar URL
    const url = new URL(window.location.href);
    url.searchParams.set('imovel', imo.id);
    history.replaceState(null, '', url.toString());
    
    // Atualizar título da aba
    document.title = `${imo.titulo} | Leandro Bomfim`;

    // Schema.org para SEO
    injectSchemaOrg(imo);

    // Rastrear visualização
    if (typeof window.trackImovelView === 'function') {
        window.trackImovelView(String(imo.id), imo.titulo, imo.bairro);
    }
    if (typeof window.startImovelView === 'function') {
        window.startImovelView(imo.id, imo.titulo);
    }
}

function closeModal() {
    // Parar vídeo e limpar timers ao fechar
    const iframe = document.querySelector('.modal-video-embed');
    if (iframe) {
        if (iframe._videoFallbackHandler) window.removeEventListener('message', iframe._videoFallbackHandler);
        iframe.src = '';
    }
    // Fechar lightbox se aberto
    closeLightbox();

    document.getElementById('imovel-modal').classList.remove('active');
    document.body.style.overflow = '';

    const urlObj = new URL(window.location.href);
    urlObj.searchParams.delete('imovel');
    history.replaceState(null, '', urlObj.toString());

    document.title = 'Imóveis à Venda no Rio de Janeiro | Leandro Bomfim';
}

// ─── YouTube: converte qualquer formato para embed ───────────────────────────
// ─── Card de vídeo clicável (substitui iframe quando embedding falha) ─────────
function getYouTubeId(url) {
    if (!url) return null;
    let m = url.match(/shorts\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    return null;
}

function showVideoCard(mainWrap, ifrEl, originalSrc, ytId) {
    if (mainWrap.querySelector('.video-embed-fallback')) return;
    if (ifrEl._videoFallbackHandler) { window.removeEventListener('message', ifrEl._videoFallbackHandler); }
    ifrEl.style.display = 'none';

    const thumb = ytId
        ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
        : '';

    const div = document.createElement('div');
    div.className = 'video-embed-fallback';
    div.style.cursor = 'pointer';
    div.onclick = () => window.open(originalSrc, '_blank', 'noopener');
    div.innerHTML = thumb
        ? `<img src="${thumb}" class="vef-thumb" alt="Capa do vídeo">`
        : `<div class="vef-icon"><i class="fas fa-play-circle"></i></div>
           <p class="vef-title">Clique para assistir o vídeo</p>`;
    mainWrap.appendChild(div);
}

function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    let m = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}?rel=0&playsinline=1&enablejsapi=1`;
    m = url.match(/youtube\.com\/watch[^\s]*[?&]v=([a-zA-Z0-9_-]{11})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}?rel=0&playsinline=1&enablejsapi=1`;
    m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}?rel=0&playsinline=1&enablejsapi=1`;
    return null;
}

function renderModalPhotos() {
    const mainWrap = document.querySelector('.modal-main-photo-wrap');
    const mainImg = safeId('modal-main-photo');
    const thumbsContainer = safeId('modal-thumbs');
    const counter = safeId('modal-photo-counter');
    if (!mainWrap || !thumbsContainer) return;

    // mídias: vídeo (se existir) primeiro, depois fotos
    const medias = [];
    if (currentImovelVideo) medias.push({ type: 'video', src: currentImovelVideo });
    currentImovelFotos.forEach(f => medias.push({ type: 'foto', src: f }));
    if (!medias.length) return;

    const media = medias[currentPhotoIndex] || medias[0];
    if (counter) counter.textContent = `${currentPhotoIndex + 1} / ${medias.length}`;

    // Limpar iframe e fallback anteriores
    const oldIfrEl = mainWrap.querySelector('iframe.modal-video-embed');
    if (oldIfrEl) {
        if (oldIfrEl._videoFallbackHandler) window.removeEventListener('message', oldIfrEl._videoFallbackHandler);
        oldIfrEl.remove();
    }
    const oldFallback = mainWrap.querySelector('.video-embed-fallback');
    if (oldFallback) oldFallback.remove();

    if (media.type === 'video') {
        // Estratégia: tentar iframe primeiro; se falhar (7s sem onReady), mostra card
        const embedSrc = getYouTubeEmbedUrl(media.src) || media.src;
        const ytId     = getYouTubeId(media.src);
        const originalSrc = media.src;

        const ifrEl = document.createElement('iframe');
        ifrEl.className = 'modal-video-embed';
        ifrEl.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen');
        mainWrap.appendChild(ifrEl);
        ifrEl.src = embedSrc;
        ifrEl.style.display = 'block';
        if (mainImg) mainImg.style.display = 'none';

        // Detecta falha via postMessage (onError do YouTube)
        const handler = (e) => {
            try {
                const d = JSON.parse(e.data);
                if (d.event === 'onError') { showVideoCard(mainWrap, ifrEl, originalSrc, ytId); }
            } catch(_) {}
        };
        window.addEventListener('message', handler);
        ifrEl._videoFallbackHandler = handler;
    } else {
        if (oldIfrEl) { oldIfrEl.style.display = 'none'; }
        if (mainImg) {
            mainImg.style.display = 'block';
            mainImg.src = media.src;
            mainImg.onerror = function() { this.src = 'https://via.placeholder.com/800x500/1a1a2e/fff?text=Imóvel'; };
            // Clique para lightbox
            const fotoIdx = currentPhotoIndex - (currentImovelVideo ? 1 : 0);
            mainImg.style.cursor = 'zoom-in';
            mainImg.onclick = () => openLightbox(fotoIdx);
        }
    }

    // Thumbs
    thumbsContainer.innerHTML = '';
    medias.forEach((m, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'modal-thumb' + (idx === currentPhotoIndex ? ' active' : '');
        if (m.type === 'video') {
            thumb.innerHTML = '<div class="thumb-video-icon"><i class="fas fa-play-circle"></i></div>';
        } else {
            const img = document.createElement('img');
            img.src = m.src; img.alt = `Foto ${idx + 1}`;
            img.onerror = function() { this.src = 'https://via.placeholder.com/150x100/1a1a2e/fff?text=Foto'; };
            thumb.appendChild(img);
        }
        thumb.addEventListener('click', () => { currentPhotoIndex = idx; renderModalPhotos(); });
        thumbsContainer.appendChild(thumb);
    });
}

function prevPhoto() {
    const total = currentImovelFotos.length + (currentImovelVideo ? 1 : 0);
    if (!total) return;
    currentPhotoIndex = (currentPhotoIndex - 1 + total) % total;
    renderModalPhotos();
}

function nextPhoto() {
    const total = currentImovelFotos.length + (currentImovelVideo ? 1 : 0);
    if (!total) return;
    currentPhotoIndex = (currentPhotoIndex + 1) % total;
    renderModalPhotos();
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function openLightbox(fotoIdx) {
    lightboxIndex = Math.max(0, Math.min(fotoIdx, currentImovelFotos.length - 1));
    let lb = document.getElementById('lightbox-overlay');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'lightbox-overlay';
        lb.innerHTML = `
            <button class="lb-close" onclick="closeLightbox()"><i class="fas fa-times"></i></button>
            <button class="lb-prev"  onclick="lbPrev()"><i class="fas fa-chevron-left"></i></button>
            <button class="lb-next"  onclick="lbNext()"><i class="fas fa-chevron-right"></i></button>
            <img id="lb-img" src="" alt="Foto ampliada">
            <div id="lb-counter" class="lb-counter"></div>`;
        lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
        document.body.appendChild(lb);
    }
    _renderLightbox();
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function _renderLightbox() {
    const lbImg = document.getElementById('lb-img');
    const lbCounter = document.getElementById('lb-counter');
    if (lbImg) {
        lbImg.src = currentImovelFotos[lightboxIndex] || '';
        lbImg.onerror = function() { this.src = 'https://via.placeholder.com/1200x800/1a1a2e/fff?text=Imóvel'; };
    }
    if (lbCounter) lbCounter.textContent = `${lightboxIndex + 1} / ${currentImovelFotos.length}`;
}

function closeLightbox() {
    const lb = document.getElementById('lightbox-overlay');
    if (lb) lb.classList.remove('active');
}

function lbPrev() {
    lightboxIndex = (lightboxIndex - 1 + currentImovelFotos.length) % currentImovelFotos.length;
    _renderLightbox();
}

function lbNext() {
    lightboxIndex = (lightboxIndex + 1) % currentImovelFotos.length;
    _renderLightbox();
}

// ========== CONFIG DO SITE (À PROVA DE ERROS) ==========
function loadSiteConfig() {
    // Verificar se estamos na página inicial (tem elementos do hero)
    const hasHeroElements = document.getElementById('cfg-hero-title') || 
                            document.getElementById('cfg-anos') || 
                            document.getElementById('cfg-foto');
    
    if (!hasHeroElements) {
        console.log('⏭️ Não é página inicial, pulando loadSiteConfig');
        return;
    }
    
    db.collection('config').doc('site').get()
        .then(doc => {
            if (!doc.exists) return;
            const cfg = doc.data();

            // Foto de perfil - com verificação
            const fotoEl = document.getElementById('cfg-foto');
            if (fotoEl && cfg.fotoPerfil) {
                fotoEl.src = cfg.fotoPerfil;
            }

            // Título hero - com verificação
            const titleEl = document.getElementById('cfg-hero-title');
            if (titleEl && cfg.heroTitulo) {
                const words = cfg.heroTitulo.trim().split(' ');
                let l1, l2, l3;
                
                if (words.length <= 3) {
                    l1 = words[0] || '';
                    l2 = words[1] || '';
                    l3 = words[2] || '';
                } else if (words.length === 4) {
                    l1 = words[0];
                    l2 = words[1];
                    l3 = words[2] + ' ' + words[3];
                } else {
                    const a = Math.ceil(words.length / 3);
                    l1 = words.slice(0, a).join(' ');
                    l2 = words.slice(a, a * 2).join(' ');
                    l3 = words.slice(a * 2).join(' ');
                }
                
                titleEl.innerHTML = `
                    <span class="title-line">${l1}</span>
                    <span class="title-line gradient-text">${l2}</span>
                    <span class="title-line">${l3}</span>
                `;
            }

            // Descrição hero - com verificação
            const descEl = document.getElementById('cfg-hero-desc');
            if (descEl && cfg.heroDesc) {
                descEl.textContent = cfg.heroDesc;
            }

            // Números - com verificação
            function setCounter(id, val) {
                const el = document.getElementById(id);
                if (el && val) {
                    el.setAttribute('data-target', String(val));
                    el.textContent = '0';
                }
            }
            
            if (cfg.anosExperiencia) setCounter('cfg-anos', cfg.anosExperiencia);
            if (cfg.imoveisNegociados) setCounter('cfg-imoveis-neg', cfg.imoveisNegociados);
            if (cfg.satisfacao) setCounter('cfg-satisfacao', cfg.satisfacao);

            // Velocidade - com verificação
            if (cfg.velocidade) {
                const velD = document.getElementById('cfg-velocidade-d');
                const velM = document.getElementById('cfg-velocidade-m');
                if (velD) velD.textContent = cfg.velocidade;
                if (velM) velM.textContent = cfg.velocidade;
            }

            // Depoimentos - com verificação
            const depTrack = document.getElementById('cfg-depoimentos');
            if (depTrack && cfg.depoimentos && cfg.depoimentos.length) {
                depTrack.innerHTML = cfg.depoimentos.map(d => `
                    <div class="testimonial-card">
                        <div class="testimonial-quote">"</div>
                        <p class="testimonial-text">${d.texto || ''}</p>
                        <div class="testimonial-author">
                            <span>${d.autor || ''}</span>
                            <span class="author-location">• ${d.local || ''}</span>
                        </div>
                    </div>
                `).join('');

                const carousel = depTrack.closest('.testimonials-carousel');
                if (carousel) {
                    const dotsEl = carousel.querySelector('.carousel-dots');
                    if (dotsEl) {
                        dotsEl.innerHTML = cfg.depoimentos.map((_, i) => 
                            `<span class="dot${i === 0 ? ' active' : ''}"></span>`
                        ).join('');
                    }
                }
            }

            // Bairros - com verificação
            const bairrosTrack = document.getElementById('cfg-bairros-track');
            if (bairrosTrack && cfg.bairros) {
                const lista = cfg.bairros.split(',').map(b => b.trim()).filter(Boolean);
                const items = lista.map(b => 
                    `<span>${b}</span><span class="separator">✦</span>`
                ).join('');
                bairrosTrack.innerHTML = items + items;
            }
        })
        .catch(err => console.error('Erro ao carregar config:', err));
}

// ========== FUNÇÃO SEGURA PARA ALTERAR ELEMENTOS ==========
function safeSetText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
        return true;
    }
    return false;
}

function safeSetHTML(id, html) {
    const el = document.getElementById(id);
    if (el) {
        el.innerHTML = html;
        return true;
    }
    return false;
}

function safeSetAttr(id, attr, value) {
    const el = document.getElementById(id);
    if (el) {
        el.setAttribute(attr, value);
        return true;
    }
    return false;
}
// ========== CARROSSEL DE DEPOIMENTOS ==========
class TestimonialsCarousel {
    constructor() {
        this.currentIndex = 0;
        this.totalSlides = document.querySelectorAll('.testimonial-card').length;
        this.autoPlayInterval = null;
        this.init();
    }
    
    init() {
        this.track = document.querySelector('.testimonial-track');
        this.dots = document.querySelectorAll('.dot');
        if (!this.track || !this.dots.length) return;
        
        this.setupEventListeners();
        this.startAutoPlay();
        this.updateDots();
    }
    
    setupEventListeners() {
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                this.stopAutoPlay();
                this.goToSlide(index);
                this.startAutoPlay();
            });
        });
        
        const carousel = document.querySelector('.testimonials-carousel');
        if (carousel) {
            carousel.addEventListener('mouseenter', () => this.stopAutoPlay());
            carousel.addEventListener('mouseleave', () => this.startAutoPlay());
            
            let touchStartX = 0;
            carousel.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
                this.stopAutoPlay();
            }, { passive: true });
            
            carousel.addEventListener('touchend', (e) => {
                const diff = touchStartX - e.changedTouches[0].screenX;
                if (Math.abs(diff) > 50) {
                    this.goToSlide(diff > 0
                        ? (this.currentIndex + 1) % this.totalSlides
                        : (this.currentIndex - 1 + this.totalSlides) % this.totalSlides);
                }
                this.startAutoPlay();
            }, { passive: true });
        }
    }
    
    goToSlide(index) {
        this.currentIndex = index;
        this.track.style.transform = `translateX(-${index * 100}%)`;
        this.updateDots();
    }
    
    updateDots() {
        this.dots.forEach((dot, i) => dot.classList.toggle('active', i === this.currentIndex));
    }
    
    startAutoPlay() {
        if (this.autoPlayInterval || this.totalSlides <= 1) return;
        this.autoPlayInterval = setInterval(() => {
            this.currentIndex = (this.currentIndex + 1) % this.totalSlides;
            this.track.style.transform = `translateX(-${this.currentIndex * 100}%)`;
            this.updateDots();
        }, 5000);
    }
    
    stopAutoPlay() {
        clearInterval(this.autoPlayInterval);
        this.autoPlayInterval = null;
    }
}

// ========== MENU MOBILE ==========
function setupMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navUl = document.querySelector('nav ul');
    
    if (!menuToggle || !navUl) return;
    
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        navUl.classList.toggle('active');
        
        const spans = menuToggle.querySelectorAll('span');
        if (menuToggle.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(8px, 8px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(8px, -8px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });
}

// ========== CONFIGURAR SWIPE NO MODAL ==========
function setupModalSwipe() {
    const wrap = document.querySelector('.modal-main-photo-wrap');
    if (!wrap) return;
    
    let startX = 0, startY = 0;
    
    wrap.addEventListener('touchstart', e => {
        startX = e.changedTouches[0].screenX;
        startY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    wrap.addEventListener('touchend', e => {
        const dx = startX - e.changedTouches[0].screenX;
        const dy = Math.abs(startY - e.changedTouches[0].screenY);
        
        if (Math.abs(dx) > 40 && dy < 60) {
            dx > 0 ? nextPhoto() : prevPhoto();
        }
    }, { passive: true });
}

// ========== ANIMAÇÃO DOS NÚMEROS ==========
function setupCounters() {
    const animateCounter = (counter) => {
        const target = parseInt(counter.getAttribute('data-target'));
        let current = 0;
        const increment = target / 50;
        
        const updateCounter = () => {
            if (current < target) {
                current += increment;
                counter.textContent = Math.ceil(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target + (counter.dataset.target === '100' ? '%' : '+');
            }
        };
        
        updateCounter();
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.classList.contains('trust-number')) {
                    animateCounter(entry.target);
                }
                entry.target.style.animationPlayState = 'running';
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.trust-number, .fade-in, .testimonial-card, .stats-card').forEach(el => {
        observer.observe(el);
    });
}

// ========== EFEITO PARALLAX ==========
function setupParallax() {
    document.addEventListener('mousemove', (e) => {
        const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
        const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
        const sphere = document.querySelector('.gradient-sphere');
        
        if (sphere) {
            sphere.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px)) scale(1.2)`;
        }
    });
}

// ========== RASTREAMENTO DE CLICK NO WHATSAPP ==========
function setupWhatsAppTracking() {
    const waFloat = document.querySelector('.whatsapp-float');
    if (waFloat) {
        waFloat.addEventListener('click', function() {
            if (typeof window.trackWhatsAppClick === 'function') {
                window.trackWhatsAppClick('botao_flutuante');
            }
        });
    }
    
    const waModal = document.getElementById('modal-whatsapp');
    if (waModal) {
        waModal.addEventListener('click', function() {
            if (typeof window.trackWhatsAppClick === 'function' && currentImovel) {
                window.trackWhatsAppClick(`modal_${currentImovel.titulo}`);
            }
        });
    }
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Script.js inicializado');
    
    // Carregar configurações do site
    loadSiteConfig();
    
    // Inicializar carrossel se existir
    if (document.querySelector('.testimonials-carousel')) {
        window._carousel = new TestimonialsCarousel();
    }
    
    // Configurar menu mobile
    setupMobileMenu();
    
    // Configurar parallax
    setupParallax();
    
    // Configurar contadores
    setupCounters();
    
    // Configurar tracking do WhatsApp
    setupWhatsAppTracking();
    
    // Animar fade-ins
    document.querySelectorAll('.fade-in').forEach((el, i) => {
        setTimeout(() => {
            el.style.animationPlayState = 'running';
        }, i * 150);
    });
    
    // Se estiver na página de imóveis
    if (document.getElementById('gallery')) {
        carregarImoveis().then(() => {
            // Verificar se há imóvel na URL para abrir
            const params = new URLSearchParams(window.location.search);
            const imovelParam = params.get('imovel');
            const hash = window.location.hash;
            const imovelId = imovelParam || (hash.startsWith('#imovel-') ? hash.replace('#imovel-', '') : null);
            
            if (imovelId) {
                setTimeout(() => openModal(imovelId), 400);
            }
        });
        
        // Filtros select
        ['bairro', 'quartos', 'preco', 'tipo', 'ordenar'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', aplicarFiltros);
        });
        // Checkbox vendidos/alugados
        document.getElementById('mostrar-vendidos')?.addEventListener('change', aplicarFiltros);
        // Busca por texto com debounce
        const buscaEl = document.getElementById('busca-texto');
        if (buscaEl) {
            let _buscaTimer;
            buscaEl.addEventListener('input', () => {
                clearTimeout(_buscaTimer);
                _buscaTimer = setTimeout(aplicarFiltros, 280);
            });
        }
    }
    
    // Configurar modal
    setupModalSwipe();
    
    const modal = document.getElementById('imovel-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
    
    // Teclado: lightbox tem prioridade, depois modal
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('lightbox-overlay')?.classList.contains('active')) {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') lbPrev();
            if (e.key === 'ArrowRight') lbNext();
            return;
        }
        if (!document.getElementById('imovel-modal')?.classList.contains('active')) return;
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') prevPhoto();
        if (e.key === 'ArrowRight') nextPhoto();
    });

    // Swipe para baixo fecha o modal
    setupModalSwipeClose();

    // Botão voltar ao topo
    setupScrollToTop();
});

// ========== SWIPE PARA BAIXO FECHA MODAL ==========
function setupModalSwipeClose() {
    const modal = document.getElementById('imovel-modal');
    if (!modal) return;
    let startY = 0;
    modal.addEventListener('touchstart', e => {
        startY = e.touches[0].clientY;
    }, { passive: true });
    modal.addEventListener('touchmove', e => {
        const dy = e.touches[0].clientY - startY;
        const c = modal.querySelector('.modal-container');
        if (c && dy > 0) c.style.transform = `translateY(${Math.min(dy, 200)}px) scale(${1 - dy * 0.0002})`;
    }, { passive: true });
    modal.addEventListener('touchend', e => {
        const dy = e.changedTouches[0].clientY - startY;
        const c = modal.querySelector('.modal-container');
        if (c) { c.style.transition = ''; c.style.transform = ''; }
        if (dy > 100) closeModal();
        setTimeout(() => { if (c) c.style.transition = ''; }, 300);
    }, { passive: true });
}

// ========== BOTÃO SCROLL TO TOP ==========
function setupScrollToTop() {
    let scrollBtn = document.getElementById('scroll-top-btn');
    if (!scrollBtn) {
        scrollBtn = document.createElement('button');
        scrollBtn.id = 'scroll-top-btn';
        scrollBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        scrollBtn.setAttribute('aria-label', 'Voltar ao topo');
        scrollBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
        document.body.appendChild(scrollBtn);
    }
    window.addEventListener('scroll', () => {
        scrollBtn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
}

// ========== SCHEMA.ORG JSON-LD ==========
function injectSchemaOrg(imo) {
    const existing = document.getElementById('schema-imovel');
    if (existing) existing.remove();
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'schema-imovel';
    s.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: imo.titulo,
        description: imo.descricao,
        image: imo.imagem,
        offers: {
            '@type': 'Offer',
            price: imo.preco,
            priceCurrency: 'BRL',
            availability: imo.status === 'vendido' || imo.status === 'alugado'
                ? 'https://schema.org/SoldOut'
                : 'https://schema.org/InStock'
        },
        address: {
            '@type': 'PostalAddress',
            addressLocality: imo.bairro,
            addressRegion: 'RJ',
            addressCountry: 'BR'
        },
        numberOfRooms: imo.quartos,
        floorSize: { '@type': 'QuantitativeValue', value: imo.area, unitCode: 'MTK' }
    });
    document.head.appendChild(s);
}

// ========== EXPOR FUNÇÕES GLOBAIS ==========
window.toggleFavorito = toggleFavorito;
window.limparFavoritos = limparTodosFavoritos;
window.openModal = openModal;
window.closeModal = closeModal;
window.prevPhoto = prevPhoto;
window.nextPhoto = nextPhoto;
window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.showToast = showToast;
window.getFavoritos = getFavoritos;
window.isFavorito = isFavorito;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.lbPrev = lbPrev;
window.lbNext = lbNext;

console.log('✅ Script.js carregado com sucesso!');
