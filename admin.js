// ============================================================
//  ADMIN.JS v3.1 — Leandro Imóveis
// ============================================================


let auth, db, storage;
function initFirebase() {
    try {
        if (typeof firebase === 'undefined' || !firebase.apps.length) { return false; }
        auth = firebase.auth();
        db = firebase.firestore();
        storage = typeof firebase.storage === 'function' ? firebase.storage() : null;
        if (window._secureLog) window._secureLog('✅ Firebase admin pronto');
        return true;
    } catch (e) { return false; }
}

let currentUser = null, imoveisData = [], lixeiraData = [], visitasData = [], deleteId = null;
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 horas
const SESSION_KEY = '_lb_session_start';
let sessionTimer = null;

// ========== AUTENTICAÇÃO ==========
function setupAuthListener() {
    auth.onAuthStateChanged(async user => {
        if (user) {
            // Verifica se a sessão expirou
            const sessionStart = localStorage.getItem(SESSION_KEY);
            const now = Date.now();
            if (sessionStart && (now - parseInt(sessionStart)) > SESSION_DURATION_MS) {
                
                localStorage.removeItem(SESSION_KEY);
                auth.signOut();
                return;
            }
            currentUser = user;
            const isNewSession = !sessionStart;
            if (!sessionStart) localStorage.setItem(SESSION_KEY, now.toString());
            startSessionTimer();
            showAdminPanel();
            loadDashboard();
            // Solicita push silenciosamente se já não solicitou
            setTimeout(() => {
                if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                    Notification.requestPermission().then(p => {
                        if (p === 'granted') showToast('🔔 Notificações push ativadas!', 'success');
                    }).catch(()=>{});
                }
            }, 3000);

            // Registra login no histórico apenas em novas sessões
            if (isNewSession) {
                await registrarLoginHistorico(user);
            }
        } else {
            clearSessionTimer();
            showLoginScreen();
        }
    });
}

// ── Coleta informações ricas do dispositivo para o histórico ──
async function coletarInfoDispositivo() {
    const ua = navigator.userAgent || '';
    const info = {
        ua,
        browser:        detectBrowser(ua),
        browserVer:     detectBrowserVersion(ua),
        os:             detectOS(ua),
        device:         detectDevice(ua),
        language:       navigator.language || '—',
        languages:      (navigator.languages || []).join(', ') || '—',
        screenW:        screen.width,
        screenH:        screen.height,
        screenDepth:    screen.colorDepth ? screen.colorDepth + ' bits' : '—',
        viewport:       window.innerWidth + '×' + window.innerHeight,
        timezone:       Intl.DateTimeFormat().resolvedOptions().timeZone || '—',
        timezoneOffset: new Date().getTimezoneOffset() + ' min',
        platform:       navigator.platform || '—',
        cookiesEnabled: navigator.cookieEnabled,
        onLine:         navigator.onLine,
        cores:          navigator.hardwareConcurrency || '—',
        ram:            navigator.deviceMemory ? navigator.deviceMemory + ' GB' : '—',
        touchPoints:    navigator.maxTouchPoints || 0,
        doNotTrack:     navigator.doNotTrack === '1' ? 'Ativado' : 'Desativado',
        connectionType: '—',
        connectionSpeed:'—',
        ip:             '—',
        cidade: '—', regiao: '—', pais: '—', paisCode: '—',
        isp:    '—', asn: '—', org: '—',
        isVPN: '—', isProxy: '—', isMobile: '—', isHosting: '—',
        lat: '—', lon: '—', cep: '—',
        riskScore: 0,
        mac: 'Indisponível — bloqueado pelo navegador por segurança',
    };

    // Tipo de conexão (Network Info API)
    try {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            info.connectionType  = conn.effectiveType || conn.type || '—';
            info.connectionSpeed = conn.downlink ? conn.downlink + ' Mbps' : '—';
        }
    } catch(_) {}

    // IP via ipify
    try {
        const r = await fetch('https://api.ipify.org?format=json');
        const d = await r.json();
        info.ip = d.ip || '—';
    } catch(_) { info.ip = '—'; }

    // Geolocalização + ISP + ASN + VPN/Proxy via ip-api.com
    if (info.ip !== '—') {
        try {
            const fields = 'status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,mobile,proxy,hosting,query';
            const r2 = await fetch('https://ip-api.com/json/' + info.ip + '?fields=' + fields);
            const d2 = await r2.json();
            if (d2.status === 'success') {
                info.cidade    = d2.city        || '—';
                info.regiao    = d2.regionName  || d2.region || '—';
                info.pais      = d2.country     || '—';
                info.paisCode  = d2.countryCode || '—';
                info.isp       = d2.isp         || '—';
                info.asn       = d2.as          || '—';
                info.org       = d2.org         || '—';
                info.lat       = d2.lat         || '—';
                info.lon       = d2.lon         || '—';
                info.cep       = d2.zip         || '—';
                info.isMobile  = d2.mobile  ? '⚠️ Rede móvel'       : '✅ Não';
                info.isProxy   = d2.proxy   ? '🔴 SIM'              : '✅ Não detectado';
                info.isHosting = d2.hosting ? '⚠️ SIM (data center)' : '✅ Não';
                info.isVPN     = d2.proxy   ? '🔴 Possível VPN/Proxy': '✅ Não detectado';
                // Score de risco automático
                let risk = 0;
                if (d2.proxy)   risk += 50;
                if (d2.hosting) risk += 25;
                if (d2.mobile)  risk += 5;
                info.riskScore = risk;
            }
        } catch(_) {}
        // Fallback ipapi.co
        if (info.isp === '—') {
            try {
                const r3 = await fetch('https://ipapi.co/' + info.ip + '/json/');
                const d3 = await r3.json();
                if (!d3.error) {
                    info.cidade = info.cidade !== '—' ? info.cidade : (d3.city         || '—');
                    info.regiao = info.regiao !== '—' ? info.regiao : (d3.region        || '—');
                    info.pais   = info.pais   !== '—' ? info.pais   : (d3.country_name  || '—');
                    info.isp    = info.isp    !== '—' ? info.isp    : (d3.org           || '—');
                    info.asn    = info.asn    !== '—' ? info.asn    : (d3.asn           || '—');
                }
            } catch(_) {}
        }
    }
    return info;
}

function detectBrowser(ua) {
    if (!ua) return 'Desconhecido';
    if (/Edg\//i.test(ua))                          return 'Microsoft Edge';
    if (/OPR\//i.test(ua) || /Opera\//i.test(ua))   return 'Opera';
    if (/YaBrowser\//i.test(ua))                    return 'Yandex Browser';
    if (/SamsungBrowser\//i.test(ua))               return 'Samsung Internet';
    if (/UCBrowser\//i.test(ua))                    return 'UC Browser';
    if (/Brave\//i.test(ua))                        return 'Brave';
    if (/Vivaldi\//i.test(ua))                      return 'Vivaldi';
    if (/Chrome\/[0-9]/i.test(ua))                  return 'Google Chrome';
    if (/Firefox\/[0-9]/i.test(ua))                 return 'Mozilla Firefox';
    if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return 'Apple Safari';
    if (/MSIE|Trident\//i.test(ua))                 return 'Internet Explorer';
    return 'Outro';
}

function detectBrowserVersion(ua) {
    if (!ua) return '';
    let m;
    if ((m = ua.match(/Edg\/([0-9.]+)/i)))          return 'v' + m[1].split('.')[0];
    if ((m = ua.match(/OPR\/([0-9.]+)/i)))           return 'v' + m[1].split('.')[0];
    if ((m = ua.match(/SamsungBrowser\/([0-9.]+)/i)))return 'v' + m[1].split('.')[0];
    if ((m = ua.match(/Chrome\/([0-9.]+)/i)))        return 'v' + m[1].split('.')[0];
    if ((m = ua.match(/Firefox\/([0-9.]+)/i)))       return 'v' + m[1].split('.')[0];
    if ((m = ua.match(/Version\/([0-9.]+).*Safari/i)))return 'v' + m[1].split('.')[0];
    return '';
}

function detectOS(ua) {
    if (!ua) return 'Desconhecido';
    if (/Windows NT 10/i.test(ua)) return 'Windows 10/11';
    if (/Windows NT 6\.3/i.test(ua)) return 'Windows 8.1';
    if (/Windows NT 6\.1/i.test(ua)) return 'Windows 7';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/iPhone/i.test(ua)) return 'iOS (iPhone)';
    if (/iPad/i.test(ua)) return 'iPadOS';
    if (/Mac OS X/i.test(ua)) return 'macOS';
    if (/Android/i.test(ua)) return 'Android';
    if (/Linux/i.test(ua)) return 'Linux';
    if (/CrOS/i.test(ua)) return 'Chrome OS';
    return 'Outro';
}

function detectDevice(ua) {
    if (!ua) return 'Desktop';
    if (/iPad/i.test(ua)) return 'Tablet';
    if (/Mobi|Android|iPhone/i.test(ua)) return 'Smartphone';
    if (/Smart-TV|SmartTV|TV/i.test(ua)) return 'Smart TV';
    return 'Desktop/Notebook';
}

async function registrarLoginHistorico(user) {
    if (!db) return;
    try {
        const info = await coletarInfoDispositivo();
        const sessionStart = parseInt(localStorage.getItem(SESSION_KEY) || Date.now());
        const sessionExpires = sessionStart + SESSION_DURATION_MS;
        const loginId = user.uid + '_' + sessionStart;
        await db.collection('login_historico').doc(loginId).set({
            uid: user.uid,
            email: user.email,
            loginAt: firebase.firestore.Timestamp.fromMillis(sessionStart),
            expiresAt: firebase.firestore.Timestamp.fromMillis(sessionExpires),
            loginAtStr: new Date(sessionStart).toLocaleString('pt-BR'),
            expiresAtStr: new Date(sessionExpires).toLocaleString('pt-BR'),
            sessionId: loginId,
            status: 'ativo',
            ...info,
        });
        
    } catch(e) {  }
}

// Marca sessão como encerrada no Firestore ao fazer logout
async function encerrarSessaoHistorico() {
    if (!db || !currentUser) return;
    try {
        const sessionStart = localStorage.getItem(SESSION_KEY);
        if (!sessionStart) return;
        const loginId = currentUser.uid + '_' + sessionStart;
        await db.collection('login_historico').doc(loginId).update({
            status: 'encerrado',
            logoutAt: firebase.firestore.FieldValue.serverTimestamp(),
            logoutAtStr: new Date().toLocaleString('pt-BR'),
        });
    } catch(_) {}
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
        setTimeout(() => {
            encerrarSessaoHistorico().finally(() => {
                localStorage.removeItem(SESSION_KEY);
                auth.signOut();
            });
        }, 2500);
    }, remaining);
}

function clearSessionTimer() { if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; } }

// ── Rate limit local: bloqueia após 5 falhas por 60s ──
const _LOGIN_ATTEMPTS_KEY = '_lb_login_attempts';
const _LOGIN_BLOCK_KEY    = '_lb_login_block';
const _LOGIN_MAX_ATTEMPTS = 5;
const _LOGIN_BLOCK_MS     = 60 * 1000; // 60 segundos

// Usa localStorage para que o bloqueio persista mesmo ao fechar e reabrir a aba
function _getLoginAttempts() { return parseInt(localStorage.getItem(_LOGIN_ATTEMPTS_KEY) || '0'); }
function _incLoginAttempts() { localStorage.setItem(_LOGIN_ATTEMPTS_KEY, _getLoginAttempts() + 1); }
function _resetLoginAttempts() { localStorage.removeItem(_LOGIN_ATTEMPTS_KEY); localStorage.removeItem(_LOGIN_BLOCK_KEY); }
function _blockLogin() { localStorage.setItem(_LOGIN_BLOCK_KEY, Date.now().toString()); }
function _isLoginBlocked() {
    const blockedAt = parseInt(localStorage.getItem(_LOGIN_BLOCK_KEY) || '0');
    if (!blockedAt) return false;
    if (Date.now() - blockedAt > _LOGIN_BLOCK_MS) { _resetLoginAttempts(); return false; }
    return true;
}
function _blockSecondsLeft() {
    const blockedAt = parseInt(localStorage.getItem(_LOGIN_BLOCK_KEY) || '0');
    return Math.ceil((_LOGIN_BLOCK_MS - (Date.now() - blockedAt)) / 1000);
}

function setupLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-senha').value;
        const errorDiv = document.getElementById('login-error');
        const btn = form.querySelector('.btn-login');

        // Verificar bloqueio por tentativas excessivas
        if (_isLoginBlocked()) {
            const secs = _blockSecondsLeft();
            errorDiv.textContent = `🔒 Acesso bloqueado. Aguarde ${secs}s para tentar novamente.`;
            // Atualiza o contador a cada segundo
            if (!btn._countdownInterval) {
                btn._countdownInterval = setInterval(() => {
                    if (!_isLoginBlocked()) {
                        clearInterval(btn._countdownInterval);
                        btn._countdownInterval = null;
                        errorDiv.textContent = '';
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Entrar</span>';
                    } else {
                        errorDiv.textContent = `🔒 Acesso bloqueado. Aguarde ${_blockSecondsLeft()}s para tentar novamente.`;
                    }
                }, 1000);
            }
            return;
        }
        if (!email || !password) { errorDiv.textContent = 'Preencha email e senha'; return; }

        btn.innerHTML = '<span class="loading"></span>'; btn.disabled = true;
        try {
            await auth.signInWithEmailAndPassword(email, password);
            _resetLoginAttempts();
            errorDiv.textContent = '';
        } catch (err) {
            _incLoginAttempts();
            const attempts = _getLoginAttempts();
            if (attempts >= _LOGIN_MAX_ATTEMPTS) {
                _blockLogin();
                errorDiv.textContent = `Conta bloqueada por ${_LOGIN_BLOCK_MS/1000}s por segurança.`;
            } else {
                const msgs = { 'auth/invalid-credential':'Email ou senha incorretos.', 'auth/user-not-found':'Usuário não encontrado.', 'auth/wrong-password':'Senha incorreta.', 'auth/invalid-email':'Email inválido.', 'auth/too-many-requests':'Muitas tentativas. Tente mais tarde.' };
                const remaining = _LOGIN_MAX_ATTEMPTS - attempts;
                errorDiv.textContent = (msgs[err.code] || 'Erro ao entrar.') + (remaining <= 2 ? ` (${remaining} tentativa${remaining>1?'s':''} restante${remaining>1?'s':''})` : '');
            }
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Entrar</span>'; btn.disabled = false;
        }
    });
}

function logout() {
    encerrarSessaoHistorico().finally(() => {
        localStorage.removeItem(SESSION_KEY);
        clearSessionTimer();
        auth.signOut().then(() => showToast('Sessão encerrada.'));
    });
}

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
    const titles = { dashboard:'Dashboard', imoveis:'Gerenciar Imóveis', adicionar: document.getElementById('imovel-id')?.value ? 'Editar Imóvel' : 'Adicionar Imóvel', lixeira:'Lixeira', analytics:'Analytics', visitas:'Relatório de Visitas', configuracoes:'Configurações', seguranca:'Segurança & Logins', site:'Configurações do Site', saude:'Saúde do Sistema', perfil:'Perfil de Visitante', 'chat-logs':'Logs do Assistente Virtual' };
    document.getElementById('page-title').textContent = titles[name] || 'Painel';
    if (name === 'dashboard') loadDashboard();
    else if (name === 'imoveis') { renderImoveisTable(imoveisData); updateBairroFilter(imoveisData); }
    else if (name === 'adicionar') { /* form já preenchido por editImovel ou limpo por novoImovel() */ }
    else if (name === 'lixeira') renderLixeiraTable(lixeiraData);
    else if (name === 'analytics') loadAnalytics();
    else if (name === 'visitas') loadVisitas();
    else if (name === 'site') loadSiteConfig();
    else if (name === 'saude') loadSaudeSistema();
    else if (name === 'perfil') loadPerfilVisitante();
    else if (name === 'configuracoes') loadConfiguracoes();
    else if (name === 'chat-logs') { loadChatLogs(); return; }
    else if (name === 'seguranca') { loadSeguranca().then(() => carregarIPSessaoAtual()); return; }
    else stopSessaoCountdown();
}

function novoImovel() {
    resetForm();
    showSection('adicionar');
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const sec = item.getAttribute('data-section');
            if (sec === 'adicionar') novoImovel();
            else showSection(sec);
        });
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
        // Se não há imóveis, NÃO faz seed automático sem permissão do painel.
        // (O seed existe, mas só roda quando permitido em config/site ou manualmente.)
        try {
            const siteDoc = await db.collection('config').doc('site').get();
            const siteCfg = siteDoc.exists ? (siteDoc.data() || {}) : {};
            const autoSeed = !!siteCfg?.conteudoPublico?.autoSeedExemplos;
            if (autoSeed && imoveisData.length === 0 && !localStorage.getItem('_lb_seeded')) {
                localStorage.setItem('_lb_seeded', '1');
                await seedStaticImoveis();
                const snap2 = await db.collection('imoveis').get();
                imoveisData = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
            }
        } catch(e) {}
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
        // Verifica logins suspeitos para o badge de segurança
        try {
            const secSnap = await db.collection('login_historico').where('status','==','suspeito').get();
            const secBadge = document.getElementById('badge-seguranca');
            if (secBadge) { secBadge.style.display = secSnap.size > 0 ? '' : 'none'; secBadge.textContent = secSnap.size > 0 ? secSnap.size : '!'; }
            const banner = document.getElementById('security-alert-banner');
            const bannerMsg = document.getElementById('security-alert-msg');
            if (banner) banner.style.display = secSnap.size > 0 ? 'flex' : 'none';
            if (bannerMsg && secSnap.size > 0) bannerMsg.textContent = `${secSnap.size} login(s) marcado(s) como suspeito. Revise agora.`;
            if (secSnap.size > 0) showNotification('⚠️ Alerta de segurança', secSnap.size + ' login(s) marcado(s) como suspeito', 'red');
        } catch(_) {}
    } catch (e) { console.error(e); }
}

async function loadDashboardVisitas() {
    try {
        const hoje = new Date().toISOString().slice(0,10);
        const [visitasSnap, imoveisViewsSnap, copiadosSnap] = await Promise.all([
            db.collection('visitas').get(),
            db.collection('visitas_imoveis').get(),
            db.collection('links_copiados').where('date','==',hoje).get(),
        ]);

        // Total de registros de visita (todas as páginas, todos os dias)
        setEl('dash-visitas-total', visitasSnap.size);

        // Visitantes únicos HOJE (não total histórico)
        const visitasHoje = visitasSnap.docs.filter(d => d.data().date === hoje);
        const uniqueHoje = new Set(visitasHoje.map(d => d.data().deviceId)).size;
        setEl('dash-visitas-unique', uniqueHoje);

        // Imóvel mais visto do dia
        const counts = {};
        imoveisViewsSnap.docs.forEach(d => {
            const v = d.data();
            if (v.date === hoje) {
                if (!counts[v.imovelId]) counts[v.imovelId] = { titulo: v.titulo, bairro: v.bairro, count: 0 };
                counts[v.imovelId].count++;
            }
        });
        const top = Object.values(counts).sort((a,b) => b.count - a.count)[0];
        const elTop = document.getElementById('dash-imovel-top');
        if (elTop) elTop.innerHTML = top
            ? `<strong>${top.titulo}</strong><span>${top.count} view${top.count>1?'s':''} hoje</span>`
            : `<strong style="color:var(--text-muted)">Nenhum ainda</strong><span>hoje</span>`;

        // Links copiados hoje
        const elC = document.getElementById('dash-links-copiados');
        if (elC) elC.textContent = copiadosSnap.size;

        // Inicia listener de presença (online agora) — apenas uma vez
        _startPresencaListener();
        updateFirestoreStatusCard();
    } catch (e) { console.error('loadDashboardVisitas', e); }
}

// ── Online agora — listener em tempo real da coleção presenca ──
let _presencaListener = null;
let _presencaCacheDocs = [];
let _presencaTick = null;
function _startPresencaListener() {
    if (_presencaListener) return; // já ativo

    function computeOnline() {
        const cincoMinAtras = Date.now() - 5 * 60 * 1000;
        let online = 0;
        _presencaCacheDocs.forEach(doc => {
            const ts = doc?.lastSeen;
            const ms = ts?.toMillis?.() || 0;
            if (ms >= cincoMinAtras) online++;
        });
        const el = document.getElementById('dash-online-agora');
        if (el) el.textContent = String(online);
    }

    _presencaListener = db.collection('presenca').onSnapshot(snap => {
        _presencaCacheDocs = snap.docs.map(d => d.data());
        computeOnline();
        if (_presencaTick) clearInterval(_presencaTick);
        _presencaTick = setInterval(computeOnline, 15000);
    }, err => {
        console.warn('presencaListener:', err);
        const el = document.getElementById('dash-online-agora');
        if (el) el.textContent = '—';
    });
}

// ========== SAÚDE DO SISTEMA ==========
const EXPECTED_RULES_TAG = 'rules_2026-03-31';

