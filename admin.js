// ============================================================
//  ADMIN.JS v3.1 — Leandro Imóveis
// ============================================================
console.log('🚀 Admin.js v3.1');

let auth, db;
function initFirebase() {
    try {
        if (typeof firebase === 'undefined' || !firebase.apps.length) { console.error('❌ Firebase não inicializado'); return false; }
        auth = firebase.auth(); db = firebase.firestore();
        console.log('✅ Firebase pronto'); return true;
    } catch (e) { console.error('❌', e); return false; }
}

let currentUser = null, imoveisData = [], lixeiraData = [], visitasData = [], deleteId = null;
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 horas
const SESSION_KEY = '_lb_session_start';
let sessionTimer = null;

// ========== AUTENTICAÇÃO ==========
function setupAuthListener() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // Verifica se a sessão expirou
            const sessionStart = localStorage.getItem(SESSION_KEY);
            const now = Date.now();
            if (sessionStart && (now - parseInt(sessionStart)) > SESSION_DURATION_MS) {
                console.log('⏰ Sessão expirada — fazendo logout automático');
                localStorage.removeItem(SESSION_KEY);
                auth.signOut();
                return;
            }
            currentUser = user;
            if (!sessionStart) localStorage.setItem(SESSION_KEY, now.toString());
            startSessionTimer();
            showAdminPanel();
            loadDashboard();
        } else {
            clearSessionTimer();
            showLoginScreen();
        }
    });
}

function startSessionTimer() {
    clearSessionTimer();
    const sessionStart = parseInt(localStorage.getItem(SESSION_KEY) || Date.now());
    const elapsed = Date.now() - sessionStart;
    const remaining = SESSION_DURATION_MS - elapsed;
    if (remaining <= 0) { auth.signOut(); return; }
    // Avisa 5 min antes de expirar
    const warnAt = remaining - 5 * 60 * 1000;
    if (warnAt > 0) {
        setTimeout(() => showToast('⚠️ Sessão expira em 5 minutos', 'warning'), warnAt);
    }
    sessionTimer = setTimeout(() => {
        showToast('Sessão expirada por segurança. Faça login novamente.', 'error');
        setTimeout(() => { localStorage.removeItem(SESSION_KEY); auth.signOut(); }, 2500);
    }, remaining);
}

function clearSessionTimer() { if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; } }

function setupLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-senha').value;
        const errorDiv = document.getElementById('login-error');
        const btn = form.querySelector('.btn-login');
        if (!email || !password) { errorDiv.textContent = 'Preencha email e senha'; return; }
        btn.innerHTML = '<span class="loading"></span>'; btn.disabled = true;
        try {
            await auth.signInWithEmailAndPassword(email, password);
            errorDiv.textContent = '';
        } catch (err) {
            const msgs = { 'auth/invalid-credential':'Email ou senha incorretos.', 'auth/user-not-found':'Usuário não encontrado.', 'auth/wrong-password':'Senha incorreta.', 'auth/invalid-email':'Email inválido.', 'auth/too-many-requests':'Muitas tentativas.' };
            errorDiv.textContent = msgs[err.code] || 'Erro ao entrar.';
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Entrar</span>'; btn.disabled = false;
        }
    });
}

function logout() { localStorage.removeItem(SESSION_KEY); clearSessionTimer(); auth.signOut().then(() => showToast('Sessão encerrada.')); }

function togglePassword(id) {
    const input = document.getElementById(id); if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    const icon = input.parentElement.querySelector('.toggle-password i');
    if (icon) icon.className = input.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
}

// ========== NAVEGAÇÃO ==========
function showLoginScreen() { document.getElementById('login-screen').style.display = 'flex'; document.getElementById('admin-panel').style.display = 'none'; }
function showAdminPanel() {
    document.getElementById('login-screen').style.display = 'none'; document.getElementById('admin-panel').style.display = 'flex';
    const el = document.getElementById('user-email'); if (el && currentUser) el.textContent = currentUser.email;
}

function showSection(name) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const section = document.getElementById('section-' + name); if (section) section.classList.add('active');
    const nav = document.querySelector('.nav-item[data-section="' + name + '"]'); if (nav) nav.classList.add('active');
    const titles = { dashboard:'Dashboard', imoveis:'Gerenciar Imóveis', adicionar: document.getElementById('imovel-id')?.value ? 'Editar Imóvel' : 'Adicionar Imóvel', lixeira:'Lixeira', analytics:'Analytics', visitas:'Relatório de Visitas', site:'Configurações do Site', perfil:'Perfil de Visitante', configuracoes:'Configurações' };
    document.getElementById('page-title').textContent = titles[name] || 'Painel';
    if (name === 'dashboard') loadDashboard();
    else if (name === 'imoveis') loadImoveisTable();
    else if (name === 'adicionar') resetForm();
    else if (name === 'lixeira') loadLixeira();
    else if (name === 'analytics') loadAnalytics();
    else if (name === 'visitas') loadVisitas();
    else if (name === 'site') loadSiteConfig();
    else if (name === 'perfil') loadPerfilVisitante();
    else if (name === 'configuracoes') loadConfiguracoes();
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => { e.preventDefault(); showSection(item.getAttribute('data-section')); });
    });
}

// ========== DASHBOARD ==========
const STATIC_IMOVEIS_SEED = [
    { bairro:'Ipanema', quartos:2, preco:850000, area:80, titulo:'Apartamento Moderno em Ipanema', descricao:'Lindo apartamento com 2 quartos a poucos passos da praia. Totalmente reformado com acabamentos de alto padrão.', imagem:'https://remax.azureedge.net/userimages/60/LargeWM/L_b74eaab9-55e3-43c2-8814-06f6152a1f05.jpg', fotos:['https://remax.azureedge.net/userimages/60/LargeWM/L_b74eaab9-55e3-43c2-8814-06f6152a1f05.jpg','https://files.catbox.moe/ihe3p5.png','https://files.catbox.moe/ta8pp6.png','https://files.catbox.moe/0tg1le.png'] },
    { bairro:'Barra da Tijuca', quartos:3, preco:1200000, area:140, titulo:'Cobertura na Barra da Tijuca', descricao:'Cobertura ampla com 3 quartos, piscina privativa e acabamentos de altíssimo padrão com vista deslumbrante.', imagem:'https://imovio.com.br/wp-content/uploads/2023/02/3478296843.jpg', fotos:['https://imovio.com.br/wp-content/uploads/2023/02/3478296843.jpg','https://files.catbox.moe/o4xhj9.png','https://files.catbox.moe/ta8pp6.png','https://files.catbox.moe/ihe3p5.png'] },
    { bairro:'Recreio dos Bandeirantes', quartos:2, preco:520000, area:70, titulo:'Apartamento Moderno no Recreio', descricao:'Apartamento compacto e moderno no Recreio, próximo à praia e comércios locais.', imagem:'https://files.catbox.moe/ihe3p5.png', fotos:['https://files.catbox.moe/ihe3p5.png','https://files.catbox.moe/0tg1le.png'] },
    { bairro:'Leblon', quartos:3, preco:1500000, area:110, titulo:'Apartamento de Luxo no Leblon', descricao:'Sofisticado apartamento de 3 quartos no bairro mais valorizado do Rio.', imagem:'https://files.catbox.moe/ta8pp6.png', fotos:['https://files.catbox.moe/ta8pp6.png','https://files.catbox.moe/ihe3p5.png'] },
    { bairro:'Copacabana', quartos:1, preco:420000, area:45, titulo:'Studio em Copacabana', descricao:'Studio moderno e bem localizado em Copacabana, ideal para investimento.', imagem:'https://files.catbox.moe/0tg1le.png', fotos:['https://files.catbox.moe/0tg1le.png'] }
];

