/**
 * Namvio Social — Domain investor network client router
 * XSS-safe rendering, local persistence, view routing
 */

const STORAGE_KEY = 'namvio_session_v1';

/** Legacy nav tokens → view id suffix (view-{id}) */
const VIEW_ROUTE_ALIASES = {
    leaders: 'hof',
    'hall-of-fame': 'hof',
    halloffame: 'hof',
    listings: 'marketplace',

    'domain-sales': 'domain-sales',
    domainsales: 'domain-sales',
    'market-pulse': 'market-pulse',
    marketpulse: 'market-pulse',
    insights: 'market-pulse',
    trending: 'market-pulse',
    messages: 'mesages',
    message: 'mesages',
    mesage: 'mesages',
    dm: 'mesages',
    dms: 'mesages',
    howto: 'guide',
    'how-to-use': 'guide',
    guidelines: 'guide',
    'community-rules': 'rules',
    'support-center': 'help',
    'support-namvio': 'support'
};

const DOMAIN_SALES_SIDEBAR_LIMIT = 5;
const domainSalesPanelExpanded = {};

function resolveViewToken(token) {
    const raw = (token || 'feed').toLowerCase().trim();
    return VIEW_ROUTE_ALIASES[raw] || raw;
}

let activeSessionState;

/** Demo community profiles — feed authors, networking, sidebar */
const SEED_ACCOUNTS = [
    {
        id: 'rahul',
        name: 'Rahul Sharma',
        handle: '@rahul_domains',
        role: 'broker',
        rep: 14920,
        niche: 'Fintech & .io flips',
        mutual: 12,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
        bio: 'Broker focused on fintech .io exits and escrow-ready flips.'
    },
    {
        id: 'maya',
        name: 'Maya Chen',
        handle: '@mayac_portfolio',
        role: 'investor',
        rep: 8720,
        niche: 'AI & voice keywords',
        mutual: 8,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
        bio: 'AI keyword portfolio — Voice.ai, agent brands, and premium .ai holds.'
    },
    {
        id: 'james',
        name: 'James Okonkwo',
        handle: '@jok_registrar',
        role: 'registrar',
        rep: 8100,
        niche: 'Registry promos & bulk',
        mutual: 5,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120',
        bio: 'Registrar partnerships, renewal promos, and bulk transfer ops.'
    },
    {
        id: 'alex',
        name: 'Alex Mercer',
        handle: '@alex_elite',
        role: 'elite',
        rep: 9850,
        niche: 'Premium .com holds',
        mutual: 15,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
        bio: 'Long-hold premium .com strategy and private broker introductions.'
    },
    {
        id: 'sofia',
        name: 'Sofia Petrov',
        handle: '@sofia_domains',
        role: 'investor',
        rep: 7650,
        niche: 'EU brandables',
        mutual: 3,
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120',
        bio: 'EU brandable inventory and Sedo/Dan liquidity plays.'
    }
];

const MESSAGE_PEERS = Object.fromEntries(
    SEED_ACCOUNTS.map((a) => [
        a.id,
        {
            id: a.id,
            name: a.name,
            handle: a.handle,
            role: a.role,
            avatar: a.avatar,
            niche: a.niche,
            rep: a.rep
        }
    ])
);

function getSeedIntroMessage(account) {
    const intros = {
        rahul: 'Hey — saw your activity on Namvio. Open to discussing fintech .io flips via escrow?',
        maya: 'Hi! I track AI keyword sales — happy to share Voice.ai comps if useful.',
        james: 'Registry promo week — ping me if you need bulk .co renewal pricing.',
        alex: 'Premium .com holds are my lane — let me know what you are chasing.',
        sofia: 'EU brandables are moving on Sedo — want my latest inquiry list?'
    };
    return intros[account.id] || `Hi — ${account.name} here. Let's talk domains on Namvio.`;
}

function mergeMesageState(stored) {
    const base = defaultMesages();
    const raw = stored && typeof stored === 'object' ? stored : {};
    const byPeer = Object.fromEntries(
        (Array.isArray(raw.threads) ? raw.threads : [])
            .filter((t) => t && MESSAGE_PEERS[t.peerId])
            .map((t) => [
                t.peerId,
                {
                    peerId: t.peerId,
                    unread: Number(t.unread) || 0,
                    messages: Array.isArray(t.messages) ? t.messages : []
                }
            ])
    );

    const threads = SEED_ACCOUNTS.map((account) => {
        const existing = byPeer[account.id];
        if (existing && existing.messages.length) return existing;
        const seed = base.threads.find((t) => t.peerId === account.id);
        if (seed) return seed;
        return {
            peerId: account.id,
            unread: 0,
            messages: [
                {
                    id: 'intro_' + account.id,
                    from: 'them',
                    text: getSeedIntroMessage(account),
                    at: Date.now() - 7200000
                }
            ]
        };
    });

    threads.sort((a, b) => {
        const la = a.messages[a.messages.length - 1]?.at || 0;
        const lb = b.messages[b.messages.length - 1]?.at || 0;
        return lb - la;
    });

    const activeThreadId =
        raw.activeThreadId && MESSAGE_PEERS[raw.activeThreadId] ? raw.activeThreadId : null;

    return { activeThreadId, threads };
}

function defaultMesages() {
    return {
        activeThreadId: 'rahul',
        threads: [
            {
                peerId: 'rahul',
                unread: 1,
                messages: [
                    {
                        id: 'msg1',
                        from: 'them',
                        text: 'Hey — saw your post on FinTech.io. Are you open to a quick escrow close this week?',
                        at: Date.now() - 3600000
                    },
                    {
                        id: 'msg2',
                        from: 'them',
                        text: 'I can intro you to a verified buyer at $48k BIN if helpful.',
                        at: Date.now() - 1800000
                    }
                ]
            },
            {
                peerId: 'maya',
                unread: 0,
                messages: [
                    {
                        id: 'msg3',
                        from: 'them',
                        text: 'Voice.ai comps look strong — want my appraisal sheet from last month?',
                        at: Date.now() - 86400000
                    },
                    {
                        id: 'msg4',
                        from: 'me',
                        text: 'Yes please — especially .ai fintech keywords.',
                        at: Date.now() - 80000000
                    }
                ]
            },
            {
                peerId: 'james',
                unread: 0,
                messages: [
                    {
                        id: 'msg5',
                        from: 'them',
                        text: 'Registry promo: .co renewals at $22 through Sunday. Good for defensive renewals.',
                        at: Date.now() - 172800000
                    }
                ]
            },
            {
                peerId: 'alex',
                unread: 0,
                messages: [
                    {
                        id: 'msg6',
                        from: 'them',
                        text: 'CloudPay.com — still seeing inbound from fintech buyers. Happy to share comp sheet.',
                        at: Date.now() - 259200000
                    }
                ]
            },
            {
                peerId: 'sofia',
                unread: 1,
                messages: [
                    {
                        id: 'msg7',
                        from: 'them',
                        text: 'EU brandable list updated — Vento.com got 3 Sedo inquiries this week.',
                        at: Date.now() - 43200000
                    }
                ]
            }
        ]
    };
}

const SEED_POSTS = [
    {
        id: 'seed_0',
        author: 'Rahul Sharma',
        handle: '@rahul_domains',
        role: 'broker',
        reputation: 14920,
        time: '2h ago',
        body: 'Just closed escrow on FinTech.io — six-figure portfolio flip. Liquidity in .io fintech niches is heating up this quarter.',
        domains: ['FinTech.io'],
        likes: 42,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120'
    },
    {
        id: 'seed_1',
        author: 'Maya Chen',
        handle: '@mayac_portfolio',
        role: 'investor',
        reputation: 8720,
        time: '5h ago',
        body: 'Appraisal thread: Is Voice.ai still a premium hold or time to list? Dropping comps from recent AI keyword sales.',
        domains: ['Voice.ai', 'Speak.io'],
        likes: 28,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120'
    },
    {
        id: 'seed_2',
        author: 'James Okonkwo',
        handle: '@jok_registrar',
        role: 'registrar',
        reputation: 8100,
        time: 'Yesterday',
        body: 'Registry promo alert: .co renewals at $22 through Sunday. Good window for defensive renewals on brand matches.',
        domains: [],
        likes: 67,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120'
    },
    {
        id: 'seed_3',
        author: 'Alex Mercer',
        handle: '@alex_elite',
        role: 'elite',
        reputation: 9850,
        time: '3h ago',
        body: 'Passed on a lowball for CloudPay.com — holding for strategic end-user. Premium finance keywords still have depth in 2026.',
        domains: ['CloudPay.com'],
        likes: 51,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120'
    },
    {
        id: 'seed_4',
        author: 'Sofia Petrov',
        handle: '@sofia_domains',
        role: 'investor',
        reputation: 7650,
        time: '8h ago',
        body: 'EU brandable watchlist: short pronounceable 5–6 letter .com names with outbound interest. Sharing Sedo velocity notes.',
        domains: ['Vento.com', 'Plixo.com'],
        likes: 19,
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120'
    },
    {
        id: 'seed_5',
        author: 'Rahul Sharma',
        handle: '@rahul_domains',
        role: 'broker',
        reputation: 14920,
        time: '1d ago',
        body: 'Broker tip: always verify auth codes before announcing a sale publicly. Saved a client from a fake escrow link last week.',
        domains: [],
        likes: 88,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120'
    }
];

const HOF_LEADERS = [
    { rank: 1, name: 'Rahul Sharma', role: 'broker', score: 14920 },
    { rank: 2, name: 'Alex Mercer', role: 'elite', score: 9850 },
    { rank: 3, name: 'Maya Chen', role: 'investor', score: 8720 },
    { rank: 4, name: 'James Okonkwo', role: 'registrar', score: 8100 },
    { rank: 5, name: 'Sofia Petrov', role: 'investor', score: 7650 }
];

const NETWORKING_EVENTS = [
    { title: 'Broker Roundtable: Q2 .io liquidity', when: 'Jun 12, 2026', type: 'Virtual', attendees: 48 },
    { title: 'AI Domain Appraisal Workshop', when: 'Jun 18, 2026', type: 'Hybrid', attendees: 72 },
    { title: 'Registrar Renewal Promo AMA', when: 'Jun 25, 2026', type: 'Live', attendees: 31 }
];

const NETWORKING_MEMBERS = SEED_ACCOUNTS;

/** Top 10 keyword trends — Sedo marketplace–style (demo; refresh weekly in production) */
const TRENDING_KEYWORDS = [
    { rank: 1, keyword: 'ai', sales: 2847, change: 12, avgPrice: 18500 },
    { rank: 2, keyword: 'crypto', sales: 2103, change: 8, avgPrice: 9200 },
    { rank: 3, keyword: 'finance', sales: 1891, change: 5, avgPrice: 12400 },
    { rank: 4, keyword: 'shop', sales: 1654, change: -2, avgPrice: 4800 },
    { rank: 5, keyword: 'health', sales: 1522, change: 9, avgPrice: 7600 },
    { rank: 6, keyword: 'cloud', sales: 1408, change: 4, avgPrice: 11200 },
    { rank: 7, keyword: 'pay', sales: 1295, change: 11, avgPrice: 15800 },
    { rank: 8, keyword: 'data', sales: 1187, change: 3, avgPrice: 6900 },
    { rank: 9, keyword: 'green', sales: 1064, change: 15, avgPrice: 5400 },
    { rank: 10, keyword: 'meta', sales: 998, change: -4, avgPrice: 8100 }
];

let activeDomainSalesYear = 'all';

function loadDomainSalesYearPref() {
    try {
        const saved = localStorage.getItem('namvio_domain_sales_year_v1');
        const options = window.DOMAIN_SALES_YEAR_OPTIONS || [];
        if (saved && options.some((o) => o.value === saved)) {
            activeDomainSalesYear = saved;
        }
    } catch (_) { /* ignore */ }
    window.activeDomainSalesYear = activeDomainSalesYear;
}