function _setHealthLine(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

async function runFirestoreHealthCheck() {
    if (!db) return { ok: false, msg: 'Firestore não inicializado' };
    const started = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const uid = currentUser?.uid ? String(currentUser.uid).slice(0, 48) : 'anon';
    const deviceId = 'admin_' + uid;

    try {
        // 1) Leitura de config/site (deve funcionar sempre)
        await db.collection('config').doc('site').get();

        // 2) Presença: simula escrita no formato do tracker (create/update permitido)
        await db.collection('presenca').doc(deviceId).set({
            deviceId,
            page: 'Admin',
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            date: today,
        }, { merge: true });

        // 3) Leitura mínima de presenca (auth read)
        await db.collection('presenca').limit(1).get();

        const ms = Date.now() - started;
        return { ok: true, msg: `OK • ${ms}ms`, rulesTag: EXPECTED_RULES_TAG, presencaOk: true };
    } catch (e) {
        return { ok: false, msg: (e && e.message) ? e.message : 'Erro', rulesTag: EXPECTED_RULES_TAG, presencaOk: false };
    }
}

async function updateFirestoreStatusCard() {
    const v = document.getElementById('dash-firestore-ok');
    const meta = document.getElementById('dash-firestore-meta');
    if (!v || !meta) return;
    v.textContent = '...';
    meta.textContent = 'Status Firestore';
    const r = await runFirestoreHealthCheck();
    if (r.ok) {
        v.textContent = 'OK';
        v.style.color = 'var(--green)';
        meta.textContent = `rules: ${r.rulesTag} • presença: ok`;
    } else {
        v.textContent = 'Erro';
        v.style.color = 'var(--red)';
        meta.textContent = `rules: ${r.rulesTag} • presença: falhou`;
    }
}

function _fmtTs(ts) {
    try {
        const ms = ts?.toMillis?.();
        if (!ms) return '—';
        return new Date(ms).toLocaleString('pt-BR');
    } catch { return '—'; }
}

async function loadSaudeSistema() {
    const c1 = document.getElementById('saude-firestore-content');
    const c2 = document.getElementById('saude-erros-content');
    if (c1) c1.innerHTML = '<span class="loading"></span> Verificando...';
    if (c2) c2.innerHTML = '<span class="loading"></span> Carregando logs...';

    // Firestore status
    const r = await runFirestoreHealthCheck();
    if (c1) {
        c1.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
                <div style="padding:1rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);">
                    <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;">Conexão</div>
                    <div style="margin-top:.35rem;font-family:var(--font-display);font-weight:800;font-size:1.25rem;color:${r.ok?'var(--green)':'var(--red)'};">${r.ok?'OK':'ERRO'}</div>
                    <div style="margin-top:.25rem;color:var(--text-secondary);font-size:.82rem;">${r.msg}</div>
                </div>
                <div style="padding:1rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);">
                    <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;">Rules tag</div>
                    <div style="margin-top:.35rem;font-family:monospace;font-weight:700;color:var(--text-primary);">${r.rulesTag || EXPECTED_RULES_TAG}</div>
                    <div style="margin-top:.25rem;color:var(--text-muted);font-size:.78rem;">Se a tag não bater com o deploy, pode haver bloqueios.</div>
                </div>
                <div style="padding:1rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);">
                    <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;">Presença</div>
                    <div style="margin-top:.35rem;font-family:var(--font-display);font-weight:800;font-size:1.25rem;color:${r.presencaOk?'var(--green)':'var(--red)'};">${r.presencaOk?'OK':'FALHOU'}</div>
                    <div style="margin-top:.25rem;color:var(--text-secondary);font-size:.82rem;">Online agora depende de /presenca</div>
                </div>
            </div>
            <div style="margin-top:1rem;display:flex;justify-content:flex-end;">
                <button class="btn-secondary" onclick="loadSaudeSistema()"><i class="fas fa-sync"></i> Rechecar</button>
            </div>
        `;
    }

    // Logs: últimos erros do público
    try {
        const snap = await db.collection('eventos')
            .where('eventName', '==', 'client_error')
            .orderBy('timestamp', 'desc')
            .limit(40)
            .get();
        const rows = snap.docs.map(d => d.data());
        if (!c2) return;
        if (!rows.length) {
            c2.innerHTML = `<div class="empty-message">Nenhum erro capturado ainda.</div>`;
            return;
        }
        c2.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:.7rem;">
                ${rows.map(e => {
                    const ed = e.eventData || {};
                    const msg = (ed.message || '').toString();
                    const kind = (ed.kind || 'error').toString();
                    const src = (ed.source || '').toString();
                    const path = (ed.path || '').toString();
                    const when = _fmtTs(e.timestamp);
                    return `
                        <div style="border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);padding:.9rem 1rem;">
                            <div style="display:flex;gap:.6rem;align-items:center;justify-content:space-between;flex-wrap:wrap;">
                                <div style="display:flex;gap:.5rem;align-items:center;min-width:0;">
                                    <span style="font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:.15rem .55rem;border-radius:999px;border:1px solid var(--border);background:rgba(255,255,255,0.02);color:var(--text-secondary);">${kind}</span>
                                    <span style="color:var(--text-primary);font-weight:700;font-size:.86rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:520px;">${msg || 'Erro'}</span>
                                </div>
                                <span style="color:var(--text-muted);font-size:.75rem;">${when}</span>
                            </div>
                            <div style="margin-top:.35rem;color:var(--text-muted);font-size:.78rem;display:flex;gap:.6rem;flex-wrap:wrap;">
                                ${path ? `<span><i class="fas fa-link" style="opacity:.6;"></i> ${path}</span>` : ''}
                                ${src ? `<span><i class="fas fa-file-alt" style="opacity:.6;"></i> ${src}</span>` : ''}
                            </div>
                            ${ed.stack ? `<details style="margin-top:.55rem;"><summary style="cursor:pointer;color:var(--text-secondary);font-size:.78rem;">Stack</summary><pre style="white-space:pre-wrap;color:var(--text-muted);font-size:.75rem;margin-top:.5rem;">${String(ed.stack).replace(/</g,'&lt;')}</pre></details>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (e) {
        if (c2) c2.innerHTML = `<div class="empty-message">Erro ao carregar logs.</div>`;
    }
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
        // onSnapshot mantém imoveisData sempre atualizado — usa cache se disponível
        if (_realtimeActive && imoveisData.length > 0) {
            renderImoveisTable(imoveisData); updateBairroFilter(imoveisData); return;
        }
        const snap = await db.collection('imoveis').orderBy('createdAt','desc').get();
        imoveisData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderImoveisTable(imoveisData); updateBairroFilter(imoveisData);
    } catch (e) { showToast('Erro ao carregar imóveis','error'); }
}

function renderImoveisTable(list) {
    const tbody = document.getElementById('imoveis-table-body'); if (!tbody) return;
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:2rem;">Nenhum imóvel encontrado</td></tr>'; return; }
    tbody.innerHTML = list.map(i => {
        const isDestaque = i.destaque === true;
        return `<tr style="${isDestaque?'background:rgba(245,158,11,0.04);border-left:2px solid var(--amber);':''}">
            <td><img src="${i.imagem}" class="table-img" onerror="this.src='https://via.placeholder.com/52x38?text=Foto'"></td>
            <td style="color:var(--text-primary);font-weight:500;">${i.titulo}${isDestaque?' <span style="background:var(--amber-soft);color:var(--amber);font-size:.68rem;padding:.1rem .45rem;border-radius:99px;font-weight:700;vertical-align:middle;">★ DESTAQUE</span>':''}</td>
            <td>${i.bairro}</td><td>${i.quartos} qts</td><td>${i.area} m²</td>
            <td><span class="status-badge status-${i.status||'disponivel'}">${({disponivel:'Disponível',vendido:'Vendido',reservado:'Reservado',alugado:'Alugado'})[i.status||'disponivel']||'Disponível'}</span></td>
            <td style="color:var(--accent);font-weight:600;">R$ ${Number(i.preco).toLocaleString('pt-BR')}</td>
            <td>
                <div class="table-actions">
                    <button onclick="toggleDestaque('${i.id}',${isDestaque})" class="btn-edit" title="${isDestaque?'Remover destaque':'Marcar como destaque'}" style="${isDestaque?'color:var(--amber);border-color:var(--amber);':''}">
                        <i class="fas fa-star"></i>
                    </button>
                    <button onclick="editImovel('${i.id}')" class="btn-edit" title="Editar"><i class="fas fa-pen"></i></button>
                    <button onclick="moveToLixeira('${i.id}')" class="btn-trash" title="Mover para lixeira"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

async function toggleDestaque(id, isDestaque) {
    try {
        if (!isDestaque) {
            // Remove destaque de qualquer outro imóvel
            const snap = await db.collection('imoveis').where('destaque','==',true).get();
            const batch = db.batch();
            snap.docs.forEach(d => batch.update(d.ref, { destaque: false }));
            batch.update(db.collection('imoveis').doc(id), { destaque: true });
            await batch.commit();
            showToast('⭐ Imóvel marcado como destaque!');
        } else {
            await db.collection('imoveis').doc(id).update({ destaque: false });
            showToast('Destaque removido.');
        }
        loadImoveisTable();
    } catch(e) { showToast('Erro ao alterar destaque','error'); }
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
        showToast('Imóvel movido para a lixeira.');
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
    container.innerHTML = `<div class="table-container"><table class="data-table"><thead><tr><th>Foto</th><th>Título</th><th>Bairro</th><th>Preço</th><th>Ações</th></tr></thead><tbody>${list.map(i => `<tr><td><img src="${i.imagem}" class="table-img" onerror="this.src='https://via.placeholder.com/52x38?text=Foto'"></td><td style="color:var(--text-primary);font-weight:500;">${i.titulo}</td><td>${i.bairro}</td><td style="color:var(--accent);font-weight:600;">R$ ${Number(i.preco).toLocaleString('pt-BR')}</td><td><div class="table-actions"><button onclick="restaurarImovel('${i.id}')" class="btn-edit" title="Restaurar" style="color:var(--green);background:var(--green-soft);gap:.3rem;width:auto;padding:0 .7rem;font-size:.75rem;"><i class="fas fa-undo"></i> Restaurar</button><button onclick="deletePerma('${i.id}')" class="btn-delete" title="Excluir permanente"><i class="fas fa-times"></i></button></div></td></tr>`).join('')}</tbody></table></div><div style="margin-top:1rem;display:flex;justify-content:flex-end;"><button onclick="esvaziarLixeira()" class="btn-danger"><i class="fas fa-fire"></i> Esvaziar lixeira</button></div>`;
}

async function restaurarImovel(id) {
    if (!db) return;
    try {
        const doc = await db.collection('lixeira').doc(id).get();
        if (!doc.exists) { showToast('Item não encontrado','error'); return; }
        const data = doc.data(); delete data.deletedAt; delete data.originalId;
        await db.collection('imoveis').doc(id).set(data);
        await db.collection('lixeira').doc(id).delete();
        showToast('Imóvel restaurado! ✅');
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
        } else if (mode === 'revogar' && deleteId) {
            await confirmarRevogacao(deleteId);
        } else if (deleteId) {
            await db.collection('lixeira').doc(deleteId).delete(); showToast('Excluído permanentemente.');
        }
        closeDeleteModal();
    } catch (e) { showToast('Erro ao excluir','error'); }
}

function closeDeleteModal() {
    deleteId = null; document.getElementById('delete-modal').classList.remove('active');
    const p = document.querySelector('#delete-modal .modal-confirm p');
    const h3 = document.querySelector('#delete-modal .modal-confirm h3');
    if (p) p.textContent = 'Tem certeza? Esta ação não pode ser desfeita.';
    if (h3) h3.textContent = 'Confirmar Ação';
    const btn = document.getElementById('confirm-delete-fn');
    if (btn) btn.dataset.mode = 'perma';
}

// ========== RELATÓRIO DE VISITAS ==========
let visitasFilter = { page: '', period: '14' };

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

function getFilteredVisitas(data) {
    const days = parseInt(visitasFilter.period) || 14;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days + 1);
    const cutoffStr = cutoff.toISOString().slice(0,10);
    return data.filter(v => {
        const matchPage = !visitasFilter.page || v.page === visitasFilter.page;
        const matchDate = !v.date || v.date >= cutoffStr;
        return matchPage && matchDate;
    });
}

function parseUA(ua) {
    if (!ua) return { browser:'Desconhecido', os:'Desconhecido', device:'desktop' };
    let browser='Outro', os='Outro', device='desktop';
    if (/Mobi|Android|iPhone|iPad/i.test(ua)) device = /iPad/i.test(ua) ? 'tablet' : 'mobile';
    if (/Chrome\/[0-9]/i.test(ua) && !/Edg|OPR/i.test(ua)) browser='Chrome';
    else if (/Firefox\//i.test(ua)) browser='Firefox';
    else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser='Safari';
    else if (/Edg\//i.test(ua)) browser='Edge';
    else if (/OPR\//i.test(ua)) browser='Opera';
    if (/Windows/i.test(ua)) os='Windows';
    else if (/Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua)) os='macOS';
    else if (/iPhone/i.test(ua)) os='iOS';
    else if (/iPad/i.test(ua)) os='iPadOS';
    else if (/Android/i.test(ua)) os='Android';
    else if (/Linux/i.test(ua)) os='Linux';
    return { browser, os, device };
}

function deviceIconHTML(device) {
    if (device==='mobile') return '<i class="fas fa-mobile-alt" style="color:var(--accent)"></i>';
    if (device==='tablet') return '<i class="fas fa-tablet-alt" style="color:var(--purple)"></i>';
    return '<i class="fas fa-desktop" style="color:var(--green)"></i>';
}

function pageColor(page) {
    const p = (page||'').toLowerCase()
        .replace(/[àáâãä]/g,'a').replace(/[èéêë]/g,'e')
        .replace(/[ìíîï]/g,'i').replace(/[òóôõö]/g,'o')
        .replace(/[ùúûü]/g,'u');
    if (p === 'inicio' || p === 'in') return '#3b82f6';
    if (p.startsWith('im')) return '#22c55e';
    if (p.startsWith('co')) return '#f59e0b';
    return '#94a3b8';
}

function pageBadge(page) {
    const hex = pageColor(page);
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `<span style="background:rgba(${r},${g},${b},.2);color:${hex};padding:.2rem .65rem;border-radius:99px;font-size:.72rem;font-weight:700;display:inline-block;">${page}</span>`;
}

function formatTimestamp(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds*1000 : ts);
    return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

function renderVisitasReport(data) {
    const el = document.getElementById('visitas-content');
    if (!el) return;

    if (!data.length) {
        el.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-chart-line"></i>
            <h3>Nenhuma visita registrada</h3>
            <p>Aguarde visitantes acessarem o site.</p>
        </div>`;
        return;
    }

    const filtered = getFilteredVisitas(data);
    const hoje = new Date().toISOString().slice(0, 10);
    const ontemStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const days = parseInt(visitasFilter.period) || 14;

    // KPIs
    const uniqueFiltered  = new Set(filtered.map(v => v.deviceId)).size;
    const visitasHoje     = data.filter(v => v.date === hoje).length;
    const visitasOntem    = data.filter(v => v.date === ontemStr).length;
    const porDia = {};
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        porDia[d.toISOString().slice(0, 10)] = 0;
    }
    filtered.forEach(v => { if (v.date && porDia.hasOwnProperty(v.date)) porDia[v.date]++; });
    const diasAtivos = Object.values(porDia).filter(v => v > 0).length;
    const mediaDiaria = diasAtivos ? Math.round(filtered.length / diasAtivos) : 0;
    const maxDia = Math.max(...Object.values(porDia), 1);

    // Distribuições
    const browsers = {}, oss = {}, devices = { mobile: 0, tablet: 0, desktop: 0 };
    const seenDev = new Set();
    const porPagina = {};
    filtered.forEach(v => {
        const p = parseUA(v.userAgent);
        devices[p.device]++;
        oss[p.os] = (oss[p.os] || 0) + 1;
        porPagina[v.page] = (porPagina[v.page] || 0) + 1;
        if (!seenDev.has(v.deviceId)) {
            seenDev.add(v.deviceId);
            browsers[p.browser] = (browsers[p.browser] || 0) + 1;
        }
    });

    // Heatmap por hora
    const porHora = Array(24).fill(0);
    filtered.forEach(v => {
        try {
            const ts = v.timestamp;
            const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : null);
            if (d) porHora[d.getHours()]++;
        } catch (_) {}
    });
    const maxHora = Math.max(...porHora, 1);

    const allPages = [...new Set(data.map(v => v.page))];
    const totalVisits = filtered.length;

    // Trend hoje vs ontem
    const trendHtml = visitasOntem === 0
        ? `<span class="vkpi-trend trend-eq">— sem dados ontem</span>`
        : visitasHoje > visitasOntem
            ? `<span class="vkpi-trend trend-up"><i class="fas fa-arrow-up" style="font-size:.55rem;"></i> +${visitasHoje - visitasOntem} vs ontem</span>`
            : visitasHoje < visitasOntem
                ? `<span class="vkpi-trend trend-dn"><i class="fas fa-arrow-down" style="font-size:.55rem;"></i> ${visitasHoje - visitasOntem} vs ontem</span>`
                : `<span class="vkpi-trend trend-eq">= igual a ontem</span>`;

    el.innerHTML = `
    <div class="visitas-filters-bar">
        <label><i class="fas fa-filter"></i> Filtros</label>
        <select class="vf-select" onchange="visitasFilter.page=this.value;renderVisitasReport(visitasData)">
            <option value="">Todas as páginas</option>
            ${allPages.map(p => `<option value="${p}" ${visitasFilter.page === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
        <select class="vf-select" onchange="visitasFilter.period=this.value;renderVisitasReport(visitasData)">
            <option value="7"  ${visitasFilter.period === '7'  ? 'selected' : ''}>7 dias</option>
            <option value="14" ${visitasFilter.period === '14' ? 'selected' : ''}>14 dias</option>
            <option value="30" ${visitasFilter.period === '30' ? 'selected' : ''}>30 dias</option>
        </select>
        <span class="visitas-count-chip">${filtered.length} registros</span>
    </div>

    <div class="visitas-kpi-grid">
        <div class="vkpi-card">
            <div class="vkpi-icon" style="background:var(--accent-soft);color:var(--accent);"><i class="fas fa-eye"></i></div>
            <div class="vkpi-value">${totalVisits.toLocaleString('pt-BR')}</div>
            <div class="vkpi-label">Visitas no período</div>
        </div>
        <div class="vkpi-card">
            <div class="vkpi-icon" style="background:var(--green-soft);color:var(--green);"><i class="fas fa-users"></i></div>
            <div class="vkpi-value">${uniqueFiltered}</div>
            <div class="vkpi-label">Dispositivos únicos</div>
        </div>
        <div class="vkpi-card">
            <div class="vkpi-icon" style="background:var(--purple-soft);color:var(--purple);"><i class="fas fa-calendar-day"></i></div>
            <div class="vkpi-value">${visitasHoje}</div>
            <div class="vkpi-label">Hoje</div>
            ${trendHtml}
        </div>
        <div class="vkpi-card">
            <div class="vkpi-icon" style="background:var(--amber-soft);color:var(--amber);"><i class="fas fa-chart-line"></i></div>
            <div class="vkpi-value">${mediaDiaria}</div>
            <div class="vkpi-label">Média diária</div>
        </div>
        <div class="vkpi-card">
            <div class="vkpi-icon" style="background:rgba(239,68,68,.1);color:var(--red);"><i class="fas fa-mobile-alt"></i></div>
            <div class="vkpi-value">${devices.mobile}</div>
            <div class="vkpi-label">Acessos mobile</div>
        </div>
        <div class="vkpi-card">
            <div class="vkpi-icon" style="background:var(--accent-soft);color:var(--accent);"><i class="fas fa-desktop"></i></div>
            <div class="vkpi-value">${devices.desktop}</div>
            <div class="vkpi-label">Acessos desktop</div>
        </div>
    </div>

    <div class="dashboard-card" style="margin-bottom:1.2rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">
            <h3><i class="fas fa-chart-bar"></i> Visitas por dia — últimos ${days} dias</h3>
            <span style="font-size:.72rem;color:var(--text-muted);">pico: <strong style="color:var(--accent);">${maxDia}</strong></span>
        </div>
        <div class="visits-timeline">
            ${Object.entries(porDia).map(([date, count]) => {
                const d = new Date(date + 'T12:00:00');
                const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const isToday = date === hoje;
                const pct = Math.max((count / maxDia) * 100, count > 0 ? 4 : 1);
                return `<div class="vt-col">
                    <div class="vt-bar-wrap">
                        <div class="vt-bar" style="height:${pct}%;${isToday ? 'background:linear-gradient(180deg,var(--accent) 0%,rgba(59,130,246,.4) 100%);box-shadow:0 0 10px var(--accent-glow);' : ''}" title="${count} em ${label}"></div>
                    </div>
                    <div class="vt-count" style="${isToday ? 'color:var(--accent);' : ''}">${count > 0 ? count : ''}</div>
                    <div class="vt-label" style="${isToday ? 'color:var(--accent);font-weight:700;' : ''}">${label}</div>
                </div>`;
            }).join('')}
        </div>
    </div>

    <div class="dashboard-card" style="margin-bottom:1.2rem;">
        <h3 style="margin-bottom:.8rem;"><i class="fas fa-clock"></i> Horários mais ativos</h3>
        <div class="hh-label"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span></div>
        <div class="hour-heatmap">
            ${porHora.map((count, h) => {
                const pct = count / maxHora;
                const alpha = count === 0 ? '.06' : (0.15 + pct * 0.85).toFixed(2);
                return `<div class="hh-cell" style="background:rgba(59,130,246,${alpha});" title="${h}h — ${count} visitas"></div>`;
            }).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:.5rem;margin-top:.55rem;">
            <span style="font-size:.62rem;color:var(--text-muted);">Menos</span>
            ${['.07','.2','.4','.65','.9'].map(a => `<div style="width:16px;height:10px;border-radius:3px;background:rgba(59,130,246,${a});"></div>`).join('')}
            <span style="font-size:.62rem;color:var(--text-muted);">Mais</span>
        </div>
    </div>

    <div class="dist-cards-row">
        <div class="dist-card">
            <div class="dist-card-title"><i class="fas fa-file-alt"></i> Por Página</div>
            ${Object.entries(porPagina).sort((a, b) => b[1] - a[1]).map(([pg, n]) => {
                const c = pageColor(pg);
                return `<div class="dist-row">
                    <div class="dist-label">${pageBadge(pg)}</div>
                    <div class="dist-track"><div class="dist-fill" style="width:${totalVisits ? Math.round((n/totalVisits)*100) : 0}%;background:${c};"></div></div>
                    <div class="dist-val">${n}</div>
                </div>`;
            }).join('')}
        </div>
        <div class="dist-card">
            <div class="dist-card-title"><i class="fas fa-mobile-alt"></i> Dispositivos</div>
            ${[['desktop','Desktop','var(--green)'],['mobile','Mobile','var(--accent)'],['tablet','Tablet','var(--purple)']].map(([k,label,color]) => `
            <div class="dist-row">
                <div class="dist-label" style="color:${color};">${deviceIconHTML(k)} ${label}</div>
                <div class="dist-track"><div class="dist-fill" style="width:${totalVisits ? Math.round((devices[k]/totalVisits)*100) : 0}%;background:${color};opacity:.75;"></div></div>
                <div class="dist-val">${devices[k]}</div>
            </div>`).join('')}
        </div>
        <div class="dist-card">
            <div class="dist-card-title"><i class="fas fa-globe"></i> Navegadores</div>
            ${Object.entries(browsers).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([br, n]) => `
            <div class="dist-row">
                <div class="dist-label">${br}</div>
                <div class="dist-track"><div class="dist-fill" style="width:${seenDev.size ? Math.round((n/seenDev.size)*100) : 0}%;background:var(--accent);opacity:.65;"></div></div>
                <div class="dist-val">${n}</div>
            </div>`).join('')}
        </div>
        <div class="dist-card">
            <div class="dist-card-title"><i class="fas fa-laptop"></i> Sistemas</div>
            ${Object.entries(oss).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([os, n]) => `
            <div class="dist-row">
                <div class="dist-label">${os}</div>
                <div class="dist-track"><div class="dist-fill" style="width:${totalVisits ? Math.round((n/totalVisits)*100) : 0}%;background:var(--purple);opacity:.7;"></div></div>
                <div class="dist-val">${n}</div>
            </div>`).join('')}
        </div>
    </div>

    <div class="visits-table-wrap">
        <div class="visits-table-header">
            <h3><i class="fas fa-list-ul"></i> Registros individuais</h3>
            <span class="vt-count-badge">${filtered.length} entradas${filtered.length > 100 ? ' · mostrando 100' : ''}</span>
        </div>
        <div style="overflow-x:auto;">
        <table class="vt-table">
            <thead><tr>
                <th>#</th><th>Data / Hora</th><th>Página</th><th>Dispositivo</th><th>Navegador · OS</th><th>Device ID</th>
            </tr></thead>
            <tbody>
                ${filtered.slice(0, 100).map((v, i) => {
                    const p = parseUA(v.userAgent);
                    return `<tr>
                        <td style="color:var(--text-muted);">${i + 1}</td>
                        <td style="white-space:nowrap;">${formatTimestamp(v.timestamp)}</td>
                        <td>${pageBadge(v.page || '—')}</td>
                        <td>${deviceIconHTML(p.device)} <span style="color:var(--text-secondary);margin-left:.3rem;">${p.device}</span></td>
                        <td style="color:var(--text-muted);">${p.browser} · ${p.os}</td>
                        <td style="font-family:monospace;font-size:.7rem;color:var(--text-muted);" title="${v.deviceId||''}">${(v.deviceId||'—').slice(0,20)}…</td>
                    </tr>`;
                }).join('')}
                ${filtered.length > 100 ? `<tr><td colspan="6" style="text-align:center;padding:1rem;color:var(--text-muted);font-size:.78rem;">… e mais ${filtered.length - 100} registros</td></tr>` : ''}
            </tbody>
        </table>
        </div>
    </div>

    <div style="display:flex;justify-content:flex-end;gap:.7rem;flex-wrap:wrap;margin-top:.5rem;">
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

// ========== SEGURANÇA & HISTÓRICO DE LOGINS ==========

// Timer ao vivo para countdown da sessão
let _segurancaLiveTimer = null;

function startSessaoCountdown() {
    stopSessaoCountdown();
    _segurancaLiveTimer = setInterval(() => {
        const el = document.getElementById('sessao-countdown');
        const barEl = document.getElementById('sessao-progress-bar');
        const statusEl = document.getElementById('sessao-status-live');
        if (!el) { stopSessaoCountdown(); return; }
        const sessionStart = parseInt(localStorage.getItem(SESSION_KEY) || Date.now());
        const expires = sessionStart + SESSION_DURATION_MS;
        const remaining = expires - Date.now();
        const elapsed = Date.now() - sessionStart;
        const pct = Math.max(0, Math.min(100, (remaining / SESSION_DURATION_MS) * 100));
        if (remaining <= 0) {
            el.textContent = 'Expirada';
            el.style.color = 'var(--red)';
            if (barEl) { barEl.style.width = '0%'; barEl.style.background = 'var(--red)'; }
            stopSessaoCountdown();
            return;
        }
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        el.style.color = h < 1 ? 'var(--amber)' : 'var(--green)';
        if (barEl) {
            barEl.style.width = pct + '%';
            barEl.style.background = h < 1 ? 'var(--amber)' : 'var(--green)';
        }
        if (statusEl) {
            const elapsedH = Math.floor(elapsed / 3600000);
            const elapsedM = Math.floor((elapsed % 3600000) / 60000);
            statusEl.textContent = `Sessão ativa há ${elapsedH}h ${elapsedM}min`;
        }
    }, 1000);
}

function stopSessaoCountdown() {
    if (_segurancaLiveTimer) { clearInterval(_segurancaLiveTimer); _segurancaLiveTimer = null; }
}

async function loadSeguranca() {
    if (!db) return;
    stopSessaoCountdown();
    const loading = document.getElementById('seguranca-loading');
    const content = document.getElementById('seguranca-content');
    if (loading) loading.style.display = 'flex';
    if (content) content.style.display = 'none';

    try {
        await marcarSessoesExpiradas();
        const snap = await db.collection('login_historico')
            .orderBy('loginAt', 'desc').limit(50).get();
        const logins = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));

        if (loading) loading.style.display = 'none';
        if (content) { content.style.display = 'block'; renderSeguranca(logins); }

        const suspeitos = logins.filter(l => l.status === 'suspeito').length;
        const badge = document.getElementById('badge-seguranca');
        if (badge) { badge.style.display = suspeitos > 0 ? '' : 'none'; badge.textContent = suspeitos > 0 ? suspeitos : '!'; }

        // Inicia o countdown ao vivo após renderizar
        startSessaoCountdown();
    } catch(e) {
        if (loading) loading.style.display = 'none';
        if (content) { content.style.display = 'block'; content.innerHTML = '<div class="empty-state"><i class="fas fa-shield-alt"></i><h3>Erro ao carregar</h3><p>' + e.message + '</p></div>'; }
        console.error('loadSeguranca:', e);
    }
}

async function marcarSessoesExpiradas() {
    try {
        const agora = firebase.firestore.Timestamp.now();
        const snap = await db.collection('login_historico')
            .where('status', '==', 'ativo').where('expiresAt', '<', agora).get();
        const batch = db.batch();
        snap.docs.forEach(d => batch.update(d.ref, { status: 'expirado' }));
        if (snap.size > 0) await batch.commit();
    } catch(_) {}
}

function riskBadge(score) {
    if (score >= 50) return `<span style="background:rgba(239,68,68,.2);color:#ef4444;padding:.2rem .7rem;border-radius:20px;font-size:.72rem;font-weight:700;display:inline-flex;align-items:center;gap:.3rem;"><i class="fas fa-exclamation-triangle"></i> RISCO ALTO (${score})</span>`;
    if (score >= 25) return `<span style="background:rgba(245,158,11,.2);color:#f59e0b;padding:.2rem .7rem;border-radius:20px;font-size:.72rem;font-weight:700;display:inline-flex;align-items:center;gap:.3rem;"><i class="fas fa-shield-alt"></i> RISCO MÉDIO (${score})</span>`;
    return `<span style="background:rgba(34,197,94,.15);color:#22c55e;padding:.2rem .7rem;border-radius:20px;font-size:.72rem;font-weight:700;display:inline-flex;align-items:center;gap:.3rem;"><i class="fas fa-check-shield"></i> Baixo (${score})</span>`;
}

function statusLoginBadge(status) {
    const map = {
        ativo:     { bg:'rgba(34,197,94,.15)',   color:'#22c55e', label:'🟢 Ativo' },
        encerrado: { bg:'rgba(148,163,184,.15)', color:'#94a3b8', label:'⚪ Encerrado' },
        expirado:  { bg:'rgba(245,158,11,.15)',  color:'#f59e0b', label:'🟡 Expirado' },
        suspeito:  { bg:'rgba(239,68,68,.15)',   color:'#ef4444', label:'🔴 Suspeito' },
        removido:  { bg:'rgba(239,68,68,.2)',    color:'#ef4444', label:'🚫 Removido' },
    };
    const s = map[status] || map.encerrado;
    return `<span style="background:${s.bg};color:${s.color};padding:.2rem .65rem;border-radius:20px;font-size:.72rem;font-weight:700;white-space:nowrap;">${s.label}</span>`;
}

function deviceIcon(device) {
    if (!device) return '💻';
    const d = device.toLowerCase();
    if (d.includes('smartphone') || d.includes('iphone')) return '📱';
    if (d.includes('tablet') || d.includes('ipad')) return '📲';
    if (d.includes('tv')) return '📺';
    return '💻';
}

function renderSeguranca(logins) {
    const content = document.getElementById('seguranca-content');
    if (!content) return;
    const sessionStart = localStorage.getItem(SESSION_KEY);
    const currentLoginId = currentUser ? currentUser.uid + '_' + sessionStart : null;
    const total = logins.length;
    const ativos = logins.filter(l => l.status === 'ativo').length;
    const suspeitos = logins.filter(l => l.status === 'suspeito').length;

    content.innerHTML = `
    <div class="stats-grid" style="margin-bottom:1.5rem;">
        <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-history"></i></div>
            <div class="stat-info"><span class="stat-value">${total}</span><span class="stat-label">Logins registrados</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
            <div class="stat-info"><span class="stat-value">${ativos}</span><span class="stat-label">Sessões ativas</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background:var(--red-soft);color:var(--red);"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="stat-info"><span class="stat-value" style="color:${suspeitos>0?'var(--red)':'inherit'}">${suspeitos}</span><span class="stat-label">Suspeitos marcados</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon amber"><i class="fas fa-clock"></i></div>
            <div class="stat-info"><span class="stat-value" style="font-size:.85rem;">${logins[0]?.loginAtStr || '—'}</span><span class="stat-label">Último acesso</span></div>
        </div>
    </div>

    <!-- SESSÃO ATUAL COM COUNTDOWN AO VIVO -->
    <div class="dashboard-card sessao-atual-card" style="margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.8rem;margin-bottom:1.1rem;">
            <div style="display:flex;align-items:center;gap:.6rem;">
                <span style="width:9px;height:9px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:pulse 1.5s infinite;display:inline-block;flex-shrink:0;"></span>
                <h3 style="margin:0;">Sessão Atual</h3>
            </div>
            <div style="display:flex;align-items:center;gap:.8rem;flex-wrap:wrap;">
                <span id="sessao-status-live" style="font-size:.75rem;color:var(--text-muted);"></span>
                <div style="display:flex;align-items:center;gap:.5rem;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:.3rem .8rem;">
                    <i class="fas fa-hourglass-half" style="color:var(--green);font-size:.8rem;"></i>
                    <span style="font-size:.72rem;color:var(--text-muted);">expira em</span>
                    <span id="sessao-countdown" style="font-size:1rem;font-weight:700;font-family:monospace;color:var(--green);min-width:70px;">—</span>
                </div>
            </div>
        </div>
        <!-- Barra de progresso da sessão -->
        <div style="background:var(--bg-elevated);border-radius:99px;height:4px;margin-bottom:1.1rem;overflow:hidden;">
            <div id="sessao-progress-bar" style="height:100%;border-radius:99px;background:var(--green);transition:width .9s linear;width:100%;"></div>
        </div>
        ${renderSessaoAtualCompleto()}
    </div>

    <!-- Ações rápidas -->
    <div style="display:flex;gap:.7rem;flex-wrap:wrap;margin-bottom:1.5rem;align-items:center;">
        <button onclick="encerrarTodasSessoes()" class="btn-danger" style="gap:.5rem;">
            <i class="fas fa-ban"></i> Encerrar outras sessões
        </button>
        <button onclick="limparHistoricoAntigo()" class="btn-secondary" style="gap:.5rem;">
            <i class="fas fa-broom"></i> Limpar histórico antigo
        </button>
        <button onclick="loadSeguranca()" class="btn-secondary" style="gap:.5rem;">
            <i class="fas fa-sync-alt"></i> Atualizar
        </button>
    </div>

    <!-- Legenda -->
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem;padding:.7rem 1rem;background:var(--bg-elevated);border-radius:var(--radius-sm);border:1px solid var(--border);">
        <span style="font-size:.75rem;color:var(--text-muted);font-weight:600;">STATUS:</span>
        ${statusLoginBadge('ativo')} ${statusLoginBadge('expirado')} ${statusLoginBadge('encerrado')} ${statusLoginBadge('suspeito')} ${statusLoginBadge('removido')}
    </div>

    <!-- Histórico -->
    <div style="display:flex;flex-direction:column;gap:.8rem;">
        ${logins.map(l => renderLoginCard(l, currentLoginId)).join('')}
    </div>`;
}

function renderSessaoAtualCompleto() {
    const sessionStart = parseInt(localStorage.getItem(SESSION_KEY) || Date.now());
    const ua = navigator.userAgent;
    // Pega IP/localização do registro salvo no Firestore (se disponível)
    const sessionId = currentUser ? currentUser.uid + '_' + localStorage.getItem(SESSION_KEY) : null;
    // Tenta pegar dados do login atual da imoveisData (já carregado)
    return `
    <div class="login-hist-grid">
        <div class="seguranca-info-item">
            <span class="seguranca-info-label"><i class="fas fa-user"></i> Usuário</span>
            <span class="seguranca-info-val">${currentUser?.email || '—'}</span>
        </div>
        <div class="seguranca-info-item">
            <span class="seguranca-info-label"><i class="fas fa-sign-in-alt"></i> Entrada</span>
            <span class="seguranca-info-val">${new Date(sessionStart).toLocaleString('pt-BR')}</span>
        </div>
        <div class="seguranca-info-item">
            <span class="seguranca-info-label"><i class="fas fa-calendar-times"></i> Expira em</span>
            <span class="seguranca-info-val">${new Date(sessionStart + SESSION_DURATION_MS).toLocaleString('pt-BR')}</span>
        </div>
        <div class="seguranca-info-item">
            <span class="seguranca-info-label"><i class="fas fa-globe"></i> Navegador</span>
            <span class="seguranca-info-val">${detectBrowser(ua)} ${detectBrowserVersion(ua)}</span>
        </div>
        <div class="seguranca-info-item">
            <span class="seguranca-info-label"><i class="fas fa-desktop"></i> Sistema</span>
            <span class="seguranca-info-val">${detectOS(ua)}</span>
        </div>
        <div class="seguranca-info-item">
            <span class="seguranca-info-label"><i class="fas fa-mobile-alt"></i> Dispositivo</span>
            <span class="seguranca-info-val">${detectDevice(ua)}</span>
        </div>
        <div class="seguranca-info-item">
            <span class="seguranca-info-label"><i class="fas fa-expand-arrows-alt"></i> Tela / Janela</span>
            <span class="seguranca-info-val">${screen.width}×${screen.height} / ${window.innerWidth}×${window.innerHeight}</span>
        </div>
        <div class="seguranca-info-item">
            <span class="seguranca-info-label"><i class="fas fa-clock"></i> Fuso horário</span>
            <span class="seguranca-info-val">${Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
        </div>
        <div class="seguranca-info-item">
            <span class="seguranca-info-label"><i class="fas fa-language"></i> Idioma</span>
            <span class="seguranca-info-val">${navigator.language}</span>
        </div>
        <div class="seguranca-info-item">
            <span class="seguranca-info-label"><i class="fas fa-microchip"></i> CPU cores</span>
            <span class="seguranca-info-val">${navigator.hardwareConcurrency || '—'}</span>
        </div>
        <div class="seguranca-info-item">
            <span class="seguranca-info-label"><i class="fas fa-memory"></i> RAM</span>
            <span class="seguranca-info-val">${navigator.deviceMemory ? navigator.deviceMemory + ' GB' : '—'}</span>
        </div>
        <div class="seguranca-info-item" id="sessao-ip-box">
            <span class="seguranca-info-label"><i class="fas fa-network-wired"></i> IP / Localização</span>
            <span class="seguranca-info-val" style="color:var(--text-muted);font-size:.72rem;">Carregando...</span>
        </div>
    </div>`;
}

// Carrega IP da sessão atual de forma assíncrona após renderizar
async function carregarIPSessaoAtual() {
    const box = document.getElementById('sessao-ip-box');
    if (!box) return;
    // Primeiro tenta buscar do Firestore (registro de login)
    if (db && currentUser) {
        try {
            const sessionStart = localStorage.getItem(SESSION_KEY);
            const loginId = currentUser.uid + '_' + sessionStart;
            const doc = await db.collection('login_historico').doc(loginId).get();
            if (doc.exists) {
                const d = doc.data();
                if (d.ip && d.ip !== '—') {
                    const loc = [d.cidade, d.regiao, d.pais].filter(x => x && x !== '—').join(', ');
                    box.querySelector('.seguranca-info-val').innerHTML = `
                        <strong style="font-size:.82rem;">${d.ip}</strong>
                        ${d.isProxy && d.isProxy.includes('SIM') ? '<span style="color:var(--red);font-size:.7rem;margin-left:.3rem;">⚠️ Proxy/VPN</span>' : ''}
                        <br><span style="font-size:.72rem;color:var(--text-muted);">${loc || '—'}</span>
                        <br><span style="font-size:.7rem;color:var(--text-muted);">${d.isp || '—'}</span>
                        ${d.ip !== '—' ? '<a href="https://ipinfo.io/' + d.ip + '" target="_blank" style="font-size:.68rem;color:var(--accent);display:block;margin-top:.2rem;"><i class="fas fa-external-link-alt"></i> Ver detalhes</a>' : ''}
                    `;
                    return;
                }
            }
        } catch(_) {}
    }
    // Fallback: busca ao vivo
    try {
        const r = await fetch('https://api.ipify.org?format=json');
        const d = await r.json();
        const ip = d.ip || '—';
        box.querySelector('.seguranca-info-val').innerHTML = `<strong>${ip}</strong> <a href="https://ipinfo.io/${ip}" target="_blank" style="font-size:.68rem;color:var(--accent);"><i class="fas fa-external-link-alt"></i></a>`;
    } catch(_) {
        const val = box.querySelector('.seguranca-info-val');
        if (val) val.textContent = '—';
    }
}

function renderLoginCard(l, currentLoginId) {
    const isCurrentSession = l._docId === currentLoginId || l.sessionId === currentLoginId;
    const isSuspeito = l.status === 'suspeito';
    const risk = l.riskScore || 0;
    const borderColor = isCurrentSession ? 'var(--green)' : isSuspeito ? 'var(--red)' : risk >= 50 ? 'var(--amber)' : 'var(--border)';
    const bgColor = isCurrentSession ? 'rgba(34,197,94,.04)' : isSuspeito ? 'rgba(239,68,68,.04)' : '';
    const loc = [l.cidade, l.regiao, l.pais].filter(x => x && x !== '—').join(', ');

    return `
    <div class="login-hist-card" style="border-left:3px solid ${borderColor};background:${bgColor};">
        <div class="login-hist-header">
            <div style="display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;">
                <span style="font-size:1.5rem;">${deviceIcon(l.device)}</span>
                <div>
                    <div style="font-weight:600;font-size:.88rem;color:var(--text-primary);display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;">
                        ${l.browser || '—'} ${l.browserVer || ''} · ${l.os || '—'}
                        ${isCurrentSession ? '<span style="background:rgba(34,197,94,.2);color:var(--green);font-size:.68rem;padding:.1rem .5rem;border-radius:20px;font-weight:700;">★ Esta sessão</span>' : ''}
                    </div>
                    <div style="font-size:.74rem;color:var(--text-muted);margin-top:.15rem;display:flex;gap:.5rem;flex-wrap:wrap;">
                        <span>${l.device || '—'}</span>
                        ${l.ip && l.ip !== '—' ? `<span>· <strong style="color:var(--text-secondary);">${l.ip}</strong></span>` : ''}
                        ${loc ? `<span>· ${loc}</span>` : ''}
                        <span>· ${l.loginAtStr || '—'}</span>
                    </div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;">
                ${risk > 0 ? riskBadge(risk) : ''}
                ${statusLoginBadge(l.status || 'encerrado')}
                ${!isCurrentSession ? `
                <button onclick="marcarSuspeito('${l._docId}', '${l.status}')" class="btn-secondary" style="padding:.25rem .6rem;font-size:.72rem;gap:.3rem;">
                    <i class="fas fa-${isSuspeito ? 'check' : 'exclamation-triangle'}" style="color:${isSuspeito ? 'var(--green)' : 'var(--amber)'}"></i>
                    ${isSuspeito ? 'Desmarcar' : 'Suspeito'}
                </button>
                <button onclick="revogarAcesso('${l._docId}')" class="btn-danger" style="padding:.25rem .6rem;font-size:.72rem;gap:.3rem;">
                    <i class="fas fa-ban"></i> Revogar
                </button>` : ''}
            </div>
        </div>

        <div class="login-hist-grid">
            <div class="seguranca-info-item"><span class="seguranca-info-label"><i class="fas fa-sign-in-alt"></i> Login em</span><span class="seguranca-info-val">${l.loginAtStr || '—'}</span></div>
            <div class="seguranca-info-item"><span class="seguranca-info-label"><i class="fas fa-sign-out-alt"></i> Logout / Expirou</span><span class="seguranca-info-val">${l.logoutAtStr || l.expiresAtStr || '—'}</span></div>
            <div class="seguranca-info-item">
                <span class="seguranca-info-label"><i class="fas fa-network-wired"></i> Endereço IP</span>
                <span class="seguranca-info-val" style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;">
                    <strong>${l.ip || '—'}</strong>
                    ${l.ip && l.ip !== '—' ? `<a href="https://ipinfo.io/${l.ip}" target="_blank" style="color:var(--accent);font-size:.7rem;" title="Ver detalhes do IP"><i class="fas fa-external-link-alt"></i></a>` : ''}
                </span>
            </div>
            <div class="seguranca-info-item"><span class="seguranca-info-label"><i class="fas fa-map-marker-alt"></i> Localização</span><span class="seguranca-info-val">${loc || '—'}${l.cep && l.cep !== '—' ? ' <span style="color:var(--text-muted);font-size:.7rem;">CEP ' + l.cep + '</span>' : ''}</span></div>
            <div class="seguranca-info-item"><span class="seguranca-info-label"><i class="fas fa-wifi"></i> Provedor (ISP)</span><span class="seguranca-info-val">${l.isp || '—'}</span></div>
            <div class="seguranca-info-item"><span class="seguranca-info-label"><i class="fas fa-server"></i> ASN / Org</span><span class="seguranca-info-val" style="font-size:.74rem;">${l.asn || l.org || '—'}</span></div>
            <div class="seguranca-info-item">
                <span class="seguranca-info-label"><i class="fas fa-user-secret"></i> VPN / Proxy</span>
                <span class="seguranca-info-val">${l.isProxy || l.isVPN || '—'}</span>
            </div>
            <div class="seguranca-info-item"><span class="seguranca-info-label"><i class="fas fa-building"></i> Data center</span><span class="seguranca-info-val">${l.isHosting || '—'}</span></div>
            <div class="seguranca-info-item"><span class="seguranca-info-label"><i class="fas fa-signal"></i> Conexão</span><span class="seguranca-info-val">${l.connectionType || '—'} ${l.connectionSpeed && l.connectionSpeed !== '—' ? '· ' + l.connectionSpeed : ''}</span></div>
            <div class="seguranca-info-item"><span class="seguranca-info-label"><i class="fas fa-clock"></i> Fuso horário</span><span class="seguranca-info-val">${l.timezone || '—'}</span></div>
            <div class="seguranca-info-item"><span class="seguranca-info-label"><i class="fas fa-language"></i> Idioma(s)</span><span class="seguranca-info-val">${l.languages || l.language || '—'}</span></div>
            <div class="seguranca-info-item"><span class="seguranca-info-label"><i class="fas fa-expand-arrows-alt"></i> Tela / Janela</span><span class="seguranca-info-val">${l.screenW && l.screenH ? l.screenW + '×' + l.screenH : '—'}${l.viewport ? ' / ' + l.viewport : ''}</span></div>
            <div class="seguranca-info-item"><span class="seguranca-info-label"><i class="fas fa-microchip"></i> CPU cores</span><span class="seguranca-info-val">${l.cores || '—'}</span></div>
            <div class="seguranca-info-item"><span class="seguranca-info-label"><i class="fas fa-memory"></i> RAM</span><span class="seguranca-info-val">${l.ram || '—'}</span></div>
            <div class="seguranca-info-item"><span class="seguranca-info-label"><i class="fas fa-hand-pointer"></i> Touch</span><span class="seguranca-info-val">${l.touchPoints !== undefined ? (l.touchPoints > 0 ? l.touchPoints + ' pontos' : 'Não') : '—'}</span></div>
            <div class="seguranca-info-item"><span class="seguranca-info-label"><i class="fas fa-ethernet"></i> MAC Address</span><span class="seguranca-info-val" style="color:var(--text-muted);font-size:.7rem;">Bloqueado pelo navegador</span></div>
        </div>

        ${l.lat && l.lat !== '—' ? `
        <div style="margin-top:.6rem;display:flex;align-items:center;gap:.5rem;font-size:.74rem;color:var(--text-muted);">
            <i class="fas fa-map-pin" style="color:var(--accent);"></i>
            Coordenadas: ${l.lat}, ${l.lon}
            <a href="https://www.google.com/maps?q=${l.lat},${l.lon}" target="_blank" style="color:var(--accent);"><i class="fas fa-external-link-alt"></i> Ver no mapa</a>
        </div>` : ''}

        <details style="margin-top:.6rem;">
            <summary style="font-size:.72rem;color:var(--text-muted);cursor:pointer;user-select:none;">▶ Ver User Agent completo</summary>
            <div style="margin-top:.4rem;font-size:.68rem;color:var(--text-muted);word-break:break-all;font-family:monospace;background:var(--bg-elevated);padding:.5rem;border-radius:4px;border:1px solid var(--border);">${l.ua || '—'}</div>
        </details>

        ${l.revokedAt ? `<div style="margin-top:.6rem;padding:.4rem .8rem;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:6px;font-size:.75rem;color:var(--red);"><i class="fas fa-ban"></i> Acesso revogado em ${l.revokedAtStr || '—'}</div>` : ''}
        ${isSuspeito && l.suspeitoNote ? `<div style="margin-top:.6rem;padding:.4rem .8rem;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:6px;font-size:.75rem;color:var(--amber);"><i class="fas fa-exclamation-triangle"></i> ${l.suspeitoNote}</div>` : ''}
    </div>`;
}

async function marcarSuspeito(docId, statusAtual) {
    if (!db) return;
    try {
        const novoStatus = statusAtual === 'suspeito' ? 'encerrado' : 'suspeito';
        await db.collection('login_historico').doc(docId).update({
            status: novoStatus,
            suspeitoNote: novoStatus === 'suspeito' ? 'Marcado manualmente pelo admin em ' + new Date().toLocaleString('pt-BR') : null,
        });
        showToast(novoStatus === 'suspeito' ? '⚠️ Login marcado como suspeito' : '✅ Marcação removida');
        loadSeguranca();
    } catch(e) { showToast('Erro ao atualizar','error'); }
}

async function revogarAcesso(docId) {
    if (!db) return;
    deleteId = docId;
    const modal = document.getElementById('delete-modal');
    const p = document.querySelector('#delete-modal .modal-confirm p');
    const h3 = document.querySelector('#delete-modal .modal-confirm h3');
    const btn = document.getElementById('confirm-delete-fn');
    if (h3) h3.textContent = 'Revogar Acesso';
    if (p) p.textContent = 'Isso marcará esta sessão como removida/revogada no histórico.';
    if (btn) btn.dataset.mode = 'revogar';
    if (modal) modal.classList.add('active');
}

async function confirmarRevogacao(docId) {
    if (!db) return;
    try {
        await db.collection('login_historico').doc(docId).update({
            status: 'removido',
            revokedAt: firebase.firestore.FieldValue.serverTimestamp(),
            revokedAtStr: new Date().toLocaleString('pt-BR'),
        });
        await db.collection('config').doc('security').set({
            blockedSessions: firebase.firestore.FieldValue.arrayUnion(docId),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        showToast('🚫 Acesso revogado!');
        loadSeguranca();
    } catch(e) { showToast('Erro ao revogar','error'); }
}

async function encerrarTodasSessoes() {
    if (!db || !currentUser) return;
    const sessionStart = localStorage.getItem(SESSION_KEY);
    const currentId = currentUser.uid + '_' + sessionStart;
    try {
        const snap = await db.collection('login_historico').where('status', '==', 'ativo').get();
        const batch = db.batch();
        let count = 0;
        snap.docs.forEach(d => {
            if (d.id !== currentId) {
                batch.update(d.ref, { status: 'encerrado', logoutAtStr: new Date().toLocaleString('pt-BR'), forcedLogout: true });
                count++;
            }
        });
        if (count > 0) { await batch.commit(); showToast('✅ ' + count + ' sessão(ões) encerrada(s)!'); }
        else showToast('Nenhuma outra sessão ativa.');
        loadSeguranca();
    } catch(e) { showToast('Erro ao encerrar sessões','error'); }
}

async function limparHistoricoAntigo() {
    if (!db) return;
    const limite = new Date();
    limite.setDate(limite.getDate() - 30);
    const ts = firebase.firestore.Timestamp.fromDate(limite);
    try {
        const snap = await db.collection('login_historico')
            .where('loginAt', '<', ts)
            .where('status', 'in', ['encerrado', 'expirado'])
            .get();
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        if (snap.size > 0) { await batch.commit(); showToast('🗑️ ' + snap.size + ' registro(s) antigo(s) removido(s).'); }
        else showToast('Nenhum histórico antigo para limpar.');
        loadSeguranca();
    } catch(e) { showToast('Erro ao limpar histórico','error'); }
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
// ── Helper: mostra/oculta campos de terreno e atualiza opacidade ──
function _syncTipoUI(tipo) {
    const isTerreno = tipo === 'Terreno';
    const terrenoFields = document.getElementById('terreno-fields');
    const quartosGroup  = document.getElementById('imovel-quartos')?.closest('.form-group');
    const vagasGroup    = document.getElementById('imovel-vagas')?.closest('.form-group');
    const condGroup     = document.getElementById('imovel-condominio')?.closest('.form-group');
    const iptuGroup     = document.getElementById('imovel-iptu')?.closest('.form-group');
    if (terrenoFields) terrenoFields.style.display = isTerreno ? '' : 'none';
    [quartosGroup, vagasGroup, condGroup, iptuGroup].forEach(g => {
        if (g) {
            g.style.opacity = isTerreno ? '.35' : '1';
            g.style.pointerEvents = isTerreno ? 'none' : '';
        }
    });
}

// ── Helper: atualiza preview da data de expiração do anúncio ──
function _updateAnuncioPreview() {
    const dias = parseInt(document.getElementById('imovel-anuncio-duracao')?.value || 0);
    const preview = document.getElementById('anuncio-expiracao-preview');
    if (!preview) return;
    if (dias === 0) {
        preview.textContent = 'Sem prazo definido — permanente';
    } else {
        const expira = new Date(Date.now() + dias * 86400000);
        preview.textContent = `Expira em: ${expira.toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric'})}`;
    }
}

function setupFormListeners() {
    document.getElementById('search-imoveis')?.addEventListener('input', e => {
        const t = e.target.value.toLowerCase();
        renderImoveisTable(imoveisData.filter(i =>
            (i.titulo||'').toLowerCase().includes(t) ||
            (i.bairro||'').toLowerCase().includes(t) ||
            (i.descricao||'').toLowerCase().includes(t)
        ));
    });
    document.getElementById('filter-bairro')?.addEventListener('change', e => {
        const b = e.target.value;
        renderImoveisTable(b ? imoveisData.filter(i => i.bairro === b) : imoveisData);
    });
    document.getElementById('imovel-preco')?.addEventListener('input', e => {
        let v = e.target.value.replace(/[^0-9]/g,'');
        if (v) e.target.value = parseInt(v).toLocaleString('pt-BR');
    });
    document.getElementById('imovel-lanc-apartir')?.addEventListener('input', e => {
        let v = e.target.value.replace(/[^0-9]/g,'');
        if (v) e.target.value = parseInt(v).toLocaleString('pt-BR');
    });
    document.getElementById('imovel-lanc-entrada')?.addEventListener('input', e => {
        let v = e.target.value.replace(/[^0-9]/g,'');
        if (v) e.target.value = parseInt(v).toLocaleString('pt-BR');
    });

    // ── Modo de preço (normal x lançamento) ──
    function _syncPrecoUI(mode) {
        const lancWrap = document.getElementById('lancamento-fields');
        const precoNormalWrap = document.getElementById('preco-normal-wrap');
        const precoInput = document.getElementById('imovel-preco');
        if (precoNormalWrap) precoNormalWrap.style.display = mode === 'lancamento' ? 'none' : '';
        if (lancWrap) lancWrap.style.display = mode === 'lancamento' ? '' : 'none';
        if (precoInput) precoInput.required = mode !== 'lancamento';
    }
    document.getElementById('imovel-preco-modo')?.addEventListener('change', e => _syncPrecoUI(e.target.value));
    _syncPrecoUI(document.getElementById('imovel-preco-modo')?.value || 'normal');

    // ── Tipo → mostra/oculta campos de terreno ──
    document.getElementById('imovel-tipo')?.addEventListener('change', e => {
        _syncTipoUI(e.target.value);
    });

    // ── Anúncio ativo → mostra duração + preview ──
    document.getElementById('imovel-anuncio-ativo')?.addEventListener('change', e => {
        const wrap = document.getElementById('anuncio-duracao-wrap');
        if (wrap) wrap.style.display = e.target.value === 'true' ? '' : 'none';
        if (e.target.value === 'true') _updateAnuncioPreview();
    });

    // ── Duração → atualiza preview ──
    document.getElementById('imovel-anuncio-duracao')?.addEventListener('change', _updateAnuncioPreview);

    document.getElementById('imovel-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const id      = document.getElementById('imovel-id').value;
        const fotos   = Array.from(document.querySelectorAll('.foto-input')).map(i => i.value.trim()).filter(Boolean);
        const videos  = Array.from(document.querySelectorAll('.video-input')).map(i => i.value.trim()).filter(Boolean);
        const getVal  = id => (document.getElementById(id)?.value || '').trim();
        const getNum  = id => parseFloat(document.getElementById(id)?.value || 0) || 0;
        const tipo    = getVal('imovel-tipo') || 'Apartamento';
        const isTerreno = tipo === 'Terreno';
        const anuncioAtivo   = getVal('imovel-anuncio-ativo') === 'true';
        const anuncioDuracao = parseInt(getVal('imovel-anuncio-duracao')) || 0;
        const precoModo = getVal('imovel-preco-modo') || 'normal';

        const data = {
            titulo:    getVal('imovel-titulo'),
            bairro:    getVal('imovel-bairro'),
            area:      parseInt(getVal('imovel-area')) || 0,
            preco:     precoModo === 'lancamento'
                ? 0
                : (parseFloat(getVal('imovel-preco').replace(/[^0-9]/g,'')) || 0),
            descricao: getVal('imovel-descricao'),
            imagem:    getVal('imovel-imagem'),
            fotos:     fotos.length ? fotos : [getVal('imovel-imagem')],
            videos,
            video:     videos[0] || null,
            tipo,
            status:    getVal('imovel-status') || 'disponivel',
            precoModo,
            lancamento: precoModo === 'lancamento' ? {
                aPartirDe: parseFloat(getVal('imovel-lanc-apartir').replace(/[^0-9]/g,'')) || null,
                entrada:   parseFloat(getVal('imovel-lanc-entrada').replace(/[^0-9]/g,'')) || null,
                parcelas:  (getVal('imovel-lanc-parcelas') || null),
            } : null,
            // Campos de imóvel normal (0 para terreno)
            quartos:    isTerreno ? 0 : (parseInt(getVal('imovel-quartos')) || 0),
            vagas:      isTerreno ? 0 : getNum('imovel-vagas'),
            condominio: isTerreno ? 0 : getNum('imovel-condominio'),
            iptu:       isTerreno ? getNum('imovel-iptu-terreno') : getNum('imovel-iptu'),
            // Campos exclusivos de terreno (null para imóveis normais)
            frente:      isTerreno ? (parseFloat(getVal('imovel-frente')) || null) : null,
            zoneamento:  isTerreno ? (getVal('imovel-zoneamento') || null) : null,
            topografia:  isTerreno ? (getVal('imovel-topografia') || null) : null,
            localidade:  isTerreno ? (getVal('imovel-localidade') || null) : null,
            precoTipo:   isTerreno ? (getVal('imovel-preco-tipo') || 'total') : 'total',
            suites: parseInt(getVal('imovel-suites')) || 0,
            banheiros: parseInt(getVal('imovel-banheiros')) || 0,
            andar: getVal('imovel-andar') ? parseInt(getVal('imovel-andar')) : null,
            sol: getVal('imovel-sol') || null,
            posicao: getVal('imovel-posicao') || null,
            mobiliado: getVal('imovel-mobiliado') || null,
            areaPrivativa: getVal('imovel-area-privativa') ? parseFloat(getVal('imovel-area-privativa')) : null,
            totalAndares: getVal('imovel-total-andares') ? parseInt(getVal('imovel-total-andares')) : null,
            // Anúncio flutuante
            anuncioAtivo,
            anuncioDuracao,
            anuncioExpiraEm: (anuncioAtivo && anuncioDuracao > 0)
                ? new Date(Date.now() + anuncioDuracao * 86400000).toISOString()
                : (anuncioAtivo ? null : null), // null = sem prazo quando permanente
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };  

        const btn = document.querySelector('#imovel-form .btn-primary');
        btn.innerHTML = '<span class="loading"></span>'; btn.disabled = true;
        try {
            if (id) {
                await db.collection('imoveis').doc(id).update(data);
                showToast('✅ Imóvel atualizado!');
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('imoveis').add(data);
                showToast('✅ Imóvel adicionado!');
            }
            resetForm(); showSection('imoveis');
        } catch(err) { showToast('Erro ao salvar — ' + err.message, 'error'); }
        finally {
            btn.innerHTML = '<i class="fas fa-save"></i><span id="btn-submit-text">Salvar Imóvel</span>';
            btn.disabled = false;
        }
        ['imovel-suites','imovel-banheiros','imovel-andar',
            'imovel-sol','imovel-posicao','imovel-mobiliado',
            'imovel-area-privativa','imovel-total-andares'].forEach(id => {
               const el = document.getElementById(id);
               if (el) el.value = el.type === 'number' ? '0' : '';
           });
    });
}

function resetForm() {
    document.getElementById('imovel-form')?.reset();
    document.getElementById('imovel-id').value = '';
    // Reseta fotos dinâmicas para 2 inputs
    const container = document.getElementById('fotos-inputs-container');
    if (container) {
        container.innerHTML = `<input type="url" class="foto-input" placeholder="Foto 1 — URL">
            <input type="url" class="foto-input" placeholder="Foto 2 — URL">`;
    }
    const btnRemove = document.getElementById('btn-remove-foto');
    if (btnRemove) btnRemove.style.display = 'none';
    // Reseta vídeos
    clearVideos();
    // Reseta campos de terreno
    const terrenoFields = document.getElementById('terreno-fields');
    if (terrenoFields) terrenoFields.style.display = 'none';
    _syncTipoUI('Apartamento');
    // Reseta preço
    const precoModo = document.getElementById('imovel-preco-modo');
    if (precoModo) precoModo.value = 'normal';
    const lancWrap = document.getElementById('lancamento-fields');
    const precoNormalWrap = document.getElementById('preco-normal-wrap');
    const precoInput = document.getElementById('imovel-preco');
    if (precoNormalWrap) precoNormalWrap.style.display = '';
    if (lancWrap) lancWrap.style.display = 'none';
    if (precoInput) precoInput.required = true;
    // Reseta anúncio
    const anuncioDuracaoWrap = document.getElementById('anuncio-duracao-wrap');
    if (anuncioDuracaoWrap) anuncioDuracaoWrap.style.display = 'none';
    const anuncioPreview = document.getElementById('anuncio-expiracao-preview');
    if (anuncioPreview) anuncioPreview.textContent = '';
    // Reseta label do botão
    const t = document.getElementById('btn-submit-text');
    if (t) t.textContent = 'Salvar Imóvel';
}

function addFotoInput() {
    const container = document.getElementById('fotos-inputs-container');
    if (!container) return;
    const count = container.querySelectorAll('.foto-input').length + 1;
    const input = document.createElement('input');
    input.type = 'url'; input.className = 'foto-input';
    input.placeholder = `Foto ${count} — URL`;
    container.appendChild(input);
    const btnRemove = document.getElementById('btn-remove-foto');
    if (btnRemove) btnRemove.style.display = count > 2 ? '' : 'none';
    input.focus();
}

function removeFotoInput() {
    const container = document.getElementById('fotos-inputs-container');
    if (!container) return;
    const inputs = container.querySelectorAll('.foto-input');
    if (inputs.length > 1) inputs[inputs.length - 1].remove();
    const btnRemove = document.getElementById('btn-remove-foto');
    if (btnRemove) btnRemove.style.display =
        container.querySelectorAll('.foto-input').length > 2 ? '' : 'none';
}

// ---- VÍDEOS (ilimitados, igual às fotos) ----
function clearVideos() {
    const container = document.getElementById('videos-inputs-container');
    if (container) {
        container.innerHTML = '<input type="url" class="video-input" placeholder="Vídeo 1 — URL do YouTube (watch, shorts ou youtu.be)">';
    }
    const btnRemove = document.getElementById('btn-remove-video');
    if (btnRemove) btnRemove.style.display = 'none';
}

function addVideoInput() {
    const container = document.getElementById('videos-inputs-container');
    if (!container) return;
    const count = container.querySelectorAll('.video-input').length + 1;
    const input = document.createElement('input');
    input.type = 'url'; input.className = 'video-input';
    input.placeholder = 'Vídeo ' + count + ' — URL do YouTube';
    container.appendChild(input);
    const btnRemove = document.getElementById('btn-remove-video');
    if (btnRemove) btnRemove.style.display = count > 1 ? '' : 'none';
    input.focus();
}

function removeVideoInput() {
    const container = document.getElementById('videos-inputs-container');
    if (!container) return;
    const inputs = container.querySelectorAll('.video-input');
    if (inputs.length > 1) inputs[inputs.length - 1].remove();
    const btnRemove = document.getElementById('btn-remove-video');
    if (btnRemove) btnRemove.style.display =
        container.querySelectorAll('.video-input').length > 1 ? '' : 'none';
}

/** Coloca URL no campo principal (se vazio) ou na primeira galeria vazia / nova linha */
function appendOptimizedUrlToFotos(url) {
    if (!url) return;
    const main = document.getElementById('imovel-imagem');
    if (main && !String(main.value || '').trim()) {
        main.value = url;
        return;
    }
    const container = document.getElementById('fotos-inputs-container');
    if (!container) return;
    const inputs = container.querySelectorAll('.foto-input');
    for (let i = 0; i < inputs.length; i++) {
        if (!String(inputs[i].value || '').trim()) {
            inputs[i].value = url;
            return;
        }
    }
    addFotoInput();
    const last = container.querySelector('.foto-input:last-of-type');
    if (last) last.value = url;
}

function appendOptimizedUrlToVideos(url) {
    if (!url) return;
    const container = document.getElementById('videos-inputs-container');
    if (!container) return;
    const inputs = container.querySelectorAll('.video-input');
    for (let i = 0; i < inputs.length; i++) {
        if (!String(inputs[i].value || '').trim()) {
            inputs[i].value = url;
            return;
        }
    }
    addVideoInput();
    const last = container.querySelector('.video-input:last-of-type');
    if (last) last.value = url;
}

function setupMediaUploader() {
    const btnF = document.getElementById('lb-btn-pick-fotos');
    const inpF = document.getElementById('lb-upload-fotos');
    const btnV = document.getElementById('lb-btn-pick-videos');
    const inpV = document.getElementById('lb-upload-videos');
    const statusEl = document.getElementById('lb-upload-status');
    if (!btnF || !inpF) return;
    btnF.addEventListener('click', () => inpF.click());
    if (btnV && inpV) btnV.addEventListener('click', () => inpV.click());

    // ── Helper: atualiza status com barra de progresso embutida ──
    function setStatus(msg, pct, type) {
        if (!statusEl) return;
        const colors = { ok: 'var(--green)', error: 'var(--red)', loading: 'var(--accent)' };
        const color = colors[type] || colors.loading;
        if (pct !== undefined && pct >= 0 && pct < 100) {
            statusEl.innerHTML = `
                <div style="display:flex;align-items:center;gap:.6rem;">
                    <span style="color:${color};font-size:.78rem;flex:1;">${msg}</span>
                    <span style="font-size:.72rem;font-weight:700;color:${color};min-width:36px;text-align:right;">${pct}%</span>
                </div>
                <div style="height:3px;background:rgba(255,255,255,.06);border-radius:99px;margin-top:.3rem;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:${color};border-radius:99px;transition:width .2s ease;"></div>
                </div>`;
        } else if (pct === 100) {
            statusEl.innerHTML = `<span style="color:var(--green);font-size:.78rem;">✅ ${msg}</span>`;
            setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 3000);
        } else if (type === 'error') {
            statusEl.innerHTML = `<span style="color:var(--red);font-size:.78rem;">❌ ${msg}</span>`;
            setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 5000);
        } else {
            statusEl.innerHTML = `<span style="color:${color};font-size:.78rem;">${msg}</span>`;
        }
    }

    // ── FOTOS ──
    inpF.addEventListener('change', async () => {
        const MO = window.LBMediaOptimizer;
        if (!MO) {
            setStatus('Módulo de mídia não carregado. Recarregue a página.', undefined, 'error');
            showToast('Módulo de mídia não carregado.', 'error');
            inpF.value = ''; return;
        }
        if (!auth || !auth.currentUser) {
            setStatus('Faça login para enviar arquivos.', undefined, 'error');
            showToast('Entre no painel para enviar arquivos.', 'error');
            inpF.value = ''; return;
        }
        const files = Array.from(inpF.files || []);
        inpF.value = '';
        if (!files.length) return;

        // Desabilita botões durante upload
        btnF.disabled = true;
        if (btnV) btnV.disabled = true;

        let ok = 0, erros = [];
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const label = `Foto ${i + 1}${files.length > 1 ? '/' + files.length : ''}: ${f.name.slice(0, 20)}`;
            setStatus(`${label} — otimizando...`, 5, 'loading');
            try {
                const url = await MO.uploadOptimizedImage(f, pct => {
                    const fase = pct < 35 ? 'otimizando...' : pct < 100 ? `enviando...` : 'concluído';
                    setStatus(`${label} — ${fase}`, pct, 'loading');
                });
                appendOptimizedUrlToFotos(url);
                ok++;
                if (files.length === 1) {
                    setStatus(`Foto enviada com sucesso!`, 100, 'ok');
                } else {
                    setStatus(`${i + 1}/${files.length} fotos enviadas...`, Math.round(((i + 1) / files.length) * 100), 'loading');
                }
            } catch (e) {
                erros.push(f.name);
                setStatus(`Erro: ${e.message || 'Falha no upload'}`, undefined, 'error');
                showToast(e.message || 'Erro ao enviar foto', 'error');
                console.error('Upload foto error:', e);
            }
        }

        btnF.disabled = false;
        if (btnV) btnV.disabled = false;

        if (ok > 0 && erros.length === 0) {
            setStatus(`${ok} foto${ok > 1 ? 's' : ''} enviada${ok > 1 ? 's' : ''} com sucesso! ✅`, 100, 'ok');
            showToast(ok === 1 ? '📸 Foto otimizada e linkada!' : `📸 ${ok} fotos otimizadas!`, 'success');
        } else if (ok > 0 && erros.length > 0) {
            showToast(`${ok} ok, ${erros.length} com erro`, 'warning');
        }
    });

    // ── VÍDEOS ──
    if (inpV) {
        inpV.addEventListener('change', async () => {
            const MO = window.LBMediaOptimizer;
            if (!MO) {
                setStatus('Módulo de mídia não carregado. Recarregue a página.', undefined, 'error');
                showToast('Módulo de mídia não carregado.', 'error');
                inpV.value = ''; return;
            }
            if (!auth || !auth.currentUser) {
                setStatus('Faça login para enviar arquivos.', undefined, 'error');
                showToast('Entre no painel para enviar arquivos.', 'error');
                inpV.value = ''; return;
            }
            const files = Array.from(inpV.files || []);
            inpV.value = '';
            if (!files.length) return;

            btnF.disabled = true;
            if (btnV) btnV.disabled = true;

            let ok = 0, erros = [];
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                const sizeMB = (f.size / 1024 / 1024).toFixed(0);
                const label = `Vídeo ${i + 1}${files.length > 1 ? '/' + files.length : ''} (${sizeMB} MB)`;
                setStatus(`${label} — verificando...`, 3, 'loading');
                try {
                    const url = await MO.uploadOptimizedVideo(f, pct => {
                        const fase = pct < 8 ? 'verificando...' : pct < 100 ? `enviando...` : 'concluído';
                        setStatus(`${label} — ${fase}`, pct, 'loading');
                    });
                    appendOptimizedUrlToVideos(url);
                    ok++;
                    if (files.length === 1) {
                        setStatus(`Vídeo enviado com sucesso!`, 100, 'ok');
                    }
                } catch (e) {
                    erros.push(f.name);
                    setStatus(`Erro: ${e.message || 'Falha no upload'}`, undefined, 'error');
                    showToast(e.message || 'Erro ao enviar vídeo', 'error');
                    console.error('Upload vídeo error:', e);
                }
            }

            btnF.disabled = false;
            if (btnV) btnV.disabled = false;

            if (ok > 0 && erros.length === 0) {
                setStatus(`${ok} vídeo${ok > 1 ? 's' : ''} enviado${ok > 1 ? 's' : ''} com sucesso! ✅`, 100, 'ok');
                showToast(ok === 1 ? '🎬 Vídeo enviado!' : `🎬 ${ok} vídeos enviados!`, 'success');
            } else if (ok > 0 && erros.length > 0) {
                showToast(`${ok} ok, ${erros.length} com erro`, 'warning');
            }
        });
    }
}

async function editImovel(id) {
    try {
        const doc = await db.collection('imoveis').doc(id).get();
        if (!doc.exists) { showToast('Não encontrado', 'error'); return; }
        const d = doc.data();
        const setF = (fieldId, val) => { const el = document.getElementById(fieldId); if (el) el.value = val ?? ''; };

        setF('imovel-id', id);
        setF('imovel-titulo', d.titulo);
        setF('imovel-bairro', d.bairro);
        setF('imovel-quartos', d.quartos || 0);
        setF('imovel-area', d.area);
        setF('imovel-preco-modo', d.precoModo || 'normal');
        // preço normal
        setF('imovel-preco', d.preco ? Number(d.preco).toLocaleString('pt-BR') : '');
        // lançamento
        setF('imovel-lanc-apartir', d?.lancamento?.aPartirDe ? Number(d.lancamento.aPartirDe).toLocaleString('pt-BR') : '');
        setF('imovel-lanc-entrada', d?.lancamento?.entrada ? Number(d.lancamento.entrada).toLocaleString('pt-BR') : '');
        setF('imovel-lanc-parcelas', d?.lancamento?.parcelas || '');
        setF('imovel-descricao', d.descricao);
        setF('imovel-imagem', d.imagem);
        setF('imovel-tipo', d.tipo || 'Apartamento');
        setF('imovel-status', d.status || 'disponivel');
        setF('imovel-vagas', d.vagas || 0);
        setF('imovel-condominio', d.condominio || 0);
        setF('imovel-iptu', d.tipo === 'Terreno' ? 0 : (d.iptu || 0));
        setF('imovel-suites',        d.suites || 0);
        setF('imovel-banheiros',     d.banheiros || 0);
        setF('imovel-andar',         d.andar ?? '');
        setF('imovel-sol',           d.sol ?? '');
        setF('imovel-posicao',       d.posicao ?? '');
        setF('imovel-mobiliado',     d.mobiliado ?? '');
        setF('imovel-area-privativa',d.areaPrivativa ?? '');
        setF('imovel-total-andares', d.totalAndares ?? '');

        // ── Campos de Terreno ──
        const isTerreno = d.tipo === 'Terreno';
        _syncTipoUI(d.tipo || 'Apartamento');
        // Sincroniza UI do preço após preencher
        try {
            const mode = (d.precoModo || 'normal');
            const lancWrap = document.getElementById('lancamento-fields');
            const precoNormalWrap = document.getElementById('preco-normal-wrap');
            const precoInput = document.getElementById('imovel-preco');
            if (precoNormalWrap) precoNormalWrap.style.display = mode === 'lancamento' ? 'none' : '';
            if (lancWrap) lancWrap.style.display = mode === 'lancamento' ? '' : 'none';
            if (precoInput) precoInput.required = mode !== 'lancamento';
        } catch {}
        if (isTerreno) {
            setF('imovel-frente', d.frente ?? '');
            setF('imovel-zoneamento', d.zoneamento ?? '');
            setF('imovel-topografia', d.topografia ?? '');
            setF('imovel-localidade', d.localidade ?? '');
            setF('imovel-preco-tipo', d.precoTipo ?? 'total');
            setF('imovel-iptu-terreno', d.iptu || 0);
        }

        // ── Anúncio flutuante ──
        setF('imovel-anuncio-ativo', d.anuncioAtivo ? 'true' : 'false');
        setF('imovel-anuncio-duracao', d.anuncioDuracao ?? 14);
        const duracaoWrap = document.getElementById('anuncio-duracao-wrap');
        if (duracaoWrap) duracaoWrap.style.display = d.anuncioAtivo ? '' : 'none';
        // Preview da data de expiração atual
        const preview = document.getElementById('anuncio-expiracao-preview');
        if (preview) {
            if (d.anuncioExpiraEm) {
                const expDate = new Date(d.anuncioExpiraEm);
                const hoje = new Date();
                if (expDate < hoje) {
                    preview.textContent = '⚠️ Anúncio expirado em ' + expDate.toLocaleDateString('pt-BR');
                    preview.style.color = 'var(--red)';
                } else {
                    preview.textContent = 'Expira em: ' + expDate.toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric'});
                    preview.style.color = 'var(--amber)';
                }
            } else if (d.anuncioAtivo) {
                preview.textContent = 'Sem prazo definido — permanente';
                preview.style.color = 'var(--green)';
            } else {
                preview.textContent = '';
            }
        }

        // ── Fotos dinâmicas ──
        const container = document.getElementById('fotos-inputs-container');
        if (container) {
            const fList = (d.fotos && d.fotos.length > 1) ? d.fotos : [(d.fotos?.[0] || ''), ''];
            container.innerHTML = fList.map((f, i) =>
                `<input type="url" class="foto-input" placeholder="Foto ${i+1} — URL" value="${f || ''}">`
            ).join('');
            const btnRemove = document.getElementById('btn-remove-foto');
            if (btnRemove) btnRemove.style.display = fList.length > 2 ? '' : 'none';
        }

        // ── Vídeos ──
        clearVideos();
        const videoList = Array.isArray(d.videos) && d.videos.length ? d.videos : (d.video ? [d.video] : []);
        if (videoList.length) {
            const vContainer = document.getElementById('videos-inputs-container');
            if (vContainer) {
                vContainer.innerHTML = videoList.map((v, i) =>
                    `<input type="url" class="video-input" placeholder="Vídeo ${i+1} — URL do YouTube" value="${v || ''}">`
                ).join('');
                const btnRemoveV = document.getElementById('btn-remove-video');
                if (btnRemoveV) btnRemoveV.style.display = videoList.length > 1 ? '' : 'none';
            }
        }

        const submitTxt = document.getElementById('btn-submit-text');
        if (submitTxt) submitTxt.textContent = 'Atualizar Imóvel';
        showSection('adicionar');
    } catch(e) { showToast('Erro ao carregar', 'error'); console.error(e); }
}

// ========== MOBILE NAVIGATION ==========
function mobileNav(section, el) {
    if (section === 'adicionar') novoImovel();
    else showSection(section);
    document.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
}

function toggleMobileMoreMenu(btn) {
    const menu = document.getElementById('mobile-more-menu');
    if (menu) menu.classList.toggle('open');
}

function closeMobileMoreMenu() {
    const menu = document.getElementById('mobile-more-menu');
    if (menu) menu.classList.remove('open');
}

function mobileNavMore(section) {
    closeMobileMoreMenu();
    showSection(section);
    document.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.remove('active'));
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
    setupMediaUploader();
    auth.onAuthStateChanged(u => { if (u) startRealtimeListeners(); else stopRealtimeListeners(); });
    document.getElementById('delete-modal')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeDeleteModal();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDeleteModal();});
    updateLastRefreshIndicator();
    
});