async function seedStaticImoveis() {
    try {
        const batch = db.batch();
        const ts = firebase.firestore.FieldValue.serverTimestamp();
        STATIC_IMOVEIS_SEED.forEach(im => {
            const ref = db.collection('imoveis').doc();
            batch.set(ref, { ...im, createdAt: ts, updatedAt: ts });
        });
        await batch.commit();
        console.log('✅ Imóveis estáticos migrados para o Firestore!');
        showToast('✅ Imóveis de exemplo importados para o banco de dados!');
    } catch(e) {
        console.error('Erro ao fazer seed:', e);
    }
}

async function loadDashboard() {
    if (!db) return;
    try {
        const snap = await db.collection('imoveis').get();
        imoveisData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Se não há imóveis no Firestore, importa os estáticos automaticamente
        if (imoveisData.length === 0 && !localStorage.getItem('_lb_seeded')) {
            localStorage.setItem('_lb_seeded', '1');
            await seedStaticImoveis();
            const snap2 = await db.collection('imoveis').get();
            imoveisData = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        const total = imoveisData.length;
        const bairros = [...new Set(imoveisData.map(i => i.bairro))];
        const mediaQ = total > 0 ? Math.round(imoveisData.reduce((s,i) => s+(parseInt(i.quartos)||0),0)/total) : 0;
        const precoMedio = total > 0 ? Math.round(imoveisData.reduce((s,i) => s+(parseFloat(i.preco)||0),0)/total) : 0;
        setEl('total-imoveis', total); setEl('total-bairros', bairros.length);
        setEl('media-quartos', mediaQ); setEl('preco-medio', 'R$ '+precoMedio.toLocaleString('pt-BR'));
        setEl('badge-imoveis', total);
        syncMobileBadges();
        loadDashboardVisitas();
        renderBairrosChart('bairros-chart');
        renderRecentList('ultimos-imoveis', 5);
        const lSnap = await db.collection('lixeira').get();
        const lCount = lSnap.size;
        const badgeEl = document.getElementById('badge-lixeira');
        if (badgeEl) { badgeEl.textContent = lCount > 0 ? lCount : ''; badgeEl.style.display = lCount > 0 ? '' : 'none'; }
    } catch (e) { console.error(e); }
}

async function loadDashboardVisitas() {
    try {
        const snap = await db.collection('visitas').get();
        const uniqueDevices = new Set(snap.docs.map(d => d.data().deviceId));
        setEl('dash-visitas-total', snap.size);
        setEl('dash-visitas-unique', uniqueDevices.size);
    } catch (e) {}
}

function renderBairrosChart(containerId) {
    const el = document.getElementById(containerId); if (!el) return;
    const counts = {}; imoveisData.forEach(i => counts[i.bairro] = (counts[i.bairro]||0)+1);
    const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]); const max = sorted[0]?.[1]||1;
    el.innerHTML = sorted.map(([b,n]) => `<div class="chart-bar"><span class="chart-label">${b}</span><div class="chart-track"><div class="chart-fill" style="width:${(n/max)*100}%"></div></div><span class="chart-value">${n}</span></div>`).join('') || '<p class="empty-message">Nenhum imóvel cadastrado</p>';
}

function renderRecentList(containerId, limit) {
    const el = document.getElementById(containerId); if (!el) return;
    const recent = [...imoveisData].sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).slice(0,limit);
    if (!recent.length) { el.innerHTML = '<p class="empty-message">Nenhum imóvel cadastrado</p>'; return; }
    el.innerHTML = recent.map(i => `<div class="recent-item"><img src="${i.imagem}" onerror="this.src='https://via.placeholder.com/52x38?text=Foto'"><div class="recent-info"><strong>${i.titulo}</strong><span>${i.bairro} · ${i.quartos} qts</span></div><span class="recent-price">R$ ${Number(i.preco).toLocaleString('pt-BR')}</span></div>`).join('');
}

// ========== LISTA DE IMÓVEIS ==========
async function loadImoveisTable() {
    if (!db) return;
    try {
        const snap = await db.collection('imoveis').orderBy('createdAt','desc').get();
        imoveisData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderImoveisTable(imoveisData); updateBairroFilter(imoveisData);
    } catch (e) { showToast('Erro ao carregar imóveis','error'); }
}

function renderImoveisTable(list) {
    const tbody = document.getElementById('imoveis-table-body'); if (!tbody) return;
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;">Nenhum imóvel encontrado</td></tr>'; return; }
    tbody.innerHTML = list.map(i => `<tr><td><img src="${i.imagem}" class="table-img" onerror="this.src='https://via.placeholder.com/52x38?text=Foto'"></td><td style="color:var(--text-primary);font-weight:500;">${i.titulo}</td><td>${i.bairro}</td><td>${i.quartos} qts</td><td>${i.area} m²</td><td style="color:var(--accent);font-weight:600;">R$ ${Number(i.preco).toLocaleString('pt-BR')}</td><td><div class="table-actions"><button onclick="editImovel('${i.id}')" class="btn-edit" title="Editar"><i class="fas fa-pen"></i></button><button onclick="moveToLixeira('${i.id}')" class="btn-trash" title="Mover para lixeira"><i class="fas fa-trash"></i></button></div></td></tr>`).join('');
}

