const imoveis = [
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

// Contador animado
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

// Menu mobile
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

// Efeito parallax no mouse
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
    const imo = imoveis.find(i => i.id === imovelId);
    if (!imo) return;

    currentImovelFotos = imo.fotos && imo.fotos.length ? imo.fotos : [imo.imagem];
    currentPhotoIndex = 0;

    document.getElementById('modal-title').textContent = imo.titulo;
    document.getElementById('modal-bairro').textContent = imo.bairro;
    document.getElementById('modal-quartos').textContent = imo.quartos;
    document.getElementById('modal-area').textContent = imo.area + ' m²';
    document.getElementById('modal-preco').textContent = 'R$ ' + imo.preco.toLocaleString('pt-BR');
    document.getElementById('modal-descricao').textContent = imo.descricao;

    renderModalPhotos();

    const modal = document.getElementById('imovel-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
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
        html += `
            <div class="imovel">
                <div class="imovel-img-wrap">
                    <img src="${imo.imagem}" alt="${imo.titulo}" onerror="this.src='https://via.placeholder.com/400x300/1a1a2e/fff?text=Imóvel'">
                    <div class="imovel-badge">${imo.bairro}</div>
                    <div class="imovel-fotos-count"><i class="fas fa-images"></i> ${imo.fotos ? imo.fotos.length : 1} fotos</div>
                </div>
                <div class="imovel-content">
                    <h3>${imo.titulo}</h3>
                    <div class="imovel-details-row">
                        <span class="detail-tag"><i class="fas fa-ruler-combined"></i> ${imo.area} m²</span>
                        <span class="detail-tag"><i class="fas fa-bed"></i> ${imo.quartos} quarto${imo.quartos > 1 ? 's' : ''}</span>
                    </div>
                    <p class="imovel-preco">R$ ${imo.preco.toLocaleString('pt-BR')}</p>
                    <p class="imovel-desc">${imo.descricao}</p>
                    <button class="btn-saiba-mais" onclick="openModal(${imo.id})">
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
            if (preco === '0-600000') matchPreco = imo.preco <= 600000;
            else if (preco === '600001-1000000') matchPreco = imo.preco > 600000 && imo.preco <= 1000000;
            else if (preco === '1000001+') matchPreco = imo.preco > 1000000;
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
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.testimonials-carousel')) {
        new TestimonialsCarousel();
    }

    document.querySelectorAll('.fade-in').forEach((el, i) => {
        setTimeout(() => { el.style.animationPlayState = 'running'; }, i * 150);
    });

    if (document.getElementById('gallery')) {
        renderGallery(imoveis);
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