// ========== INDICADOR DE ÚLTIMA ATUALIZAÇÃO ==========
function updateLastRefreshIndicator() {
    const el = document.getElementById('last-refresh');
    if (el) el.textContent = 'Atualizado ' + new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

// ========== LISTENERS TEMPO REAL (onSnapshot completo) ==========
let _imoveisListener   = null;
let _lixeiraListener   = null;
let _visitasListener   = null;
let _linksListener     = null;
let _imoveisInitialized = false;
let _lixeiraInitialized = false;

function startRealtimeListeners() {
    // ---- IMÓVEIS ----
    if (!_imoveisListener) {
        _imoveisListener = db.collection('imoveis').orderBy('createdAt','desc').onSnapshot(snap => {
            const newData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const wasInit = _imoveisInitialized;
            _imoveisInitialized = true;

            if (wasInit) {
                // Detectar mudanças e notificar
                snap.docChanges().forEach(change => {
                    if (change.type === 'added')    showNotification('🏠 Novo imóvel adicionado', change.doc.data().titulo || '', 'green');
                    if (change.type === 'modified') showNotification('✏️ Imóvel atualizado', change.doc.data().titulo || '', 'amber');
                    if (change.type === 'removed')  showNotification('🗑️ Imóvel removido', change.doc.data().titulo || '', 'red');
                });
            }

            imoveisData = newData;
            updateLastRefreshIndicator();

            // Atualiza UI conforme a seção ativa
            const activeSection = document.querySelector('.admin-section.active')?.id;
            if (activeSection === 'section-dashboard') {
                const total = imoveisData.length;
                const bairros = [...new Set(imoveisData.map(i => i.bairro))];
                const mediaQ = total > 0 ? Math.round(imoveisData.reduce((s,i)=>s+(parseInt(i.quartos)||0),0)/total) : 0;
                const precoMedio = total > 0 ? Math.round(imoveisData.reduce((s,i)=>s+(parseFloat(i.preco)||0),0)/total) : 0;
                setEl('total-imoveis', total); setEl('total-bairros', bairros.length);
                setEl('media-quartos', mediaQ); setEl('preco-medio','R$ '+precoMedio.toLocaleString('pt-BR'));
                setEl('badge-imoveis', total);
                syncMobileBadges();
                renderBairrosChart('bairros-chart');
                renderRecentList('ultimos-imoveis', 5);
            } else if (activeSection === 'section-imoveis') {
                renderImoveisTable(imoveisData);
                updateBairroFilter(imoveisData);
            }
            // Analytics e Visitas NÃO são atualizados automaticamente —
            // o usuário pode estar lendo o relatório. Só atualiza ao navegar para a seção.
            // Sempre atualiza badge
            setEl('badge-imoveis', imoveisData.length);
            syncMobileBadges();
        }, err => console.warn('Listener imóveis:', err));
    }

    // ---- LIXEIRA ----
    if (!_lixeiraListener) {
        _lixeiraListener = db.collection('lixeira').onSnapshot(snap => {
            lixeiraData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const lCount = lixeiraData.length;
            const badgeEl = document.getElementById('badge-lixeira');
            if (badgeEl) { badgeEl.textContent = lCount > 0 ? lCount : ''; badgeEl.style.display = lCount > 0 ? '' : 'none'; }
            syncMobileBadges();

            // Atualiza lixeira se seção ativa
            const activeSection = document.querySelector('.admin-section.active')?.id;
            if (activeSection === 'section-lixeira') renderLixeiraTable(lixeiraData);
        }, err => console.warn('Listener lixeira:', err));
    }

    // ---- VISITAS (notificação de novo visitante + refresh do relatório) ----
    if (!_visitasListener) {
        let _visitasInit = false;
        _visitasListener = db.collection('visitas').orderBy('timestamp','desc').limit(1).onSnapshot(snap => {
            if (!_visitasInit) { _visitasInit = true; return; }
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const v = change.doc.data();
                    const ua = parseUA(v.userAgent || '');
                    showNotification('👀 Novo visitante', `${v.page||'Site'} — ${ua.browser} · ${ua.os} · ${ua.device}`, 'blue');
                    updateLastRefreshIndicator();
                    // Atualiza só o dashboard se estiver visível — NÃO recarrega o relatório de visitas
                    const activeSection = document.querySelector('.admin-section.active')?.id;
                    if (activeSection === 'section-dashboard') loadDashboardVisitas();
                }
            });
        }, err => console.warn('Listener visitas:', err));
    }

    // ---- LINKS COPIADOS ----
    if (!_linksListener) {
        let _linksInit = false;
        _linksListener = db.collection('links_copiados').orderBy('timestamp','desc').limit(1).onSnapshot(snap => {
            if (!_linksInit) { _linksInit = true; return; }
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const v = change.doc.data();
                    showNotification('🔗 Link copiado!', `"${v.titulo||'Imóvel'}" — ${v.deviceId?v.deviceId.slice(0,14)+'…':''}`, 'green');
                    // Push notification do OS
                    sendPushNotification('🔗 Link Copiado — LB Imóveis', `"${v.titulo||'Imóvel'}" foi compartilhado!`);
                    const activeSection = document.querySelector('.admin-section.active')?.id;
                    if (activeSection === 'section-dashboard') loadDashboardVisitas();
                }
            });
        }, err => console.warn('Listener links:', err));
    }

    // ---- VISITANTES RT + LEADS + CHAT LOGS ----
    startVisitasRT();
    startLeadsListener();
    startChatLogsListener();
}