function updateBairroFilter(list) {
    const sel = document.getElementById('filter-bairro'); if (!sel) return;
    const bairros = [...new Set(list.map(i => i.bairro))].sort();
    sel.innerHTML = '<option value="">Todos os bairros</option>' + bairros.map(b => `<option value="${b}">${b}</option>`).join('');
}

// ========== LIXEIRA ==========
async function moveToLixeira(id) {
    if (!db) return;
    try {
        const doc = await db.collection('imoveis').doc(id).get();
        if (!doc.exists) { showToast('Imóvel não encontrado','error'); return; }
        const data = doc.data(); data.deletedAt = firebase.firestore.FieldValue.serverTimestamp(); data.originalId = id;
        await db.collection('lixeira').doc(id).set(data);
        await db.collection('imoveis').doc(id).delete();
        showToast('Imóvel movido para a lixeira.'); loadImoveisTable(); loadDashboard();
    } catch (e) { console.error(e); showToast('Erro ao mover para lixeira','error'); }
}

async function loadLixeira() {
    if (!db) return;
    try {
        const snap = await db.collection('lixeira').get();
        lixeiraData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderLixeiraTable(lixeiraData);
    } catch (e) { showToast('Erro ao carregar lixeira','error'); }
}

function renderLixeiraTable(list) {
    const container = document.getElementById('lixeira-container'); if (!container) return;
    if (!list.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-trash-alt"></i><h3>Lixeira vazia</h3><p>Os imóveis excluídos aparecem aqui.</p></div>';
        return;
    }
    container.innerHTML = `<div class="table-container"><table class="data-table"><thead><tr><th>Foto</th><th>Título</th><th>Bairro</th><th>Preço</th><th>Ações</th></tr></thead><tbody>${list.map(i => `<tr><td><img src="${i.imagem}" class="table-img" onerror="this.src='https://via.placeholder.com/52x38?text=Foto'"></td><td style="color:var(--text-primary);font-weight:500;">${i.titulo}</td><td>${i.bairro}</td><td style="color:var(--accent);font-weight:600;">R$ ${Number(i.preco).toLocaleString('pt-BR')}</td><td><div class="table-actions"><button onclick="restaurarImovel('${i.id}')" class="btn-restore"><i class="fas fa-undo"></i> Restaurar</button><button onclick="deletePerma('${i.id}')" class="btn-delete" title="Excluir permanente"><i class="fas fa-times"></i></button></div></td></tr>`).join('')}</tbody></table></div><div style="margin-top:1rem;display:flex;justify-content:flex-end;"><button onclick="esvaziarLixeira()" class="btn-danger"><i class="fas fa-fire"></i> Esvaziar lixeira</button></div>`;
}

async function restaurarImovel(id) {
    if (!db) return;
    try {
        const doc = await db.collection('lixeira').doc(id).get();
        if (!doc.exists) { showToast('Item não encontrado','error'); return; }
        const data = doc.data(); delete data.deletedAt; delete data.originalId;
        await db.collection('imoveis').doc(id).set(data);
        await db.collection('lixeira').doc(id).delete();
        showToast('Imóvel restaurado! ✅'); loadLixeira(); loadDashboard();
    } catch (e) { console.error(e); showToast('Erro ao restaurar','error'); }
}

function deletePerma(id) {
    deleteId = id;
    document.getElementById('delete-modal').classList.add('active');
    const p = document.querySelector('#delete-modal .modal-confirm p');
    if (p) p.textContent = 'Excluir permanentemente da lixeira? Esta ação não pode ser desfeita.';
    const btn = document.getElementById('confirm-delete-fn'); if (btn) btn.dataset.mode = 'perma';
}

function esvaziarLixeira() {
    if (!lixeiraData.length) { showToast('Lixeira já está vazia'); return; }
    document.getElementById('delete-modal').classList.add('active');
    const p = document.querySelector('#delete-modal .modal-confirm p');
    if (p) p.textContent = `Excluir permanentemente todos os ${lixeiraData.length} imóvel(is) da lixeira?`;
    const btn = document.getElementById('confirm-delete-fn'); if (btn) btn.dataset.mode = 'empty';
}

async function confirmDelete() {
    const btn = document.getElementById('confirm-delete-fn');
    const mode = btn?.dataset.mode || 'perma';
    try {
        if (mode === 'empty') {
            const batch = db.batch(); lixeiraData.forEach(i => batch.delete(db.collection('lixeira').doc(i.id)));
            await batch.commit(); showToast('Lixeira esvaziada.');
        } else if (deleteId) {
            await db.collection('lixeira').doc(deleteId).delete(); showToast('Excluído permanentemente.');
        }
        closeDeleteModal(); loadLixeira(); loadDashboard();
    } catch (e) { showToast('Erro ao excluir','error'); }
}

function closeDeleteModal() {
    deleteId = null; document.getElementById('delete-modal').classList.remove('active');
    const p = document.querySelector('#delete-modal .modal-confirm p');
    if (p) p.textContent = 'Tem certeza? Esta ação não pode ser desfeita.';
}

// ========== RELATÓRIO DE VISITAS ==========
async function loadVisitas() {
    if (!db) return;
    const loading = document.getElementById('visitas-loading');
    const content = document.getElementById('visitas-content');
    if (loading) loading.style.display = 'flex'; if (content) content.style.display = 'none';
    try {
        const snap = await db.collection('visitas').orderBy('timestamp','desc').get();
        visitasData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderVisitasReport(visitasData);
        if (loading) loading.style.display = 'none'; if (content) content.style.display = 'block';
    } catch (e) { console.error(e); showToast('Erro ao carregar visitas','error'); if (loading) loading.style.display = 'none'; }
}

