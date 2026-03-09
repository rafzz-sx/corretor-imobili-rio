// ========== INICIALIZAR FIREBASE ==========
// A configuração está no arquivo firebase-config.js
// Certifique-se de que o arquivo firebase-config.js está configurado corretamente

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Variáveis globais
let currentUser = null;
let imoveisData = [];
let deleteId = null;

// ========== AUTENTICAÇÃO ==========

// Verificar estado de autenticação
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        showAdminPanel();
        loadDashboard();
    } else {
        showLoginScreen();
    }
});

// Login
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-senha').value;
        const errorDiv = document.getElementById('login-error');
        
        try {
            const submitBtn = loginForm.querySelector('.btn-login');
            submitBtn.innerHTML = '<span class="loading"></span>';
            submitBtn.disabled = true;
            
            await auth.signInWithEmailAndPassword(email, password);
            errorDiv.textContent = '';
        } catch (error) {
            console.error('Erro de login:', error);
            let errorMessage = 'Erro ao fazer login. Tente novamente.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Usuário não encontrado.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Senha incorreta.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Muitas tentativas. Tente mais tarde.';
                    break;
            }
            
            errorDiv.textContent = errorMessage;
            const submitBtn = loginForm.querySelector('.btn-login');
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Entrar</span>';
            submitBtn.disabled = false;
        }
    });
}

// Logout
function logout() {
    auth.signOut().then(() => {
        showToast('Logout realizado com sucesso!');
    }).catch((error) => {
        console.error('Erro ao fazer logout:', error);
    });
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.toggle-password i');
    
    if (input.type === 'password') {
        input.type = 'text';
        button.classList.remove('fa-eye');
        button.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        button.classList.remove('fa-eye-slash');
        button.classList.add('fa-eye');
    }
}

// ========== NAVEGAÇÃO ==========

function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
}

function showAdminPanel() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'flex';
    document.getElementById('user-email').textContent = currentUser.email;
}

function showSection(sectionName) {
    // Esconder todas as seções
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remover active de todos os nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Mostrar seção selecionada
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Ativar nav item correspondente
    const navItem = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // Atualizar título
    const titles = {
        'dashboard': 'Dashboard',
        'imoveis': 'Gerenciar Imóveis',
        'adicionar': document.getElementById('imovel-id').value ? 'Editar Imóvel' : 'Adicionar Imóvel'
    };
    document.getElementById('page-title').textContent = titles[sectionName] || 'Painel';
    
    // Carregar dados específicos da seção
    if (sectionName === 'imoveis') {
        loadImoveisTable();
    } else if (sectionName === 'dashboard') {
        loadDashboard();
    } else if (sectionName === 'adicionar') {
        resetForm();
    }
}

// Event listeners para navegação
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.getAttribute('data-section');
        showSection(section);
    });
});

// ========== DASHBOARD ==========

