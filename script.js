const imoveis = [
    {
        id: 1,
        bairro: 'Centro',
        quartos: 2,
        preco: 250000,
        area: 80,
        titulo: 'Apartamento Confortável no Centro',
        descricao: 'Um belo apartamento com 2 quartos no coração da cidade. Totalmente mobiliado e com vista para o parque.',
        imagem: 'https://remax.azureedge.net/userimages/60/LargeWM/L_b74eaab9-55e3-43c2-8814-06f6152a1f05.jpg'
    },
    {
        id: 2,
        bairro: 'Jardins',
        quartos: 3,
        preco: 450000,
        area: 120,
        titulo: 'Cobertura nos Jardins',
        descricao: 'Cobertura ampla com 3 quartos, piscina privativa e acabamentos de alto padrão.',
        imagem: 'https://imovio.com.br/wp-content/uploads/2023/02/3478296843.jpg'
    },
    {
        id: 3,
        bairro: 'Vila Nova',
        quartos: 1,
        preco: 180000,
        area: 50,
        titulo: 'Studio Moderno em Vila Nova',
        descricao: 'Studio compacto e moderno, ideal para solteiros ou casais jovens. Próximo a comércios.',
        imagem: 'https://files.catbox.moe/ihe3p5.png'
    },
    {
        id: 4,
        bairro: 'Centro',
        quartos: 3,
        preco: 350000,
        area: 100,
        titulo: 'Apartamento Familiar no Centro',
        descricao: 'Espaçoso apartamento familiar com 3 quartos e garagem coberta.',
        imagem: 'https://files.catbox.moe/o4xhj9.png'
    },
    {
        id: 5,
        bairro: 'Jardins',
        quartos: 2,
        preco: 520000,
        area: 90,
        titulo: 'Apartamento Elegante nos Jardins',
        descricao: 'Apartamento elegante com 2 suítes e varanda gourmet.',
        imagem: 'https://files.catbox.moe/ta8pp6.png'
    },
    {
        id: 6,
        bairro: 'Vila Nova',
        quartos: 2,
        preco: 220000,
        area: 70,
        titulo: 'Apartamento Renovado em Vila Nova',
        descricao: 'Apartamento recentemente renovado com cozinha americana e área de serviço.',
        imagem: 'https://files.catbox.moe/0tg1le.png'
    }
];

// Contador animado
const counters = document.querySelectorAll('.trust-number');

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

// Intersection Observer para iniciar animações quando visível
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
const nav = document.querySelector('nav ul');

menuToggle?.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    nav?.classList.toggle('active');
    
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

// ========== FUNÇÕES DA GALERIA DE IMÓVEIS ==========
function renderGallery(imoveisList) {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;
    
    let html = '';
    imoveisList.forEach(imo => {
        html += `
            <div class="imovel">
                <img src="${imo.imagem}" alt="${imo.titulo}" onerror="this.src='https://via.placeholder.com/400x300/2c3e50/fff?text=Imóvel'">
                <div class="imovel-content">
                    <h3>${imo.titulo}</h3>
                    <p><strong>Área:</strong> ${imo.area} m²</p>
                    <p><strong>Preço:</strong> R$ ${imo.preco.toLocaleString('pt-BR')}</p>
                    <p><strong>Bairro:</strong> ${imo.bairro}</p>
                    <p><strong>Quartos:</strong> ${imo.quartos}</p>
                    <p>${imo.descricao}</p>
                </div>
            </div>
        `;
    });
    gallery.innerHTML = html;

    // Animação stagger para itens da galeria
    const imovelEls = gallery.querySelectorAll('.imovel');
    imovelEls.forEach((el, i) => {
        setTimeout(() => {
            el.classList.add('animate');
        }, i * 100);
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
            if (preco === '0-300000') {
                matchPreco = imo.preco <= 300000;
            } else if (preco === '300001-500000') {
                matchPreco = imo.preco > 300000 && imo.preco <= 500000;
            } else if (preco === '500001+') {
                matchPreco = imo.preco > 500000;
            }
        }
        return matchBairro && matchQuartos && matchPreco;
    });

    renderGallery(filtrados);
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
        // Clique nos dots
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                this.stopAutoPlay();
                this.goToSlide(index);
                this.startAutoPlay();
            });
        });

        // Pausar ao passar o mouse
        const carousel = document.querySelector('.testimonials-carousel');
        if (carousel) {
            carousel.addEventListener('mouseenter', () => this.stopAutoPlay());
            carousel.addEventListener('mouseleave', () => this.startAutoPlay());
        }

        // Touch events para mobile
        let touchStartX = 0;
        let touchEndX = 0;
        
        carousel?.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            this.stopAutoPlay();
        }, { passive: true });
        
        carousel?.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 50) {
                // Swipe left
                this.goToSlide((this.currentIndex + 1) % this.totalSlides);
            } else if (touchEndX - touchStartX > 50) {
                // Swipe right
                this.goToSlide((this.currentIndex - 1 + this.totalSlides) % this.totalSlides);
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
        this.dots.forEach((dot, index) => {
            if (index === this.currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
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
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
    // Iniciar carrossel de depoimentos se estiver na página inicial
    if (document.querySelector('.testimonials-carousel')) {
        new TestimonialsCarousel();
    }

    // Animação de entrada da página
    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach((el, i) => {
        setTimeout(() => {
            el.style.animationPlayState = 'running';
        }, i * 150);
    });

    // Inicializar galeria de imóveis se estiver na página de imóveis
    if (document.getElementById('gallery')) {
        // Renderizar todos os imóveis inicialmente
        renderGallery(imoveis);
        
        // Adicionar event listeners para os filtros
        const bairroSelect = document.getElementById('bairro');
        const quartosSelect = document.getElementById('quartos');
        const precoSelect = document.getElementById('preco');
        
        if (bairroSelect) {
            bairroSelect.addEventListener('change', filtrar);
        }
        if (quartosSelect) {
            quartosSelect.addEventListener('change', filtrar);
        }
        if (precoSelect) {
            precoSelect.addEventListener('change', filtrar);
        }
    }
});

// Pré-carregamento suave
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});