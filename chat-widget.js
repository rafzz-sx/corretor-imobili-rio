// ============================================================
//  CHAT FLUTUANTE INTELIGENTE — Leandro Bomfim Imóveis
//  Widget autônomo: inclua este JS em qualquer página do site
// ============================================================

(function () {
  'use strict';

  /* ── Base de conhecimento do Leandro ── */
  const KB = {
    bairros: ['Ipanema', 'Leblon', 'Barra da Tijuca', 'Barra Olímpica', 'Recreio dos Bandeirantes', 'Copacabana', 'Botafogo', 'Flamengo'],
    whatsapp: 'https://wa.me/5521981424469',
    whatsappMsg: (txt) => `https://wa.me/5521981424469?text=${encodeURIComponent(txt)}`,
    nome: 'Leandro Bomfim',
    creci: 'CRECI-RJ 123456-F',
    horario: 'Seg–Sex 8h–20h | Sáb 9h–18h | Dom sob agendamento',
  };

  /* ── Árvore de respostas ── */
  const FLOWS = {
    inicio: {
      msg: `Olá! 👋 Sou o assistente virtual do **${KB.nome}**, corretor especialista no Rio de Janeiro.\n\nComo posso te ajudar hoje?`,
      opts: [
        { label: '🏠 Quero comprar um imóvel', next: 'comprar' },
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
      msg: 'Barra da Tijuca e Recreio têm as melhores opções de espaço e custo-benefício do Rio! Coberturas, apartamentos amplos e condôminos completos.\n\n**Qual faixa de valor você tem em mente?**',
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
      msg: `📞 **${KB.nome}** está disponível para te atender!\n\n🕐 ${KB.horario}\n📱 (21) 98142-4469\n\nComo prefere entrar em contato?`,
      opts: [
        { label: '💬 WhatsApp agora', action: () => window.open(KB.whatsapp, '_blank') },
        { label: '📋 Ver página de contato', action: () => window.location.href = 'contato.html' },
        { label: '↩ Início', next: 'inicio' },
      ],
    },
    ver_imoveis_wa: {
      msg: null, // handled dynamically
    },
  };

  /* ── Estado ── */
  let isOpen = false;
  let hasGreeted = false;
  let pendingWaMsg = null;

  // ── Log de conversa no Firestore ──
  let _sessionId = null;
  let _chatPath = [];
  let _chatStarted = false;

  function _getDeviceId() {
      let id = localStorage.getItem('_lb_did');
      if (!id) { id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,9); localStorage.setItem('_lb_did', id); }
      return id;
  }

  function _logChat(event, data = {}) {
      try {
          if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
          const db = firebase.firestore();
          if (!_sessionId) {
              _sessionId = _getDeviceId() + '_chat_' + Date.now().toString(36);
          }
          const today = new Date().toISOString().slice(0,10);
          const payload = {
              sessionId: _sessionId,
              deviceId: _getDeviceId(),
              event,
              page: window.location.pathname.split('/').pop() || 'index',
              date: today,
              timestamp: firebase.firestore.FieldValue.serverTimestamp(),
              ...data,
          };
          db.collection('chat_logs').add(payload).catch(() => {});
      } catch(e) {}
  }

  /* ── Criar elementos ── */
  function createWidget() {
    const style = document.createElement('style');
    style.textContent = `
      #lb-chat-btn {
        position: fixed; bottom: 5.5rem; left: 1.5rem;
        width: 56px; height: 56px; border-radius: 50%;
        background: linear-gradient(135deg, #3498db, #2c3e50);
        border: none; cursor: pointer; z-index: 800;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 20px rgba(52,152,219,.45);
        transition: transform .25s, box-shadow .25s;
        animation: lb-bounceIn .6s cubic-bezier(.22,1,.36,1) both;
        animation-delay: 2s; opacity: 0;
      }
      #lb-chat-btn:hover { transform: scale(1.1); box-shadow: 0 8px 28px rgba(52,152,219,.6); }
      #lb-chat-btn svg { width: 26px; height: 26px; transition: transform .3s; }
      #lb-chat-btn.open svg { transform: rotate(90deg); }
      #lb-chat-btn .lb-notif-dot {
        position: absolute; top: 4px; right: 4px;
        width: 12px; height: 12px; background: #ef4444;
        border-radius: 50%; border: 2px solid #0a0a0a;
        animation: lb-pulse-dot 2s ease-in-out infinite;
      }
      @keyframes lb-bounceIn {
        from { opacity:0; transform:scale(.4) translateY(20px); }
        to   { opacity:1; transform:scale(1) translateY(0); }
      }
      @keyframes lb-pulse-dot {
        0%,100% { transform:scale(1); opacity:1; }
        50% { transform:scale(1.35); opacity:.7; }
      }

      #lb-chat-window {
        position: fixed; bottom: 7.5rem; left: 1.5rem;
        width: 340px; max-height: 520px;
        background: #0f1923;
        border: 1px solid rgba(52,152,219,.2);
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,.65);
        display: flex; flex-direction: column;
        z-index: 799; overflow: hidden;
        transform: scale(.85) translateY(20px); opacity: 0;
        pointer-events: none;
        transition: transform .3s cubic-bezier(.22,1,.36,1), opacity .3s;
      }
      #lb-chat-window.open {
        transform: scale(1) translateY(0); opacity: 1;
        pointer-events: all;
      }

      .lb-chat-header {
        background: linear-gradient(135deg, rgba(52,152,219,.15), rgba(44,62,80,.4));
        border-bottom: 1px solid rgba(52,152,219,.15);
        padding: .85rem 1rem;
        display: flex; align-items: center; gap: .7rem;
        flex-shrink: 0;
      }
      .lb-chat-avatar {
        width: 38px; height: 38px; border-radius: 50%;
        background: linear-gradient(135deg, #3498db, #9b59b6);
        display: flex; align-items: center; justify-content: center;
        font-size: 1rem; flex-shrink: 0; position: relative;
      }
      .lb-chat-avatar::after {
        content: ''; position: absolute; bottom: 1px; right: 1px;
        width: 9px; height: 9px; background: #22c55e;
        border-radius: 50%; border: 2px solid #0f1923;
      }
      .lb-chat-name { font-size: .88rem; font-weight: 700; color: #fff; }
      .lb-chat-status { font-size: .72rem; color: #22c55e; }

      .lb-chat-messages {
        flex: 1; overflow-y: auto; padding: .8rem;
        display: flex; flex-direction: column; gap: .6rem;
        scrollbar-width: thin; scrollbar-color: rgba(52,152,219,.3) transparent;
      }
      .lb-chat-messages::-webkit-scrollbar { width: 4px; }
      .lb-chat-messages::-webkit-scrollbar-thumb { background: rgba(52,152,219,.3); border-radius: 2px; }

      .lb-msg {
        max-width: 88%; padding: .65rem .9rem;
        border-radius: 14px; font-size: .83rem; line-height: 1.5;
        color: #e2e8f0; animation: lb-msgIn .25s ease both;
      }
      @keyframes lb-msgIn {
        from { opacity:0; transform:translateY(8px); }
        to   { opacity:1; transform:translateY(0); }
      }
      .lb-msg.bot {
        background: rgba(52,152,219,.12);
        border: 1px solid rgba(52,152,219,.15);
        border-bottom-left-radius: 4px; align-self: flex-start;
      }
      .lb-msg.bot strong { color: #7dd3fc; }
      .lb-msg.bot br + br { display: none; }

      .lb-opts {
        display: flex; flex-direction: column; gap: .4rem;
        animation: lb-msgIn .3s ease both; animation-delay: .1s;
      }
      .lb-opt-btn {
        background: rgba(255,255,255,.04);
        border: 1px solid rgba(52,152,219,.25);
        border-radius: 10px; padding: .55rem .85rem;
        color: #bfdbfe; font-size: .8rem; font-weight: 500;
        cursor: pointer; text-align: left;
        transition: background .18s, border-color .18s, transform .15s;
        font-family: inherit;
      }
      .lb-opt-btn:hover {
        background: rgba(52,152,219,.15);
        border-color: rgba(52,152,219,.5);
        transform: translateX(3px);
      }

      .lb-typing {
        display: flex; align-items: center; gap: 4px;
        padding: .6rem .9rem;
        background: rgba(52,152,219,.08);
        border: 1px solid rgba(52,152,219,.12);
        border-radius: 14px; border-bottom-left-radius: 4px;
        align-self: flex-start; animation: lb-msgIn .2s ease;
      }
      .lb-typing span {
        width: 6px; height: 6px; background: #7dd3fc;
        border-radius: 50%; animation: lb-typingDot 1.2s ease-in-out infinite;
      }
      .lb-typing span:nth-child(2) { animation-delay: .2s; }
      .lb-typing span:nth-child(3) { animation-delay: .4s; }
      @keyframes lb-typingDot {
        0%,80%,100% { transform: scale(.6); opacity:.4; }
        40% { transform: scale(1); opacity:1; }
      }

      .lb-chat-footer {
        padding: .5rem .8rem;
        border-top: 1px solid rgba(255,255,255,.05);
        font-size: .65rem; color: rgba(255,255,255,.25);
        text-align: center; flex-shrink: 0;
      }

      @media (max-width: 480px) {
        #lb-chat-window {
          left: .75rem; right: .75rem; width: auto;
          bottom: 6.5rem; max-height: 440px;
        }
        #lb-chat-btn { bottom: 5rem; left: 1rem; }
      }
    `;
    document.head.appendChild(style);

    // Botão
    const btn = document.createElement('button');
    btn.id = 'lb-chat-btn';
    btn.setAttribute('aria-label', 'Abrir chat');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="lb-notif-dot"></span>
    `;

    // Janela
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
      </div>
      <div class="lb-chat-messages" id="lb-messages"></div>
      <div class="lb-chat-footer">Assistente virtual · Leandro Bomfim Imóveis</div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(win);

    btn.addEventListener('click', toggleChat);
    return { btn, win };
  }

  /* ── Toggle ── */
  function toggleChat() {
    const btn = document.getElementById('lb-chat-btn');
    const win = document.getElementById('lb-chat-window');
    isOpen = !isOpen;
    btn.classList.toggle('open', isOpen);
    win.classList.toggle('open', isOpen);

    // Remove dot
    const dot = btn.querySelector('.lb-notif-dot');
    if (dot) dot.remove();

    if (isOpen && !hasGreeted) {
      hasGreeted = true;
      _logChat('chat_aberto', { page: window.location.pathname });
      setTimeout(() => goTo('inicio'), 300);
    }
    if (isOpen) scrollToBottom();
  }

  /* ── Navegar para um nó ── */
  function goTo(nodeKey, waMsg) {
    const msgs = document.getElementById('lb-messages');
    if (!msgs) return;

    // Registra caminho navegado
    _chatPath.push(nodeKey);

    // Limpa opções anteriores
    msgs.querySelectorAll('.lb-opts').forEach(el => el.remove());

    // Nó especial: redirect WA
    if (nodeKey === 'ver_imoveis_wa') {
      const msg = waMsg || 'Olá Leandro! Vim pelo site e gostaria de saber mais sobre os imóveis disponíveis.';
      window.open(KB.whatsappMsg(msg), '_blank');
      _logChat('chat_whatsapp', { msg: msg.slice(0,120), path: _chatPath.join(' → ') });
      addBotMsg('✅ Te direcionei para o WhatsApp do Leandro! Ele responde rapidinho. 😊');
      setTimeout(() => addOpts([
        { label: '↩ Voltar ao início', next: 'inicio' },
      ]), 600);
      return;
    }

    const node = FLOWS[nodeKey];
    if (!node) return;

    // Log do nó visitado (não loga 'inicio' pra não poluir)
    if (nodeKey !== 'inicio') {
      _logChat('chat_nav', { node: nodeKey, path: _chatPath.join(' → ') });
    }

    showTyping(() => {
      addBotMsg(node.msg);
      if (node.opts && node.opts.length) {
        setTimeout(() => addOpts(node.opts), 400);
      }
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
    setTimeout(() => {
      typing.remove();
      cb();
      scrollToBottom();
    }, 900);
  }

  /* ── Adicionar mensagem do bot ── */
  function addBotMsg(text) {
    if (!text) return;
    const msgs = document.getElementById('lb-messages');
    const div = document.createElement('div');
    div.className = 'lb-msg bot';
    // Suporte a **bold** e \n
    div.innerHTML = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    msgs.appendChild(div);
    scrollToBottom();
  }

  /* ── Adicionar opções ── */
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
        // Loga clique do usuário
        _logChat('chat_click', { label: opt.label, next: opt.next || 'action' });
        if (opt.action) {
          opt.action();
        } else if (opt.next) {
          goTo(opt.next, opt.waMsg || null);
        }
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