const SUBSCRIPTION_PLANS = [
    {
        id: 'free',
        name: 'Community',
        tagline: 'Join the domain feed',
        monthly: 0,
        yearly: 0,
        features: [
            { text: 'Public community feed', included: true },
            { text: 'Basic profile & reputation', included: true },
            { text: '3 marketplace listings / mo', included: true },
            { text: 'Broker direct messages', included: false },
            { text: 'Pinned listings & analytics', included: false }
        ]
    },
    {
        id: 'investor',
        name: 'Investor Pro',
        tagline: 'For active portfolio builders',
        monthly: 19,
        yearly: 190,
        features: [
            { text: 'Unlimited feed posts', included: true },
            { text: '15 marketplace listings / mo', included: true },
            { text: 'Domain appraisal assistant', included: true },
            { text: 'Investor Pro verified badge', included: true },
            { text: 'Broker direct messages', included: false }
        ]
    },
    {
        id: 'broker',
        name: 'Broker Plus',
        tagline: 'Close deals faster',
        monthly: 49,
        yearly: 490,
        featured: true,
        features: [
            { text: 'Everything in Investor Pro', included: true },
            { text: 'Unlimited listings + top pin', included: true },
            { text: 'DM any member (escrow flag)', included: true },
            { text: 'Lead inbox & offer templates', included: true },
            { text: 'Weekly market digest email', included: true }
        ]
    },
    {
        id: 'founder',
        name: 'Founder Elite',
        tagline: 'Limited — 1,000 seats',
        monthly: 99,
        yearly: 990,
        limited: true,
        features: [
            { text: 'Everything in Broker Plus', included: true },
            { text: 'Alpha Founder badge (permanent)', included: true },
            { text: 'Hall of Fame priority ranking', included: true },
            { text: 'Private #DomainFlips lounge', included: true },
            { text: 'API access for portfolio sync', included: true }
        ]
    }
];

const PLAN_BADGES = {
    free: null,
    investor: 'Investor Pro Member',
    broker: 'Broker Plus Member',
    founder: 'Founder Elite Member'
};

const ROLE_BADGE_CLASS = {
    investor: 'badge-investor',
    broker: 'badge-broker',
    elite: 'badge-elite',
    registrar: 'badge-registrar'
};

const ROLE_LABEL = {
    investor: 'Investor',
    broker: 'Broker',
    elite: 'Founder',
    registrar: 'Registrar'
};

const DEFAULT_EMAIL = 'apkadostshubham@gmail.com';

const VALID_PLAN_IDS = SUBSCRIPTION_PLANS.map((p) => p.id);

function defaultSettings() {
    return {
        bio: 'Domain investor building a premium .com and .ai portfolio.',
        publicProfile: true,
        showEmail: false,
        whoCanSeePosts: 'public',
        notifyEmail: true,
        notifyDeals: true,
        notifyMentions: true,
        notifyDigest: false,
        timezone: 'Asia/Kolkata',
        showPortfolio: true
    };
}

const SEED_COMMENTS = {
    seed_0: [
        {
            id: 'c_s0_1',
            author: 'Maya Chen',
            handle: '@mayac_portfolio',
            reputation: 8720,
            body: 'Strong close — congrats on the .io flip.',
            likes: 4,
            liked: false
        }
    ],
    seed_1: [
        {
            id: 'c_s1_1',
            author: 'James Okonkwo',
            handle: '@jok_registrar',
            reputation: 8100,
            body: 'Voice.ai comps are wild this quarter.',
            likes: 2,
            liked: false
        }
    ],
    seed_3: [
        {
            id: 'c_s3_1',
            author: 'Maya Chen',
            handle: '@mayac_portfolio',
            reputation: 8720,
            body: 'Finance keyword depth is real — good hold call.',
            likes: 3,
            liked: false
        }
    ],
    seed_4: [
        {
            id: 'c_s4_1',
            author: 'Alex Mercer',
            handle: '@alex_elite',
            reputation: 9850,
            body: 'Sedo velocity on EU brandables is up — thanks for sharing.',
            likes: 1,
            liked: false
        }
    ]
};

function defaultSession() {
    return {
        displayName: 'Shubham',
        handle: '@apkadostshubham',
        email: DEFAULT_EMAIL,
        role: 'elite',
        reputationScore: 4120,
        isVerified: true,
        isHofMember: false,
        isShadowBanned: false,
        isSuspended: false,
        commentsByPost: {},
        badges: ['Alpha Founder', 'Verified Escrow Token'],
        settings: defaultSettings(),
        subscription: {
            planId: 'free',
            billingCycle: 'yearly',
            status: 'active',
            startedAt: null,
            renewsAt: null
        },
        billingHistory: [],
        mesages: defaultMesages()
    };
}

function normalizeSession(data) {
    const base = defaultSession();
    const merged = { ...base, ...data };
    merged.email = merged.email || DEFAULT_EMAIL;
    merged.posts = Array.isArray(merged.posts) ? merged.posts : [];
    merged.badges = Array.isArray(merged.badges) ? merged.badges : base.badges;
    merged.billingHistory = Array.isArray(merged.billingHistory) ? merged.billingHistory : [];
    merged.settings = { ...defaultSettings(), ...(merged.settings || {}) };

    if (!merged.subscription || typeof merged.subscription !== 'object') {
        merged.subscription = { ...base.subscription };
    } else {
        merged.subscription = { ...base.subscription, ...merged.subscription };
    }

    if (!VALID_PLAN_IDS.includes(merged.subscription.planId)) {
        merged.subscription.planId = 'free';
    }
    merged.subscription.billingCycle = 'yearly';
    if (!['active', 'cancelled'].includes(merged.subscription.status)) {
        merged.subscription.status = 'active';
    }

    if (window.NamvioProfile) NamvioProfile.normalizeProfile(merged);

    merged.mesages = mergeMesageState(merged.mesages);

    return merged;
}

function ensureProfileStats() {
    if (!activeSessionState.profile) {
        activeSessionState.profile = window.NamvioProfile ? NamvioProfile.defaultProfile() : { stats: {} };
    }
    if (window.NamvioProfile) NamvioProfile.normalizeProfile(activeSessionState);
    return activeSessionState.profile.stats;
}

function bumpProfileStat(key, delta) {
    const stats = ensureProfileStats();
    stats[key] = (stats[key] || 0) + delta;
}

function loadSession() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            return normalizeSession(JSON.parse(raw));
        }
    } catch (_) { /* ignore corrupt storage */ }
    return defaultSession();
}

activeSessionState = loadSession();

function ensureSessionPersisted() {
    const before = JSON.stringify(activeSessionState.subscription) + JSON.stringify(activeSessionState.billingHistory);
    activeSessionState = normalizeSession(activeSessionState);
    const after = JSON.stringify(activeSessionState.subscription) + JSON.stringify(activeSessionState.billingHistory);
    if (before !== after || !localStorage.getItem(STORAGE_KEY)) {
        saveSession();
    }
}

function saveSession() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activeSessionState));
    } catch (_) { /* quota exceeded */ }
}

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function nvApplyRep(eventType, meta) {
    if (!window.NamvioReputation) return null;
    return NamvioReputation.applyChange(activeSessionState, eventType, meta || {});
}

function getPostKey(post) {
    if (post && post.id) return post.id;
    return 'post_unknown';
}

function getPostComments(postKey) {
    if (SEED_COMMENTS[postKey]) {
        return SEED_COMMENTS[postKey].map((c) => ({ ...c }));
    }
    activeSessionState.commentsByPost = activeSessionState.commentsByPost || {};
    return activeSessionState.commentsByPost[postKey] || [];
}

function renderCommentRow(c, postKey) {
    const tierHtml =
        window.NamvioReputation && NamvioReputation.renderCompact
            ? NamvioReputation.renderCompact(c.reputation || 0)
            : `Rep ${Number(c.reputation || 0).toLocaleString()}`;
    return `
        <div class="post-comment-item" data-comment-id="${escapeHtml(c.id)}">
            <div class="d-flex justify-content-between">
                <span class="font-weight-bold small text-dark">${escapeHtml(c.author)}</span>
                <span class="text-muted" style="font-size:10px;">${escapeHtml(c.handle || '')}</span>
            </div>
            <div class="rep-inline small mb-1">${tierHtml}</div>
            <p class="small text-dark mb-1">${escapeHtml(c.body)}</p>
            <button type="button" class="btn btn-link btn-sm p-0 text-muted" onclick="toggleCommentLike(this, '${escapeHtml(postKey)}', '${escapeHtml(c.id)}')">
                <i class="fa-regular fa-thumbs-up mr-1"></i><span class="comment-like-count">${c.likes || 0}</span>
            </button>
        </div>`;
}

function renderCommentsBlock(postKey) {
    const comments = getPostComments(postKey);
    const list = comments.map((c) => renderCommentRow(c, postKey)).join('');
    return `
        <div class="post-comments-wrap d-none" id="comments-${escapeHtml(postKey)}">
            <div class="post-comments-list">${list || '<p class="text-muted small">No comments yet.</p>'}</div>
            <form class="post-comment-form mt-2" onsubmit="submitPostComment(event, '${escapeHtml(postKey)}')">
                <textarea class="form-control form-control-sm mb-2" rows="2" placeholder="Add a comment…" maxlength="400" required></textarea>
                <button type="submit" class="btn btn-sm btn-primary font-weight-bold" style="background:var(--nv-primary);border-color:var(--nv-primary);">Post comment</button>
            </form>
        </div>`;
}

function renderRepLine(score) {
    if (window.NamvioReputation && NamvioReputation.renderCompact) {
        return NamvioReputation.renderCompact(score || 0, { showBar: false });
    }
    return `Rep ${Number(score || 0).toLocaleString()}`;
}

function extractDomains(text) {
    const matches = text.match(/\b([a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|io|ai|co|net|org|dev|app))\b/gi);
    return matches ? [...new Set(matches.map((d) => d.toLowerCase()))] : [];
}

function renderDomainChips(domains) {
    if (!domains || !domains.length) return '';
    return domains
        .map((d) => {
            const parts = d.split('.');
            const name = parts.slice(0, -1).join('.');
            const tld = '.' + parts[parts.length - 1];
            return `<span class="domain-chip">${escapeHtml(name)}<span class="tld">${escapeHtml(tld)}</span></span>`;
        })
        .join('');
}

const DEMO_PORTFOLIO = ['CloudStack.com', 'DataForge.io', 'AgentHub.ai', 'FinLedger.com', 'VoiceNet.ai'];

function collectPortfolioDomains(session) {
    const domains = new Set();
    const list = session?.portfolio;
    if (Array.isArray(list) && list.length) {
        list.forEach((d) => {
            if (d) domains.add(String(d).toLowerCase());
        });
    } else {
        DEMO_PORTFOLIO.forEach((d) => domains.add(d.toLowerCase()));
    }
    (session?.posts || []).forEach((p) => {
        (p.domains || []).forEach((d) => {
            if (d) domains.add(String(d).toLowerCase());
        });
    });
    const featured = session?.profile?.featuredSale?.domain;
    if (featured) domains.add(String(featured).toLowerCase());
    return [...domains].slice(0, 12);
}