function renderVisitasReport(data) {
    const el = document.getElementById('visitas-content'); if (!el) return;
    if (!data.length) {
        el.innerHTML = '<div class="empty-state"><i class="fas fa-eye-slash"></i><h3>Sem dados de visitas</h3><p>Adicione o tracker.js nas páginas do site para começar a rastrear visitas.</p></div>';
        return;
    }
    const uniqueDevices = new Set(data.map(v => v.deviceId));
    const totalVisitas = data.length;
    const porPagina = {}; data.forEach(v => porPagina[v.page] = (porPagina[v.page]||0)+1);
    const devPorPagina = {}; data.forEach(v => { if (!devPorPagina[v.page]) devPorPagina[v.page] = new Set(); devPorPagina[v.page].add(v.deviceId); });
    const porDia = {};
    const hoje = new Date();
    for (let i = 13; i >= 0; i--) { const d = new Date(hoje); d.setDate(d.getDate()-i); porDia[d.toISOString().slice(0,10)] = 0; }
    data.forEach(v => { if (v.date && porDia.hasOwnProperty(v.date)) porDia[v.date]++; });
    const maxDia = Math.max(...Object.values(porDia), 1);
    const diasAtivos = Object.values(porDia).filter(v => v > 0).length;
    el.innerHTML = `
        <div class="stats-grid" style="margin-bottom:1.5rem;">
            <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-eye"></i></div><div class="stat-info"><span class="stat-value">${totalVisitas}</span><span class="stat-label">Total de Visitas</span></div></div>
            <div class="stat-card"><div class="stat-icon green"><i class="fas fa-users"></i></div><div class="stat-info"><span class="stat-value">${uniqueDevices.size}</span><span class="stat-label">Visitantes Únicos</span></div></div>
            <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-calendar-day"></i></div><div class="stat-info"><span class="stat-value">${porDia[hoje.toISOString().slice(0,10)]||0}</span><span class="stat-label">Visitas Hoje</span></div></div>
            <div class="stat-card"><div class="stat-icon amber"><i class="fas fa-chart-line"></i></div><div class="stat-info"><span class="stat-value">${diasAtivos ? Math.round(totalVisitas/diasAtivos) : 0}</span><span class="stat-label">Média Diária</span></div></div>
        </div>
        <div class="dashboard-card" style="margin-bottom:1.5rem;">
            <h3><i class="fas fa-calendar-alt"></i> Visitas nos últimos 14 dias</h3>
            <div class="visits-timeline">
                ${Object.entries(porDia).map(([date,count]) => {
                    const d = new Date(date+'T12:00:00');
                    const label = d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
                    const pct = (count/maxDia)*100;
                    return `<div class="vt-col"><div class="vt-bar-wrap"><div class="vt-bar" style="height:${Math.max(pct,2)}%" title="${count} visita(s)"></div></div><div class="vt-count">${count||''}</div><div class="vt-label">${label}</div></div>`;
                }).join('')}
            </div>
        </div>
        <div class="dashboard-grid">
            <div class="dashboard-card">
                <h3><i class="fas fa-file-alt"></i> Visitas por Página</h3>
                ${Object.entries(porPagina).sort((a,b)=>b[1]-a[1]).map(([pg,n]) => `<div class="chart-bar" style="margin-bottom:.9rem;"><span class="chart-label">${pg}</span><div class="chart-track"><div class="chart-fill" style="width:${(n/totalVisitas)*100}%;background:linear-gradient(90deg,var(--green),#16a34a)"></div></div><span class="chart-value">${n}</span></div>`).join('')}
            </div>
            <div class="dashboard-card">
                <h3><i class="fas fa-fingerprint"></i> Dispositivos Únicos</h3>
                ${Object.entries(devPorPagina).sort((a,b)=>b[1].size-a[1].size).map(([pg,devSet]) => `<div class="quartos-item"><span class="quartos-label">${pg}</span><span class="quartos-value">${devSet.size} únicos</span></div>`).join('')}
            </div>
        </div>
        <div style="margin-top:1.2rem;display:flex;justify-content:flex-end;gap:.7rem;">
            <button onclick="exportarVisitas()" class="btn-secondary"><i class="fas fa-file-export" style="color:var(--accent)"></i> Exportar CSV</button>
            <button onclick="limparVisitas()" class="btn-danger" style="opacity:.75;"><i class="fas fa-broom"></i> Limpar dados</button>
        </div>`;
}

async function limparVisitas() {
    if (!confirm('Limpar TODOS os dados de visitas? Esta ação não pode ser desfeita.')) return;
    try {
        const snap = await db.collection('visitas').get();
        const batch = db.batch(); snap.docs.forEach(d => batch.delete(d.ref)); await batch.commit();
        showToast('Dados apagados.'); loadVisitas();
    } catch (e) { showToast('Erro ao limpar','error'); }
}

function exportarVisitas() {
    if (!visitasData.length) { showToast('Nenhum dado para exportar','error'); return; }
    const header = 'Data,Página,Dispositivo ID,User Agent\n';
    const rows = visitasData.map(v => `"${v.date||''}","${v.page||''}","${v.deviceId||''}","${(v.userAgent||'').replace(/"/g,'""')}"`).join('\n');
    const blob = new Blob([header+rows],{type:'text/csv;charset=utf-8;'});
    const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:`visitas-${new Date().toISOString().slice(0,10)}.csv`});
    a.click(); showToast('CSV exportado!');
}

// ========== ANALYTICS ==========
async function loadAnalytics() {
    if (!db) return;
    if (!imoveisData.length) { try { const snap = await db.collection('imoveis').get(); imoveisData = snap.docs.map(d=>({id:d.id,...d.data()})); } catch(e){return;} }
    const total = imoveisData.length; if (!total) return;
    const precos = imoveisData.map(i=>parseFloat(i.preco)||0).filter(Boolean);
    const areas  = imoveisData.map(i=>parseFloat(i.area)||0).filter(Boolean);
    setEl('analytics-total',total); setEl('analytics-maior-preco',precos.length?'R$ '+Math.max(...precos).toLocaleString('pt-BR'):'—');
    setEl('analytics-menor-preco',precos.length?'R$ '+Math.min(...precos).toLocaleString('pt-BR'):'—');
    setEl('analytics-media-area',areas.length?Math.round(areas.reduce((s,a)=>s+a,0)/areas.length)+' m²':'—');
    renderBairrosChart('analytics-bairros-chart');
    const pq = {}; imoveisData.forEach(i => { const q=i.quartos||'?'; if(!pq[q])pq[q]=[]; pq[q].push(parseFloat(i.preco)||0); });
    const qEl = document.getElementById('analytics-quartos-list');
    if (qEl) qEl.innerHTML = Object.entries(pq).sort((a,b)=>Number(a[0])-Number(b[0])).map(([q,ps])=>{const m=Math.round(ps.reduce((s,p)=>s+p,0)/ps.length);return `<div class="quartos-item"><span class="quartos-label"><i class="fas fa-bed" style="margin-right:.4rem;color:var(--text-muted)"></i>${q} quarto${q>1?'s':''}</span><span class="quartos-value">R$ ${m.toLocaleString('pt-BR')}</span></div>`;}).join('');
    const topCaros = [...imoveisData].sort((a,b)=>(parseFloat(b.preco)||0)-(parseFloat(a.preco)||0)).slice(0,3);
    const topArea  = [...imoveisData].sort((a,b)=>(parseFloat(b.area)||0)-(parseFloat(a.area)||0)).slice(0,3);
    renderTopList('analytics-top-caros',topCaros,'preco'); renderTopList('analytics-top-area',topArea,'area');
}