function stopRealtimeListeners() {
    if (_imoveisListener)  { _imoveisListener();  _imoveisListener  = null; _imoveisInitialized = false; }
    if (_lixeiraListener)  { _lixeiraListener();  _lixeiraListener  = null; _lixeiraInitialized = false; }
    if (_visitasListener)  { _visitasListener();  _visitasListener  = null; }
    if (_linksListener)    { _linksListener();     _linksListener    = null; }
    if (_presencaListener) { _presencaListener();  _presencaListener = null; }
    if (_presencaTick)     { clearInterval(_presencaTick); _presencaTick = null; }
    _presencaCacheDocs = [];
    stopVisitasRT();
    if (_leadsListener) { _leadsListener(); _leadsListener = null; }
}

// ══════════════════════════════════════════════════════════
//  SISTEMA DE NOTIFICAÇÕES — FILA ROBUSTA (SEM BUG)
//  Notificações em fila nunca ficam presas na tela
// ══════════════════════════════════════════════════════════
const _notifQueue = [];
let _notifActive = false;

function showNotification(title, body, color = 'blue') {
    _notifQueue.push({ title, body, color });
    if (!_notifActive) _processNextNotif();
}

function _processNextNotif() {
    if (!_notifQueue.length) { _notifActive = false; return; }
    _notifActive = true;
    const { title, body, color } = _notifQueue.shift();
    const colors = { blue:'var(--accent)', green:'var(--green)', amber:'var(--amber)', red:'var(--red)', purple:'var(--purple)' };
    const c = colors[color] || colors.blue;

    let el = document.getElementById('_realtime-notif');
    if (!el) {
        el = document.createElement('div');
        el.id = '_realtime-notif';
        el.style.cssText = `
            position:fixed;bottom:5.5rem;right:1.5rem;z-index:9999;
            min-width:260px;max-width:320px;
            background:var(--bg-elevated);border-radius:var(--radius);padding:.9rem 1.1rem;
            box-shadow:var(--shadow-lg);display:flex;gap:.75rem;align-items:flex-start;
            will-change:transform;`;
        document.body.appendChild(el);
    }

    // Reseta posição instantaneamente, depois anima
    el.style.transition = 'none';
    el.style.transform = 'translateX(calc(100% + 2.5rem))';
    el.style.borderLeft = `3px solid ${c}`;
    el.innerHTML = `
        <div style="width:8px;height:8px;border-radius:50%;background:${c};margin-top:.35rem;
            flex-shrink:0;box-shadow:0 0 8px ${c};animation:pulse 1.2s infinite;"></div>
        <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:.82rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
            <div style="font-size:.74rem;color:var(--text-secondary);margin-top:.12rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${body}</div>
        </div>
        <button onclick="_dismissNotif()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0;font-size:.75rem;flex-shrink:0;align-self:center;opacity:.6;" title="Fechar">✕</button>`;

    // Force reflow → anima entrada
    void el.offsetWidth;
    el.style.transition = 'transform .35s cubic-bezier(.22,1,.36,1)';
    el.style.transform = 'translateX(0)';

    // Auto-saída após 4.2s
    el._hideTimer = setTimeout(() => _hideNotif(el), 4200);

    // Clique no card fecha
    el.onclick = (e) => { if (!e.target.closest('button')) _dismissNotif(); };
}

