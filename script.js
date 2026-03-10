// ========== INICIALIZAR FIREBASE ==========
// A configuração está no arquivo firebase-config.js
// Certifique-se de que o arquivo firebase-config.js está configurado corretamente

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Array de imóveis (será preenchido do Firebase)
let imoveis = [];
let imoveisCarregados = false;

// ========== CARREGAR IMÓVEIS DO FIREBASE ==========

async function carregarImoveis() {
    try {
        const gallery = document.getElementById('gallery');
        if (!gallery) return;
        
        // Mostrar loading
        gallery.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <div class="loading" style="display: inline-block; width: 40px; height: 40px; border: 3px solid rgba(52, 152, 219, 0.3); border-radius: 50%; border-top-color: #3498db; animation: spin 1s linear infinite;"></div>
                <p style="color: #888; margin-top: 1rem;">Carregando imóveis...</p>
            </div>
        `;
        
        const snapshot = await db.collection('imoveis').orderBy('createdAt', 'desc').get();
        imoveis = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        imoveisCarregados = true;
        // Imóvel em destaque aparece sempre primeiro
        imoveis.sort((a,b) => (b.destaque===true?1:0) - (a.destaque===true?1:0));
        renderGallery(imoveis);
        return imoveis;
        
    } catch (error) {
        console.error('Erro ao carregar imóveis:', error);
        // Fallback: usar dados estáticos se houver erro
        carregarImoveisEstaticos();
    }
}

// Dados estáticos de fallback
function carregarImoveisEstaticos() {
    imoveis = [
        {
            id: 1,
            bairro: 'Ipanema',
            quartos: 2,
            preco: 850000,
            area: 80,
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
            id: 2,
            bairro: 'Barra da Tijuca',
            quartos: 3,
            preco: 1200000,
            area: 140,
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
            id: 3,
            bairro: 'Recreio dos Bandeirantes',
            quartos: 2,
            preco: 520000,
            area: 70,
            titulo: 'Apartamento Moderno no Recreio',
            descricao: 'Apartamento compacto e moderno no Recreio, próximo à praia e comércios locais.',
            imagem: 'https://files.catbox.moe/ihe3p5.png',
            fotos: [
                'https://files.catbox.moe/ihe3p5.png',
                'https://files.catbox.moe/0tg1le.png',
                'https://remax.azureedge.net/userimages/60/LargeWM/L_b74eaab9-55e3-43c2-8814-06f6152a1f05.jpg',
                'https://files.catbox.moe/ta8pp6.png'
            ]
        },
        {
            id: 4,
            bairro: 'Leblon',
            quartos: 3,
            preco: 1500000,
            area: 110,
            titulo: 'Apartamento Familiar no Leblon',
            descricao: 'Espaçoso apartamento familiar com 3 quartos em um dos bairros mais valorizados do Rio de Janeiro.',
            imagem: 'https://files.catbox.moe/o4xhj9.png',
            fotos: [
                'https://files.catbox.moe/o4xhj9.png',
                'https://imovio.com.br/wp-content/uploads/2023/02/3478296843.jpg',
                'https://files.catbox.moe/ta8pp6.png',
                'https://files.catbox.moe/0tg1le.png'
            ]
        },
        {
            id: 5,
            bairro: 'Barra Olímpica',
            quartos: 2,
            preco: 680000,
            area: 90,
            titulo: 'Apartamento Elegante na Barra Olímpica',
            descricao: 'Apartamento elegante em condomínio fechado com 2 suítes, varanda gourmet e infraestrutura completa de lazer.',
            imagem: 'https://files.catbox.moe/ta8pp6.png',
            fotos: [
                'https://files.catbox.moe/ta8pp6.png',
                'https://files.catbox.moe/ihe3p5.png',
                'https://files.catbox.moe/o4xhj9.png',
                'https://remax.azureedge.net/userimages/60/LargeWM/L_b74eaab9-55e3-43c2-8814-06f6152a1f05.jpg'
            ]
        },
        {
            id: 6,
            bairro: 'Recreio dos Bandeirantes',
            quartos: 2,
            preco: 450000,
            area: 72,
            titulo: 'Apartamento Renovado no Recreio',
            descricao: 'Apartamento recentemente renovado com cozinha americana, área de serviço e ótima localização.',
            imagem: 'https://files.catbox.moe/0tg1le.png',
            fotos: [
                'https://files.catbox.moe/0tg1le.png',
                'https://files.catbox.moe/ta8pp6.png',
                'https://remax.azureedge.net/userimages/60/LargeWM/L_b74eaab9-55e3-43c2-8814-06f6152a1f05.jpg',
                'https://files.catbox.moe/ihe3p5.png'
            ]
        }
    ];
    
    const gallery = document.getElementById('gallery');
    if (gallery) {
        gallery.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <p style="color: #888;">Não foi possível conectar ao servidor. Mostrando imóveis de exemplo.</p>
            </div>
        `;
    }
    
    renderGallery(imoveis);
}

