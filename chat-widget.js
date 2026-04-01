// ============================================================
//  CHAT FLUTUANTE INTELIGENTE v2.0 — Leandro Bomfim Imóveis
//  Com: input de texto, respostas adaptativas, logs Firebase
// ============================================================

(function () {
    'use strict';
  
    /* ── Base de conhecimento ── */
    const KB = {
        bairros: ['Ipanema', 'Leblon', 'Barra da Tijuca', 'Barra Olímpica', 'Recreio dos Bandeirantes', 'Copacabana', 'Botafogo', 'Flamengo'],
        whatsapp: 'https://wa.me/5521981424469',
        whatsappMsg: (txt) => `https://wa.me/5521981424469?text=${encodeURIComponent(txt)}`,
        nome: 'Leandro Bomfim',
        creci: 'CRECI-RJ 123456-F',
        horario: 'Seg–Sex 8h–20h | Sáb 9h–18h | Dom sob agendamento',
        tel: '(21) 98142-4469',
    };
  
    /* ── Árvore de respostas ── */
    const FLOWS = {
        inicio: {
            msg: `Olá! 👋 Sou o assistente virtual do **${KB.nome}**, corretor especialista no Rio de Janeiro.\n\nComo posso te ajudar hoje?`,
            opts: [
                { label: '🏠 Quero comprar um imóvel', next: 'comprar' },
                { label: '🏗️ Procuro um terreno', next: 'terrenos' },
                { label: '💰 Quanto vale meu imóvel?', next: 'avaliar' },
                { label: '📍 Imóveis por bairro', next: 'bairros' },
                { label: '📞 Falar com o Leandro', next: 'contato' },
            ],
        },
        comprar: {
            msg: 'Ótimo! Tenho imóveis incríveis na Zona Sul e Barra da Tijuca. Qual região te interessa mais?',
            opts: [
                { label: '🌊 Zona Sul (Ipanema, Leblon…)', next: 'zona_sul' },
                { label: '🏙️ Barra da Tijuca / Recreio', next: 'barra' },
                { label: '🔍 Não sei ainda, me ajude', next: 'ajuda_bairro' },
                { label: '↩ Voltar', next: 'inicio' },
            ],
        },
        zona_sul: {
            msg: 'Zona Sul é a joia do Rio! Trabalho com apartamentos em Ipanema, Leblon, Copacabana e Botafogo — alto padrão, documentação 100% segura.\n\n**Qual faixa de valor você tem em mente?**',
            opts: [
                { label: 'Até R$ 600 mil', next: 'ver_imoveis_600' },
                { label: 'R$ 600k – R$ 1,5M', next: 'ver_imoveis_1m' },
                { label: 'Acima de R$ 1,5M', next: 'ver_imoveis_luxo' },
                { label: '↩ Voltar', next: 'comprar' },
            ],
        },
        barra: {
            msg: 'Barra da Tijuca e Recreio têm as melhores opções de espaço e custo-benefício do Rio! Coberturas, apartamentos amplos e condomínios completos.\n\n**Qual faixa de valor você tem em mente?**',
            opts: [
                { label: 'Até R$ 600 mil', next: 'ver_imoveis_600' },
                { label: 'R$ 600k – R$ 1,5M', next: 'ver_imoveis_1m' },
                { label: 'Acima de R$ 1,5M', next: 'ver_imoveis_luxo' },
                { label: '↩ Voltar', next: 'comprar' },
            ],
        },
        ajuda_bairro: {
            msg: 'Sem problema! Me conta o que é mais importante para você e eu indico o melhor bairro:',
            opts: [
                { label: '🌊 Quero perto da praia', next: 'rec_praia' },
                { label: '🌿 Quero tranquilidade e espaço', next: 'rec_tranquilo' },
                { label: '🚇 Quero fácil acesso ao centro', next: 'rec_centro' },
                { label: '↩ Voltar', next: 'comprar' },
            ],
        },
        rec_praia: {
            msg: '🌊 Para quem ama praia, **Ipanema e Leblon** são imbatíveis — vida cultural incrível, segurança e valorização constante. **Copacabana** é mais acessível com o mesmo mar.\n\nQuer ver os imóveis disponíveis agora?',
            opts: [
                { label: '✅ Ver imóveis de praia', next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Quero imóveis perto da praia (Ipanema/Leblon/Copacabana). Pode me ajudar?' },
                { label: '📋 Ver catálogo completo', next: 'catalogo' },
                { label: '↩ Voltar', next: 'ajuda_bairro' },
            ],
        },
        rec_tranquilo: {
            msg: '🌿 Para tranquilidade e espaço, **Recreio dos Bandeirantes** e **Barra da Tijuca** são ideais — ruas arborizadas, condomínios amplos e ótima qualidade de vida.\n\nQuer que o Leandro te mande opções?',
            opts: [
                { label: '✅ Quero ver essas opções', next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Procuro imóvel tranquilo, com espaço. Me interessam Recreio ou Barra da Tijuca. Pode me ajudar?' },
                { label: '📋 Ver catálogo completo', next: 'catalogo' },
                { label: '↩ Voltar', next: 'ajuda_bairro' },
            ],
        },
        rec_centro: {
            msg: '🚇 Para fácil acesso ao Centro, **Flamengo e Botafogo** são excelentes — charme carioca, metrô na porta, preços mais acessíveis que a Zona Sul.\n\nQuer que o Leandro te apresente opções?',
            opts: [
                { label: '✅ Quero ver essas opções', next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Procuro imóvel bem localizado, perto do Centro. Me interessam Flamengo ou Botafogo. Pode me ajudar?' },
                { label: '📋 Ver catálogo completo', next: 'catalogo' },
                { label: '↩ Voltar', next: 'ajuda_bairro' },
            ],
        },
        ver_imoveis_600: {
            msg: '💰 Tenho ótimas opções até R$ 600k! O Leandro pode te apresentar os melhores imóveis nessa faixa com condições facilitadas.\n\nComo prefere continuar?',
            opts: [
                { label: '📱 Falar no WhatsApp agora', next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Procuro imóvel até R$ 600 mil no Rio. Pode me ajudar?' },
                { label: '🔍 Ver catálogo online', next: 'catalogo' },
                { label: '↩ Voltar', next: 'zona_sul' },
            ],
        },
        ver_imoveis_1m: {
            msg: '✨ Faixa de R$ 600k a R$ 1,5M — a melhor variedade do mercado carioca! Apartamentos reformados, coberturas e opções com vista para o mar.\n\nComo prefere continuar?',
            opts: [
                { label: '📱 Falar no WhatsApp agora', next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Procuro imóvel entre R$ 600k e R$ 1,5M no Rio. Pode me ajudar?' },
                { label: '🔍 Ver catálogo online', next: 'catalogo' },
                { label: '↩ Voltar', next: 'zona_sul' },
            ],
        },
        ver_imoveis_luxo: {
            msg: '👑 Alto padrão é minha especialidade! Coberturas com piscina privativa, frente para o mar, acabamento de altíssimo nível em Ipanema, Leblon e Barra.\n\nVamos conversar sobre o que você procura?',
            opts: [
                { label: '📱 Conversar com o Leandro', next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Tenho interesse em imóveis de alto padrão (acima de R$ 1,5M). Pode me apresentar opções?' },
                { label: '🔍 Ver catálogo online', next: 'catalogo' },
                { label: '↩ Voltar', next: 'zona_sul' },
            ],
        },
        catalogo: {
            msg: '📋 Nosso catálogo completo está disponível na página de imóveis. Você pode filtrar por bairro, preço e quartos!',
            opts: [
                { label: '🏠 Ver todos os imóveis', action: () => window.location.href = 'imoveis.html' },
                { label: '📱 Preferir falar no WhatsApp', next: 'contato' },
                { label: '↩ Início', next: 'inicio' },
            ],
        },
        avaliar: {
            msg: 'O Leandro faz **avaliação gratuita** do seu imóvel com análise de mercado real. Processo rápido, sem compromisso.\n\nPara agilizar, me conta: qual é o tipo do seu imóvel?',
            opts: [
                { label: '🏢 Apartamento', next: 'avaliar_ap' },
                { label: '🏠 Casa', next: 'avaliar_casa' },
                { label: '🌆 Cobertura', next: 'avaliar_cob' },
                { label: '↩ Voltar', next: 'inicio' },
            ],
        },
        avaliar_ap: {
            msg: '🏢 Apartamentos na Zona Sul e Barra têm valorizado muito nos últimos anos. O Leandro analisa metragem, andar, acabamento e localização para chegar no preço justo.\n\nQuer solicitar a avaliação?',
            opts: [
                { label: '✅ Quero avaliação gratuita', next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Quero uma avaliação gratuita do meu apartamento. Pode me ajudar?' },
                { label: '↩ Voltar', next: 'avaliar' },
            ],
        },
        avaliar_casa: {
            msg: '🏠 Casas no Rio têm um mercado muito específico. O Leandro conhece profundamente cada região e vai te dar uma avaliação precisa e honesta.\n\nQuer solicitar a avaliação?',
            opts: [
                { label: '✅ Quero avaliação gratuita', next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Quero uma avaliação gratuita da minha casa. Pode me ajudar?' },
                { label: '↩ Voltar', next: 'avaliar' },
            ],
        },
        avaliar_cob: {
            msg: '🌆 Coberturas são meu forte! Conheço o mercado de alto padrão em detalhes. A avaliação leva em conta vista, área privativa e infraestrutura do condomínio.\n\nQuer solicitar a avaliação?',
            opts: [
                { label: '✅ Quero avaliação gratuita', next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Quero uma avaliação gratuita da minha cobertura. Pode me ajudar?' },
                { label: '↩ Voltar', next: 'avaliar' },
            ],
        },
        bairros: {
            msg: 'Atendo toda a **Zona Sul e Barra da Tijuca**. Selecione um bairro para saber mais:',
            opts: [
                { label: '🌊 Ipanema', next: 'info_ipanema' },
                { label: '🏖️ Leblon', next: 'info_leblon' },
                { label: '🏙️ Barra da Tijuca', next: 'info_barra' },
                { label: '🌴 Recreio', next: 'info_recreio' },
                { label: '↩ Voltar', next: 'inicio' },
            ],
        },
        info_ipanema: {
            msg: '🌊 **Ipanema** — O endereço mais desejado do Brasil.\n\n• Praia mundialmente famosa\n• Gastronomia e vida noturna premiadas\n• Valorização histórica consistente\n• Apartamentos de 1 a 4 quartos\n\nA partir de **R$ 750 mil**.',
            opts: [
                { label: '🏠 Ver imóveis em Ipanema', action: () => { window.location.href = 'imoveis.html?bairro=Ipanema'; } },
                { label: '📱 Falar com o Leandro', next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Tenho interesse em imóveis em Ipanema. Pode me ajudar?' },
                { label: '↩ Outros bairros', next: 'bairros' },
            ],
        },
        info_leblon: {
            msg: '🏖️ **Leblon** — O bairro mais valorizado do Rio.\n\n• Tranquilo, arborizado e seguro\n• Melhor culinária da cidade\n• Perfil familiar de alto padrão\n• Vizinho ao Jardim Botânico\n\nA partir de **R$ 900 mil**.',
            opts: [
                { label: '🏠 Ver imóveis no Leblon', action: () => { window.location.href = 'imoveis.html?bairro=Leblon'; } },
                { label: '📱 Falar com o Leandro', next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Tenho interesse em imóveis no Leblon. Pode me ajudar?' },
                { label: '↩ Outros bairros', next: 'bairros' },
            ],
        },
        info_barra: {
            msg: '🏙️ **Barra da Tijuca** — Rio moderno com infraestrutura completa.\n\n• Apartamentos amplos e condomínios fechados\n• Shopping, parques e praia em frente\n• Melhor custo-benefício por m²\n• Opções de cobertura espetaculares\n\nA partir de **R$ 550 mil**.',
            opts: [
                { label: '🏠 Ver imóveis na Barra', action: () => { window.location.href = 'imoveis.html?bairro=Barra+da+Tijuca'; } },
                { label: '📱 Falar com o Leandro', next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Tenho interesse em imóveis na Barra da Tijuca. Pode me ajudar?' },
                { label: '↩ Outros bairros', next: 'bairros' },
            ],
        },
        info_recreio: {
            msg: '🌴 **Recreio dos Bandeirantes** — Tranquilidade carioca com praia.\n\n• Mais espaçoso e menos denso que Barra\n• Natureza preservada ao redor\n• Ótimo para famílias e pets\n• Praia limpa e tranquila\n\nA partir de **R$ 450 mil**.',
            opts: [
                { label: '🏠 Ver imóveis no Recreio', action: () => { window.location.href = 'imoveis.html?bairro=Recreio+dos+Bandeirantes'; } },
                { label: '📱 Falar com o Leandro', next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Tenho interesse em imóveis no Recreio. Pode me ajudar?' },
                { label: '↩ Outros bairros', next: 'bairros' },
            ],
        },
        contato: {
            msg: `📞 **${KB.nome}** está disponível para te atender!\n\n🕐 ${KB.horario}\n📱 ${KB.tel}\n\nComo prefere entrar em contato?`,
            opts: [
                { label: '💬 WhatsApp agora', action: () => window.open(KB.whatsapp, '_blank') },
                { label: '📋 Ver página de contato', action: () => window.location.href = 'contato.html' },
                { label: '↩ Início', next: 'inicio' },
            ],
        },
        ver_imoveis_wa: { msg: null },
    };
  
    /* ── Respostas adaptativas por texto ── */
    const TEXT_INTENTS = [
        { patterns: ['ipanema'], next: 'info_ipanema' },
        { patterns: ['leblon'], next: 'info_leblon' },
        { patterns: ['barra', 'tijuca'], next: 'info_barra' },
        { patterns: ['recreio', 'bandeirante'], next: 'info_recreio' },
        { patterns: ['copacabana'], next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Quero imóveis em Copacabana!' },
        { patterns: ['botafogo'], next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Quero imóveis em Botafogo!' },
        { patterns: ['comprar', 'compra', 'quero', 'procuro', 'busco', 'imóvel', 'imovel', 'apartamento', 'casa', 'cobertura'], next: 'comprar' },
        { patterns: ['preço', 'preco', 'valor', 'avali', 'quanto vale', 'quanto custa', 'vender'], next: 'avaliar' },
        { patterns: ['600', '500', 'até 600', 'até 500'], next: 'ver_imoveis_600' },
        { patterns: ['1 milhão', '1 milh', '1m ', 'luxo', 'alto padrão', 'alto padrao'], next: 'ver_imoveis_luxo' },
        { patterns: ['praia', 'mar', 'orla', 'frente ao mar'], next: 'rec_praia' },
        { patterns: ['tranquil', 'familiar', 'espaço', 'espaco', 'quieto', 'sosseg'], next: 'rec_tranquilo' },
        { patterns: ['centro', 'metro', 'metrô', 'acesso'], next: 'rec_centro' },
        { patterns: ['whatsapp', 'zap', 'ligar', 'ligar', 'telefone', 'falar', 'atendimento', 'contato'], next: 'contato' },
        { patterns: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'boas', 'hello', 'oi tudo', 'tudo bem'], next: 'inicio' },
        { patterns: ['bairro', 'região', 'regiao', 'onde', 'local'], next: 'bairros' },
    ];
  
    /* ── Estado ── */
    let isOpen = false;
    let hasGreeted = false;
    let _currentNode = 'inicio';
  
    // ── Log Firebase ──
    let _sessionId = null;
    let _chatPath = [];
  
    function _getDeviceId() {
        let id = localStorage.getItem('_lb_did');
        if (!id) { id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9); localStorage.setItem('_lb_did', id); }
        return id;
    }
  
    function _logChat(event, data = {}) {
        try {
            if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
            const db = firebase.firestore();
            if (!_sessionId) _sessionId = _getDeviceId() + '_chat_' + Date.now().toString(36);
            const today = new Date().toISOString().slice(0, 10);
            db.collection('chat_logs').add({
                sessionId: _sessionId,
                deviceId: _getDeviceId(),
                event,
                page: window.location.pathname.split('/').pop() || 'index',
                date: today,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                ...data,
            }).catch(() => {});
        } catch (e) {}
    }
  
    /* ── Detecção de intenção por texto ── */
    function detectIntent(text) {
        const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        for (const intent of TEXT_INTENTS) {
            if (intent.patterns.some(p => t.includes(p))) return intent;
        }
        return null;
    }
  
    /* ── Criar widget ── */
    function createWidget() {
        const style = document.createElement('style');
        style.textContent = `
        #lb-chat-btn {
            position:fixed;bottom:5.5rem;left:1.5rem;
            width:56px;height:56px;border-radius:50%;
            background:linear-gradient(135deg,#3498db,#2c3e50);
            border:none;cursor:pointer;z-index:800;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 4px 20px rgba(52,152,219,.45);
            transition:transform .25s,box-shadow .25s;
            animation:lb-bounceIn .6s cubic-bezier(.22,1,.36,1) both;
            animation-delay:2s;opacity:0;
        }
        #lb-chat-btn:hover{transform:scale(1.1);box-shadow:0 8px 28px rgba(52,152,219,.6);}
        #lb-chat-btn svg{width:26px;height:26px;transition:transform .3s;}
        #lb-chat-btn.open svg{transform:rotate(90deg);}
        #lb-chat-btn .lb-notif-dot{
            position:absolute;top:4px;right:4px;
            width:12px;height:12px;background:#ef4444;
            border-radius:50%;border:2px solid #0a0a0a;
            animation:lb-pulse-dot 2s ease-in-out infinite;
        }
        @keyframes lb-bounceIn{from{opacity:0;transform:scale(.4) translateY(20px);}to{opacity:1;transform:scale(1) translateY(0);}}
        @keyframes lb-pulse-dot{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.35);opacity:.7;}}
  
        #lb-chat-window{
            position:fixed;bottom:7.5rem;left:1.5rem;
            width:340px;max-height:540px;
            background:#0f1923;
            border:1px solid rgba(52,152,219,.2);border-radius:20px;
            box-shadow:0 20px 60px rgba(0,0,0,.65);
            display:flex;flex-direction:column;
            z-index:799;overflow:hidden;
            transform:scale(.85) translateY(20px);opacity:0;pointer-events:none;
            transition:transform .3s cubic-bezier(.22,1,.36,1),opacity .3s;
        }
        #lb-chat-window.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}
  
        .lb-chat-header{
            background:linear-gradient(135deg,rgba(52,152,219,.15),rgba(44,62,80,.4));
            border-bottom:1px solid rgba(52,152,219,.15);
            padding:.85rem 1rem;
            display:flex;align-items:center;gap:.7rem;flex-shrink:0;
        }
        .lb-chat-avatar{
            width:38px;height:38px;border-radius:50%;
            background:linear-gradient(135deg,#3498db,#9b59b6);
            display:flex;align-items:center;justify-content:center;
            font-size:1rem;flex-shrink:0;position:relative;
        }
        .lb-chat-avatar::after{
            content:'';position:absolute;bottom:1px;right:1px;
            width:9px;height:9px;background:#22c55e;
            border-radius:50%;border:2px solid #0f1923;
        }
        .lb-chat-name{font-size:.88rem;font-weight:700;color:#fff;}
        .lb-chat-status{font-size:.72rem;color:#22c55e;}
        .lb-chat-header-actions{margin-left:auto;display:flex;gap:.3rem;}
        .lb-header-btn{
            background:rgba(255,255,255,.07);border:none;color:rgba(255,255,255,.5);
            width:28px;height:28px;border-radius:50%;cursor:pointer;
            display:flex;align-items:center;justify-content:center;font-size:.7rem;
            transition:all .2s;
        }
        .lb-header-btn:hover{background:rgba(255,255,255,.15);color:#fff;}
  
        .lb-chat-messages{
            flex:1;overflow-y:auto;padding:.8rem;
            display:flex;flex-direction:column;gap:.6rem;
            scrollbar-width:thin;scrollbar-color:rgba(52,152,219,.3) transparent;
        }
        .lb-chat-messages::-webkit-scrollbar{width:4px;}
        .lb-chat-messages::-webkit-scrollbar-thumb{background:rgba(52,152,219,.3);border-radius:2px;}
  
        .lb-msg{
            max-width:88%;padding:.65rem .9rem;
            border-radius:14px;font-size:.83rem;line-height:1.5;
            color:#e2e8f0;animation:lb-msgIn .25s ease both;
        }
        @keyframes lb-msgIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .lb-msg.bot{
            background:rgba(52,152,219,.12);
            border:1px solid rgba(52,152,219,.15);
            border-bottom-left-radius:4px;align-self:flex-start;
        }
        .lb-msg.bot strong{color:#7dd3fc;}
        .lb-msg.user{
            background:linear-gradient(135deg,rgba(52,152,219,.35),rgba(44,62,80,.5));
            border:1px solid rgba(52,152,219,.3);
            border-bottom-right-radius:4px;align-self:flex-end;
            text-align:right;
        }
  
        .lb-opts{display:flex;flex-direction:column;gap:.4rem;animation:lb-msgIn .3s ease both;animation-delay:.1s;}
        .lb-opt-btn{
            background:rgba(255,255,255,.04);
            border:1px solid rgba(52,152,219,.25);
            border-radius:10px;padding:.55rem .85rem;
            color:#bfdbfe;font-size:.8rem;font-weight:500;
            cursor:pointer;text-align:left;
            transition:background .18s,border-color .18s,transform .15s;font-family:inherit;
        }
        .lb-opt-btn:hover{background:rgba(52,152,219,.15);border-color:rgba(52,152,219,.5);transform:translateX(3px);}
  
        .lb-typing{
            display:flex;align-items:center;gap:4px;padding:.6rem .9rem;
            background:rgba(52,152,219,.08);border:1px solid rgba(52,152,219,.12);
            border-radius:14px;border-bottom-left-radius:4px;
            align-self:flex-start;animation:lb-msgIn .2s ease;
        }
        .lb-typing span{
            width:6px;height:6px;background:#7dd3fc;border-radius:50%;
            animation:lb-typingDot 1.2s ease-in-out infinite;
        }
        .lb-typing span:nth-child(2){animation-delay:.2s;}
        .lb-typing span:nth-child(3){animation-delay:.4s;}
        @keyframes lb-typingDot{0%,80%,100%{transform:scale(.6);opacity:.4;}40%{transform:scale(1);opacity:1;}}
  
        /* Input de texto */
        .lb-input-area{
            display:flex;align-items:center;gap:.4rem;
            padding:.6rem .75rem;
            border-top:1px solid rgba(255,255,255,.06);
            background:rgba(0,0,0,.2);flex-shrink:0;
        }
        .lb-text-input{
            flex:1;background:rgba(255,255,255,.06);
            border:1px solid rgba(52,152,219,.2);border-radius:20px;
            padding:.45rem .9rem;color:#e2e8f0;font-size:.82rem;
            font-family:inherit;outline:none;
            transition:border-color .2s,background .2s;
        }
        .lb-text-input:focus{border-color:rgba(52,152,219,.5);background:rgba(255,255,255,.08);}
        .lb-text-input::placeholder{color:rgba(255,255,255,.25);}
        .lb-send-btn{
            width:32px;height:32px;border-radius:50%;
            background:linear-gradient(135deg,#3498db,#2c3e50);
            border:none;cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            color:#fff;font-size:.75rem;flex-shrink:0;
            transition:transform .2s,box-shadow .2s;
        }
        .lb-send-btn:hover{transform:scale(1.1);box-shadow:0 4px 12px rgba(52,152,219,.4);}
  
        .lb-chat-footer{
            padding:.4rem .8rem;border-top:1px solid rgba(255,255,255,.04);
            font-size:.6rem;color:rgba(255,255,255,.2);text-align:center;flex-shrink:0;
        }
  
        .lb-suggestion-chips{
            display:flex;flex-wrap:wrap;gap:.3rem;padding:.3rem .8rem .5rem;flex-shrink:0;
        }
        .lb-chip{
            background:rgba(52,152,219,.1);border:1px solid rgba(52,152,219,.2);
            border-radius:99px;padding:.25rem .65rem;
            color:#93c5fd;font-size:.7rem;font-weight:500;
            cursor:pointer;transition:all .2s;white-space:nowrap;
        }
        .lb-chip:hover{background:rgba(52,152,219,.2);border-color:rgba(52,152,219,.4);}
  
        @media(max-width:480px){
            #lb-chat-window{left:.75rem;right:.75rem;width:auto;bottom:6.5rem;max-height:460px;}
            #lb-chat-btn{bottom:5rem;left:1rem;}
        }
        `;
        document.head.appendChild(style);
  
        const btn = document.createElement('button');
        btn.id = 'lb-chat-btn';
        btn.setAttribute('aria-label', 'Abrir chat com assistente');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="lb-notif-dot"></span>
        `;
  
        const win = document.createElement('div');
        win.id = 'lb-chat-window';
        win.setAttribute('role', 'dialog');
        win.setAttribute('aria-label', 'Chat com assistente');
        win.innerHTML = `
            <div class="lb-chat-header">
                <div class="lb-chat-avatar">🏠</div>
                <div>
                    <div class="lb-chat-name">Assistente LB Imóveis</div>
                    <div class="lb-chat-status">● Online agora</div>
                </div>
                <div class="lb-chat-header-actions">
                    <button class="lb-header-btn" id="lb-restart-btn" title="Recomeçar conversa">↩</button>
                    <button class="lb-header-btn" id="lb-close-btn" title="Fechar">✕</button>
                </div>
            </div>
            <div class="lb-chat-messages" id="lb-messages"></div>
            <div class="lb-suggestion-chips" id="lb-chips"></div>
            <div class="lb-input-area">
                <input type="text" class="lb-text-input" id="lb-text-input" placeholder="Digite sua dúvida..." maxlength="200" autocomplete="off">
                <button class="lb-send-btn" id="lb-send-btn" aria-label="Enviar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
            </div>
            <div class="lb-chat-footer">Assistente virtual · Leandro Bomfim Imóveis</div>
        `;
  
        document.body.appendChild(btn);
        document.body.appendChild(win);
  
        btn.addEventListener('click', toggleChat);
        win.querySelector('#lb-close-btn').addEventListener('click', () => { isOpen = true; toggleChat(); });
        win.querySelector('#lb-restart-btn').addEventListener('click', restartChat);
  
        // Input de texto
        const inp = win.querySelector('#lb-text-input');
        const sendBtn = win.querySelector('#lb-send-btn');
        sendBtn.addEventListener('click', handleTextInput);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') handleTextInput(); });
  
        return { btn, win };
    }
  
    /* ── Chips de sugestão rápida ── */
    const QUICK_CHIPS = ['🏠 Comprar', '💰 Avaliar', '📍 Bairros', '📞 Contato'];
    const CHIP_NODES = ['comprar', 'avaliar', 'bairros', 'contato'];
  
    function renderChips() {
        const chips = document.getElementById('lb-chips');
        if (!chips) return;
        chips.innerHTML = QUICK_CHIPS.map((label, i) =>
            `<span class="lb-chip" data-node="${CHIP_NODES[i]}">${label}</span>`
        ).join('');
        chips.querySelectorAll('.lb-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                _logChat('chat_chip', { label: chip.textContent, node: chip.dataset.node });
                goTo(chip.dataset.node);
            });
        });
    }
  
    /* ── Toggle ── */
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
            _logChat('chat_aberto', { page: window.location.pathname });
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
        _chatPath = [];
        _sessionId = null; // nova sessão
        _logChat('chat_aberto', { page: window.location.pathname, restarted: true });
        renderChips();
        setTimeout(() => goTo('inicio'), 200);
    }
  
    /* ── Processar input de texto ── */
    function handleTextInput() {
        const inp = document.getElementById('lb-text-input');
        if (!inp) return;
        const text = inp.value.trim();
        if (!text) return;
        inp.value = '';
  
        // Mostra mensagem do usuário
        addUserMsg(text);

        // Detecta intenção
        const intent = detectIntent(text);
        _logChat('chat_texto', {
            text: text.slice(0, 200),
            intentDetected: intent ? intent.next : 'nenhuma',
            path: _chatPath.join('→'),
        });
  
        if (intent) {
            setTimeout(() => goTo(intent.next, intent.waMsg || null), 600);
        } else {
            // Resposta genérica adaptativa
            setTimeout(() => {
                addBotMsg('Entendi! 😊 Deixa eu te ajudar melhor. Escolha uma opção abaixo:');
                setTimeout(() => addOpts([
                    { label: '🏠 Ver imóveis disponíveis', next: 'comprar' },
                    { label: '📱 Falar diretamente com Leandro', next: 'ver_imoveis_wa', waMsg: `Olá Leandro! Tenho uma dúvida: "${text.slice(0,80)}"` },
                    { label: '↩ Menu principal', next: 'inicio' },
                ]), 400);
            }, 700);
        }
    }
  
    /* ── Navegar para um nó ── */
    function goTo(nodeKey, waMsg) {
        const msgs = document.getElementById('lb-messages');
        if (!msgs) return;
        _currentNode = nodeKey;
        _chatPath.push(nodeKey);
        msgs.querySelectorAll('.lb-opts').forEach(el => el.remove());
  
        if (nodeKey === 'ver_imoveis_wa') {
            const msg = waMsg || 'Olá Leandro! Vim pelo site e gostaria de saber mais sobre os imóveis disponíveis.';
            window.open(KB.whatsappMsg(msg), '_blank');
            _logChat('chat_whatsapp', { msg: msg.slice(0, 200), waText: msg.slice(0, 200), path: _chatPath.join('→') });
            addBotMsg('✅ Te direcionei para o WhatsApp do Leandro! Ele responde rapidinho. 😊\n\nPosso ajudar em mais alguma coisa?');
            setTimeout(() => addOpts([
                { label: '↩ Voltar ao início', next: 'inicio' },
            ]), 600);
            return;
        }
  
        const node = FLOWS[nodeKey];
        if (!node) return;
  
        if (nodeKey !== 'inicio') {
            _logChat('chat_nav', {
                node: nodeKey,
                botMsg: (node.msg || '').slice(0, 200),
                path: _chatPath.join('→'),
            });
        }
  
        showTyping(() => {
            addBotMsg(node.msg);
            if (node.opts && node.opts.length) setTimeout(() => addOpts(node.opts), 400);
        });
    }
  
    /* ── Typing indicator ── */
    function showTyping(cb) {
        const msgs = document.getElementById('lb-messages');
        const typing = document.createElement('div');
        typing.className = 'lb-typing';
        typing.innerHTML = '<span></span><span></span><span></span>';
        msgs.appendChild(typing);
        scrollToBottom();
        setTimeout(() => { typing.remove(); cb(); scrollToBottom(); }, 850);
    }
  
    /* ── Mensagem do bot ── */
    function addBotMsg(text) {
        if (!text) return;
        const msgs = document.getElementById('lb-messages');
        const div = document.createElement('div');
        div.className = 'lb-msg bot';
        div.innerHTML = text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        msgs.appendChild(div);
        scrollToBottom();
    }
  
    /* ── Mensagem do usuário ── */
    function addUserMsg(text) {
        const msgs = document.getElementById('lb-messages');
        const div = document.createElement('div');
        div.className = 'lb-msg user';
        div.textContent = text;
        msgs.appendChild(div);
        scrollToBottom();
    }
  
    /* ── Opções ── */
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
                _logChat('chat_click', { label: opt.label, next: opt.next || 'action' });
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
  
    /* ── Init ── */
    function init() {
        if (document.getElementById('lb-chat-btn')) return;
        createWidget();
    }
  
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  })();
