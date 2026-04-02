// ============================================================
//  CHAT FLUTUANTE TURBINADO v3.0 — Leandro Bomfim Imóveis
//  Motor de intenções expandido · Respostas diretas a textos livres
//  Mantém logs Firebase completos compatíveis com admin.js
// ============================================================

(function () {
    'use strict';

    /* ════════════════════════════════════════════
       BASE DE CONHECIMENTO
    ════════════════════════════════════════════ */
    const KB = {
        nome:       'Leandro Bomfim',
        creci:      'CRECI-RJ 97315',
        tel:        '(21) 98142-4469',
        telNum:     '5521981424469',
        email:      'leandromorenno007@gmail.com',
        instagram:  '@leopbomfim',
        horario:    'Seg–Sex 8h–20h | Sáb 9h–18h | Dom sob agendamento',
        experiencia:'6+ anos',
        negociados: '60+ imóveis negociados',
        whatsapp:   'https://wa.me/5521981424469',
        wa:         (txt) => `https://wa.me/5521981424469?text=${encodeURIComponent(txt)}`,
    };

    /* ════════════════════════════════════════════
       ÁRVORE DE FLUXOS (menus guiados)
    ════════════════════════════════════════════ */
    const FLOWS = {
        inicio: {
            msg: `Olá! 👋 Sou o assistente virtual do **${KB.nome}**, corretor CRECI-RJ especialista no Rio de Janeiro.\n\nPode me perguntar qualquer coisa ou escolha uma opção:`,
            opts: [
                { label: '🏠 Quero comprar um imóvel',   next: 'comprar'       },
                { label: '🏗️ Procuro um terreno',        next: 'terrenos'      },
                { label: '💰 Avaliar meu imóvel',        next: 'avaliar'       },
                { label: '📍 Explorar bairros',          next: 'bairros'       },
                { label: '💳 Financiamento & FGTS',      next: 'financiamento' },
                { label: '📞 Falar com o Leandro',       next: 'contato'       },
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
                { label: '↩ Voltar',                       next: 'inicio'       },
            ],
        },
        zona_sul: {
            msg: 'Zona Sul — o coração nobre do Rio! Ipanema, Leblon, Copacabana, Botafogo, Flamengo. Alto padrão e documentação 100% segura.\n\n**Qual faixa de valor?**',
            opts: [
                { label: 'Até R$ 600 mil',      next: 'preco_600'  },
                { label: 'R$ 600k – R$ 1,5M',  next: 'preco_1m'   },
                { label: 'Acima de R$ 1,5M',    next: 'preco_luxo' },
                { label: '↩ Voltar',             next: 'comprar'    },
            ],
        },
        barra: {
            msg: '🏙️ Barra da Tijuca e Recreio — espaço, infraestrutura e custo-benefício imbatível. Condomínios fechados, coberturas e apartamentos amplos.\n\n**Qual faixa de valor?**',
            opts: [
                { label: 'Até R$ 600 mil',      next: 'preco_600'  },
                { label: 'R$ 600k – R$ 1,5M',  next: 'preco_1m'   },
                { label: 'Acima de R$ 1,5M',    next: 'preco_luxo' },
                { label: '↩ Voltar',             next: 'comprar'   },
            ],
        },
        copa_bota: {
            msg: '🌆 **Copacabana** tem uma das praias mais famosas do mundo e ótimas opções de custo-benefício. **Botafogo** tem charme, metrô na porta e vida cultural intensa.\n\nO Leandro tem ótimas opções nessa região!',
            opts: [
                { label: '📱 Ver opções com Leandro', next: 'wa_copa',  waMsg: 'Olá Leandro! Quero imóveis em Copacabana ou Botafogo. Pode me ajudar?' },
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
            msg: '🌿 Para tranquilidade:\n\n• **Recreio dos Bandeirantes** — mais reservado, espaçoso\n• **Leblon** — nobre, arborizado, seguro\n• **Barra Olímpica** — novo, menos movimentado\n\nO Leandro tem ótimas opções!',
            opts: [
                { label: '📱 Ver opções',   next: 'wa_tranquilo', waMsg: 'Olá Leandro! Procuro imóvel tranquilo e espaçoso no Rio. Pode me ajudar?' },
                { label: '📋 Ver catálogo', next: 'catalogo'      },
                { label: '↩ Voltar',        next: 'ajuda_bairro'  },
            ],
        },
        rec_centro: {
            msg: '🚇 Para acesso ao centro:\n\n• **Botafogo** — metrô, fácil acesso, muito charmoso\n• **Flamengo** — orla da Guanabara, ótimo custo-benefício\n• **Copacabana** — metrô e tudo a pé',
            opts: [
                { label: '📱 Ver opções',   next: 'wa_centro', waMsg: 'Olá Leandro! Quero imóvel com fácil acesso ao centro. Pode me ajudar?' },
                { label: '📋 Ver catálogo', next: 'catalogo'   },
                { label: '↩ Voltar',        next: 'ajuda_bairro' },
            ],
        },
        rec_familia: {
            msg: '👨‍👩‍👧 Para famílias:\n\n• **Leblon** — seguro, escolas excelentes\n• **Recreio** — tranquilo, condomínios com lazer completo\n• **Barra da Tijuca** — shoppings, hospitais, colégios próximos',
            opts: [
                { label: '📱 Ver opções',   next: 'wa_familia', waMsg: 'Olá Leandro! Procuro imóvel para família com espaço e boa estrutura. Pode me ajudar?' },
                { label: '📋 Ver catálogo', next: 'catalogo'   },
                { label: '↩ Voltar',        next: 'ajuda_bairro' },
            ],
        },
        rec_invest: {
            msg: '💼 Para investimento:\n\n• **Ipanema/Leblon** — valorização histórica, alta demanda de aluguel\n• **Barra da Tijuca** — crescimento constante\n• **Copacabana** — turismo, airbnb altíssima demanda\n\nO Leandro pode calcular o retorno estimado!',
            opts: [
                { label: '📱 Analisar com Leandro', next: 'wa_invest', waMsg: 'Olá Leandro! Quero investir em imóvel no Rio. Pode me ajudar a analisar rentabilidade?' },
                { label: '📋 Ver catálogo',          next: 'catalogo' },
                { label: '↩ Voltar',                 next: 'ajuda_bairro' },
            ],
        },

        /* ── PREÇOS ── */
        preco_600: {
            msg: '💰 Tenho ótimas opções até R$ 600k! Studios modernos, apartamentos de 1–2 quartos bem localizados.',
            opts: [
                { label: '📱 Ver opções no WhatsApp', next: 'wa_600',   waMsg: 'Olá Leandro! Procuro imóvel até R$ 600 mil no Rio. Pode me mostrar opções?' },
                { label: '🔍 Ver catálogo online',    next: 'catalogo'  },
                { label: '💳 Posso financiar?',       next: 'financiamento' },
                { label: '↩ Voltar',                  next: 'zona_sul'  },
            ],
        },
        preco_1m: {
            msg: '✨ Faixa de R$ 600k a R$ 1,5M — a melhor variedade do Rio! Apartamentos reformados, coberturas duplex, imóveis com vista para o mar.',
            opts: [
                { label: '📱 Ver opções no WhatsApp', next: 'wa_1m',    waMsg: 'Olá Leandro! Procuro imóvel entre R$ 600k e R$ 1,5M no Rio. Pode me ajudar?' },
                { label: '🔍 Ver catálogo online',    next: 'catalogo'  },
                { label: '↩ Voltar',                  next: 'zona_sul'  },
            ],
        },
        preco_luxo: {
            msg: '👑 Alto padrão é minha especialidade! Coberturas com piscina privativa, vistas panorâmicas, acabamento europeu em Ipanema, Leblon e Barra.',
            opts: [
                { label: '📱 Conversar com Leandro', next: 'wa_luxo',  waMsg: 'Olá Leandro! Tenho interesse em imóveis de alto padrão acima de R$ 1,5M. Pode me apresentar opções?' },
                { label: '🔍 Ver catálogo online',   next: 'catalogo'  },
                { label: '↩ Voltar',                  next: 'zona_sul'  },
            ],
        },

        /* ── TERRENOS ── */
        terrenos: {
            msg: '🏗️ Tenho terrenos disponíveis em várias regiões do Rio — ideais para construção própria ou investimento.\n\n**Qual sua intenção?**',
            opts: [
                { label: '🏠 Construir minha casa',  next: 'terreno_construir' },
                { label: '💼 Investir / Revender',   next: 'terreno_invest'    },
                { label: '🏢 Projeto comercial',     next: 'terreno_comercial' },
                { label: '📱 Falar com Leandro',     next: 'wa_terreno', waMsg: 'Olá Leandro! Tenho interesse em terrenos no Rio. Pode me ajudar?' },
                { label: '↩ Voltar',                 next: 'inicio'    },
            ],
        },
        terreno_construir: {
            msg: '🏠 Para construção própria tenho terrenos em Recreio, Barra Olímpica, Vargem Grande e Pedra de Guaratiba — boa infraestrutura e preços competitivos.',
            opts: [
                { label: '📱 Ver terrenos',   next: 'wa_terreno', waMsg: 'Olá Leandro! Quero terreno para construir minha casa. Pode me mostrar opções?' },
                { label: '📋 Ver catálogo',   next: 'catalogo'   },
                { label: '↩ Voltar',          next: 'terrenos'   },
            ],
        },
        terreno_invest: {
            msg: '💼 Terrenos para investimento estão se valorizando muito na Zona Oeste! Barra Olímpica, Recreio e Pedra de Guaratiba têm potencial acima da média.',
            opts: [
                { label: '📱 Analisar com Leandro', next: 'wa_terreno', waMsg: 'Olá Leandro! Quero terreno para investimento. Pode me ajudar?' },
                { label: '📋 Ver catálogo',          next: 'catalogo'  },
                { label: '↩ Voltar',                 next: 'terrenos'  },
            ],
        },
        terreno_comercial: {
            msg: '🏢 Para projetos comerciais, os melhores terrenos ficam na Barra da Tijuca e Recreio — amplo fluxo, infraestrutura completa e zoneamento comercial disponível.',
            opts: [
                { label: '📱 Falar com Leandro', next: 'wa_terreno', waMsg: 'Olá Leandro! Preciso de terreno para projeto comercial. Pode me ajudar?' },
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
        avaliar_ap: {
            msg: '🏢 O Leandro analisa metragem, andar, acabamento, condomínio e localização para chegar no **preço justo de mercado**.',
            opts: [
                { label: '✅ Quero avaliação gratuita', next: 'wa_avaliacao', waMsg: 'Olá Leandro! Quero uma avaliação gratuita do meu apartamento. Pode me ajudar?' },
                { label: '↩ Voltar', next: 'avaliar' },
            ],
        },
        avaliar_casa: {
            msg: '🏠 O Leandro conhece profundamente cada região do Rio e vai te dar uma avaliação precisa e honesta, sem inventar valor.',
            opts: [
                { label: '✅ Quero avaliação gratuita', next: 'wa_avaliacao', waMsg: 'Olá Leandro! Quero uma avaliação gratuita da minha casa. Pode me ajudar?' },
                { label: '↩ Voltar', next: 'avaliar' },
            ],
        },
        avaliar_cob: {
            msg: '🌆 Coberturas são minha especialidade! A avaliação leva em conta vista, terraço, piscina, área privativa e diferencial do bairro.',
            opts: [
                { label: '✅ Quero avaliação gratuita', next: 'wa_avaliacao', waMsg: 'Olá Leandro! Quero uma avaliação gratuita da minha cobertura. Pode me ajudar?' },
                { label: '↩ Voltar', next: 'avaliar' },
            ],
        },
        avaliar_ter: {
            msg: '🏗️ Terrenos têm avaliação específica por localização, topografia, zoneamento e metragem. O Leandro tem experiência nesse segmento!',
            opts: [
                { label: '✅ Quero avaliação gratuita', next: 'wa_avaliacao', waMsg: 'Olá Leandro! Quero uma avaliação gratuita do meu terreno. Pode me ajudar?' },
                { label: '↩ Voltar', next: 'avaliar' },
            ],
        },
        avaliar_com: {
            msg: '🏪 Imóveis comerciais têm avaliação baseada em ponto, fluxo, renda potencial e comparativos de mercado. O Leandro faz análise completa!',
            opts: [
                { label: '✅ Quero avaliação gratuita', next: 'wa_avaliacao', waMsg: 'Olá Leandro! Quero avaliação gratuita do meu imóvel comercial. Pode me ajudar?' },
                { label: '↩ Voltar', next: 'avaliar' },
            ],
        },

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
            msg: '🌊 **Ipanema** — O endereço mais desejado do Brasil.\n\n• Praia mundialmente famosa\n• Gastronomia e vida noturna premiadas\n• Valorização histórica consistente\n• Alta demanda de aluguel\n\nA partir de **R$ 750 mil**.',
            opts: [
                { label: '🏠 Ver imóveis em Ipanema',  action: () => { window.location.href = 'imoveis.html?bairro=Ipanema'; } },
                { label: '📱 Falar com Leandro',        next: 'wa_ipanema', waMsg: 'Olá Leandro! Tenho interesse em imóveis em Ipanema. Pode me ajudar?' },
                { label: '↩ Outros bairros',            next: 'bairros' },
            ],
        },
        info_leblon: {
            msg: '🏖️ **Leblon** — O bairro mais valorizado do Rio.\n\n• Tranquilo, arborizado, seguro\n• Melhor culinária da cidade\n• Perfil familiar de alto padrão\n• Escolas e hospitais top\n\nA partir de **R$ 900 mil**.',
            opts: [
                { label: '🏠 Ver imóveis no Leblon', action: () => { window.location.href = 'imoveis.html?bairro=Leblon'; } },
                { label: '📱 Falar com Leandro',     next: 'wa_leblon', waMsg: 'Olá Leandro! Tenho interesse em imóveis no Leblon. Pode me ajudar?' },
                { label: '↩ Outros bairros',         next: 'bairros' },
            ],
        },
        info_copa: {
            msg: '🏝️ **Copacabana** — Ícone mundial do Rio.\n\n• Uma das praias mais famosas do mundo\n• Metrô na porta, muito acessível\n• Alta demanda turística (ótimo para airbnb)\n• Preços mais acessíveis que Ipanema\n\nA partir de **R$ 450 mil**.',
            opts: [
                { label: '🏠 Ver imóveis em Copa', action: () => { window.location.href = 'imoveis.html?bairro=Copacabana'; } },
                { label: '📱 Falar com Leandro',   next: 'wa_copa', waMsg: 'Olá Leandro! Tenho interesse em imóveis em Copacabana. Pode me ajudar?' },
                { label: '↩ Outros bairros',       next: 'bairros' },
            ],
        },
        info_botafogo: {
            msg: '🌿 **Botafogo** — Charme e eficiência carioca.\n\n• Metrô na porta, fácil acesso\n• Vida cultural intensa\n• Preços mais acessíveis\n• Vista para o Pão de Açúcar\n\nA partir de **R$ 380 mil**.',
            opts: [
                { label: '🏠 Ver imóveis em Botafogo', action: () => { window.location.href = 'imoveis.html?bairro=Botafogo'; } },
                { label: '📱 Falar com Leandro',        next: 'wa_botafogo', waMsg: 'Olá Leandro! Tenho interesse em imóveis em Botafogo. Pode me ajudar?' },
                { label: '↩ Outros bairros',            next: 'bairros' },
            ],
        },
        info_flamengo: {
            msg: '🌅 **Flamengo** — Orla da Baía de Guanabara.\n\n• Parque do Flamengo (maior parque urbano do mundo)\n• Fácil acesso ao centro e metrô\n• Vista para a Baía e Pão de Açúcar\n• Perfil familiar, tranquilo\n\nA partir de **R$ 350 mil**.',
            opts: [
                { label: '🏠 Ver imóveis no Flamengo', action: () => { window.location.href = 'imoveis.html?bairro=Flamengo'; } },
                { label: '📱 Falar com Leandro',        next: 'wa_flamengo', waMsg: 'Olá Leandro! Tenho interesse em imóveis no Flamengo. Pode me ajudar?' },
                { label: '↩ Outros bairros',            next: 'bairros' },
            ],
        },
        info_barra: {
            msg: '🏙️ **Barra da Tijuca** — Rio moderno e completo.\n\n• Apartamentos e condomínios espaçosos\n• Shoppings, hospitais, escolas de alto nível\n• Melhor custo-benefício por m²\n• Praia com quase 20km de extensão\n\nA partir de **R$ 500 mil**.',
            opts: [
                { label: '🏠 Ver imóveis na Barra', action: () => { window.location.href = 'imoveis.html?bairro=Barra+da+Tijuca'; } },
                { label: '📱 Falar com Leandro',    next: 'wa_barra', waMsg: 'Olá Leandro! Tenho interesse em imóveis na Barra da Tijuca. Pode me ajudar?' },
                { label: '↩ Outros bairros',        next: 'bairros' },
            ],
        },
        info_recreio: {
            msg: '🌴 **Recreio dos Bandeirantes** — Tranquilidade carioca com praia.\n\n• Mais espaçoso e reservado que a Barra\n• Natureza preservada ao redor\n• Ótimo para famílias e pets\n• Praia limpa, menor movimento\n\nA partir de **R$ 420 mil**.',
            opts: [
                { label: '🏠 Ver imóveis no Recreio', action: () => { window.location.href = 'imoveis.html?bairro=Recreio+dos+Bandeirantes'; } },
                { label: '📱 Falar com Leandro',       next: 'wa_recreio', waMsg: 'Olá Leandro! Tenho interesse em imóveis no Recreio. Pode me ajudar?' },
                { label: '↩ Outros bairros',           next: 'bairros' },
            ],
        },
        info_bo: {
            msg: '🏗️ **Barra Olímpica** — O bairro mais novo e moderno do Rio.\n\n• Infraestrutura dos Jogos 2016\n• Terrenos e apartamentos modernos\n• Ótima valorização futura\n• Preços ainda acessíveis\n\nA partir de **R$ 380 mil**.',
            opts: [
                { label: '🏠 Ver imóveis na B. Olímpica', action: () => { window.location.href = 'imoveis.html?bairro=Barra+Ol%C3%ADmpica'; } },
                { label: '📱 Falar com Leandro',           next: 'wa_bo', waMsg: 'Olá Leandro! Tenho interesse em imóveis na Barra Olímpica. Pode me ajudar?' },
                { label: '↩ Outros bairros',               next: 'bairros' },
            ],
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
        fin_como: {
            msg: '🏦 **Como funciona o financiamento:**\n\n• Você paga entrada (mín. 20%)\n• O banco financia o restante em até **360 meses**\n• Taxas: a partir de **10,5% a.a.**\n• Análise de crédito: renda, CPF, histórico\n\nO Leandro te indica o melhor banco para o seu perfil!',
            opts: [
                { label: '📱 Simular com Leandro', next: 'wa_financiamento', waMsg: 'Olá Leandro! Quero simular um financiamento imobiliário. Pode me ajudar?' },
                { label: '💰 E o FGTS?',           next: 'fin_fgts'          },
                { label: '↩ Voltar',               next: 'financiamento'     },
            ],
        },
        fin_fgts: {
            msg: '💰 **FGTS no financiamento:**\n\n• Pode usar para dar a **entrada**\n• Ou para **amortizar** o saldo devedor\n• Ou para **pagar prestações** (até 12 meses)\n• Requisitos: 3+ anos de carteira assinada, sem outro financiamento ativo, primeiro imóvel residencial',
            opts: [
                { label: '📱 Verificar meu FGTS com Leandro', next: 'wa_financiamento', waMsg: 'Olá Leandro! Quero usar meu FGTS para comprar um imóvel. Pode me orientar?' },
                { label: '↩ Voltar', next: 'financiamento' },
            ],
        },
        fin_entrada: {
            msg: '📊 **Sobre a entrada:**\n\n• Mínimo de **20% do valor** para financiamento\n• Quanto maior a entrada, menor a taxa de juros\n• **FGTS** pode compor parte da entrada\n• Minha Casa Minha Vida: entrada pode ser menor\n\nO Leandro tem parceiros que ajudam a otimizar!',
            opts: [
                { label: '📱 Analisar entrada com Leandro', next: 'wa_financiamento', waMsg: 'Olá Leandro! Quero entender melhor como funciona a entrada.' },
                { label: '↩ Voltar', next: 'financiamento' },
            ],
        },
        fin_aprovado: {
            msg: '✅ **Como saber se será aprovado:**\n\n• Parcela máxima = 30% da sua renda mensal\n• Sem restrições no CPF (Serasa/SPC)\n• Histórico de crédito positivo\n• Documentos e comprovantes em ordem\n\nO Leandro faz a **pré-análise gratuita** antes do banco!',
            opts: [
                { label: '📱 Pré-análise gratuita', next: 'wa_financiamento', waMsg: 'Olá Leandro! Quero fazer uma pré-análise do meu crédito. Pode me ajudar?' },
                { label: '↩ Voltar', next: 'financiamento' },
            ],
        },
        fin_banco: {
            msg: '🏦 **Melhores bancos para financiamento:**\n\n• **Caixa** — menores taxas, especializada em imóveis\n• **Banco do Brasil** — bom para servidores\n• **Itaú** — rápido, bom para autônomos\n• **Bradesco** — flexível, renda variada\n• **Santander** — taxas competitivas\n\nO Leandro busca a **melhor taxa para você**!',
            opts: [
                { label: '📱 Buscar melhor taxa com Leandro', next: 'wa_financiamento', waMsg: 'Olá Leandro! Quero saber qual banco tem a melhor taxa para meu perfil.' },
                { label: '↩ Voltar', next: 'financiamento' },
            ],
        },

        /* ── CONTATO ── */
        contato: {
            msg: `📞 **${KB.nome}** — CRECI-RJ 97315\n\n🕐 ${KB.horario}\n📱 ${KB.tel}\n📸 ${KB.instagram}\n✉️ ${KB.email}\n\nComo prefere entrar em contato?`,
            opts: [
                { label: '💬 WhatsApp agora',    action: () => window.open(KB.whatsapp, '_blank')                        },
                { label: '📸 Instagram',         action: () => window.open('https://instagram.com/leopbomfim', '_blank')  },
                { label: '📋 Página de contato', action: () => window.location.href = 'contato.html'                     },
                { label: '↩ Início',             next: 'inicio'                                                           },
            ],
        },

        /* ── CATÁLOGO ── */
        catalogo: {
            msg: '📋 Nosso catálogo completo está na página de imóveis! Filtre por bairro, preço, quartos e tipo.',
            opts: [
                { label: '🏠 Ver todos os imóveis', action: () => window.location.href = 'imoveis.html' },
                { label: '📱 Prefiro WhatsApp',     next: 'contato' },
                { label: '↩ Início',                next: 'inicio'  },
            ],
        },

        /* ── NÓS DE SAÍDA PARA WA ── */
        ver_imoveis_wa:  { msg: null },
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
       RESPOSTAS DIRETAS POR TEXTO LIVRE
    ════════════════════════════════════════════ */
    const DIRECT_ANSWERS = [
        /* CONTATO */
        {
            p: ['numero', 'telefone', 'fone', 'celular', 'cel', 'ligar', 'numero do leandro', 'tel do leandro', 'numero leandro'],
            answer: `📱 O número do **${KB.nome}** é **${KB.tel}**\n\nVocê pode ligar ou mandar mensagem pelo WhatsApp agora mesmo!`,
            opts: [{ label: '💬 Abrir WhatsApp', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu principal', next: 'inicio' }],
        },
        {
            p: ['email', 'e-mail', 'emaile', 'correio eletronico'],
            answer: `✉️ O e-mail do **${KB.nome}** é:\n\n**${KB.email}**`,
            opts: [{ label: '📱 Prefiro WhatsApp', action: () => window.open(KB.whatsapp, '_blank') }, { label: '↩ Menu principal', next: 'inicio' }],
        },
        {
            p: ['instagram', 'insta', 'ig', 'rede social', 'social'],
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
            p: ['preco ipanema', 'preço ipanema', 'quanto custa ipanema', 'valor ipanema', 'valor em ipanema'],
            answer: `🌊 **Preços em Ipanema (2025):**\n\n• Studios (30–40m²): R$ 400–600k\n• 1 quarto: R$ 600k–1M\n• 2 quartos: R$ 900k–2M\n• 3+ quartos: R$ 2M–5M+\n• Coberturas: R$ 3M–15M+\n\n_Valores variam por andar, vista e acabamento._`,
            opts: [{ label: '🏠 Ver imóveis em Ipanema', action: () => { window.location.href = 'imoveis.html?bairro=Ipanema'; } }, { label: '📱 Falar com Leandro', next: 'wa_ipanema', waMsg: 'Olá Leandro! Quero saber sobre preços em Ipanema.' }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['preco leblon', 'preço leblon', 'quanto custa leblon', 'valor leblon', 'valor no leblon'],
            answer: `🏖️ **Preços no Leblon (2025):**\n\n• Studios: R$ 500–800k\n• 1 quarto: R$ 700k–1,3M\n• 2 quartos: R$ 1,2M–2,5M\n• 3+ quartos: R$ 2,5M–6M+\n• Coberturas: R$ 4M–20M+\n\n_O Leblon é o bairro mais valorizado do Rio._`,
            opts: [{ label: '🏠 Ver imóveis no Leblon', action: () => { window.location.href = 'imoveis.html?bairro=Leblon'; } }, { label: '📱 Falar com Leandro', next: 'wa_leblon', waMsg: 'Olá Leandro! Quero saber sobre preços no Leblon.' }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['preco barra', 'preço barra', 'quanto custa barra', 'valor barra', 'valor na barra'],
            answer: `🏙️ **Preços na Barra da Tijuca (2025):**\n\n• 1 quarto: R$ 350–600k\n• 2 quartos: R$ 500k–1M\n• 3 quartos: R$ 800k–1,8M\n• 4+ quartos: R$ 1,5M–4M\n• Coberturas: R$ 2M–8M\n\n_Melhor custo-benefício por m² do Rio._`,
            opts: [{ label: '🏠 Ver imóveis na Barra', action: () => { window.location.href = 'imoveis.html?bairro=Barra+da+Tijuca'; } }, { label: '📱 Falar com Leandro', next: 'wa_barra', waMsg: 'Olá Leandro! Quero saber sobre preços na Barra da Tijuca.' }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['preco recreio', 'preço recreio', 'quanto custa recreio', 'valor recreio', 'valor no recreio'],
            answer: `🌴 **Preços no Recreio (2025):**\n\n• 1 quarto: R$ 280–500k\n• 2 quartos: R$ 400–800k\n• 3 quartos: R$ 600k–1,3M\n• 4+ quartos: R$ 1M–2,5M\n\n_Ótimo custo-benefício e qualidade de vida._`,
            opts: [{ label: '🏠 Ver imóveis no Recreio', action: () => { window.location.href = 'imoveis.html?bairro=Recreio+dos+Bandeirantes'; } }, { label: '📱 Falar com Leandro', next: 'wa_recreio', waMsg: 'Olá Leandro! Quero saber sobre preços no Recreio.' }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['preco copacabana', 'preço copacabana', 'valor copacabana', 'quanto custa copacabana'],
            answer: `🏝️ **Preços em Copacabana (2025):**\n\n• Studios: R$ 250–450k\n• 1 quarto: R$ 380–700k\n• 2 quartos: R$ 600k–1,2M\n• 3+ quartos: R$ 1M–2,5M\n\n_Excelente para investimento e airbnb._`,
            opts: [{ label: '🏠 Ver imóveis em Copa', action: () => { window.location.href = 'imoveis.html?bairro=Copacabana'; } }, { label: '📱 Falar com Leandro', next: 'wa_copa', waMsg: 'Olá Leandro! Quero saber sobre preços em Copacabana.' }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* TIPOS DE IMÓVEL */
        {
            p: ['cobertura', 'penthouse', 'duplex', 'triplex'],
            answer: `🌆 **Coberturas no Rio de Janeiro:**\n\n• São os imóveis mais desejados da cidade\n• Piscina privativa, terraço, churrasqueira\n• Exclusividade e privacidade total\n• Melhor valorização do mercado\n• O Leandro tem coberturas em Ipanema, Leblon e Barra!\n\nA partir de **R$ 1,5M**.`,
            opts: [{ label: '📱 Ver coberturas com Leandro', next: 'wa_luxo', waMsg: 'Olá Leandro! Tenho interesse em coberturas no Rio. Pode me mostrar opções?' }, { label: '📋 Ver catálogo', next: 'catalogo' }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['studio', 'studios', 'kitnet', 'kitnete', 'kitinete', 'compacto'],
            answer: `🏢 **Studios e Kitnets no Rio:**\n\n• Imóveis compactos (20–45m²)\n• Ideais para investimento ou moradia solo\n• Alta demanda de aluguel\n• Ótima liquidez no mercado\n• Disponíveis em Copacabana, Botafogo e Barra\n\nA partir de **R$ 250 mil**!`,
            opts: [{ label: '📱 Ver studios com Leandro', next: 'wa_600', waMsg: 'Olá Leandro! Tenho interesse em studios ou kitnets no Rio. Pode me ajudar?' }, { label: '📋 Ver catálogo', next: 'catalogo' }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['loft'],
            answer: `🏠 **Lofts no Rio:**\n\n• Pé-direito alto, estilo industrial ou moderno\n• Muito valorizados pelo público jovem\n• Botafogo, Flamengo e Barra têm boas opções\n• Alta demanda de aluguel de temporada`,
            opts: [{ label: '📱 Ver lofts com Leandro', next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Tenho interesse em lofts no Rio. Pode me ajudar?' }, { label: '📋 Ver catálogo', next: 'catalogo' }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* DOCUMENTAÇÃO */
        {
            p: ['documento', 'documentacao', 'documentação', 'escritura', 'cartorio', 'cartório', 'papel', 'burocracia'],
            answer: `📄 **Documentação para compra de imóvel:**\n\n**Do comprador:** RG, CPF, comprovante de renda (3 meses), comprovante de residência\n\n**Do imóvel:** Matrícula atualizada, certidão negativa de débitos, IPTU em dia, Habite-se\n\nO Leandro cuida de **toda a documentação** — você só assina! 😊`,
            opts: [{ label: '📱 Tirar dúvidas com Leandro', action: () => window.open(KB.wa('Olá Leandro! Tenho dúvidas sobre documentação para compra de imóvel.'), '_blank') }, { label: '↩ Menu principal', next: 'inicio' }],
        },
        {
            p: ['iptu', 'imposto predial', 'imposto imovel'],
            answer: `💰 **IPTU no Rio de Janeiro:**\n\n• Varia de **0,5% a 1,4% do valor venal** ao ano\n• Pode ser pago anual (com desconto) ou em parcelas\n• O Leandro informa o valor exato de cada imóvel!`,
            opts: [{ label: '📱 Consultar com Leandro', next: 'ver_imoveis_wa', waMsg: 'Olá Leandro! Quero saber o IPTU dos imóveis disponíveis.' }, { label: '↩ Menu', next: 'inicio' }],
        },
        {
            p: ['itbi', 'imposto transferencia', 'custo compra', 'gasto compra', 'taxa compra', 'custos da compra', 'gastos da compra', 'quanto gasto na compra'],
            answer: `📋 **Custos extras na compra de imóvel:**\n\n• **ITBI** (Imposto de Transmissão): ~3% do valor\n• **Escritura** no cartório: ~1,5–2%\n• **Registro** do imóvel: ~0,5–1%\n• **Total estimado:** 4–6% do valor\n\nEx: imóvel R$ 500k → gastos extras de ~R$ 20–30k\n\nO Leandro calcula tudo isso no planejamento!`,
            opts: [{ label: '📱 Planejar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero entender todos os custos de comprar um imóvel.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* FINANCIAMENTO / FGTS (direto ao fluxo) */
        {
            p: ['taxa de juros', 'taxa juros', 'juros financiamento', 'juros banco'],
            answer: `📊 **Taxas de juros para financiamento (2025):**\n\n• **Caixa:** a partir de 10,49% a.a.\n• **Banco do Brasil:** a partir de 10,79% a.a.\n• **Bradesco:** a partir de 10,99% a.a.\n• **Itaú:** a partir de 10,99% a.a.\n• **Santander:** a partir de 11,19% a.a.\n\nO Leandro busca a **melhor taxa para o seu perfil!**`,
            opts: [{ label: '📱 Buscar melhor taxa', next: 'wa_financiamento', waMsg: 'Olá Leandro! Quero buscar a melhor taxa de financiamento para meu perfil.' }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* AIRBNB / ALUGUEL */
        {
            p: ['airbnb', 'temporada', 'aluguel temporada', 'por temporada', 'renda aluguel', 'rendimento aluguel', 'alugar imovel', 'alugar meu imovel'],
            answer: `🏠 **Renda com aluguel no Rio:**\n\n**Airbnb / Temporada:**\n• Copa, Ipanema e Leblon: altíssima demanda\n• R$ 200–800/noite dependendo do padrão\n• Retorno anual: 8–15% do valor do imóvel\n\n**Aluguel tradicional:**\n• Studios em Copa: R$ 2.000–3.500/mês\n• 2 quartos em Ipanema: R$ 4.000–8.000/mês\n\nO Leandro calcula a **rentabilidade estimada**!`,
            opts: [{ label: '📱 Calcular rentabilidade', action: () => window.open(KB.wa('Olá Leandro! Quero calcular a rentabilidade de aluguel de um imóvel no Rio.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* LANÇAMENTO */
        {
            p: ['planta', 'lancamento', 'lançamento', 'em construcao', 'em construção', 'imovel novo', 'imóvel novo', 'novo empreendimento'],
            answer: `🚀 **Imóveis na Planta / Lançamentos:**\n\n**Vantagens:**\n• Preços menores no pré-lançamento\n• Condições facilitadas de pagamento\n• Personalização durante a obra\n• Valorização de 20–40% até a entrega\n\n**Riscos:** Entrega futura (1–3 anos)\n\nO Leandro trabalha com **incorporadoras confiáveis** no Rio!`,
            opts: [{ label: '📱 Ver lançamentos', action: () => window.open(KB.wa('Olá Leandro! Tenho interesse em imóveis na planta ou lançamentos no Rio. Pode me ajudar?'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* VALORIZAÇÃO */
        {
            p: ['valorizacao', 'valorização', 'onde investir', 'melhor bairro investir', 'valorizar'],
            answer: `📈 **Melhores bairros para investir no Rio (2025):**\n\n🥇 **Ipanema/Leblon** — valorização histórica, altíssima demanda\n🥈 **Barra Olímpica** — bairro mais novo, grande potencial\n🥉 **Recreio** — crescimento constante\n🏅 **Copacabana** — turismo, airbnb, alta liquidez\n🏅 **Botafogo** — gentrificação acelerada\n\n_Média: 8% de valorização a.a. nos últimos 10 anos._`,
            opts: [{ label: '📱 Analisar investimento com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero investir em imóvel no Rio. Pode me ajudar a escolher?'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* COMPRAR X ALUGAR */
        {
            p: ['comprar ou alugar', 'compra ou aluguel', 'vale a pena comprar', 'melhor comprar ou alugar', 'compensar comprar'],
            answer: `🤔 **Comprar ou Alugar?**\n\n**Comprar vale quando:**\n• Você tem estabilidade financeira\n• Planeja ficar 5+ anos no imóvel\n• Quer parar de pagar aluguel pro dono\n\n**Alugar pode ser melhor quando:**\n• Ainda não tem a entrada\n• Situação pode mudar em breve\n\n**No Rio, imóveis valorizaram ~8% a.a. nos últimos 10 anos!** 📈`,
            opts: [{ label: '📱 Analisar meu caso', action: () => window.open(KB.wa('Olá Leandro! Quero analisar se é melhor comprar ou alugar no meu caso.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* PASSO A PASSO */
        {
            p: ['como comprar', 'processo de compra', 'passo a passo', 'etapas', 'o que fazer', 'por onde comecar', 'por onde começar'],
            answer: `📋 **Passo a passo para comprar um imóvel:**\n\n**1️⃣** Defina seu orçamento\n**2️⃣** Escolha o bairro ideal\n**3️⃣** Liste o que precisa (quartos, vagas)\n**4️⃣** Visite os imóveis com o Leandro\n**5️⃣** Faça uma proposta\n**6️⃣** Cuide da documentação (o Leandro faz tudo)\n**7️⃣** Assine e receba as chaves! 🗝️`,
            opts: [{ label: '📱 Iniciar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero comprar um imóvel no Rio. Por onde começo?'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* VENDER */
        {
            p: ['vender', 'venda', 'quero vender', 'vendo imovel', 'anunciar imovel'],
            answer: `🏠 **Quer vender seu imóvel?**\n\nO Leandro cuida de tudo:\n\n• ✅ Avaliação gratuita de mercado\n• 📸 Fotos profissionais e divulgação\n• 🤝 Negociação e busca de compradores\n• 📄 Toda a documentação\n• 💰 Estratégia de preço para vender rápido\n\n**${KB.negociados}** com sucesso!`,
            opts: [{ label: '📱 Quero vender meu imóvel', next: 'wa_avaliacao', waMsg: 'Olá Leandro! Quero vender meu imóvel. Pode me ajudar com uma avaliação?' }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* TEMPO */
        {
            p: ['quanto tempo', 'prazo', 'demora', 'tempo para comprar', 'quanto leva'],
            answer: `⏱️ **Prazos típicos:**\n\n• Busca do imóvel: 1–4 semanas\n• Proposta e negociação: 1–2 semanas\n• Documentação: 1–2 semanas\n• Escritura no cartório: 1–3 semanas\n• Registro: 2–4 semanas\n\n**Total médio: 2–3 meses** (financiamento pode adicionar 1–2 meses)\n\nO Leandro acelera cada etapa com sua rede de parceiros!`,
            opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quanto tempo leva para comprar um imóvel com vocês?'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* NEGOCIAÇÃO */
        {
            p: ['negociar', 'desconto', 'pechinchar', 'abater preco', 'abater preço', 'baixar preco', 'baixar preço'],
            answer: `🤝 **Negociação de imóveis:**\n\nÉ comum negociar de **5% a 15% abaixo** do preço pedido — depende de:\n\n• Tempo que o imóvel está à venda\n• Pagamento à vista vs. financiado\n• Condição do imóvel\n\n**Pagamento à vista** tem muito mais poder de negociação!\n\nO Leandro negocia por você com experiência e estratégia!`,
            opts: [{ label: '📱 Negociar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero negociar um imóvel no Rio. Pode me ajudar?'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* PRIMEIRO IMÓVEL */
        {
            p: ['primeiro imovel', 'primeiro imóvel', 'primeiro ape', 'primeiro apê', 'nunca comprei', 'iniciante'],
            answer: `🎉 **Comprando seu primeiro imóvel!**\n\nO Leandro é especialista em ajudar quem compra pela primeira vez:\n\n• ✅ Explica cada etapa com calma\n• ✅ Ajuda a organizar o orçamento\n• ✅ Orienta sobre FGTS e financiamento\n• ✅ Toda a documentação incluída\n\n**Você pode usar o FGTS** para dar entrada se for o primeiro imóvel residencial!`,
            opts: [{ label: '📱 Começar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Vou comprar meu primeiro imóvel. Pode me orientar em cada passo?'), '_blank') }, { label: '💳 Entender financiamento', next: 'financiamento' }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* PET FRIENDLY */
        {
            p: ['pet', 'cachorro', 'gato', 'animal', 'animais', 'pets', 'pet friendly', 'aceita pet', 'aceita animais'],
            answer: `🐾 **Imóveis pet-friendly no Rio:**\n\nO Leandro filtra por:\n• Condomínios que aceitam pets\n• Prédios com pet place\n• Bairros com parques e calçadões\n\n**Recreio e Barra** têm os melhores condomínios pet-friendly!`,
            opts: [{ label: '📱 Buscar imóvel pet-friendly', action: () => window.open(KB.wa('Olá Leandro! Procuro imóvel pet-friendly no Rio. Pode me ajudar?'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* COMISSÃO */
        {
            p: ['comissao', 'comissão', 'corretagem', 'quanto cobra', 'honorario', 'quanto custa o corretor', 'taxa corretor'],
            answer: `💼 **Taxa de corretagem:**\n\n• A comissão é **paga pelo vendedor**, não pelo comprador\n• Tabela CRECI: geralmente **6% do valor** nas transações residenciais\n• Para o **comprador**: o serviço do Leandro é **GRATUITO** ✅\n\nVocê não paga nada extra para ter todo o suporte na compra!`,
            opts: [{ label: '📱 Tirar dúvidas com Leandro', action: () => window.open(KB.wa('Olá Leandro! Tenho dúvidas sobre comissão e corretagem.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* SEGURANÇA */
        {
            p: ['seguro', 'segurança', 'garantia', 'golpe', 'fraude', 'risco compra', 'confiar'],
            answer: `🛡️ **Segurança na compra com o Leandro:**\n\n• Verificação completa da matrícula e histórico do imóvel\n• Certidão negativa de débitos do vendedor\n• Confirmação de inexistência de ônus\n• Contrato revisado por parceiros jurídicos\n• Nunca transfere dinheiro sem documentação em ordem\n\nCom CRECI-RJ você tem um profissional habilitado e responsabilizado!`,
            opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.wa('Olá Leandro! Quero entender a segurança na compra de imóvel.'), '_blank') }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* CONDOMÍNIO FECHADO */
        {
            p: ['condominio fechado', 'condomínio fechado', 'lazer completo', 'condominio club', 'condomínio club', 'piscina condominio', 'academia condominio'],
            answer: `🏊 **Condomínios com lazer completo no Rio:**\n\nBarra da Tijuca e Recreio concentram os melhores:\n\n• 🏊 Piscina adulto e infantil\n• 💪 Academia equipada\n• 🎾 Quadras de esporte\n• 🌳 Áreas verdes e playground\n• 🔒 Segurança 24h\n• 🐾 Pet place`,
            opts: [{ label: '📱 Ver condomínios com Leandro', action: () => window.open(KB.wa('Olá Leandro! Procuro apartamento em condomínio fechado com lazer completo.'), '_blank') }, { label: '📋 Ver catálogo', next: 'catalogo' }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* ALUGUEL (o Leandro atende?) */
        {
            p: ['alugar', 'quero alugar', 'apartamento para alugar', 'locacao', 'locação', 'aluguel residencial'],
            answer: `🏠 **Sobre aluguel:**\n\nO foco principal do Leandro é **compra e venda de imóveis**.\n\nSe quiser **alugar seu imóvel**, ele também pode orientar sobre precificação e encontrar inquilinos qualificados.`,
            opts: [{ label: '🏠 Quero comprar um imóvel', next: 'comprar' }, { label: '💰 Alugar meu imóvel', next: 'wa_avaliacao', waMsg: 'Olá Leandro! Quero colocar meu imóvel para alugar. Pode me ajudar?' }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* SAUDAÇÕES */
        {
            p: ['oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'oi tudo', 'tudo bem', 'tudo bom', 'hello', 'hey', 'ei'],
            flow: 'inicio',
        },

        /* OBRIGADO */
        {
            p: ['obrigado', 'obrigada', 'valeu', 'muito obrigado', 'muito obrigada', 'agradeço', 'agradeco', 'thanks'],
            answer: `😊 Fico feliz em ajudar! O **${KB.nome}** está sempre disponível para te atender.\n\nSe precisar de mais alguma coisa, é só chamar! 🏠`,
            opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.whatsapp, '_blank') }, { label: '🏠 Ver imóveis', next: 'catalogo' }, { label: '↩ Menu', next: 'inicio' }],
        },

        /* TCHAU */
        {
            p: ['tchau', 'ate logo', 'até logo', 'ate mais', 'até mais', 'adeus', 'bye', 'xau'],
            answer: `👋 Até logo! Quando precisar de ajuda com imóveis no Rio, é só voltar aqui.\n\nO **${KB.nome}** está sempre disponível! 😊`,
            opts: [{ label: '📱 Falar com Leandro', action: () => window.open(KB.whatsapp, '_blank') }],
        },
    ];

    /* ════════════════════════════════════════════
       MOTOR DE INTENÇÃO
    ════════════════════════════════════════════ */
    function norm(str) {
        return str.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9 ]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function detectIntent(rawText) {
        const t = norm(rawText);
        const words = t.split(' ');

        // 1) DIRECT_ANSWERS (resposta direta ou redirecionamento de fluxo)
        for (const da of DIRECT_ANSWERS) {
            for (const p of da.p) {
                const pn = norm(p);
                if (t.includes(pn)) return { type: 'direct', da };
                if (!pn.includes(' ') && words.includes(pn)) return { type: 'direct', da };
            }
        }

        // 2) Palavras-chave para fluxos guiados
        const flowMatches = [
            { words: ['ipanema'],                                      flow: 'info_ipanema'   },
            { words: ['leblon'],                                        flow: 'info_leblon'    },
            { words: ['copacabana', 'copa'],                            flow: 'info_copa'      },
            { words: ['botafogo'],                                      flow: 'info_botafogo'  },
            { words: ['flamengo'],                                      flow: 'info_flamengo'  },
            { words: ['barra olimpica'],                                flow: 'info_bo'        },
            { words: ['barra', 'tijuca'],                               flow: 'info_barra'     },
            { words: ['recreio', 'bandeirante'],                        flow: 'info_recreio'   },
            { words: ['terreno', 'lote'],                               flow: 'terrenos'       },
            { words: ['comprar', 'procuro', 'busco', 'apartamento', 'imovel', 'quero imovel', 'casa a venda'], flow: 'comprar' },
            { words: ['vender', 'venda', 'avaliar', 'avaliacao'],       flow: 'avaliar'        },
            { words: ['financiamento', 'financiar', 'parcela', 'prestacao', 'prestação', 'banco'], flow: 'financiamento' },
            { words: ['fgts', 'fundo garantia'],                        flow: 'fin_fgts'       },
            { words: ['bairro', 'regiao', 'onde fica'],                 flow: 'bairros'        },
            { words: ['contato', 'whatsapp', 'falar', 'atendimento'],   flow: 'contato'        },
            { words: ['praia', 'mar', 'orla'],                          flow: 'rec_praia'      },
            { words: ['tranquilo', 'tranquilidade'],                    flow: 'rec_tranquilo'  },
            { words: ['familia', 'crianca', 'filhos'],                  flow: 'rec_familia'    },
            { words: ['investir', 'investimento', 'retorno', 'renda'],  flow: 'rec_invest'     },
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
    let _currentNode= 'inicio';
    let _sessionId  = null;
    let _chatPath   = [];

    function _getDeviceId() {
        let id = localStorage.getItem('_lb_did');
        if (!id) {
            id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
            localStorage.setItem('_lb_did', id);
        }
        return id;
    }

    function _logChat(event, data = {}) {
        try {
            if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
            const db = firebase.firestore();
            if (!_sessionId) _sessionId = _getDeviceId() + '_chat_' + Date.now().toString(36);
            const today = new Date().toISOString().slice(0, 10);
            db.collection('chat_logs').add({
                sessionId:  _sessionId,
                deviceId:   _getDeviceId(),
                event,
                page:       window.location.pathname.split('/').pop() || 'index',
                date:       today,
                timestamp:  firebase.firestore.FieldValue.serverTimestamp(),
                ...data,
            }).catch(() => {});
        } catch (e) {}
    }

    /* ════════════════════════════════════════════
       CRIAR WIDGET
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
        #lb-chat-window{position:fixed;bottom:7.5rem;left:1.5rem;width:350px;max-height:570px;
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
        .lb-chat-status{font-size:.72rem;color:#22c55e;}
        .lb-chat-header-actions{margin-left:auto;display:flex;gap:.3rem;}
        .lb-header-btn{background:rgba(255,255,255,.07);border:none;color:rgba(255,255,255,.5);
            width:28px;height:28px;border-radius:50%;cursor:pointer;display:flex;align-items:center;
            justify-content:center;font-size:.7rem;transition:all .2s;}
        .lb-header-btn:hover{background:rgba(255,255,255,.15);color:#fff;}
        .lb-chat-messages{flex:1;overflow-y:auto;padding:.8rem;display:flex;flex-direction:column;gap:.6rem;
            scrollbar-width:thin;scrollbar-color:rgba(52,152,219,.3) transparent;}
        .lb-chat-messages::-webkit-scrollbar{width:4px;}
        .lb-chat-messages::-webkit-scrollbar-thumb{background:rgba(52,152,219,.3);border-radius:2px;}
        .lb-msg{max-width:90%;padding:.65rem .9rem;border-radius:14px;font-size:.83rem;line-height:1.55;
            color:#e2e8f0;animation:lb-msgIn .25s ease both;}
        @keyframes lb-msgIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .lb-msg.bot{background:rgba(52,152,219,.1);border:1px solid rgba(52,152,219,.15);
            border-bottom-left-radius:4px;align-self:flex-start;}
        .lb-msg.bot strong{color:#7dd3fc;}
        .lb-msg.user{background:linear-gradient(135deg,rgba(52,152,219,.35),rgba(44,62,80,.5));
            border:1px solid rgba(52,152,219,.3);border-bottom-right-radius:4px;align-self:flex-end;text-align:right;}
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
        @media(max-width:480px){
            #lb-chat-window{left:.6rem;right:.6rem;width:auto;bottom:6rem;max-height:480px;}
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
        win.setAttribute('aria-label', 'Chat com assistente');
        win.innerHTML = `
            <div class="lb-chat-header">
                <div class="lb-chat-avatar">🏠</div>
                <div>
                    <div class="lb-chat-name">Assistente LB Imóveis</div>
                    <div class="lb-chat-status">● Online agora</div>
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
                    placeholder="Pergunte qualquer coisa..." maxlength="300" autocomplete="off">
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
    }

    /* ── Chips rápidos ── */
    const QUICK_CHIPS = [
        { label: '🏠 Comprar',       node: 'comprar'       },
        { label: '💰 Avaliar',        node: 'avaliar'       },
        { label: '💳 Financiamento',  node: 'financiamento' },
        { label: '📍 Bairros',        node: 'bairros'       },
        { label: '📞 Contato',        node: 'contato'       },
    ];

    function renderChips() {
        const chips = document.getElementById('lb-chips');
        if (!chips) return;
        chips.innerHTML = QUICK_CHIPS.map(c =>
            `<span class="lb-chip" data-node="${c.node}">${c.label}</span>`
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
        _chatPath  = [];
        _sessionId = null;
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

        addUserMsg(text);

        const intent = detectIntent(text);
        _logChat('chat_texto', {
            text:           text.slice(0, 200),
            intentDetected: intent
                ? (intent.type === 'direct'
                    ? ('direct:' + (intent.da.flow ? 'flow:' + intent.da.flow : 'answer'))
                    : 'flow:' + intent.flow)
                : 'nenhuma',
            path: _chatPath.join('→'),
        });

        if (intent) {
            setTimeout(() => {
                if (intent.type === 'direct') {
                    const da = intent.da;
                    if (da.flow) {
                        goTo(da.flow);
                    } else {
                        showTypingThen(() => {
                            addBotMsg(da.answer);
                            if (da.opts && da.opts.length) setTimeout(() => addOpts(da.opts), 350);
                        });
                    }
                } else {
                    goTo(intent.flow);
                }
            }, 500);
        } else {
            // Fallback inteligente — conecta ao WhatsApp com a pergunta
            setTimeout(() => {
                showTypingThen(() => {
                    addBotMsg(`Hmm, deixa eu te conectar direto com o **${KB.nome}** para responder isso com precisão! 😊\n\nEle é especialista e responde rapidinho.`);
                    setTimeout(() => addOpts([
                        { label: '📱 Perguntar no WhatsApp', action: () => window.open(KB.wa(`Olá Leandro! Tenho uma dúvida: "${text.slice(0, 150)}". Pode me ajudar?`), '_blank') },
                        { label: '🏠 Ver catálogo de imóveis', next: 'catalogo' },
                        { label: '↩ Menu principal',           next: 'inicio'   },
                    ]), 400);
                });
            }, 500);
        }
    }

    /* ── Navegar para um nó ── */
    function goTo(nodeKey, waMsg) {
        const msgs = document.getElementById('lb-messages');
        if (!msgs) return;
        _currentNode = nodeKey;
        _chatPath.push(nodeKey);
        msgs.querySelectorAll('.lb-opts').forEach(el => el.remove());

        // Todos os nós "wa_*" abrem WhatsApp
        if (nodeKey === 'ver_imoveis_wa' || nodeKey.startsWith('wa_')) {
            const defaultMsg = 'Olá Leandro! Vim pelo site e gostaria de saber mais sobre os imóveis disponíveis.';
            const msg = waMsg || defaultMsg;
            window.open(KB.wa(msg), '_blank');
            _logChat('chat_whatsapp', { msg: msg.slice(0, 200), waText: msg.slice(0, 200), path: _chatPath.join('→') });
            showTypingThen(() => {
                addBotMsg('✅ Te direcionei para o WhatsApp do **Leandro Bomfim**! Ele responde rapidinho. 😊\n\nPosso ajudar em mais alguma coisa?');
                setTimeout(() => addOpts([
                    { label: '🏠 Ver catálogo de imóveis', next: 'catalogo' },
                    { label: '↩ Menu principal',           next: 'inicio'   },
                ]), 500);
            });
            return;
        }

        const node = FLOWS[nodeKey];
        if (!node) return;

        if (nodeKey !== 'inicio') {
            _logChat('chat_nav', {
                node:   nodeKey,
                botMsg: (node.msg || '').slice(0, 200),
                path:   _chatPath.join('→'),
            });
        }

        showTypingThen(() => {
            addBotMsg(node.msg);
            if (node.opts && node.opts.length) setTimeout(() => addOpts(node.opts), 380);
        });
    }

    /* ── Typing indicator ── */
    function showTypingThen(cb) {
        const msgs = document.getElementById('lb-messages');
        const typing = document.createElement('div');
        typing.className = 'lb-typing';
        typing.innerHTML = '<span></span><span></span><span></span>';
        msgs.appendChild(typing);
        scrollToBottom();
        setTimeout(() => { typing.remove(); cb(); scrollToBottom(); }, 780);
    }

    /* ── Bot msg ── */
    function addBotMsg(text) {
        if (!text) return;
        const msgs = document.getElementById('lb-messages');
        const div = document.createElement('div');
        div.className = 'lb-msg bot';
        div.innerHTML = text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n• /g, '<br>• ')
            .replace(/\n/g, '<br>');
        msgs.appendChild(div);
        scrollToBottom();
    }

    /* ── User msg ── */
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