// ========== CONTADOR ANIMADO ==========

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

// ========== MENU MOBILE ==========

const menuToggle = document.querySelector('.menu-toggle');
const navUl = document.querySelector('nav ul');

menuToggle?.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    navUl?.classList.toggle('active');
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

// ========== EFEITO PARALLAX NO MOUSE ==========

document.addEventListener('mousemove', (e) => {
    const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
    const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
    const sphere = document.querySelector('.gradient-sphere');
    if (sphere) {
        sphere.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px)) scale(1.2)`;
    }
});

// ========== MODAL SAIBA MAIS ==========

let currentPhotoIndex = 0;
let currentImovelFotos = [];

function openModal(imovelId) {
    const imo = imoveis.find(i => i.id === imovelId || String(i.id) === String(imovelId));
    if (!imo) return;

    currentImovelFotos = imo.fotos && imo.fotos.length ? imo.fotos : [imo.imagem];
    currentPhotoIndex = 0;

    document.getElementById('modal-title').textContent = imo.titulo;
    document.getElementById('modal-bairro').textContent = imo.bairro;
    document.getElementById('modal-quartos').textContent = imo.quartos;
    document.getElementById('modal-area').textContent = imo.area + ' m²';
    document.getElementById('modal-preco').textContent = 'R$ ' + parseFloat(imo.preco).toLocaleString('pt-BR');
    document.getElementById('modal-descricao').textContent = imo.descricao;

    renderModalPhotos();

    // WhatsApp com mensagem pré-preenchida com o nome do imóvel
    const waMsg = encodeURIComponent(
        `Olá Leandro! Tenho interesse no imóvel: *${imo.titulo}* — ${imo.bairro}, R$ ${parseFloat(imo.preco).toLocaleString('pt-BR')}. Poderia me dar mais informações?`
    );
    const waLink = document.getElementById('modal-whatsapp');
    if (waLink) waLink.href = `https://wa.me/5521981424469?text=${waMsg}`;

    // Botão compartilhar — copia link direto para o imóvel
    const shareBtn = document.getElementById('modal-share-btn');
    if (shareBtn) {
        shareBtn._imovelId = imo.id;
        shareBtn._imovelTitulo = imo.titulo;
        shareBtn.onclick = function() {
            const url = window.location.origin + window.location.pathname.replace(/\/?$/, '/imoveis.html') + '#imovel-' + imo.id;
            const finalUrl = window.location.pathname.includes('imoveis')
                ? window.location.origin + window.location.pathname + '#imovel-' + imo.id
                : window.location.origin + '/imoveis.html#imovel-' + imo.id;

            const copy = (txt) => {
                shareBtn.innerHTML = '<i class="fas fa-check"></i><span>Link copiado!</span>';
                shareBtn.classList.add('share-copied');
                setTimeout(() => {
                    shareBtn.innerHTML = '<i class="fas fa-share-alt"></i><span>Compartilhar</span>';
                    shareBtn.classList.remove('share-copied');
                }, 2500);
                if (typeof window.trackLinkCopiado === 'function') {
                    window.trackLinkCopiado(String(imo.id), imo.titulo);
                }
            };
            if (navigator.clipboard) {
                navigator.clipboard.writeText(finalUrl).then(copy).catch(() => {
                    const ta = Object.assign(document.createElement('textarea'), {value: finalUrl});
                    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
                    document.body.removeChild(ta); copy(finalUrl);
                });
            } else {
                const ta = Object.assign(document.createElement('textarea'), {value: finalUrl});
                document.body.appendChild(ta); ta.select(); document.execCommand('copy');
                document.body.removeChild(ta); copy(finalUrl);
            }
        };
    }

    const modal = document.getElementById('imovel-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Rastrear visualização do imóvel
    if (typeof window.trackImovelView === 'function') {
        window.trackImovelView(String(imo.id), imo.titulo, imo.bairro);
    }
}

function closeModal() {
    document.getElementById('imovel-modal').classList.remove('active');
    document.body.style.overflow = '';
}

function renderModalPhotos() {
    const mainImg = document.getElementById('modal-main-photo');
    const thumbsContainer = document.getElementById('modal-thumbs');
    const counter = document.getElementById('modal-photo-counter');

    mainImg.src = currentImovelFotos[currentPhotoIndex];
    mainImg.onerror = function() { this.src = 'https://via.placeholder.com/800x500/1a1a2e/fff?text=Imóvel'; };

    if (counter) counter.textContent = (currentPhotoIndex + 1) + ' / ' + currentImovelFotos.length;

    thumbsContainer.innerHTML = '';
    currentImovelFotos.forEach((foto, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'modal-thumb' + (idx === currentPhotoIndex ? ' active' : '');
        const img = document.createElement('img');
        img.src = foto;
        img.alt = 'Foto ' + (idx + 1);
        img.onerror = function() { this.src = 'https://via.placeholder.com/150x100/1a1a2e/fff?text=Foto'; };
        thumb.appendChild(img);
        thumb.addEventListener('click', () => {
            currentPhotoIndex = idx;
            renderModalPhotos();
        });
        thumbsContainer.appendChild(thumb);
    });
}

function prevPhoto() {
    if (!currentImovelFotos.length) return;
    currentPhotoIndex = (currentPhotoIndex - 1 + currentImovelFotos.length) % currentImovelFotos.length;
    renderModalPhotos();
}

function nextPhoto() {
    if (!currentImovelFotos.length) return;
    currentPhotoIndex = (currentPhotoIndex + 1) % currentImovelFotos.length;
    renderModalPhotos();
}

// ========== GALERIA ==========

function renderGallery(imoveisList) {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    if (imoveisList.length === 0) {
        gallery.innerHTML = '<p style="text-align:center;color:#888;padding:3rem;grid-column:1/-1;">Nenhum imóvel encontrado para os filtros selecionados.</p>';
        return;
    }

    let html = '';
    imoveisList.forEach(imo => {
        const preco = parseFloat(imo.preco).toLocaleString('pt-BR');
        html += `
            <div class="imovel">
                <div class="imovel-img-wrap">
                    <img src="${imo.imagem}" alt="${imo.titulo}" onerror="this.src='https://via.placeholder.com/400x300/1a1a2e/fff?text=Imóvel'">
                    <div class="imovel-badge">${imo.bairro}</div>
                    ${imo.destaque ? '<div class="imovel-destaque-badge"><i class="fas fa-star"></i> Destaque</div>' : ''}
                    <div class="imovel-fotos-count"><i class="fas fa-images"></i> ${imo.fotos ? imo.fotos.length : 1} fotos</div>
                </div>
                <div class="imovel-content">
                    <h3>${imo.titulo}</h3>
                    <div class="imovel-details-row">
                        <span class="detail-tag"><i class="fas fa-ruler-combined"></i> ${imo.area} m²</span>
                        <span class="detail-tag"><i class="fas fa-bed"></i> ${imo.quartos} quarto${imo.quartos > 1 ? 's' : ''}</span>
                    </div>
                    <p class="imovel-preco">R$ ${preco}</p>
                    <p class="imovel-desc">${imo.descricao}</p>
                    <button class="btn-saiba-mais" onclick="openModal('${imo.id}')">
                        <span>Saiba Mais</span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    });
    gallery.innerHTML = html;

    gallery.querySelectorAll('.imovel').forEach((el, i) => {
        setTimeout(() => el.classList.add('animate'), i * 100);
    });
}

function filtrar() {
    const bairro = document.getElementById('bairro')?.value;
    const quartos = document.getElementById('quartos')?.value;
    const preco = document.getElementById('preco')?.value;

    let filtrados = imoveis.filter(imo => {
        const matchBairro = !bairro || imo.bairro === bairro;
        const matchQuartos = !quartos || imo.quartos.toString() === quartos;
        let matchPreco = true;
        if (preco) {
            const precoNum = parseFloat(imo.preco);
            if (preco === '0-600000') matchPreco = precoNum <= 600000;
            else if (preco === '600001-1000000') matchPreco = precoNum > 600000 && precoNum <= 1000000;
            else if (preco === '1000001+') matchPreco = precoNum > 1000000;
        }
        return matchBairro && matchQuartos && matchPreco;
    });

    renderGallery(filtrados);
}

// ========== CARROSSEL ==========

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
        }
        let touchStartX = 0;
        carousel?.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            this.stopAutoPlay();
        }, { passive: true });
        carousel?.addEventListener('touchend', (e) => {
            const diff = touchStartX - e.changedTouches[0].screenX;
            if (Math.abs(diff) > 50) {
                this.goToSlide(diff > 0
                    ? (this.currentIndex + 1) % this.totalSlides
                    : (this.currentIndex - 1 + this.totalSlides) % this.totalSlides);
            }
            this.startAutoPlay();
        }, { passive: true });
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
        if (this.autoPlayInterval) return;
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

// ========== INICIALIZAÇÃO ==========

// ========== CONFIG DO SITE (Firestore) ==========
function waitForFirebaseScript(cb, attempts) {
    attempts = attempts || 0;
    if (attempts > 40) return;
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) { cb(); }
    else { setTimeout(function(){ waitForFirebaseScript(cb, attempts + 1); }, 100); }
}

function loadSiteConfig() {
    // Só roda na index.html (tem o hero)
    if (!document.getElementById('cfg-hero-title') && !document.getElementById('cfg-anos')) return;
    waitForFirebaseScript(function() {
        try {
            firebase.firestore().collection('config').doc('site').get().then(function(doc) {
                if (!doc.exists) return;
                var cfg = doc.data();

                // Foto de perfil
                if (cfg.fotoPerfil) {
                    var img = document.getElementById('cfg-foto');
                    if (img) img.src = cfg.fotoPerfil;
                }

                // Título hero
                if (cfg.heroTitulo) {
                    var titleEl = document.getElementById('cfg-hero-title');
                    if (titleEl) {
                        var words = cfg.heroTitulo.split(' ');
                        var n = words.length;
                        var l1 = words.slice(0, Math.floor(n/3)).join(' ');
                        var l2 = words.slice(Math.floor(n/3), Math.ceil(n*2/3)).join(' ');
                        var l3 = words.slice(Math.ceil(n*2/3)).join(' ');
                        titleEl.innerHTML =
                            '<span class="title-line">' + l1 + '</span>' +
                            '<span class="title-line gradient-text">' + l2 + '</span>' +
                            '<span class="title-line">' + l3 + '</span>';
                    }
                }

                // Descrição hero
                if (cfg.heroDesc) {
                    var desc = document.getElementById('cfg-hero-desc');
                    if (desc) desc.textContent = cfg.heroDesc;
                }

                // Números (trust indicators)
                function setCounter(id, val) {
                    var el = document.getElementById(id);
                    if (el && val) {
                        el.setAttribute('data-target', String(val));
                        el.textContent = '0';
                    }
                }
                if (cfg.anosExperiencia)   setCounter('cfg-anos', cfg.anosExperiencia);
                if (cfg.imoveisNegociados) setCounter('cfg-imoveis-neg', cfg.imoveisNegociados);
                if (cfg.satisfacao)        setCounter('cfg-satisfacao', cfg.satisfacao);

                // Velocidade
                if (cfg.velocidade) {
                    ['cfg-velocidade-d','cfg-velocidade-m'].forEach(function(id) {
                        var el = document.getElementById(id);
                        if (el) el.textContent = cfg.velocidade;
                    });
                }

                // Depoimentos
                if (cfg.depoimentos && cfg.depoimentos.length) {
                    var track = document.getElementById('cfg-depoimentos');
                    if (track) {
                        track.innerHTML = cfg.depoimentos.map(function(d) {
                            return '<div class="testimonial-card">' +
                                '<div class="testimonial-quote">"</div>' +
                                '<p class="testimonial-text">' + (d.texto||'') + '</p>' +
                                '<div class="testimonial-author">' +
                                '<span>' + (d.autor||'') + '</span>' +
                                '<span class="author-location">• ' + (d.local||'') + '</span>' +
                                '</div></div>';
                        }).join('');

                        // Atualiza dots
                        var carousel = track.closest('.testimonials-carousel');
                        if (carousel) {
                            var dotsEl = carousel.querySelector('.carousel-dots');
                            if (dotsEl) {
                                dotsEl.innerHTML = cfg.depoimentos.map(function(_, i) {
                                    return '<span class="dot' + (i===0?' active':'') + '"></span>';
                                }).join('');
                            }
                        }
                        // Re-inicializa carrossel
                        if (window._carousel && typeof window._carousel.destroy === 'function') {
                            window._carousel.destroy();
                        }
                        window._carousel = new TestimonialsCarousel();
                    }
                }

                // Bairros (faixa rolante)
                if (cfg.bairros) {
                    var btrack = document.getElementById('cfg-bairros-track');
                    if (btrack) {
                        var lista = cfg.bairros.split(',').map(function(b){ return b.trim(); }).filter(Boolean);
                        var items = lista.map(function(b){ return '<span>' + b + '</span><span class="separator">✦</span>'; }).join('');
                        btrack.innerHTML = items + items; // duplicado para loop infinito
                    }
                }

            }).catch(function(){});
        } catch(e) {}
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadSiteConfig();

    if (document.querySelector('.testimonials-carousel')) {
        window._carousel = new TestimonialsCarousel();
    }

    document.querySelectorAll('.fade-in').forEach((el, i) => {
        setTimeout(() => { el.style.animationPlayState = 'running'; }, i * 150);
    });

    if (document.getElementById('gallery')) {
        // Carregar imóveis do Firebase
        carregarImoveis().then(() => {
            // Auto-abre modal se URL tem hash de imóvel
            const hash = window.location.hash;
            if (hash && hash.startsWith('#imovel-')) {
                const imovelId = hash.replace('#imovel-', '');
                setTimeout(() => openModal(imovelId), 400);
            }
        }).catch(() => {});
        
        document.getElementById('bairro')?.addEventListener('change', filtrar);
        document.getElementById('quartos')?.addEventListener('change', filtrar);
        document.getElementById('preco')?.addEventListener('change', filtrar);
    }

    const modal = document.getElementById('imovel-modal');
    if (modal) {
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    }

    document.addEventListener('keydown', (e) => {
        if (!document.getElementById('imovel-modal')?.classList.contains('active')) return;
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') prevPhoto();
        if (e.key === 'ArrowRight') nextPhoto();
    });
});

window.addEventListener('load', () => { document.body.classList.add('loaded'); });

// Adicionar animação de loading
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