function renderPortfolio() {
    const session = activeSessionState;
    const wrap = document.getElementById('identity-portfolio-wrap');
    if (!wrap || !session) return;

    const settings = session.settings || {};
    if (!settings.showPortfolio) {
        wrap.innerHTML = '';
        return;
    }

    const domains = collectPortfolioDomains(session);
    if (!domains.length) {
        wrap.innerHTML = '<p class="text-muted small mb-0">No portfolio domains listed yet.</p>';
        return;
    }

    const website = (session.profile?.portfolioWebsite || session.profile?.socialLinks?.website || '').trim();
    const chips = renderDomainChips(domains);
    const siteLink = website
        ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer" class="small font-weight-bold d-inline-block mt-2 text-primary">
            <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>View full portfolio
           </a>`
        : '';

    wrap.innerHTML = `<div class="d-flex flex-wrap" style="gap:8px;">${chips}</div>${siteLink}`;
}

function renderPostCard(post, isOwn = false) {
    const roleClass = ROLE_BADGE_CLASS[post.role] || 'badge-investor';
    const roleLabel = ROLE_LABEL[post.role] || 'Member';
    const borderStyle = isOwn ? 'border-left: 4px solid var(--nv-primary) !important;' : '';
    const domainsHtml = renderDomainChips(post.domains);
    const postKey = getPostKey(post);
    const reportLabel = escapeHtml(post.author + ' — ' + (post.body || '').slice(0, 40));

    return `
        <div class="card-component p-3" style="${borderStyle}" data-post-id="${escapeHtml(post.id || '')}" data-post-key="${escapeHtml(postKey)}">
            <div class="d-flex justify-content-between mb-2">
                <div class="d-flex align-items-center">
                    <div class="profile-thumb rounded-circle overflow-hidden mr-3" style="width: 40px; height: 40px; flex-shrink: 0;">
                        <img src="${escapeHtml(post.avatar)}" alt="">
                    </div>
                    <div>
                        <div class="d-flex align-items-center flex-wrap">
                            <h6 class="font-weight-bold text-dark mb-0 mr-2">${escapeHtml(post.author)}</h6>
                            <span class="identity-badge ${roleClass}">${escapeHtml(roleLabel)}</span>
                        </div>
                        <div class="reputation-text mt-1">${escapeHtml(post.handle)} · ${renderRepLine(post.reputation)}</div>
                    </div>
                </div>
                <div class="text-right">
                    <small class="text-muted font-weight-bold d-block">${escapeHtml(post.time)}</small>
                    <button type="button" class="btn btn-link btn-sm p-0 text-muted" style="font-size:10px;"
                            onclick="NamvioReportPost('${escapeHtml(postKey)}', '${reportLabel}'); return false;">Report</button>
                </div>
            </div>
            <p class="text-dark my-3 mb-2">${escapeHtml(post.body)}</p>
            ${domainsHtml ? `<div class="mb-2">${domainsHtml}</div>` : ''}
            <div class="d-flex border-top pt-2 mt-2 justify-content-around flex-wrap">
                <button class="post-action-btn" onclick="toggleLike(this, ${post.likes || 0}, '${escapeHtml(postKey)}', ${isOwn})">
                    <i class="fa-regular fa-thumbs-up mr-1"></i> <span class="like-count">${post.likes || 0}</span>
                </button>
                <button class="post-action-btn" onclick="toggleCommentsPanel(this, '${escapeHtml(postKey)}')">
                    <i class="fa-regular fa-comment mr-1"></i> Comment
                </button>
                <button class="post-action-btn" onclick="repostContent(this, '${escapeHtml(postKey)}')">
                    <i class="fa-solid fa-retweet mr-1"></i> Repost
                </button>
                <button class="post-action-btn" onclick="sharePost(this)">
                    <i class="fa-solid fa-share-nodes mr-1"></i> Share
                </button>
                ${
                    isOwn
                        ? `<button class="post-action-btn" onclick="NamvioProfile.pinPost('${escapeHtml(postKey)}'); return false;" title="Pin to profile">
                    <i class="fa-solid fa-thumbtack mr-1"></i> Pin
                </button>`
                        : ''
                }
            </div>
            ${renderCommentsBlock(postKey)}
        </div>`;
}

function initFeed() {
    const container = document.getElementById('feed-pipeline-cards');
    if (!container) return;

    const pinnedKey = activeSessionState.profile?.pinnedPostId;
    const rawPosts = activeSessionState.posts || [];
    const mapped = rawPosts.map((p) => ({
        post: p,
        key: getPostKey(p),
        card: renderPostCard(
            {
                ...p,
                author: activeSessionState.displayName,
                handle: activeSessionState.handle,
                role: activeSessionState.role,
                reputation: activeSessionState.reputationScore,
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'
            },
            true
        )
    }));

    let pinnedHtml = '';
    const rest = [];
    mapped.forEach((item) => {
        if (pinnedKey && item.key === pinnedKey) {
            pinnedHtml =
                (window.NamvioProfile && NamvioProfile.renderPinnedFeedCard
                    ? NamvioProfile.renderPinnedFeedCard(activeSessionState)
                    : '') || item.card;
        } else rest.push(item.card);
    });

    const seedHtml = SEED_POSTS.map((p) => renderPostCard(p)).join('');
    container.innerHTML = seedHtml + pinnedHtml + rest.join('');

    const searchInput = document.getElementById('global-search');
    filterFeedSearch(searchInput ? searchInput.value : '');
}

function renderWhoToFollowRow(account) {
    const roleLabel = ROLE_LABEL[account.role] || 'Member';
    return `
        <div class="d-flex align-items-center mb-3">
            <div class="profile-thumb rounded-circle overflow-hidden mr-2" style="width:32px;height:32px;">
                <img src="${escapeHtml(account.avatar)}" alt="">
            </div>
            <div class="flex-grow-1 min-width-0">
                <span class="font-weight-bold small d-block text-truncate">${escapeHtml(account.name)}</span>
                <span class="text-muted" style="font-size:11px;">${escapeHtml(account.niche)} · ${account.rep.toLocaleString()} rep</span>
            </div>
            <button type="button" class="btn btn-outline-primary btn-sm py-0 px-2 mr-1" style="font-size:11px;"
                    onclick="connectNetworkingMember(this, '${escapeHtml(account.id)}')">Follow</button>
            <button type="button" class="btn btn-primary btn-sm py-0 px-2" style="font-size:11px;"
                    onclick="startMesageWith('${escapeHtml(account.id)}', this); return false;" title="Message">Message</button>
        </div>`;
}

function initWhoToFollow() {
    const html = SEED_ACCOUNTS.slice(0, 4).map(renderWhoToFollowRow).join('');
    ['who-to-follow-box', 'market-pulse-follow-box'].forEach((id) => {
        const box = document.getElementById(id);
        if (box) box.innerHTML = html;
    });
}

function renderTrendingKeywordRows(limit) {
    const rows = limit && limit > 0 ? TRENDING_KEYWORDS.slice(0, limit) : TRENDING_KEYWORDS;
    return rows.map((row) => {
        const up = row.change >= 0;
        const changeClass = up ? 'trend-up' : 'trend-down';
        const changeIcon = up ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
        const changeSign = up ? '+' : '';
        return `
            <button type="button" class="trending-keyword-row" tabindex="0"
                    onclick="applyTrendingKeyword(event, '${escapeHtml(row.keyword)}')"
                    title="${escapeHtml(row.keyword)} — ${row.sales.toLocaleString()} sales · ${changeSign}${Math.abs(row.change)}%">
                <span class="trending-kw-rank">#${row.rank}</span>
                <span class="trending-kw-main">
                    <span class="trending-kw-word">${escapeHtml(row.keyword)}</span>
                    <span class="trending-kw-meta">${row.sales.toLocaleString()} sales · avg ${formatTrendingPrice(row.avgPrice)}</span>
                </span>
                <span class="trending-kw-change ${changeClass}">
                    <i class="fa-solid ${changeIcon}"></i>${changeSign}${Math.abs(row.change)}%
                </span>
            </button>`;
    }).join('');
}

function initMarketplace() {
    if (window.NamvioListings) NamvioListings.init();
}

function initNetworking() {
    if (window.NamvioNetworking) {
        window.NamvioNetworking.init();
        const eventsList = document.getElementById('networking-events-list');
        if (eventsList && typeof NETWORKING_EVENTS !== 'undefined') {
            eventsList.innerHTML = NETWORKING_EVENTS.map(
                (ev) => `
            <div class="network-event-row">
                <div class="flex-grow-1 min-width-0 pr-3">
                    <p class="font-weight-bold text-dark mb-1">${escapeHtml(ev.title)}</p>
                    <p class="text-muted small mb-0"><i class="fa-regular fa-clock mr-1"></i>${escapeHtml(ev.when)} · ${escapeHtml(ev.type)}</p>
                </div>
                <div class="text-right flex-shrink-0">
                    <span class="badge badge-light border font-weight-bold">${ev.attendees} going</span>
                    <button type="button" class="btn btn-sm btn-outline-primary font-weight-bold mt-2 d-block ml-auto"
                            onclick="rsvpNetworkingEvent(this)">RSVP</button>
                </div>
            </div>`
            ).join('');
        }
        return;
    }

    const grid = document.getElementById('networking-members-grid');
    const eventsList = document.getElementById('networking-events-list');
    if (!grid) return;

    const searchEl = document.getElementById('networking-search');
    const filter = searchEl ? searchEl.value : '';

    grid.innerHTML = renderNetworkingMembers(filter);

    if (eventsList) {
        eventsList.innerHTML = NETWORKING_EVENTS.map(
            (ev) => `
            <div class="network-event-row">
                <div class="flex-grow-1 min-width-0 pr-3">
                    <p class="font-weight-bold text-dark mb-1">${escapeHtml(ev.title)}</p>
                    <p class="text-muted small mb-0"><i class="fa-regular fa-clock mr-1"></i>${escapeHtml(ev.when)} · ${escapeHtml(ev.type)}</p>
                </div>
                <div class="text-right flex-shrink-0">
                    <span class="badge badge-light border font-weight-bold">${ev.attendees} going</span>
                    <button type="button" class="btn btn-sm btn-outline-primary font-weight-bold mt-2 d-block ml-auto"
                            onclick="rsvpNetworkingEvent(this)">RSVP</button>
                </div>
            </div>`
        ).join('');
    }
}

function renderNetworkingMembers(filter) {
    const q = (filter || '').toLowerCase().trim();
    const rows = NETWORKING_MEMBERS.filter((m) => {
        if (!q) return true;
        return (
            m.name.toLowerCase().includes(q) ||
            m.handle.toLowerCase().includes(q) ||
            m.niche.toLowerCase().includes(q)
        );
    });

    if (!rows.length) {
        return '<p class="text-muted small mb-0 text-center py-3">No members match your search.</p>';
    }

    return rows
        .map((m) => {
            const roleClass = ROLE_BADGE_CLASS[m.role] || 'badge-investor';
            const roleLabel = ROLE_LABEL[m.role] || 'Member';

            return `
            <div class="network-member-card" data-network-name="${escapeHtml(m.name.toLowerCase())}">
                <div class="d-flex align-items-start">
                    <div class="profile-thumb rounded-circle overflow-hidden mr-3 flex-shrink-0" style="width:48px;height:48px;">
                        <img src="${escapeHtml(m.avatar)}" alt="">
                    </div>
                    <div class="flex-grow-1 min-width-0">
                        <div class="d-flex align-items-center flex-wrap mb-1">
                            <span class="font-weight-bold text-dark mr-2">${escapeHtml(m.name)}</span>
                            <span class="identity-badge ${roleClass}">${escapeHtml(roleLabel)}</span>
                        </div>
                        <p class="text-muted small mb-1">${escapeHtml(m.handle)}</p>
                        ${window.NamvioReputation ? NamvioReputation.renderUserCard(m.rep) : `<p class="small">Rep ${m.rep.toLocaleString()}</p>`}
                        <p class="small text-dark mb-1">${escapeHtml(m.niche)}</p>
                        <p class="text-muted mb-0" style="font-size:11px;"><i class="fa-solid fa-user-group mr-1"></i>${m.mutual} mutual connections</p>
                    </div>
                </div>
                <div class="network-member-actions mt-3">
                    <button type="button" class="btn btn-sm btn-primary font-weight-bold"
                            style="background:var(--nv-primary);border-color:var(--nv-primary);"
                            onclick="connectNetworkingMember(this, '${escapeHtml(m.id)}')">Connect</button>
                    <button type="button" class="btn btn-sm btn-outline-primary font-weight-bold"
                            onclick="startMesageWith('${escapeHtml(m.id)}', this); return false;">
                        <i class="fa-solid fa-envelope mr-1"></i> Message
                    </button>
                    <button type="button" class="btn btn-sm btn-light border font-weight-bold"
                            onclick="NamvioShare.openProfile({ handle: '${escapeHtml(m.handle)}', displayName: '${escapeHtml(m.name)}', text: 'Connect with ${escapeHtml(m.name)} on Namvio Social — domain investor & ${escapeHtml(roleLabel)}.' }); return false;">
                        <i class="fa-solid fa-share-nodes mr-1"></i> Share
                    </button>
                </div>
            </div>`;
        })
        .join('');
}

function filterNetworkingMembers(query) {
    const grid = document.getElementById('networking-members-grid');
    if (!grid) return;
    grid.innerHTML = renderNetworkingMembers(query);
}

function connectNetworkingMember(btn, memberId) {
    const member = NETWORKING_MEMBERS.find((m) => m.id === memberId);
    if (!btn || !member) return;
    if (btn.dataset.connected === '1') {
        btn.textContent = 'Connect';
        btn.classList.remove('btn-success');
        btn.classList.add('btn-primary');
        btn.dataset.connected = '0';
        return;
    }
    btn.textContent = 'Connected';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-success');
    btn.dataset.connected = '1';
    if (window.NamvioModeration) NamvioModeration.recordMassFollow(activeSessionState);
    nvApplyRep('GAIN_FOLLOWER', { note: 'Followed ' + memberId });
    bumpProfileStat('followers', 1);
    saveSession();
    syncIdentityUI();
    const pendingEl = document.getElementById('net-stat-pending');
    if (pendingEl) {
        const n = parseInt(pendingEl.textContent, 10) || 0;
        pendingEl.textContent = String(Math.max(0, n - 1));
    }
}

function initHallOfFame() {
    if (window.NamvioHof && document.getElementById('hof-leaderboard')) {
        NamvioHof.init(activeSessionState);
        return;
    }

    const tbody = document.getElementById('hof-table-body');
    if (!tbody) return;

    tbody.innerHTML = HOF_LEADERS.map((row, i) => {
        const roleClass = ROLE_BADGE_CLASS[row.role] || 'badge-investor';
        const roleLabel = ROLE_LABEL[row.role] || 'Member';
        const tier =
            window.NamvioReputation && NamvioReputation.getTier
                ? NamvioReputation.getTier(row.score)
                : { name: 'Member', slug: 'new' };
        const repHtml =
            window.NamvioReputation && NamvioReputation.renderCompact
                ? NamvioReputation.renderCompact(row.score, { showBar: true })
                : row.score.toLocaleString();
        const border = i < HOF_LEADERS.length - 1 ? 'border-bottom' : '';
        return `
            <tr class="${border}">
                <td class="font-weight-bold text-primary" style="font-size: 15px;">#${String(row.rank).padStart(2, '0')}</td>
                <td><span class="font-weight-bold text-dark">${escapeHtml(row.name)}</span></td>
                <td><span class="identity-badge ${roleClass}">${escapeHtml(roleLabel)}</span></td>
                <td><span class="rep-tier-pill rep-tier-${escapeHtml(tier.slug)}">${escapeHtml(tier.name)}</span></td>
                <td class="text-right"><div class="hof-rep-cell">${repHtml}</div></td>
            </tr>`;
    }).join('');
}

function formatTrendingPrice(n) {
    const v = Number(n) || 0;
    if (v >= 1000) return '$' + (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k';
    return '$' + v.toLocaleString();
}

function formatSalePrice(amount) {
    const v = Number(amount) || 0;
    if (v >= 1000000) {
        const m = v / 1000000;
        return '$' + (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + 'M';
    }
    if (v >= 1000) return '$' + Math.round(v / 1000).toLocaleString() + 'k';
    return '$' + v.toLocaleString();
}

function formatSaleDate(iso) {
    try {
        const d = new Date(iso + 'T12:00:00');
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (_) {
        return iso;
    }
}

function renderDomainSaleChip(domain) {
    const parts = domain.split('.');
    const name = parts.slice(0, -1).join('.') || domain;
    const tld = parts.length > 1 ? '.' + parts[parts.length - 1] : '';
    return `<span class="domain-chip domain-chip-sm">${escapeHtml(name)}<span class="tld">${escapeHtml(tld)}</span></span>`;
}

function getDomainSalesList(yearKey) {
    const byYear = window.NAMEBIO_SALES_BY_YEAR || {};
    const key = yearKey || 'all';
    if (key === 'all') {
        return byYear.all || window.NAMEBIO_TOP_SALES || [];
    }
    if (Array.isArray(byYear[key])) return byYear[key];
    return (window.NAMEBIO_TOP_SALES || [])
        .filter((s) => (s.date || '').startsWith(key))
        .sort((a, b) => (b.price || 0) - (a.price || 0));
}

function getFilteredDomainSales(yearKey, limit) {
    const list = getDomainSalesList(yearKey);
    if (limit && limit > 0) return list.slice(0, limit);
    return list;
}

function renderDomainSaleRowHtml(sale, opts) {
    const yearKey = opts.yearKey || 'all';
    const showAllTimeRank = opts.showAllTimeRank !== false && yearKey !== 'all';
    const keyword = sale.domain.split('.')[0];
    const rankLabel = yearKey === 'all' ? sale.rank : opts.rankInList || sale.rank;
    const allTimeMeta =
        showAllTimeRank && sale.rank
            ? `<span class="text-muted">· All-time #${sale.rank}</span>`
            : '';
    return `
            <button type="button" class="recent-sale-row" onclick="applyTrendingKeyword(event, '${escapeHtml(keyword)}')" title="Search feed for ${escapeHtml(sale.domain)}">
                <div class="recent-sale-top">
                    <span class="recent-sale-rank-badge">#${rankLabel}</span>
                    ${renderDomainSaleChip(sale.domain)}
                    <span class="recent-sale-price">${formatSalePrice(sale.price)}</span>
                </div>
                <div class="recent-sale-meta">
                    <span><i class="fa-regular fa-calendar mr-1"></i>${formatSaleDate(sale.date)}</span>
                    ${allTimeMeta}
                </div>
                <div class="recent-sale-venue text-muted">${escapeHtml(sale.venue)}</div>
            </button>`;
}