function renderTopList(id,list,tipo) {
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = list.map(i=>`<div class="recent-item"><img src="${i.imagem}" onerror="this.src='https://via.placeholder.com/52x38?text=Foto'"><div class="recent-info"><strong>${i.titulo}</strong><span>${i.bairro}</span></div><span class="recent-price">${tipo==='preco'?'R$ '+Number(i.preco).toLocaleString('pt-BR'):i.area+' m²'}</span></div>`).join('');
}

// ========== CONFIGURAÇÕES ==========
function loadConfiguracoes() {
    if (currentUser) {
        setEl('settings-email',currentUser.email||'—');
        setEl('settings-uid',currentUser.uid||'—');
        const sessionStart = localStorage.getItem(SESSION_KEY);
        const loginDisplay = sessionStart ? new Date(parseInt(sessionStart)).toLocaleString('pt-BR') : '—';
        const expDisplay = sessionStart ? new Date(parseInt(sessionStart) + SESSION_DURATION_MS).toLocaleString('pt-BR') : '—';
        setEl('settings-login-time', loginDisplay);
        setEl('settings-session-expires', expDisplay);
    }
    setEl('settings-date',new Date().toLocaleDateString('pt-BR',{weekday:'long',year:'numeric',month:'long',day:'numeric'}));
}

function exportarDados() {
    if (!imoveisData.length) { showToast('Nenhum dado','error'); return; }
    const blob = new Blob([JSON.stringify(imoveisData,null,2)],{type:'application/json'});
    const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:`leandro-imoveis-${new Date().toISOString().slice(0,10)}.json`});
    a.click(); showToast('Exportado!');
}

// ========== CRUD ==========
function setupFormListeners() {
    document.getElementById('search-imoveis')?.addEventListener('input', e => {
        const t = e.target.value.toLowerCase();
        renderImoveisTable(imoveisData.filter(i=>(i.titulo||'').toLowerCase().includes(t)||(i.bairro||'').toLowerCase().includes(t)||(i.descricao||'').toLowerCase().includes(t)));
    });
    document.getElementById('filter-bairro')?.addEventListener('change', e => {
        const b = e.target.value; renderImoveisTable(b?imoveisData.filter(i=>i.bairro===b):imoveisData);
    });
    document.getElementById('imovel-preco')?.addEventListener('input', e => {
        let v = e.target.value.replace(/[^0-9]/g,''); if(v) e.target.value=parseInt(v).toLocaleString('pt-BR');
    });
    document.getElementById('imovel-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const id = document.getElementById('imovel-id').value;
        const fotos = Array.from(document.querySelectorAll('.foto-input')).map(i=>i.value.trim()).filter(Boolean);
        const data = { titulo:document.getElementById('imovel-titulo').value, bairro:document.getElementById('imovel-bairro').value, quartos:parseInt(document.getElementById('imovel-quartos').value), area:parseInt(document.getElementById('imovel-area').value), preco:parseFloat(document.getElementById('imovel-preco').value.replace(/[^0-9]/g,'')), descricao:document.getElementById('imovel-descricao').value, imagem:document.getElementById('imovel-imagem').value, fotos:fotos.length?fotos:[document.getElementById('imovel-imagem').value], updatedAt:firebase.firestore.FieldValue.serverTimestamp() };
        const btn = document.querySelector('#imovel-form .btn-primary'); btn.innerHTML='<span class="loading"></span>'; btn.disabled=true;
        try {
            if(id){await db.collection('imoveis').doc(id).update(data);showToast('Imóvel atualizado!');}
            else{data.createdAt=firebase.firestore.FieldValue.serverTimestamp();await db.collection('imoveis').add(data);showToast('Imóvel adicionado!');}
            resetForm(); showSection('imoveis');
        } catch(err){showToast('Erro ao salvar','error');}
        finally{btn.innerHTML='<i class="fas fa-save"></i><span id="btn-submit-text">Salvar Imóvel</span>';btn.disabled=false;}
    });
}

function resetForm() {
    document.getElementById('imovel-form')?.reset(); document.getElementById('imovel-id').value='';
    document.querySelectorAll('.foto-input').forEach(i=>i.value='');
    const t=document.getElementById('btn-submit-text'); if(t) t.textContent='Salvar Imóvel';
}

async function editImovel(id) {
    try {
        const doc = await db.collection('imoveis').doc(id).get(); if(!doc.exists){showToast('Não encontrado','error');return;}
        const d=doc.data();
        document.getElementById('imovel-id').value=id; document.getElementById('imovel-titulo').value=d.titulo||''; document.getElementById('imovel-bairro').value=d.bairro||'';
        document.getElementById('imovel-quartos').value=d.quartos||''; document.getElementById('imovel-area').value=d.area||''; document.getElementById('imovel-preco').value=d.preco?Number(d.preco).toLocaleString('pt-BR'):'';
        document.getElementById('imovel-descricao').value=d.descricao||''; document.getElementById('imovel-imagem').value=d.imagem||'';
        const fi=document.querySelectorAll('.foto-input'); if(d.fotos?.length>1)d.fotos.slice(0,4).forEach((f,i)=>{if(fi[i])fi[i].value=f;});
        const t=document.getElementById('btn-submit-text'); if(t)t.textContent='Atualizar Imóvel'; showSection('adicionar');
    } catch(e){showToast('Erro ao carregar','error');}
}

// ========== MOBILE NAVIGATION ==========
function mobileNav(section, el) {
    showSection(section);
    document.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
}

function syncMobileBadges() {
    const badgeI = document.getElementById('mobile-badge-imoveis');
    const badgeL = document.getElementById('mobile-badge-lixeira');
    const iCount = imoveisData.length;
    const lCount = lixeiraData.length;
    if (badgeI) { badgeI.textContent = iCount > 0 ? iCount : ''; badgeI.style.display = iCount > 0 ? 'flex' : 'none'; }
    if (badgeL) { badgeL.textContent = lCount > 0 ? lCount : ''; badgeL.style.display = lCount > 0 ? 'flex' : 'none'; }
}

