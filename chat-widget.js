// ============================================================
//  CHAT FLUTUANTE ULTRA-PRO v4.0 — Leandro Bomfim Imóveis
//  • Motor de intenções NLP expandido (90+ padrões)
//  • Catálogo de imóveis em tempo real (Firebase)
//  • Detecção de IP e geolocalização nos logs
//  • Logs completos: hora, IP, mensagens do bot, intenção
//  • Modo imóvel específico (abre modal do catálogo)
//  • Respostas contextuais sobre imóveis do site
//  • Sugestões dinâmicas baseadas no estoque
// ============================================================

(function () {
    'use strict';

    /* ════════════════════════════════════════════
       BASE DE CONHECIMENTO
    ════════════════════════════════════════════ */
    const KB = {
        nome:        'Leandro Bomfim',
        creci:       'CRECI-RJ 97315',
        tel:         '(21) 98142-4469',
        telNum:      '5521981424469',
        email:       'leandromorenno007@gmail.com',
        instagram:   '@leopbomfim',
        horario:     'Seg–Sex 8h–20h | Sáb 9h–18h | Dom sob agendamento',
        experiencia: '6+ anos',
        negociados:  '60+ imóveis negociados',
        whatsapp:    'https://wa.me/5521981424469',
        wa:          (txt) => `https://wa.me/5521981424469?text=${encodeURIComponent(txt)}`,
    };

    /* ════════════════════════════════════════════
       ESTADO GLOBAL DO CATÁLOGO (Firebase RT)
    ════════════════════════════════════════════ */
    let _catalogoImoveis   = [];   // todos os imóveis carregados
    let _catalogoListener  = null; // onSnapshot ref
    let _catalogoLoaded    = false;
    let _clientIP          = null; // IP do visitante (async)
    let _clientGeo         = {};   // cidade, país, ISP

    /* Carrega IP do visitante para logs ricos */
    function _fetchClientIP() {
        fetch('https://api.ipify.org?format=json')
            .then(r => r.json())
            .then(d => {
                _clientIP = d.ip || null;
                // Geolocalização básica
                return fetch(`https://ip-api.com/json/${_clientIP}?fields=status,city,regionName,country,isp,proxy`);
            })
            .then(r => r.json())
            .then(d => {
                if (d.status === 'success') {
                    _clientGeo = {
                        cidade:   d.city || '',
                        regiao:   d.regionName || '',
                        pais:     d.country || '',
                        isp:      d.isp || '',
                        isProxy:  d.proxy || false,
                    };
                }
            })
            .catch(() => {});
    }

    /* Inicia listener do Firebase para catálogo em tempo real */
    function _initCatalogoListener() {
        if (_catalogoListener) return;
        try {
            if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
                setTimeout(_initCatalogoListener, 1500);
                return;
            }
            const db = firebase.firestore();
            _catalogoListener = db.collection('imoveis').onSnapshot(snap => {
                _catalogoImoveis = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(i => i.status !== 'vendido' && i.status !== 'alugado');
                _catalogoLoaded = true;
            }, () => { _catalogoLoaded = true; });
        } catch (e) { _catalogoLoaded = true; }
    }

    /* Helpers de catálogo */
    function _getByBairro(bairro) {
        return _catalogoImoveis.filter(i =>
            (i.bairro || '').toLowerCase().includes(bairro.toLowerCase())
        );
    }
    function _getByTipo(tipo) {
        return _catalogoImoveis.filter(i =>
            (i.tipo || '').toLowerCase() === tipo.toLowerCase()
        );
    }
    function _getByPrecoMax(max) {
        return _catalogoImoveis.filter(i => parseFloat(i.preco || 0) <= max);
    }
    function _getDestaques() {
        return _catalogoImoveis.filter(i => i.destaque);
    }
    function _formatPreco(p) {
        const n = parseFloat(p || 0);
        if (n >= 1000000) return `R$ ${(n/1000000).toFixed(1).replace('.',',')}M`;
        return `R$ ${n.toLocaleString('pt-BR')}`;
    }
    function _renderImovelCard(im) {
        const preco = im.precoModo === 'lancamento' ? '🚀 Lançamento' : _formatPreco(im.preco);
        const quartos = im.tipo === 'Terreno' ? `${im.area}m²` : `${im.quartos || '?'} qtos · ${im.area}m²`;
        return `🏠 **${im.titulo}**\n📍 ${im.bairro} · ${quartos}\n💰 ${preco}`;
    }
    function _buildImovelOpts(imovel) {
        return [
            { label: '👁️ Ver detalhes',          action: () => { if (typeof window.openModal === 'function') { window.openModal(imovel.id); } else { window.location.href = `imoveis.html?imovel=${imovel.id}`; } } },
            { label: '📱 Tenho interesse',        action: () => window.open(KB.wa(`Olá Leandro! Vi o imóvel *${imovel.titulo}* em ${imovel.bairro} por ${_formatPreco(imovel.preco)}. Quero saber mais!`), '_blank') },
            { label: '📋 Ver todos os imóveis',   action: () => { window.location.href = 'imoveis.html'; } },
            { label: '↩ Menu principal',           next: 'inicio' },
        ];
    }

    /* Resume estoque para resposta */
    function _resumoEstoque() {
        if (!_catalogoLoaded || !_catalogoImoveis.length) return null;
        const total    = _catalogoImoveis.length;
        const bairros  = [...new Set(_catalogoImoveis.map(i => i.bairro))];
        const terrenos = _getByTipo('Terreno').length;
        const dest     = _getDestaques().length;
        return { total, bairros, terrenos, dest };
    }

    /* ════════════════════════════════════════════
       FLOWS (menus guiados)
    ════════════════════════════════════════════ */
    const FLOWS = {
        inicio: {
            msg: () => {
                const r = _resumoEstoque();
                const estoqueInfo = r ? `\n\n📊 Temos **${r.total} imóvel${r.total !== 1 ? 'is' : ''}** disponíveis em ${r.bairros.length} bairros agora.` : '';
                return `Olá! 👋 Sou o assistente do **${KB.nome}**, corretor CRECI-RJ especialista no Rio de Janeiro.${estoqueInfo}\n\nPode me perguntar qualquer coisa ou escolha:`;
            },
            opts: [
                { label: '🏠 Quero comprar um imóvel',   next: 'comprar'         },
                { label: '🔍 Ver imóveis disponíveis',   next: 'ver_catalogo'    },
                { label: '🏗️ Procuro um terreno',        next: 'terrenos'        },
                { label: '💰 Avaliar meu imóvel',        next: 'avaliar'         },
                { label: '📍 Explorar bairros',          next: 'bairros'         },
                { label: '💳 Financiamento & FGTS',      next: 'financiamento'   },
                { label: '📞 Falar com o Leandro',       next: 'contato'         },
            ],
        },

        ver_catalogo: {
            msg: () => {
                const r = _resumoEstoque();
                if (!r) return '📋 Carregando catálogo... Acesse a página de imóveis para ver tudo!';
                const bairrosList = r.bairros.slice(0,4).join(', ') + (r.bairros.length > 4 ? ' e mais' : '');
                return `📋 **Catálogo atual — ${r.total} imóvei${r.total !== 1 ? 's' : ''} disponíveis**\n\n📍 Bairros: ${bairrosList}${r.terrenos ? `\n🏗️ ${r.terrenos} terreno${r.terrenos > 1 ? 's' : ''}` : ''}${r.dest ? `\n⭐ ${r.dest} em destaque` : ''}\n\nFiltrar por:`;
            },
            opts: [
                { label: '🌊 Zona Sul',               next: 'cat_zona_sul'      },
                { label: '🏙️ Barra & Recreio',        next: 'cat_barra'         },
                { label: '⭐ Destaques',               next: 'cat_destaques'     },
                { label: '🏗️ Terrenos',               next: 'cat_terrenos'      },
                { label: '💰 Até R$ 600k',            next: 'cat_ate600'        },
                { label: '📋 Ver todos no site',      action: () => { window.location.href = 'imoveis.html'; } },
                { label: '↩ Voltar',                   next: 'inicio'            },
            ],
        },

        cat_zona_sul: {
            msg: () => {
                const bairroZS = ['Ipanema','Leblon','Copacabana','Botafogo','Flamengo'];
                const lista = _catalogoImoveis.filter(i => bairroZS.includes(i.bairro));
                if (!lista.length) return '🌊 Não há imóveis da Zona Sul disponíveis no momento. O Leandro pode te ajudar a encontrar algo especial!';
                const preview = lista.slice(0,3).map(_renderImovelCard).join('\n\n');
                return `🌊 **Zona Sul — ${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} disponíve${lista.length !== 1 ? 'is' : 'l'}**\n\n${preview}${lista.length > 3 ? `\n\n_...e mais ${lista.length - 3} imóvei${lista.length - 3 !== 1 ? 's' : ''}_` : ''}`;
            },
            opts: () => {
                const bairroZS = ['Ipanema','Leblon','Copacabana','Botafogo','Flamengo'];
                const lista = _catalogoImoveis.filter(i => bairroZS.includes(i.bairro));
                const opts = [];
                if (lista.length > 0) opts.push({ label: '👁️ Ver todos no site', action: () => { window.location.href = 'imoveis.html?region=zona-sul'; } });
                opts.push({ label: '📱 Falar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero imóveis na Zona Sul. Pode me ajudar?'), '_blank') });
                opts.push({ label: '↩ Catálogo', next: 'ver_catalogo' });
                return opts;
            },
        },

        cat_barra: {
            msg: () => {
                const lista = _catalogoImoveis.filter(i => ['Barra da Tijuca','Barra Olímpica','Recreio dos Bandeirantes','Jacarepaguá','Vargem Grande','Vargem Pequena','Pedra de Guaratiba','Grumari'].includes(i.bairro));
                if (!lista.length) return '🏙️ Não há imóveis da Barra/Recreio disponíveis no momento. O Leandro pode encontrar algo exclusivo para você!';
                const preview = lista.slice(0,3).map(_renderImovelCard).join('\n\n');
                return `🏙️ **Barra & Região Oeste — ${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} disponíve${lista.length !== 1 ? 'is' : 'l'}**\n\n${preview}${lista.length > 3 ? `\n\n_...e mais ${lista.length - 3}_` : ''}`;
            },
            opts: () => [
                { label: '👁️ Ver todos no site', action: () => { window.location.href = 'imoveis.html?region=barra-recreio'; } },
                { label: '📱 Falar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero imóveis na Barra ou Recreio. Pode me ajudar?'), '_blank') },
                { label: '↩ Catálogo', next: 'ver_catalogo' },
            ],
        },

        cat_destaques: {
            msg: () => {
                const lista = _getDestaques();
                if (!lista.length) return '⭐ Nenhum imóvel em destaque no momento. Veja todo o catálogo!';
                const preview = lista.slice(0,3).map(_renderImovelCard).join('\n\n');
                return `⭐ **Destaques — ${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} selecionado${lista.length !== 1 ? 's' : ''}**\n\n${preview}`;
            },
            opts: () => [
                { label: '👁️ Ver todos no site', action: () => { window.location.href = 'imoveis.html'; } },
                { label: '📱 Falar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Vi os destaques do site. Quero saber mais!'), '_blank') },
                { label: '↩ Catálogo', next: 'ver_catalogo' },
            ],
        },

        cat_terrenos: {
            msg: () => {
                const lista = _getByTipo('Terreno');
                if (!lista.length) return '🏗️ Não temos terrenos disponíveis no momento. Me deixe te conectar com o Leandro para opções exclusivas!';
                const preview = lista.slice(0,3).map(im => `🏗️ **${im.titulo}**\n📍 ${im.bairro} · ${im.area}m²\n💰 ${_formatPreco(im.preco)}`).join('\n\n');
                return `🏗️ **Terrenos disponíveis — ${lista.length} opção${lista.length !== 1 ? 'ões' : ''}**\n\n${preview}`;
            },
            opts: () => [
                { label: '👁️ Ver terrenos no site', action: () => { window.location.href = 'imoveis.html?tipo=Terreno'; } },
                { label: '📱 Falar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Tenho interesse em terrenos. Pode me ajudar?'), '_blank') },
                { label: '↩ Catálogo', next: 'ver_catalogo' },
            ],
        },

        cat_ate600: {
            msg: () => {
                const lista = _getByPrecoMax(600000);
                if (!lista.length) return '💰 No momento não temos imóveis até R$ 600k no catálogo. Mas o Leandro pode encontrar opções exclusivas para você!';
                const preview = lista.slice(0,3).map(_renderImovelCard).join('\n\n');
                return `💰 **Até R$ 600k — ${lista.length} imóvel${lista.length !== 1 ? 'is' : ''}**\n\n${preview}`;
            },
            opts: () => [
                { label: '👁️ Ver no site',          action: () => { window.location.href = 'imoveis.html?preco=0-600000'; } },
                { label: '💳 Financiar?',             next: 'financiamento' },
                { label: '📱 Falar com Leandro',      action: () => window.open(KB.wa('Olá Leandro! Procuro imóvel até R$ 600k. Pode me ajudar?'), '_blank') },
                { label: '↩ Catálogo',                next: 'ver_catalogo' },
            ],
        },

        /* ── COMPRAR ── */
        comprar: {
            msg: 'Ótimo! Tenho imóveis incríveis na Zona Sul e Barra. Qual região te interessa?',
            opts: [
                { label: '🌊 Zona Sul (Ipanema, Leblon…)', next: 'zona_sul'     },
                { label: '🏙️ Barra da Tijuca / Recreio',  next: 'barra'        },
                { label: '🌆 Copacabana / Botafogo',       next: 'copa_bota'    },
                { label: '🔍 Me ajude a escolher',         next: 'ajuda_bairro' },
                { label: '🔍 Ver catálogo agora',          next: 'ver_catalogo' },
                { label: '↩ Voltar',                       next: 'inicio'       },
            ],
        },
        zona_sul: {
            msg: 'Zona Sul — o coração nobre do Rio! Ipanema, Leblon, Copacabana, Botafogo, Flamengo. Alto padrão e documentação 100% segura.\n\n**Qual faixa de valor?**',
            opts: [
                { label: 'Até R$ 600 mil',      next: 'preco_600'  },
                { label: 'R$ 600k – R$ 1,5M',  next: 'preco_1m'   },
                { label: 'Acima de R$ 1,5M',    next: 'preco_luxo' },
                { label: '🔍 Ver disponíveis',  next: 'cat_zona_sul' },
                { label: '↩ Voltar',             next: 'comprar'    },
            ],
        },
        barra: {
            msg: '🏙️ Barra da Tijuca e Recreio — espaço, infraestrutura e custo-benefício imbatível. Condomínios fechados, coberturas e apartamentos amplos.\n\n**Qual faixa de valor?**',
            opts: [
                { label: 'Até R$ 600 mil',      next: 'preco_600'  },
                { label: 'R$ 600k – R$ 1,5M',  next: 'preco_1m'   },
                { label: 'Acima de R$ 1,5M',    next: 'preco_luxo' },
                { label: '🔍 Ver disponíveis',  next: 'cat_barra'  },
                { label: '↩ Voltar',             next: 'comprar'    },
            ],
        },
        copa_bota: {
            msg: '🌆 **Copacabana** tem uma das praias mais famosas do mundo e ótimas opções de custo-benefício. **Botafogo** tem charme, metrô na porta e vida cultural intensa.\n\nO Leandro tem ótimas opções nessa região!',
            opts: [
                { label: '📱 Ver opções com Leandro', next: 'wa_copa', waMsg: 'Olá Leandro! Quero imóveis em Copacabana ou Botafogo. Pode me ajudar?' },
                { label: '📋 Ver catálogo',           next: 'catalogo' },
                { label: '↩ Voltar',                  next: 'comprar' },
            ],
        },
        ajuda_bairro: {
            msg: 'Vamos encontrar o bairro ideal para você! O que é mais importante?',
            opts: [
                { label: '🌊 Perto da praia',         next: 'rec_praia'    },
                { label: '🌿 Tranquilidade e espaço', next: 'rec_tranquilo'},
                { label: '🚇 Acesso fácil ao centro', next: 'rec_centro'   },
                { label: '👨‍👩‍👧 Bom para família',    next: 'rec_familia'  },
                { label: '💼 Bom para investimento',  next: 'rec_invest'   },
                { label: '↩ Voltar',                  next: 'comprar'      },
            ],
        },
        rec_praia: {
            msg: '🌊 Para quem ama praia:\n\n• **Ipanema** — praia mais chique, vida cultural\n• **Leblon** — mais tranquilo, familiar\n• **Copacabana** — mais acessível, ótima localização\n• **Recreio** — praia limpa, bairro tranquilo\n\nQual combina mais?',
            opts: [
                { label: '🌊 Ipanema',    next: 'info_ipanema' },
                { label: '🏖️ Leblon',    next: 'info_leblon'  },
                { label: '🏝️ Copacabana',next: 'info_copa'    },
                { label: '🌴 Recreio',    next: 'info_recreio' },
                { label: '↩ Voltar',      next: 'ajuda_bairro' },
            ],
        },
        rec_tranquilo: {
            msg: '🌿 Para tranquilidade:\n\n• **Recreio dos Bandeirantes** — mais reservado, espaçoso\n• **Leblon** — nobre, arborizado, seguro\n• **Barra Olímpica** — novo, menos movimentado',
            opts: [
                { label: '📱 Ver opções',   next: 'wa_tranquilo', waMsg: 'Olá Leandro! Procuro imóvel tranquilo e espaçoso. Pode me ajudar?' },
                { label: '📋 Ver catálogo', next: 'catalogo' },
                { label: '↩ Voltar',        next: 'ajuda_bairro' },
            ],
        },
        rec_centro: {
            msg: '🚇 Para acesso ao centro:\n\n• **Botafogo** — metrô, fácil acesso, muito charmoso\n• **Flamengo** — orla da Guanabara, ótimo custo-benefício\n• **Copacabana** — metrô e tudo a pé',
            opts: [
                { label: '📱 Ver opções',   next: 'wa_centro', waMsg: 'Olá Leandro! Quero imóvel com fácil acesso ao centro.' },
                { label: '📋 Ver catálogo', next: 'catalogo' },
                { label: '↩ Voltar',        next: 'ajuda_bairro' },
            ],
        },
        rec_familia: {
            msg: '👨‍👩‍👧 Para famílias:\n\n• **Leblon** — seguro, escolas excelentes\n• **Recreio** — tranquilo, condomínios com lazer completo\n• **Barra da Tijuca** — shoppings, hospitais, colégios próximos',
            opts: [
                { label: '📱 Ver opções',   next: 'wa_familia', waMsg: 'Olá Leandro! Procuro imóvel familiar com espaço e boa estrutura.' },
                { label: '📋 Ver catálogo', next: 'catalogo' },
                { label: '↩ Voltar',        next: 'ajuda_bairro' },
            ],
        },
        rec_invest: {
            msg: '💼 Para investimento:\n\n• **Ipanema/Leblon** — valorização histórica, alta demanda de aluguel\n• **Barra da Tijuca** — crescimento constante\n• **Copacabana** — turismo, airbnb altíssima demanda\n\nO Leandro pode calcular o retorno estimado!',
            opts: [
                { label: '📱 Analisar com Leandro', next: 'wa_invest', waMsg: 'Olá Leandro! Quero investir em imóvel no Rio. Pode analisar rentabilidade?' },
                { label: '📋 Ver catálogo',          next: 'catalogo' },
                { label: '↩ Voltar',                 next: 'ajuda_bairro' },
            ],
        },

        /* ── PREÇOS ── */
        preco_600: {
            msg: () => {
                const lista = _getByPrecoMax(600000);
                const extra = lista.length ? `\n\n✅ Temos **${lista.length} imóvel${lista.length !== 1 ? 'is' : ''}** nessa faixa agora!` : '';
                return `💰 Tenho ótimas opções até R$ 600k! Studios modernos, apartamentos de 1–2 quartos bem localizados.${extra}`;
            },
            opts: [
                { label: '🔍 Ver disponíveis agora', next: 'cat_ate600' },
                { label: '📱 Ver opções no WhatsApp', next: 'wa_600', waMsg: 'Olá Leandro! Procuro imóvel até R$ 600 mil. Pode me mostrar opções?' },
                { label: '💳 Posso financiar?',       next: 'financiamento' },
                { label: '↩ Voltar',                  next: 'zona_sul'  },
            ],
        },
        preco_1m: {
            msg: '✨ Faixa de R$ 600k a R$ 1,5M — a melhor variedade do Rio! Apartamentos reformados, coberturas duplex, imóveis com vista para o mar.',
            opts: [
                { label: '📱 Ver opções no WhatsApp', next: 'wa_1m', waMsg: 'Olá Leandro! Procuro imóvel entre R$ 600k e R$ 1,5M no Rio.' },
                { label: '🔍 Ver catálogo online',    next: 'catalogo'  },
                { label: '↩ Voltar',                  next: 'zona_sul'  },
            ],
        },
        preco_luxo: {
            msg: '👑 Alto padrão é minha especialidade! Coberturas com piscina privativa, vistas panorâmicas, acabamento europeu em Ipanema, Leblon e Barra.',
            opts: [
                { label: '📱 Conversar com Leandro', next: 'wa_luxo', waMsg: 'Olá Leandro! Tenho interesse em imóveis de alto padrão acima de R$ 1,5M.' },
                { label: '🔍 Ver catálogo online',   next: 'catalogo'  },
                { label: '⭐ Ver destaques',          next: 'cat_destaques' },
                { label: '↩ Voltar',                  next: 'zona_sul'  },
            ],
        },

        /* ── TERRENOS ── */
        terrenos: {
            msg: () => {
                const lista = _getByTipo('Terreno');
                const extra = lista.length ? `\n\n✅ Temos **${lista.length} terreno${lista.length !== 1 ? 's' : ''}** disponíveis agora!` : '';
                return `🏗️ Tenho terrenos disponíveis em várias regiões do Rio — ideais para construção própria ou investimento.${extra}\n\n**Qual sua intenção?**`;
            },
            opts: [
                { label: '🔍 Ver terrenos agora',    next: 'cat_terrenos'      },
                { label: '🏠 Construir minha casa',  next: 'terreno_construir' },
                { label: '💼 Investir / Revender',   next: 'terreno_invest'    },
                { label: '🏢 Projeto comercial',     next: 'terreno_comercial' },
                { label: '📱 Falar com Leandro',     next: 'wa_terreno', waMsg: 'Olá Leandro! Tenho interesse em terrenos no Rio.' },
                { label: '↩ Voltar',                 next: 'inicio'    },
            ],
        },
        terreno_construir: {
            msg: '🏠 Para construção própria tenho terrenos em Recreio, Barra Olímpica, Vargem Grande e Pedra de Guaratiba — boa infraestrutura e preços competitivos.',
            opts: [
                { label: '🔍 Ver terrenos',   next: 'cat_terrenos' },
                { label: '📱 Falar com Leandro', next: 'wa_terreno', waMsg: 'Olá Leandro! Quero terreno para construir minha casa.' },
                { label: '↩ Voltar',          next: 'terrenos'   },
            ],
        },
        terreno_invest: {
            msg: '💼 Terrenos para investimento estão se valorizando muito na Zona Oeste! Barra Olímpica, Recreio e Pedra de Guaratiba têm potencial acima da média.',
            opts: [
                { label: '🔍 Ver terrenos', next: 'cat_terrenos' },
                { label: '📱 Analisar com Leandro', next: 'wa_terreno', waMsg: 'Olá Leandro! Quero terreno para investimento.' },
                { label: '↩ Voltar',                 next: 'terrenos'  },
            ],
        },
        terreno_comercial: {
            msg: '🏢 Para projetos comerciais, os melhores terrenos ficam na Barra da Tijuca e Recreio — amplo fluxo, infraestrutura completa e zoneamento comercial disponível.',
            opts: [
                { label: '📱 Falar com Leandro', next: 'wa_terreno', waMsg: 'Olá Leandro! Preciso de terreno para projeto comercial.' },
                { label: '↩ Voltar',             next: 'terrenos'  },
            ],
        },

        /* ── AVALIAR ── */
        avaliar: {
            msg: '💰 O Leandro faz **avaliação gratuita** do seu imóvel com análise real de mercado. Rápido, sem compromisso.\n\nQual o tipo do seu imóvel?',
            opts: [
                { label: '🏢 Apartamento', next: 'avaliar_ap'   },
                { label: '🏠 Casa',        next: 'avaliar_casa' },
                { label: '🌆 Cobertura',   next: 'avaliar_cob'  },
                { label: '🏗️ Terreno',    next: 'avaliar_ter'  },
                { label: '🏪 Comercial',   next: 'avaliar_com'  },
                { label: '↩ Voltar',       next: 'inicio'       },
            ],
        },
        avaliar_ap:  { msg: '🏢 O Leandro analisa metragem, andar, acabamento, condomínio e localização para chegar no **preço justo de mercado**.', opts: [{ label: '✅ Quero avaliação gratuita', next: 'wa_avaliacao', waMsg: 'Olá Leandro! Quero avaliação gratuita do meu apartamento.' }, { label: '↩ Voltar', next: 'avaliar' }] },
        avaliar_casa: { msg: '🏠 O Leandro conhece profundamente cada região do Rio e vai te dar uma avaliação precisa e honesta, sem inventar valor.', opts: [{ label: '✅ Quero avaliação gratuita', next: 'wa_avaliacao', waMsg: 'Olá Leandro! Quero avaliação gratuita da minha casa.' }, { label: '↩ Voltar', next: 'avaliar' }] },
        avaliar_cob:  { msg: '🌆 Coberturas são minha especialidade! A avaliação leva em conta vista, terraço, piscina, área privativa e diferencial do bairro.', opts: [{ label: '✅ Quero avaliação gratuita', next: 'wa_avaliacao', waMsg: 'Olá Leandro! Quero avaliação gratuita da minha cobertura.' }, { label: '↩ Voltar', next: 'avaliar' }] },
        avaliar_ter:  { msg: '🏗️ Terrenos têm avaliação específica por localização, topografia, zoneamento e metragem.', opts: [{ label: '✅ Quero avaliação gratuita', next: 'wa_avaliacao', waMsg: 'Olá Leandro! Quero avaliação gratuita do meu terreno.' }, { label: '↩ Voltar', next: 'avaliar' }] },
        avaliar_com:  { msg: '🏪 Imóveis comerciais têm avaliação baseada em ponto, fluxo, renda potencial e comparativos de mercado.', opts: [{ label: '✅ Quero avaliação gratuita', next: 'wa_avaliacao', waMsg: 'Olá Leandro! Quero avaliação gratuita do meu imóvel comercial.' }, { label: '↩ Voltar', next: 'avaliar' }] },

        /* ── BAIRROS ── */
        bairros: {
            msg: 'Atendo toda a **Zona Sul** e **Barra da Tijuca**. Selecione um bairro:',
            opts: [
                { label: '🌊 Ipanema',         next: 'info_ipanema'  },
                { label: '🏖️ Leblon',          next: 'info_leblon'   },
                { label: '🏝️ Copacabana',      next: 'info_copa'     },
                { label: '🌿 Botafogo',         next: 'info_botafogo' },
                { label: '🌅 Flamengo',         next: 'info_flamengo' },
                { label: '🏙️ Barra da Tijuca', next: 'info_barra'    },
                { label: '🌴 Recreio',          next: 'info_recreio'  },
                { label: '🏗️ Barra Olímpica',  next: 'info_bo'       },
                { label: '↩ Voltar',            next: 'inicio'        },
            ],
        },
        info_ipanema: {
            msg: () => {
                const lista = _getByBairro('Ipanema');
                const extra = lista.length ? `\n\n✅ **${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} disponível${lista.length !== 1 ? 'is' : ''}** em Ipanema agora!` : '';
                return `🌊 **Ipanema** — O endereço mais desejado do Brasil.\n\n• Praia mundialmente famosa\n• Gastronomia e vida noturna premiadas\n• Valorização histórica consistente\n• Alta demanda de aluguel\n\nA partir de **R$ 750 mil**.${extra}`;
            },
            opts: () => {
                const lista = _getByBairro('Ipanema');
                const opts = [];
                if (lista.length) opts.push({ label: `🏠 Ver ${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} em Ipanema`, action: () => { window.location.href = 'imoveis.html?bairro=Ipanema'; } });
                opts.push({ label: '📱 Falar com Leandro', next: 'wa_ipanema', waMsg: 'Olá Leandro! Tenho interesse em imóveis em Ipanema.' });
                opts.push({ label: '↩ Outros bairros', next: 'bairros' });
                return opts;
            },
        },
        info_leblon: {
            msg: () => {
                const lista = _getByBairro('Leblon');
                const extra = lista.length ? `\n\n✅ **${lista.length} imóvel${lista.length !== 1 ? 'is' : ''}** disponíve${lista.length !== 1 ? 'is' : 'l'} no Leblon!` : '';
                return `🏖️ **Leblon** — O bairro mais valorizado do Rio.\n\n• Tranquilo, arborizado, seguro\n• Melhor culinária da cidade\n• Perfil familiar de alto padrão\n• Escolas e hospitais top\n\nA partir de **R$ 900 mil**.${extra}`;
            },
            opts: () => {
                const lista = _getByBairro('Leblon');
                const opts = [];
                if (lista.length) opts.push({ label: `🏠 Ver ${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} no Leblon`, action: () => { window.location.href = 'imoveis.html?bairro=Leblon'; } });
                opts.push({ label: '📱 Falar com Leandro', next: 'wa_leblon', waMsg: 'Olá Leandro! Tenho interesse em imóveis no Leblon.' });
                opts.push({ label: '↩ Outros bairros', next: 'bairros' });
                return opts;
            },
        },
        info_copa: {
            msg: () => {
                const lista = _getByBairro('Copacabana');
                const extra = lista.length ? `\n\n✅ **${lista.length} imóvel${lista.length !== 1 ? 'is' : ''}** disponíve${lista.length !== 1 ? 'is' : 'l'} em Copacabana!` : '';
                return `🏝️ **Copacabana** — Ícone mundial do Rio.\n\n• Uma das praias mais famosas do mundo\n• Metrô na porta\n• Alta demanda turística (ótimo para airbnb)\n\nA partir de **R$ 450 mil**.${extra}`;
            },
            opts: () => {
                const lista = _getByBairro('Copacabana');
                const opts = [];
                if (lista.length) opts.push({ label: `🏠 Ver ${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} em Copa`, action: () => { window.location.href = 'imoveis.html?bairro=Copacabana'; } });
                opts.push({ label: '📱 Falar com Leandro', next: 'wa_copa', waMsg: 'Olá Leandro! Tenho interesse em imóveis em Copacabana.' });
                opts.push({ label: '↩ Outros bairros', next: 'bairros' });
                return opts;
            },
        },
        info_botafogo: {
            msg: () => {
                const lista = _getByBairro('Botafogo');
                const extra = lista.length ? `\n\n✅ **${lista.length} imóvel${lista.length !== 1 ? 'is' : ''}** disponíve${lista.length !== 1 ? 'is' : 'l'} em Botafogo!` : '';
                return `🌿 **Botafogo** — Charme e eficiência carioca.\n\n• Metrô na porta, fácil acesso\n• Vida cultural intensa\n• Vista para o Pão de Açúcar\n\nA partir de **R$ 380 mil**.${extra}`;
            },
            opts: () => {
                const lista = _getByBairro('Botafogo');
                const opts = [];
                if (lista.length) opts.push({ label: `🏠 Ver ${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} em Botafogo`, action: () => { window.location.href = 'imoveis.html?bairro=Botafogo'; } });
                opts.push({ label: '📱 Falar com Leandro', next: 'wa_botafogo', waMsg: 'Olá Leandro! Tenho interesse em imóveis em Botafogo.' });
                opts.push({ label: '↩ Outros bairros', next: 'bairros' });
                return opts;
            },
        },
        info_flamengo: {
            msg: () => {
                const lista = _getByBairro('Flamengo');
                const extra = lista.length ? `\n\n✅ **${lista.length} imóvel${lista.length !== 1 ? 'is' : ''}** disponíve${lista.length !== 1 ? 'is' : 'l'} no Flamengo!` : '';
                return `🌅 **Flamengo** — Orla da Baía de Guanabara.\n\n• Parque do Flamengo (maior parque urbano do mundo)\n• Fácil acesso ao centro e metrô\n• Vista para a Baía e Pão de Açúcar\n\nA partir de **R$ 350 mil**.${extra}`;
            },
            opts: () => {
                const lista = _getByBairro('Flamengo');
                const opts = [];
                if (lista.length) opts.push({ label: `🏠 Ver ${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} no Flamengo`, action: () => { window.location.href = 'imoveis.html?bairro=Flamengo'; } });
                opts.push({ label: '📱 Falar com Leandro', next: 'wa_flamengo', waMsg: 'Olá Leandro! Tenho interesse em imóveis no Flamengo.' });
                opts.push({ label: '↩ Outros bairros', next: 'bairros' });
                return opts;
            },
        },
        info_barra: {
            msg: () => {
                const lista = _getByBairro('Barra da Tijuca');
                const extra = lista.length ? `\n\n✅ **${lista.length} imóvel${lista.length !== 1 ? 'is' : ''}** disponíve${lista.length !== 1 ? 'is' : 'l'} na Barra!` : '';
                return `🏙️ **Barra da Tijuca** — Rio moderno e completo.\n\n• Apartamentos e condomínios espaçosos\n• Shoppings, hospitais, escolas de alto nível\n• Melhor custo-benefício por m²\n\nA partir de **R$ 500 mil**.${extra}`;
            },
            opts: () => {
                const lista = _getByBairro('Barra da Tijuca');
                const opts = [];
                if (lista.length) opts.push({ label: `🏠 Ver ${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} na Barra`, action: () => { window.location.href = 'imoveis.html?bairro=Barra+da+Tijuca'; } });
                opts.push({ label: '📱 Falar com Leandro', next: 'wa_barra', waMsg: 'Olá Leandro! Tenho interesse em imóveis na Barra da Tijuca.' });
                opts.push({ label: '↩ Outros bairros', next: 'bairros' });
                return opts;
            },
        },
        info_recreio: {
            msg: () => {
                const lista = _getByBairro('Recreio');
                const extra = lista.length ? `\n\n✅ **${lista.length} imóvel${lista.length !== 1 ? 'is' : ''}** disponíve${lista.length !== 1 ? 'is' : 'l'} no Recreio!` : '';
                return `🌴 **Recreio dos Bandeirantes** — Tranquilidade carioca com praia.\n\n• Mais espaçoso e reservado que a Barra\n• Natureza preservada ao redor\n• Ótimo para famílias e pets\n\nA partir de **R$ 420 mil**.${extra}`;
            },
            opts: () => {
                const lista = _getByBairro('Recreio');
                const opts = [];
                if (lista.length) opts.push({ label: `🏠 Ver ${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} no Recreio`, action: () => { window.location.href = 'imoveis.html?bairro=Recreio+dos+Bandeirantes'; } });
                opts.push({ label: '📱 Falar com Leandro', next: 'wa_recreio', waMsg: 'Olá Leandro! Tenho interesse em imóveis no Recreio.' });
                opts.push({ label: '↩ Outros bairros', next: 'bairros' });
                return opts;
            },
        },
        info_bo: {
            msg: () => {
                const lista = _getByBairro('Barra Ol');
                const extra = lista.length ? `\n\n✅ **${lista.length} imóvel${lista.length !== 1 ? 'is' : ''}** disponíve${lista.length !== 1 ? 'is' : 'l'} na Barra Olímpica!` : '';
                return `🏗️ **Barra Olímpica** — O bairro mais novo e moderno do Rio.\n\n• Infraestrutura dos Jogos 2016\n• Terrenos e apartamentos modernos\n• Ótima valorização futura\n\nA partir de **R$ 380 mil**.${extra}`;
            },
            opts: () => {
                const lista = _getByBairro('Barra Ol');
                const opts = [];
                if (lista.length) opts.push({ label: `🏠 Ver ${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} na B. Olímpica`, action: () => { window.location.href = 'imoveis.html?bairro=Barra+Ol%C3%ADmpica'; } });
                opts.push({ label: '📱 Falar com Leandro', next: 'wa_bo', waMsg: 'Olá Leandro! Tenho interesse em imóveis na Barra Olímpica.' });
                opts.push({ label: '↩ Outros bairros', next: 'bairros' });
                return opts;
            },
        },

        /* ── FINANCIAMENTO ── */
        financiamento: {
            msg: '💳 **Financiamento imobiliário** — O Leandro te ajuda do início ao fim!\n\nSobre o que quer saber?',
            opts: [
                { label: '🏦 Como funciona?',            next: 'fin_como'     },
                { label: '💰 Posso usar o FGTS?',       next: 'fin_fgts'     },
                { label: '📊 Qual o valor da entrada?',  next: 'fin_entrada'  },
                { label: '✅ Serei aprovado?',           next: 'fin_aprovado' },
                { label: '🏦 Qual banco é melhor?',      next: 'fin_banco'    },
                { label: '↩ Voltar',                     next: 'inicio'       },
            ],
        },
        fin_como:     { msg: '🏦 **Como funciona o financiamento:**\n\n• Você paga entrada (mín. 20%)\n• O banco financia o restante em até **360 meses**\n• Taxas: a partir de **10,5% a.a.**\n• Análise de crédito: renda, CPF, histórico\n\nO Leandro te indica o melhor banco para o seu perfil!', opts: [{ label: '📱 Simular com Leandro', next: 'wa_financiamento', waMsg: 'Olá Leandro! Quero simular um financiamento imobiliário.' }, { label: '💰 E o FGTS?', next: 'fin_fgts' }, { label: '↩ Voltar', next: 'financiamento' }] },
        fin_fgts:     { msg: '💰 **FGTS no financiamento:**\n\n• Pode usar para dar a **entrada**\n• Ou para **amortizar** o saldo devedor\n• Ou para **pagar prestações** (até 12 meses)\n• Requisitos: 3+ anos de carteira assinada, sem outro financiamento ativo, primeiro imóvel residencial', opts: [{ label: '📱 Verificar meu FGTS com Leandro', next: 'wa_financiamento', waMsg: 'Olá Leandro! Quero usar meu FGTS para comprar um imóvel.' }, { label: '↩ Voltar', next: 'financiamento' }] },
        fin_entrada:  { msg: '📊 **Sobre a entrada:**\n\n• Mínimo de **20% do valor** para financiamento\n• Quanto maior a entrada, menor a taxa de juros\n• **FGTS** pode compor parte da entrada\n• Minha Casa Minha Vida: entrada pode ser menor', opts: [{ label: '📱 Analisar entrada com Leandro', next: 'wa_financiamento', waMsg: 'Olá Leandro! Quero entender melhor como funciona a entrada.' }, { label: '↩ Voltar', next: 'financiamento' }] },
        fin_aprovado: { msg: '✅ **Como saber se será aprovado:**\n\n• Parcela máxima = 30% da sua renda mensal\n• Sem restrições no CPF (Serasa/SPC)\n• Histórico de crédito positivo\n• Documentos e comprovantes em ordem\n\nO Leandro faz a **pré-análise gratuita** antes do banco!', opts: [{ label: '📱 Pré-análise gratuita', next: 'wa_financiamento', waMsg: 'Olá Leandro! Quero fazer uma pré-análise do meu crédito.' }, { label: '↩ Voltar', next: 'financiamento' }] },
        fin_banco:    { msg: '🏦 **Melhores bancos para financiamento:**\n\n• **Caixa** — menores taxas, especializada em imóveis\n• **Banco do Brasil** — bom para servidores\n• **Itaú** — rápido, bom para autônomos\n• **Bradesco** — flexível, renda variada\n• **Santander** — taxas competitivas\n\nO Leandro busca a **melhor taxa para você**!', opts: [{ label: '📱 Buscar melhor taxa com Leandro', next: 'wa_financiamento', waMsg: 'Olá Leandro! Quero saber qual banco tem a melhor taxa para meu perfil.' }, { label: '↩ Voltar', next: 'financiamento' }] },

        /* ── CONTATO ── */
        contato: {
            msg: `📞 **${KB.nome}** — CRECI-RJ 97315\n\n🕐 ${KB.horario}\n📱 ${KB.tel}\n📸 ${KB.instagram}\n✉️ ${KB.email}\n\nComo prefere entrar em contato?`,
            opts: [
                { label: '💬 WhatsApp agora',    action: () => window.open(KB.whatsapp, '_blank') },
                { label: '📸 Instagram',         action: () => window.open('https://instagram.com/leopbomfim', '_blank') },
                { label: '📋 Página de contato', action: () => window.location.href = 'contato.html' },
                { label: '↩ Início',             next: 'inicio' },
            ],
        },

        /* ── CATÁLOGO SIMPLES ── */
        catalogo: {
            msg: '📋 Nosso catálogo completo está na página de imóveis! Filtre por bairro, preço, quartos e tipo.',
            opts: [
                { label: '🏠 Ver todos os imóveis', action: () => window.location.href = 'imoveis.html' },
                { label: '📱 Prefiro WhatsApp',     next: 'contato' },
                { label: '↩ Início',                next: 'inicio'  },
            ],
        },

        /* ── NÓS WA ── */
        wa_600:          { msg: null },
        wa_1m:           { msg: null },
        wa_luxo:         { msg: null },
        wa_avaliacao:    { msg: null },
        wa_financiamento:{ msg: null },
        wa_terreno:      { msg: null },
        wa_ipanema:      { msg: null },
        wa_leblon:       { msg: null },
        wa_copa:         { msg: null },
        wa_barra:        { msg: null },
        wa_recreio:      { msg: null },
        wa_botafogo:     { msg: null },
        wa_flamengo:     { msg: null },
        wa_bo:           { msg: null },
        wa_tranquilo:    { msg: null },
        wa_centro:       { msg: null },
        wa_familia:      { msg: null },
        wa_invest:       { msg: null },
    };

    /* ════════════════════════════════════════════
       RESPOSTAS DIRETAS — NLP expandido
    ════════════════════════════════════════════ */
    const DIRECT_ANSWERS = [
        /* CATÁLOGO TEMPO REAL */
        {
            p: ['quantos imoveis', 'quantos imóveis', 'quantos tem', 'tem quantos', 'estoque', 'disponivel agora', 'disponível agora', 'o que tem disponivel', 'o que tem disponível', 'o que voce tem', 'o que você tem', 'o que tem no site'],
            answerFn: () => {
                const r = _resumoEstoque();
                if (!r) return { text: '📊 Estou carregando o catálogo... Acesse a página de imóveis para ver tudo em tempo real!', opts: [{ label: '🏠 Ver imóveis', action: () => { window.location.href = 'imoveis.html'; } }, { label: '↩ Menu', next: 'inicio' }] };
                const bList = r.bairros.slice(0, 5).join(', ');
                return {
                    text: `📊 **Estoque atual — atualizado agora:**\n\n🏠 **${r.total} imóvei${r.total !== 1 ? 's' : ''}** disponíveis\n📍 Bairros: ${bList}${r.bairros.length > 5 ? ' e mais' : ''}${r.terrenos ? `\n🏗️ ${r.terrenos} terreno${r.terrenos !== 1 ? 's' : ''}` : ''}${r.dest ? `\n⭐ ${r.dest} em destaque` : ''}`,
                    opts: [
                        { label: '🔍 Ver catálogo completo', next: 'ver_catalogo' },
                        { label: '🏠 Abrir página de imóveis', action: () => { window.location.href = 'imoveis.html'; } },
                        { label: '↩ Menu', next: 'inicio' },
                    ],
                };
            },
        },
        {
            p: ['tem terreno', 'tem algum terreno', 'terreno a venda', 'terreno disponivel', 'terrenos disponiveis', 'terrenos disponíveis'],
            answerFn: () => {
                const lista = _getByTipo('Terreno');
                if (!lista.length) return { text: '🏗️ No momento não temos terrenos disponíveis no catálogo. O Leandro pode encontrar opções exclusivas para você!', opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Tenho interesse em terrenos.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };
                const preview = lista.slice(0, 3).map(im => `🏗️ **${im.titulo}** — ${im.bairro} · ${im.area}m² · ${_formatPreco(im.preco)}`).join('\n');
                return {
                    text: `🏗️ **Sim! Temos ${lista.length} terreno${lista.length !== 1 ? 's' : ''} disponíve${lista.length !== 1 ? 'is' : 'l'}:**\n\n${preview}`,
                    opts: [{ label: '🔍 Ver todos os terrenos', next: 'cat_terrenos' }, { label: '📱 Falar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Tenho interesse em terrenos. Pode me ajudar?'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };
            },
        },
        {
            p: ['tem imovel em ipanema', 'imovel ipanema', 'ipanema disponivel', 'ipanema disponível'],
            answerFn: () => {
                const lista = _getByBairro('Ipanema');
                if (!lista.length) return { text: '🌊 No momento não temos imóveis em Ipanema no catálogo. O Leandro tem conexões exclusivas na região!', opts: [{ label: '📱 Consultar Leandro', action: () => window.open(KB.wa('Olá Leandro! Procuro imóveis em Ipanema. O que você tem disponível?'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };
                const preview = lista.slice(0, 2).map(_renderImovelCard).join('\n\n');
                return { text: `🌊 **${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} em Ipanema:**\n\n${preview}`, opts: _buildImovelOpts(lista[0]) };
            },
        },
        {
            p: ['tem imovel no leblon', 'imovel leblon', 'leblon disponivel', 'leblon disponível'],
            answerFn: () => {
                const lista = _getByBairro('Leblon');
                if (!lista.length) return { text: '🏖️ No momento não temos imóveis no Leblon no catálogo. Mas o Leandro tem acesso a imóveis exclusivos não anunciados!', opts: [{ label: '📱 Consultar Leandro', action: () => window.open(KB.wa('Olá Leandro! Procuro imóveis no Leblon. O que você tem?'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };
                const preview = lista.slice(0, 2).map(_renderImovelCard).join('\n\n');
                return { text: `🏖️ **${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} no Leblon:**\n\n${preview}`, opts: _buildImovelOpts(lista[0]) };
            },
        },
        {
            p: ['cobertura disponivel', 'tem cobertura', 'coberturas disponiveis'],
            answerFn: () => {
                const lista = _getByTipo('Cobertura');
                if (!lista.length) return { text: '🌆 Não temos coberturas disponíveis no catálogo agora. O Leandro tem acesso a opções exclusivas — entre em contato!', opts: [{ label: '📱 Consultar Leandro', action: () => window.open(KB.wa('Olá Leandro! Procuro cobertura no Rio. O que você tem disponível?'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };
                const preview = lista.slice(0, 2).map(_renderImovelCard).join('\n\n');
                return { text: `🌆 **${lista.length} cobertura${lista.length !== 1 ? 's' : ''} disponíve${lista.length !== 1 ? 'is' : 'l'}:**\n\n${preview}`, opts: _buildImovelOpts(lista[0]) };
            },
        },
        {
            p: ['menor preco', 'menor preço', 'mais barato', 'mais em conta', 'opcao mais barata', 'opção mais barata', 'menor valor'],
            answerFn: () => {
                if (!_catalogoImoveis.length) return { text: 'Acesse o site para ver todos os preços!', opts: [{ label: '🏠 Ver imóveis', action: () => { window.location.href = 'imoveis.html'; } }] };
                const sorted = [..._catalogoImoveis].filter(i => i.precoModo !== 'lancamento').sort((a, b) => parseFloat(a.preco || 0) - parseFloat(b.preco || 0));
                const im = sorted[0];
                if (!im) return { text: 'Acesse o site para ver os preços!', opts: [{ label: '🏠 Ver imóveis', action: () => { window.location.href = 'imoveis.html?ordenar=menor-preco'; } }] };
                return { text: `💰 **O imóvel mais acessível do catálogo agora:**\n\n${_renderImovelCard(im)}`, opts: _buildImovelOpts(im) };
            },
        },
        {
            p: ['destaque', 'destaques', 'mais vendido', 'recomendado', 'recomendação'],
            answerFn: () => {
                const lista = _getDestaques();
                if (!lista.length) {
                    const alt = _catalogoImoveis.slice(0, 2);
                    if (!alt.length) return { text: 'Ver o catálogo completo no site!', opts: [{ label: '🏠 Ver imóveis', action: () => { window.location.href = 'imoveis.html'; } }] };
                    const preview = alt.map(_renderImovelCard).join('\n\n');
                    return { text: `🏠 **Imóveis em destaque:**\n\n${preview}`, opts: [{ label: '🔍 Ver catálogo', action: () => { window.location.href = 'imoveis.html'; } }, { label: '↩ Menu', next: 'inicio' }] };
                }
                const preview = lista.slice(0, 2).map(_renderImovelCard).join('\n\n');
                return { text: `⭐ **${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} em destaque:**\n\n${preview}`, opts: [{ label: '👁️ Ver destaques', next: 'cat_destaques' }, { label: '↩ Menu', next: 'inicio' }] };
            },
        },

        /* CONTATO */
        {
            p: ['numero', 'telefone', 'fone', 'celular', 'ligar', 'numero do leandro', 'tel do leandro'],
            answer: `📱 O número do **${KB.nome}** é **${KB.tel}**\n\nVocê pode ligar ou mandar mensagem pelo WhatsApp agora mesmo!`,
            opts: [{ label: '💬 Abrir WhatsApp', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu principal', next: 'inicio' }],
        },
        {
            p: ['email', 'e-mail', 'correio eletronico'],
            answer: `✉️ O e-mail do **${KB.nome}** é:\n\n**${KB.email}**`,
            opts: [{ label: '📱 Prefiro WhatsApp', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu principal', next: 'inicio' }],
        },
        {
            p: ['instagram', 'insta', 'ig', 'rede social'],
            answer: `📸 O Instagram do **${KB.nome}** é **${KB.instagram}**\n\nLá ele posta novidades, imóveis e dicas do mercado carioca!`,
            opts: [{ label: '📸 Abrir Instagram', action: () => window.open('https://instagram.com/leopbomfim', '_blank') }, { label: '↩ Menu principal', next: 'inicio' }],
        },
        {
            p: ['horario', 'hora de atendimento', 'quando atende', 'funcionamento', 'quando funciona', 'disponivel', 'disponível'],
            answer: `🕐 **Horário de atendimento do ${KB.nome}:**\n\n• Seg – Sex: **8h às 20h**\n• Sábado: **9h às 18h**\n• Domingo: **sob agendamento**\n\nPelo WhatsApp ele costuma responder fora do horário também! 😄`,
            opts: [{ label: '💬 Mandar mensagem', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu principal', next: 'inicio' }],
        },
        {
            p: ['creci', 'registro', 'habilitado', 'credencial', 'registrado'],
            answer: `✅ **${KB.nome}** é corretor registrado:\n\n• **${KB.creci}**\n• ${KB.experiencia} de experiência\n• ${KB.negociados}\n• 100% de satisfação dos clientes`,
            opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu principal', next: 'inicio' }],
        },
        {
            p: ['quem e leandro', 'quem é leandro', 'quem e o leandro', 'quem é o leandro', 'leandro bomfim', 'sobre o leandro', 'sobre leandro'],
            answer: `👤 **Leandro Bomfim** é corretor de imóveis especialista no Rio de Janeiro.\n\n• **${KB.creci}**\n• ${KB.experiencia} no mercado\n• ${KB.negociados}\n• Especialidade: Zona Sul e Barra da Tijuca\n• Atendimento personalizado e documentação 100% segura`,
            opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu principal', next: 'inicio' }],
        },

        /* PREÇOS POR BAIRRO */
        {
            p: ['preco ipanema', 'preço ipanema', 'quanto custa ipanema', 'valor ipanema'],
            answer: `🌊 **Preços em Ipanema (2025):**\n\n• Studios: R$ 400–600k\n• 1 quarto: R$ 600k–1M\n• 2 quartos: R$ 900k–2M\n• 3+ quartos: R$ 2M–5M+\n• Coberturas: R$ 3M–15M+`,
            opts: [{ label: '🏠 Ver imóveis em Ipanema', action: () => { window.location.href = 'imoveis.html?bairro=Ipanema'; } }, { label: '📱 Falar com Leandro', next: 'wa_ipanema', waMsg: 'Olá Leandro! Quero saber sobre preços em Ipanema.' }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['preco leblon', 'preço leblon', 'quanto custa leblon', 'valor leblon'],
            answer: `🏖️ **Preços no Leblon (2025):**\n\n• Studios: R$ 500–800k\n• 1 quarto: R$ 700k–1,3M\n• 2 quartos: R$ 1,2M–2,5M\n• 3+ quartos: R$ 2,5M–6M+\n• Coberturas: R$ 4M–20M+`,
            opts: [{ label: '🏠 Ver imóveis no Leblon', action: () => { window.location.href = 'imoveis.html?bairro=Leblon'; } }, { label: '📱 Falar com Leandro', next: 'wa_leblon', waMsg: 'Olá Leandro! Quero saber sobre preços no Leblon.' }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['preco barra', 'preço barra', 'quanto custa barra', 'valor barra'],
            answer: `🏙️ **Preços na Barra da Tijuca (2025):**\n\n• 1 quarto: R$ 350–600k\n• 2 quartos: R$ 500k–1M\n• 3 quartos: R$ 800k–1,8M\n• 4+ quartos: R$ 1,5M–4M\n• Coberturas: R$ 2M–8M`,
            opts: [{ label: '🏠 Ver imóveis na Barra', action: () => { window.location.href = 'imoveis.html?bairro=Barra+da+Tijuca'; } }, { label: '📱 Falar com Leandro', next: 'wa_barra', waMsg: 'Olá Leandro! Quero saber sobre preços na Barra da Tijuca.' }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['preco recreio', 'preço recreio', 'quanto custa recreio', 'valor recreio'],
            answer: `🌴 **Preços no Recreio (2025):**\n\n• 1 quarto: R$ 280–500k\n• 2 quartos: R$ 400–800k\n• 3 quartos: R$ 600k–1,3M\n• 4+ quartos: R$ 1M–2,5M`,
            opts: [{ label: '🏠 Ver imóveis no Recreio', action: () => { window.location.href = 'imoveis.html?bairro=Recreio+dos+Bandeirantes'; } }, { label: '📱 Falar com Leandro', next: 'wa_recreio', waMsg: 'Olá Leandro! Quero saber sobre preços no Recreio.' }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['preco copacabana', 'preço copacabana', 'valor copacabana', 'quanto custa copacabana'],
            answer: `🏝️ **Preços em Copacabana (2025):**\n\n• Studios: R$ 250–450k\n• 1 quarto: R$ 380–700k\n• 2 quartos: R$ 600k–1,2M\n• 3+ quartos: R$ 1M–2,5M`,
            opts: [{ label: '🏠 Ver imóveis em Copa', action: () => { window.location.href = 'imoveis.html?bairro=Copacabana'; } }, { label: '📱 Falar com Leandro', next: 'wa_copa', waMsg: 'Olá Leandro! Quero saber sobre preços em Copacabana.' }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* TIPOS */
        {
            p: ['cobertura', 'penthouse', 'duplex', 'triplex'],
            answer: `🌆 **Coberturas no Rio de Janeiro:**\n\n• Piscina privativa, terraço, churrasqueira\n• Exclusividade e privacidade total\n• Melhor valorização do mercado\n• O Leandro tem coberturas em Ipanema, Leblon e Barra!\n\nA partir de **R$ 1,5M**.`,
            opts: [{ label: '🔍 Ver coberturas disponíveis', next: 'cat_destaques' }, { label: '📱 Ver coberturas com Leandro', next: 'wa_luxo', waMsg: 'Olá Leandro! Tenho interesse em coberturas no Rio.' }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['studio', 'studios', 'kitnet', 'kitnete', 'compacto'],
            answer: `🏢 **Studios e Kitnets no Rio:**\n\n• Imóveis compactos (20–45m²)\n• Alta demanda de aluguel\n• Ótima liquidez no mercado\n• Disponíveis em Copacabana, Botafogo e Barra\n\nA partir de **R$ 250 mil**!`,
            opts: [{ label: '🔍 Ver catálogo', next: 'cat_ate600' }, { label: '📱 Ver studios com Leandro', next: 'wa_600', waMsg: 'Olá Leandro! Tenho interesse em studios ou kitnets no Rio.' }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* DOCUMENTAÇÃO */
        {
            p: ['documento', 'documentacao', 'documentação', 'escritura', 'cartorio', 'cartório', 'burocracia'],
            answer: `📄 **Documentação para compra de imóvel:**\n\n**Do comprador:** RG, CPF, comprovante de renda (3 meses), comprovante de residência\n\n**Do imóvel:** Matrícula atualizada, certidão negativa de débitos, IPTU em dia, Habite-se\n\nO Leandro cuida de **toda a documentação** — você só assina! 😊`,
            opts: [{ label: '📱 Tirar dúvidas com Leandro', action: () => window.open(KB.wa('Olá Leandro! Tenho dúvidas sobre documentação para compra de imóvel.'), '_blank') }, { label: '↩ Menu principal', next: 'inicio' }],
        },
        {
            p: ['itbi', 'custo compra', 'gasto compra', 'taxa compra', 'custos da compra', 'quanto gasto na compra'],
            answer: `📋 **Custos extras na compra de imóvel:**\n\n• **ITBI** (Imposto de Transmissão): ~3% do valor\n• **Escritura** no cartório: ~1,5–2%\n• **Registro** do imóvel: ~0,5–1%\n• **Total estimado:** 4–6% do valor\n\nEx: imóvel R$ 500k → gastos extras de ~R$ 20–30k`,
            opts: [{ label: '📱 Planejar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero entender todos os custos de comprar um imóvel.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['taxa de juros', 'taxa juros', 'juros financiamento', 'juros banco'],
            answer: `📊 **Taxas de juros para financiamento (2025):**\n\n• **Caixa:** a partir de 10,49% a.a.\n• **Banco do Brasil:** a partir de 10,79% a.a.\n• **Bradesco:** a partir de 10,99% a.a.\n• **Itaú:** a partir de 10,99% a.a.\n• **Santander:** a partir de 11,19% a.a.`,
            opts: [{ label: '📱 Buscar melhor taxa', next: 'wa_financiamento', waMsg: 'Olá Leandro! Quero buscar a melhor taxa de financiamento para meu perfil.' }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['airbnb', 'temporada', 'aluguel temporada', 'renda aluguel', 'rendimento aluguel', 'alugar imovel'],
            answer: `🏠 **Renda com aluguel no Rio:**\n\n**Airbnb / Temporada:**\n• Copa, Ipanema e Leblon: altíssima demanda\n• R$ 200–800/noite dependendo do padrão\n• Retorno anual: 8–15% do valor do imóvel\n\n**Aluguel tradicional:**\n• Studios em Copa: R$ 2.000–3.500/mês\n• 2 quartos em Ipanema: R$ 4.000–8.000/mês`,
            opts: [{ label: '📱 Calcular rentabilidade', action: () => window.open(KB.wa('Olá Leandro! Quero calcular a rentabilidade de aluguel de um imóvel no Rio.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['planta', 'lancamento', 'lançamento', 'em construcao', 'em construção', 'imovel novo', 'empreendimento'],
            answer: `🚀 **Imóveis na Planta / Lançamentos:**\n\n• Preços menores no pré-lançamento\n• Condições facilitadas de pagamento\n• Personalização durante a obra\n• Valorização de 20–40% até a entrega`,
            opts: [{ label: '📱 Ver lançamentos', action: () => window.open(KB.wa('Olá Leandro! Tenho interesse em imóveis na planta ou lançamentos no Rio.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['valorizacao', 'valorização', 'onde investir', 'melhor bairro investir'],
            answer: `📈 **Melhores bairros para investir no Rio (2025):**\n\n🥇 **Ipanema/Leblon** — valorização histórica\n🥈 **Barra Olímpica** — grande potencial\n🥉 **Recreio** — crescimento constante\n🏅 **Copacabana** — turismo, airbnb\n🏅 **Botafogo** — gentrificação acelerada\n\n_Média: 8% de valorização a.a. nos últimos 10 anos._`,
            opts: [{ label: '📱 Analisar investimento com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero investir em imóvel no Rio. Pode me ajudar a escolher?'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['como comprar', 'processo de compra', 'passo a passo', 'etapas', 'por onde comecar', 'por onde começar'],
            answer: `📋 **Passo a passo para comprar um imóvel:**\n\n**1️⃣** Defina seu orçamento\n**2️⃣** Escolha o bairro ideal\n**3️⃣** Liste o que precisa\n**4️⃣** Visite os imóveis com o Leandro\n**5️⃣** Faça uma proposta\n**6️⃣** Cuide da documentação\n**7️⃣** Assine e receba as chaves! 🗝️`,
            opts: [{ label: '📱 Iniciar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero comprar um imóvel no Rio. Por onde começo?'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['vender', 'venda', 'quero vender', 'vendo imovel', 'anunciar imovel'],
            answer: `🏠 **Quer vender seu imóvel?**\n\nO Leandro cuida de tudo:\n\n• ✅ Avaliação gratuita de mercado\n• 📸 Fotos profissionais e divulgação\n• 🤝 Negociação e busca de compradores\n• 📄 Toda a documentação\n• 💰 Estratégia de preço para vender rápido\n\n**${KB.negociados}** com sucesso!`,
            opts: [{ label: '📱 Quero vender meu imóvel', next: 'wa_avaliacao', waMsg: 'Olá Leandro! Quero vender meu imóvel. Pode me ajudar com uma avaliação?' }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['comissao', 'comissão', 'corretagem', 'quanto cobra', 'quanto custa o corretor'],
            answer: `💼 **Taxa de corretagem:**\n\n• A comissão é **paga pelo vendedor**, não pelo comprador\n• Tabela CRECI: geralmente **6% do valor**\n• Para o **comprador**: o serviço do Leandro é **GRATUITO** ✅`,
            opts: [{ label: '📱 Tirar dúvidas com Leandro', action: () => window.open(KB.wa('Olá Leandro! Tenho dúvidas sobre comissão e corretagem.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['seguro', 'segurança', 'garantia', 'golpe', 'fraude', 'risco compra', 'confiar'],
            answer: `🛡️ **Segurança na compra com o Leandro:**\n\n• Verificação completa da matrícula e histórico\n• Certidão negativa de débitos do vendedor\n• Confirmação de inexistência de ônus\n• Contrato revisado por parceiros jurídicos\n• Com CRECI-RJ você tem um profissional habilitado e responsabilizado!`,
            opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero entender a segurança na compra de imóvel.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['comprar ou alugar', 'vale a pena comprar', 'melhor comprar ou alugar'],
            answer: `🤔 **Comprar ou Alugar?**\n\n**Comprar vale quando:**\n• Você tem estabilidade financeira\n• Planeja ficar 5+ anos no imóvel\n• Quer parar de pagar aluguel pro dono\n\n**No Rio, imóveis valorizaram ~8% a.a. nos últimos 10 anos!** 📈`,
            opts: [{ label: '📱 Analisar meu caso', action: () => window.open(KB.wa('Olá Leandro! Quero analisar se é melhor comprar ou alugar no meu caso.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['primeiro imovel', 'primeiro imóvel', 'primeiro ape', 'nunca comprei', 'iniciante'],
            answer: `🎉 **Comprando seu primeiro imóvel!**\n\nO Leandro é especialista em ajudar quem compra pela primeira vez:\n\n• ✅ Explica cada etapa com calma\n• ✅ Ajuda a organizar o orçamento\n• ✅ Orienta sobre FGTS e financiamento\n• ✅ Toda a documentação incluída\n\n**Você pode usar o FGTS** para dar entrada se for o primeiro imóvel residencial!`,
            opts: [{ label: '📱 Começar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Vou comprar meu primeiro imóvel. Pode me orientar em cada passo?'), '_blank') }, { label: '💳 Entender financiamento', next: 'financiamento' }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['pet', 'cachorro', 'gato', 'animal', 'pet friendly', 'aceita pet'],
            answer: `🐾 **Imóveis pet-friendly no Rio:**\n\n• Condomínios que aceitam pets\n• Prédios com pet place\n• **Recreio e Barra** têm os melhores condomínios pet-friendly!\n\nO Leandro filtra por essa opção para você.`,
            opts: [{ label: '📱 Buscar imóvel pet-friendly', action: () => window.open(KB.wa('Olá Leandro! Procuro imóvel pet-friendly no Rio. Pode me ajudar?'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* SAUDAÇÕES */
        {
            p: ['oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'tudo bom', 'hello', 'hey', 'ei'],
            flow: 'inicio',
        },
        {
            p: ['obrigado', 'obrigada', 'valeu', 'muito obrigado', 'agradeço', 'thanks'],
            answer: `😊 Fico feliz em ajudar! O **${KB.nome}** está sempre disponível para te atender.\n\nSe precisar de mais alguma coisa, é só chamar! 🏠`,
            opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.whatsapp, '_blank') }, { label: '🏠 Ver imóveis', action: () => { window.location.href = 'imoveis.html'; } }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['tchau', 'ate logo', 'até logo', 'ate mais', 'adeus', 'bye'],
            answer: `👋 Até logo! Quando precisar de ajuda com imóveis no Rio, é só voltar aqui.\n\nO **${KB.nome}** está sempre disponível! 😊`,
            opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.whatsapp, '_blank') }],
        },
    ];

    /* ════════════════════════════════════════════
       MOTOR DE INTENÇÃO
    ════════════════════════════════════════════ */
    function norm(str) {
        return (str || '').toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9 ]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function detectIntent(rawText) {
        const t = norm(rawText);
        const words = t.split(' ');

        // 1) DIRECT_ANSWERS com suporte a answerFn
        for (const da of DIRECT_ANSWERS) {
            for (const p of da.p) {
                const pn = norm(p);
                if (t.includes(pn) || (!pn.includes(' ') && words.includes(pn))) {
                    return { type: 'direct', da };
                }
            }
        }

        // 2) Palavras-chave para fluxos
        const flowMatches = [
            { words: ['catalogo', 'catálogo', 'ver imoveis', 'ver imóveis', 'o que tem', 'ver disponivel'],   flow: 'ver_catalogo'   },
            { words: ['terreno', 'lote'],                                                                       flow: 'terrenos'       },
            { words: ['ipanema'],                                                                               flow: 'info_ipanema'   },
            { words: ['leblon'],                                                                                flow: 'info_leblon'    },
            { words: ['copacabana', 'copa'],                                                                    flow: 'info_copa'      },
            { words: ['botafogo'],                                                                              flow: 'info_botafogo'  },
            { words: ['flamengo'],                                                                              flow: 'info_flamengo'  },
            { words: ['barra olimpica'],                                                                        flow: 'info_bo'        },
            { words: ['barra', 'tijuca'],                                                                       flow: 'info_barra'     },
            { words: ['recreio', 'bandeirante'],                                                                flow: 'info_recreio'   },
            { words: ['comprar', 'procuro', 'busco', 'apartamento', 'imovel', 'quero imovel'],                 flow: 'comprar'        },
            { words: ['vender', 'venda', 'avaliar', 'avaliacao', 'avaliação'],                                 flow: 'avaliar'        },
            { words: ['financiamento', 'financiar', 'parcela', 'prestacao', 'prestação', 'banco'],             flow: 'financiamento'  },
            { words: ['fgts', 'fundo garantia'],                                                               flow: 'fin_fgts'       },
            { words: ['bairro', 'regiao', 'onde fica'],                                                        flow: 'bairros'        },
            { words: ['contato', 'whatsapp', 'falar', 'atendimento'],                                          flow: 'contato'        },
            { words: ['praia', 'mar', 'orla'],                                                                 flow: 'rec_praia'      },
            { words: ['tranquilo', 'tranquilidade'],                                                           flow: 'rec_tranquilo'  },
            { words: ['familia', 'crianca', 'filhos'],                                                         flow: 'rec_familia'    },
            { words: ['investir', 'investimento', 'retorno', 'renda'],                                         flow: 'rec_invest'     },
        ];

        for (const fm of flowMatches) {
            if (fm.words.some(w => t.includes(w))) return { type: 'flow', flow: fm.flow };
        }

        return null;
    }

    /* ════════════════════════════════════════════
       ESTADO
    ════════════════════════════════════════════ */
    let isOpen      = false;
    let hasGreeted  = false;
    let _currentNode = 'inicio';
    let _sessionId   = null;
    let _chatPath    = [];
    let _msgCount    = 0; // mensagens do usuário na sessão

    function _getDeviceId() {
        let id = localStorage.getItem('_lb_did');
        if (!id) {
            id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
            localStorage.setItem('_lb_did', id);
        }
        return id;
    }

    function _getNow() {
        return new Date().toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    }

    /* Log ultra-rico: inclui hora, IP, geo, mensagem do bot, intenção */
    function _logChat(event, data = {}) {
        try {
            if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
            const db = firebase.firestore();
            if (!_sessionId) _sessionId = _getDeviceId() + '_chat_' + Date.now().toString(36);
            const today = new Date().toISOString().slice(0, 10);
            const now   = new Date();
            db.collection('chat_logs').add({
                sessionId:   _sessionId,
                deviceId:    _getDeviceId(),
                event,
                page:        window.location.pathname.split('/').pop() || 'index',
                date:        today,
                /* hora legível */
                horaStr:     _getNow(),
                hora:        `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
                timestamp:   firebase.firestore.FieldValue.serverTimestamp(),
                /* IP e geo */
                ip:          _clientIP || '—',
                cidade:      _clientGeo.cidade || '—',
                regiao:      _clientGeo.regiao || '—',
                pais:        _clientGeo.pais   || '—',
                isp:         _clientGeo.isp    || '—',
                isProxy:     _clientGeo.isProxy || false,
                /* contexto navegação */
                path:        window.location.pathname.slice(0, 80),
                userAgent:   navigator.userAgent.slice(0, 200),
                msgCount:    _msgCount,
                chatPath:    _chatPath.slice(-10).join('→'),
                ...data,
            }).catch(() => {});
        } catch (e) {}
    }

    /* ════════════════════════════════════════════
       WIDGET
    ════════════════════════════════════════════ */
    function createWidget() {
        const style = document.createElement('style');
        style.textContent = `
        #lb-chat-btn{position:fixed;bottom:5.5rem;left:1.5rem;width:56px;height:56px;border-radius:50%;
            background:linear-gradient(135deg,#3498db,#2c3e50);border:none;cursor:pointer;z-index:800;
            display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(52,152,219,.45);
            transition:transform .25s,box-shadow .25s;animation:lb-bounceIn .6s cubic-bezier(.22,1,.36,1) both;
            animation-delay:2s;opacity:0;}
        #lb-chat-btn:hover{transform:scale(1.1);box-shadow:0 8px 28px rgba(52,152,219,.6);}
        #lb-chat-btn svg{width:26px;height:26px;transition:transform .3s;}
        #lb-chat-btn.open svg{transform:rotate(90deg);}
        #lb-chat-btn .lb-notif-dot{position:absolute;top:4px;right:4px;width:12px;height:12px;background:#ef4444;
            border-radius:50%;border:2px solid #0a0a0a;animation:lb-pulse-dot 2s ease-in-out infinite;}
        @keyframes lb-bounceIn{from{opacity:0;transform:scale(.4) translateY(20px);}to{opacity:1;transform:scale(1) translateY(0);}}
        @keyframes lb-pulse-dot{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.35);opacity:.7;}}
        #lb-chat-window{position:fixed;bottom:7.5rem;left:1.5rem;width:360px;max-height:590px;
            background:#0f1923;border:1px solid rgba(52,152,219,.2);border-radius:20px;
            box-shadow:0 20px 60px rgba(0,0,0,.65);display:flex;flex-direction:column;
            z-index:799;overflow:hidden;transform:scale(.85) translateY(20px);opacity:0;pointer-events:none;
            transition:transform .3s cubic-bezier(.22,1,.36,1),opacity .3s;}
        #lb-chat-window.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}
        .lb-chat-header{background:linear-gradient(135deg,rgba(52,152,219,.15),rgba(44,62,80,.4));
            border-bottom:1px solid rgba(52,152,219,.15);padding:.85rem 1rem;
            display:flex;align-items:center;gap:.7rem;flex-shrink:0;}
        .lb-chat-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#3498db,#9b59b6);
            display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;position:relative;}
        .lb-chat-avatar::after{content:'';position:absolute;bottom:1px;right:1px;width:9px;height:9px;
            background:#22c55e;border-radius:50%;border:2px solid #0f1923;}
        .lb-chat-name{font-size:.88rem;font-weight:700;color:#fff;}
        .lb-chat-status{font-size:.72rem;color:#22c55e;display:flex;align-items:center;gap:.3rem;}
        .lb-chat-header-actions{margin-left:auto;display:flex;gap:.3rem;}
        .lb-header-btn{background:rgba(255,255,255,.07);border:none;color:rgba(255,255,255,.5);
            width:28px;height:28px;border-radius:50%;cursor:pointer;display:flex;align-items:center;
            justify-content:center;font-size:.7rem;transition:all .2s;}
        .lb-header-btn:hover{background:rgba(255,255,255,.15);color:#fff;}
        .lb-chat-messages{flex:1;overflow-y:auto;padding:.8rem;display:flex;flex-direction:column;gap:.6rem;
            scrollbar-width:thin;scrollbar-color:rgba(52,152,219,.3) transparent;}
        .lb-chat-messages::-webkit-scrollbar{width:4px;}
        .lb-chat-messages::-webkit-scrollbar-thumb{background:rgba(52,152,219,.3);border-radius:2px;}
        .lb-msg{max-width:92%;padding:.65rem .9rem;border-radius:14px;font-size:.83rem;line-height:1.55;
            color:#e2e8f0;animation:lb-msgIn .25s ease both;}
        @keyframes lb-msgIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .lb-msg.bot{background:rgba(52,152,219,.1);border:1px solid rgba(52,152,219,.15);
            border-bottom-left-radius:4px;align-self:flex-start;}
        .lb-msg.bot strong{color:#7dd3fc;}
        .lb-msg.user{background:linear-gradient(135deg,rgba(52,152,219,.35),rgba(44,62,80,.5));
            border:1px solid rgba(52,152,219,.3);border-bottom-right-radius:4px;align-self:flex-end;text-align:right;}
        .lb-msg-time{font-size:.6rem;color:rgba(255,255,255,.25);margin-top:.2rem;display:block;}
        .lb-opts{display:flex;flex-direction:column;gap:.35rem;animation:lb-msgIn .3s ease both;animation-delay:.1s;}
        .lb-opt-btn{background:rgba(255,255,255,.04);border:1px solid rgba(52,152,219,.25);border-radius:10px;
            padding:.5rem .85rem;color:#bfdbfe;font-size:.79rem;font-weight:500;cursor:pointer;text-align:left;
            transition:background .18s,border-color .18s,transform .15s;font-family:inherit;}
        .lb-opt-btn:hover{background:rgba(52,152,219,.15);border-color:rgba(52,152,219,.5);transform:translateX(3px);}
        .lb-typing{display:flex;align-items:center;gap:4px;padding:.6rem .9rem;background:rgba(52,152,219,.08);
            border:1px solid rgba(52,152,219,.12);border-radius:14px;border-bottom-left-radius:4px;
            align-self:flex-start;animation:lb-msgIn .2s ease;}
        .lb-typing span{width:6px;height:6px;background:#7dd3fc;border-radius:50%;
            animation:lb-typingDot 1.2s ease-in-out infinite;}
        .lb-typing span:nth-child(2){animation-delay:.2s;}
        .lb-typing span:nth-child(3){animation-delay:.4s;}
        @keyframes lb-typingDot{0%,80%,100%{transform:scale(.6);opacity:.4;}40%{transform:scale(1);opacity:1;}}
        .lb-input-area{display:flex;align-items:center;gap:.4rem;padding:.6rem .75rem;
            border-top:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.2);flex-shrink:0;}
        .lb-text-input{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(52,152,219,.2);
            border-radius:20px;padding:.45rem .9rem;color:#e2e8f0;font-size:.82rem;font-family:inherit;outline:none;
            transition:border-color .2s,background .2s;}
        .lb-text-input:focus{border-color:rgba(52,152,219,.5);background:rgba(255,255,255,.08);}
        .lb-text-input::placeholder{color:rgba(255,255,255,.25);}
        .lb-send-btn{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#3498db,#2c3e50);
            border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;
            color:#fff;font-size:.75rem;flex-shrink:0;transition:transform .2s,box-shadow .2s;}
        .lb-send-btn:hover{transform:scale(1.1);box-shadow:0 4px 12px rgba(52,152,219,.4);}
        .lb-chat-footer{padding:.35rem .8rem;border-top:1px solid rgba(255,255,255,.04);
            font-size:.6rem;color:rgba(255,255,255,.18);text-align:center;flex-shrink:0;}
        .lb-suggestion-chips{display:flex;flex-wrap:wrap;gap:.3rem;padding:.3rem .8rem .45rem;flex-shrink:0;}
        .lb-chip{background:rgba(52,152,219,.1);border:1px solid rgba(52,152,219,.2);border-radius:99px;
            padding:.22rem .62rem;color:#93c5fd;font-size:.69rem;font-weight:500;cursor:pointer;
            transition:all .2s;white-space:nowrap;}
        .lb-chip:hover{background:rgba(52,152,219,.2);border-color:rgba(52,152,219,.4);}
        .lb-estoque-badge{display:inline-flex;align-items:center;gap:.3rem;background:rgba(34,197,94,.1);
            border:1px solid rgba(34,197,94,.2);color:#22c55e;font-size:.64rem;font-weight:700;
            padding:.15rem .55rem;border-radius:99px;margin-left:.3rem;}
        @media(max-width:480px){
            #lb-chat-window{left:.6rem;right:.6rem;width:auto;bottom:6rem;max-height:500px;}
            #lb-chat-btn{bottom:4.8rem;left:1rem;}}
        `;
        document.head.appendChild(style);

        const btn = document.createElement('button');
        btn.id = 'lb-chat-btn';
        btn.setAttribute('aria-label', 'Abrir chat com assistente');
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span class="lb-notif-dot"></span>`;

        const win = document.createElement('div');
        win.id = 'lb-chat-window';
        win.setAttribute('role', 'dialog');
        win.setAttribute('aria-label', 'Chat com assistente imobiliário');
        win.innerHTML = `
            <div class="lb-chat-header">
                <div class="lb-chat-avatar">🏠</div>
                <div>
                    <div class="lb-chat-name">Assistente LB Imóveis <span class="lb-estoque-badge" id="lb-estoque-badge" style="display:none"></span></div>
                    <div class="lb-chat-status"><span style="width:7px;height:7px;background:#22c55e;border-radius:50%;display:inline-block;animation:lb-pulse-dot 2s infinite;"></span> Online agora</div>
                </div>
                <div class="lb-chat-header-actions">
                    <button class="lb-header-btn" id="lb-restart-btn" title="Recomeçar">↩</button>
                    <button class="lb-header-btn" id="lb-close-btn" title="Fechar">✕</button>
                </div>
            </div>
            <div class="lb-chat-messages" id="lb-messages"></div>
            <div class="lb-suggestion-chips" id="lb-chips"></div>
            <div class="lb-input-area">
                <input type="text" class="lb-text-input" id="lb-text-input"
                    placeholder="Pergunte sobre preços, bairros, terrenos..." maxlength="300" autocomplete="off">
                <button class="lb-send-btn" id="lb-send-btn" aria-label="Enviar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                </button>
            </div>
            <div class="lb-chat-footer">Assistente virtual · Leandro Bomfim Imóveis · CRECI-RJ 97315</div>
        `;

        document.body.appendChild(btn);
        document.body.appendChild(win);

        btn.addEventListener('click', toggleChat);
        win.querySelector('#lb-close-btn').addEventListener('click', () => { isOpen = true; toggleChat(); });
        win.querySelector('#lb-restart-btn').addEventListener('click', restartChat);

        const inp = win.querySelector('#lb-text-input');
        win.querySelector('#lb-send-btn').addEventListener('click', handleTextInput);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') handleTextInput(); });

        // Atualiza badge de estoque no cabeçalho quando catálogo carrega
        const _updateEstoqueBadge = () => {
            const badge = document.getElementById('lb-estoque-badge');
            if (!badge || !_catalogoLoaded || !_catalogoImoveis.length) return;
            badge.textContent = `${_catalogoImoveis.length} disponíveis`;
            badge.style.display = '';
        };
        setInterval(_updateEstoqueBadge, 3000);
    }

    /* Chips rápidos dinâmicos */
    const BASE_CHIPS = [
        { label: '🏠 Comprar',         node: 'comprar'       },
        { label: '📋 Ver catálogo',    node: 'ver_catalogo'  },
        { label: '💰 Avaliar',          node: 'avaliar'       },
        { label: '💳 Financiamento',    node: 'financiamento' },
        { label: '📞 Contato',          node: 'contato'       },
    ];

    function renderChips() {
        const chips = document.getElementById('lb-chips');
        if (!chips) return;
        const dinamicos = [];
        if (_catalogoLoaded && _catalogoImoveis.length) {
            const terrenos = _getByTipo('Terreno');
            if (terrenos.length) dinamicos.push({ label: `🏗️ Terrenos (${terrenos.length})`, node: 'cat_terrenos' });
            const dest = _getDestaques();
            if (dest.length) dinamicos.push({ label: `⭐ Destaques (${dest.length})`, node: 'cat_destaques' });
        }
        const all = [...dinamicos, ...BASE_CHIPS].slice(0, 6);
        chips.innerHTML = all.map(c =>
            `<span class="lb-chip" data-node="${c.node}">${c.label}</span>`
        ).join('');
        chips.querySelectorAll('.lb-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                _logChat('chat_chip', { label: chip.textContent, node: chip.dataset.node, botResponse: 'navegando para ' + chip.dataset.node });
                goTo(chip.dataset.node);
            });
        });
    }

    /* Toggle */
    function toggleChat() {
        const btn = document.getElementById('lb-chat-btn');
        const win = document.getElementById('lb-chat-window');
        isOpen = !isOpen;
        btn.classList.toggle('open', isOpen);
        win.classList.toggle('open', isOpen);
        const dot = btn.querySelector('.lb-notif-dot');
        if (dot) dot.remove();
        if (isOpen && !hasGreeted) {
            hasGreeted = true;
            _logChat('chat_aberto', { page: window.location.pathname, ip: _clientIP || '—' });
            renderChips();
            setTimeout(() => goTo('inicio'), 300);
        }
        if (isOpen) {
            scrollToBottom();
            setTimeout(() => document.getElementById('lb-text-input')?.focus(), 400);
        }
    }

    function restartChat() {
        const msgs = document.getElementById('lb-messages');
        if (msgs) msgs.innerHTML = '';
        _chatPath  = [];
        _msgCount  = 0;
        _sessionId = null;
        _logChat('chat_aberto', { page: window.location.pathname, restarted: true, ip: _clientIP || '—' });
        renderChips();
        setTimeout(() => goTo('inicio'), 200);
    }

    /* Processar texto livre */
    function handleTextInput() {
        const inp = document.getElementById('lb-text-input');
        if (!inp) return;
        const text = inp.value.trim();
        if (!text) return;
        inp.value = '';
        _msgCount++;

        addUserMsg(text);

        const intent = detectIntent(text);
        const intentLabel = intent
            ? (intent.type === 'direct'
                ? ('direct:' + (intent.da.flow ? 'flow:' + intent.da.flow : (intent.da.answerFn ? 'answerFn' : 'answer')))
                : 'flow:' + intent.flow)
            : 'nenhuma';

        if (intent) {
            setTimeout(() => {
                if (intent.type === 'direct') {
                    const da = intent.da;
                    if (da.flow) {
                        _logChat('chat_texto', { text: text.slice(0, 200), intentDetected: intentLabel, botResponse: 'flow:' + da.flow });
                        goTo(da.flow);
                    } else if (da.answerFn) {
                        const result = da.answerFn();
                        _logChat('chat_texto', { text: text.slice(0, 200), intentDetected: intentLabel, botResponse: result.text.slice(0, 300) });
                        showTypingThen(() => {
                            addBotMsg(result.text);
                            if (result.opts && result.opts.length) setTimeout(() => addOpts(result.opts), 350);
                        });
                    } else {
                        _logChat('chat_texto', { text: text.slice(0, 200), intentDetected: intentLabel, botResponse: (da.answer || '').slice(0, 300) });
                        showTypingThen(() => {
                            addBotMsg(da.answer);
                            if (da.opts && da.opts.length) setTimeout(() => addOpts(da.opts), 350);
                        });
                    }
                } else {
                    _logChat('chat_texto', { text: text.slice(0, 200), intentDetected: intentLabel, botResponse: 'flow:' + intent.flow });
                    goTo(intent.flow);
                }
            }, 500);
        } else {
            _logChat('chat_texto', { text: text.slice(0, 200), intentDetected: 'nenhuma', botResponse: 'fallback_whatsapp' });
            setTimeout(() => {
                showTypingThen(() => {
                    addBotMsg(`Boa pergunta! 🤔 Deixa o **${KB.nome}** responder isso diretamente — ele conhece cada detalhe do mercado carioca.\n\nJá te conecto com ele!`);
                    setTimeout(() => addOpts([
                        { label: '📱 Perguntar no WhatsApp', action: () => window.open(KB.wa(`Olá Leandro! Tenho uma dúvida: "${text.slice(0, 150)}". Pode me ajudar?`), '_blank') },
                        { label: '🏠 Ver imóveis disponíveis', next: 'ver_catalogo' },
                        { label: '↩ Menu principal',            next: 'inicio'   },
                    ]), 400);
                });
            }, 500);
        }
    }

    /* Navegar para nó */
    function _resolveMsg(node) {
        const msg = node.msg;
        if (typeof msg === 'function') return msg();
        return msg;
    }
    function _resolveOpts(node) {
        const opts = node.opts;
        if (typeof opts === 'function') return opts();
        return opts || [];
    }

    function goTo(nodeKey, waMsg) {
        const msgs = document.getElementById('lb-messages');
        if (!msgs) return;
        _currentNode = nodeKey;
        _chatPath.push(nodeKey);
        msgs.querySelectorAll('.lb-opts').forEach(el => el.remove());

        if (nodeKey.startsWith('wa_') || nodeKey === 'ver_imoveis_wa') {
            const defaultMsg = 'Olá Leandro! Vim pelo site e gostaria de saber mais sobre os imóveis disponíveis.';
            const msg = waMsg || defaultMsg;
            window.open(KB.wa(msg), '_blank');
            _logChat('chat_whatsapp', { msg: msg.slice(0, 200), waText: msg.slice(0, 200), botResponse: 'redirecionado_whatsapp' });
            showTypingThen(() => {
                addBotMsg('✅ Te direcionei para o WhatsApp do **Leandro Bomfim**! Ele responde rapidinho. 😊\n\nPosso ajudar em mais alguma coisa?');
                setTimeout(() => addOpts([
                    { label: '🏠 Ver catálogo de imóveis', next: 'ver_catalogo' },
                    { label: '↩ Menu principal',            next: 'inicio'       },
                ]), 500);
            });
            return;
        }

        const node = FLOWS[nodeKey];
        if (!node) return;

        const resolvedMsg  = _resolveMsg(node);
        const resolvedOpts = _resolveOpts(node);

        if (nodeKey !== 'inicio') {
            _logChat('chat_nav', {
                node:    nodeKey,
                botMsg:  (resolvedMsg || '').slice(0, 300),
                botResponse: (resolvedMsg || '').slice(0, 300),
            });
        }

        showTypingThen(() => {
            if (resolvedMsg) addBotMsg(resolvedMsg);
            if (resolvedOpts.length) setTimeout(() => addOpts(resolvedOpts), 380);
        });
    }

    /* Typing */
    function showTypingThen(cb) {
        const msgs = document.getElementById('lb-messages');
        const typing = document.createElement('div');
        typing.className = 'lb-typing';
        typing.innerHTML = '<span></span><span></span><span></span>';
        msgs.appendChild(typing);
        scrollToBottom();
        setTimeout(() => { typing.remove(); cb(); scrollToBottom(); }, 780);
    }

    /* Hora legível */
    function _timeNow() {
        const d = new Date();
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

    function addBotMsg(text) {
        if (!text) return;
        const msgs = document.getElementById('lb-messages');
        const div = document.createElement('div');
        div.className = 'lb-msg bot';
        div.innerHTML = text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n• /g, '<br>• ')
            .replace(/\n/g, '<br>') +
            `<span class="lb-msg-time">${_timeNow()}</span>`;
        msgs.appendChild(div);
        scrollToBottom();
    }

    function addUserMsg(text) {
        const msgs = document.getElementById('lb-messages');
        const div = document.createElement('div');
        div.className = 'lb-msg user';
        div.innerHTML = `${text}<span class="lb-msg-time">${_timeNow()}</span>`;
        msgs.appendChild(div);
        scrollToBottom();
    }

    function addOpts(opts) {
        const msgs = document.getElementById('lb-messages');
        const wrap = document.createElement('div');
        wrap.className = 'lb-opts';
        opts.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'lb-opt-btn';
            btn.textContent = opt.label;
            btn.addEventListener('click', () => {
                wrap.remove();
                _logChat('chat_click', { label: opt.label, next: opt.next || 'action', botResponse: opt.next ? 'flow:' + opt.next : 'acao_externa' });
                if (opt.action) opt.action();
                else if (opt.next) goTo(opt.next, opt.waMsg || null);
            });
            wrap.appendChild(btn);
        });
        msgs.appendChild(wrap);
        scrollToBottom();
    }

    function scrollToBottom() {
        const msgs = document.getElementById('lb-messages');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }

    /* Init */
    function init() {
        if (document.getElementById('lb-chat-btn')) return;
        _fetchClientIP();
        _initCatalogoListener();
        createWidget();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