function openDomainSalesFullPage(yearKey) {
    const key = yearKey || activeDomainSalesYear || 'all';
    activeDomainSalesYear = key;
    window.activeDomainSalesYear = key;
    try {
        localStorage.setItem('namvio_domain_sales_year_v1', key);
    } catch (_) { /* ignore */ }
    syncDomainSalesYearSelects();
    routeView('domain-sales');
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function initDomainSalesFullPage() {
    if (window.NamvioDomainSales && typeof window.NamvioDomainSales.render === 'function') {
        window.NamvioDomainSales.render(activeDomainSalesYear);
        const anchor = document.getElementById('ds-sales-table');
        if (anchor && location.hash === '#ds-sales-table') anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }
}

function initDomainSalesYearSelect(selectId) {
    const select = document.getElementById(selectId || 'domain-sales-year-select');
    const options = window.DOMAIN_SALES_YEAR_OPTIONS || [];
    if (!select || !options.length) return;
    if (!select.dataset.built) {
        select.innerHTML = options
            .map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`)
            .join('');
        select.dataset.built = '1';
    }
    select.value = activeDomainSalesYear;
}

function syncDomainSalesYearSelects() {
    initDomainSalesYearSelect('domain-sales-year-select');
    initDomainSalesYearSelect('market-pulse-sales-year-select');
}

function resetDomainSalesPanelExpanded() {
    domainSalesPanelExpanded['recent-domain-sales-box'] = false;
    domainSalesPanelExpanded['market-pulse-sales-box'] = false;
}

function toggleDomainSalesSeeMore(boxId) {
    domainSalesPanelExpanded[boxId] = !domainSalesPanelExpanded[boxId];
    if (boxId === 'recent-domain-sales-box') {
        renderDomainSalesPanel({
            boxId: 'recent-domain-sales-box',
            hintId: 'domain-sales-year-hint',
            limit: DOMAIN_SALES_SIDEBAR_LIMIT
        });
    } else if (boxId === 'market-pulse-sales-box') {
        renderDomainSalesPanel({
            boxId: 'market-pulse-sales-box',
            hintId: 'market-pulse-sales-hint',
            limit: DOMAIN_SALES_SIDEBAR_LIMIT
        });
    }
}

function onDomainSalesYearChange(yearKey) {
    activeDomainSalesYear = yearKey || 'all';
    window.activeDomainSalesYear = activeDomainSalesYear;
    try {
        localStorage.setItem('namvio_domain_sales_year_v1', activeDomainSalesYear);
    } catch (_) { /* ignore */ }
    resetDomainSalesPanelExpanded();
    initRecentDomainSales();
    const fullYearSelect = document.getElementById('domain-sales-full-year-select');
    if (fullYearSelect && fullYearSelect.dataset.built) fullYearSelect.value = activeDomainSalesYear;
    const dsShell = document.getElementById('nv-domain-sales-shell');
    if (dsShell && !dsShell.classList.contains('d-none')) initDomainSalesFullPage();
}

function renderDomainSalesPanel(target) {
    const box = document.getElementById(target.boxId);
    const hint = target.hintId ? document.getElementById(target.hintId) : null;
    if (!box) return;

    const previewLimit = DOMAIN_SALES_SIDEBAR_LIMIT;
    const expanded = !!domainSalesPanelExpanded[target.boxId];
    const allSales = getFilteredDomainSales(activeDomainSalesYear);
    const sales = expanded ? allSales : getFilteredDomainSales(activeDomainSalesYear, previewLimit);
    const label =
        (window.DOMAIN_SALES_YEAR_OPTIONS || []).find((o) => o.value === activeDomainSalesYear)?.label ||
        'Top Sales';

    if (!allSales.length) {
        box.innerHTML =
            '<p class="text-muted small mb-0 py-2 text-center">No sales in this period in the NameBio Top 100 list.</p>';
        if (hint) hint.textContent = label + ' · 0 results';
        return;
    }

    const rowsHtml = sales
        .map((sale, i) =>
            renderDomainSaleRowHtml(sale, {
                yearKey: activeDomainSalesYear,
                rankInList: i + 1,
                showAllTimeRank: false
            })
        )
        .join('');

    const hasMore = allSales.length > previewLimit;
    const remaining = allSales.length - previewLimit;
    let toggleBtn = '';
    if (hasMore) {
        if (expanded) {
            toggleBtn = `<button type="button" class="domain-sales-see-more-btn" onclick="toggleDomainSalesSeeMore('${escapeHtml(target.boxId)}'); return false;">
                <i class="fa-solid fa-chevron-up mr-1"></i>Show less
               </button>`;
        } else {
            toggleBtn = `<button type="button" class="domain-sales-see-more-btn" onclick="toggleDomainSalesSeeMore('${escapeHtml(target.boxId)}'); return false;">
                See more · ${remaining} more sale${remaining === 1 ? '' : 's'} <i class="fa-solid fa-chevron-down ml-1"></i>
               </button>`;
        }
    }

    box.innerHTML =
        `<div class="domain-sales-list${expanded ? ' domain-sales-list--expanded' : ''}">${rowsHtml}</div>${toggleBtn}`;

    if (hint) {
        hint.textContent = expanded
            ? label + ' · showing all ' + allSales.length
            : label + ' · top ' + Math.min(previewLimit, allSales.length) + ' of ' + allSales.length;
    }
}

function initRecentDomainSales(limitOverride) {
    syncDomainSalesYearSelects();

    const sidebarLimit =
        typeof limitOverride === 'number' && limitOverride > 0
            ? limitOverride
            : DOMAIN_SALES_SIDEBAR_LIMIT;

    renderDomainSalesPanel({
        boxId: 'recent-domain-sales-box',
        hintId: 'domain-sales-year-hint',
        limit: sidebarLimit
    });
    renderDomainSalesPanel({
        boxId: 'market-pulse-sales-box',
        hintId: 'market-pulse-sales-hint',
        limit: DOMAIN_SALES_SIDEBAR_LIMIT
    });
}

function initTrending() {
    const html = renderTrendingKeywordRows();
    ['trending-keywords-box', 'trending-keywords-mobile', 'market-pulse-trending-box'].forEach((id) => {
        const box = document.getElementById(id);
        if (box) box.innerHTML = html;
    });
    initRecentDomainSales();
    if (window.NamvioSponsors) window.NamvioSponsors.init();
}

function syncMesageThreadsFromSeeds() {
    activeSessionState.mesages = mergeMesageState(activeSessionState.mesages);
    return activeSessionState.mesages;
}

function getMesages() {
    if (!activeSessionState.mesages) {
        activeSessionState.mesages = mergeMesageState(null);
    }
    return activeSessionState.mesages;
}

function getMesageThread(peerId) {
    const mesages = getMesages();
    let thread = mesages.threads.find((t) => t.peerId === peerId);
    if (!thread && MESSAGE_PEERS[peerId]) {
        thread = { peerId, unread: 0, messages: [] };
        mesages.threads.unshift(thread);
    }
    return thread;
}

function formatMesageTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
        return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getTotalMesageUnread() {
    return getMesages().threads.reduce((sum, t) => sum + (t.unread || 0), 0);
}

function updateMesageBadges() {
    const total = getTotalMesageUnread();
    const badge = document.getElementById('sidebar-mesages-badge');
    const totalEl = document.getElementById('msg-total-unread');
    if (badge) {
        badge.textContent = total;
        badge.classList.toggle('d-none', total === 0);
    }
    if (totalEl) totalEl.textContent = total === 0 ? 'All read' : total + ' new';
}

function toggleMesageThread(peerId) {
    const mesages = getMesages();
    if (mesages.activeThreadId === peerId) {
        mesageBackToList();
        return;
    }
    openMesageThread(peerId);
}

function openMesageThread(peerId) {
    if (!MESSAGE_PEERS[peerId]) return;

    const mesages = getMesages();
    const thread = getMesageThread(peerId);
    mesages.activeThreadId = peerId;
    thread.unread = 0;

    const empty = document.getElementById('msg-empty-state');
    const panel = document.getElementById('msg-active-panel');
    const layout = document.getElementById('msg-layout');

    if (empty) empty.classList.add('d-none');
    if (panel) {
        panel.classList.remove('d-none');
        panel.classList.add('d-flex');
    }
    if (layout) layout.classList.add('msg-show-thread');

    if (window.NamvioMesages) {
        NamvioMesages.onThreadOpen(peerId);
    }
    saveSession();
    updateMesageBadges();
}

function mesageBackToList() {
    const mesages = getMesages();
    mesages.activeThreadId = null;
    const empty = document.getElementById('msg-empty-state');
    const panel = document.getElementById('msg-active-panel');
    const layout = document.getElementById('msg-layout');

    if (empty) empty.classList.remove('d-none');
    if (panel) {
        panel.classList.add('d-none');
        panel.classList.remove('d-flex');
    }
    if (layout) layout.classList.remove('msg-show-thread');
    if (window.NamvioMesages) {
        NamvioMesages.onThreadClose();
    }
    saveSession();
}

function closeMesageThread() {
    mesageBackToList();
}

function filterMesageThreads(query) {
    if (window.NamvioMesages) {
        NamvioMesages.syncChrome(query != null ? query : '');
    }
}

function sendMesage(e) {
    if (e) e.preventDefault();

    const input = document.getElementById('msg-message-input');
    const text = (input && input.value || '').trim();
    if (!text) return;

    const mesages = getMesages();
    const peerId = mesages.activeThreadId;
    if (!peerId) return;

    const thread = getMesageThread(peerId);
    thread.messages.push({
        id: 'msg_' + Date.now(),
        from: 'me',
        text: text,
        at: Date.now()
    });

    if (input) input.value = '';
    if (window.NamvioModeration) NamvioModeration.recordMassMessage(activeSessionState);
    saveSession();
    if (window.NamvioMesages) {
        NamvioMesages.onMessageSent(peerId);
    }

    setTimeout(() => {
        thread.messages.push({
            id: 'msg_auto_' + Date.now(),
            from: 'them',
            text: getMesageAutoReply(peerId, text),
            at: Date.now()
        });
        saveSession();
        if (window.NamvioMesages) {
            NamvioMesages.onAutoReplyRendered(peerId);
        }
    }, 900);
}

function getMesageAutoReply(peerId, userText) {
    const peer = MESSAGE_PEERS[peerId];
    const firstName = peer ? peer.name.split(' ')[0] : 'there';
    const lower = userText.toLowerCase();
    if (lower.includes('offer') || lower.includes('$')) {
        return `Noted, ${activeSessionState.displayName || 'friend'} — I'll review your offer on ${peer?.niche || 'this niche'} and circle back with comps within 24h. — ${firstName}`;
    }
    if (lower.includes('.io') || lower.includes('.com') || lower.includes('.ai')) {
        return `Domain received. Happy to discuss an escrow path if we align on price. — ${firstName}`;
    }
    if (lower.includes('escrow')) {
        return `Escrow works for me — I'll send next steps on Namvio shortly. — ${firstName}`;
    }
    return (
        'Thanks for reaching out, ' +
        (activeSessionState.displayName || 'there') +
        ". I'll review and reply on " +
        (peer?.niche || 'your note') +
        ' shortly. — ' +
        firstName
    );
}

function startMesageWith(peerId, triggerEl) {
    if (!MESSAGE_PEERS[peerId]) return;
    syncMesageThreadsFromSeeds();
    openMesageThread(peerId);
    routeView('mesages', triggerEl || null);
}

function initMesages() {
    const mesages = syncMesageThreadsFromSeeds();
    const pendingPeer = mesages.activeThreadId;

    if (window.NamvioMesages) {
        NamvioMesages.init();
    }

    if (pendingPeer && MESSAGE_PEERS[pendingPeer]) {
        openMesageThread(pendingPeer);
    } else if (typeof window !== 'undefined' && window.innerWidth >= 768 && mesages.threads.length) {
        openMesageThread(mesages.threads[0].peerId);
    } else {
        mesageBackToList();
    }

    updateMesageBadges();
    saveSession();
}

function initMarketPulse() {
    initTrending();
    initWhoToFollow();
    if (window.NamvioSponsors && window.NamvioSponsors.mountMarketPulse) {
        window.NamvioSponsors.mountMarketPulse();
    }
    syncSubscriptionBanner();
    if (window.NamvioMotion) window.NamvioMotion.scanReveal(document.getElementById('view-market-pulse'));
}

function getSettings() {
    if (!activeSessionState.settings) {
        activeSessionState.settings = defaultSettings();
    }
    return activeSessionState.settings;
}

function normalizeHandle(raw) {
    let h = (raw || '').trim();
    if (!h) return '@user';
    if (h.charAt(0) !== '@') h = '@' + h.replace(/^@+/, '');
    return h.slice(0, 33);
}

function syncInviteCodeUI() {
    const session = activeSessionState || window.activeSessionState || {};
    const code =
        window.NamvioShare && typeof window.NamvioShare.getInviteCode === 'function'
            ? window.NamvioShare.getInviteCode(session)
            : 'NV-GUEST';
    ['nv-invite-code-display', 'settings-invite-code'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = code;
    });
}