// ========== UTILS ==========
function setEl(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}
function showToast(message,type='success'){
    const toast=document.getElementById('toast'),msg=document.getElementById('toast-message'),icon=toast.querySelector('i');
    msg.textContent=message;
    if(type==='error'){toast.style.borderColor='rgba(239,68,68,0.3)';icon.className='fas fa-exclamation-circle';icon.style.color='var(--red)';}
    else if(type==='warning'){toast.style.borderColor='rgba(245,158,11,0.3)';icon.className='fas fa-exclamation-triangle';icon.style.color='var(--amber)';}
    else{toast.style.borderColor='rgba(34,197,94,0.3)';icon.className='fas fa-check-circle';icon.style.color='var(--green)';}
    toast.classList.add('active'); setTimeout(()=>toast.classList.remove('active'),3200);
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    if (!initFirebase()) return;
    setupAuthListener(); setupLoginForm(); setupNavigation(); setupFormListeners();
    document.getElementById('delete-modal')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeDeleteModal();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDeleteModal();});
    console.log('✅ Admin v3.0 iniciado');
});
// ========== CONFIGURAÇÕES DO SITE ==========
async function loadSiteConfig() {
    const loading = document.getElementById('site-loading');
    const content = document.getElementById('site-content');
    if (loading) loading.style.display = 'flex';
    if (content) content.style.display = 'none';

    // Carrega config salva no Firestore (coleção 'config', doc 'site')
    let cfg = {};
    try {
        const doc = await db.collection('config').doc('site').get();
        if (doc.exists) cfg = doc.data();
    } catch(e) {}

    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';

    content.innerHTML = `
    <div style="max-width:820px;">
        <!-- INFORMAÇÕES PESSOAIS -->
        <div class="dashboard-card" style="margin-bottom:1.2rem;">
            <h3 style="margin-bottom:1rem;"><i class="fas fa-user"></i> Informações Pessoais</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div class="form-group">
                    <label class="form-label">Nome do Corretor</label>
                    <input type="text" id="cfg-nome" class="form-control" placeholder="Ex: Leandro Bomfim" value="${cfg.nome||'Leandro Bomfim'}">
                </div>
                <div class="form-group">
                    <label class="form-label">CRECI</label>
                    <input type="text" id="cfg-creci" class="form-control" placeholder="Ex: CRECI-RJ 12345" value="${cfg.creci||''}">
                </div>
                <div class="form-group">
                    <label class="form-label">WhatsApp (com DDI)</label>
                    <input type="text" id="cfg-whatsapp" class="form-control" placeholder="Ex: 5521981424469" value="${cfg.whatsapp||'5521981424469'}">
                </div>
                <div class="form-group">
                    <label class="form-label">Email de Contato</label>
                    <input type="email" id="cfg-email" class="form-control" placeholder="Ex: leandro@email.com" value="${cfg.emailContato||''}">
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                    <label class="form-label">Foto de Perfil (URL)</label>
                    <input type="text" id="cfg-foto" class="form-control" placeholder="https://..." value="${cfg.fotoPerfil||'https://files.catbox.moe/nqdyup.png'}">
                </div>
            </div>
        </div>

        <!-- ESTATÍSTICAS DO HERO -->
        <div class="dashboard-card" style="margin-bottom:1.2rem;">
            <h3 style="margin-bottom:1rem;"><i class="fas fa-star"></i> Números do Hero (página inicial)</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
                <div class="form-group">
                    <label class="form-label">Anos de Experiência</label>
                    <input type="number" id="cfg-anos" class="form-control" value="${cfg.anosExperiencia||6}">
                </div>
                <div class="form-group">
                    <label class="form-label">Imóveis Negociados</label>
                    <input type="number" id="cfg-imoveis-neg" class="form-control" value="${cfg.imoveisNegociados||60}">
                </div>
                <div class="form-group">
                    <label class="form-label">% Satisfação</label>
                    <input type="number" id="cfg-satisfacao" class="form-control" value="${cfg.satisfacao||100}">
                </div>
            </div>
        </div>

        <!-- TEXTOS DO SITE -->
        <div class="dashboard-card" style="margin-bottom:1.2rem;">
            <h3 style="margin-bottom:1rem;"><i class="fas fa-pen"></i> Textos do Site</h3>
            <div style="display:flex;flex-direction:column;gap:1rem;">
                <div class="form-group">
                    <label class="form-label">Título do Hero</label>
                    <input type="text" id="cfg-hero-titulo" class="form-control" value="${cfg.heroTitulo||'Transformando Sonhos em Endereços'}">
                </div>
                <div class="form-group">
                    <label class="form-label">Descrição do Hero</label>
                    <textarea id="cfg-hero-desc" class="form-control" rows="3" style="resize:vertical;">${cfg.heroDesc||'Com mais de 6 anos de experiência no mercado imobiliário...'}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Destaque da velocidade (ex: 47%)</label>
                    <input type="text" id="cfg-velocidade" class="form-control" value="${cfg.velocidade||'47%'}">
                </div>
            </div>
        </div>

        <!-- BAIRROS ATENDIDOS -->
        <div class="dashboard-card" style="margin-bottom:1.2rem;">
            <h3 style="margin-bottom:1rem;"><i class="fas fa-map-marker-alt"></i> Bairros Atendidos (faixa rolante)</h3>
            <div class="form-group">
                <label class="form-label">Bairros separados por vírgula</label>
                <input type="text" id="cfg-bairros" class="form-control" value="${cfg.bairros||'Ipanema, Leblon, Barra da Tijuca, Recreio dos Bandeirantes, Barra Olímpica, Copacabana'}">
            </div>
        </div>

        <!-- DEPOIMENTOS -->
        <div class="dashboard-card" style="margin-bottom:1.5rem;">
            <h3 style="margin-bottom:1rem;"><i class="fas fa-quote-right"></i> Depoimentos</h3>
            <div id="depoimentos-list" style="display:flex;flex-direction:column;gap:.8rem;">
                ${(cfg.depoimentos||[
                    {texto:'O Leandro não apenas vendeu nosso apartamento, ele realizou nosso sonho do primeiro lar.', autor:'Carlos e Ana Lima', local:'Ipanema'},
                    {texto:'Profissional incrível! Conseguiu vender minha cobertura em apenas 15 dias pelo valor que eu queria.', autor:'Roberto Fonseca', local:'Barra da Tijuca'},
                ]).map((d,i) => `
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:.5rem;align-items:center;padding:.7rem;background:var(--bg-elevated);border-radius:var(--radius-sm);border:1px solid var(--border);" id="dep-${i}">
                    <input type="text" class="form-control dep-texto" placeholder="Depoimento" value="${d.texto||''}">
                    <input type="text" class="form-control dep-autor" placeholder="Nome" value="${d.autor||''}">
                    <input type="text" class="form-control dep-local" placeholder="Bairro" value="${d.local||''}">
                    <button onclick="this.closest('[id^=dep-]').remove()" style="background:var(--red-soft);border:none;color:var(--red);width:32px;height:32px;border-radius:6px;cursor:pointer;"><i class="fas fa-times"></i></button>
                </div>`).join('')}
            </div>
            <button onclick="addDepoimento()" class="btn-secondary" style="margin-top:.8rem;"><i class="fas fa-plus"></i> Adicionar depoimento</button>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:.8rem;">
            <button onclick="loadSiteConfig()" class="btn-secondary"><i class="fas fa-undo"></i> Descartar</button>
            <button onclick="saveSiteConfig()" class="btn-primary"><i class="fas fa-save"></i> Salvar Configurações</button>
        </div>
    </div>`;
}