async function loadDashboard() {
    try {
        const snapshot = await db.collection('imoveis').get();
        imoveisData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Estatísticas
        const totalImoveis = imoveisData.length;
        const bairros = [...new Set(imoveisData.map(i => i.bairro))];
        const totalBairros = bairros.length;
        const mediaQuartos = totalImoveis > 0 
            ? Math.round(imoveisData.reduce((sum, i) => sum + (parseInt(i.quartos) || 0), 0) / totalImoveis)
            : 0;
        const precoTotal = imoveisData.reduce((sum, i) => sum + (parseFloat(i.preco) || 0), 0);
        const precoMedio = totalImoveis > 0 ? Math.round(precoTotal / totalImoveis) : 0;
        
        // Atualizar UI
        document.getElementById('total-imoveis').textContent = totalImoveis;
        document.getElementById('total-bairros').textContent = totalBairros;
        document.getElementById('media-quartos').textContent = mediaQuartos;
        document.getElementById('preco-medio').textContent = 'R$ ' + precoMedio.toLocaleString('pt-BR');
        
        // Gráfico de bairros
        renderBairrosChart(imoveisData);
        
        // Últimos imóveis
        renderUltimosImoveis(imoveisData.slice(0, 5));
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

function renderBairrosChart(imoveis) {
    const container = document.getElementById('bairros-chart');
    
    if (imoveis.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum imóvel cadastrado</p>';
        return;
    }
    
    // Contar imóveis por bairro
    const bairrosCount = {};
    imoveis.forEach(imo => {
        bairrosCount[imo.bairro] = (bairrosCount[imo.bairro] || 0) + 1;
    });
    
    // Ordenar por quantidade
    const sortedBairros = Object.entries(bairrosCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const maxCount = Math.max(...sortedBairros.map(b => b[1]));
    
    let html = '';
    sortedBairros.forEach(([bairro, count]) => {
        const percentage = (count / maxCount) * 100;
        html += `
            <div class="bairro-bar">
                <span class="bairro-name">${bairro}</span>
                <div class="bar-wrapper">
                    <div class="bar-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="bar-count">${count}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderUltimosImoveis(imoveis) {
    const container = document.getElementById('ultimos-imoveis');
    
    if (imoveis.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum imóvel cadastrado</p>';
        return;
    }
    
    let html = '';
    imoveis.forEach(imo => {
        html += `
            <div class="recent-item">
                <img src="${imo.imagem || 'https://via.placeholder.com/60x45/1a1a2e/fff?text=Imóvel'}" alt="${imo.titulo}">
                <div class="recent-info">
                    <h4>${imo.titulo}</h4>
                    <p>${imo.bairro} • ${imo.quartos} quartos • ${imo.area}m²</p>
                </div>
                <span class="recent-price">R$ ${parseFloat(imo.preco).toLocaleString('pt-BR')}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ========== LISTA DE IMÓVEIS ==========

async function loadImoveisTable() {
    try {
        const snapshot = await db.collection('imoveis').orderBy('createdAt', 'desc').get();
        imoveisData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderImoveisTable(imoveisData);
        updateBairroFilter(imoveisData);
        
    } catch (error) {
        console.error('Erro ao carregar imóveis:', error);
        showToast('Erro ao carregar imóveis', 'error');
    }
}

function renderImoveisTable(imoveis) {
    const tbody = document.getElementById('imoveis-table-body');
    
    if (imoveis.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-home"></i>
                    <h3>Nenhum imóvel cadastrado</h3>
                    <p>Clique em "Novo Imóvel" para adicionar o primeiro.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    imoveis.forEach(imo => {
        html += `
            <tr>
                <td>
                    <img src="${imo.imagem || 'https://via.placeholder.com/60x45/1a1a2e/fff?text=Imóvel'}" 
                         alt="${imo.titulo}" 
                         onerror="this.src='https://via.placeholder.com/60x45/1a1a2e/fff?text=Imóvel'">
                </td>
                <td><strong>${imo.titulo}</strong></td>
                <td>${imo.bairro}</td>
                <td>${imo.quartos}</td>
                <td>${imo.area} m²</td>
                <td>R$ ${parseFloat(imo.preco).toLocaleString('pt-BR')}</td>
                <td class="actions">
                    <button class="btn-icon btn-edit" onclick="editImovel('${imo.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteImovel('${imo.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function updateBairroFilter(imoveis) {
    const select = document.getElementById('filter-bairro');
    const bairros = [...new Set(imoveis.map(i => i.bairro))].sort();
    
    let html = '<option value="">Todos os bairros</option>';
    bairros.forEach(bairro => {
        html += `<option value="${bairro}">${bairro}</option>`;
    });
    
    select.innerHTML = html;
}

// Filtros
const searchInput = document.getElementById('search-imoveis');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = imoveisData.filter(imo => 
            imo.titulo.toLowerCase().includes(searchTerm) ||
            imo.bairro.toLowerCase().includes(searchTerm) ||
            imo.descricao.toLowerCase().includes(searchTerm)
        );
        renderImoveisTable(filtered);
    });
}

const filterBairro = document.getElementById('filter-bairro');
if (filterBairro) {
    filterBairro.addEventListener('change', (e) => {
        const bairro = e.target.value;
        const filtered = bairro 
            ? imoveisData.filter(imo => imo.bairro === bairro)
            : imoveisData;
        renderImoveisTable(filtered);
    });
}

// ========== CRUD IMÓVEIS ==========

// Formulário
const imovelForm = document.getElementById('imovel-form');
if (imovelForm) {
    imovelForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('imovel-id').value;
        const fotosInputs = document.querySelectorAll('.foto-input');
        const fotos = Array.from(fotosInputs)
            .map(input => input.value.trim())
            .filter(url => url !== '');
        
        const imovelData = {
            titulo: document.getElementById('imovel-titulo').value,
            bairro: document.getElementById('imovel-bairro').value,
            quartos: parseInt(document.getElementById('imovel-quartos').value),
            area: parseInt(document.getElementById('imovel-area').value),
            preco: parseFloat(document.getElementById('imovel-preco').value.replace(/[^0-9]/g, '')),
            descricao: document.getElementById('imovel-descricao').value,
            imagem: document.getElementById('imovel-imagem').value,
            fotos: fotos.length > 0 ? fotos : [document.getElementById('imovel-imagem').value],
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            const submitBtn = imovelForm.querySelector('.btn-primary');
            submitBtn.innerHTML = '<span class="loading"></span>';
            submitBtn.disabled = true;
            
            if (id) {
                // Editar
                await db.collection('imoveis').doc(id).update(imovelData);
                showToast('Imóvel atualizado com sucesso!');
            } else {
                // Adicionar
                imovelData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('imoveis').add(imovelData);
                showToast('Imóvel adicionado com sucesso!');
            }
            
            resetForm();
            showSection('imoveis');
            
        } catch (error) {
            console.error('Erro ao salvar imóvel:', error);
            showToast('Erro ao salvar imóvel', 'error');
        } finally {
            const submitBtn = imovelForm.querySelector('.btn-primary');
            submitBtn.innerHTML = '<i class="fas fa-save"></i><span id="btn-submit-text">Salvar Imóvel</span>';
            submitBtn.disabled = false;
        }
    });
}

// Formatar preço em tempo real
const precoInput = document.getElementById('imovel-preco');
if (precoInput) {
    precoInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
        if (value) {
            value = parseInt(value).toLocaleString('pt-BR');
            e.target.value = value;
        }
    });
}

function resetForm() {
    document.getElementById('imovel-form').reset();
    document.getElementById('imovel-id').value = '';
    document.querySelectorAll('.foto-input').forEach(input => input.value = '');
    document.getElementById('btn-submit-text').textContent = 'Salvar Imóvel';
}

async function editImovel(id) {
    try {
        const doc = await db.collection('imoveis').doc(id).get();
        if (!doc.exists) {
            showToast('Imóvel não encontrado', 'error');
            return;
        }
        
        const imo = doc.data();
        
        document.getElementById('imovel-id').value = id;
        document.getElementById('imovel-titulo').value = imo.titulo || '';
        document.getElementById('imovel-bairro').value = imo.bairro || '';
        document.getElementById('imovel-quartos').value = imo.quartos || '';
        document.getElementById('imovel-area').value = imo.area || '';
        document.getElementById('imovel-preco').value = imo.preco ? imo.preco.toLocaleString('pt-BR') : '';
        document.getElementById('imovel-descricao').value = imo.descricao || '';
        document.getElementById('imovel-imagem').value = imo.imagem || '';
        
        // Preencher fotos adicionais
        const fotosInputs = document.querySelectorAll('.foto-input');
        if (imo.fotos && imo.fotos.length > 1) {
            imo.fotos.slice(0, 4).forEach((foto, index) => {
                if (fotosInputs[index]) {
                    fotosInputs[index].value = foto;
                }
            });
        }
        
        document.getElementById('btn-submit-text').textContent = 'Atualizar Imóvel';
        showSection('adicionar');
        
    } catch (error) {
        console.error('Erro ao carregar imóvel:', error);
        showToast('Erro ao carregar imóvel', 'error');
    }
}

function deleteImovel(id) {
    deleteId = id;
    document.getElementById('delete-modal').classList.add('active');
}

function closeDeleteModal() {
    deleteId = null;
    document.getElementById('delete-modal').classList.remove('active');
}

async function confirmDelete() {
    if (!deleteId) return;
    
    try {
        await db.collection('imoveis').doc(deleteId).delete();
        showToast('Imóvel excluído com sucesso!');
        closeDeleteModal();
        loadImoveisTable();
    } catch (error) {
        console.error('Erro ao excluir imóvel:', error);
        showToast('Erro ao excluir imóvel', 'error');
    }
}

// ========== UTILITÁRIOS ==========

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const icon = toast.querySelector('i');
    
    toastMessage.textContent = message;
    
    if (type === 'error') {
        toast.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
        icon.className = 'fas fa-exclamation-circle';
    } else {
        toast.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
        icon.className = 'fas fa-check-circle';
    }
    
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// ========== INICIALIZAÇÃO ==========

// Fechar modal ao clicar fora
document.getElementById('delete-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeDeleteModal();
    }
});

// Tecla ESC para fechar modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeDeleteModal();
    }
});