function syncSidebarProfile() {
    const nameEl = document.getElementById('sidebar-display-name');
    const handleEl = document.getElementById('sidebar-handle');
    const repEl = document.getElementById('sidebar-rep-line');
    if (nameEl) nameEl.textContent = activeSessionState.displayName || 'Member';
    if (handleEl) handleEl.textContent = activeSessionState.handle || '@user';
    if (repEl && window.NamvioReputation) {
        repEl.innerHTML = NamvioReputation.renderCompact(activeSessionState.reputationScore || 0, { showBar: true });
    }
}

function syncIdentityUI() {
    if (window.NamvioReputation) NamvioReputation.syncSessionFlags(activeSessionState);

    const nameEl = document.getElementById('identity-display-name');
    const repBlock = document.getElementById('identity-reputation-block');
    const handleEl = document.getElementById('identity-handle-box');
    const emailEl = document.getElementById('identity-email-box');
    const bioEl = document.getElementById('identity-bio-box');
    const badgeBox = document.getElementById('badge-collection-box');
    const settings = getSettings();

    if (nameEl) nameEl.textContent = activeSessionState.displayName;
    if (repBlock && window.NamvioReputation) {
        repBlock.innerHTML = NamvioReputation.renderProfileBlock(activeSessionState.reputationScore);
    }
    if (handleEl) handleEl.textContent = activeSessionState.handle;

    const riskWrap = document.getElementById('identity-risk-wrap');
    if (riskWrap && window.NamvioModeration) {
        riskWrap.innerHTML =
            '<span class="text-muted small mr-2">Trust &amp; safety:</span>' +
            NamvioModeration.renderRiskBadge(activeSessionState);
    }
    if (emailEl) {
        emailEl.textContent = settings.showEmail
            ? activeSessionState.email || '—'
            : 'Hidden (change in Settings)';
    }
    if (bioEl) {
        bioEl.textContent = settings.bio || '';
        const bioWrap = document.getElementById('identity-bio-wrap');
        if (bioWrap) bioWrap.classList.toggle('d-none', !settings.bio);
    }

    const portfolioWrap = document.getElementById('identity-portfolio-wrap');
    const portfolioTitle = document.getElementById('identity-portfolio-title');
    if (portfolioWrap) portfolioWrap.classList.toggle('d-none', !settings.showPortfolio);
    if (portfolioTitle) portfolioTitle.classList.toggle('d-none', !settings.showPortfolio);
    if (settings.showPortfolio) {
        renderPortfolio();
    } else if (portfolioWrap) {
        portfolioWrap.innerHTML = '';
    }

    syncSidebarProfile();

    if (badgeBox) {
        badgeBox.innerHTML = (activeSessionState.badges || [])
            .map(
                (b, i) =>
                    `<span class="badge ${i === 0 ? 'badge-dark' : 'badge-light border'} py-2 px-3 font-weight-bold">
                        <i class="fa-solid fa-${i === 0 ? 'gem' : 'certificate'} mr-2 ${i === 0 ? 'text-warning' : 'text-primary'}"></i>
                        ${escapeHtml(b)}
                    </span>`
            )
            .join('');
    }

    const banBanner = document.getElementById('ban-alarm-banner');
    if (banBanner) banBanner.classList.toggle('d-none', !activeSessionState.isShadowBanned);

    if (window.NamvioProfile) {
        const onProfile = document.getElementById('view-identity');
        const visible = onProfile && !onProfile.classList.contains('d-none');
        NamvioProfile.render(activeSessionState, { isSelf: true, force: visible });
    }
}

function syncNavActive(targetViewToken) {
    const viewId = resolveViewToken(targetViewToken);
    if (window.NamvioNav && typeof window.NamvioNav.syncActive === 'function') {
        window.NamvioNav.syncActive(viewId);
        return;
    }
    document.querySelectorAll('.nv-main-nav > li[data-nav]').forEach((li) => {
        li.classList.toggle('active', li.dataset.nav === viewId);
    });
    document.querySelectorAll('.nv-mobile-nav-list li[data-nav], .nv-mobile-nav li[data-nav]').forEach((li) => {
        li.classList.toggle('active', li.dataset.nav === viewId);
    });
    document.querySelectorAll('.mobile-nav-item[data-mobile-nav]').forEach((a) => {
        a.classList.toggle('active', a.dataset.mobileNav === viewId);
    });
    document.querySelectorAll('.side-menu-list li').forEach((li) => li.classList.remove('active'));
    const sideNode = document.getElementById('sidemenu-' + viewId);
    if (sideNode) sideNode.classList.add('active');
}

function toggleMobileNav() {
    const panel = document.getElementById('nv-mobile-nav');
    if (panel) panel.classList.toggle('open');
}

function closeMobileNav() {
    const panel = document.getElementById('nv-mobile-nav');
    if (panel) panel.classList.remove('open');
}

/** Domain Sales uses full viewport below header — hide 3-column feed layout */
function setDomainSalesLayoutMode(active) {
    const appLayout = document.getElementById('nv-app-layout');
    const dsShell = document.getElementById('nv-domain-sales-shell');
    document.body.classList.toggle('nv-mode-domain-sales', active);
    if (appLayout) appLayout.classList.toggle('d-none', active);
    if (dsShell) dsShell.classList.toggle('d-none', !active);
}

function routeView(targetViewToken, clickedTriggerElement) {
    const viewId = resolveViewToken(targetViewToken);

    setDomainSalesLayoutMode(viewId === 'domain-sales');
    document.body.classList.toggle('nv-on-market-pulse', viewId === 'market-pulse');
    document.body.classList.toggle('nv-on-mesages', viewId === 'mesages');

    document.querySelectorAll('.nv-routing-view').forEach((view) => view.classList.add('d-none'));
    const targetNode = document.getElementById('view-' + viewId);
    if (targetNode) {
        targetNode.classList.remove('d-none');
    } else {
        console.warn('Namvio: unknown view', targetViewToken, '→', viewId);
        const feedNode = document.getElementById('view-feed');
        if (feedNode) feedNode.classList.remove('d-none');
    }

    syncNavActive(viewId);
    closeMobileNav();

    if (clickedTriggerElement && clickedTriggerElement.classList.contains('mobile-nav-item')) {
        clickedTriggerElement.classList.add('active');
    }

    if (viewId === 'feed') initTrending();
    if (viewId === 'market-pulse') initMarketPulse();
    if (viewId === 'mesages') initMesages();
    if (viewId === 'domain-sales') initDomainSalesFullPage();
    if (viewId === 'hof') initHallOfFame();
    if (viewId === 'marketplace') initMarketplace();
    if (viewId === 'networking') initNetworking();
    if (viewId === 'subscription') initSubscription();
    if (viewId === 'settings') initSettings();
    if (viewId === 'blogs') initBlogs();
    if (viewId === 'legal' && window.NamvioDocs) NamvioDocs.initLegal();
    if (viewId === 'guide' && window.NamvioDocs) NamvioDocs.initGuide();
    if (viewId === 'rules' && window.NamvioDocs) NamvioDocs.initRules();
    if (viewId === 'help' && window.NamvioDocs) NamvioDocs.initHelp();
    if (viewId === 'support' && window.NamvioSupport) NamvioSupport.init();
    if (window.NamvioMotion) NamvioMotion.onRouteChange(viewId);
    if (viewId === 'admin' && window.NamvioModeration) NamvioModeration.initDashboard(activeSessionState);
    if (viewId === 'identity') {
        syncIdentityUI();
        if (window.NamvioProfile) NamvioProfile.render(activeSessionState, { isSelf: true, force: true });
    }
}