function _hideNotif(el) {
    if (!el) return;
    clearTimeout(el._hideTimer);
    el.style.transition = 'transform .35s cubic-bezier(.22,1,.36,1)';
    el.style.transform = 'translateX(calc(100% + 2.5rem))';
    setTimeout(() => {
        _notifActive = false;
        _processNextNotif();
    }, 380);
}

function _dismissNotif() {
    const el = document.getElementById('_realtime-notif');
    if (el) _hideNotif(el);
}

// ========== LINKS COPIADOS — RELATÓRIO ==========
async function loadLinksCopiados() {
    if (!db) return;
    try {
        const snap = await db.collection('links_copiados').orderBy('timestamp','desc').limit(100).get();
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return data;
    } catch(e) { return []; }
}

// ========== PERFIL DE VISITANTE ==========
async function loadPerfilVisitante() {
    const loading = document.getElementById('perfil-loading');
    const content = document.getElementById('perfil-content');
    if (loading) loading.style.display = 'flex';
    if (content) content.style.display = 'none';
    try {
        const [visitasSnap, imoveisSnap, imoveisListSnap, linksSnap] = await Promise.all([
            db.collection('visitas').orderBy('timestamp','desc').get(),
            db.collection('visitas_imoveis').orderBy('timestamp','desc').get(),
            db.collection('imoveis').get(),
            db.collection('links_copiados').orderBy('timestamp','desc').get()
        ]);
        const visitas = visitasSnap.docs.map(d => ({id:d.id,...d.data()}));
        const imoveisViews = imoveisSnap.docs.map(d => ({id:d.id,...d.data()}));
        const linksCopiados = linksSnap.docs.map(d => ({id:d.id,...d.data()}));
        const imoveis = {};
        imoveisListSnap.docs.forEach(d => { imoveis[d.id] = d.data(); });
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
        renderPerfilVisitante(visitas, imoveisViews, imoveis, linksCopiados);
        // Carrega gráfico de performance logo após renderizar
        setTimeout(loadPerformanceImovel, 200);
    } catch(e) {
        console.error(e);
        showToast('Erro ao carregar perfil','error');
        if (loading) loading.style.display = 'none';
    }
}

