// ============================================================
//  CHAT FLUTUANTE v8.0 — Leandro Bomfim Imóveis
//  NLP ultra-robusto: 1100+ padrões, fuzzy, sinonímia total
//  NOVO: Sistema de contexto de conversa inteligente
//  Atalhos APENAS na barra inferior (nunca dentro do chat)
//  Respostas corretas para qualquer variação de pergunta
//  sobre bairros, catálogo, imóveis, investimento, etc.
// ============================================================

(function () {
    'use strict';

    // Guard: nunca executar duas vezes na mesma página
    if (window._lbChatWidgetLoaded) return;
    window._lbChatWidgetLoaded = true;

    // ═══════════════════════════════════════════════════════
    //  NORMALIZAÇÃO — remove acentos, pontuação, espaços
    // ═══════════════════════════════════════════════════════
    function norm(str) {
        return (str || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[çÇ]/g, 'c')
            .replace(/[ñ]/g, 'n')
            .replace(/[^a-z0-9 ]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Expande abreviações e gírias antes de detectar intenção
    function expandAbbr(t) {
        const abbr = {
            ' vc ': ' voce ', ' vcs ': ' voces ', ' tb ': ' tambem ', ' tbm ': ' tambem ',
            ' eh ': ' e ', ' pq ': ' porque ', ' oq ': ' o que ', ' td ': ' tudo ',
            ' mto ': ' muito ', ' mt ': ' muito ', ' pfv ': ' por favor ', ' pf ': ' por favor ',
            ' obg ': ' obrigado ', ' vlw ': ' valeu ', ' flw ': ' falou ', ' blz ': ' beleza ',
            ' qto ': ' quanto ', ' qtos ': ' quantos ', ' apto ': ' apartamento ',
            ' ape ': ' apartamento ', ' cob ': ' cobertura ', ' fin ': ' financiamento ',
            ' financ ': ' financiamento ', ' kit ': ' kitnet ', ' lto ': ' lote ',
            ' garg ': ' garagem ', ' gareg ': ' garagem ', ' condo ': ' condominio ',
            ' cond ': ' condominio ', ' doc ': ' documentacao ', ' docu ': ' documentacao ',
        };
        let r = ' ' + t + ' ';
        for (const [k, v] of Object.entries(abbr)) r = r.split(k).join(v);
        return r.trim();
    }

    function normFull(str) {
        return expandAbbr(norm(str));
    }

    // Verifica se o texto normalizado contém a palavra (com tolerância a 1 erro)
    function fuzzyWord(text, word) {
        if (text.includes(word)) return true;
        if (word.length < 5) return false;
        // Remove um char de cada posição e testa
        for (let i = 0; i < word.length; i++) {
            const d = word.slice(0, i) + word.slice(i + 1);
            if (d.length >= 4 && text.includes(d)) return true;
        }
        return false;
    }

    // Verifica se QUALQUER padrão da lista está no texto
    function matchAny(text, patterns) {
        const t = normFull(text);
        return patterns.some(p => {
            const np = norm(p);
            return t.includes(np) || fuzzyWord(t, np);
        });
    }

    // Verifica se TODOS os padrões estão presentes
    function matchAll(text, patterns) {
        const t = normFull(text);
        return patterns.every(p => t.includes(norm(p)));
    }

    // ═══════════════════════════════════════════════════════
    //  BASE DE CONHECIMENTO
    // ═══════════════════════════════════════════════════════
    const KB = {
        nome:        'Leandro Bomfim',
        creci:       'CRECI-RJ 97315',
        tel:         '(21) 98142-4469',
        telNum:      '5521981424469',
        email:       'leandromorenno007@gmail.com',
        instagram:   '@leopbomfim',
        horario:     'Seg–Sex 8h–20h | Sáb 9h–18h | Dom sob agendamento',
        experiencia: '6+ anos',
        negociados:  '60+',
        whatsapp:    'https://wa.me/5521981424469',
        wa:          (txt) => `https://wa.me/5521981424469?text=${encodeURIComponent(txt || 'Olá Leandro!')}`,
        devTel:      '5521991549792',
        devTelFormat:'(21) 99154-9792',

        historia: {
            resumo: `Leandro Bomfim tem mais de 6 anos de experiência e mais de 60 negociações concluídas. É referência em alto padrão na Zona Sul e Barra da Tijuca.`,
            inicio: `Leandro começou no mercado imobiliário há mais de 6 anos. Seu atendimento personalizado e transparência construíram uma reputação sólida pelo boca a boca.`,
            especialidade: `Especialidade: alto padrão no Rio — Ipanema, Leblon, Copacabana, Botafogo, Barra da Tijuca e Recreio. Conhece cada rua, cada prédio e cada detalhe dessas regiões.`,
            diferenciais: `O Leandro acompanha o cliente desde a primeira conversa até a entrega das chaves — documentação, negociação, vistorias, financiamento e indicações de arquitetos.`,
            valores: `Transparência e honestidade são inegociáveis. Ele nunca recomenda um imóvel que não compraria para si. Se não for bom para você, ele vai te dizer.`,
            conquistas: `Mais de 60 negociações com 100% de satisfação. Vende em média 47% mais rápido que a média do mercado carioca.`,
        },

        bairros: {
            ipanema: {
                nome: 'Ipanema', emoji: '🌊',
                descricao: 'Um dos endereços mais desejados do mundo. Praia mundialmente famosa, gastronomia premiada, vida cultural intensa.',
                precos: { studio: '400–700k', um: '700k–1,3M', dois: '1M–2,5M', tres: '2M–6M', cobertura: '3M–15M+' },
                airbnb: 'Altíssima demanda. Retorno de 10–18% ao ano.',
                metro: 'Metrô General Osório.',
                lazer: 'Praia, Lagoa Rodrigo de Freitas, Parque da Tijuca.',
            },
            leblon: {
                nome: 'Leblon', emoji: '🏖️',
                descricao: 'O bairro mais valorizado do Brasil. Tranquilo, arborizado, seguro, perfil familiar de altíssimo padrão.',
                precos: { studio: '550–900k', um: '900k–1,8M', dois: '1,5M–3M', tres: '3M–7M', cobertura: '5M–25M+' },
                airbnb: 'Alta demanda. Retorno de 9–15% ao ano.',
                metro: 'Sem metrô — ônibus, táxi e bike.',
                lazer: 'Praia exclusiva, Baixo Leblon, restaurantes premiados.',
            },
            copacabana: {
                nome: 'Copacabana', emoji: '🏝️',
                descricao: 'Ícone mundial do Rio. 4km de orla, metrô na porta, altíssima demanda turística e de Airbnb.',
                precos: { studio: '250–500k', um: '400–800k', dois: '650k–1,3M', tres: '1M–2,5M', cobertura: '2M–8M' },
                airbnb: 'Demanda excepcional. Retorno de 12–20% ao ano. Melhor bairro para Airbnb no Rio.',
                metro: 'Metrô Cardeal Arcoverde e Siqueira Campos.',
                lazer: 'Orla famosa, Forte de Copacabana, Posto 5.',
            },
            botafogo: {
                nome: 'Botafogo', emoji: '🌿',
                descricao: 'Bairro charmoso em forte valorização. Vista incrível para o Pão de Açúcar, metrô na porta.',
                precos: { studio: '250–430k', um: '380–700k', dois: '600k–1,2M', tres: '950k–2M', cobertura: '1,5M–5M' },
                airbnb: 'Boa demanda. Retorno de 8–13% ao ano.',
                metro: 'Metrô Botafogo.',
                lazer: 'Orla da Baía, Cobal, Casa da Cultura, museus.',
            },
            flamengo: {
                nome: 'Flamengo', emoji: '🌅',
                descricao: 'Bairro histórico e nobre com orla da Baía de Guanabara e o maior parque urbano do mundo.',
                precos: { studio: '220–400k', um: '320–620k', dois: '500k–1M', tres: '800k–1,8M', cobertura: '1,5M–4M' },
                airbnb: 'Demanda moderada. Retorno de 7–11% ao ano.',
                metro: 'Metrô Largo do Machado e Flamengo.',
                lazer: 'Parque do Flamengo, MAM, orla da baía.',
            },
            barra: {
                nome: 'Barra da Tijuca', emoji: '🏙️',
                descricao: 'Bairro mais moderno do Rio. Grandes condomínios fechados, shoppings, hospitais de ponta e praia longa e limpa.',
                precos: { studio: '280–480k', um: '380–700k', dois: '550k–1,1M', tres: '900k–2M', cobertura: '1,5M–5M' },
                airbnb: 'Demanda boa no verão. Retorno de 7–12% ao ano.',
                metro: 'Sem metrô — BRT Transoeste.',
                lazer: 'Praia longa e limpa, Barra Shopping, parques.',
            },
            recreio: {
                nome: 'Recreio dos Bandeirantes', emoji: '🌴',
                descricao: 'O mais tranquilo da Zona Oeste. Natureza preservada, praia limpa e familiar, condomínios pet-friendly.',
                precos: { studio: '200–380k', um: '300–560k', dois: '450–850k', tres: '700k–1,5M', cobertura: '1,2M–3M' },
                airbnb: 'Boa demanda no verão. Retorno de 6–10% ao ano.',
                metro: 'Sem metrô — BRT Transoeste.',
                lazer: 'Praia do Recreio, Reserva de Marapendi, trilhas.',
            },
            barraOlimpica: {
                nome: 'Barra Olímpica', emoji: '🏗️',
                descricao: 'Bairro moderno construído para os Jogos de 2016. Infraestrutura nova e forte potencial de valorização.',
                precos: { studio: '200–380k', um: '280–520k', dois: '420–780k', tres: '650k–1,3M', cobertura: '1M–2,5M' },
                airbnb: 'Demanda crescente. Retorno de 6–9% ao ano.',
                metro: 'VLT Transbrasil (em expansão).',
                lazer: 'Parque Olímpico, Arena Carioca, Velódromo.',
            },
        },
    };

    // ═══════════════════════════════════════════════════════
    //  CATÁLOGO EM TEMPO REAL
    // ═══════════════════════════════════════════════════════
    let _catalogoImoveis  = [];
    let _catalogoListener = null;
    let _catalogoLoaded   = false;
    let _clientIP         = null;
    let _clientGeo        = {};

    function _fetchClientIP() {
        fetch('https://api.ipify.org?format=json')
            .then(r => r.json())
            .then(d => {
                _clientIP = d.ip || null;
                if (!_clientIP) return;
                return fetch(`https://ip-api.com/json/${_clientIP}?fields=status,city,regionName,country,isp,proxy`);
            })
            .then(r => r && r.json())
            .then(d => {
                if (d && d.status === 'success') {
                    _clientGeo = { cidade: d.city||'', regiao: d.regionName||'', pais: d.country||'', isp: d.isp||'', isProxy: d.proxy||false };
                }
            })
            .catch(() => {});
    }

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
                _updateEstoqueBadgeEl();
                renderChips();
            }, () => { _catalogoLoaded = true; });
        } catch (e) { _catalogoLoaded = true; }
    }

    function _getByBairro(bairro) {
        const b = norm(bairro);
        return _catalogoImoveis.filter(i => norm(i.bairro || '').includes(b));
    }
    function _getByTipo(tipo) {
        const t = norm(tipo);
        return _catalogoImoveis.filter(i => norm(i.tipo || '') === t);
    }
    function _getByQuartos(q) {
        return _catalogoImoveis.filter(i => {
            const n = parseInt(i.quartos || 0);
            return q === 4 ? n >= 4 : n === q;
        });
    }
    function _getDestaques() { return _catalogoImoveis.filter(i => i.destaque); }
    function _getBairrosDisponiveis() { return [...new Set(_catalogoImoveis.map(i => i.bairro).filter(Boolean))].sort(); }

    function _formatPreco(p) {
        const n = parseFloat(p || 0);
        if (n >= 1000000) return `R$ ${(n / 1000000).toFixed(1).replace('.', ',')}M`;
        if (n >= 1000)    return `R$ ${Math.round(n / 1000)}k`;
        return `R$ ${n.toLocaleString('pt-BR')}`;
    }
    function _renderCard(im) {
        const preco = im.precoModo === 'lancamento' ? '🚀 Lançamento' : _formatPreco(im.preco);
        let det;
        if (im.tipo === 'Terreno') {
            det = `${im.area}m²`;
        } else {
            const qtos   = im.quartos ? `${im.quartos} qto${im.quartos > 1 ? 's' : ''}` : null;
            const suites = im.suites  ? `${im.suites} suíte${im.suites > 1 ? 's' : ''}` : null;
            const area   = im.area    ? `${im.area}m²` : null;
            const partes = [qtos, suites, area].filter(Boolean);
            det = partes.join(' · ');
        }
        return `🏠 **${im.titulo}**\n📍 ${im.bairro} · ${det}\n💰 ${preco}`;
    }
    function _resumoEstoque() {
        if (!_catalogoLoaded || !_catalogoImoveis.length) return null;
        return { total: _catalogoImoveis.length, bairros: _getBairrosDisponiveis(), terrenos: _getByTipo('Terreno').length, dest: _getDestaques().length };
    }
    function _buildVerOpts(lista, waText) {
        return [
            ...(lista.length ? [{ label: '🏠 Ver todos no site', action: () => { window.location.href = 'imoveis.html'; } }] : []),
            { label: '📱 Falar com Leandro', action: () => window.open(KB.wa(waText), '_blank') },
            { label: '↩ Menu principal', next: 'inicio' },
        ];
    }
    function _updateEstoqueBadgeEl() {
        const el = document.getElementById('lb-estoque-badge');
        if (!el || !_catalogoLoaded || !_catalogoImoveis.length) return;
        el.textContent = `${_catalogoImoveis.length} disponíveis`;
        el.style.display = '';
    }

    // ═══════════════════════════════════════════════════════
    //  EXTRATORES DE ENTIDADES
    // ═══════════════════════════════════════════════════════
    function _extractPreco(text) {
        const t = normFull(text);
        let val = null;
        const mM = t.match(/(\d+[.,]?\d*)\s*(milhao|milhoes|m\b)/);
        if (mM) val = parseFloat(mM[1].replace(',', '.')) * 1000000;
        const mK = t.match(/(\d+[.,]?\d*)\s*(mil|k\b)/);
        if (!val && mK) val = parseFloat(mK[1].replace(',', '.')) * 1000;
        const mD = t.match(/\b(\d{4,})\b/);
        if (!val && mD) val = parseInt(mD[1]);
        return val;
    }

    const BAIRRO_ALIASES = {
        'ipanema':                  'Ipanema',
        'leblon':                   'Leblon',
        'copacabana':               'Copacabana',
        'copa':                     'Copacabana',
        'botafogo':                 'Botafogo',
        'flamengo':                 'Flamengo',
        'barra olimpica':           'Barra Olímpica',
        'olimpica':                 'Barra Olímpica',
        'barra da tijuca':          'Barra da Tijuca',
        'barra':                    'Barra da Tijuca',
        'tijuca':                   'Barra da Tijuca',
        'recreio':                  'Recreio dos Bandeirantes',
        'recreio dos bandeirantes': 'Recreio dos Bandeirantes',
        'bandeirantes':             'Recreio dos Bandeirantes',
        'jacarepagua':              'Jacarepaguá',
        'vargem grande':            'Vargem Grande',
        'vargem pequena':           'Vargem Pequena',
        'guaratiba':                'Pedra de Guaratiba',
        'grumari':                  'Grumari',
    };

    function _extractBairro(text) {
        const t = normFull(text);
        const entries = Object.entries(BAIRRO_ALIASES).sort((a, b) => b[0].length - a[0].length);
        for (const [alias, canonical] of entries) {
            if (t.includes(norm(alias))) return canonical;
        }
        return null;
    }

    function _extractTipo(text) {
        const t = normFull(text);
        if (t.includes('terreno') || t.includes('lote')) return 'Terreno';
        if (t.includes('cobertura') || t.includes('penthouse')) return 'Cobertura';
        if (t.includes('casa') && !t.includes('casamento')) return 'Casa';
        if (t.includes('studio') || t.includes('kitnet') || t.includes('kitnete')) return 'Apartamento';
        if (t.includes('comercial') || t.includes('loja') || t.includes('sala comercial')) return 'Comercial';
        if (t.includes('apartamento') || t.includes('apto') || t.includes('aparto')) return 'Apartamento';
        return null;
    }

    function _extractQuartos(text) {
        const t = normFull(text);
        if (/\b(4|quatro)\b/.test(t) && t.includes('quarto')) return 4;
        if (/\b(3|tres)\b/.test(t) && t.includes('quarto')) return 3;
        if (/\b(2|dois|duas)\b/.test(t) && t.includes('quarto')) return 2;
        if (/\b(1|um|uma)\b/.test(t) && t.includes('quarto')) return 1;
        return null;
    }

    function _extractSuites(text) {
        const t = normFull(text);
        if (!t.includes('suite') && !t.includes('suites')) return null;
        if (/\b(4|quatro)\b/.test(t)) return 4;
        if (/\b(3|tres)\b/.test(t))   return 3;
        if (/\b(2|dois|duas)\b/.test(t)) return 2;
        if (/\b(1|um|uma)\b/.test(t))  return 1;
        return 1; // pediu suíte mas sem número → assume pelo menos 1
    }

    function _getBySuites(q) {
        return _catalogoImoveis.filter(i => {
            const n = parseInt(i.suites || 0);
            if (!n) return false; // sem dado de suítes → exclui
            return q >= 4 ? n >= 4 : n === q;
        });
    }

    // ═══════════════════════════════════════════════════════
    //  DETECÇÃO DE INTENÇÃO — ULTRA-ROBUSTO v2
    //  1100+ padrões com contexto de conversa
    // ═══════════════════════════════════════════════════════
    function detectIntent(rawText) {
        const t = normFull(rawText);
        const raw = norm(rawText);

        // ── NOME DO USUÁRIO ──
        const nameMatch = t.match(/(?:meu nome e|me chamo|sou o|sou a|pode me chamar de)\s+([a-z]{2,})/);
        if (nameMatch) _ctx.userName = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);

        // ── DESENVOLVEDOR ──
        if (matchAny(t, [
            'quem criou o site','quem fez o site','quem desenvolveu','quem programou',
            'quem construiu o site','quem e o dev','quem e o programador','quem fez esse chat',
            'quem fez esse assistente','quem criou voce','quem te criou','quem te fez',
            'quem te programou','quem te desenvolveu','desenvolvedor','programador do site','qm te fez',
            'quem codou','quem desenhou o site','quem projetou','creditos do site',
        ])) return { intent: 'DESENVOLVEDOR' };

        // ── SAUDAÇÕES ──
        if (matchAny(t, [
            'oi ','ola ','bom dia','boa tarde','boa noite','tudo bem','tudo bom',
            'hey ','ei ','hello','salve','eae','e ai','opa ','oie ','como vai',
            'como voce esta','como vc ta','ta bom','tudo certo','beleza','fala ai',
            'boa','fala comigo','to aqui','iae','yo ','hi ','whats up',
        ]) || raw === 'oi' || raw === 'ola' || raw === 'hey' || raw === 'opa' || raw === 'boa' || raw === 'eae') return { intent: 'SAUDACAO' };

        // ── AGRADECIMENTO ──
        if (matchAny(t, [
            'obrigado','obrigada','valeu','muito obrigado','agradeco','agradecida',
            'thanks','grato','grata','otimo ajuda','voce me ajudou','resolveu','me ajudou','vlw','VLW','tmj','obgd','obgdo','obgda',
            'show','perfeito','top','massa','demais','excelente','maravilha','arrasou','mandou bem',
        ])) return { intent: 'OBRIGADO' };

        // ── DESPEDIDA ──
        if (matchAny(t, [
            'tchau','ate logo','ate mais','adeus','bye ','encerrar','vou sair','vou indo',
            'falou','ate proxima','boa noite bom descanso','fui','xau','abraco','ate breve',
            'vou nessa','vou saindo',
        ])) return { intent: 'DESPEDIDA' };

        // ── CONTEXTUAL: "tem mais?", "e de X quartos?" ──
        if (_ctx.lastIntent && matchAny(t, [
            'tem mais','mais opcoes','mais opcao','outras opcoes','outra opcao',
            'mais algum','tem outro','tem outros','tem outra','algo diferente',
            'nao gostei','nao curti','quero ver mais','me mostra mais','pode mostrar mais',
        ])) {
            // Re-use last search context for "more"
            if (_ctx.lastBairro || _ctx.lastTipo) {
                return { intent: 'BUSCA_ESPECIFICA', bairro: _ctx.lastBairro, tipo: _ctx.lastTipo, preco: _ctx.lastPreco, quartos: _ctx.lastQuartos, suites: _ctx.lastSuites, _moreResults: true };
            }
            return { intent: 'CATALOGO_GERAL' };
        }

        // ── CONTEXTUAL: preço/custo referenciando último bairro ──
        if (_ctx.lastBairroKey && matchAny(t, [
            'quanto custa','qual o preco','qual o valor','quanto e','quanto fica',
            'preco medio','valor medio','faixa de preco','quanto sai','custa quanto',
            'e caro','e barato','qual valor',
        ]) && !_extractBairro(t)) {
            return { intent: 'INFO_BAIRRO', bairro: _ctx.lastBairroKey };
        }

        // ── CONTEXTUAL: "e lá?", "nesse bairro?" ──
        const ctxBairro = _resolveContextual(rawText);
        if (ctxBairro && !_extractBairro(t)) {
            // Try to understand what they want about the contextual bairro
            if (matchAny(t, ['seguro','seguranca','violencia','perigo','perigoso'])) return { intent: 'SEGURANCA_RIO' };
            if (matchAny(t, ['tem imovel','tem algo','disponivel','imovel'])) {
                return { intent: 'BUSCA_ESPECIFICA', bairro: ctxBairro, tipo: _ctx.lastTipo, preco: _ctx.lastPreco, quartos: _ctx.lastQuartos };
            }
            const bKey = Object.entries(KB.bairros).find(([, v]) => v.nome === ctxBairro)?.[0];
            if (bKey) return { intent: 'INFO_BAIRRO', bairro: bKey };
        }

        // ── CONTEXTUAL: "e de 3 quartos?" (mantém bairro) ──
        if (_ctx.lastBairro && _extractQuartos(t) && !_extractBairro(t) && matchAny(t, ['e de','tem de','tem com','e com','quero de','quero com'])) {
            return { intent: 'BUSCA_ESPECIFICA', bairro: _ctx.lastBairro, tipo: _ctx.lastTipo, quartos: _extractQuartos(t), preco: _ctx.lastPreco };
        }

        // ── FRUSTRAÇÃO / NÃO ENTENDEU ──
        if (matchAny(t, [
            'nao entendi','nao era isso','errado','voce nao entendeu','ta errado',
            'nao foi isso que perguntei','resposta errada','nao e isso',
            'estou confuso','confusa','perdido','perdida','me ajuda direito',
        ])) return { intent: 'FRUSTRADO' };

        // ── COMO FUNCIONA O SITE ──
        if (matchAny(t, [
            'como funciona o site','como uso o site','como filtrar','como buscar',
            'como faço para ver','onde vejo','onde encontro','como achar imovel',
            'tutorial','me ensina','como navegar','onde clico',
        ])) return { intent: 'COMO_FUNCIONA_SITE' };

        // ── VISITA / AGENDAMENTO ──
        if (matchAny(t, [
            'agendar visita','visitar','quero visitar','posso visitar','quando posso ver',
            'agendar','marcar visita','quero conhecer','quero ir ver','ir pessoalmente',
            'posso ir ver','quando posso ir','agenda','marcamos',
        ])) return { intent: 'AGENDAR_VISITA' };

        // ── URGÊNCIA ──
        if (matchAny(t, [
            'urgente','preciso urgente','urgencia','rapido','o mais rapido','preciso logo',
            'immediate','imediato','nao posso esperar','para ontem',
        ])) return { intent: 'URGENTE' };

        // ── CONDOMÍNIO ──
        if (matchAny(t, [
            'condominio','taxa de condominio','quanto e o condominio','cond alto',
            'valor do condominio','condominio caro','condominio barato','condominio incluso',
            'taxa condominal','paga condominio',
        ])) return { intent: 'CONDOMINIO' };

        // ── REFORMA / ESTADO ──
        if (matchAny(t, [
            'reformado','precisa de reforma','estado do imovel','conservacao',
            'novo ou usado','imovel novo','imovel usado','reforma','reformar',
            'precisa reformar','bem conservado','renovado',
        ])) return { intent: 'REFORMA' };

        // ── VIZINHANÇA / ENTORNO ──
        if (matchAny(t, [
            'vizinhanca','como e a vizinhanca','tem escola','escola perto','escola proxima',
            'tem hospital','hospital perto','mercado perto','supermercado perto',
            'farmacia perto','padaria','comercio perto','infraestrutura','servicos',
            'tem shopping','shopping perto',
        ])) return { intent: 'VIZINHANCA' };

        // ── COMPARAÇÃO ENTRE BAIRROS ──
        if (matchAny(t, [
            'diferenca entre','qual a diferenca','comparar','comparacao','versus',
            'o que e melhor','qual e melhor','ou','melhor x ou y',
        ]) && (t.match(/\b(ipanema|leblon|copa|barra|recreio|botafogo|flamengo).*\b(ipanema|leblon|copa|barra|recreio|botafogo|flamengo)/i))) {
            return { intent: 'COMPARAR_BAIRROS' };
        }

        // ── CATÁLOGO GERAL — "qual o bairro", "quais imóveis", "o que tem disponível" ──
        // Esta seção cobre explicitamente as perguntas da imagem
        if (matchAny(t, [
            // Perguntas sobre QUAL bairro / QUAIS bairros
            'qual o bairro','qual bairro','quais bairros','em que bairro',
            'que bairros tem','bairros disponiveis','bairros tem','bairros voce tem',
            'bairros atende','quais regioes','regioes disponiveis','onde tem imovel',
            'em quais bairros','em que bairros','quais locais','que locais',
            // Perguntas sobre o que está disponível
            'o que tem disponivel','o que esta disponivel','o que voce tem','o que tem a venda',
            'imoveis disponiveis','imoveis a venda','imoveis disponivel','tem imovel disponivel',
            'tem algo disponivel','tem algum imovel','que imoveis tem','quais imoveis tem',
            'quantos imoveis','quantos tem disponivel','estoque','catalogo','ver catalogo',
            'ver imoveis','me mostra','me mostre','me manda','lista de imoveis',
            'lista de bairros','lista dos imoveis','lista dos bairros',
            'quais sao os imoveis','quais sao os bairros','que imoveis voce tem',
            'quais imoveis voce tem','quais imoveis tem','que bairros voce atende',
            'que bairros atende','voce atende quais bairros','atende quais regioes',
            // Variações com "disponível para venda"
            'disponivel para venda','disponivel a venda','para venda','a venda agora',
            'o que tem para vender','o que esta a venda','tem para venda',
            // Variações com "mostrar" / "exibir" / "listar"
            'mostra os imoveis','mostra os bairros','exibe os imoveis','lista os imoveis',
            'quero ver os imoveis','quero ver o catalogo','pode me mostrar',
        ])) return { intent: 'CATALOGO_GERAL' };

        // ── TERRENOS ──
        if (matchAny(t, [
            'tem terreno','tem algum terreno','terreno disponivel','terrenos disponiveis',
            'quero terreno','quero lote','busco terreno','procuro terreno',
            'interesse em terreno','tem lote','lote disponivel',
        ])) return { intent: 'CAT_TERRENOS' };

        // ── COBERTURAS ──
        if (matchAny(t, [
            'tem cobertura','coberturas disponiveis','quero cobertura','penthouse',
            'busco cobertura','procuro cobertura','interesse em cobertura',
        ])) return { intent: 'CAT_COBERTURAS' };

        // ── DESTAQUES ──
        if (matchAny(t, [
            'destaque','destaques','mais vendido','recomendado','o melhor','me indica um',
            'qual voce recomenda','qual voce indica','melhor opcao','imovel top','mais popular',
        ])) return { intent: 'DESTAQUES' };

        // ── MAIS BARATO ──
        if (matchAny(t, [
            'mais barato','menor preco','mais acessivel','mais em conta','mais economico',
            'opcao mais barata','menor valor','tem algo barato','menor custo',
        ])) return { intent: 'MAIS_BARATO' };

        // ── MAIS CARO ──
        if (matchAny(t, [
            'mais caro','maior preco','mais nobre','mais exclusivo','luxo','alto padrao',
            'imovel de luxo','imovel exclusivo','premium',
        ])) return { intent: 'MAIS_CARO' };

        // ── QUARTOS ──
        if (matchAny(t, ['1 quarto','um quarto','1 dormitorio','1qto'])) return { intent: 'QUARTOS_1' };
        if (matchAny(t, ['2 quartos','dois quartos','2 dormitorios','2qto'])) return { intent: 'QUARTOS_2' };
        if (matchAny(t, ['3 quartos','tres quartos','3 dormitorios','3qto'])) return { intent: 'QUARTOS_3' };
        if (matchAny(t, ['4 quartos','quatro quartos','4 dormitorios','4qto','4 ou mais'])) return { intent: 'QUARTOS_4' };

        // ── SUÍTES ──
        if (matchAny(t, ['1 suite','uma suite','suite','tem suite','com suite','quero suite','suite master','suite casal'])) return { intent: 'SUITES_1' };
        if (matchAny(t, ['2 suites','duas suites','dois suites'])) return { intent: 'SUITES_2' };
        if (matchAny(t, ['3 suites','tres suites'])) return { intent: 'SUITES_3' };
        if (matchAny(t, ['4 suites','quatro suites','4 ou mais suites'])) return { intent: 'SUITES_4' };

        // ── INFO BAIRROS ESPECÍFICOS ──
        if (matchAny(t, ['sobre ipanema','em ipanema','imoveis ipanema','apartamento ipanema','ipanema como e','ipanema bairro','quero ipanema'])) return { intent: 'INFO_BAIRRO', bairro: 'ipanema' };
        if (matchAny(t, ['sobre leblon','em leblon','imoveis leblon','apartamento leblon','leblon como e','quero leblon'])) return { intent: 'INFO_BAIRRO', bairro: 'leblon' };
        if (matchAny(t, ['sobre copacabana','em copacabana','imoveis copacabana','copa como e','quero copacabana'])) return { intent: 'INFO_BAIRRO', bairro: 'copacabana' };
        if (matchAny(t, ['sobre botafogo','em botafogo','imoveis botafogo','botafogo como e','quero botafogo'])) return { intent: 'INFO_BAIRRO', bairro: 'botafogo' };
        if (matchAny(t, ['sobre flamengo','em flamengo','imoveis flamengo','flamengo como e','quero flamengo'])) return { intent: 'INFO_BAIRRO', bairro: 'flamengo' };
        if (matchAny(t, ['sobre barra olimpica','em barra olimpica','barra olimpica como e','quero barra olimpica'])) return { intent: 'INFO_BAIRRO', bairro: 'barraOlimpica' };
        if (matchAny(t, ['sobre recreio','em recreio','imoveis recreio','recreio como e','quero recreio','recreio dos bandeirantes'])) return { intent: 'INFO_BAIRRO', bairro: 'recreio' };
        if (matchAny(t, ['sobre barra da tijuca','em barra da tijuca','barra tijuca como e','quero barra da tijuca','sobre barra','em barra'])) return { intent: 'INFO_BAIRRO', bairro: 'barra' };

        // ── LEANDRO — PESSOA ──
        if (matchAny(t, [
            'quem e o leandro','quem e leandro','sobre o leandro','trajetoria do leandro',
            'como o leandro comecou','background','perfil do leandro','quem atende',
            'quem e o corretor','apresente se','se apresente','historia do leandro',
            'historia de leandro','quem e voce',
        ])) return { intent: 'LEANDRO_HISTORIA' };

        if (matchAny(t, [
            'experiencia','quantos anos de experiencia','tempo de mercado','ha quanto tempo atua',
            'anos de corretor','tempo de experiencia',
        ])) return { intent: 'LEANDRO_EXPERIENCIA' };

        if (matchAny(t, [
            'diferenciais','diferencial','por que contratar','por que leandro','por que escolher',
            'o que faz diferente','vantagem de trabalhar com voce',
        ])) return { intent: 'LEANDRO_DIFERENCIAL' };

        if (matchAny(t, [
            'depoimento','testemunho','avaliacao de clientes','o que clientes falam',
            'recomendacoes','feedback','o que dizem','opinion',
        ])) return { intent: 'DEPOIMENTOS' };

        if (matchAny(t, [
            'conquistas','resultados','quantos vendeu','quantas vendas','historico de vendas',
            'quantos negocios','negocios fechados',
        ])) return { intent: 'LEANDRO_CONQUISTAS' };

        if (matchAny(t, [
            'creci','registro','habilitado','credencial','registrado','certificado',
            'e registrado','tem registro',
        ])) return { intent: 'LEANDRO_CRECI' };

        // ── CONTATO ──
        if (matchAny(t, [
            'numero','telefone','fone','celular','ligar','como ligo','numero do leandro',
            'qual o numero','me da o numero','numero de contato',
        ])) return { intent: 'CONTATO_TEL' };

        if (matchAny(t, ['email','e-mail','correio eletronico','mandar email','qual o email'])) return { intent: 'CONTATO_EMAIL' };

        if (matchAny(t, [
            'instagram','insta','rede social','redes sociais','arroba','perfil leandro',
        ])) return { intent: 'CONTATO_INSTAGRAM' };

        if (matchAny(t, [
            'horario','hora de atendimento','quando atende','funcionamento','quando funciona',
            'disponivel quando','qual horario',
        ])) return { intent: 'CONTATO_HORARIO' };

        if (matchAny(t, [
            'falar com leandro','entrar em contato','contato','whatsapp','falar agora',
            'quero falar','preciso falar','me conecta','falar pelo whatsapp',
        ])) return { intent: 'CONTATO_GERAL' };

        // ── FINANCIAMENTO ──
        if (matchAny(t, [
            'financiamento','financiar','parcela','prestacao','credito imobiliario',
            'posso financiar','consigo financiar','tem financiamento','aceita financiamento',
        ])) return { intent: 'FINANCIAMENTO' };

        if (matchAny(t, ['fgts','fundo garantia','usar fgts','posso usar fgts'])) return { intent: 'FGTS' };

        if (matchAny(t, [
            'entrada','valor de entrada','quanto de entrada','entrada minima',
            'qual a entrada','valor entrada',
        ])) return { intent: 'ENTRADA' };

        if (matchAny(t, [
            'aprovado','aprovacao','sera aprovado','score','cpf sujo','cpf negativado',
        ])) return { intent: 'APROVACAO' };

        if (matchAny(t, [
            'taxa de juros','taxa juros','juros financiamento','qual a taxa','taxa anual',
        ])) return { intent: 'JUROS' };

        if (matchAny(t, [
            'minha casa minha vida','mcmv','casa verde','programa habitacional','subsidio',
        ])) return { intent: 'MCMV' };

        // ── PROCESSO DE COMPRA ──
        if (matchAny(t, [
            'como comprar','processo de compra','passo a passo','etapas compra',
            'por onde comecar','como funciona a compra','como faco para comprar',
        ])) return { intent: 'COMO_COMPRAR' };

        if (matchAny(t, [
            'documentos','documentacao','escritura','cartorio','matricula','papelada',
            'que documentos','quais documentos',
        ])) return { intent: 'DOCUMENTACAO' };

        if (matchAny(t, [
            'custo','custos','itbi','taxa compra','gasto compra','o que precisa pagar',
            'gastos adicionais','taxas de cartorio','taxas extras','custo total',
        ])) return { intent: 'CUSTOS_EXTRAS' };

        if (matchAny(t, [
            'seguranca','garantia','golpe','fraude','confiar','risco','protecao',
            'e seguro comprar','como me protejo',
        ])) return { intent: 'SEGURANCA_COMPRA' };

        if (matchAny(t, [
            'vender','venda','quero vender','vendo imovel','anunciar','avaliar meu imovel',
            'tenho imovel para vender','colocar a venda','quero anunciar',
        ])) return { intent: 'VENDER' };

        if (matchAny(t, [
            'avaliacao gratuita','avaliar','quanto vale meu imovel','valor do meu imovel',
            'quanto vale','me avalia','faz uma avaliacao',
        ])) return { intent: 'AVALIACAO' };

        if (matchAny(t, [
            'comissao','corretagem','honorario','quanto cobra','taxa corretor',
            'quanto voce cobra','valor da corretagem',
        ])) return { intent: 'COMISSAO' };

        // ── INVESTIMENTO ──
        if (matchAny(t, [
            'investir','investimento','retorno','rendimento','renda','vale a pena comprar',
            'rentabilidade','bom investimento','para investir','melhor investimento',
        ])) return { intent: 'INVESTIMENTO' };

        if (matchAny(t, [
            'airbnb','temporada','aluguel temporada','alugar para temporada',
            'renda airbnb','lucro airbnb','short stay',
        ])) return { intent: 'AIRBNB' };

        if (matchAny(t, [
            'aluguel','alugar','renda aluguel','rendimento aluguel',
            'quanto rende aluguel','locacao',
        ])) return { intent: 'ALUGUEL' };

        if (matchAny(t, [
            'valorizacao','melhor bairro investir','onde investir','bairro que mais valoriza',
            'bairro valorizado','qual bairro esta valorizando',
        ])) return { intent: 'VALORIZACAO' };

        if (matchAny(t, [
            'mercado imobiliario','mercado rio','como esta o mercado','situacao do mercado',
            'mercado aquecido','mercado em alta',
        ])) return { intent: 'MERCADO_GERAL' };

        if (matchAny(t, [
            'melhor momento comprar','quando comprar','e bom comprar agora',
            'vale a pena agora','devo comprar agora','hora certa para comprar',
        ])) return { intent: 'MELHOR_MOMENTO' };

        if (matchAny(t, [
            'comprar ou alugar','vale comprar','melhor comprar ou alugar',
            'devo comprar ou alugar',
        ])) return { intent: 'COMPRAR_VS_ALUGAR' };

        // ── CARACTERÍSTICAS ESPECÍFICAS ──
        if (matchAny(t, ['pet','cachorro','gato','animal','pet friendly','aceita animal'])) return { intent: 'PET_FRIENDLY' };
        if (matchAny(t, ['studio','kitnet','kitnete','compacto'])) return { intent: 'STUDIOS' };
        if (matchAny(t, ['lancamento','planta','em construcao','imovel novo','pre lancamento'])) return { intent: 'LANCAMENTO' };
        if (matchAny(t, ['vista mar','vista para o mar','vista para a praia','vista pro mar'])) return { intent: 'VISTA_MAR' };
        if (matchAny(t, ['cobertura com piscina','piscina privativa','terraço com piscina'])) return { intent: 'COBERTURA_PISCINA' };
        if (matchAny(t, ['home office','escritorio em casa','trabalho remoto','trabalho em casa'])) return { intent: 'HOME_OFFICE' };
        if (matchAny(t, ['vaga de garagem','vaga garagem','estacionamento','garagem','tem vaga','com vaga'])) return { intent: 'GARAGEM' };
        if (matchAny(t, ['metro','metro perto','proximo ao metro','acesso metro','perto do metro'])) return { intent: 'METRO' };
        if (matchAny(t, ['perto da praia','pe na areia','beira mar','perto do mar','praia perto'])) return { intent: 'PERTO_PRAIA' };
        if (matchAny(t, ['familia','crianca','filhos','bom para familia'])) return { intent: 'FAMILIA' };
        if (matchAny(t, ['silencioso','tranquilo','sossegado','menos movimentado','sem barulho'])) return { intent: 'TRANQUILO' };

        // ── REGIÕES ──
        if (matchAny(t, ['zona sul','zona-sul','bairros da zona sul'])) return { intent: 'REGIAO_ZONA_SUL' };
        if (matchAny(t, ['zona oeste','barra recreio','regiao oeste','regiao da barra'])) return { intent: 'REGIAO_ZONA_OESTE' };
        if (matchAny(t, ['melhor bairro','qual bairro','me indica um bairro','qual o melhor lugar','em que bairro devo comprar'])) return { intent: 'MELHOR_BAIRRO' };

        // ── PERGUNTAS GERAIS SOBRE O RIO ──
        if (matchAny(t, ['clima rio','tempo rio','faz calor','temperatura rio','como e o clima'])) return { intent: 'CLIMA_RIO' };
        if (matchAny(t, ['seguranca rio','rio e seguro','violencia rio','e seguro morar'])) return { intent: 'SEGURANCA_RIO' };
        if (matchAny(t, ['custo de vida rio','cara morar rio','quanto custa morar'])) return { intent: 'CUSTO_VIDA_RIO' };
        if (matchAny(t, ['turismo rio','pontos turisticos','o que visitar','cristo redentor','pao de acucar'])) return { intent: 'TURISMO_RIO' };
        if (matchAny(t, ['transporte rio','onibus rio','metro rio','brt','transporte publico'])) return { intent: 'TRANSPORTE_RIO' };
        if (matchAny(t, ['restaurante','gastronomia','comer rio','onde comer'])) return { intent: 'GASTRONOMIA_RIO' };
        if (matchAny(t, ['praia rio','melhores praias','praia mais bonita','qual praia'])) return { intent: 'PRAIAS_RIO' };
        if (matchAny(t, ['estrangeiro','morar no brasil','gringo','vim de outro pais','imigrante','expat'])) return { intent: 'ESTRANGEIRO' };
        if (matchAny(t, ['quanto tempo demora','prazo','tempo para comprar','quanto tempo leva'])) return { intent: 'PRAZO_COMPRA' };
        if (matchAny(t, ['imposto','ir imovel','declarar imovel','ganho de capital'])) return { intent: 'IMPOSTOS' };

        // ── DICAS ──
        if (matchAny(t, ['dica','dicas','conselho','como negociar','negociar','desconto','como conseguir desconto'])) return { intent: 'DICAS_NEGOCIACAO' };
        if (matchAny(t, ['primeiro imovel','nunca comprei','iniciante em imovel','comprando pela primeira vez'])) return { intent: 'PRIMEIRO_IMOVEL' };

        // ── BUSCA COMPOSTA — bairro + tipo + preço + quartos ──
        const bairroFound  = _extractBairro(t);
        const tipoFound    = _extractTipo(t);
        const precoFound   = _extractPreco(t);
        const quartosFound = _extractQuartos(t);
        const suitesFound  = _extractSuites(t);

        const temBuscaSignal = matchAny(t, [
            'tem','quero','busco','procuro','existe','disponivel','encontrar','achar',
            'mostrar','quais','gostaria','interesse','ver','lista','procurando',
            'estou procurando','estou buscando','estou querendo',
        ]);

        if ((bairroFound || tipoFound || precoFound || quartosFound || suitesFound) && (temBuscaSignal || bairroFound)) {
            return { intent: 'BUSCA_ESPECIFICA', bairro: bairroFound, tipo: tipoFound, preco: precoFound, quartos: quartosFound, suites: suitesFound };
        }

        // Bairro puro mencionado (sem verbo de busca mas com info suficiente)
        if (bairroFound && raw.length > 3) {
            const bKey = Object.entries(KB.bairros).find(([, v]) => v.nome === bairroFound)?.[0];
            if (bKey) return { intent: 'INFO_BAIRRO', bairro: bKey };
        }

        if (tipoFound) return { intent: 'TIPO_GENERICO', tipo: tipoFound };

        return null;
    }

    // ═══════════════════════════════════════════════════════
    //  GERADOR DE RESPOSTAS
    // ═══════════════════════════════════════════════════════
    function gerarResposta(intentObj) {
        if (!intentObj) return null;
        _updateCtx(intentObj);
        const { intent, bairro, tipo, preco, quartos } = intentObj;
        const greeting = _ctx.userName ? ` ${_ctx.userName}` : '';

        // === BUSCA ESPECÍFICA COMPOSTA ===
        if (intent === 'BUSCA_ESPECIFICA') {
            let lista = [..._catalogoImoveis];
            if (bairro)  lista = lista.filter(i => norm(i.bairro || '').includes(norm(bairro)));
            if (tipo)    lista = lista.filter(i => norm(i.tipo || '') === norm(tipo));
            if (preco)   lista = lista.filter(i => parseFloat(i.preco || 0) <= preco);
            if (quartos) lista = lista.filter(i => quartos === 4 ? parseInt(i.quartos || 0) >= 4 : parseInt(i.quartos || 0) === quartos);
            if (intentObj.suites) lista = lista.filter(i => {
                const n = parseInt(i.suites || 0);
                return intentObj.suites >= 4 ? n >= 4 : n === intentObj.suites;
            });

            if (!_catalogoLoaded) return {
                text: '📊 Carregando catálogo em tempo real... Um momento!',
                opts: [{ label: '🏠 Ver no site', action: () => { window.location.href = 'imoveis.html'; } }],
            };

            const filtros = [
                bairro,
                tipo,
                preco ? `até ${_formatPreco(preco)}` : null,
                quartos ? `${quartos}+ quartos` : null,
                intentObj.suites ? `${intentObj.suites}+ suíte${intentObj.suites > 1 ? 's' : ''}` : null,
            ].filter(Boolean).join(', ');

            if (!lista.length) return {
                text: `🔍 Não encontrei imóveis com **${filtros}** agora.\n\nMas o **Leandro** tem acesso a imóveis **exclusivos não anunciados** — vale perguntar!`,
                opts: [
                    { label: '📱 Consultar Leandro', action: () => window.open(KB.wa(`Olá Leandro! Procuro imóvel${tipo ? ' tipo ' + tipo : ''}${bairro ? ' em ' + bairro : ''}${preco ? ' até ' + _formatPreco(preco) : ''}. Pode me ajudar?`), '_blank') },
                    { label: '🏠 Ver catálogo completo', action: () => { window.location.href = 'imoveis.html'; } },
                    { label: '↩ Menu', next: 'inicio' },
                ],
            };

            const preview = lista.slice(0, 3).map(_renderCard).join('\n\n');
            return {
                text: `🔍 **${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} encontrado${lista.length !== 1 ? 's' : ''}** (${filtros}):\n\n${preview}${lista.length > 3 ? `\n\n_...e mais ${lista.length - 3}_` : ''}`,
                opts: _buildVerOpts(lista, `Olá Leandro! Vi imóveis com: ${filtros}. Pode me ajudar?`),
            };
        }

        switch (intent) {

            // ── DESENVOLVEDOR ──
            case 'DESENVOLVEDOR':
                return {
                    text: `🖥️ **Desenvolvedor do site**\n\nEste site foi criado por um desenvolvedor talentoso. Para saber mais:\n\n📱 **${KB.devTelFormat}** (WhatsApp)`,
                    opts: [
                        { label: '📱 Falar com o desenvolvedor', action: () => window.open(`https://wa.me/${KB.devTel}?text=Ol%C3%A1%21+Vi+o+site+do+Leandro+Bomfim+e+gostaria+de+conhecer+seu+trabalho.`, '_blank') },
                        { label: '↩ Menu', next: 'inicio' },
                    ],
                };

            // ── CUMPRIMENTOS → menu ──
            case 'SAUDACAO': {
                if (_ctx.msgCount > 3) {
                    return {
                        text: `Ei${greeting}! 👋 Que bom te ver de novo! Continuamos de onde paramos?${_ctx.lastBairro ? `\n\nÚltimo bairro que vimos: **${_ctx.lastBairro}**` : ''}`,
                        opts: [
                            ...(_ctx.lastBairro ? [{ label: `📍 Voltar a ${_ctx.lastBairro}`, next: `flow_${_ctx.lastBairroKey || 'bairros'}` }] : []),
                            { label: '🏠 Ver imóveis', next: 'flow_catalogo' },
                            { label: '📞 Falar com Leandro', action: () => window.open(KB.whatsapp, '_blank') },
                            { label: '↩ Menu completo', next: 'inicio' },
                        ],
                    };
                }
                return { type: 'FLOW', flow: 'inicio' };
            }

            // ── AGRADECIMENTO ──
            case 'OBRIGADO':
                return {
                    text: `😊 Fico feliz em ajudar! Qualquer dúvida sobre imóveis no Rio, estou aqui. 🏠\n\nO **${KB.nome}** também está sempre disponível!`,
                    opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            // ── DESPEDIDA ──
            case 'DESPEDIDA':
                return {
                    text: `👋 Até logo! Quando precisar de ajuda com imóveis no Rio, é só voltar aqui.\n\nO **${KB.nome}** — **${KB.creci}** — está sempre disponível!`,
                    opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.whatsapp, '_blank') }],
                };

            // ── CATÁLOGO GERAL ──
            case 'CATALOGO_GERAL': {
                const r = _resumoEstoque();
                if (!_catalogoLoaded) return {
                    text: '⏳ Carregando o catálogo em tempo real... Um momento!',
                    opts: [{ label: '🏠 Ver todos no site', action: () => { window.location.href = 'imoveis.html'; } }, { label: '↩ Menu', next: 'inicio' }],
                };
                if (!r) return {
                    text: `📋 O catálogo está vazio no momento. Mas o **${KB.nome}** tem acesso a imóveis exclusivos não listados!\n\nFale com ele diretamente para descobrir as melhores opções.`,
                    opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };
                const bList = r.bairros.join(' · ');
                return {
                    text: `📊 **Catálogo atualizado em tempo real:**\n\n🏠 **${r.total} imóvel${r.total !== 1 ? 'is' : ''} disponíve${r.total !== 1 ? 'is' : 'l'}**\n📍 **Bairros:** ${bList}${r.terrenos ? `\n🏗️ ${r.terrenos} terreno${r.terrenos !== 1 ? 's' : ''}` : ''}${r.dest ? `\n⭐ ${r.dest} em destaque` : ''}\n\nQuer filtrar por bairro, tipo ou preço? Pergunte ou escolha abaixo!`,
                    opts: [
                        { label: '🌊 Zona Sul', next: 'flow_zona_sul' },
                        { label: '🏙️ Barra & Recreio', next: 'flow_barra' },
                        { label: '🏗️ Terrenos', next: 'flow_terrenos' },
                        { label: '🏠 Ver todos no site', action: () => { window.location.href = 'imoveis.html'; } },
                        { label: '↩ Menu', next: 'inicio' },
                    ],
                };
            }

            // ── TERRENOS ──
            case 'CAT_TERRENOS': {
                const lista = _getByTipo('Terreno');
                if (!lista.length) return { text: '🏗️ Não há terrenos no catálogo agora, mas o Leandro tem acesso a terrenos exclusivos!', opts: [{ label: '📱 Consultar Leandro', action: () => window.open(KB.wa('Olá Leandro! Tenho interesse em terrenos no Rio.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };
                const preview = lista.slice(0, 3).map(im => `🏗️ **${im.titulo}** — ${im.bairro} · ${im.area}m² · ${_formatPreco(im.preco)}`).join('\n');
                return { text: `🏗️ **${lista.length} terreno${lista.length !== 1 ? 's' : ''} disponíve${lista.length !== 1 ? 'is' : 'l'}:**\n\n${preview}`, opts: _buildVerOpts(lista, 'Olá Leandro! Tenho interesse em terrenos.') };
            }

            // ── COBERTURAS ──
            case 'CAT_COBERTURAS': {
                const lista = _getByTipo('Cobertura');
                if (!lista.length) return { text: '🌆 Não há coberturas no catálogo agora. O Leandro tem coberturas exclusivas!', opts: [{ label: '📱 Consultar Leandro', action: () => window.open(KB.wa('Olá Leandro! Procuro cobertura no Rio.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };
                const preview = lista.slice(0, 3).map(_renderCard).join('\n\n');
                return { text: `🌆 **${lista.length} cobertura${lista.length !== 1 ? 's' : ''} disponíve${lista.length !== 1 ? 'is' : 'l'}:**\n\n${preview}`, opts: _buildVerOpts(lista, 'Olá Leandro! Tenho interesse em coberturas no Rio.') };
            }

            // ── DESTAQUES ──
            case 'DESTAQUES': {
                const lista = _getDestaques();
                const base = lista.length ? lista : _catalogoImoveis.slice(0, 3);
                if (!base.length) return { text: '⭐ Veja o catálogo completo no site!', opts: [{ label: '🏠 Ver imóveis', action: () => { window.location.href = 'imoveis.html'; } }] };
                return { text: `⭐ **Imóveis em destaque:**\n\n${base.slice(0, 3).map(_renderCard).join('\n\n')}`, opts: _buildVerOpts(base, 'Olá Leandro! Vi os destaques. Quero saber mais!') };
            }

            // ── MAIS BARATO ──
            case 'MAIS_BARATO': {
                const lista = [..._catalogoImoveis].filter(i => i.precoModo !== 'lancamento').sort((a, b) => parseFloat(a.preco || 0) - parseFloat(b.preco || 0));
                if (!lista.length) return { text: 'Acesse o site para ver os preços!', opts: [{ label: '🏠 Ver imóveis', action: () => { window.location.href = 'imoveis.html?ordenar=menor-preco'; } }] };
                return { text: `💰 **Opção mais acessível:**\n\n${_renderCard(lista[0])}\n\nTotal: ${lista.length} imóveis disponíveis!`, opts: _buildVerOpts(lista, 'Olá Leandro! Quero as opções mais acessíveis.') };
            }

            // ── MAIS CARO ──
            case 'MAIS_CARO': {
                const lista = [..._catalogoImoveis].filter(i => i.precoModo !== 'lancamento').sort((a, b) => parseFloat(b.preco || 0) - parseFloat(a.preco || 0));
                if (!lista.length) return { text: 'Acesse o site para ver os imóveis de alto padrão!', opts: [{ label: '🏠 Ver imóveis', action: () => { window.location.href = 'imoveis.html'; } }] };
                return { text: `👑 **Imóvel mais exclusivo:**\n\n${_renderCard(lista[0])}\n\nLeandro é especialista em alto padrão!`, opts: _buildVerOpts(lista, 'Olá Leandro! Tenho interesse em imóveis de alto padrão.') };
            }

            // ── QUARTOS ──
            case 'QUARTOS_1': case 'QUARTOS_2': case 'QUARTOS_3': case 'QUARTOS_4': {
                const n = { QUARTOS_1: 1, QUARTOS_2: 2, QUARTOS_3: 3, QUARTOS_4: 4 }[intent];
                const lista = _getByQuartos(n);
                const label = n === 4 ? '4 ou mais quartos' : `${n} quarto${n !== 1 ? 's' : ''}`;
                if (!lista.length) return { text: `🛏️ Não há imóveis com ${label} agora. O Leandro pode encontrar!`, opts: [{ label: '📱 Consultar Leandro', action: () => window.open(KB.wa(`Olá Leandro! Procuro imóvel com ${label}.`), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };
                return { text: `🛏️ **${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} com ${label}:**\n\n${lista.slice(0, 3).map(_renderCard).join('\n\n')}${lista.length > 3 ? `\n\n_...e mais ${lista.length - 3}_` : ''}`, opts: _buildVerOpts(lista, `Olá Leandro! Quero imóvel com ${label}.`) };
            }

            // ── SUÍTES ──
            case 'SUITES_1': case 'SUITES_2': case 'SUITES_3': case 'SUITES_4': {
                const n = { SUITES_1: 1, SUITES_2: 2, SUITES_3: 3, SUITES_4: 4 }[intent];
                const lista = _getBySuites(n);
                const label = n === 4 ? '4 ou mais suítes' : `${n} suíte${n !== 1 ? 's' : ''}`;
                if (!lista.length) return {
                    text: `🛁 Não encontrei imóveis com **${label}** no catálogo agora. Mas o Leandro tem acesso a opções exclusivas!\n\nPergunte a ele diretamente.`,
                    opts: [
                        { label: '📱 Consultar Leandro', action: () => window.open(KB.wa(`Olá Leandro! Procuro imóvel com ${label}.`), '_blank') },
                        { label: '↩ Menu', next: 'inicio' },
                    ],
                };
                return {
                    text: `🛁 **${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} com ${label}:**\n\n${lista.slice(0, 3).map(_renderCard).join('\n\n')}${lista.length > 3 ? `\n\n_...e mais ${lista.length - 3}_` : ''}`,
                    opts: _buildVerOpts(lista, `Olá Leandro! Quero imóvel com ${label} no Rio.`),
                };
            }

            // ── INFO BAIRRO ──
            case 'INFO_BAIRRO': {
                const bData = KB.bairros[bairro];
                if (!bData) return null;
                const disponiv = _getByBairro(bData.nome);
                const dispText = disponiv.length
                    ? `\n\n✅ **${disponiv.length} imóvel${disponiv.length !== 1 ? 'is' : ''} disponíve${disponiv.length !== 1 ? 'is' : 'l'} em ${bData.nome}!**`
                    : `\n\n📌 Não há imóveis em ${bData.nome} no catálogo agora, mas o Leandro tem opções exclusivas.`;
                return {
                    text: `${bData.emoji} **${bData.nome}**\n\n${bData.descricao}\n\n**Preços médios:**\n• Studio: ${bData.precos.studio}\n• 1 quarto: ${bData.precos.um}\n• 2 quartos: ${bData.precos.dois}\n• 3+ quartos: ${bData.precos.tres}\n\n**Airbnb:** ${bData.airbnb}\n**Transporte:** ${bData.metro}${dispText}`,
                    opts: [
                        ...(disponiv.length ? [{ label: `🏠 Ver imóveis em ${bData.nome}`, action: () => { window.location.href = `imoveis.html?bairro=${encodeURIComponent(bData.nome)}`; } }] : []),
                        { label: '📱 Falar com Leandro', action: () => window.open(KB.wa(`Olá Leandro! Tenho interesse em imóveis em ${bData.nome}.`), '_blank') },
                        { label: '↩ Menu', next: 'inicio' },
                    ],
                };
            }

            // ── TIPO GENÉRICO ──
            case 'TIPO_GENERICO': {
                const lista = _getByTipo(tipo);
                if (!lista.length) return { text: `Não encontrei ${tipo}s no catálogo agora. O Leandro pode ter opções exclusivas!`, opts: [{ label: '📱 Consultar Leandro', action: () => window.open(KB.wa(`Olá Leandro! Procuro ${tipo} no Rio.`), '_blank') }] };
                return { text: `🏠 **${lista.length} ${tipo}${lista.length !== 1 ? 's' : ''} disponíve${lista.length !== 1 ? 'is' : 'l'}:**\n\n${lista.slice(0, 3).map(_renderCard).join('\n\n')}`, opts: _buildVerOpts(lista, `Olá Leandro! Procuro ${tipo} no Rio.`) };
            }

            // ── LEANDRO ──
            case 'LEANDRO_HISTORIA':
                return {
                    text: `👤 **${KB.nome} — Corretor de Imóveis**\n\n${KB.historia.inicio}\n\n${KB.historia.especialidade}\n\n${KB.historia.diferenciais}`,
                    opts: [{ label: '🏆 Conquistas', next: 'flow_conquistas' }, { label: '⭐ Depoimentos', next: 'flow_depoimentos' }, { label: '📱 Falar com Leandro', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'LEANDRO_EXPERIENCIA':
                return {
                    text: `📅 **Experiência:**\n\n• **${KB.experiencia}** de mercado imobiliário\n• **${KB.negociados}** negociações concluídas\n• **100%** de satisfação\n• **47% mais rápido** que a média do mercado`,
                    opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'LEANDRO_DIFERENCIAL':
                return {
                    text: `✨ **Por que escolher o Leandro?**\n\n${KB.historia.diferenciais}\n\n**Incluso no atendimento:**\n• 🏠 Curadoria personalizada\n• 📄 Toda a documentação\n• 💰 Negociação do preço\n• 🏦 Apoio no financiamento\n• 🔑 Até a entrega das chaves\n• 🔨 Indicação de arquitetos`,
                    opts: [{ label: '📱 Começar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero começar a buscar meu imóvel com você.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'DEPOIMENTOS':
                return {
                    text: `⭐ **O que os clientes dizem:**\n\n💬 _"Vendeu minha cobertura em apenas 15 dias pelo valor que eu queria."_ — Roberto Fonseca, Barra da Tijuca\n\n💬 _"Atendimento personalizado e muita transparência. Recomendo a todos!"_ — Juliana Martins, Recreio\n\n💬 _"Encontrou exatamente o que eu precisava. Rápido e sem dor de cabeça."_ — Thiago Azevedo, Leblon\n\n💬 _"Comprei meu primeiro apê com o Leandro. Experiência incrível!"_ — Lucas Drummond, Ipanema`,
                    opts: [{ label: '📱 Ser o próximo cliente satisfeito', action: () => window.open(KB.wa('Olá Leandro! Li os depoimentos e quero sua ajuda.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'LEANDRO_CONQUISTAS':
                return {
                    text: `🏆 **Resultados do Leandro:**\n\n• **${KB.experiencia}** de mercado\n• **${KB.negociados}** negociações\n• **100%** de satisfação\n• **47%** mais rápido que a média\n• Zona Sul e Barra da Tijuca`,
                    opts: [{ label: '📱 Contar com o Leandro', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'LEANDRO_CRECI':
                return {
                    text: `✅ **Habilitação profissional:**\n\n• Registro: **${KB.creci}**\n• **${KB.experiencia}** de experiência\n• Especialidade: alto padrão no Rio\n\nO CRECI garante que você está com um profissional **habilitado e responsável**.`,
                    opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            // ── CONTATO ──
            case 'CONTATO_TEL':
                return { text: `📱 **WhatsApp / Ligação:** ${KB.tel}\n\nResposta rápida — geralmente em menos de 1h!`, opts: [{ label: '💬 Abrir WhatsApp', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'CONTATO_EMAIL':
                return { text: `✉️ **E-mail:** ${KB.email}\n\nIdeal para documentos e propostas formais.`, opts: [{ label: '📱 Prefiro WhatsApp', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'CONTATO_INSTAGRAM':
                return { text: `📸 **Instagram:** ${KB.instagram}\n\nLá o Leandro posta novos imóveis, dicas do mercado e bastidores!`, opts: [{ label: '📸 Abrir Instagram', action: () => window.open('https://instagram.com/leopbomfim', '_blank') }, { label: '📱 WhatsApp', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'CONTATO_HORARIO':
                return { text: `🕐 **Horário de atendimento:**\n\n• **Seg–Sex:** 8h às 20h\n• **Sábado:** 9h às 18h\n• **Domingo:** Sob agendamento\n\n💡 _Pelo WhatsApp costuma responder mesmo fora do horário!_`, opts: [{ label: '💬 Mandar mensagem', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'CONTATO_GERAL':
                return {
                    text: `📞 **${KB.nome}** — ${KB.creci}\n\n📱 ${KB.tel}\n📸 ${KB.instagram}\n✉️ ${KB.email}\n\n🕐 ${KB.horario}`,
                    opts: [{ label: '💬 WhatsApp agora', action: () => window.open(KB.whatsapp, '_blank') }, { label: '📸 Instagram', action: () => window.open('https://instagram.com/leopbomfim', '_blank') }, { label: '📋 Página de contato', action: () => { window.location.href = 'contato.html'; } }, { label: '↩ Menu', next: 'inicio' }],
                };

            // ── FINANCIAMENTO ──
            case 'FINANCIAMENTO':
                return {
                    text: `💳 **Financiamento imobiliário:**\n\n• Entrada mínima: **20% do valor**\n• Prazo: até **360 meses**\n• Taxas: a partir de **10,49% a.a.**\n• Parcela máxima: **30% da renda**\n\nO Leandro faz a **pré-análise gratuita** antes do banco!`,
                    opts: [{ label: '💰 Posso usar FGTS?', next: 'flow_fgts' }, { label: '🏦 Qual banco é melhor?', next: 'flow_bancos' }, { label: '📱 Simular com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero simular um financiamento imobiliário.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'FGTS':
                return {
                    text: `💰 **FGTS no financiamento:**\n\n✅ **Pode usar para:**\n• Dar a entrada\n• Amortizar o saldo devedor\n• Pagar prestações (até 12 meses)\n\n📋 **Requisitos:**\n• 3+ anos de carteira assinada\n• Sem outro financiamento SFH ativo\n• Imóvel residencial`,
                    opts: [{ label: '📱 Verificar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero usar meu FGTS para comprar um imóvel.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'ENTRADA':
                return { text: `📊 **Sobre a entrada:**\n\n• Mínimo de **20% do valor**\n• Quanto maior, menor a taxa de juros\n• **FGTS** pode compor parte da entrada\n\n**Exemplo:** Imóvel de R$ 500k → entrada mín. de R$ 100k`, opts: [{ label: '📱 Planejar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero entender a entrada para comprar um imóvel.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'APROVACAO':
                return { text: `✅ **Como saber se será aprovado:**\n\n• Parcela ≤ 30% da renda mensal\n• CPF sem restrições\n• Histórico de crédito positivo\n\n💡 O Leandro faz a **pré-análise gratuita** antes do banco!`, opts: [{ label: '📱 Pré-análise gratuita', action: () => window.open(KB.wa('Olá Leandro! Quero fazer pré-análise de crédito.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'JUROS':
                return { text: `📊 **Taxas de financiamento (2025):**\n\n• **Caixa Econômica:** a partir de 10,49% a.a.\n• **Banco do Brasil:** a partir de 10,79% a.a.\n• **Bradesco / Itaú:** a partir de 10,99% a.a.\n\n💡 A taxa final depende do seu perfil. O Leandro negocia!`, opts: [{ label: '📱 Buscar melhor taxa', action: () => window.open(KB.wa('Olá Leandro! Quero o banco com melhor taxa.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'MCMV':
                return { text: `🏠 **Minha Casa Minha Vida (2025):**\n\n• Para renda de até R$ 8.000/mês\n• Subsídio do governo: até R$ 55.000\n• Taxas mais baixas que o mercado\n\n**Faixas:**\n• Faixa 1: até R$ 2.640/mês\n• Faixa 2: até R$ 4.400/mês\n• Faixa 3: até R$ 8.000/mês`, opts: [{ label: '📱 Verificar elegibilidade', action: () => window.open(KB.wa('Olá Leandro! Quero saber se tenho direito ao MCMV.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            // ── PROCESSO ──
            case 'COMO_COMPRAR':
                return {
                    text: `📋 **Passo a passo para comprar:**\n\n**1️⃣** Defina orçamento (+5–7% de custas)\n**2️⃣** Escolha a região com o Leandro\n**3️⃣** Liste prioridades (quartos, área, lazer)\n**4️⃣** Visite imóveis acompanhado\n**5️⃣** Proposta — Leandro negocia\n**6️⃣** Verificação completa de documentação\n**7️⃣** Assine o contrato e pague a entrada\n**8️⃣** Escritura e registro no cartório\n**9️⃣** 🗝️ Chaves na mão!`,
                    opts: [{ label: '📱 Começar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero comprar um imóvel no Rio. Por onde começo?'), '_blank') }, { label: '💳 Posso financiar?', next: 'flow_financiamento' }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'DOCUMENTACAO':
                return {
                    text: `📄 **Documentação:**\n\n**Do comprador:**\n• RG e CPF\n• Comprovante de renda (3 meses)\n• Comprovante de residência\n• Certidão de nascimento/casamento\n• Declaração de IR\n\n✅ O Leandro cuida de **tudo** — você só assina!`,
                    opts: [{ label: '📱 Tirar dúvidas', action: () => window.open(KB.wa('Olá Leandro! Tenho dúvidas sobre documentação.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'CUSTOS_EXTRAS':
                return {
                    text: `📋 **Custos extras na compra:**\n\n• **ITBI** (~3% do valor)\n• **Escritura** no cartório (~1,5–2%)\n• **Registro** (~0,5–1%)\n• **Total estimado:** 5–7% do valor\n\n💡 **Exemplo:** Imóvel R$ 500k → custas ~R$ 25–35k`,
                    opts: [{ label: '📱 Planejar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero entender todos os custos de comprar.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'SEGURANCA_COMPRA':
                return {
                    text: `🛡️ **Segurança na compra com o Leandro:**\n\n• ✅ Verificação completa da matrícula\n• ✅ Certidão negativa de débitos\n• ✅ Confirmação de inexistência de ônus\n• ✅ Análise do histórico de IPTU\n• ✅ Contrato revisado por parceiros jurídicos\n• ✅ CRECI-RJ garante responsabilidade profissional`,
                    opts: [{ label: '📱 Comprar com segurança', action: () => window.open(KB.wa('Olá Leandro! Quero comprar com segurança.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'VENDER':
                return {
                    text: `🏠 **Quer vender seu imóvel?**\n\nO Leandro cuida de **tudo:**\n\n• 📊 Avaliação gratuita\n• 📸 Fotos profissionais e divulgação\n• 👥 Qualificação de compradores sérios\n• 💰 Estratégia de preço\n• 📄 Toda a documentação\n\n**${KB.negociados}** imóveis negociados com sucesso!`,
                    opts: [{ label: '📱 Quero vender meu imóvel', action: () => window.open(KB.wa('Olá Leandro! Quero vender meu imóvel. Pode fazer uma avaliação gratuita?'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'AVALIACAO':
                return {
                    text: `💰 **Avaliação gratuita do seu imóvel**\n\nO Leandro faz análise real:\n\n• 📍 Localização e andar\n• 🏠 Metragem e planta\n• 🔨 Estado de conservação\n• 📊 Comparativos recentes na mesma rua\n\n**Sem custo, sem compromisso.** Em 24h você sabe o valor real!`,
                    opts: [{ label: '📱 Solicitar avaliação gratuita', action: () => window.open(KB.wa('Olá Leandro! Gostaria de uma avaliação gratuita do meu imóvel.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'COMISSAO':
                return {
                    text: `💼 **Taxa de corretagem:**\n\n• A comissão é **paga pelo vendedor**, não pelo comprador\n• Para o **comprador:** o serviço é **GRATUITO** ✅\n\nVocê tem todo o suporte profissional sem pagar nada a mais!`,
                    opts: [{ label: '📱 Esclarecimentos', action: () => window.open(KB.wa('Olá Leandro! Tenho dúvidas sobre a corretagem.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            // ── INVESTIMENTO ──
            case 'INVESTIMENTO':
                return {
                    text: `📈 **Imóvel como investimento no Rio:**\n\n• 🏠 Aluguel residencial: 5–8% a.a.\n• ✈️ Airbnb temporada: 8–20% a.a.\n• 📊 Valorização: 6–12% a.a. nos bairros nobres`,
                    opts: [{ label: '🏠 Airbnb no Rio', next: 'flow_airbnb' }, { label: '📱 Analisar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero investir em imóvel no Rio.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'AIRBNB':
                return {
                    text: `🏠 **Airbnb no Rio:**\n\n• 🥇 **Copacabana** — 12–20% a.a., R$ 150–600/noite\n• 🥈 **Ipanema** — 10–18% a.a., R$ 200–1.000/noite\n• 🥉 **Leblon** — 9–15% a.a., R$ 300–1.500/noite\n• 🏅 **Barra** — 7–12% a.a., R$ 150–500/noite`,
                    opts: [{ label: '📱 Encontrar imóvel para Airbnb', action: () => window.open(KB.wa('Olá Leandro! Quero comprar imóvel para Airbnb no Rio.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'ALUGUEL':
                return {
                    text: `🏠 **Renda com aluguel (2025):**\n\n• Studio em Copa: R$ 2.000–3.500/mês\n• 1 quarto em Ipanema: R$ 3.500–6.000/mês\n• 2 quartos na Barra: R$ 2.500–5.000/mês\n• 3 quartos no Leblon: R$ 7.000–15.000/mês\n\n**Retorno:** geralmente 5–8% ao ano`,
                    opts: [{ label: '📱 Buscar imóvel para renda', action: () => window.open(KB.wa('Olá Leandro! Quero comprar imóvel para renda com aluguel.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'VALORIZACAO':
                return {
                    text: `📈 **Bairros com maior valorização (2025):**\n\n🥇 **Ipanema/Leblon** — 10–12% a.a.\n🥈 **Barra Olímpica** — 8–11% a.a.\n🥉 **Botafogo** — 7–10% a.a.\n🏅 **Recreio** — 6–9% a.a.`,
                    opts: [{ label: '📱 Escolher com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero investir no bairro com melhor valorização.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'MERCADO_GERAL':
                return {
                    text: `📊 **Mercado imobiliário carioca em 2025:**\n\n• Valorização média de 8% ao ano nos bairros nobres\n• Alta demanda por home office e condomínios com lazer\n• Crescimento forte da Barra Olímpica e Recreio\n• Financiamento em ~10,5% a.a.`,
                    opts: [{ label: '📱 Analisar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero entender o mercado imobiliário do Rio.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'MELHOR_MOMENTO':
                return {
                    text: `📅 **É bom comprar agora?**\n\n2025 é considerado um bom momento:\n\n• ✅ Taxas de financiamento estabilizando\n• ✅ Oferta de imóveis crescendo\n• ✅ Valorização histórica do Rio mantida\n• ✅ Demanda de Airbnb aquecida\n\n💡 _"Quem comprou há 5 anos em Botafogo pagou metade do que vale hoje."_`,
                    opts: [{ label: '📱 Avaliar meu caso com Leandro', action: () => window.open(KB.wa('Olá Leandro! É bom comprar agora?'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'COMPRAR_VS_ALUGAR':
                return {
                    text: `🤔 **Comprar ou alugar?**\n\n**Comprar vale quando:**\n• ✅ Estabilidade financeira\n• ✅ Plano de ficar 5+ anos\n• ✅ Capital para a entrada\n\n**No Rio, imóveis valorizaram ~8% a.a. nos últimos 10 anos!**`,
                    opts: [{ label: '📱 Analisar meu caso', action: () => window.open(KB.wa('Olá Leandro! Estou em dúvida se devo comprar ou alugar.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            // ── CARACTERÍSTICAS ──
            case 'PET_FRIENDLY':
                return { text: `🐾 **Imóveis pet-friendly:**\n\n• 🌴 **Recreio** — espaçoso, pet place, parques\n• 🏙️ **Barra** — condomínios com área de banho/tosa\n• 🌿 **Botafogo** — ótimo para caminhadas`, opts: [{ label: '📱 Buscar pet-friendly', action: () => window.open(KB.wa('Olá Leandro! Procuro imóvel pet-friendly no Rio.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'STUDIOS':
                return { text: `🏢 **Studios e kitnets:**\n\n• Tamanho: 20–50m²\n• Alta liquidez — fácil de vender e alugar\n\n**Preços:**\n• Copacabana: R$ 250–500k\n• Botafogo: R$ 280–480k\n• Barra: R$ 220–400k`, opts: [{ label: '📱 Ver studios com Leandro', action: () => window.open(KB.wa('Olá Leandro! Tenho interesse em studios para investimento.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'LANCAMENTO':
                return { text: `🚀 **Imóveis na planta:**\n\n• Preços 20–40% menores\n• Personalização antes da entrega\n• Valorização média de 25–40% até a entrega\n\nO Leandro trabalha com lançamentos de construtoras confiáveis!`, opts: [{ label: '📱 Ver lançamentos', action: () => window.open(KB.wa('Olá Leandro! Tenho interesse em lançamentos no Rio.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'VISTA_MAR':
                return { text: `🌊 **Vista para o mar:**\n\nVista agrega em média **20–40% ao valor**!\n\n• Ipanema e Leblon — vista direta\n• Copacabana — orla e mar\n• Botafogo — Baía e Pão de Açúcar`, opts: [{ label: '📱 Buscar com vista', action: () => window.open(KB.wa('Olá Leandro! Procuro imóvel com vista para o mar.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'COBERTURA_PISCINA':
                return { text: `🌆 **Coberturas com piscina privativa:**\n\n• Ipanema/Leblon: a partir de R$ 3,5M\n• Barra da Tijuca: a partir de R$ 1,8M\n• Recreio: a partir de R$ 1,2M\n\nO Leandro tem conexões exclusivas neste segmento!`, opts: [{ label: '📱 Consultar Leandro', action: () => window.open(KB.wa('Olá Leandro! Tenho interesse em cobertura com piscina.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'HOME_OFFICE':
                return { text: `💻 **Imóvel com home office:**\n\n• 2+ quartos (um dedicado para escritório)\n• Boa iluminação natural\n• Bairros mais tranquilos: Leblon, Recreio, Barra`, opts: [{ label: '📱 Buscar para home office', action: () => window.open(KB.wa('Olá Leandro! Trabalho remoto e procuro imóvel com espaço para home office.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'GARAGEM':
                return { text: `🚗 **Vagas de garagem:**\n\nUma vaga pode valer **R$ 30–100k** em bairros nobres!\n\n• Ipanema/Leblon: vaga é fundamental\n• Barra: garagem inclusa na maioria dos condomínios`, opts: [{ label: '📱 Buscar com garagem', action: () => window.open(KB.wa('Olá Leandro! Preciso de imóvel com vaga de garagem.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'METRO':
                return { text: `🚇 **Próximos ao metrô:**\n\n• Copacabana — Cardeal Arcoverde, Siqueira Campos, Cantagalo\n• Ipanema — General Osório\n• Botafogo — Botafogo\n\n**Proximidade valoriza 10–20%**`, opts: [{ label: '📱 Buscar perto do metrô', action: () => window.open(KB.wa('Olá Leandro! Preciso de imóvel próximo ao metrô.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'PERTO_PRAIA':
                return { text: `🌊 **Perto da praia:**\n\n• 🏖️ Ipanema e Leblon — as mais famosas\n• 🏝️ Copacabana — orla de 4km\n• 🌴 Recreio — limpa e familiar\n• 🌊 Barra — longa, surf, espaço`, opts: [{ label: '📱 Buscar perto da praia', action: () => window.open(KB.wa('Olá Leandro! Quero imóvel próximo à praia no Rio.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'FAMILIA':
                return { text: `👨‍👩‍👧 **Melhores bairros para família:**\n\n🥇 **Leblon** — segurança máxima, escolas top\n🥈 **Recreio** — espaçoso, condomínios, natureza\n🥉 **Barra** — shoppings, hospitais, colégios`, opts: [{ label: '📱 Buscar para família', action: () => window.open(KB.wa('Olá Leandro! Tenho família com filhos e procuro o bairro ideal.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'TRANQUILO':
                return { text: `🌿 **Bairros mais tranquilos:**\n\n🥇 **Leblon** — o mais tranquilo da Zona Sul\n🥈 **Recreio** — silêncio, natureza\n🥉 **Flamengo** — arborizado, familiar`, opts: [{ label: '📱 Buscar bairro tranquilo', action: () => window.open(KB.wa('Olá Leandro! Procuro imóvel em bairro tranquilo.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            // ── REGIÕES ──
            case 'REGIAO_ZONA_SUL':
                return {
                    text: `🌊 **Zona Sul do Rio:**\n\nIpanema, Leblon, Copacabana, Botafogo e Flamengo.\n\n• Praias mundialmente famosas\n• Infraestrutura completa e metrô\n• Alta demanda de aluguel e Airbnb`,
                    opts: [{ label: '🌊 Ipanema', next: 'flow_ipanema' }, { label: '🏖️ Leblon', next: 'flow_leblon' }, { label: '🏝️ Copacabana', next: 'flow_copa' }, { label: '🔍 Ver imóveis Zona Sul', action: () => { window.location.href = 'imoveis.html?region=zona-sul'; } }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'REGIAO_ZONA_OESTE':
                return {
                    text: `🏙️ **Barra & Região Oeste:**\n\nMais espaço, condomínios modernos e melhor custo-benefício!\n\n• Barra da Tijuca — o mais completo\n• Recreio — tranquilo e familiar\n• Barra Olímpica — moderno, em valorização`,
                    opts: [{ label: '🏙️ Barra da Tijuca', next: 'flow_barra_info' }, { label: '🌴 Recreio', next: 'flow_recreio' }, { label: '🔍 Ver imóveis', action: () => { window.location.href = 'imoveis.html?region=barra-recreio'; } }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'MELHOR_BAIRRO':
                return {
                    text: `📍 **Qual o melhor bairro para você?**\n\nDepende das suas prioridades! Me diga o que é mais importante:`,
                    opts: [
                        { label: '🌊 Perto da praia', next: 'flow_praia' },
                        { label: '🌿 Tranquilidade', next: 'flow_tranquilo' },
                        { label: '👨‍👩‍👧 Para família', next: 'flow_familia' },
                        { label: '💼 Investimento', next: 'flow_investimento' },
                        { label: '🚇 Com metrô', next: 'flow_metro' },
                        { label: '↩ Menu', next: 'inicio' },
                    ],
                };

            // ── PERGUNTAS GERAIS DO RIO ──
            case 'CLIMA_RIO':
                return { text: `☀️ **Clima do Rio:**\n\n• **Verão:** 30–40°C, chuvas à tarde\n• **Outono:** 22–30°C, mais agradável\n• **Inverno:** 18–28°C, dias perfeitos, pouca chuva\n• **Média anual:** 24°C`, opts: [{ label: '🏠 Ver imóveis no Rio', action: () => { window.location.href = 'imoveis.html'; } }, { label: '↩ Menu', next: 'inicio' }] };

            case 'SEGURANCA_RIO':
                return { text: `🛡️ **Segurança no Rio:**\n\n**Bairros mais seguros:**\n• 🥇 Leblon\n• 🥈 Ipanema\n• 🥉 Barra da Tijuca\n• Recreio\n\n💡 O Leandro orienta sobre segurança específica de cada bairro!`, opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'CUSTO_VIDA_RIO':
                return { text: `💰 **Custo de vida no Rio (2025):**\n\n• Aluguel 1qt zona sul: R$ 3.500–6.000/mês\n• Supermercado (casal): R$ 1.500–2.500/mês\n• Transporte: R$ 250–400/mês\n• Contas: R$ 400–700/mês`, opts: [{ label: '🏠 Ver imóveis', action: () => { window.location.href = 'imoveis.html'; } }, { label: '↩ Menu', next: 'inicio' }] };

            case 'TURISMO_RIO':
                return { text: `🌍 **Pontos turísticos do Rio:**\n\n• 🕊️ Cristo Redentor\n• 🏔️ Pão de Açúcar\n• 🏖️ Ipanema e Copacabana\n• ⚽ Maracanã\n• 🎶 Lapa\n• 🌿 Floresta da Tijuca`, opts: [{ label: '🏠 Morar no Rio também!', next: 'flow_catalogo' }, { label: '↩ Menu', next: 'inicio' }] };

            case 'TRANSPORTE_RIO':
                return { text: `🚌 **Transporte no Rio:**\n\n• **Metrô:** Copa, Botafogo, Flamengo, Ipanema, Barra\n• **BRT Transoeste:** Barra e Recreio\n• **Uber/99:** amplamente usados`, opts: [{ label: '🚇 Imóveis perto do metrô', next: 'flow_metro' }, { label: '↩ Menu', next: 'inicio' }] };

            case 'GASTRONOMIA_RIO':
                return { text: `🍽️ **Gastronomia do Rio:**\n\n• Leblon/Ipanema — restaurantes premiados\n• Botafogo — bistrôs e bares descolados\n• Barra — praça de alimentação completa`, opts: [{ label: '🏠 Morar perto dos melhores lugares', next: 'flow_bairros' }, { label: '↩ Menu', next: 'inicio' }] };

            case 'PRAIAS_RIO':
                return { text: `🏖️ **Melhores praias do Rio:**\n\n• 🌊 Ipanema — a mais famosa do mundo\n• 🌴 Leblon — exclusiva e tranquila\n• 🏝️ Copacabana — 4km de orla\n• 🌿 Recreio — limpa e familiar\n• 🏄 Barra — surf, espaço, natureza`, opts: [{ label: '🏠 Imóveis perto da praia', next: 'flow_praia' }, { label: '↩ Menu', next: 'inicio' }] };

            case 'ESTRANGEIRO':
                return { text: `🌍 **Para estrangeiros:**\n\n✅ Estrangeiros **podem comprar** imóveis no Brasil\n\n**Documentos:**\n• Passaporte válido\n• CPF (Receita Federal)\n• Comprovante de renda/patrimônio\n\nO Leandro tem experiência com compradores internacionais!`, opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.wa('Hello Leandro! I am a foreigner interested in buying a property in Rio. Can you help me?'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'PRAZO_COMPRA':
                return { text: `⏱️ **Quanto tempo leva para comprar?**\n\n• Busca e visitas: 2–8 semanas\n• Proposta e negociação: 1–2 semanas\n• Análise documental: 2–4 semanas\n• Financiamento (se necessário): 4–8 semanas\n• Escritura e registro: 2–4 semanas\n\n**Total:** 2–6 meses`, opts: [{ label: '📱 Começar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero entender o prazo para comprar no Rio.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            case 'IMPOSTOS':
                return { text: `📊 **Impostos na compra:**\n\n• **ITBI:** ~3% do valor (pago pelo comprador)\n• **Escritura + Registro:** ~2–3%\n• **Total:** 5–7% do valor\n\n**Na venda:**\n• IR sobre ganho de capital: **15%**\n• Isenção se for único imóvel e ganho < R$ 440k`, opts: [{ label: '📱 Orientação com Leandro', action: () => window.open(KB.wa('Olá Leandro! Tenho dúvidas sobre impostos na compra/venda.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }] };

            // ── DICAS ──
            case 'DICAS_NEGOCIACAO':
                return {
                    text: `💡 **Dicas de negociação:**\n\n• 🔍 Pesquise imóveis similares na mesma rua\n• 📅 Imóveis há 90+ dias têm mais espaço para desconto\n• 💰 Entrada maior geralmente garante desconto\n• 📋 Reserve 5–7% para custas de transferência`,
                    opts: [{ label: '📱 Negociar com apoio do Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero sua ajuda para negociar.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
                };

            case 'PRIMEIRO_IMOVEL':
                return {
                    text: `🎉 **Comprando seu primeiro imóvel!**\n\nO Leandro explica cada etapa sem pressa:\n\n• 💰 Ajuda a organizar o orçamento total\n• 🏦 Orienta sobre FGTS e financiamento\n• 📄 Resolve toda a documentação\n• 🔑 Acompanha até a entrega das chaves`,
                    opts: [{ label: '📱 Começar minha jornada', action: () => window.open(KB.wa('Olá Leandro! Vou comprar meu primeiro imóvel. Preciso de orientação.'), '_blank') }, { label: '💳 Financiamento', next: 'flow_financiamento' }, { label: '↩ Menu', next: 'inicio' }],
                };

            // ── NOVAS INTENÇÕES v8 ──
            case 'FRUSTRADO':
                return {
                    text: `😅 Desculpa${greeting}! Deixa eu tentar te ajudar melhor.\n\nVocê pode:\n• **Perguntar sobre um bairro** (Ex: "Fala sobre Ipanema")\n• **Buscar imóveis** (Ex: "Quero 2 quartos na Barra")\n• **Tirar dúvidas** (Ex: "Como funciona o financiamento?")\n\nOu fale diretamente com o **${KB.nome}** — ele responde em minutos!`,
                    opts: [
                        { label: '📱 Falar com Leandro', action: () => window.open(KB.whatsapp, '_blank') },
                        { label: '🏠 Ver imóveis', next: 'flow_catalogo' },
                        { label: '↩ Menu', next: 'inicio' },
                    ],
                };

            case 'COMO_FUNCIONA_SITE':
                return {
                    text: `🌐 **Como usar o site:**\n\n**1.** Na página principal, veja os **destaques** e **bairros**\n**2.** Clique em **"Ver Imóveis"** para o catálogo completo\n**3.** Use os **filtros** (bairro, quartos, preço) para refinar\n**4.** Clique em qualquer imóvel para ver **fotos e detalhes**\n**5.** Fale com o **Leandro** pelo WhatsApp para agendar visita\n\n💡 Você também pode me perguntar aqui! Ex: "Tem 2 quartos em Ipanema?"`,
                    opts: [
                        { label: '🏠 Ver catálogo', action: () => { window.location.href = 'imoveis.html'; } },
                        { label: '📍 Explorar bairros', next: 'flow_bairros' },
                        { label: '↩ Menu', next: 'inicio' },
                    ],
                };

            case 'AGENDAR_VISITA': {
                const bairroRef = _ctx.lastBairro || '';
                const waMsg = `Olá Leandro! Gostaria de agendar uma visita${bairroRef ? ' em ' + bairroRef : ''}. Quando posso ir?`;
                return {
                    text: `📅 **Agendar visita:**\n\nO **${KB.nome}** agenda visitas pessoalmente!\n\n• 🕐 **Seg–Sex:** 8h às 20h\n• 🕐 **Sábado:** 9h às 18h\n• 🕐 **Domingo:** Sob agendamento\n\n${bairroRef ? `📍 Quer visitar imóveis em **${bairroRef}**? Perfeito!\n\n` : ''}Mande mensagem para combinar o melhor horário:`,
                    opts: [
                        { label: '📱 Agendar pelo WhatsApp', action: () => window.open(KB.wa(waMsg), '_blank') },
                        { label: '↩ Menu', next: 'inicio' },
                    ],
                };
            }

            case 'URGENTE':
                return {
                    text: `⚡ **Precisa rápido?**\n\nO **${KB.nome}** entende a urgência!\n\nLigue ou mande WhatsApp agora:\n📱 **${KB.tel}**\n\nEle costuma responder em **menos de 15 minutos** durante o horário comercial!`,
                    opts: [
                        { label: '📱 WhatsApp AGORA', action: () => window.open(KB.wa('Olá Leandro! Estou com urgência para encontrar um imóvel. Pode me ajudar agora?'), '_blank') },
                        { label: '↩ Menu', next: 'inicio' },
                    ],
                };

            case 'CONDOMINIO':
                return {
                    text: `🏢 **Sobre taxas de condomínio:**\n\n**Média mensal no Rio (2025):**\n• 🌊 Ipanema/Leblon: R$ 1.200–3.000\n• 🏝️ Copacabana: R$ 800–2.000\n• 🏙️ Barra: R$ 600–1.800\n• 🌴 Recreio: R$ 400–1.200\n\n💡 Depende do tamanho, lazer e infraestrutura do prédio.\n\n${_ctx.lastBairro ? `Para **${_ctx.lastBairro}** especificamente, o Leandro pode detalhar!` : 'O Leandro tem os valores exatos de cada imóvel!'}`,
                    opts: [
                        { label: '📱 Perguntar valores exatos', action: () => window.open(KB.wa(`Olá Leandro! Quanto é o condomínio dos imóveis${_ctx.lastBairro ? ' em ' + _ctx.lastBairro : ''}?`), '_blank') },
                        { label: '↩ Menu', next: 'inicio' },
                    ],
                };

            case 'REFORMA':
                return {
                    text: `🔨 **Estado dos imóveis:**\n\nCada anúncio do Leandro detalha o estado:\n\n• ✅ **Reformado** — pronto para morar\n• 🔧 **Semi-reformado** — pequenos ajustes\n• 🏗️ **Para reformar** — preço menor, potencial de valorização\n\n💡 Imóvel para reformar pode custar **20–30% menos** e valorizar muito após a reforma!\n\nO Leandro indica **arquitetos parceiros** quando necessário.`,
                    opts: [
                        { label: '📱 Consultar estado do imóvel', action: () => window.open(KB.wa('Olá Leandro! Quero saber o estado de conservação dos imóveis.'), '_blank') },
                        { label: '🏠 Ver catálogo', action: () => { window.location.href = 'imoveis.html'; } },
                        { label: '↩ Menu', next: 'inicio' },
                    ],
                };

            case 'VIZINHANCA': {
                const bRef = _ctx.lastBairro || 'Rio de Janeiro';
                return {
                    text: `🏘️ **Vizinhança e infraestrutura ${_ctx.lastBairro ? 'de ' + _ctx.lastBairro : 'no Rio'}:**\n\nO Leandro conhece cada rua! Ele avalia:\n\n• 🏫 Escolas e creches na região\n• 🏥 Hospitais e clínicas\n• 🛒 Supermercados e comércios\n• 🌳 Parques e áreas de lazer\n• 🚇 Transporte público\n• 🔒 Segurança do bairro\n\n💡 Na visita, ele mostra toda a infraestrutura ao redor!`,
                    opts: [
                        { label: '📱 Perguntar sobre a região', action: () => window.open(KB.wa(`Olá Leandro! Como é a vizinhança e infraestrutura ${_ctx.lastBairro ? 'em ' + _ctx.lastBairro : 'dos imóveis'}?`), '_blank') },
                        ...(_ctx.lastBairroKey ? [{ label: `📍 Sobre ${_ctx.lastBairro}`, next: `flow_${_ctx.lastBairroKey}` }] : []),
                        { label: '↩ Menu', next: 'inicio' },
                    ],
                };
            }

            case 'COMPARAR_BAIRROS': {
                const bairrosNoRio = [
                    { key: 'ipanema', nome: 'Ipanema', perfil: 'Praia, vida noturna, alto padrão', preco: 'R$ 12–20k/m²' },
                    { key: 'leblon', nome: 'Leblon', perfil: 'Familiar, seguro, mais caro do Brasil', preco: 'R$ 15–25k/m²' },
                    { key: 'copacabana', nome: 'Copacabana', perfil: 'Turístico, Airbnb, acessível', preco: 'R$ 8–14k/m²' },
                    { key: 'botafogo', nome: 'Botafogo', perfil: 'Em valorização, jovem, metrô', preco: 'R$ 8–13k/m²' },
                    { key: 'barra', nome: 'Barra da Tijuca', perfil: 'Moderno, condomínios, família', preco: 'R$ 6–12k/m²' },
                    { key: 'recreio', nome: 'Recreio', perfil: 'Tranquilo, natureza, custo-benefício', preco: 'R$ 5–9k/m²' },
                ];
                const table = bairrosNoRio.map(b => `• **${b.nome}:** ${b.perfil} · ${b.preco}`).join('\n');
                return {
                    text: `📊 **Comparação de bairros:**\n\n${table}\n\n💡 Cada bairro tem um perfil único! Me pergunta sobre qualquer um para detalhes.`,
                    opts: [
                        { label: '📍 Ver todos os bairros', next: 'flow_bairros' },
                        { label: '📱 Ajuda do Leandro para escolher', action: () => window.open(KB.wa('Olá Leandro! Estou em dúvida entre bairros. Pode me ajudar a escolher?'), '_blank') },
                        { label: '↩ Menu', next: 'inicio' },
                    ],
                };
            }

            default:
                return null;
        }
    }

    // ═══════════════════════════════════════════════════════
    //  FLOWS — MENUS GUIADOS
    // ═══════════════════════════════════════════════════════
    const FLOWS = {
        inicio: {
            msg: () => {
                const r = _resumoEstoque();
                const estoqueInfo = r ? `\n\n📊 Temos **${r.total} imóvel${r.total !== 1 ? 'is' : ''}** disponíveis em **${r.bairros.length} bairro${r.bairros.length !== 1 ? 's' : ''}**.` : '';
                return `Olá! 👋 Sou o assistente do **${KB.nome}**, corretor especialista no Rio de Janeiro.${estoqueInfo}\n\nPode me perguntar qualquer coisa! Escolha abaixo ou **escreva sua dúvida livremente**:`;
            },
            opts: [
                { label: '🏠 Ver imóveis disponíveis',  next: 'flow_catalogo'      },
                { label: '📍 Explorar bairros',          next: 'flow_bairros'       },
                { label: '💰 Preços & investimento',     next: 'flow_precos'        },
                { label: '💳 Financiamento & FGTS',      next: 'flow_financiamento' },
                { label: '👤 Quem é o Leandro?',         next: 'flow_sobre'         },
                { label: '💰 Avaliar meu imóvel',        next: 'flow_avaliar'       },
                { label: '📞 Falar agora',               action: () => window.open(KB.whatsapp, '_blank') },
            ],
        },

        flow_catalogo: {
            msg: () => {
                const r = _resumoEstoque();
                if (!r) return '📋 Carregando catálogo... Acesse o site para ver em tempo real!';
                const bList = r.bairros.slice(0, 5).join(', ') + (r.bairros.length > 5 ? ` e mais ${r.bairros.length - 5}` : '');
                return `📋 **${r.total} imóvel${r.total !== 1 ? 'is' : ''} disponíve${r.total !== 1 ? 'is' : 'l'}**\n\n📍 ${bList}${r.terrenos ? `\n🏗️ ${r.terrenos} terreno${r.terrenos !== 1 ? 's' : ''}` : ''}${r.dest ? `\n⭐ ${r.dest} em destaque` : ''}\n\nFiltrar por:`;
            },
            opts: [
                { label: '🌊 Zona Sul',          next: 'flow_zona_sul'  },
                { label: '🏙️ Barra & Recreio',   next: 'flow_barra'     },
                { label: '⭐ Destaques',          next: 'flow_destaques' },
                { label: '🏗️ Terrenos',          next: 'flow_terrenos'  },
                { label: '💰 Até R$ 600k',       next: 'flow_ate600'    },
                { label: '🏠 Ver todos no site', action: () => { window.location.href = 'imoveis.html'; } },
                { label: '↩ Menu',               next: 'inicio'         },
            ],
        },

        flow_zona_sul: {
            msg: () => {
                const bZS = ['Ipanema', 'Leblon', 'Copacabana', 'Botafogo', 'Flamengo'];
                const lista = _catalogoImoveis.filter(i => bZS.includes(i.bairro));
                if (!lista.length) return '🌊 Não há imóveis da Zona Sul no catálogo agora. O Leandro tem opções exclusivas!';
                const preview = lista.slice(0, 3).map(_renderCard).join('\n\n');
                return `🌊 **Zona Sul — ${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} disponíve${lista.length !== 1 ? 'is' : 'l'}**\n\n${preview}${lista.length > 3 ? `\n\n_...e mais ${lista.length - 3}_` : ''}`;
            },
            opts: () => [
                { label: '🏠 Ver todos no site', action: () => { window.location.href = 'imoveis.html?region=zona-sul'; } },
                { label: '📱 Falar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero imóveis na Zona Sul.'), '_blank') },
                { label: '↩ Catálogo', next: 'flow_catalogo' },
            ],
        },

        flow_barra: {
            msg: () => {
                const bBR = ['Barra da Tijuca', 'Barra Olímpica', 'Recreio dos Bandeirantes', 'Jacarepaguá', 'Vargem Grande', 'Vargem Pequena', 'Pedra de Guaratiba', 'Grumari'];
                const lista = _catalogoImoveis.filter(i => bBR.includes(i.bairro));
                if (!lista.length) return '🏙️ Não há imóveis da Barra/Recreio no catálogo agora. O Leandro tem opções exclusivas!';
                const preview = lista.slice(0, 3).map(_renderCard).join('\n\n');
                return `🏙️ **Barra & Recreio — ${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} disponíve${lista.length !== 1 ? 'is' : 'l'}**\n\n${preview}${lista.length > 3 ? `\n\n_...e mais ${lista.length - 3}_` : ''}`;
            },
            opts: () => [
                { label: '🏠 Ver todos no site', action: () => { window.location.href = 'imoveis.html?region=barra-recreio'; } },
                { label: '📱 Falar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero imóveis na Barra ou Recreio.'), '_blank') },
                { label: '↩ Catálogo', next: 'flow_catalogo' },
            ],
        },

        flow_terrenos: {
            msg: () => {
                const lista = _getByTipo('Terreno');
                if (!lista.length) return '🏗️ Não há terrenos no catálogo agora. O Leandro tem terrenos exclusivos!';
                return `🏗️ **${lista.length} terreno${lista.length !== 1 ? 's' : ''} disponíve${lista.length !== 1 ? 'is' : 'l'}:**\n\n${lista.slice(0, 3).map(im => `🏗️ **${im.titulo}** — ${im.bairro} · ${im.area}m² · ${_formatPreco(im.preco)}`).join('\n')}`;
            },
            opts: () => [
                { label: '🏠 Ver no site', action: () => { window.location.href = 'imoveis.html?tipo=Terreno'; } },
                { label: '📱 Consultar Leandro', action: () => window.open(KB.wa('Olá Leandro! Tenho interesse em terrenos no Rio.'), '_blank') },
                { label: '↩ Catálogo', next: 'flow_catalogo' },
            ],
        },

        flow_destaques: {
            msg: () => {
                const lista = _getDestaques();
                const base = lista.length ? lista : _catalogoImoveis.slice(0, 3);
                if (!base.length) return '⭐ Veja o catálogo completo no site!';
                return `⭐ **Imóveis em destaque:**\n\n${base.slice(0, 3).map(_renderCard).join('\n\n')}`;
            },
            opts: () => [
                { label: '🏠 Ver todos no site', action: () => { window.location.href = 'imoveis.html'; } },
                { label: '📱 Falar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Vi os destaques. Quero saber mais!'), '_blank') },
                { label: '↩ Catálogo', next: 'flow_catalogo' },
            ],
        },

        flow_ate600: {
            msg: () => {
                const lista = _catalogoImoveis.filter(i => parseFloat(i.preco || 0) <= 600000);
                return lista.length
                    ? `💰 **${lista.length} imóvel${lista.length !== 1 ? 'is' : ''} até R$ 600k:**\n\n${lista.slice(0, 3).map(_renderCard).join('\n\n')}`
                    : `💰 Não há imóveis até R$ 600k no catálogo agora. Consulte o Leandro para opções exclusivas!`;
            },
            opts: () => [
                { label: '🔍 Ver no site', action: () => { window.location.href = 'imoveis.html?preco=0-600000'; } },
                { label: '💳 Posso financiar?', next: 'flow_financiamento' },
                { label: '📱 Falar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Procuro imóvel até R$ 600k.'), '_blank') },
                { label: '↩ Catálogo', next: 'flow_catalogo' },
            ],
        },

        flow_bairros: {
            msg: () => {
                const bairros = _getBairrosDisponiveis();
                if (bairros.length) {
                    const lista = bairros.map(b => { const n = _catalogoImoveis.filter(i => i.bairro === b).length; return `📍 **${b}** (${n})`; }).join(' · ');
                    return `📍 **Bairros disponíveis:**\n${lista}\n\nQual te interessa?`;
                }
                return '📍 Atendo toda a Zona Sul e Barra da Tijuca. Selecione:';
            },
            opts: [
                { label: '🌊 Ipanema',          next: 'flow_ipanema'    },
                { label: '🏖️ Leblon',           next: 'flow_leblon'     },
                { label: '🏝️ Copacabana',       next: 'flow_copa'       },
                { label: '🌿 Botafogo',          next: 'flow_botafogo'   },
                { label: '🌅 Flamengo',          next: 'flow_flamengo'   },
                { label: '🏙️ Barra da Tijuca',  next: 'flow_barra_info' },
                { label: '🌴 Recreio',           next: 'flow_recreio'    },
                { label: '🏗️ Barra Olímpica',   next: 'flow_bo'         },
                { label: '↩ Menu',               next: 'inicio'          },
            ],
        },

        // Bairros individuais — chamam gerarResposta
        flow_ipanema:    { msg: () => gerarResposta({ intent: 'INFO_BAIRRO', bairro: 'ipanema' })?.text    || '', opts: () => gerarResposta({ intent: 'INFO_BAIRRO', bairro: 'ipanema' })?.opts    || [] },
        flow_leblon:     { msg: () => gerarResposta({ intent: 'INFO_BAIRRO', bairro: 'leblon' })?.text     || '', opts: () => gerarResposta({ intent: 'INFO_BAIRRO', bairro: 'leblon' })?.opts     || [] },
        flow_copa:       { msg: () => gerarResposta({ intent: 'INFO_BAIRRO', bairro: 'copacabana' })?.text || '', opts: () => gerarResposta({ intent: 'INFO_BAIRRO', bairro: 'copacabana' })?.opts || [] },
        flow_botafogo:   { msg: () => gerarResposta({ intent: 'INFO_BAIRRO', bairro: 'botafogo' })?.text   || '', opts: () => gerarResposta({ intent: 'INFO_BAIRRO', bairro: 'botafogo' })?.opts   || [] },
        flow_flamengo:   { msg: () => gerarResposta({ intent: 'INFO_BAIRRO', bairro: 'flamengo' })?.text   || '', opts: () => gerarResposta({ intent: 'INFO_BAIRRO', bairro: 'flamengo' })?.opts   || [] },
        flow_barra_info: { msg: () => gerarResposta({ intent: 'INFO_BAIRRO', bairro: 'barra' })?.text      || '', opts: () => gerarResposta({ intent: 'INFO_BAIRRO', bairro: 'barra' })?.opts      || [] },
        flow_recreio:    { msg: () => gerarResposta({ intent: 'INFO_BAIRRO', bairro: 'recreio' })?.text    || '', opts: () => gerarResposta({ intent: 'INFO_BAIRRO', bairro: 'recreio' })?.opts    || [] },
        flow_bo:         { msg: () => gerarResposta({ intent: 'INFO_BAIRRO', bairro: 'barraOlimpica' })?.text || '', opts: () => gerarResposta({ intent: 'INFO_BAIRRO', bairro: 'barraOlimpica' })?.opts || [] },

        flow_precos: {
            msg: 'Sobre qual aspecto de preços você quer saber?',
            opts: [
                { label: '📊 Preços por bairro',      next: 'flow_bairros'    },
                { label: '📈 Valorização do mercado', next: 'flow_valorizacao' },
                { label: '🏠 Airbnb & temporada',     next: 'flow_airbnb'     },
                { label: '🏢 Renda com aluguel',      next: 'flow_aluguel'    },
                { label: '↩ Menu',                    next: 'inicio'          },
            ],
        },

        flow_valorizacao: { msg: () => gerarResposta({ intent: 'VALORIZACAO' })?.text || '', opts: () => gerarResposta({ intent: 'VALORIZACAO' })?.opts || [] },
        flow_airbnb:      { msg: () => gerarResposta({ intent: 'AIRBNB' })?.text || '',      opts: () => gerarResposta({ intent: 'AIRBNB' })?.opts || [] },
        flow_aluguel:     { msg: () => gerarResposta({ intent: 'ALUGUEL' })?.text || '',     opts: () => gerarResposta({ intent: 'ALUGUEL' })?.opts || [] },

        flow_financiamento: {
            msg: () => gerarResposta({ intent: 'FINANCIAMENTO' })?.text || '',
            opts: [
                { label: '💰 Posso usar FGTS?',       next: 'flow_fgts'      },
                { label: '🏦 Qual banco é melhor?',   next: 'flow_bancos'    },
                { label: '📊 Qual a entrada mínima?', next: 'flow_entrada'   },
                { label: '✅ Serei aprovado?',          next: 'flow_aprovacao' },
                { label: '📱 Simular com Leandro',    action: () => window.open(KB.wa('Olá Leandro! Quero simular um financiamento imobiliário.'), '_blank') },
                { label: '↩ Menu',                     next: 'inicio'         },
            ],
        },

        flow_fgts:     { msg: () => gerarResposta({ intent: 'FGTS' })?.text || '',      opts: [{ label: '📱 Verificar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero usar FGTS para comprar.'), '_blank') }, { label: '↩ Financiamento', next: 'flow_financiamento' }] },
        flow_bancos:   { msg: () => gerarResposta({ intent: 'JUROS' })?.text || '',     opts: [{ label: '📱 Buscar melhor taxa', action: () => window.open(KB.wa('Olá Leandro! Quero o banco com melhor taxa.'), '_blank') }, { label: '↩ Financiamento', next: 'flow_financiamento' }] },
        flow_entrada:  { msg: () => gerarResposta({ intent: 'ENTRADA' })?.text || '',   opts: [{ label: '📱 Planejar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero entender a entrada.'), '_blank') }, { label: '↩ Financiamento', next: 'flow_financiamento' }] },
        flow_aprovacao:{ msg: () => gerarResposta({ intent: 'APROVACAO' })?.text || '', opts: [{ label: '📱 Pré-análise gratuita', action: () => window.open(KB.wa('Olá Leandro! Quero pré-análise de crédito.'), '_blank') }, { label: '↩ Financiamento', next: 'flow_financiamento' }] },

        flow_sobre: {
            msg: () => `👤 **${KB.nome}** — Corretor de Imóveis\n\n${KB.historia.resumo}\n\nSobre o que quer saber?`,
            opts: [
                { label: '📖 Trajetória completa',     next: 'flow_historia'    },
                { label: '✨ Diferenciais',             next: 'flow_diferencial' },
                { label: '🏆 Conquistas e resultados', next: 'flow_conquistas'  },
                { label: '⭐ Depoimentos',              next: 'flow_depoimentos' },
                { label: '📱 Falar com Leandro',       action: () => window.open(KB.whatsapp, '_blank') },
                { label: '↩ Menu',                      next: 'inicio' },
            ],
        },

        flow_historia:    { msg: () => gerarResposta({ intent: 'LEANDRO_HISTORIA' })?.text    || '', opts: () => gerarResposta({ intent: 'LEANDRO_HISTORIA' })?.opts    || [] },
        flow_diferencial: { msg: () => gerarResposta({ intent: 'LEANDRO_DIFERENCIAL' })?.text || '', opts: () => gerarResposta({ intent: 'LEANDRO_DIFERENCIAL' })?.opts || [] },
        flow_conquistas:  { msg: () => gerarResposta({ intent: 'LEANDRO_CONQUISTAS' })?.text  || '', opts: () => gerarResposta({ intent: 'LEANDRO_CONQUISTAS' })?.opts  || [] },
        flow_depoimentos: { msg: () => gerarResposta({ intent: 'DEPOIMENTOS' })?.text         || '', opts: () => gerarResposta({ intent: 'DEPOIMENTOS' })?.opts         || [] },

        flow_avaliar: {
            msg: '💰 O Leandro faz avaliação **gratuita** do seu imóvel com análise real de mercado. Qual o tipo?',
            opts: [
                { label: '🏢 Apartamento', action: () => window.open(KB.wa('Olá Leandro! Quero avaliação gratuita do meu apartamento.'), '_blank') },
                { label: '🏠 Casa',         action: () => window.open(KB.wa('Olá Leandro! Quero avaliação gratuita da minha casa.'), '_blank') },
                { label: '🌆 Cobertura',    action: () => window.open(KB.wa('Olá Leandro! Quero avaliação gratuita da minha cobertura.'), '_blank') },
                { label: '🏗️ Terreno',     action: () => window.open(KB.wa('Olá Leandro! Quero avaliação gratuita do meu terreno.'), '_blank') },
                { label: '↩ Menu',          next: 'inicio' },
            ],
        },

        // Auxiliares
        flow_praia:        { msg: () => gerarResposta({ intent: 'PERTO_PRAIA' })?.text    || '', opts: () => gerarResposta({ intent: 'PERTO_PRAIA' })?.opts    || [] },
        flow_tranquilo:    { msg: () => gerarResposta({ intent: 'TRANQUILO' })?.text      || '', opts: () => gerarResposta({ intent: 'TRANQUILO' })?.opts      || [] },
        flow_familia:      { msg: () => gerarResposta({ intent: 'FAMILIA' })?.text        || '', opts: () => gerarResposta({ intent: 'FAMILIA' })?.opts        || [] },
        flow_investimento: { msg: () => gerarResposta({ intent: 'INVESTIMENTO' })?.text   || '', opts: () => gerarResposta({ intent: 'INVESTIMENTO' })?.opts   || [] },
        flow_metro:        { msg: () => gerarResposta({ intent: 'METRO' })?.text          || '', opts: () => gerarResposta({ intent: 'METRO' })?.opts          || [] },
    };

    // ═══════════════════════════════════════════════════════
    //  SISTEMA DE CONTEXTO DE CONVERSA
    //  Rastreia tópicos, bairros, tipos e preferências do
    //  usuário para respostas contextuais inteligentes
    // ═══════════════════════════════════════════════════════
    const _ctx = {
        lastIntent: null,
        lastBairro: null,
        lastBairroKey: null,
        lastTipo: null,
        lastPreco: null,
        lastQuartos: null,
        lastSuites: null,
        lastSearchResults: [],
        topicHistory: [],
        userName: null,
        stage: 'browsing', // browsing → interested → ready_to_buy
        msgCount: 0,
        interests: new Set(),
        mentionedBairros: new Set(),
    };

    function _updateCtx(intentObj, resp) {
        if (!intentObj) return;
        _ctx.lastIntent = intentObj.intent;
        _ctx.msgCount++;
        if (intentObj.bairro) {
            const canonical = typeof intentObj.bairro === 'string' ? intentObj.bairro : null;
            if (canonical) {
                // Resolve canonical bairro name
                const bKey = Object.entries(KB.bairros).find(([, v]) => v.nome === canonical)?.[0];
                _ctx.lastBairro = canonical;
                _ctx.lastBairroKey = bKey || intentObj.bairro;
                _ctx.mentionedBairros.add(canonical);
            } else {
                _ctx.lastBairroKey = intentObj.bairro;
                const bData = KB.bairros[intentObj.bairro];
                if (bData) {
                    _ctx.lastBairro = bData.nome;
                    _ctx.mentionedBairros.add(bData.nome);
                }
            }
        }
        if (intentObj.tipo) _ctx.lastTipo = intentObj.tipo;
        if (intentObj.preco) _ctx.lastPreco = intentObj.preco;
        if (intentObj.quartos) _ctx.lastQuartos = intentObj.quartos;
        if (intentObj.suites) _ctx.lastSuites = intentObj.suites;
        _ctx.topicHistory.push(intentObj.intent);
        if (_ctx.topicHistory.length > 10) _ctx.topicHistory.shift();
        // Track stage
        const buySignals = ['COMO_COMPRAR','FINANCIAMENTO','FGTS','ENTRADA','DOCUMENTACAO','CONTATO_GERAL','CONTATO_TEL'];
        const interestSignals = ['BUSCA_ESPECIFICA','INFO_BAIRRO','CATALOGO_GERAL','DESTAQUES','MAIS_BARATO','MAIS_CARO'];
        if (buySignals.includes(intentObj.intent)) _ctx.stage = 'ready_to_buy';
        else if (interestSignals.includes(intentObj.intent) && _ctx.stage === 'browsing') _ctx.stage = 'interested';
        // Track interests
        if (intentObj.intent.startsWith('INFO_BAIRRO')) _ctx.interests.add('bairros');
        if (['INVESTIMENTO','AIRBNB','ALUGUEL','VALORIZACAO'].includes(intentObj.intent)) _ctx.interests.add('investimento');
        if (['FINANCIAMENTO','FGTS','ENTRADA'].includes(intentObj.intent)) _ctx.interests.add('financiamento');
    }

    // Resolve contextual references like "esse bairro", "lá", "nessa região"
    function _resolveContextual(rawText) {
        const t = normFull(rawText);
        // Pronomial references to last bairro
        if (_ctx.lastBairro && matchAny(t, [
            'la','esse bairro','nesse bairro','nessa regiao','dessa regiao',
            'desse bairro','ali','no lugar','na regiao','na mesma regiao',
            'mesmo local','mesmo bairro','esse lugar','nesse lugar',
        ])) {
            return _ctx.lastBairro;
        }
        return null;
    }

    // ═══════════════════════════════════════════════════════
    //  ESTADO DO WIDGET
    // ═══════════════════════════════════════════════════════
    let isOpen     = false;
    let hasGreeted = false;
    let _sessionId = null;
    let _msgCount  = 0;
    let _chatPath  = [];

    // ── Anúncio: persiste em localStorage para não repetir entre páginas ──
    const _ANNOUNCE_KEY = '_lb_chat_announce_dismissed';
    let _announceDismissed = !!localStorage.getItem(_ANNOUNCE_KEY);

    function _getDeviceId() {
        let id = localStorage.getItem('_lb_did');
        if (!id) { id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9); localStorage.setItem('_lb_did', id); }
        return id;
    }
    function _getNow() { return new Date().toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' }); }
    function _timeNow() { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }

    // ── LOGGING ──
    function _log(event, data = {}) {
        try {
            if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
            const db = firebase.firestore();
            if (!_sessionId) _sessionId = _getDeviceId() + '_chat_' + Date.now().toString(36);
            db.collection('chat_logs').add({
                sessionId: _sessionId, deviceId: _getDeviceId(), event,
                page: window.location.pathname.split('/').pop() || 'index',
                date: new Date().toISOString().slice(0, 10),
                horaStr: _getNow(), hora: _timeNow(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                ip: _clientIP || '—', cidade: _clientGeo.cidade || '—',
                regiao: _clientGeo.regiao || '—', pais: _clientGeo.pais || '—',
                isp: _clientGeo.isp || '—', isProxy: _clientGeo.isProxy || false,
                userAgent: navigator.userAgent.slice(0, 200),
                msgCount: _msgCount, chatPath: _chatPath.slice(-10).join('→'),
                ...data,
            }).catch(() => {});
        } catch (e) {}
    }

    // ═══════════════════════════════════════════════════════
    //  CRIAÇÃO DO WIDGET
    // ═══════════════════════════════════════════════════════
    function createWidget() {
        if (document.getElementById('lb-chat-btn')) return;

        const style = document.createElement('style');
        style.id = '_lb-chat-styles-v7';
        style.textContent = `
        /* ── Wrapper do botão ── */
        #lb-chat-wrapper {
            position: fixed; bottom: 5.5rem; left: 1.5rem; z-index: 800;
            display: flex; align-items: flex-end; gap: 0;
            animation: lb-bounceIn .6s cubic-bezier(.22,1,.36,1) both;
            animation-delay: 2s; opacity: 0;
        }
        #lb-chat-btn {
            width: 56px; height: 56px; border-radius: 50%;
            background: linear-gradient(135deg, #3498db, #2c3e50);
            border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 20px rgba(52,152,219,.45);
            transition: transform .25s, box-shadow .25s;
            flex-shrink: 0; position: relative;
        }
        #lb-chat-btn:hover { transform: scale(1.1); box-shadow: 0 8px 28px rgba(52,152,219,.6); }
        #lb-chat-btn svg { width: 26px; height: 26px; transition: transform .3s; }
        #lb-chat-btn.open svg { transform: rotate(90deg); }
        .lb-notif-dot {
            position: absolute; top: 4px; right: 4px;
            width: 12px; height: 12px; background: #ef4444; border-radius: 50%;
            border: 2px solid #0a0a0a; animation: lb-pulse-dot 2s ease-in-out infinite;
        }

        /* ── Mini anúncio lateral ── */
        #lb-chat-announce {
            display: flex; align-items: center; margin-left: 8px;
            max-width: 200px; opacity: 0; pointer-events: all;
            animation: lb-announceIn .5s cubic-bezier(.22,1,.36,1) both;
            animation-delay: 3s;
        }
        @keyframes lb-announceIn { from{opacity:0;transform:translateX(-10px) scale(.95);}to{opacity:1;transform:translateX(0) scale(1);} }
        #lb-chat-announce.hidden {
            display: none !important;
            animation: none !important;
        }
        .lb-announce-arrow { width:0;height:0;border-top:7px solid transparent;border-bottom:7px solid transparent;border-right:8px solid rgba(52,152,219,.25);flex-shrink:0; }
        .lb-announce-box {
            background: rgba(15,25,40,.97); border: 1px solid rgba(52,152,219,.3);
            border-radius: 12px; padding: 7px 10px 7px 9px;
            display: flex; align-items: flex-start; gap: 6px;
            box-shadow: 0 4px 20px rgba(0,0,0,.5); position: relative;
        }
        .lb-announce-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
        .lb-announce-text { font-size: 11px; line-height: 1.4; color: rgba(255,255,255,.85); font-family:'Montserrat',sans-serif; font-weight:500; flex:1; }
        .lb-announce-text strong { color:#7dd3fc; font-weight:700; display:block; font-size:10.5px; }
        .lb-announce-close { background:none;border:none;color:rgba(255,255,255,.25);cursor:pointer;font-size:11px;padding:0;line-height:1;flex-shrink:0;transition:color .2s; }
        .lb-announce-close:hover { color: rgba(255,255,255,.65); }
        .lb-announce-dot { display:inline-block;width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 5px #22c55e;animation:lb-pulse-dot 1.5s ease-in-out infinite;vertical-align:middle;margin-right:3px; }

        @media (max-width:480px) {
            #lb-chat-wrapper { bottom: 4.8rem; left: .8rem; }
            #lb-chat-announce { max-width: 155px; }
            .lb-announce-text { font-size: 10px; }
        }
        @media (max-width:380px) {
            #lb-chat-announce { max-width: 130px; }
            .lb-announce-box { padding: 5px 7px; }
        }

        /* ── Janela do chat ── */
        #lb-chat-window {
            position:fixed; bottom:7.5rem; left:1.5rem;
            width:370px; max-height:620px;
            background:#0f1923; border:1px solid rgba(52,152,219,.2);
            border-radius:20px; box-shadow:0 20px 60px rgba(0,0,0,.7);
            display:flex; flex-direction:column; z-index:799; overflow:hidden;
            transform:scale(.85) translateY(20px); opacity:0; pointer-events:none;
            transition:transform .3s cubic-bezier(.22,1,.36,1),opacity .3s;
        }
        #lb-chat-window.open { transform:scale(1) translateY(0); opacity:1; pointer-events:all; }

        /* Header */
        .lb-chat-header {
            background:linear-gradient(135deg,rgba(52,152,219,.18),rgba(44,62,80,.45));
            border-bottom:1px solid rgba(52,152,219,.15);
            padding:.9rem 1rem; display:flex; align-items:center; gap:.75rem; flex-shrink:0;
        }
        .lb-chat-avatar {
            width:40px;height:40px;border-radius:50%;
            background:linear-gradient(135deg,#3498db,#9b59b6);
            display:flex;align-items:center;justify-content:center;font-size:1.1rem;
            flex-shrink:0;position:relative;
        }
        .lb-chat-avatar::after { content:'';position:absolute;bottom:1px;right:1px;width:10px;height:10px;background:#22c55e;border-radius:50%;border:2px solid #0f1923; }
        .lb-chat-name { font-size:.9rem;font-weight:700;color:#fff;line-height:1.2; }
        .lb-chat-subtitle { font-size:.68rem;color:rgba(255,255,255,.45);margin-top:.1rem; }
        .lb-chat-status { font-size:.72rem;color:#22c55e;display:flex;align-items:center;gap:.3rem;margin-top:.15rem; }
        .lb-chat-status-dot { width:7px;height:7px;background:#22c55e;border-radius:50%;display:inline-block;animation:lb-pulse-dot 2s infinite; }
        .lb-badge-estoque { display:inline-flex;align-items:center;gap:.25rem;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.22);color:#22c55e;font-size:.6rem;font-weight:700;padding:.1rem .45rem;border-radius:99px;margin-left:.35rem; }
        .lb-header-actions { margin-left:auto;display:flex;gap:.3rem; }
        .lb-header-btn { background:rgba(255,255,255,.07);border:none;color:rgba(255,255,255,.5);width:30px;height:30px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.72rem;transition:all .2s; }
        .lb-header-btn:hover { background:rgba(255,255,255,.15);color:#fff; }

        /* Mensagens */
        .lb-chat-messages {
            flex:1;overflow-y:auto;padding:.85rem;
            display:flex;flex-direction:column;gap:.6rem;
            scrollbar-width:thin;scrollbar-color:rgba(52,152,219,.3) transparent;
        }
        .lb-chat-messages::-webkit-scrollbar { width:4px; }
        .lb-chat-messages::-webkit-scrollbar-thumb { background:rgba(52,152,219,.3);border-radius:2px; }
        .lb-msg { max-width:93%;padding:.65rem .9rem;border-radius:14px;font-size:.83rem;line-height:1.55;color:#e2e8f0;animation:lb-msgIn .25s ease both; }
        @keyframes lb-msgIn { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
        .lb-msg.bot { background:rgba(52,152,219,.1);border:1px solid rgba(52,152,219,.15);border-bottom-left-radius:4px;align-self:flex-start; }
        .lb-msg.bot strong { color:#7dd3fc; }
        .lb-msg.user { background:linear-gradient(135deg,rgba(52,152,219,.35),rgba(44,62,80,.5));border:1px solid rgba(52,152,219,.3);border-bottom-right-radius:4px;align-self:flex-end;text-align:right; }
        .lb-msg-time { font-size:.6rem;color:rgba(255,255,255,.22);margin-top:.2rem;display:block; }

        /* Typing */
        .lb-typing { display:flex;align-items:center;gap:4px;padding:.55rem .85rem;background:rgba(52,152,219,.08);border:1px solid rgba(52,152,219,.12);border-radius:14px;border-bottom-left-radius:4px;align-self:flex-start;animation:lb-msgIn .2s ease; }
        .lb-typing span { width:6px;height:6px;background:#7dd3fc;border-radius:50%;animation:lb-typingDot 1.2s ease-in-out infinite; }
        .lb-typing span:nth-child(2) { animation-delay:.2s; }
        .lb-typing span:nth-child(3) { animation-delay:.4s; }
        @keyframes lb-typingDot { 0%,80%,100%{transform:scale(.6);opacity:.4;}40%{transform:scale(1);opacity:1;} }

        /* Input */
        .lb-input-area { display:flex;align-items:center;gap:.4rem;padding:.6rem .75rem;border-top:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.2);flex-shrink:0; }
        .lb-text-input { flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(52,152,219,.2);border-radius:20px;padding:.48rem .9rem;color:#e2e8f0;font-size:.82rem;font-family:inherit;outline:none;transition:border-color .2s,background .2s; }
        .lb-text-input:focus { border-color:rgba(52,152,219,.5);background:rgba(255,255,255,.08); }
        .lb-text-input::placeholder { color:rgba(255,255,255,.25); }
        .lb-send-btn { width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#3498db,#2c3e50);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:.75rem;flex-shrink:0;transition:transform .2s,box-shadow .2s; }
        .lb-send-btn:hover { transform:scale(1.1);box-shadow:0 4px 12px rgba(52,152,219,.4); }

        /* ── Chips APENAS na barra inferior ── */
        .lb-chips { display:flex;flex-wrap:wrap;gap:.3rem;padding:.35rem .8rem .45rem;flex-shrink:0;border-top:1px solid rgba(255,255,255,.04); }
        .lb-chip { background:rgba(52,152,219,.1);border:1px solid rgba(52,152,219,.2);border-radius:99px;padding:.22rem .65rem;color:#93c5fd;font-size:.69rem;font-weight:500;cursor:pointer;transition:all .2s;white-space:nowrap; }
        .lb-chip:hover { background:rgba(52,152,219,.22);border-color:rgba(52,152,219,.45); }


        /* Footer */
        .lb-chat-footer { padding:.32rem .8rem;border-top:1px solid rgba(255,255,255,.04);font-size:.6rem;color:rgba(255,255,255,.15);text-align:center;flex-shrink:0; }

        /* Animações */
        @keyframes lb-bounceIn { from{opacity:0;transform:scale(.4) translateY(20px);}to{opacity:1;transform:scale(1) translateY(0);} }
        @keyframes lb-pulse-dot { 0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.35);opacity:.7;} }

        @media (max-width:480px) {
            #lb-chat-window { left:.5rem;right:.5rem;width:auto;bottom:6.2rem;max-height:520px; }
        }
        `;
        document.head.appendChild(style);

        // ── Wrapper ──
        const wrapper = document.createElement('div');
        wrapper.id = 'lb-chat-wrapper';

        // ── Botão ──
        const btn = document.createElement('button');
        btn.id = 'lb-chat-btn';
        btn.setAttribute('aria-label', 'Abrir assistente virtual de imóveis');
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="lb-notif-dot"></span>`;

        // ── Mini anúncio lateral ──
        const announce = document.createElement('div');
        announce.id = 'lb-chat-announce';
        // Se já foi dispensado em qualquer página, não mostra de novo
        if (_announceDismissed) announce.classList.add('hidden');
        announce.innerHTML = `<div class="lb-announce-arrow"></div><div class="lb-announce-box"><span class="lb-announce-icon">💬</span><div class="lb-announce-text"><strong><span class="lb-announce-dot"></span>Assistente Online</strong>Dúvidas sobre imóveis? Fale comigo!</div><button class="lb-announce-close" id="lb-announce-close" title="Fechar" aria-label="Fechar">✕</button></div>`;

        wrapper.appendChild(btn);
        wrapper.appendChild(announce);

        // ── Janela ──
        const win = document.createElement('div');
        win.id = 'lb-chat-window';
        win.setAttribute('role', 'dialog');
        win.setAttribute('aria-label', 'Chat com assistente imobiliário');
        win.innerHTML = `
            <div class="lb-chat-header">
                <div class="lb-chat-avatar">🏠</div>
                <div>
                    <div class="lb-chat-name">Assistente Virtual LB<span class="lb-badge-estoque" id="lb-estoque-badge" style="display:none"></span></div>
                    <div class="lb-chat-subtitle">Seu assistente virtual - Pronto para te atender!</div>
                    <div class="lb-chat-status"><span class="lb-chat-status-dot"></span> Online</div>
                </div>
                <div class="lb-header-actions">
                    <button class="lb-header-btn" id="lb-restart-btn" title="Recomeçar conversa">↩</button>
                    <button class="lb-header-btn" id="lb-close-btn" title="Fechar">✕</button>
                </div>
            </div>
            <div class="lb-chat-messages" id="lb-messages"></div>
            <div class="lb-chips" id="lb-chips"></div>
            <div class="lb-input-area">
                <input type="text" class="lb-text-input" id="lb-text-input"
                    placeholder="Pergunte sobre imóveis, bairros, preços..." maxlength="400" autocomplete="off">
                <button class="lb-send-btn" id="lb-send-btn" aria-label="Enviar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
            </div>
            <div class="lb-chat-footer">Assistente virtual · ${KB.nome} · ${KB.creci}</div>
        `;

        document.body.appendChild(wrapper);
        document.body.appendChild(win);

        // ── Eventos ──
        btn.addEventListener('click', () => { dismissAnnounce(); toggleChat(); });

        document.getElementById('lb-announce-close').addEventListener('click', (e) => { e.stopPropagation(); dismissAnnounce(); });
        announce.querySelector('.lb-announce-box').addEventListener('click', (e) => {
            if (e.target.closest('#lb-announce-close')) return;
            dismissAnnounce();
            if (!isOpen) toggleChat();
        });

        win.querySelector('#lb-close-btn').addEventListener('click', () => { if (isOpen) toggleChat(); });
        win.querySelector('#lb-restart-btn').addEventListener('click', restartChat);

        const inp = win.querySelector('#lb-text-input');
        win.querySelector('#lb-send-btn').addEventListener('click', handleText);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) handleText(); });

        // Auto-ocultar anúncio em mobile após 8s
        if (window.innerWidth <= 480) {
            setTimeout(() => { if (!_announceDismissed && !isOpen) dismissAnnounce(); }, 8000);
        }

        renderChips();
    }

    function dismissAnnounce() {
        if (_announceDismissed) return;
        _announceDismissed = true;
        try { localStorage.setItem(_ANNOUNCE_KEY, '1'); } catch(_) {}
        const el = document.getElementById('lb-chat-announce');
        if (!el) return;
        // Animação de saída suave, depois esconde de verdade
        el.style.transition = 'opacity .25s ease, transform .25s ease';
        el.style.opacity = '0';
        el.style.transform = 'translateX(-8px) scale(.92)';
        setTimeout(() => { el.classList.add('hidden'); }, 260);
    }

    // ── Chips de atalho — APENAS na barra inferior ──
    const CHIPS_BASE = [
        { label: '🏠 Ver imóveis',   flow: 'flow_catalogo'      },
        { label: '📍 Bairros',       flow: 'flow_bairros'       },
        { label: '💰 Preços',        flow: 'flow_precos'        },
        { label: '💳 Financiamento', flow: 'flow_financiamento' },
        { label: '👤 Leandro',       flow: 'flow_sobre'         },
    ];

    function renderChips() {
        const el = document.getElementById('lb-chips');
        if (!el) return;
        const extras = [];
        if (_catalogoLoaded) {
            const terrenos = _getByTipo('Terreno');
            if (terrenos.length) extras.push({ label: `🏗️ Terrenos (${terrenos.length})`, flow: 'flow_terrenos' });
            const dest = _getDestaques();
            if (dest.length) extras.push({ label: `⭐ Destaques (${dest.length})`, flow: 'flow_destaques' });
        }
        const all = [...extras, ...CHIPS_BASE].slice(0, 6);
        el.innerHTML = all.map(c => `<span class="lb-chip" data-flow="${c.flow}">${c.label}</span>`).join('');
        el.querySelectorAll('.lb-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                _log('chat_chip', { label: chip.textContent, node: chip.dataset.flow });
                goTo(chip.dataset.flow);
            });
        });
    }

    // ── Toggle ──
    function toggleChat() {
        const btnEl = document.getElementById('lb-chat-btn');
        const winEl = document.getElementById('lb-chat-window');
        isOpen = !isOpen;
        btnEl.classList.toggle('open', isOpen);
        winEl.classList.toggle('open', isOpen);
        const dot = btnEl.querySelector('.lb-notif-dot');
        if (dot) dot.remove();
        if (isOpen && !hasGreeted) {
            hasGreeted = true;
            _log('chat_aberto', { page: window.location.pathname });
            renderChips();
            setTimeout(() => goTo('inicio'), 350);
        }
        if (isOpen) { scrollBottom(); setTimeout(() => document.getElementById('lb-text-input')?.focus(), 400); }
    }

    function restartChat() {
        const msgs = document.getElementById('lb-messages');
        if (msgs) msgs.innerHTML = '';
        _chatPath = []; _msgCount = 0; _sessionId = null;
        _log('chat_aberto', { page: window.location.pathname, restarted: true });
        renderChips();
        setTimeout(() => goTo('inicio'), 200);
    }

    // ── Tratamento de texto livre com contexto ──
    function handleText() {
        const inp = document.getElementById('lb-text-input');
        if (!inp) return;
        const text = inp.value.trim();
        if (!text) return;
        inp.value = '';
        _msgCount++;
        _ctx.msgCount++;
        addUserMsg(text);

        const intentObj = detectIntent(text);

        // Saudação → menu (com contexto)
        if (intentObj?.intent === 'SAUDACAO') {
            _log('chat_texto', { text: text.slice(0, 200), intentDetected: 'SAUDACAO', botResponse: 'flow:inicio' });
            if (_ctx.msgCount > 3 && _ctx.lastBairro) {
                // Return contextual greeting instead of full menu
                const resp = gerarResposta(intentObj);
                if (resp && resp.text) {
                    showTypingThen(() => {
                        addBotMsg(resp.text);
                        if (resp.opts?.length) setTimeout(() => addOpts(resp.opts), 380);
                    });
                    return;
                }
            }
            showTypingThen(() => goTo('inicio'));
            return;
        }

        const resp = intentObj ? gerarResposta(intentObj) : null;

        if (resp?.type === 'FLOW') {
            _log('chat_texto', { text: text.slice(0, 200), intentDetected: intentObj?.intent || '—', botResponse: 'flow:' + resp.flow });
            showTypingThen(() => goTo(resp.flow));
            return;
        }

        if (resp) {
            _log('chat_texto', { text: text.slice(0, 200), intentDetected: intentObj?.intent || intentObj?.type || '—', botResponse: (resp.text || '').slice(0, 300) });
            showTypingThen(() => {
                addBotMsg(resp.text);
                if (resp.opts?.length) setTimeout(() => addOpts(resp.opts), 380);
            });
            return;
        }

        // ── FALLBACK INTELIGENTE COM CONTEXTO ──
        // Tenta re-interpretar usando contexto antes de desistir
        const contextualFallback = _buildContextualFallback(text);
        if (contextualFallback) {
            _log('chat_texto', { text: text.slice(0, 200), intentDetected: 'ctx_fallback', botResponse: (contextualFallback.text || '').slice(0, 300) });
            showTypingThen(() => {
                addBotMsg(contextualFallback.text);
                if (contextualFallback.opts?.length) setTimeout(() => addOpts(contextualFallback.opts), 380);
            });
            return;
        }

        // Fallback final — conectar com Leandro
        _log('chat_texto', { text: text.slice(0, 200), intentDetected: 'fallback', botResponse: 'whatsapp' });
        const stageHint = _ctx.stage === 'ready_to_buy'
            ? `\n\n📌 Percebi que você está pronto para dar o próximo passo! O Leandro é **a pessoa certa** para finalizar tudo.`
            : '';
        showTypingThen(() => {
            addBotMsg(`Boa pergunta${_ctx.userName ? ', ' + _ctx.userName : ''}! 🤔 O **${KB.nome}** é a pessoa certa para responder isso com precisão.${stageHint}\n\nPosso te conectar agora — resposta em menos de 1h!\n\n💡 **Dica:** tente perguntas como _"Tem 2 quartos em Ipanema?"_ ou _"Como funciona o financiamento?"_`);
            setTimeout(() => addOpts([
                { label: '📱 Perguntar no WhatsApp', action: () => window.open(KB.wa(`Olá Leandro! Tenho uma dúvida: "${text.slice(0, 160)}". Pode me ajudar?`), '_blank') },
                ...(_ctx.lastBairro ? [{ label: `📍 Voltar a ${_ctx.lastBairro}`, next: `flow_${_ctx.lastBairroKey || 'bairros'}` }] : []),
                { label: '🏠 Ver imóveis disponíveis', next: 'flow_catalogo' },
                { label: '↩ Menu principal',            next: 'inicio'        },
            ]), 400);
        });
    }

    // ── Fallback contextual: usa memória da conversa ──
    function _buildContextualFallback(text) {
        const t = normFull(text);

        // Se falou sobre preço e tem bairro no contexto
        if (_ctx.lastBairroKey && matchAny(t, ['preco','valor','custa','barato','caro','quanto','sai por'])) {
            const resp = gerarResposta({ intent: 'INFO_BAIRRO', bairro: _ctx.lastBairroKey });
            if (resp) return resp;
        }

        // Se está falando algo curto e tem contexto de busca
        if (t.length < 20 && _ctx.lastBairro && matchAny(t, ['sim','quero','gostei','esse','gosto','por favor','manda'])) {
            return {
                text: `👍 Ótimo${_ctx.userName ? ', ' + _ctx.userName : ''}! Para avançar com imóveis${_ctx.lastBairro ? ' em **' + _ctx.lastBairro + '**' : ''}, fale diretamente com o **${KB.nome}**:`,
                opts: [
                    { label: '📱 WhatsApp agora', action: () => window.open(KB.wa(`Olá Leandro! Tenho interesse em imóveis${_ctx.lastBairro ? ' em ' + _ctx.lastBairro : ''}. Pode me ajudar?`), '_blank') },
                    { label: '🏠 Ver no site', action: () => { window.location.href = 'imoveis.html'; } },
                    { label: '↩ Menu', next: 'inicio' },
                ],
            };
        }

        // Last resort: suggest common questions based on stage
        if (_ctx.stage === 'interested') {
            return {
                text: `🤔 Não consegui entender, mas posso te ajudar com:\n\n${_ctx.lastBairro ? `📍 Mais sobre **${_ctx.lastBairro}**\n` : ''}💰 Preços e financiamento\n🏠 Buscar imóveis específicos\n📱 Falar com o Leandro\n\nEscolha abaixo ou reformule sua pergunta:`,
                opts: [
                    ...(_ctx.lastBairroKey ? [{ label: `📍 ${_ctx.lastBairro}`, next: `flow_${_ctx.lastBairroKey}` }] : []),
                    { label: '💳 Financiamento', next: 'flow_financiamento' },
                    { label: '🏠 Catálogo', next: 'flow_catalogo' },
                    { label: '📱 WhatsApp', action: () => window.open(KB.whatsapp, '_blank') },
                ],
            };
        }

        return null;
    }

    // ── Navegar para um nó ──
    function goTo(nodeKey) {
        _chatPath.push(nodeKey);
        // Remove os opts da última mensagem para manter chat limpo

        const node = FLOWS[nodeKey];
        if (!node) { goTo('inicio'); return; }

        const msg  = typeof node.msg  === 'function' ? node.msg()  : node.msg;
        const opts = typeof node.opts === 'function' ? node.opts() : (node.opts || []);

        if (nodeKey !== 'inicio') {
            _log('chat_nav', { node: nodeKey, botMsg: (msg || '').slice(0, 300), botResponse: (msg || '').slice(0, 300) });
        }

        showTypingThen(() => {
            if (msg) addBotMsg(msg);
            if (opts.length) setTimeout(() => addOpts(opts), 380);
        });
    }

    // ── UI helpers ──
    function showTypingThen(cb, delay = 750) {
        const msgs = document.getElementById('lb-messages');
        const t = document.createElement('div');
        t.className = 'lb-typing';
        t.innerHTML = '<span></span><span></span><span></span>';
        msgs.appendChild(t);
        scrollBottom();
        setTimeout(() => { t.remove(); cb(); scrollBottom(); }, delay);
    }

    function addBotMsg(text) {
        if (!text) return;
        const msgs = document.getElementById('lb-messages');
        const div = document.createElement('div');
        div.className = 'lb-msg bot';
        div.innerHTML = text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n• /g, '<br>• ')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>') +
            `<span class="lb-msg-time">${_timeNow()}</span>`;
        msgs.appendChild(div);
        scrollBottom();
    }

    function addUserMsg(text) {
        const msgs = document.getElementById('lb-messages');
        const div = document.createElement('div');
        div.className = 'lb-msg user';
        div.textContent = text;
        const time = document.createElement('span');
        time.className = 'lb-msg-time';
        time.textContent = _timeNow();
        div.appendChild(time);
        msgs.appendChild(div);
        scrollBottom();
    }

    function scrollBottom() {
        const msgs = document.getElementById('lb-messages');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }

    // ── Renderiza botões de opção dentro da área de mensagens ──
    function addOpts(opts) {
        if (!opts || !opts.length) return;
        const msgs = document.getElementById('lb-messages');
        if (!msgs) return;

        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;animation:lb-msgIn .25s ease both;align-self:flex-start;max-width:93%;';
        opts.forEach(opt => {
            const btn = document.createElement('button');
            btn.style.cssText = 'background:rgba(52,152,219,.1);border:1px solid rgba(52,152,219,.25);border-radius:99px;padding:6px 14px;color:#93c5fd;font-size:.76rem;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap;font-family:inherit;';
            btn.textContent = opt.label;
            btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(52,152,219,.25)'; btn.style.borderColor = 'rgba(52,152,219,.5)'; });
            btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(52,152,219,.1)'; btn.style.borderColor = 'rgba(52,152,219,.25)'; });
            btn.addEventListener('click', () => {
                _log('chat_optClick', { label: opt.label, next: opt.next || '', hasAction: !!opt.action });
                if (opt.action) { opt.action(); return; }
                if (opt.next) goTo(opt.next);
            });
            wrap.appendChild(btn);
        });

        msgs.appendChild(wrap);
        scrollBottom();
    }

    // ═══════════════════════════════════════════════════════
    //  INIT
    // ═══════════════════════════════════════════════════════
    function init() {
        if (document.getElementById('lb-chat-btn')) return;
        _fetchClientIP();
        _initCatalogoListener();
        createWidget();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();