function addDepoimento() {
    const list = document.getElementById('depoimentos-list');
    const i = list.children.length;
    const div = document.createElement('div');
    div.id = 'dep-' + i;
    div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:.5rem;align-items:center;padding:.7rem;background:var(--bg-elevated);border-radius:var(--radius-sm);border:1px solid var(--border);';
    div.innerHTML = `<input type="text" class="form-control dep-texto" placeholder="Depoimento"><input type="text" class="form-control dep-autor" placeholder="Nome"><input type="text" class="form-control dep-local" placeholder="Bairro"><button onclick="this.closest('[id^=dep-]').remove()" style="background:var(--red-soft);border:none;color:var(--red);width:32px;height:32px;border-radius:6px;cursor:pointer;"><i class="fas fa-times"></i></button>`;
    list.appendChild(div);
}

async function saveSiteConfig() {
    const depoimentos = Array.from(document.querySelectorAll('[id^=dep-]')).map(el => ({
        texto: el.querySelector('.dep-texto')?.value || '',
        autor: el.querySelector('.dep-autor')?.value || '',
        local: el.querySelector('.dep-local')?.value || '',
    })).filter(d => d.texto);

    const cfg = {
        nome:              document.getElementById('cfg-nome')?.value || '',
        creci:             document.getElementById('cfg-creci')?.value || '',
        whatsapp:          document.getElementById('cfg-whatsapp')?.value || '',
        emailContato:      document.getElementById('cfg-email')?.value || '',
        fotoPerfil:        document.getElementById('cfg-foto')?.value || '',
        anosExperiencia:   parseInt(document.getElementById('cfg-anos')?.value) || 6,
        imoveisNegociados: parseInt(document.getElementById('cfg-imoveis-neg')?.value) || 60,
        satisfacao:        parseInt(document.getElementById('cfg-satisfacao')?.value) || 100,
        heroTitulo:        document.getElementById('cfg-hero-titulo')?.value || '',
        heroDesc:          document.getElementById('cfg-hero-desc')?.value || '',
        velocidade:        document.getElementById('cfg-velocidade')?.value || '',
        bairros:           document.getElementById('cfg-bairros')?.value || '',
        depoimentos,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
        await db.collection('config').doc('site').set(cfg);
        showToast('✅ Configurações salvas! Atualize o site para ver as mudanças.');
    } catch(e) {
        showToast('Erro ao salvar configurações', 'error');
        console.error(e);
    }
}

// ========== PERFIL DE VISITANTE ==========
async function loadPerfilVisitante() {
    const loading = document.getElementById('perfil-loading');
    const content = document.getElementById('perfil-content');
    if (loading) loading.style.display = 'flex';
    if (content) content.style.display = 'none';

    try {
        // Carrega visitas de páginas e de imóveis em paralelo
        const [visitasSnap, imoveisSnap, imoveisListSnap] = await Promise.all([
            db.collection('visitas').orderBy('timestamp','desc').get(),
            db.collection('visitas_imoveis').orderBy('timestamp','desc').get(),
            db.collection('imoveis').get()
        ]);

        const visitas = visitasSnap.docs.map(d => ({id:d.id,...d.data()}));
        const imoveisViews = imoveisSnap.docs.map(d => ({id:d.id,...d.data()}));
        const imoveis = {};
        imoveisListSnap.docs.forEach(d => { imoveis[d.id] = d.data(); });

        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';

        renderPerfilVisitante(visitas, imoveisViews, imoveis);
    } catch(e) {
        console.error(e);
        showToast('Erro ao carregar perfil', 'error');
        if (loading) loading.style.display = 'none';
    }
}

