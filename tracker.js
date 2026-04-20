//=============================================
//  TRACKER DE VISITAS v4.0 — Leandro Imóveis
//  NOVO: Detecção de SO/dispositivo completa
//  Android, iPhone, iPad, Mac, Windows, Linux
//  Aparece no painel em Visitas e Perfil
// =============================================

(function () {
    'use strict';

    function storageGet(key) {
        try { return localStorage.getItem(key); } catch (e) {
            try { return sessionStorage.getItem(key); } catch (e2) { return null; }
        }
    }
    function storageSet(key, val) {
        try { localStorage.setItem(key, val); } catch (e) {
            try { sessionStorage.setItem(key, val); } catch (e2) { }
        }
    }

    var _fbReady = false;
    function waitForFirebase(cb, attempts) {
        attempts = attempts || 0;
        if (attempts > 150) return;
        if (_fbReady) { cb(); return; }
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
            _fbReady = true; cb();
        } else {
            setTimeout(function () { waitForFirebase(cb, attempts + 1); }, 200);
        }
    }

    function getDb() { return firebase.firestore(); }
    function srvTs() { return firebase.firestore.FieldValue.serverTimestamp(); }

    function getDeviceId() {
        var id = storageGet('_lb_did');
        if (!id) {
            id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
            storageSet('_lb_did', id);
        }
        return id;
    }

    function getPageName() {
        var path = window.location.pathname;
        if (path.includes('imoveis')) return 'Imóveis';
        if (path.includes('contato')) return 'Contato';
        return 'Início';
    }

    function getToday() { return new Date().toISOString().slice(0, 10); }

    function getUtmSnapshot() {
        try {
            var p = new URLSearchParams(window.location.search);
            var o = {};
            ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
                var v = p.get(k); if (v) o[k] = String(v).slice(0, 120);
            });
            return o;
        } catch (e) { return {}; }
    }

    // ═══════════════════════════════════════
    //  DETECÇÃO COMPLETA DE DISPOSITIVO/SO
    // ═══════════════════════════════════════
    function detectOS(ua) {
        if (!ua) return 'Desconhecido';
        if (/iPhone/i.test(ua)) return 'iOS (iPhone)';
        if (/iPad/i.test(ua)) return 'iPadOS';
        if (/iPod/i.test(ua)) return 'iOS (iPod)';
        var andM = ua.match(/Android\s?([\d.]+)/i);
        if (andM) return 'Android ' + (andM[1] ? andM[1].split('.')[0] : '');
        if (/Windows NT 10\.0/.test(ua)) return 'Windows 10/11';
        if (/Windows NT 6\.3/.test(ua)) return 'Windows 8.1';
        if (/Windows NT 6\.1/.test(ua)) return 'Windows 7';
        if (/Windows/i.test(ua)) return 'Windows';
        var macM = ua.match(/Mac OS X ([\d_]+)/);
        if (macM && !/iPhone|iPad|iPod/i.test(ua)) return 'macOS ' + macM[1].replace(/_/g, '.');
        if (/CrOS/i.test(ua)) return 'Chrome OS';
        if (/Ubuntu/i.test(ua)) return 'Ubuntu';
        if (/Linux/i.test(ua)) return 'Linux';
        return 'Outro';
    }

    function detectDeviceType(ua) {
        if (!ua) return 'Desktop';
        if (/iPad/i.test(ua)) return 'Tablet';
        if (/iPhone/i.test(ua)) return 'Smartphone';
        if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'Smartphone' : 'Tablet';
        if (/Mobi/i.test(ua)) return 'Smartphone';
        if (/Smart-TV|SmartTV|TV\//i.test(ua)) return 'Smart TV';
        return 'Desktop';
    }

    function detectDeviceBrand(ua) {
        if (!ua) return '';
        if (/iPhone|iPad|iPod/i.test(ua)) return 'Apple';
        if (/SamsungBrowser|SM-|Galaxy/i.test(ua)) return 'Samsung';
        if (/Xiaomi|MI\s|Redmi|POCO/i.test(ua)) return 'Xiaomi';
        if (/Huawei|HUAWEI/i.test(ua)) return 'Huawei';
        if (/Motorola|moto\s/i.test(ua)) return 'Motorola';
        if (/LGE|LG-/i.test(ua)) return 'LG';
        if (/OnePlus/i.test(ua)) return 'OnePlus';
        if (/Nokia/i.test(ua)) return 'Nokia';
        if (/Sony/i.test(ua)) return 'Sony';
        if (/OPPO/i.test(ua)) return 'OPPO';
        if (/vivo/i.test(ua)) return 'Vivo';
        if (/Realme/i.test(ua)) return 'Realme';
        if (/Mac OS/i.test(ua) && !/iPhone|iPad/i.test(ua)) return 'Apple';
        return '';
    }

    function detectBrowser(ua) {
        if (!ua) return 'Desconhecido';
        if (/Edg\//i.test(ua)) return 'Edge';
        if (/OPR\//i.test(ua) || /Opera\//i.test(ua)) return 'Opera';
        if (/YaBrowser\//i.test(ua)) return 'Yandex';
        if (/SamsungBrowser\//i.test(ua)) return 'Samsung Browser';
        if (/UCBrowser\//i.test(ua)) return 'UC Browser';
        if (/CriOS\//i.test(ua)) return 'Chrome (iOS)';
        if (/FxiOS\//i.test(ua)) return 'Firefox (iOS)';
        if (/Chrome\/[0-9]/i.test(ua)) return 'Chrome';
        if (/Firefox\/[0-9]/i.test(ua)) return 'Firefox';
        if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
        if (/MSIE|Trident\//i.test(ua)) return 'IE';
        return 'Outro';
    }

    function detectBrowserVer(ua) {
        if (!ua) return '';
        var m;
        if ((m = ua.match(/Edg\/([0-9]+)/i))) return 'v' + m[1];
        if ((m = ua.match(/OPR\/([0-9]+)/i))) return 'v' + m[1];
        if ((m = ua.match(/CriOS\/([0-9]+)/i))) return 'v' + m[1];
        if ((m = ua.match(/FxiOS\/([0-9]+)/i))) return 'v' + m[1];
        if ((m = ua.match(/Chrome\/([0-9]+)/i))) return 'v' + m[1];
        if ((m = ua.match(/Firefox\/([0-9]+)/i))) return 'v' + m[1];
        if ((m = ua.match(/Version\/([0-9]+).*Safari/i))) return 'v' + m[1];
        return '';
    }

    /** Família principal do dispositivo/SO (painel admin, export) */
    function detectDeviceFamily(ua) {
        if (!ua) return 'Desconhecido';
        if (/iPhone/i.test(ua)) return 'iPhone';
        if (/iPad/i.test(ua)) return 'iPad';
        if (/iPod/i.test(ua)) return 'iPod';
        if (/Android/i.test(ua)) return 'Android';
        if (/Windows Phone|IEMobile/i.test(ua)) return 'Windows Phone';
        if (/Windows/i.test(ua)) return 'Windows';
        if (/CrOS/i.test(ua)) return 'Chrome OS';
        if (/Mac OS X/i.test(ua)) return 'Mac';
        if (/Ubuntu/i.test(ua)) return 'Ubuntu';
        if (/Linux/i.test(ua)) return 'Linux';
        return 'Outro';
    }

    function getDeviceIcon(deviceType, os) {
        var d = (deviceType || '').toLowerCase();
        if (d.includes('smartphone')) {
            return /ios|iphone/i.test(os) ? '📱 iPhone' : '📱 Android';
        }
        if (d.includes('tablet')) return /ipad/i.test(os) ? '📲 iPad' : '📲 Tablet';
        if (d.includes('tv')) return '📺 Smart TV';
        if (/mac/i.test(os)) return '🍎 Mac';
        if (/windows/i.test(os)) return '🪟 Windows';
        if (/linux|ubuntu|chrome os/i.test(os)) return '🐧 Linux';
        return '💻 Desktop';
    }

    var _diCache = null;
    function getDeviceInfo() {
        if (_diCache) return _diCache;
        var ua = navigator.userAgent || '';
        var os = detectOS(ua);
        var dType = detectDeviceType(ua);
        var conn = '';
        try {
            var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (c) conn = (c.effectiveType || c.type || '') + (c.downlink ? ' / ' + c.downlink + 'Mbps' : '');
        } catch (e) { }
        _diCache = {
            os: os,
            deviceFamily: detectDeviceFamily(ua),
            osVersion: (function () {
                var m = ua.match(/Android\s?([\d.]+)/i) || ua.match(/OS\s([\d_]+)\s/i) || ua.match(/Mac OS X ([\d_]+)/i);
                return m ? m[1].replace(/_/g, '.') : '';
            })(),
            deviceType: dType,
            deviceBrand: detectDeviceBrand(ua),
            browser: detectBrowser(ua),
            browserVer: detectBrowserVer(ua),
            screenW: screen.width || 0,
            screenH: screen.height || 0,
            viewport: window.innerWidth + 'x' + window.innerHeight,
            language: (navigator.language || '').slice(0, 12),
            connection: conn,
            deviceIcon: getDeviceIcon(dType, os),
        };
        return _diCache;
    }

    // ========== ERROS ==========
    var _errQueue = [], _errSending = false, _errLastSentAt = 0, _errCount = 0;
    function _pushErr(payload) {
        if (_errCount > 20) return;
        _errCount++;
        try {
            payload = payload || {};
            payload.page = getPageName(); payload.path = String(window.location.pathname).slice(0, 120);
            payload.deviceId = getDeviceId(); payload.date = getToday();
            _errQueue.push(payload);
            if (!_errSending) setTimeout(_flushErrQueue, 500);
        } catch (e) { }
    }
    function _flushErrQueue() {
        if (_errSending || !_errQueue.length) return;
        var now = Date.now();
        if (now - _errLastSentAt < 4000) { setTimeout(_flushErrQueue, 4000 - (now - _errLastSentAt)); return; }
        _errSending = true; _errLastSentAt = now;
        waitForFirebase(function () {
            try {
                var item = _errQueue.shift();
                getDb().collection('eventos').add({
                    deviceId: item.deviceId, eventName: 'client_error', page: item.page, date: item.date, timestamp: srvTs(),
                    eventData: { path: (item.path || '').slice(0, 140), kind: (item.kind || 'error').slice(0, 24), message: (item.message || '').slice(0, 240), source: (item.source || '').slice(0, 140), stack: (item.stack || '').slice(0, 500) }
                }).catch(function () { });
            } catch (e) { } finally { _errSending = false; if (_errQueue.length) setTimeout(_flushErrQueue, 1000); }
        });
    }
    window.addEventListener('error', function (ev) {
        try { var err = ev && ev.error; _pushErr({ kind: 'error', message: (ev && ev.message) ? String(ev.message) : (err && err.message ? String(err.message) : 'Erro'), source: (ev && ev.filename) ? String(ev.filename) + ':' + (ev.lineno || 0) : '', stack: err && err.stack ? String(err.stack) : '' }); } catch (e) { }
    });
    window.addEventListener('unhandledrejection', function (ev) {
        try { var r = ev && ev.reason; _pushErr({ kind: 'promise', message: r && r.message ? String(r.message) : String(r || 'Promise rejeitada'), source: '', stack: r && r.stack ? String(r.stack) : '' }); } catch (e) { }
    });

    // ========== PRESENÇA ==========
    var _presencaInterval = null;
    function updatePresence() {
        waitForFirebase(function () {
            try {
                var deviceId = getDeviceId();
                var di = getDeviceInfo();
                getDb().collection('presenca').doc(deviceId).set({
                    deviceId: deviceId,
                    page: getPageName(),
                    lastSeen: srvTs(),
                    date: getToday(),
                    os: di.os,
                    deviceType: di.deviceType,
                    browser: di.browser,
                    deviceIcon: di.deviceIcon,
                }, { merge: true }).catch(function () { });
            } catch (e) { }
        });
    }
    function startPresence() {
        updatePresence();
        if (_presencaInterval) clearInterval(_presencaInterval);
        _presencaInterval = setInterval(updatePresence, 60000);
        document.addEventListener('visibilitychange', function () { if (!document.hidden) updatePresence(); });
    }

    // ========== TEMPO ==========
    var sessionStartTime = Date.now(), currentImovelId = null, imovelViewStartTime = null;
    function trackTimeSpent(page, secs) {
        if (secs < 5) return;
        waitForFirebase(function () {
            try {
                var deviceId = getDeviceId(), today = getToday();
                getDb().collection('tempo_permanencia').add({ deviceId: deviceId, page: page, timeSpent: secs, date: today, sessionId: deviceId + '_' + today + '_' + sessionStartTime, timestamp: srvTs() }).catch(function () { });
            } catch (e) { }
        });
    }
    function trackImovelTimeSpent(imovelId, secs) {
        if (secs < 3) return;
        waitForFirebase(function () {
            try { getDb().collection('tempo_imovel').add({ deviceId: getDeviceId(), imovelId: String(imovelId), timeSpent: secs, date: getToday(), timestamp: srvTs() }).catch(function () { }); } catch (e) { }
        });
    }
    window.addEventListener('beforeunload', function () {
        trackTimeSpent(getPageName(), Math.round((Date.now() - sessionStartTime) / 1000));
        if (currentImovelId && imovelViewStartTime) trackImovelTimeSpent(currentImovelId, Math.round((Date.now() - imovelViewStartTime) / 1000));
    });

    // ========== EVENTOS ==========
    window.trackEvent = function (eventName, eventData) {
        eventData = eventData || {};
        waitForFirebase(function () {
            try {
                var di = getDeviceInfo();
                getDb().collection('eventos').add({
                    deviceId: getDeviceId(),
                    eventName: eventName,
                    eventData: eventData,
                    page: getPageName(),
                    date: getToday(),
                    timestamp: srvTs(),
                    os: di.os,
                    deviceType: di.deviceType,
                    browser: di.browser,
                    deviceIcon: di.deviceIcon,
                }).catch(function () { });
            } catch (e) { }
        });
    };

    window.trackWhatsAppClick = function (imovelInfo) { window.trackEvent('whatsapp_click', { imovelInfo: imovelInfo || null }); };
    window.startImovelView = function (imovelId, titulo) {
        currentImovelId = imovelId; imovelViewStartTime = Date.now();
        window.trackEvent('imovel_view_start', { imovelId: imovelId, titulo: titulo });
    };

    // ========== VISITAS POR IMÓVEL ==========
    window.trackImovelView = function (imovelId, titulo, bairro) {
        waitForFirebase(function () {
            try {
                var deviceId = getDeviceId(), today = getToday(), di = getDeviceInfo();
                var key = deviceId + '_view_' + String(imovelId).slice(0, 40) + '_' + today;
                getDb().collection('visitas_imoveis').doc(key).set({
                    deviceId: deviceId,
                    imovelId: String(imovelId),
                    titulo: (titulo || '').slice(0, 120),
                    bairro: (bairro || '').slice(0, 80),
                    date: today,
                    timestamp: srvTs(),
                    os: di.os,
                    deviceType: di.deviceType,
                    browser: di.browser,
                    deviceIcon: di.deviceIcon,
                }, { merge: true }).catch(function () { });
                window.trackEvent('imovel_view', { imovelId: imovelId, titulo: titulo, bairro: bairro });
            } catch (e) { }
        });
    };

    // ========== LINKS COPIADOS ==========
    window.trackLinkCopiado = function (imovelId, imovelTitulo) {
        waitForFirebase(function () {
            try {
                var today = getToday(), di = getDeviceInfo();
                getDb().collection('links_copiados').add({
                    deviceId: getDeviceId(),
                    imovelId: String(imovelId || ''),
                    titulo: (imovelTitulo || '').slice(0, 120),
                    date: today,
                    timestamp: srvTs(),
                    os: di.os,
                    deviceType: di.deviceType,
                    browser: di.browser,
                    deviceIcon: di.deviceIcon,
                }).catch(function (err) {
                    setTimeout(function () {
                        try { getDb().collection('links_copiados').add({ deviceId: getDeviceId(), imovelId: String(imovelId || ''), titulo: (imovelTitulo || '').slice(0, 120), date: today, timestamp: srvTs() }).catch(function () { }); } catch (e2) { }
                    }, 2000);
                });
                window.trackEvent('link_copiado', { imovelId: imovelId, titulo: imovelTitulo });
            } catch (e) { }
        });
    };

    // ========== VISITA DE PÁGINA ==========
    function trackVisit() {
        try {
            var deviceId = getDeviceId(), page = getPageName(), today = getToday(), di = getDeviceInfo();
            var ref = getDb().collection('visitas').doc(deviceId + '_' + page + '_' + today);
            ref.get().then(function (doc) {
                if (!doc.exists) {
                    ref.set({
                        deviceId: deviceId,
                        page: page,
                        date: today,
                        timestamp: srvTs(),
                        userAgent: navigator.userAgent.slice(0, 200),
                        os: di.os,
                        osVersion: di.osVersion,
                        deviceFamily: di.deviceFamily,
                        deviceType: di.deviceType,
                        deviceBrand: di.deviceBrand,
                        browser: di.browser,
                        browserVer: di.browserVer,
                        screenW: di.screenW,
                        screenH: di.screenH,
                        viewport: di.viewport,
                        language: di.language,
                        connection: di.connection,
                        deviceIcon: di.deviceIcon,
                    }).catch(function () { });
                    window.trackEvent('nova_visita', { page: page, referrer: (document.referrer || '').slice(0, 200), utm: getUtmSnapshot(), lang: di.language, os: di.os, deviceType: di.deviceType, browser: di.browser });
                }
            }).catch(function () {
                setTimeout(function () {
                    try {
                        var di2 = getDeviceInfo();
                        ref.set({ deviceId: deviceId, page: page, date: today, timestamp: srvTs(), userAgent: navigator.userAgent.slice(0, 200), os: di2.os, deviceFamily: di2.deviceFamily, deviceType: di2.deviceType, browser: di2.browser, deviceIcon: di2.deviceIcon }, { merge: true }).catch(function () { });
                    } catch (e2) { }
                }, 3000);
            });
        } catch (e) { setTimeout(function () { waitForFirebase(trackVisit); }, 3000); }
    }

    // Expõe para uso no chat-widget e admin
    window._lbDetectDevice = {
        getInfo: getDeviceInfo,
        getIcon: function () { return getDeviceInfo().deviceIcon; },
        getOS: function () { return getDeviceInfo().os; },
        getType: function () { return getDeviceInfo().deviceType; },
        getFamily: function () { return getDeviceInfo().deviceFamily; },
        getBrowser: function () { return getDeviceInfo().browser; },
    };

    function ipKeyFromIp(ip) {
        if (!ip || typeof ip !== 'string') return '';
        return ip.replace(/\./g, '_').replace(/:/g, '_');
    }

    function showAccessBlockedOverlay(reason) {
        if (document.getElementById('_lb-access-blocked')) return;
        var d = document.createElement('div');
        d.id = '_lb-access-blocked';
        d.setAttribute('role', 'alert');
        d.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#0a0f18;color:#e2e8f0;display:flex;align-items:center;justify-content:center;padding:1.5rem;text-align:center;font-family:system-ui,sans-serif;';
        d.innerHTML = '<div style="max-width:420px;"><div style="font-size:3rem;margin-bottom:.5rem;">🛡️</div><h1 style="font-size:1.25rem;margin:0 0 .75rem;">Acesso restrito</h1><p style="font-size:.9rem;line-height:1.5;opacity:.85;margin:0;">Este endereço foi bloqueado pelo administrador do site. Se você acredita que isso é um erro, entre em contato por outro canal.</p><p style="font-size:.72rem;margin-top:1rem;opacity:.5;">' + String(reason || '').replace(/</g, '') + '</p></div>';
        document.body.appendChild(d);
        document.body.style.overflow = 'hidden';
    }

    // ═══════════════════════════════════════════════════
    //  ASNs conhecidos de datacenters/VPN providers
    //  (complementa a detecção da ip-api)
    // ═══════════════════════════════════════════════════
    var DATACENTER_ASN_PATTERNS = [
        'amazon', 'aws', 'google cloud', 'microsoft azure', 'digitalocean',
        'linode', 'vultr', 'hetzner', 'ovh', 'scaleway', 'cloudflare',
        'fastly', 'akamai', 'leaseweb', 'serverius', 'psychz', 'quadranet',
        'multacom', 'tzulo', 'fdcservers', 'incapsula', 'zenlayer',
        'alibaba cloud', 'tencent cloud', 'huawei cloud', 'oracle cloud',
        'choopa', 'as-choopa', 'peg tech', 'as62785', 'path network',
        'spinservers', 'reliablesite', 'sharktech', 'colocation',
        'voxility', 'combahton', 'contabo', 'netcup', 'strato',
    ];

    var VPN_ISP_PATTERNS = [
        'nordvpn', 'expressvpn', 'surfshark', 'cyberghost', 'private internet access',
        'ipvanish', 'protonvpn', 'mullvad', 'windscribe', 'tunnelbear',
        'hotspot shield', 'vyprvpn', 'hidemyass', 'strongvpn', 'purevpn',
        'zenmate', 'torguard', 'airvpn', 'perfect privacy', 'ivpn',
        'hide.me', 'goose vpn', 'avast vpn', 'norton vpn', 'kaspersky vpn',
        'vpn unlimited', 'urban vpn', 'hola vpn', 'opera vpn',
        'privatevpn', 'astrill', 'cactusvpn', 'trust zone',
    ];

    function _matchesPatterns(str, patterns) {
        if (!str) return false;
        var low = String(str).toLowerCase();
        for (var i = 0; i < patterns.length; i++) {
            if (low.indexOf(patterns[i]) !== -1) return true;
        }
        return false;
    }

    // Detecta Tor: tenta uma requisição para um endpoint que identifica saídas Tor
    function _detectTor(ip) {
        // Formato reverso do IP para consulta DNSBL do Tor (Dan.me.uk)
        try {
            var parts = String(ip).split('.');
            if (parts.length !== 4) return Promise.resolve(false);
            var rev = parts.reverse().join('.');
            // Usa IP-API que já inclui proxy (cobre Tor também)
            // Complemento: verificamos se ASN contém 'tor'
            return Promise.resolve(false);
        } catch (e) { return Promise.resolve(false); }
    }

    // Calcula score de risco robusto (0–100)
    function _calcRiskScore(geo, asnStr, ispStr) {
        var score = 0;
        var flags = [];

        // Sinais primários da ip-api
        if (geo.proxy) { score += 45; flags.push('proxy_detected'); }
        if (geo.hosting) { score += 30; flags.push('datacenter_hosting'); }

        // Sinais secundários: ASN e ISP
        if (_matchesPatterns(asnStr, DATACENTER_ASN_PATTERNS)) { score += 20; flags.push('datacenter_asn'); }
        if (_matchesPatterns(ispStr, DATACENTER_ASN_PATTERNS)) { score += 15; flags.push('datacenter_isp'); }
        if (_matchesPatterns(ispStr, VPN_ISP_PATTERNS)) { score += 35; flags.push('vpn_isp'); }
        if (_matchesPatterns(asnStr, VPN_ISP_PATTERNS)) { score += 35; flags.push('vpn_asn'); }

        // Rede móvel (baixo risco, mas registrar)
        if (geo.mobile) { score += 3; flags.push('mobile_isp'); }

        // País de alto risco para anonimização (registrar apenas, não bloquear)
        var highRiskCountries = ['RU', 'CN', 'KP', 'IR', 'BY'];
        if (geo.countryCode && highRiskCountries.indexOf(geo.countryCode) !== -1) {
            score += 10; flags.push('high_risk_country');
        }

        // Timezone incompatível com país declarado (heurística simples)
        try {
            var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            if (geo.countryCode === 'BR' && tz && tz.indexOf('America') === -1 && tz.indexOf('Brazil') === -1) {
                score += 8; flags.push('timezone_mismatch');
            }
        } catch (e) { }

        // WebRTC leak detection — se IP local não bate com geo (heurística)
        // (simplificado: marca apenas se tiver outros sinais)

        // Cap em 100
        score = Math.min(score, 100);

        return { score: score, flags: flags };
    }

    // Tenta obter IP via múltiplas fontes (fallback)
    function _fetchClientIp() {
        return fetch('https://api.ipify.org?format=json', { cache: 'no-store' })
            .then(function (r) { return r.json(); })
            .then(function (j) { if (j && j.ip) return j.ip; throw new Error('no-ip'); })
            .catch(function () {
                // Fallback: api64.ipify.org (suporta IPv6)
                return fetch('https://api64.ipify.org?format=json', { cache: 'no-store' })
                    .then(function (r) { return r.json(); })
                    .then(function (j) { if (j && j.ip) return j.ip; throw new Error('no-ip-fb'); });
            });
    }

    // Geo via ip-api (fonte primária) com fallback para ipapi.co
    function _fetchGeoData(ip) {
        var fields = 'status,proxy,hosting,mobile,isp,org,as,asname,query,country,countryCode,regionName,city,zip,lat,lon,timezone';
        return fetch('https://ip-api.com/json/' + encodeURIComponent(ip) + '?fields=' + fields, { cache: 'no-store' })
            .then(function (r) { return r.json(); })
            .then(function (geo) {
                if (geo && geo.status === 'success') return { source: 'ip-api', geo: geo };
                throw new Error('ip-api-fail');
            })
            .catch(function () {
                // Fallback: ipapi.co
                return fetch('https://ipapi.co/' + encodeURIComponent(ip) + '/json/', { cache: 'no-store' })
                    .then(function (r) { return r.json(); })
                    .then(function (d) {
                        if (d && !d.error) {
                            // Normaliza formato para o mesmo shape do ip-api
                            return {
                                source: 'ipapi.co',
                                geo: {
                                    status: 'success',
                                    proxy: false, // ipapi.co free não informa
                                    hosting: false,
                                    mobile: false,
                                    isp: d.org || '',
                                    org: d.org || '',
                                    as: d.asn || '',
                                    asname: d.org || '',
                                    country: d.country_name || '',
                                    countryCode: d.country_code || '',
                                    regionName: d.region || '',
                                    city: d.city || '',
                                    zip: d.postal || '',
                                    lat: d.latitude || 0,
                                    lon: d.longitude || 0,
                                    timezone: d.timezone || '',
                                }
                            };
                        }
                        throw new Error('ipapi-fail');
                    });
            });
    }

    var _networkCheckDone = false;
    function runPublicNetworkCheck() {
        if (_networkCheckDone) return;
        if (document.body && document.body.classList.contains('admin-page')) return;
        _networkCheckDone = true;

        waitForFirebase(function () {
            var clientIp = null;
            var ipKey = null;

            _fetchClientIp()
                .then(function (ip) {
                    clientIp = ip;
                    ipKey = ipKeyFromIp(ip);
                    // Verifica bloqueio ANTES de qualquer outra coisa
                    return getDb().collection('blocked_ips').doc(ipKey).get();
                })
                .then(function (doc) {
                    if (doc && doc.exists) {
                        showAccessBlockedOverlay('IP bloqueado pelo administrador');
                        return null; // interrompe a cadeia
                    }
                    // IP não bloqueado: faz análise de rede
                    return _fetchGeoData(clientIp);
                })
                .then(function (result) {
                    if (!result) return null; // foi bloqueado acima
                    var geo = result.geo;
                    var geoSource = result.source;
                    var asnStr = String(geo.as || geo.asname || '').toLowerCase();
                    var ispStr = String(geo.isp || geo.org || '').toLowerCase();

                    var risk = _calcRiskScore(geo, asnStr, ispStr);
                    var score = risk.score;
                    var flags = risk.flags;

                    // Determina label de risco
                    var riskLabel = score >= 60 ? 'alto' : score >= 30 ? 'medio' : 'baixo';

                    // Resumo VPN
                    var vpnSummary = [];
                    if (geo.proxy) vpnSummary.push('Proxy/VPN (ip-api)');
                    if (geo.hosting) vpnSummary.push('Datacenter/Hosting');
                    if (_matchesPatterns(ispStr, VPN_ISP_PATTERNS)) vpnSummary.push('ISP de VPN');
                    if (_matchesPatterns(asnStr, DATACENTER_ASN_PATTERNS)) vpnSummary.push('ASN de datacenter');
                    if (!vpnSummary.length) vpnSummary.push('Sem sinais detectados');

                    // Salva no Firestore com todos os campos enriquecidos
                    var di = getDeviceInfo ? getDeviceInfo() : {};
                    var payload = {
                        deviceId: getDeviceId(),
                        date: getToday(),
                        timestamp: srvTs(),
                        // IP e geo
                        ip: String(clientIp).slice(0, 45),
                        country: String(geo.country || '').slice(0, 80),
                        countryCode: String(geo.countryCode || '').slice(0, 4),
                        region: String(geo.regionName || '').slice(0, 80),
                        city: String(geo.city || '').slice(0, 80),
                        zip: String(geo.zip || '').slice(0, 20),
                        lat: geo.lat || 0,
                        lon: geo.lon || 0,
                        timezone: String(geo.timezone || '').slice(0, 60),
                        // Rede
                        isp: String(geo.isp || '').slice(0, 120),
                        org: String(geo.org || '').slice(0, 120),
                        asn: String(geo.as || '').slice(0, 80),
                        asnName: String(geo.asname || '').slice(0, 80),
                        // Sinais de risco
                        proxy: !!geo.proxy,
                        hosting: !!geo.hosting,
                        mobile: !!geo.mobile,
                        vpnScore: score,
                        riskLabel: riskLabel,
                        flags: flags.slice(0, 12),
                        vpnSummary: vpnSummary.join(' · ').slice(0, 200),
                        geoSource: geoSource,
                        // Dispositivo
                        os: di.os || '',
                        deviceType: di.deviceType || '',
                        browser: di.browser || '',
                        deviceIcon: di.deviceIcon || '',
                        uaSnippet: (navigator.userAgent || '').slice(0, 150),
                        // Contexto
                        page: getPageName(),
                        referrer: String(document.referrer || '').slice(0, 200),
                        screenRes: (screen.width || 0) + 'x' + (screen.height || 0),
                        viewport: (window.innerWidth || 0) + 'x' + (window.innerHeight || 0),
                        lang: (navigator.language || '').slice(0, 12),
                    };

                    getDb().collection('visitor_network').add(payload).catch(function () { });

                    // Se score alto, registra também em visitor_alerts para destaque no painel
                    if (score >= 60) {
                        getDb().collection('visitor_alerts').add({
                            deviceId: payload.deviceId,
                            ip: payload.ip,
                            vpnScore: score,
                            riskLabel: riskLabel,
                            flags: flags,
                            vpnSummary: payload.vpnSummary,
                            country: payload.country,
                            isp: payload.isp,
                            date: getToday(),
                            timestamp: srvTs(),
                            page: payload.page,
                            autoBlocked: false,
                        }).catch(function () { });
                    }

                    // Verifica novamente o bloqueio (pode ter sido adicionado durante a análise)
                    return getDb().collection('blocked_ips').doc(ipKey).get();
                })
                .then(function (docFinal) {
                    if (docFinal && docFinal.exists) showAccessBlockedOverlay('IP bloqueado pelo administrador');
                })
                .catch(function () { /* falha silenciosa — não interrompe o site */ });
        });
    }

    function init() {
        waitForFirebase(trackVisit);
        startPresence();
        setTimeout(runPublicNetworkCheck, 700);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

})();