function renderPerfilVisitante(visitas, imoveisViews, imoveisCatalog, linksCopiados) {
    linksCopiados = linksCopiados || [];
    const content = document.getElementById('perfil-content');

    // Agrupa visitas por deviceId
    const devMap = {};
    visitas.forEach(v => {
        if (!devMap[v.deviceId]) devMap[v.deviceId] = { deviceId:v.deviceId, pages:[], firstSeen:v.date, lastSeen:v.date, ua:v.userAgent };
        devMap[v.deviceId].pages.push(v.page);
        if (v.date < devMap[v.deviceId].firstSeen) devMap[v.deviceId].firstSeen = v.date;
        if (v.date > devMap[v.deviceId].lastSeen) devMap[v.deviceId].lastSeen = v.date;
    });

    // Imóveis vistos por device
    imoveisViews.forEach(v => {
        if (!devMap[v.deviceId]) devMap[v.deviceId] = { deviceId:v.deviceId, pages:[], firstSeen:v.date, lastSeen:v.date, ua:'' };
        if (!devMap[v.deviceId].imoveisVistos) devMap[v.deviceId].imoveisVistos = [];
        devMap[v.deviceId].imoveisVistos.push({ id:v.imovelId, titulo:v.titulo, bairro:v.bairro, date:v.date });
    });

    // Links copiados por device
    const linksByDevice = {};
    linksCopiados.forEach(v => {
        if (!linksByDevice[v.deviceId]) linksByDevice[v.deviceId] = [];
        linksByDevice[v.deviceId].push({ titulo:v.titulo, imovelId:v.imovelId, date:v.date });
        // também garante o device no mapa
        if (!devMap[v.deviceId]) devMap[v.deviceId] = { deviceId:v.deviceId, pages:[], firstSeen:v.date, lastSeen:v.date, ua:'' };
    });

    // Top imóveis mais vistos
    const imovelCount = {};
    imoveisViews.forEach(v => {
        if (!imovelCount[v.imovelId]) imovelCount[v.imovelId] = { id:v.imovelId, titulo:v.titulo, bairro:v.bairro, count:0, devices:new Set() };
        imovelCount[v.imovelId].count++;
        imovelCount[v.imovelId].devices.add(v.deviceId);
    });
    const topImoveis = Object.values(imovelCount).sort((a,b)=>b.count-a.count).slice(0,10);

    // Top links copiados
    const linkCount = {};
    linksCopiados.forEach(v => {
        const k = v.imovelId || v.titulo;
        if (!linkCount[k]) linkCount[k] = { titulo:v.titulo||k, count:0, devices:new Set() };
        linkCount[k].count++;
        linkCount[k].devices.add(v.deviceId);
    });
    const topLinks = Object.values(linkCount).sort((a,b)=>b.count-a.count).slice(0,5);

    const devices = Object.values(devMap).sort((a,b)=>(b.lastSeen||'')>(a.lastSeen||'')?1:-1);

    content.innerHTML = `
    <div class="stats-grid" style="margin-bottom:1.5rem;">
        <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-fingerprint"></i></div><div class="stat-info"><span class="stat-value">${devices.length}</span><span class="stat-label">Dispositivos Únicos</span></div></div>
        <div class="stat-card"><div class="stat-icon green"><i class="fas fa-building"></i></div><div class="stat-info"><span class="stat-value">${imoveisViews.length}</span><span class="stat-label">Views de Imóveis</span></div></div>
        <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-link"></i></div><div class="stat-info"><span class="stat-value">${linksCopiados.length}</span><span class="stat-label">Links Copiados</span></div></div>
        <div class="stat-card"><div class="stat-icon amber"><i class="fas fa-fire"></i></div><div class="stat-info"><span class="stat-value">${topImoveis[0]?.titulo?.split(' ').slice(0,2).join(' ')||'—'}</span><span class="stat-label">Imóvel Mais Visto</span></div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
        <!-- TOP IMÓVEIS MAIS VISTOS -->
        <div class="dashboard-card">
            <h3 style="margin-bottom:1rem;"><i class="fas fa-fire" style="color:var(--amber)"></i> Imóveis Mais Vistos</h3>
            ${topImoveis.length ? `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:.82rem;">
                <thead><tr style="border-bottom:1px solid var(--border);">
                    <th style="padding:.5rem .6rem;text-align:left;color:var(--text-muted);font-weight:500;">#</th>
                    <th style="padding:.5rem .6rem;text-align:left;color:var(--text-muted);font-weight:500;">Imóvel</th>
                    <th style="padding:.5rem .6rem;text-align:center;color:var(--text-muted);font-weight:500;">Views</th>
                    <th style="padding:.5rem .6rem;text-align:center;color:var(--text-muted);font-weight:500;">Devs</th>
                </tr></thead>
                <tbody>${topImoveis.map((im,i)=>`<tr style="border-bottom:1px solid var(--border);" onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background=''">
                    <td style="padding:.5rem .6rem;color:var(--text-muted);">${i+1}</td>
                    <td style="padding:.5rem .6rem;color:var(--text-primary);font-weight:500;font-size:.8rem;">${im.titulo||im.id}</td>
                    <td style="padding:.5rem .6rem;text-align:center;"><span style="background:var(--amber-soft);color:var(--amber);padding:.15rem .6rem;border-radius:99px;font-weight:700;">${im.count}</span></td>
                    <td style="padding:.5rem .6rem;text-align:center;color:var(--text-secondary);">${im.devices.size}</td>
                </tr>`).join('')}</tbody>
            </table></div>` : '<p style="color:var(--text-muted);font-size:.83rem;padding:1rem 0;">Nenhum imóvel visualizado ainda</p>'}
        </div>

        <!-- LINKS MAIS COPIADOS -->
        <div class="dashboard-card">
            <h3 style="margin-bottom:1rem;"><i class="fas fa-link" style="color:var(--purple)"></i> Links Mais Copiados</h3>
            ${topLinks.length ? `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:.82rem;">
                <thead><tr style="border-bottom:1px solid var(--border);">
                    <th style="padding:.5rem .6rem;text-align:left;color:var(--text-muted);font-weight:500;">#</th>
                    <th style="padding:.5rem .6rem;text-align:left;color:var(--text-muted);font-weight:500;">Imóvel</th>
                    <th style="padding:.5rem .6rem;text-align:center;color:var(--text-muted);font-weight:500;">Cópias</th>
                    <th style="padding:.5rem .6rem;text-align:center;color:var(--text-muted);font-weight:500;">Devs</th>
                </tr></thead>
                <tbody>${topLinks.map((lk,i)=>`<tr style="border-bottom:1px solid var(--border);" onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background=''">
                    <td style="padding:.5rem .6rem;color:var(--text-muted);">${i+1}</td>
                    <td style="padding:.5rem .6rem;color:var(--text-primary);font-weight:500;font-size:.8rem;">${lk.titulo||'—'}</td>
                    <td style="padding:.5rem .6rem;text-align:center;"><span style="background:var(--purple-soft);color:var(--purple);padding:.15rem .6rem;border-radius:99px;font-weight:700;">${lk.count}</span></td>
                    <td style="padding:.5rem .6rem;text-align:center;color:var(--text-secondary);">${lk.devices.size}</td>
                </tr>`).join('')}</tbody>
            </table></div>` : '<p style="color:var(--text-muted);font-size:.83rem;padding:1rem 0;">Nenhum link copiado ainda</p>'}
        </div>
    </div>

    <!-- PERFIL POR DISPOSITIVO -->
    <div class="dashboard-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">
            <h3><i class="fas fa-users"></i> Perfil por Dispositivo</h3>
            <span style="font-size:.78rem;color:var(--text-muted);">${devices.length} visitante(s) — clique para expandir</span>
        </div>
        ${devices.length===0 ? '<p style="color:var(--text-muted);text-align:center;padding:2rem;">Nenhum visitante ainda</p>' :
        devices.map((dev,idx) => {
            const ua = parseUA(dev.ua||'');
            const uniquePages = [...new Set(dev.pages)];
            const imVisto = dev.imoveisVistos || [];
            const linksDev = linksByDevice[dev.deviceId] || [];
            return `
            <div style="border:1px solid var(--border);border-radius:var(--radius);padding:1rem;margin-bottom:.7rem;cursor:pointer;transition:border-color .2s,background .2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background=''" onclick="this.querySelector('.dev-detail').style.display=this.querySelector('.dev-detail').style.display==='none'?'block':'none'">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;">
                    <div style="display:flex;align-items:center;gap:.7rem;">
                        <span style="font-size:1.1rem;">${deviceIcon(ua.device)}</span>
                        <div>
                            <div style="font-family:monospace;font-size:.72rem;color:var(--text-muted);">${(dev.deviceId||'').slice(0,26)}…</div>
                            <div style="font-size:.78rem;color:var(--text-secondary);margin-top:.1rem;">${ua.browser} · ${ua.os}</div>
                        </div>
                    </div>
                    <div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;">
                        ${uniquePages.map(p=>pageBadge(p)).join('')}
                        ${imVisto.length?`<span style="background:var(--amber-soft);color:var(--amber);padding:.2rem .6rem;border-radius:99px;font-size:.7rem;font-weight:600;"><i class="fas fa-building"></i> ${imVisto.length}</span>`:''}
                        ${linksDev.length?`<span style="background:var(--purple-soft);color:var(--purple);padding:.2rem .6rem;border-radius:99px;font-size:.7rem;font-weight:600;"><i class="fas fa-link"></i> ${linksDev.length}</span>`:''}
                        <span style="font-size:.72rem;color:var(--text-muted);">↩ ${dev.lastSeen||'—'}</span>
                        <i class="fas fa-chevron-down" style="color:var(--text-muted);font-size:.65rem;"></i>
                    </div>
                </div>
                <div class="dev-detail" style="display:none;margin-top:.9rem;padding-top:.9rem;border-top:1px solid var(--border);">
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
                        <div>
                            <div style="font-size:.7rem;color:var(--text-muted);margin-bottom:.35rem;text-transform:uppercase;letter-spacing:.06em;">Páginas visitadas</div>
                            ${uniquePages.map(p=>`<div style="padding:.25rem 0;color:var(--text-secondary);font-size:.8rem;"><i class="fas fa-check" style="color:var(--green);margin-right:.35rem;font-size:.65rem;"></i>${p}</div>`).join('')}
                        </div>
                        <div>
                            <div style="font-size:.7rem;color:var(--text-muted);margin-bottom:.35rem;text-transform:uppercase;letter-spacing:.06em;">Imóveis vistos</div>
                            ${imVisto.length?imVisto.map(iv=>`<div style="padding:.25rem 0;font-size:.78rem;color:var(--text-secondary);">${iv.titulo||iv.id} <span style="color:var(--text-muted);font-size:.7rem;">· ${iv.date||''}</span></div>`).join(''):'<span style="color:var(--text-muted);font-size:.78rem;">Nenhum</span>'}
                        </div>
                        <div>
                            <div style="font-size:.7rem;color:var(--text-muted);margin-bottom:.35rem;text-transform:uppercase;letter-spacing:.06em;">Links copiados</div>
                            ${linksDev.length?linksDev.map(lk=>`<div style="padding:.25rem 0;font-size:.78rem;"><i class="fas fa-link" style="color:var(--purple);margin-right:.3rem;font-size:.65rem;"></i><span style="color:var(--text-secondary);">${lk.titulo||'Imóvel'}</span> <span style="color:var(--text-muted);font-size:.7rem;">· ${lk.date||''}</span></div>`).join(''):'<span style="color:var(--text-muted);font-size:.78rem;">Nenhum</span>'}
                        </div>
                    </div>
                    <div style="margin-top:.6rem;font-size:.68rem;color:var(--text-muted);">1º acesso: ${dev.firstSeen||'—'} · ${(dev.ua||'').slice(0,90)}</div>
                </div>
            </div>`;
        }).join('')}
    </div>`;
}