function setCheckbox(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = !!value;
}

function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value != null ? value : '';
}

function updateBioCharCount() {
    const bio = document.getElementById('set-bio');
    const counter = document.getElementById('set-bio-count');
    if (bio && counter) counter.textContent = (bio.value || '').length;
}

function showSettingsToast() {
    const toast = document.getElementById('settings-save-toast');
    if (!toast) return;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3200);
}

function initSettings() {
    const s = getSettings();

    setInputValue('set-display-name', activeSessionState.displayName);
    setInputValue('set-handle', activeSessionState.handle);
    setInputValue('set-email', activeSessionState.email);
    setInputValue('set-bio', s.bio);
    setInputValue('set-role', activeSessionState.role || 'investor');
    setInputValue('set-country', activeSessionState.profile?.country || '');
    setInputValue('set-experience-years', activeSessionState.profile?.experienceYears ?? '');
    setInputValue('set-portfolio-website', activeSessionState.profile?.portfolioWebsite || '');
    setInputValue('set-linkedin', activeSessionState.profile?.socialLinks?.linkedin || '');
    setInputValue('set-social-x', activeSessionState.profile?.socialLinks?.x || '');
    const sale = activeSessionState.profile?.featuredSale || {};
    setInputValue('set-sale-domain', sale.domain || '');
    setInputValue('set-sale-price', sale.price != null ? sale.price : '');
    setInputValue('set-sale-year', sale.year != null ? sale.year : '');
    setInputValue('set-sale-desc', sale.description || '');
    setInputValue('set-who-can-see', s.whoCanSeePosts);
    setInputValue('set-timezone', s.timezone);

    setCheckbox('set-public-profile', s.publicProfile);
    setCheckbox('set-show-email', s.showEmail);
    setCheckbox('set-notify-email', s.notifyEmail);
    setCheckbox('set-notify-deals', s.notifyDeals);
    setCheckbox('set-notify-mentions', s.notifyMentions);
    setCheckbox('set-notify-digest', s.notifyDigest);
    setCheckbox('set-show-portfolio', s.showPortfolio);

    updateBioCharCount();

    const bioInput = document.getElementById('set-bio');
    if (bioInput && !bioInput.dataset.bound) {
        bioInput.dataset.bound = '1';
        bioInput.addEventListener('input', updateBioCharCount);
    }

    syncInviteCodeUI();
}

function saveUserSettings(e) {
    if (e) e.preventDefault();

    const displayName = (document.getElementById('set-display-name')?.value || '').trim();
    const handle = normalizeHandle(document.getElementById('set-handle')?.value);
    const email = (document.getElementById('set-email')?.value || '').trim();

    if (!displayName) {
        alert('Please enter a display name.');
        return;
    }
    if (!email || email.indexOf('@') < 1) {
        alert('Please enter a valid email address.');
        return;
    }

    activeSessionState.displayName = displayName;
    activeSessionState.handle = handle;
    activeSessionState.email = email;
    activeSessionState.role = document.getElementById('set-role')?.value || 'investor';

    activeSessionState.settings = {
        bio: (document.getElementById('set-bio')?.value || '').trim().slice(0, 160),
        publicProfile: !!document.getElementById('set-public-profile')?.checked,
        showEmail: !!document.getElementById('set-show-email')?.checked,
        whoCanSeePosts: document.getElementById('set-who-can-see')?.value || 'public',
        notifyEmail: !!document.getElementById('set-notify-email')?.checked,
        notifyDeals: !!document.getElementById('set-notify-deals')?.checked,
        notifyMentions: !!document.getElementById('set-notify-mentions')?.checked,
        notifyDigest: !!document.getElementById('set-notify-digest')?.checked,
        timezone: document.getElementById('set-timezone')?.value || 'UTC',
        showPortfolio: !!document.getElementById('set-show-portfolio')?.checked
    };

    if (!activeSessionState.profile) activeSessionState.profile = window.NamvioProfile ? NamvioProfile.defaultProfile() : {};
    activeSessionState.profile.country = (document.getElementById('set-country')?.value || '').trim();
    activeSessionState.profile.experienceYears =
        parseInt(document.getElementById('set-experience-years')?.value, 10) || 0;
    activeSessionState.profile.portfolioWebsite = (document.getElementById('set-portfolio-website')?.value || '').trim();
    activeSessionState.profile.socialLinks = {
        linkedin: (document.getElementById('set-linkedin')?.value || '').trim(),
        x: (document.getElementById('set-social-x')?.value || '').trim(),
        website: activeSessionState.profile.portfolioWebsite
    };
    activeSessionState.profile.featuredSale = {
        domain: (document.getElementById('set-sale-domain')?.value || '').trim(),
        price: parseInt(document.getElementById('set-sale-price')?.value, 10) || 0,
        year: parseInt(document.getElementById('set-sale-year')?.value, 10) || new Date().getFullYear(),
        description: (document.getElementById('set-sale-desc')?.value || '').trim(),
        screenshotUrl: activeSessionState.profile.featuredSale?.screenshotUrl || ''
    };
    if (window.NamvioProfile) {
        activeSessionState.verificationBadges = NamvioProfile.deriveVerificationBadges(activeSessionState);
    }

    saveSession();
    syncIdentityUI();
    initFeed();
    showSettingsToast();
}

function resetUserSettings() {
    if (!confirm('Reset all settings to defaults? Your posts and subscription will stay.')) return;

    activeSessionState.settings = defaultSettings();
    activeSessionState.displayName = defaultSession().displayName;
    activeSessionState.handle = defaultSession().handle;
    activeSessionState.email = defaultSession().email;
    activeSessionState.role = defaultSession().role;

    saveSession();
    initSettings();
    syncIdentityUI();
    showSettingsToast();
}