function renderPerfilVisitante(visitas, imoveisViews, imoveisCatalog) {
    const content = document.getElementById('perfil-content');

    // Agrupa por deviceId
    const devMap = {};
    visitas.forEach(v => {
        if (!devMap[v.deviceId]) devMap[v.deviceId] = { deviceId: v.deviceId, pages: [], firstSeen: v.date, lastSeen: v.date, ua: v.userAgent };
        devMap[v.deviceId].pages.push(v.page);
        if (v.date < devMap[v.deviceId].firstSeen) devMap[v.deviceId].firstSeen = v.date;
        if (v.date > devMap[v.deviceId].lastSeen) devMap[v.deviceId].lastSeen = v.date;
    });

    // Adiciona imóveis vistos por device
    imoveisViews.forEach(v => {
        if (!devMap[v.deviceId]) devMap[v.deviceId] = { deviceId: v.deviceId, pages: [], firstSeen: v.date, lastSeen: v.date, ua: '' };
        if (!devMap[v.deviceId].imoveisVistos) devMap[v.deviceId].imoveisVistos = [];
        devMap[v.deviceId].imoveisVistos.push({ id: v.imovelId, titulo: v.titulo, bairro: v.bairro, date: v.date });
    });

    // Top imóveis mais visualizados
    const imovelCount = {};
    imoveisViews.forEach(v => {
        if (!imovelCount[v.imovelId]) imovelCount[v.imovelId] = { id: v.imovelId, titulo: v.titulo, bairro: v.bairro, count: 0, devices: new Set() };
        imovelCount[v.imovelId].count++;
        imovelCount[v.imovelId].devices.add(v.deviceId);
    });
    const topImoveis = Object.values(imovelCount).sort((a,b) => b.count - a.count).slice(0, 10);

    const devices = Object.values(devMap).sort((a,b) => (b.lastSeen||'') > (a.lastSeen||'') ? 1 : -1);

    content.innerHTML = `
    <!-- KPIs rápidos -->
    <div class="stats-grid" style="margin-bottom:1.5rem;">
        <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-fingerprint"></i></div><div class="stat-info"><span class="stat-value">${devices.length}</span><span class="stat-label">Dispositivos Únicos</span></div></div>
        <div class="stat-card"><div class="stat-icon green"><i class="fas fa-building"></i></div><div class="stat-info"><span class="stat-value">${imoveisViews.length}</span><span class="stat-label">Views de Imóveis</span></div></div>
        <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-route"></i></div><div class="stat-info"><span class="stat-value">${devices.filter(d => new Set(d.pages).size > 1).length}</span><span class="stat-label">Visitantes Multi-página</span></div></div>
        <div class="stat-card"><div class="stat-icon amber"><i class="fas fa-fire"></i></div><div class="stat-info"><span class="stat-value">${topImoveis[0]?.titulo?.split(' ').slice(0,2).join(' ')||'—'}</span><span class="stat-label">Imóvel Mais Visto</span></div></div>
    </div>

    <!-- TOP IMÓVEIS MAIS VISTOS -->
    ${topImoveis.length ? `
    <div class="dashboard-card" style="margin-bottom:1.5rem;">
        <h3 style="margin-bottom:1rem;"><i class="fas fa-fire" style="color:var(--amber)"></i> Imóveis Mais Visualizados</h3>
        <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:.83rem;">
            <thead><tr style="border-bottom:1px solid var(--border);">
                <th style="padding:.6rem .8rem;text-align:left;color:var(--text-muted);font-weight:500;">#</th>
                <th style="padding:.6rem .8rem;text-align:left;color:var(--text-muted);font-weight:500;">Imóvel</th>
                <th style="padding:.6rem .8rem;text-align:left;color:var(--text-muted);font-weight:500;">Bairro</th>
                <th style="padding:.6rem .8rem;text-align:center;color:var(--text-muted);font-weight:500;">Visualizações</th>
                <th style="padding:.6rem .8rem;text-align:center;color:var(--text-muted);font-weight:500;">Dispositivos</th>
            </tr></thead>
            <tbody>
            ${topImoveis.map((im,i) => `<tr style="border-bottom:1px solid var(--border);" onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background=''">
                <td style="padding:.6rem .8rem;color:var(--text-muted);">${i+1}</td>
                <td style="padding:.6rem .8rem;color:var(--text-primary);font-weight:500;">${im.titulo||im.id}</td>
                <td style="padding:.6rem .8rem;color:var(--text-secondary);">${im.bairro||'—'}</td>
                <td style="padding:.6rem .8rem;text-align:center;"><span style="background:var(--amber-soft);color:var(--amber);padding:.2rem .7rem;border-radius:99px;font-weight:700;">${im.count}</span></td>
                <td style="padding:.6rem .8rem;text-align:center;color:var(--text-secondary);">${im.devices.size}</td>
            </tr>`).join('')}
            </tbody>
        </table>
        </div>
    </div>` : '<div class="dashboard-card" style="margin-bottom:1.5rem;text-align:center;padding:2rem;color:var(--text-muted)"><i class="fas fa-building" style="font-size:2rem;opacity:.3;display:block;margin-bottom:.7rem;"></i>Nenhum imóvel visualizado ainda</div>'}

    <!-- PERFIL DE CADA DISPOSITIVO -->
    <div class="dashboard-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">
            <h3><i class="fas fa-users"></i> Perfil por Dispositivo</h3>
            <span style="font-size:.78rem;color:var(--text-muted);">${devices.length} visitante(s)</span>
        </div>
        ${devices.length === 0 ? '<p style="color:var(--text-muted);text-align:center;padding:2rem;">Nenhum visitante ainda</p>' :
        devices.map((dev, idx) => {
            const ua = parseUA(dev.ua);
            const uniquePages = [...new Set(dev.pages)];
            const imVisto = dev.imoveisVistos || [];
            return `
            <div style="border:1px solid var(--border);border-radius:var(--radius);padding:1rem;margin-bottom:.8rem;cursor:pointer;transition:border-color .2s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" onclick="this.querySelector('.dev-detail').style.display=this.querySelector('.dev-detail').style.display==='none'?'block':'none'">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;">
                    <div style="display:flex;align-items:center;gap:.7rem;">
                        ${deviceIcon(ua.device)}
                        <div>
                            <div style="font-family:monospace;font-size:.75rem;color:var(--text-muted);">${(dev.deviceId||'').slice(0,28)}…</div>
                            <div style="font-size:.8rem;color:var(--text-secondary);margin-top:.15rem;">${ua.browser} · ${ua.os}</div>
                        </div>
                    </div>
                    <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;">
                        ${uniquePages.map(p => pageBadge(p)).join('')}
                        ${imVisto.length ? `<span style="background:var(--amber-soft);color:var(--amber);padding:.2rem .6rem;border-radius:99px;font-size:.72rem;font-weight:600;"><i class="fas fa-building"></i> ${imVisto.length} imóvel(is)</span>` : ''}
                        <span style="font-size:.75rem;color:var(--text-muted);">último acesso: ${dev.lastSeen||'—'}</span>
                        <i class="fas fa-chevron-down" style="color:var(--text-muted);font-size:.7rem;"></i>
                    </div>
                </div>
                <div class="dev-detail" style="display:none;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                        <div>
                            <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.06em;">Páginas visitadas</div>
                            ${uniquePages.map(p => `<div style="padding:.3rem 0;color:var(--text-secondary);font-size:.82rem;"><i class="fas fa-check" style="color:var(--green);margin-right:.4rem;font-size:.7rem;"></i>${p}</div>`).join('')}
                        </div>
                        <div>
                            <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.06em;">Imóveis visualizados</div>
                            ${imVisto.length ? imVisto.map(iv => `<div style="padding:.3rem 0;font-size:.82rem;"><span style="color:var(--text-secondary);">${iv.titulo||iv.id}</span> <span style="color:var(--text-muted);font-size:.72rem;">— ${iv.date||''}</span></div>`).join('') : '<span style="color:var(--text-muted);font-size:.8rem;">Nenhum imóvel aberto</span>'}
                        </div>
                    </div>
                    <div style="margin-top:.7rem;font-size:.72rem;color:var(--text-muted);">Primeiro acesso: ${dev.firstSeen||'—'} · User Agent: ${(dev.ua||'').slice(0,80)}</div>
                </div>
            </div>`;
        }).join('')}
    </div>`;
}