// ========== CONFIGURAÇÕES DO SITE ==========
async function loadSiteConfig() {
    const loading = document.getElementById('site-loading');
    const content = document.getElementById('site-content');
    if (loading) loading.style.display = 'flex';
    if (content) content.style.display = 'none';
    let cfg = {};
    try { const doc = await db.collection('config').doc('site').get(); if (doc.exists) cfg = doc.data(); } catch(e) {}
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
    content.innerHTML = `
    <div style="max-width:820px;">
        <div class="dashboard-card" style="margin-bottom:1.2rem;">
            <h3 style="margin-bottom:1rem;"><i class="fas fa-toggle-on"></i> Controle do Conteúdo Público</h3>
            <div style="display:flex;flex-direction:column;gap:.8rem;">
                <label class="fx-toggle" style="justify-content:space-between;gap:1rem;">
                    <span style="color:var(--text-secondary);font-size:.85rem;">
                        <strong style="color:var(--text-primary);">Permitir dados de exemplo no site público</strong><br>
                        <span style="color:var(--text-muted);font-size:.75rem;">Se o Firebase falhar, o site pode (opcionalmente) mostrar imóveis de exemplo. Desligado por padrão.</span>
                    </span>
                    <input type="checkbox" id="cfg-public-fallback" ${cfg?.conteudoPublico?.fallbackExemplos ? 'checked' : ''}>
                </label>

                <label class="fx-toggle" style="justify-content:space-between;gap:1rem;">
                    <span style="color:var(--text-secondary);font-size:.85rem;">
                        <strong style="color:var(--text-primary);">Importar imóveis de exemplo automaticamente no painel</strong><br>
                        <span style="color:var(--text-muted);font-size:.75rem;">Só use para testes. Se ligado e seu banco estiver vazio, o painel pode importar exemplos.</span>
                    </span>
                    <input type="checkbox" id="cfg-auto-seed" ${cfg?.conteudoPublico?.autoSeedExemplos ? 'checked' : ''}>
                </label>

                <div style="display:flex;gap:.6rem;flex-wrap:wrap;">
                    <button onclick="seedStaticImoveis();showToast('Importando exemplos...','info')" class="btn-secondary" style="justify-content:flex-start;gap:.7rem;">
                        <i class="fas fa-database" style="color:var(--amber)"></i> Importar exemplos (manual)
                    </button>
                    <span style="color:var(--text-muted);font-size:.74rem;align-self:center;">Não afeta anúncios. Anúncios só aparecem quando <code style="background:var(--bg-elevated);padding:.08rem .35rem;border-radius:6px;border:1px solid var(--border);">anuncioAtivo=true</code> no imóvel.</span>
                </div>
            </div>
        </div>

        <div class="dashboard-card" style="margin-bottom:1.2rem;">
            <h3 style="margin-bottom:1rem;"><i class="fas fa-bullhorn"></i> Barra de Urgência (Topo do Site)</h3>
            <div style="display:flex;flex-direction:column;gap:.9rem;">
                <label class="fx-toggle" style="justify-content:space-between;gap:1rem;">
                    <span style="color:var(--text-secondary);font-size:.85rem;">
                        <strong style="color:var(--text-primary);">Ativar barra de urgência</strong><br>
                        <span style="color:var(--text-muted);font-size:.75rem;">Aparece no site público apenas quando estiver ativada aqui.</span>
                    </span>
                    <input type="checkbox" id="cfg-urg-ativo" ${(cfg.urgencyBar && cfg.urgencyBar.ativo) ? 'checked' : ''}>
                </label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                    <div class="form-group" style="grid-column:1/-1;">
                        <label class="form-label">Texto</label>
                        <input type="text" id="cfg-urg-texto" class="form-control" value="${(cfg.urgencyBar && cfg.urgencyBar.texto) ? String(cfg.urgencyBar.texto).replace(/"/g,'&quot;') : ''}" placeholder="Ex: Novos imóveis disponíveis hoje!">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Bairro (opcional)</label>
                        <input type="text" id="cfg-urg-bairro" class="form-control" value="${(cfg.urgencyBar && cfg.urgencyBar.bairro) ? String(cfg.urgencyBar.bairro).replace(/"/g,'&quot;') : ''}" placeholder="Ex: Ipanema">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Link (opcional)</label>
                        <input type="text" id="cfg-urg-link" class="form-control" value="${(cfg.urgencyBar && cfg.urgencyBar.link) ? String(cfg.urgencyBar.link).replace(/"/g,'&quot;') : ''}" placeholder="Ex: imoveis.html">
                    </div>
                </div>
            </div>
        </div>

        <div class="dashboard-card" style="margin-bottom:1.2rem;">
            <h3 style="margin-bottom:1rem;"><i class="fas fa-user"></i> Informações Pessoais</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div class="form-group"><label class="form-label">Nome do Corretor</label><input type="text" id="cfg-nome" class="form-control" value="${cfg.nome||'Leandro Bomfim'}"></div>
                <div class="form-group"><label class="form-label">CRECI</label><input type="text" id="cfg-creci" class="form-control" value="${cfg.creci||''}"></div>
                <div class="form-group"><label class="form-label">WhatsApp (com DDI)</label><input type="text" id="cfg-whatsapp" class="form-control" value="${cfg.whatsapp||'5521981424469'}"></div>
                <div class="form-group"><label class="form-label">Email de Contato</label><input type="email" id="cfg-email" class="form-control" value="${cfg.emailContato||''}"></div>
                <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Foto de Perfil (URL)</label><input type="text" id="cfg-foto" class="form-control" value="${cfg.fotoPerfil||'https://files.catbox.moe/nqdyup.png'}"></div>
            </div>
        </div>
        <div class="dashboard-card" style="margin-bottom:1.2rem;">
            <h3 style="margin-bottom:1rem;"><i class="fas fa-star"></i> Números do Hero</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
                <div class="form-group"><label class="form-label">Anos de Experiência</label><input type="number" id="cfg-anos" class="form-control" value="${cfg.anosExperiencia||6}"></div>
                <div class="form-group"><label class="form-label">Imóveis Negociados</label><input type="number" id="cfg-imoveis-neg" class="form-control" value="${cfg.imoveisNegociados||60}"></div>
                <div class="form-group"><label class="form-label">% Satisfação</label><input type="number" id="cfg-satisfacao" class="form-control" value="${cfg.satisfacao||100}"></div>
            </div>
        </div>
        <div class="dashboard-card" style="margin-bottom:1.2rem;">
            <h3 style="margin-bottom:1rem;"><i class="fas fa-pen"></i> Textos do Site</h3>
            <div style="display:flex;flex-direction:column;gap:1rem;">
                <div class="form-group"><label class="form-label">Título do Hero</label><input type="text" id="cfg-hero-titulo" class="form-control" value="${cfg.heroTitulo||'Transformando Sonhos em Endereços'}"></div>
                <div class="form-group"><label class="form-label">Descrição do Hero</label><textarea id="cfg-hero-desc" class="form-control" rows="3">${cfg.heroDesc||'Com mais de 6 anos de experiência no mercado imobiliário...'}</textarea></div>
                <div class="form-group"><label class="form-label">Destaque velocidade (ex: 47%)</label><input type="text" id="cfg-velocidade" class="form-control" value="${cfg.velocidade||'47%'}"></div>
            </div>
        </div>
        <div class="dashboard-card" style="margin-bottom:1.2rem;">
            <h3 style="margin-bottom:1rem;"><i class="fas fa-map-marker-alt"></i> Bairros (faixa rolante)</h3>
            <div class="form-group"><label class="form-label">Separados por vírgula</label><input type="text" id="cfg-bairros" class="form-control" value="${cfg.bairros||'Ipanema, Leblon, Barra da Tijuca, Recreio dos Bandeirantes, Barra Olímpica, Copacabana'}"></div>
        </div>
        <div class="dashboard-card" style="margin-bottom:1.5rem;">
            <h3 style="margin-bottom:1rem;"><i class="fas fa-quote-right"></i> Depoimentos</h3>
            <div id="depoimentos-list" style="display:flex;flex-direction:column;gap:.8rem;">
                ${(cfg.depoimentos||[{texto:'O Leandro não apenas vendeu nosso apartamento, ele realizou nosso sonho do primeiro lar.',autor:'Carlos e Ana Lima',local:'Ipanema'},{texto:'Profissional incrível! Conseguiu vender minha cobertura em apenas 15 dias pelo valor que eu queria.',autor:'Roberto Fonseca',local:'Barra da Tijuca'}]).map((d,i)=>`
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:.5rem;align-items:center;padding:.7rem;background:var(--bg-elevated);border-radius:var(--radius-sm);border:1px solid var(--border);" id="dep-${i}">
                    <input type="text" class="form-control dep-texto" placeholder="Depoimento" value="${d.texto||''}">
                    <input type="text" class="form-control dep-autor" placeholder="Nome" value="${d.autor||''}">
                    <input type="text" class="form-control dep-local" placeholder="Bairro" value="${d.local||''}">
                    <button onclick="this.closest('[id^=dep-]').remove()" style="background:var(--red-soft);border:none;color:var(--red);width:32px;height:32px;border-radius:6px;cursor:pointer;"><i class="fas fa-times"></i></button>
                </div>`).join('')}
            </div>
            <button onclick="addDepoimento()" class="btn-secondary" style="margin-top:.8rem;"><i class="fas fa-plus"></i> Adicionar</button>
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
    const depoimentos = Array.from(document.querySelectorAll('[id^=dep-]')).map(el=>({
        texto:el.querySelector('.dep-texto')?.value||'',
        autor:el.querySelector('.dep-autor')?.value||'',
        local:el.querySelector('.dep-local')?.value||'',
    })).filter(d=>d.texto);
    const cfg = {
        nome:document.getElementById('cfg-nome')?.value||'',
        creci:document.getElementById('cfg-creci')?.value||'',
        whatsapp:document.getElementById('cfg-whatsapp')?.value||'',
        emailContato:document.getElementById('cfg-email')?.value||'',
        fotoPerfil:document.getElementById('cfg-foto')?.value||'',
        anosExperiencia:parseInt(document.getElementById('cfg-anos')?.value)||6,
        imoveisNegociados:parseInt(document.getElementById('cfg-imoveis-neg')?.value)||60,
        satisfacao:parseInt(document.getElementById('cfg-satisfacao')?.value)||100,
        heroTitulo:document.getElementById('cfg-hero-titulo')?.value||'',
        heroDesc:document.getElementById('cfg-hero-desc')?.value||'',
        velocidade:document.getElementById('cfg-velocidade')?.value||'',
        bairros:document.getElementById('cfg-bairros')?.value||'',
        depoimentos,
        conteudoPublico: {
            fallbackExemplos: !!document.getElementById('cfg-public-fallback')?.checked,
            autoSeedExemplos: !!document.getElementById('cfg-auto-seed')?.checked,
        },
        urgencyBar: {
            ativo: !!document.getElementById('cfg-urg-ativo')?.checked,
            texto: (document.getElementById('cfg-urg-texto')?.value || '').trim(),
            bairro: (document.getElementById('cfg-urg-bairro')?.value || '').trim(),
            link: (document.getElementById('cfg-urg-link')?.value || '').trim(),
        },
        updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
    };
    try { await db.collection('config').doc('site').set(cfg); showToast('✅ Configurações salvas!'); }
    catch(e) { showToast('Erro ao salvar','error'); }
}
// ========================================================
//  MELHORIAS SSS — BACKUP, EXPORT E SEGURANÇA
// ========================================================

// ── EXPORTAR BACKUP JSON DOS IMÓVEIS ──
async function exportarBackupJSON() {
    if (!db) return;
    try {
        showToast('Gerando backup...', 'info');
        const [imSnap, lxSnap] = await Promise.all([
            db.collection('imoveis').get(),
            db.collection('lixeira').get()
        ]);
        const backup = {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            imoveis: imSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            lixeira: lxSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            totalImoveis: imSnap.size,
            totalLixeira: lxSnap.size
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-imoveis-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`✅ Backup exportado — ${imSnap.size} imóveis`);
    } catch(e) {
        showToast('Erro ao exportar backup', 'error');
    }
}

// ── EXPORTAR CSV DE VISITAS ──
async function exportarCSVVisitas() {
    if (!db) return;
    try {
        showToast('Gerando CSV...', 'info');
        const snap = await db.collection('visitas').orderBy('timestamp','desc').get();
        const rows = [['Data', 'Página', 'Device ID', 'User Agent']];
        snap.docs.forEach(d => {
            const v = d.data();
            rows.push([
                v.date || '',
                v.page || '',
                v.deviceId || '',
                (v.userAgent || '').slice(0, 80)
            ]);
        });
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visitas-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`✅ CSV exportado — ${snap.size} visitas`);
    } catch(e) {
        showToast('Erro ao exportar CSV', 'error');
    }
}

// ── EXPORTAR RELATÓRIO PDF (via print) ──
function exportarRelatorioPDF() {
    window.print();
}

// Expor globalmente
window.exportarBackupJSON = exportarBackupJSON;
window.exportarCSVVisitas = exportarCSVVisitas;
window.exportarRelatorioPDF = exportarRelatorioPDF;
window._dismissNotif = _dismissNotif;

// ══════════════════════════════════════════════════════════
//  AUTO-REFRESH VISITANTES (sem reload)
//  Listeners em tempo real para seções de visitas e perfil
// ══════════════════════════════════════════════════════════

let _visitasRTListener   = null;
let _linksRTListener     = null;
let _imoveisRTListener   = null;
let _visitasRTData       = [];
let _linksRTData         = [];
let _imoveisViewsRTData  = [];

function startVisitasRT() {
    if (_visitasRTListener) return;
    // Listener de visitas em tempo real
    _visitasRTListener = db.collection('visitas').orderBy('timestamp','desc').onSnapshot(snap => {
        _visitasRTData = snap.docs.map(d => ({id:d.id,...d.data()}));
        const activeSection = document.querySelector('.admin-section.active')?.id;
        if (activeSection === 'section-visitas') {
            renderVisitasReport(_visitasRTData);
        }
        // Atualiza dashboard se ativo
        if (activeSection === 'section-dashboard') {
            const el = document.getElementById('dash-visitas-total');
            if (el) el.textContent = _visitasRTData.length;
            const uniq = new Set(_visitasRTData.map(v => v.deviceId)).size;
            const el2 = document.getElementById('dash-visitas-unique');
            if (el2) el2.textContent = uniq;
        }
    }, err => console.warn('visitasRT:', err));

    // Listener de links copiados em tempo real
    _linksRTListener = db.collection('links_copiados').orderBy('timestamp','desc').onSnapshot(snap => {
        const prev = _linksRTData.length;
        _linksRTData = snap.docs.map(d => ({id:d.id,...d.data()}));
        // Notifica novos links (só após primeira carga)
        if (prev > 0 && _linksRTData.length > prev) {
            const novo = _linksRTData[0];
            showNotification(
                '🔗 Link copiado!',
                `"${novo.titulo||'Imóvel'}" · ${novo.deviceId?.slice(0,12)||''}…`,
                'purple'
            );
        }
        // Atualiza dash
        const hoje = new Date().toISOString().slice(0,10);
        const hojeCount = _linksRTData.filter(v => v.date === hoje).length;
        const elC = document.getElementById('dash-links-copiados');
        if (elC) elC.textContent = hojeCount;
        // Perfil
        const activeSection = document.querySelector('.admin-section.active')?.id;
        if (activeSection === 'section-perfil') loadPerfilVisitante();
    }, err => console.warn('linksRT:', err));

    // Views de imóveis em tempo real
    _imoveisRTListener = db.collection('visitas_imoveis').orderBy('timestamp','desc').onSnapshot(snap => {
        _imoveisViewsRTData = snap.docs.map(d => ({id:d.id,...d.data()}));
        // Imóvel mais visto hoje
        const hoje = new Date().toISOString().slice(0,10);
        const counts = {};
        _imoveisViewsRTData.forEach(v => {
            if (v.date === hoje) {
                if (!counts[v.imovelId]) counts[v.imovelId] = {titulo:v.titulo,bairro:v.bairro,count:0};
                counts[v.imovelId].count++;
            }
        });
        const top = Object.values(counts).sort((a,b)=>b.count-a.count)[0];
        const elTop = document.getElementById('dash-imovel-top');
        if (elTop) {
            elTop.innerHTML = top
                ? `<strong>${top.titulo}</strong><span>${top.count} view${top.count>1?'s':''} hoje</span>`
                : `<strong style="color:var(--text-muted)">Nenhum ainda</strong><span>hoje</span>`;
        }
    }, err => console.warn('imoveisViewsRT:', err));
}

function stopVisitasRT() {
    if (_visitasRTListener)  { _visitasRTListener();  _visitasRTListener  = null; }
    if (_linksRTListener)    { _linksRTListener();    _linksRTListener    = null; }
    if (_imoveisRTListener)  { _imoveisRTListener();  _imoveisRTListener  = null; }
}

// Inicia listeners RT após login
const _origSetupAuthListener = setupAuthListener;

// ══════════════════════════════════════════════════════════
//  SISTEMA DE LEADS / CONTATOS
//  Registra quando alguém abre WhatsApp ou envia contato
// ══════════════════════════════════════════════════════════

let _leadsListener = null;

function startLeadsListener() {
    if (_leadsListener) return;
    let _leadsInit = false;
    _leadsListener = db.collection('leads').orderBy('timestamp','desc').limit(1).onSnapshot(snap => {
        if (!_leadsInit) { _leadsInit = true; return; }
        snap.docChanges().forEach(change => {
            if (change.type === 'added') {
                const v = change.doc.data();
                showNotification(
                    '🔥 Novo lead!',
                    `${v.tipo||'Contato'} — ${v.titulo||'Imóvel'} · ${v.deviceId?.slice(0,10)||''}`,
                    'green'
                );
                updateLastRefreshIndicator();
                const active = document.querySelector('.admin-section.active')?.id;
                if (active === 'section-perfil') loadPerfilVisitante();
            }
        });
    }, err => console.warn('leadsRT:', err));
}

async function loadLeads() {
    if (!db) return;
    try {
        const snap = await db.collection('leads').orderBy('timestamp','desc').limit(100).get();
        return snap.docs.map(d => ({id:d.id,...d.data()}));
    } catch { return []; }
}

// ══════════════════════════════════════════════════════════
//  NOTIFICAÇÕES PUSH (Push API + Service Worker)
//  Solicita permissão e mostra push quando link é copiado
// ══════════════════════════════════════════════════════════

async function requestPushPermission() {
    if (!('Notification' in window)) {
        showToast('Seu navegador não suporta notificações push', 'warning');
        return;
    }
    if (Notification.permission === 'granted') {
        showToast('Notificações push já estão ativas! ✅', 'success');
        return;
    }
    if (Notification.permission === 'denied') {
        showToast('Notificações bloqueadas no navegador. Habilite nas configurações.', 'warning');
        return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
        showToast('✅ Notificações push ativadas!');
        new Notification('LB Imóveis — Admin', {
            body: 'Você receberá alertas quando links forem copiados.',
            icon: '/favicon.ico',
        });
    } else {
        showToast('Permissão negada para notificações', 'warning');
    }
}

function sendPushNotification(title, body) {
    if (Notification.permission !== 'granted') return;
    new Notification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico', tag: 'lb-admin-notif', renotify: true });
}

// Expor
window.requestPushPermission = requestPushPermission;
window.startVisitasRT        = startVisitasRT;
window.stopVisitasRT         = stopVisitasRT;

// ══════════════════════════════════════════════════════════
//  GRÁFICOS DE PERFORMANCE POR IMÓVEL
// ══════════════════════════════════════════════════════════

async function loadPerformanceImovel() {
    if (!db) return;
    const content = document.getElementById('perfil-content');
    if (!content) return;

    try {
        const [viewsSnap, linksSnap, imoveisSnap] = await Promise.all([
            db.collection('visitas_imoveis').get(),
            db.collection('links_copiados').get(),
            db.collection('imoveis').get(),
        ]);

        const imoveisCatalog = {};
        imoveisSnap.docs.forEach(d => { imoveisCatalog[d.id] = d.data(); });

        // Contagem por imóvel
        const perf = {};
        viewsSnap.docs.forEach(d => {
            const v = d.data();
            const k = v.imovelId||v.titulo;
            if (!perf[k]) perf[k] = { titulo:v.titulo||k, bairro:v.bairro||'', views:0, links:0 };
            perf[k].views++;
        });
        linksSnap.docs.forEach(d => {
            const v = d.data();
            const k = v.imovelId||v.titulo;
            if (!perf[k]) perf[k] = { titulo:v.titulo||k, bairro:v.bairro||'', views:0, links:0 };
            perf[k].links++;
        });

        const sorted = Object.values(perf).sort((a,b) => b.views-a.views).slice(0,10);
        if (!sorted.length) return;

        // Injeta mini-gráfico de barras horizontais no topo do perfil
        const barHtml = sorted.map(im => {
            const maxV = sorted[0].views||1;
            const pct = Math.round((im.views/maxV)*100);
            const convRate = im.views ? Math.round((im.links/im.views)*100) : 0;
            return `
            <div style="margin-bottom:.6rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.25rem;gap:.5rem;">
                    <span style="font-size:.78rem;color:var(--text-primary);font-weight:500;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${im.titulo}</span>
                    <div style="display:flex;gap:.5rem;flex-shrink:0;">
                        <span style="font-size:.72rem;background:var(--amber-soft);color:var(--amber);padding:.12rem .45rem;border-radius:99px;font-weight:700;">${im.views} views</span>
                        <span style="font-size:.72rem;background:var(--purple-soft);color:var(--purple);padding:.12rem .45rem;border-radius:99px;font-weight:700;">${im.links} links</span>
                        <span style="font-size:.72rem;background:var(--green-soft);color:var(--green);padding:.12rem .45rem;border-radius:99px;font-weight:700;">${convRate}% conv.</span>
                    </div>
                </div>
                <div style="height:5px;background:var(--bg-elevated);border-radius:99px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent),#6366f1);border-radius:99px;transition:width .6s cubic-bezier(.4,0,.2,1)"></div>
                </div>
            </div>`;
        }).join('');

        // Prepend ao content
        const perfCard = document.createElement('div');
        perfCard.className = 'dashboard-card';
        perfCard.style.marginBottom = '1.2rem';
        perfCard.innerHTML = `
            <h3 style="margin-bottom:1rem;display:flex;align-items:center;gap:.5rem;">
                <i class="fas fa-chart-bar" style="color:var(--amber)"></i>
                Performance por Imóvel <span style="font-size:.7rem;color:var(--text-muted);font-weight:400;margin-left:.3rem;">— views × links copiados × conversão</span>
            </h3>
            ${barHtml}`;
        content.prepend(perfCard);
    } catch(e) { console.error('loadPerformanceImovel:', e); }
}

// Expor
window.loadPerformanceImovel = loadPerformanceImovel;

// ══════════════════════════════════════════════════════════
//  LOGS DO ASSISTENTE VIRTUAL
// ══════════════════════════════════════════════════════════

let _chatLogsListener = null;
 
async function loadChatLogs() {
    if (!db) return;
    const loading = document.getElementById('chat-logs-loading');
    const content = document.getElementById('chat-logs-content');
    if (loading) loading.style.display = 'flex';
    if (content) content.style.display = 'none';
 
    try {
        const snap = await db.collection('chat_logs')
            .orderBy('timestamp', 'desc')
            .limit(300)
            .get();
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
 
        if (loading) loading.style.display = 'none';
        if (content) { content.style.display = 'block'; renderChatLogs(logs); }
 
        // Badge — chats novos hoje
        const badge = document.getElementById('badge-chat-logs');
        const today = new Date().toISOString().slice(0,10);
        const hojeAbertos = logs.filter(l => l.event === 'chat_aberto' && l.date === today).length;
        if (badge) { badge.textContent = hojeAbertos > 0 ? hojeAbertos : ''; badge.style.display = hojeAbertos > 0 ? '' : 'none'; }
    } catch(e) {
        if (loading) loading.style.display = 'none';
        if (content) { content.style.display = 'block'; content.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><h3>Sem dados</h3><p>Nenhuma conversa registrada ainda.</p></div>'; }
    }
}
 
function renderChatLogs(logs) {
    const content = document.getElementById('chat-logs-content');
    if (!content) return;
 
    if (!logs.length) {
        content.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><h3>Nenhuma conversa ainda</h3><p>Quando visitantes usarem o chat, os logs completos aparecerão aqui.</p></div>';
        return;
    }
 
    const today = new Date().toISOString().slice(0,10);
 
    // Agrupa por sessão
    const sessions = {};
    logs.forEach(l => {
        if (!sessions[l.sessionId]) sessions[l.sessionId] = {
            sessionId:   l.sessionId,
            deviceId:    l.deviceId,
            date:        l.date,
            ip:          l.ip || '—',
            cidade:      l.cidade || '—',
            regiao:      l.regiao || '—',
            pais:        l.pais || '—',
            isp:         l.isp || '—',
            isProxy:     l.isProxy || false,
            userAgent:   l.userAgent || '—',
            events:      [],
            hasWA:       false,
            hasText:     false,
            waMessages:  [],
            typedTexts:  [],
            botReplies:  [],
        };
        sessions[l.sessionId].events.push(l);
        if (l.event === 'chat_whatsapp') {
            sessions[l.sessionId].hasWA = true;
            if (l.waText || l.msg) sessions[l.sessionId].waMessages.push(l.waText || l.msg);
        }
        if (l.event === 'chat_texto' && l.text) {
            sessions[l.sessionId].hasText = true;
            sessions[l.sessionId].typedTexts.push(l.text);
        }
        if ((l.botResponse || l.botMsg) && !sessions[l.sessionId].botReplies.includes(l.botResponse || l.botMsg)) {
            sessions[l.sessionId].botReplies.push((l.botResponse || l.botMsg).slice(0, 120));
        }
        // Pega IP/geo do primeiro evento que tiver
        if (l.ip && l.ip !== '—' && sessions[l.sessionId].ip === '—') {
            sessions[l.sessionId].ip      = l.ip;
            sessions[l.sessionId].cidade  = l.cidade || '—';
            sessions[l.sessionId].regiao  = l.regiao || '—';
            sessions[l.sessionId].pais    = l.pais   || '—';
            sessions[l.sessionId].isp     = l.isp    || '—';
            sessions[l.sessionId].isProxy = l.isProxy || false;
        }
    });
 
    const sessionList = Object.values(sessions).sort((a,b) => {
        const aT = Math.max(...a.events.map(e => e.timestamp?.seconds || 0));
        const bT = Math.max(...b.events.map(e => e.timestamp?.seconds || 0));
        return bT - aT;
    });
 
    // KPIs
    const totalSessions = sessionList.length;
    const waSessions    = sessionList.filter(s => s.hasWA).length;
    const textSessions  = sessionList.filter(s => s.hasText).length;
    const hojeS         = sessionList.filter(s => s.date === today).length;
    const convRate      = totalSessions > 0 ? Math.round((waSessions/totalSessions)*100) : 0;
    const proxySessions = sessionList.filter(s => s.isProxy).length;
 
    function escHtml(str) {
        return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
 
    function fmtTs(ts) {
        if (!ts) return '—';
        try {
            const d = ts.toDate ? ts.toDate() : new Date((ts.seconds||0) * 1000);
            return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});
        } catch { return '—'; }
    }
 
    function fmtHora(ts) {
        if (!ts) return '';
        try {
            const d = ts.toDate ? ts.toDate() : new Date((ts.seconds||0) * 1000);
            return d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
        } catch { return ''; }
    }
 
    function intentBadge(intent) {
        if (!intent || intent === 'nenhuma') return '<span style="font-size:.65rem;color:var(--red);background:rgba(239,68,68,.1);padding:.1rem .45rem;border-radius:6px;">sem intenção</span>';
        if (intent.startsWith('flow:')) return `<span style="font-size:.65rem;color:var(--accent);background:var(--accent-soft);padding:.1rem .45rem;border-radius:6px;">${intent}</span>`;
        if (intent.includes('answerFn')) return `<span style="font-size:.65rem;color:var(--green);background:var(--green-soft);padding:.1rem .45rem;border-radius:6px;">resposta dinâmica</span>`;
        return `<span style="font-size:.65rem;color:var(--purple);background:var(--purple-soft);padding:.1rem .45rem;border-radius:6px;">${intent}</span>`;
    }
 
    function renderSession(s) {
        const evts = [...s.events].sort((a,b) => (a.timestamp?.seconds||0) - (b.timestamp?.seconds||0));
        const tsFirst = evts[0]?.timestamp;
        const tsLast  = evts[evts.length-1]?.timestamp;
        const duration = (tsFirst && tsLast)
            ? (() => { const diff = (tsLast.seconds||0)-(tsFirst.seconds||0); return diff < 60 ? diff+'s' : Math.round(diff/60)+'min'; })()
            : null;
        const borderColor = s.hasWA ? 'var(--green)' : s.hasText ? 'var(--accent)' : 'var(--border)';
        const isToday = s.date === today;
 
        const loc = [s.cidade, s.pais].filter(x => x && x !== '—').join(', ');
 
        // Timeline de eventos
        const timelineItems = evts.map(e => {
            const hora = e.horaStr || fmtTs(e.timestamp);
            const horaShort = e.hora || fmtHora(e.timestamp);
 
            if (e.event === 'chat_aberto') {
                return `<div style="display:flex;align-items:flex-start;gap:.5rem;padding:.4rem 0;border-bottom:1px solid rgba(255,255,255,.04);">
                    <div style="min-width:52px;font-size:.63rem;color:var(--text-muted);font-family:monospace;padding-top:.1rem;">${horaShort || '—'}</div>
                    <span style="font-size:.75rem;">🟢</span>
                    <div style="font-size:.75rem;color:var(--text-secondary);">Chat aberto na página <strong style="color:var(--text-primary);">${escHtml(e.page||'—')}</strong>
                        ${e.ip && e.ip !== '—' ? `<span style="color:var(--text-muted);font-family:monospace;"> · ${escHtml(e.ip)}</span>` : ''}
                    </div>
                </div>`;
            }
 
            if (e.event === 'chat_texto') {
                return `<div style="display:flex;align-items:flex-start;gap:.5rem;padding:.4rem 0;border-bottom:1px solid rgba(255,255,255,.04);">
                    <div style="min-width:52px;font-size:.63rem;color:var(--text-muted);font-family:monospace;padding-top:.1rem;">${horaShort || '—'}</div>
                    <span style="font-size:.75rem;margin-top:.1rem;">💬</span>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;margin-bottom:.2rem;">
                            <span style="font-size:.68rem;color:#93c5fd;font-weight:600;">Usuário</span>
                            ${intentBadge(e.intentDetected)}
                        </div>
                        <div style="background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.2);border-radius:10px;border-bottom-left-radius:3px;padding:.4rem .75rem;font-size:.82rem;color:#e2e8f0;max-width:90%;word-break:break-word;">${escHtml(e.text||'')}</div>
                        ${(e.botResponse||e.botMsg) ? `<div style="margin-top:.3rem;display:flex;align-items:flex-start;gap:.35rem;">
                            <span style="font-size:.68rem;color:#34d399;font-weight:600;flex-shrink:0;">🤖 Bot:</span>
                            <span style="font-size:.72rem;color:rgba(226,232,240,.65);font-style:italic;word-break:break-word;">${escHtml((e.botResponse||e.botMsg||'').slice(0,180))}${((e.botResponse||e.botMsg||'').length>180?'…':'')}</span>
                        </div>` : ''}
                    </div>
                </div>`;
            }
 
            if (e.event === 'chat_click') {
                return `<div style="display:flex;align-items:center;gap:.5rem;padding:.3rem 0;border-bottom:1px solid rgba(255,255,255,.04);">
                    <div style="min-width:52px;font-size:.63rem;color:var(--text-muted);font-family:monospace;">${horaShort || '—'}</div>
                    <span style="font-size:.75rem;">👆</span>
                    <span style="background:rgba(99,102,241,.12);color:#818cf8;padding:.15rem .55rem;border-radius:6px;font-size:.73rem;font-weight:600;">${escHtml(e.label||'—')}</span>
                    ${e.next ? `<span style="font-size:.7rem;color:var(--text-muted);">→ <span style="color:var(--text-secondary);">${escHtml(e.next)}</span></span>` : ''}
                    ${(e.botResponse) ? `<span style="font-size:.65rem;color:rgba(52,212,135,.6);">→ ${escHtml(e.botResponse.slice(0,60))}</span>` : ''}
                </div>`;
            }
 
            if (e.event === 'chat_chip') {
                return `<div style="display:flex;align-items:center;gap:.5rem;padding:.3rem 0;border-bottom:1px solid rgba(255,255,255,.04);">
                    <div style="min-width:52px;font-size:.63rem;color:var(--text-muted);font-family:monospace;">${horaShort || '—'}</div>
                    <span style="font-size:.75rem;">⚡</span>
                    <span style="background:rgba(245,158,11,.1);color:var(--amber);padding:.15rem .55rem;border-radius:6px;font-size:.73rem;font-weight:600;">Atalho: ${escHtml(e.label||'—')}</span>
                </div>`;
            }
 
            if (e.event === 'chat_nav') {
                return `<div style="display:flex;align-items:flex-start;gap:.5rem;padding:.4rem 0;border-bottom:1px solid rgba(255,255,255,.04);">
                    <div style="min-width:52px;font-size:.63rem;color:var(--text-muted);font-family:monospace;padding-top:.1rem;">${horaShort || '—'}</div>
                    <span style="font-size:.75rem;margin-top:.1rem;">🤖</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:.68rem;color:#34d399;font-weight:600;margin-bottom:.2rem;">Bot respondeu · nó: <span style="font-family:monospace;color:var(--text-secondary);">${escHtml(e.node||'—')}</span></div>
                        ${(e.botMsg||e.botResponse) ? `<div style="background:rgba(52,152,219,.08);border:1px solid rgba(52,152,219,.12);border-radius:10px;border-bottom-right-radius:3px;padding:.4rem .75rem;font-size:.78rem;color:rgba(226,232,240,.7);max-width:90%;word-break:break-word;font-style:italic;">${escHtml((e.botMsg||e.botResponse||'').slice(0,200))}${((e.botMsg||e.botResponse||'').length>200?'…':'')}</div>` : ''}
                    </div>
                </div>`;
            }
 
            if (e.event === 'chat_whatsapp') {
                return `<div style="display:flex;align-items:flex-start;gap:.5rem;padding:.4rem 0;border-bottom:1px solid rgba(255,255,255,.04);">
                    <div style="min-width:52px;font-size:.63rem;color:var(--text-muted);font-family:monospace;padding-top:.1rem;">${horaShort || '—'}</div>
                    <span style="font-size:.75rem;margin-top:.1rem;">📱</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:.72rem;color:var(--green);font-weight:700;margin-bottom:.2rem;">✅ CONVERTEU — Abriu WhatsApp</div>
                        ${(e.waText||e.msg) ? `<div style="background:rgba(37,211,102,.08);border:1px solid rgba(37,211,102,.2);border-radius:10px;padding:.4rem .75rem;font-size:.78rem;color:rgba(226,232,240,.8);max-width:90%;word-break:break-word;">${escHtml((e.waText||e.msg||'').slice(0,200))}</div>` : ''}
                    </div>
                </div>`;
            }
            return '';
        }).filter(Boolean).join('');
 
        return `
        <div style="border:1px solid var(--border);border-left:3px solid ${borderColor};border-radius:var(--radius);background:${s.isProxy ? 'rgba(239,68,68,.03)' : 'var(--bg-elevated)'};overflow:hidden;margin-bottom:.8rem;">
            <!-- Cabeçalho da sessão -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem;padding:.85rem 1rem;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;"
                 onclick="const det=this.nextElementSibling;det.style.display=det.style.display==='none'?'block':'none';this.querySelector('.lb-chev').style.transform=det.style.display==='none'?'':'rotate(180deg)'">
                <div style="display:flex;align-items:flex-start;gap:.65rem;flex-wrap:wrap;">
                    <div>
                        <!-- IP + GEO -->
                        <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.2rem;">
                            <span style="font-family:monospace;font-size:.72rem;font-weight:700;color:var(--text-primary);">${escHtml(s.ip)}</span>
                            ${loc ? `<span style="font-size:.7rem;color:var(--text-muted);">· ${escHtml(loc)}</span>` : ''}
                            ${s.isProxy ? '<span style="background:rgba(239,68,68,.2);color:var(--red);font-size:.62rem;padding:.1rem .45rem;border-radius:6px;font-weight:700;">⚠️ Proxy/VPN</span>' : ''}
                            ${isToday ? '<span style="background:rgba(52,212,135,.15);color:var(--green);font-size:.62rem;padding:.1rem .45rem;border-radius:6px;font-weight:700;">Hoje</span>' : ''}
                        </div>
                        <!-- Device + data -->
                        <div style="font-size:.7rem;color:var(--text-muted);display:flex;gap:.4rem;flex-wrap:wrap;">
                            <span style="font-family:monospace;">${(s.deviceId||'').slice(0,22)}…</span>
                            <span>·</span>
                            <span>${fmtTs(evts[0]?.timestamp)}</span>
                            ${duration ? `<span>· ⏱ ${duration}</span>` : ''}
                            <span>· ${evts.length} evento${evts.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;flex-shrink:0;">
                    ${s.hasWA ? '<span style="background:rgba(34,197,94,.15);color:var(--green);font-size:.67rem;padding:.15rem .55rem;border-radius:99px;font-weight:700;"><i class="fab fa-whatsapp"></i> Converteu</span>' : ''}
                    ${s.hasText ? `<span style="background:rgba(59,130,246,.12);color:#93c5fd;font-size:.67rem;padding:.15rem .55rem;border-radius:99px;font-weight:600;">💬 ${s.typedTexts.length} msg${s.typedTexts.length !== 1 ? 's' : ''}</span>` : ''}
                    ${s.isp && s.isp !== '—' ? `<span style="font-size:.63rem;color:var(--text-muted);">${escHtml(s.isp.slice(0,30))}</span>` : ''}
                    <i class="fas fa-chevron-down lb-chev" style="color:var(--text-muted);font-size:.65rem;transition:transform .2s;"></i>
                </div>
            </div>
 
            <!-- Detalhe da sessão (colapsável) -->
            <div style="display:none;">
                <!-- Meta da sessão -->
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.4rem;padding:.6rem 1rem;background:rgba(0,0,0,.15);border-bottom:1px solid rgba(255,255,255,.04);">
                    <div style="font-size:.68rem;">
                        <span style="color:var(--text-muted);display:block;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.15rem;">IP</span>
                        <span style="color:var(--text-primary);font-family:monospace;">${escHtml(s.ip)}
                            ${s.ip && s.ip !== '—' ? `<a href="https://ipinfo.io/${s.ip}" target="_blank" style="color:var(--accent);margin-left:.3rem;font-size:.6rem;"><i class="fas fa-external-link-alt"></i></a>` : ''}
                        </span>
                    </div>
                    <div style="font-size:.68rem;">
                        <span style="color:var(--text-muted);display:block;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.15rem;">Localização</span>
                        <span style="color:var(--text-primary);">${escHtml([s.cidade, s.regiao, s.pais].filter(x => x && x !== '—').join(', ')) || '—'}</span>
                    </div>
                    <div style="font-size:.68rem;">
                        <span style="color:var(--text-muted);display:block;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.15rem;">ISP</span>
                        <span style="color:var(--text-primary);">${escHtml(s.isp || '—')}</span>
                    </div>
                    <div style="font-size:.68rem;">
                        <span style="color:var(--text-muted);display:block;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.15rem;">Proxy/VPN</span>
                        <span style="color:${s.isProxy ? 'var(--red)' : 'var(--green)'};">${s.isProxy ? '🔴 SIM' : '✅ Não detectado'}</span>
                    </div>
                    <div style="font-size:.68rem;">
                        <span style="color:var(--text-muted);display:block;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.15rem;">Msgs digitadas</span>
                        <span style="color:var(--text-primary);">${s.typedTexts.length}</span>
                    </div>
                    <div style="font-size:.68rem;">
                        <span style="color:var(--text-muted);display:block;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.15rem;">Converteu WA</span>
                        <span style="color:${s.hasWA ? 'var(--green)' : 'var(--text-muted)'};">${s.hasWA ? '✅ Sim' : '✖ Não'}</span>
                    </div>
                    <div style="font-size:.68rem;">
                        <span style="color:var(--text-muted);display:block;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.15rem;">Duração</span>
                        <span style="color:var(--text-primary);">${duration || '—'}</span>
                    </div>
                    <div style="font-size:.68rem;">
                        <span style="color:var(--text-muted);display:block;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.15rem;">Início</span>
                        <span style="color:var(--text-primary);">${fmtTs(evts[0]?.timestamp)}</span>
                    </div>
                </div>
 
                ${s.typedTexts.length ? `
                <!-- O que o usuário perguntou -->
                <div style="padding:.55rem 1rem;background:rgba(59,130,246,.04);border-bottom:1px solid rgba(255,255,255,.04);">
                    <div style="font-size:.65rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.35rem;">💬 Perguntas do usuário</div>
                    ${s.typedTexts.map(t => `<div style="font-size:.78rem;color:#e2e8f0;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.15);border-radius:8px;padding:.3rem .65rem;margin-bottom:.3rem;word-break:break-word;">"${escHtml(t.slice(0,200))}"</div>`).join('')}
                </div>` : ''}
 
                ${s.waMessages.length ? `
                <!-- Mensagens enviadas ao WA -->
                <div style="padding:.55rem 1rem;background:rgba(37,211,102,.04);border-bottom:1px solid rgba(255,255,255,.04);">
                    <div style="font-size:.65rem;color:var(--green);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.35rem;">📱 Mensagens enviadas ao WhatsApp</div>
                    ${s.waMessages.map(m => `<div style="font-size:.78rem;color:#e2e8f0;background:rgba(37,211,102,.08);border:1px solid rgba(37,211,102,.15);border-radius:8px;padding:.3rem .65rem;margin-bottom:.3rem;word-break:break-word;">${escHtml(m.slice(0,300))}</div>`).join('')}
                </div>` : ''}
 
                <!-- Timeline completa com horários -->
                <div style="padding:.6rem 1rem 1rem;">
                    <div style="font-size:.65rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.5rem;">📋 Timeline completa</div>
                    <div style="font-family:monospace;font-size:.63rem;color:var(--text-muted);margin-bottom:.5rem;display:flex;gap:1rem;">
                        <span style="min-width:52px;">Hora</span>
                        <span>Evento</span>
                    </div>
                    ${timelineItems || '<span style="color:var(--text-muted);font-size:.78rem;">Nenhum evento detalhado</span>'}
                </div>
 
                <!-- UA -->
                <details style="padding:0 1rem .65rem;">
                    <summary style="font-size:.68rem;color:var(--text-muted);cursor:pointer;user-select:none;padding:.3rem 0;">▶ User Agent completo</summary>
                    <div style="margin-top:.3rem;font-size:.65rem;color:var(--text-muted);word-break:break-all;font-family:monospace;background:var(--bg-elevated);padding:.4rem .6rem;border-radius:4px;border:1px solid var(--border);">${escHtml(s.userAgent || '—')}</div>
                </details>
            </div>
        </div>`;
    }
 
    content.innerHTML = `
    <div class="stats-grid" style="margin-bottom:1.5rem;">
        <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-comments"></i></div><div class="stat-info"><span class="stat-value">${totalSessions}</span><span class="stat-label">Conversas Totais</span></div></div>
        <div class="stat-card"><div class="stat-icon green"><i class="fas fa-calendar-day"></i></div><div class="stat-info"><span class="stat-value">${hojeS}</span><span class="stat-label">Hoje</span></div></div>
        <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-keyboard"></i></div><div class="stat-info"><span class="stat-value">${textSessions}</span><span class="stat-label">Digitaram algo</span></div></div>
        <div class="stat-card"><div class="stat-icon amber"><i class="fab fa-whatsapp"></i></div><div class="stat-info"><span class="stat-value">${waSessions}</span><span class="stat-label">Foram ao WhatsApp</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--green-soft);color:var(--green);"><i class="fas fa-chart-line"></i></div><div class="stat-info"><span class="stat-value">${convRate}%</span><span class="stat-label">Taxa de Conversão</span></div></div>
        ${proxySessions > 0 ? `<div class="stat-card"><div class="stat-icon" style="background:var(--red-soft);color:var(--red);"><i class="fas fa-user-secret"></i></div><div class="stat-info"><span class="stat-value" style="color:var(--red);">${proxySessions}</span><span class="stat-label">Proxy/VPN detectados</span></div></div>` : ''}
    </div>
 
    <!-- Legenda de ícones -->
    <div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;padding:.55rem .9rem;background:var(--bg-elevated);border-radius:var(--radius-sm);border:1px solid var(--border);margin-bottom:1.2rem;font-size:.67rem;color:var(--text-muted);">
        <strong style="color:var(--text-secondary);">LEGENDA:</strong>
        🟢 Abriu chat &nbsp;|&nbsp; 💬 Texto digitado &nbsp;|&nbsp; 🤖 Resposta do bot &nbsp;|&nbsp; 👆 Clicou opção &nbsp;|&nbsp; ⚡ Usou atalho &nbsp;|&nbsp; 📱 Abriu WhatsApp &nbsp;|&nbsp; <strong>Hora</strong> = coluna da esquerda (HH:MM:SS)
    </div>
 
    <!-- Ações -->
    <div style="display:flex;justify-content:flex-end;gap:.6rem;flex-wrap:wrap;margin-bottom:1rem;">
        <button onclick="loadChatLogs()" class="btn-secondary"><i class="fas fa-sync-alt"></i> Atualizar</button>
        <button onclick="_exportarChatLogs()" class="btn-secondary"><i class="fas fa-file-csv" style="color:var(--green)"></i> Exportar CSV</button>
        <button onclick="_limparChatLogs()" class="btn-danger" style="opacity:.75;"><i class="fas fa-broom"></i> Limpar logs</button>
    </div>
 
    <!-- Lista de sessões -->
    <div class="dashboard-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">
            <h3><i class="fas fa-list-ul"></i> Histórico de Conversas <span style="font-size:.72rem;color:var(--text-muted);font-weight:400;">(clique para expandir)</span></h3>
            <span style="font-size:.75rem;color:var(--text-muted);">${sessionList.length} sessões${sessionList.length > 50 ? ' · mostrando 50' : ''}</span>
        </div>
        ${sessionList.slice(0, 50).map(renderSession).join('')}
        ${sessionList.length > 50 ? `<div style="text-align:center;padding:.8rem;color:var(--text-muted);font-size:.8rem;">… e mais ${sessionList.length - 50} conversas</div>` : ''}
    </div>`;
}
 
// Exportar CSV dos chat logs
async function _exportarChatLogs() {
    if (!db) return;
    try {
        showToast('Gerando CSV...','info');
        const snap = await db.collection('chat_logs').orderBy('timestamp','desc').limit(500).get();
        const rows = [['Data','Hora','Sessão','DeviceID','IP','Cidade','País','ISP','Proxy','Evento','Texto/Label','Intenção','Bot Respondeu','Página']];
        snap.docs.forEach(d => {
            const v = d.data();
            rows.push([
                v.date||'',
                v.horaStr||v.hora||'',
                (v.sessionId||'').slice(-12),
                (v.deviceId||'').slice(0,20),
                v.ip||'',
                v.cidade||'',
                v.pais||'',
                v.isp||'',
                v.isProxy ? 'Sim' : 'Não',
                v.event||'',
                (v.text||v.label||v.waText||v.msg||'').slice(0,120),
                v.intentDetected||'',
                (v.botResponse||v.botMsg||'').slice(0,120),
                v.page||'',
            ]);
        });
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `chat-logs-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        showToast(`✅ CSV exportado — ${snap.size} eventos`);
    } catch(e) { showToast('Erro ao exportar','error'); }
}
 