function exportUserData() {
    const payload = {
        exportedAt: new Date().toISOString(),
        app: 'Namvio Social',
        user: {
            displayName: activeSessionState.displayName,
            handle: activeSessionState.handle,
            email: activeSessionState.email,
            role: activeSessionState.role,
            reputationScore: activeSessionState.reputationScore,
            settings: getSettings(),
            subscription: activeSessionState.subscription,
            badges: activeSessionState.badges,
            postsCount: (activeSessionState.posts || []).length,
            reputationTier: window.NamvioReputation
                ? NamvioReputation.getTier(activeSessionState.reputationScore).name
                : null
        },
        reputation_logs: window.NamvioReputation ? NamvioReputation.getLogsForUser(activeSessionState.handle, 100) : [],
        moderation_logs: window.NamvioModeration ? NamvioModeration.loadState().moderation_logs.slice(0, 50) : []
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'namvio-user-data.json';
    a.click();
    URL.revokeObjectURL(url);
}

function deleteAccountDemo() {
    if (
        !confirm(
            'Delete your Namvio account data from this browser? This cannot be undone in demo mode.'
        )
    ) {
        return;
    }
    localStorage.removeItem(STORAGE_KEY);
    activeSessionState = defaultSession();
    saveSession();
    alert('Account data cleared. The page will reload.');
    window.location.reload();
}

function getSubscription() {
    if (!activeSessionState.subscription) {
        activeSessionState.subscription = {
            planId: 'free',
            billingCycle: 'yearly',
            status: 'active',
            startedAt: null,
            renewsAt: null
        };
    }
    if (!activeSessionState.billingHistory) activeSessionState.billingHistory = [];
    return activeSessionState.subscription;
}

function getPlanById(planId) {
    return SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[0];
}

function getBillingCycle() {
    return 'yearly';
}

function getPlanPrice(plan) {
    return plan.yearly;
}

function formatPrice(amount) {
    if (amount === 0) return '$0';
    return '$' + amount.toLocaleString();
}

function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function updatePlanPricesOnly() {
    const cards = document.querySelectorAll('#subscription-plans-grid [data-plan-id]');
    if (!cards.length) return false;

    cards.forEach((card) => {
        const plan = getPlanById(card.getAttribute('data-plan-id'));
        const yearly = Number(card.getAttribute('data-yearly') || plan.yearly || 0);
        const monthly = Number(card.getAttribute('data-monthly') || plan.monthly || 0);
        const priceEl = card.querySelector('.plan-price');
        const equivEl = card.querySelector('.plan-equiv');

        if (!priceEl) return;

        if (yearly === 0 && monthly === 0) {
            priceEl.innerHTML = '$0';
        } else {
            priceEl.innerHTML = formatPrice(yearly) + '<span class="period">/yr</span>';
        }

        if (equivEl) {
            if (yearly > 0) {
                equivEl.style.display = 'block';
                equivEl.textContent = 'About $' + (yearly / 12).toFixed(2) + '/mo billed annually';
            } else {
                equivEl.style.display = 'none';
                equivEl.textContent = '';
            }
        }
    });
    return true;
}

function updatePlanCardStates() {
    const sub = getSubscription();
    const currentId = sub.planId || 'free';

    document.querySelectorAll('#subscription-plans-grid [data-plan-id]').forEach((col) => {
        const planId = col.getAttribute('data-plan-id');
        const inner = col.querySelector('.plan-card');
        const btn = col.querySelector('.plan-cta');
        if (!inner || !btn) return;

        const isCurrent = planId === currentId;
        inner.classList.toggle('is-current', isCurrent);

        if (isCurrent) {
            btn.textContent = 'Current plan';
            btn.disabled = true;
            btn.className = 'btn btn-block btn-sm btn-success font-weight-bold plan-cta';
            btn.removeAttribute('onclick');
        } else if (planId === 'free') {
            btn.textContent = 'Downgrade to Free';
            btn.disabled = false;
            btn.className = 'btn btn-block btn-sm btn-outline-secondary font-weight-bold plan-cta';
            btn.onclick = function () { subscribeToPlan('free'); };
        } else {
            btn.textContent = 'Subscribe';
            btn.disabled = false;
            btn.className = 'btn btn-primary btn-block btn-sm font-weight-bold plan-cta';
            btn.style.cssText = 'background:var(--nv-primary);border-color:var(--nv-primary);';
            btn.onclick = function () { subscribeToPlan(planId); };
        }
    });
}

function renderSubscriptionPlans() {
    const grid = document.getElementById('subscription-plans-grid');
    if (!grid) return;

    if (grid.querySelector('[data-plan-id]')) {
        updatePlanPricesOnly();
        updatePlanCardStates();
        syncSubscriptionBanner();
        return;
    }

    const sub = getSubscription();
    const currentPlanId = sub.planId || 'free';

    try {
    grid.innerHTML = SUBSCRIPTION_PLANS.map((plan) => {
        const price = plan.yearly;
        const period = plan.yearly === 0 && plan.monthly === 0 ? '' : '/yr';
        const monthlyEquiv =
            plan.yearly > 0
                ? `<p class="plan-equiv text-muted small mb-0">About $${(plan.yearly / 12).toFixed(2)}/mo billed annually</p>`
                : '';
        const isCurrent = currentPlanId === plan.id;
        const isFeatured = !!plan.featured;
        const cardClass = ['plan-card', isFeatured ? 'is-featured' : '', isCurrent ? 'is-current' : ''].filter(Boolean).join(' ');

        const featuresHtml = plan.features
            .map((f) => {
                const cls = f.included ? '' : 'disabled';
                const icon = f.included ? 'fa-check' : 'fa-xmark';
                return `<li class="${cls}"><i class="fa-solid ${icon}"></i>${escapeHtml(f.text)}</li>`;
            })
            .join('');

        let btnLabel = 'Subscribe';
        let btnClass = 'btn-primary';
        let btnDisabled = '';
        let btnAction = `subscribeToPlan('${plan.id}')`;

        if (isCurrent) {
            btnLabel = 'Current plan';
            btnClass = 'btn-success';
            btnDisabled = 'disabled';
            btnAction = '';
        } else if (plan.id === 'free' && currentPlanId !== 'free') {
            btnLabel = 'Downgrade to Free';
            btnClass = 'btn-outline-secondary';
        } else if (plan.monthly === 0) {
            btnLabel = 'Get started';
            btnClass = 'btn-outline-primary';
        }

        const popularTag = isFeatured ? '<span class="plan-popular-tag">Most popular</span>' : '';
        const limitedNote = plan.limited ? '<p class="text-warning small font-weight-bold mb-2"><i class="fa-solid fa-fire mr-1"></i>742 / 1,000 claimed</p>' : '';

        return `
            <div class="col-md-6 mb-3" data-plan-id="${plan.id}" data-monthly="${plan.monthly}" data-yearly="${plan.yearly}">
                <div class="${cardClass}">
                    ${popularTag}
                    <p class="plan-name">${escapeHtml(plan.name)}</p>
                    <p class="text-muted small mb-2">${escapeHtml(plan.tagline)}</p>
                    ${limitedNote}
                    <div class="plan-price" data-plan-price="${plan.id}">
                        ${formatPrice(price)}<span class="period">${period}</span>
                    </div>
                    ${monthlyEquiv}
                    <ul class="plan-features">${featuresHtml}</ul>
                    <button type="button" class="btn btn-block font-weight-bold btn-sm ${btnClass}"
                            style="${btnClass === 'btn-primary' ? 'background:var(--nv-primary);border-color:var(--nv-primary);' : ''}"
                            ${btnDisabled ? 'disabled' : ''} ${btnAction ? `onclick="${btnAction}"` : ''}>
                        ${escapeHtml(btnLabel)}
                    </button>
                </div>
            </div>`;
    }).join('');
    } catch (err) {
        console.error('Namvio: failed to render plans', err);
        grid.innerHTML =
            '<div class="col-12"><div class="alert alert-warning">Could not load plans. Please refresh the page.</div></div>';
        return;
    }

    updatePlanPricesOnly();
    updatePlanCardStates();
    syncSubscriptionBanner();
}

function syncSubscriptionBanner() {
    const sub = getSubscription();
    const plan = getPlanById(sub.planId);
    const banner = document.getElementById('current-plan-banner');
    const cancelBtn = document.getElementById('btn-cancel-sub');
    const pill = document.getElementById('sub-status-pill');
    const nameEl = document.getElementById('sub-current-plan-name');
    const metaEl = document.getElementById('sub-current-plan-meta');
    const sidebarLabel = document.getElementById('sidebar-plan-label');
    const pulsePlanLabel = document.getElementById('market-pulse-plan-label');

    const planLabel = 'Plan: ' + plan.name + (sub.status === 'cancelled' ? ' (ending)' : '');
    if (sidebarLabel) sidebarLabel.textContent = planLabel;
    if (pulsePlanLabel) pulsePlanLabel.textContent = planLabel;

    if (!banner) return;

    banner.classList.remove('d-none');

    if (nameEl) nameEl.textContent = plan.name;

    if (metaEl) {
        if (sub.planId === 'free') {
            metaEl.textContent = 'Free community access — upgrade anytime below';
        } else {
            const renew = sub.status === 'cancelled' ? 'Access until' : 'Renews';
            const renewDate = sub.renewsAt ? formatDate(sub.renewsAt) : '—';
            metaEl.textContent = `Yearly billing · ${renew} ${renewDate}`;
        }
    }

    if (pill) {
        if (sub.planId === 'free') {
            pill.textContent = 'Free';
            pill.className = 'subscription-status-pill status-trial';
        } else {
            pill.textContent = sub.status === 'cancelled' ? 'Cancelling' : 'Active';
            pill.className = 'subscription-status-pill ' + (sub.status === 'cancelled' ? 'status-cancelled' : 'status-active');
        }
    }

    if (cancelBtn) {
        cancelBtn.style.display = sub.planId === 'free' || sub.status === 'cancelled' ? 'none' : '';
    }
}

function renderBillingHistory() {
    const tbody = document.getElementById('billing-history-body');
    if (!tbody) return;

    const history = activeSessionState.billingHistory || [];
    if (!history.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-muted text-center py-3">No invoices yet — subscribe to a paid plan.</td></tr>';
        return;
    }

    tbody.innerHTML = history
        .slice(0, 8)
        .map(
            (row) => `
            <tr>
                <td>${escapeHtml(formatDate(row.date))}</td>
                <td>${escapeHtml(row.planName)}</td>
                <td class="font-weight-bold">${escapeHtml(row.amount)}</td>
                <td><span class="badge badge-light border">${escapeHtml(row.status)}</span></td>
            </tr>`
        )
        .join('');
}

function applyPlanBadge(planId) {
    const badgeName = PLAN_BADGES[planId];
    activeSessionState.badges = activeSessionState.badges || [];

    Object.values(PLAN_BADGES).forEach((b) => {
        if (b && activeSessionState.badges.includes(b)) {
            const idx = activeSessionState.badges.indexOf(b);
            activeSessionState.badges.splice(idx, 1);
        }
    });

    if (badgeName && !activeSessionState.badges.includes(badgeName)) {
        activeSessionState.badges.push(badgeName);
    }
}

function recordInvoice(plan, cycle, amount) {
    activeSessionState.billingHistory = activeSessionState.billingHistory || [];
    activeSessionState.billingHistory.unshift({
        date: new Date().toISOString(),
        planName: plan.name,
        amount: formatPrice(amount) + '/yr',
        status: 'Paid'
    });
}

function subscribeToPlan(planId) {
    const plan = getPlanById(planId);
    const sub = getSubscription();
    const cycle = 'yearly';
    const price = plan.yearly;

    if (planId === 'free') {
        if (sub.planId !== 'free' && !confirm('Downgrade to the free Community plan? Paid features end at the current billing period.')) {
            return;
        }
        sub.planId = 'free';
        sub.status = 'active';
        sub.startedAt = null;
        sub.renewsAt = null;
        applyPlanBadge('free');
        saveSession();
        syncIdentityUI();
        initSubscription();
        alert('You are now on the Community plan.');
        return;
    }

    const confirmMsg = `Subscribe to ${plan.name} for ${formatPrice(price)}/year? (Demo — no real charge.)`;
    if (!confirm(confirmMsg)) return;

    const now = new Date();
    sub.planId = planId;
    sub.billingCycle = cycle;
    sub.status = 'active';
    sub.startedAt = now.toISOString();
    sub.renewsAt = addMonths(now, 12).toISOString();

    recordInvoice(plan, cycle, price);
    applyPlanBadge(planId);
    if (planId === 'founder') {
        nvApplyRep('FOUNDER_PASS_HOLDER', { note: 'Subscribed to Founder Elite' });
        activeSessionState._repFounderGranted = true;
    }

    saveSession();
    syncIdentityUI();
    initSubscription();
    alert(`Welcome to ${plan.name}! Your subscription is active until ${formatDate(sub.renewsAt)}.`);
}

function cancelSubscription() {
    const sub = getSubscription();
    if (sub.planId === 'free') return;

    if (!confirm('Cancel your subscription? You keep access until the end of the current billing period.')) return;

    sub.status = 'cancelled';
    saveSession();
    initSubscription();
    alert('Subscription cancelled. Access continues until ' + formatDate(sub.renewsAt) + '.');
}

function initSubscription() {
    try {
        ensureSessionPersisted();
        getSubscription();

        const sub = getSubscription();
        sub.billingCycle = 'yearly';
        updatePlanPricesOnly();
        updatePlanCardStates();
        renderBillingHistory();
        syncSubscriptionBanner();
        saveSession();
    } catch (err) {
        console.error('Namvio: initSubscription failed', err);
    }
}

function executePostPublish() {
    if (activeSessionState.isSuspended) {
        alert('Your account is suspended. You cannot post until moderation review completes.');
        return;
    }
    const el = document.getElementById('feed-post-textarea');
    const txt = (el && el.value || '').trim();
    if (!txt) {
        alert('Write something about your domains, deals, or market insight.');
        return;
    }

    if (activeSessionState.isShadowBanned) {

        if (el) el.value = '';
        alert('Post published (visible only to you while shadow ban is active).');
        saveSession();
        return;
    }

    const post = {
        id: 'p_' + Date.now(),
        body: txt,
        domains: extractDomains(txt),
        time: 'Just now',
        likes: 0
    };

    activeSessionState.posts = activeSessionState.posts || [];
    activeSessionState.posts.unshift(post);
    if (window.NamvioModeration) NamvioModeration.analyzePostContent(activeSessionState, txt);
    nvApplyRep('POST_CREATED', { note: 'Published post' });
    bumpProfileStat('posts', 1);
    saveSession();
    syncIdentityUI();
    initFeed();

    if (el) el.value = '';
}

function toggleLike(btn, baseCount, postKey, isOwn) {
    btn.classList.toggle('active');
    const span = btn.querySelector('.like-count');
    if (!span) return;
    const current = parseInt(span.textContent, 10) || baseCount;
    const delta = btn.classList.contains('active') ? 1 : -1;
    span.textContent = Math.max(0, current + delta);
    if (isOwn && btn.classList.contains('active')) {
        nvApplyRep('POST_RECEIVES_LIKE', { note: 'Like on ' + (postKey || 'post') });
        bumpProfileStat('likesReceived', 1);
        saveSession();
        syncIdentityUI();
    }
}

function toggleCommentsPanel(btn, postKey) {
    const wrap = document.getElementById('comments-' + postKey);
    if (wrap) wrap.classList.toggle('d-none');
}

function submitPostComment(e, postKey) {
    e.preventDefault();
    const form = e.target;
    const ta = form.querySelector('textarea');
    const body = (ta && ta.value || '').trim();
    if (!body) return;

    activeSessionState.commentsByPost = activeSessionState.commentsByPost || {};
    if (!activeSessionState.commentsByPost[postKey]) activeSessionState.commentsByPost[postKey] = [];

    const comment = {
        id: 'c_' + Date.now(),
        author: activeSessionState.displayName,
        handle: activeSessionState.handle,
        reputation: activeSessionState.reputationScore,
        body,
        likes: 0,
        liked: false
    };
    activeSessionState.commentsByPost[postKey].push(comment);
    nvApplyRep('COMMENT_CREATED', { note: 'Comment on ' + postKey });
    ta.value = '';

    const wrap = document.getElementById('comments-' + postKey);
    if (wrap) {
        const list = wrap.querySelector('.post-comments-list');
        if (list) {
            const empty = list.querySelector('p.text-muted');
            if (empty) empty.remove();
            list.insertAdjacentHTML('beforeend', renderCommentRow(comment, postKey));
        }
        wrap.classList.remove('d-none');
    }

    saveSession();
    syncIdentityUI();
}

function toggleCommentLike(btn, postKey, commentId) {
    const seed = SEED_COMMENTS[postKey];
    let comments = seed ? seed.map((c) => ({ ...c })) : (activeSessionState.commentsByPost[postKey] || []);
    const c = comments.find((x) => x.id === commentId);
    if (!c) return;

    c.liked = !c.liked;
    c.likes = Math.max(0, (c.likes || 0) + (c.liked ? 1 : -1));
    const span = btn.querySelector('.comment-like-count');
    if (span) span.textContent = c.likes;

    const isOwnComment =
        c.handle === activeSessionState.handle || c.author === activeSessionState.displayName;
    if (c.liked && isOwnComment) {
        nvApplyRep('COMMENT_RECEIVES_LIKE', { note: 'Like on comment ' + commentId });
        bumpProfileStat('commentsReceived', 1);
    }

    if (!seed) activeSessionState.commentsByPost[postKey] = comments;
    saveSession();
    syncIdentityUI();
}

function repostContent(btn, postKey) {
    if (btn && btn.dataset.reposted === '1') return;
    if (btn) btn.dataset.reposted = '1';
    nvApplyRep('POST_RECEIVES_REPOST', { note: 'Repost of ' + postKey });
    saveSession();
    syncIdentityUI();
    alert('Reposted to your followers (demo).');
}

function openCommentPrompt(btn) {
    const card = btn.closest('.card-component');
    const postKey = card ? card.dataset.postKey : '';
    if (postKey) {
        toggleCommentsPanel(btn, postKey);
        const wrap = document.getElementById('comments-' + postKey);
        const ta = wrap ? wrap.querySelector('textarea') : null;
        if (ta) ta.focus();
        return;
    }
    const author = card ? card.querySelector('h6') : null;
    const name = author ? author.textContent.trim() : 'this post';
    const comment = prompt(`Comment on ${name}:`);
    if (comment && comment.trim()) {
        nvApplyRep('COMMENT_CREATED', { note: 'Quick comment' });
        saveSession();
        syncIdentityUI();
    }
}

function sharePost(btn) {
    if (window.NamvioShare) {
        NamvioShare.openPostFromButton(btn);
        return;
    }
    const card = btn.closest('.card-component');
    const text = card ? card.querySelector('p') : null;
    const snippet = text ? text.textContent.slice(0, 80) : 'Namvio domain update';
    alert('Share: ' + snippet);
}

function applyTrendingKeyword(e, keyword) {
    e.preventDefault();
    const q = (keyword || '').trim().toLowerCase();
    const search = document.getElementById('global-search');
    if (search) search.value = q;
    filterFeedSearch(q);
    routeView('feed', document.querySelector('.mobile-fixed-footer a[data-mobile-nav="feed"]') || document.querySelector('.mobile-fixed-footer a'));
    const el = document.getElementById('feed-post-textarea');
    if (el) el.focus();
}

function filterFeedSearch(query) {
    const q = (query || '').toLowerCase().trim();
    document.querySelectorAll('#feed-pipeline-cards .card-component').forEach((card) => {
        const text = card.textContent.toLowerCase();
        card.style.display = !q || text.includes(q) ? '' : 'none';
    });
}

function handleSearchKey(e) {
    if (e.key === 'Enter') filterFeedSearch(e.target.value);
}


const BLOGS = [
    {
        id: 'b1',
        title: 'Why .ai Domains Are the New .com for Startups',
        excerpt: 'Premium AI keyword sales are reshaping portfolio strategy for 2026.',
        author: 'Maya Chen',
        date: 'Jun 4, 2026',
        readTime: '7 min read',
        category: 'ai',
        tags: ['#AI', '#Premium'],
        content: 'The .ai extension has moved from niche to must-have for funded startups. Recent comps show strong liquidity for short, pronounceable AI names.'
    },
    {
        id: 'b2',
        title: 'Escrow Best Practices for Six-Figure Domain Deals',
        excerpt: 'How brokers reduce friction and protect both sides on large transfers.',
        author: 'Rahul Sharma',
        date: 'Jun 3, 2026',
        readTime: '5 min read',
        category: 'escrow',
        tags: ['#Broker', '#Escrow'],
        content: 'Always verify ownership, use tier-1 escrow, and document auth codes before announcing a sale publicly.'
    },
    {
        id: 'b3',
        title: 'Brandable Inventory: Pricing for Quick Turns',
        excerpt: 'A simple framework for listing brandables without leaving money on the table.',
        author: 'James Okonkwo',
        date: 'Jun 1, 2026',
        readTime: '6 min read',
        category: 'brandable',
        tags: ['#Brandables', '#Pricing'],
        content: 'Segment by syllable count, TLD, and comparable past sales. Price for velocity when holding costs exceed upside.'
    }
];

let activeBlogFilter = 'all';

function renderBlogCard(post) {
    const cat = (post.category || 'strategy').toUpperCase();
    return `
<div class="col-md-6 mb-3">
  <div class="card-component p-3 h-100 blog-card" style="cursor:pointer;" onclick="showBlogModal('${post.id}')">
    <span class="badge badge-light border small mb-2">${cat}</span>
    <h6 class="font-weight-bold text-dark mb-2">${post.title}</h6>
    <p class="text-muted small mb-3">${post.excerpt}</p>
    <div class="d-flex justify-content-between align-items-center small text-muted">
      <span>${post.author}</span>
      <span>${post.readTime}</span>
    </div>
  </div>
</div>`;
}

function filterBlogs(cat, btn) {
    activeBlogFilter = cat || 'all';
    document.querySelectorAll('.blog-filter-btn').forEach((b) => b.classList.remove('active', 'btn-primary'));
    document.querySelectorAll('.blog-filter-btn').forEach((b) => {
        if (!b.classList.contains('btn-primary')) b.classList.add('btn-light', 'border');
    });
    if (btn) {
        btn.classList.add('active', 'btn-primary');
        btn.classList.remove('btn-light');
    }
    const grid = document.getElementById('blogs-grid');
    if (!grid) return;
    const list = BLOGS.filter((p) => activeBlogFilter === 'all' || p.category === activeBlogFilter);
    grid.innerHTML = list.map(renderBlogCard).join('');
}

function initBlogs() {
    filterBlogs(activeBlogFilter, document.querySelector('.blog-filter-btn.active'));
}

function showBlogModal(id) {
    const post = BLOGS.find((p) => p.id === id);
    const modal = document.getElementById('blog-modal');
    if (!post || !modal) return;
    document.getElementById('blog-modal-title').textContent = post.title;
    document.getElementById('blog-modal-meta').textContent = post.author + ' · ' + post.date + ' · ' + post.readTime;
    document.getElementById('blog-modal-body').innerHTML = post.content;
    modal.classList.remove('d-none');
    modal.style.display = 'flex';
}

function closeBlogModal() {
    const modal = document.getElementById('blog-modal');
    if (!modal) return;
    modal.classList.add('d-none');
    modal.style.display = '';
}

function openWritePostModal() {
    const modal = document.getElementById('write-post-modal');
    if (modal) {
        modal.classList.remove('d-none');
        modal.style.display = 'flex';
    }
}

function closeWritePostModal() {
    const modal = document.getElementById('write-post-modal');
    if (modal) {
        modal.classList.add('d-none');
        modal.style.display = '';
        const form = document.getElementById('write-post-form');
        if (form) form.reset();
    }
}

function publishFakePost(e) {
    e.preventDefault();
    const title = (document.getElementById('post-title')?.value || '').trim();
    const category = document.getElementById('post-category')?.value || 'strategy';
    const excerpt = (document.getElementById('post-excerpt')?.value || '').trim();
    const content = (document.getElementById('post-content')?.value || '').trim();
    const readTime = (document.getElementById('post-readtime')?.value || '5 min read').trim();
    if (!title || !excerpt || !content) {
        alert('Please fill title, excerpt and content.');
        return;
    }
    BLOGS.unshift({
        id: 'b' + Date.now(),
        title,
        excerpt,
        author: activeSessionState.displayName || 'You',
        date: 'Just now',
        readTime,
        category,
        tags: ['#Community'],
        content: content.replace(/\n/g, '<br>')
    });
    filterBlogs(activeBlogFilter, document.querySelector('.blog-filter-btn.active'));
    closeWritePostModal();
    alert('Post published (demo session).');
}

function adminAdjustReputation() {
    const delta = parseInt(document.getElementById('admin-rep-delta')?.value, 10);
    const note = document.getElementById('admin-rep-note')?.value || 'Admin adjustment';
    if (isNaN(delta) || delta === 0) {
        alert('Enter a non-zero point adjustment.');
        return;
    }
    if (window.NamvioReputation) NamvioReputation.adminAdjust(activeSessionState, delta, note);
    saveSession();
    syncIdentityUI();
    initFeed();
    if (window.NamvioModeration) NamvioModeration.initDashboard(activeSessionState);
    alert('Reputation updated to ' + activeSessionState.reputationScore.toLocaleString());
}

function bootNamvio() {
    window.activeSessionState = activeSessionState;
    window.saveSession = saveSession;
    window.syncIdentityUI = syncIdentityUI;
    window.initFeed = initFeed;
    window.getPostKey = getPostKey;
    window.renderPostCard = renderPostCard;
    window.renderPortfolio = renderPortfolio;
    window.ROLE_LABEL = ROLE_LABEL;

    window.subscribeToPlan = subscribeToPlan;
    window.routeView = routeView;
    window.initSubscription = initSubscription;
    window.saveUserSettings = saveUserSettings;
    window.resetUserSettings = resetUserSettings;
    window.exportUserData = exportUserData;
    window.deleteAccountDemo = deleteAccountDemo;
    window.toggleMobileNav = toggleMobileNav;
    window.closeMobileNav = closeMobileNav;
    window.initHallOfFame = initHallOfFame;
    window.initMarketplace = initMarketplace;
    window.initNetworking = initNetworking;
    window.filterNetworkingMembers = filterNetworkingMembers;
    window.connectNetworkingMember = connectNetworkingMember;
    window.initBlogs = initBlogs;
    window.filterBlogs = filterBlogs;
    window.showBlogModal = showBlogModal;
    window.closeBlogModal = closeBlogModal;
    window.openWritePostModal = openWritePostModal;
    window.closeWritePostModal = closeWritePostModal;
    window.publishFakePost = publishFakePost;
    window.adminAdjustReputation = adminAdjustReputation;
    window.submitPostComment = submitPostComment;
    window.toggleCommentLike = toggleCommentLike;
    window.toggleCommentsPanel = toggleCommentsPanel;
    window.repostContent = repostContent;
    window.toggleLike = toggleLike;
    window.openCommentPrompt = openCommentPrompt;
    window.nvApplyRep = nvApplyRep;
    window.applyTrendingKeyword = applyTrendingKeyword;
    window.filterFeedSearch = filterFeedSearch;
    window.handleSearchKey = handleSearchKey;
    window.executePostPublish = executePostPublish;
    window.cancelSubscription = cancelSubscription;
    window.getSettings = getSettings;
    window.initTrending = initTrending;
    window.initMarketPulse = initMarketPulse;
    window.initMesages = initMesages;
    window.getMesages = getMesages;
    window.getMesageThread = getMesageThread;
    window.formatMesageTime = formatMesageTime;
    window.openMesageThread = openMesageThread;
    window.startMesageWith = startMesageWith;
    window.syncMesageThreadsFromSeeds = syncMesageThreadsFromSeeds;
    window.toggleMesageThread = toggleMesageThread;
    window.mesageBackToList = mesageBackToList;
    window.closeMesageThread = closeMesageThread;
    window.filterMesageThreads = filterMesageThreads;
    window.sendMesage = sendMesage;
    window.updateMesageBadges = updateMesageBadges;
    window.MESSAGE_PEERS = MESSAGE_PEERS;
    window.initRecentDomainSales = initRecentDomainSales;
    window.onDomainSalesYearChange = onDomainSalesYearChange;
    window.openDomainSalesFullPage = openDomainSalesFullPage;
    window.toggleDomainSalesSeeMore = toggleDomainSalesSeeMore;
    window.initDomainSalesFullPage = initDomainSalesFullPage;
    window.formatSalePrice = formatSalePrice;
    window.formatSaleDate = formatSaleDate;
    window.renderDomainSaleChip = renderDomainSaleChip;
    window.getFilteredDomainSales = getFilteredDomainSales;
    window.syncInviteCodeUI = syncInviteCodeUI;
    window.SEED_ACCOUNTS = SEED_ACCOUNTS;
    window.SEED_POSTS = SEED_POSTS;
    window.NETWORKING_MEMBERS = NETWORKING_MEMBERS;

    try {
        if (window.NamvioNav) window.NamvioNav.init();
        ensureSessionPersisted();
        initFeed();
        initHallOfFame();
        initWhoToFollow();
        initBlogs();
        syncInviteCodeUI();
        if (window.NamvioModeration) window.NamvioModeration.syncAdminNav(activeSessionState);
        if (window.NamvioSponsors) window.NamvioSponsors.init();
        syncIdentityUI();
        syncSidebarProfile();
    } catch (err) {
        console.error('Namvio: boot partial error', err);
    }

    try {
        loadDomainSalesYearPref();
        initTrending();
    } catch (err) {
        console.error('Namvio: trending sidebar error', err);
    }

    try {
        initNetworking();
    } catch (err) {
        console.error('Namvio: networking init error', err);
    }

    try {
        initSubscription();
    } catch (err) {
        console.error('Namvio: subscription init error', err);
    }

    try {
        updateMesageBadges();
    } catch (err) {
        console.error('Namvio: mesages badge error', err);
    }

}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootNamvio);
} else {
    bootNamvio();
}