async function _limparChatLogs() {
    if (!confirm('Limpar TODOS os logs de chat? Esta ação não pode ser desfeita.')) return;
    try {
        const snap = await db.collection('chat_logs').get();
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        showToast('Logs apagados.');
        loadChatLogs();
    } catch(e) { showToast('Erro ao limpar','error'); }
}
 
window._exportarChatLogs = _exportarChatLogs;
window._limparChatLogs   = _limparChatLogs;
window.loadChatLogs      = loadChatLogs;

// ── Real-time badge para novos chats ──
function startChatLogsListener() {
    if (!db) return;
    let _chatInit = false;
    db.collection('chat_logs')
        .where('event','==','chat_aberto')
        .orderBy('timestamp','desc')
        .limit(1)
        .onSnapshot(snap => {
            if (!_chatInit) { _chatInit = true; return; }
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    showNotification('💬 Chat aberto!', 'Um visitante iniciou uma conversa', 'purple');
                    const today = new Date().toISOString().slice(0,10);
                    const badge = document.getElementById('badge-chat-logs');
                    if (badge) {
                        const cur = parseInt(badge.textContent || '0') + 1;
                        badge.textContent = cur;
                        badge.style.display = '';
                    }
                }
            });
        }, err => console.warn('chatLogsRT:', err));
}

window.loadChatLogs = loadChatLogs;
