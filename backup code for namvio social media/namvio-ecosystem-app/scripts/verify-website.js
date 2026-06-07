/**
 * Full-site debug harness — boot, route all views, validate inline handlers.
 * Run: node scripts/verify-website.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const scriptRe = /<script src="([^"]+\.js[^"]*)"><\/script>/g;
const localScripts = [];
let m;
while ((m = scriptRe.exec(html))) {
    const src = m[1].split('?')[0];
    if (src.startsWith('assets/')) localScripts.push(path.join(ROOT, src));
}

const viewIds = [...new Set([...html.matchAll(/id="(view-[^"]+)"/g)].map((x) => x[1]))];
viewIds.push('view-domain-sales');

const extraIds = [
    'nv-app-layout', 'nv-domain-sales-shell', 'nv-right-sidebar', 'nv-mobile-nav',
    'nv-header-search', 'feed-posts-container', 'trending-keywords-box', 'recent-domain-sales-box',
    'market-pulse-sales-box', 'market-pulse-trending-box', 'who-to-follow-box',
    'domain-sales-year-select', 'market-pulse-sales-year-select', 'domain-sales-full-year-select',
    'ds-kpi-grid', 'domain-sales-full-tbody', 'domain-sales-full-title', 'domain-sales-full-subtitle',
    'domain-sales-full-count', 'ds-top-spotlight', 'ds-insights-list', 'ds-chart-quarterly',
    'ds-chart-monthly', 'ds-chart-tld', 'ds-chart-tld-legend', 'ds-chart-venues',
    'ds-tier-breakdown', 'ds-length-breakdown', 'ds-tld-table-body',
    'msg-thread-list', 'msg-thread-view', 'msg-compose-input', 'msg-seed-compose',
    'net-members-grid', 'net-kpi-row', 'mp-listings-grid', 'hof-podium', 'blog-list',
    'subscription-plans-grid', 'user-settings-form', 'nv-invite-code-display', 'settings-invite-code',
    'sidebar-display-name', 'sidebar-handle', 'sidebar-rep-line', 'mod-reported-users-list',
    'legal-accordion', 'lg-policy-search', 'lg-kpi-row', 'lg-policy-toolbar',
    'st-kpi-row', 'st-section-nav',
    'sp-amount-grid', 'sp-community-stats', 'sp-supporter-wall', 'sp-top-supporters',
    'gd-toc-nav', 'gd-sections-col', 'rules-sections-col', 'help-hub-grid',
    'nv-share-modal', 'nv-sidebar-nav-host', 'nv-mobile-nav-host', 'nv-bottom-nav-inner',
    'side-menu-list', 'nv-network-sponsors-sidebar'
];

const allIds = [...new Set([...viewIds, ...extraIds])];
const nodes = {};
const makeEl = (id) => ({
    id,
    tagName: 'DIV',
    className: id.startsWith('view-') ? 'nv-routing-view d-none' : '',
    classList: {
        _c: new Set(id.startsWith('view-') ? ['nv-routing-view', 'd-none'] : []),
        add(...a) {
            a.forEach((x) => this._c.add(x));
            this.className = [...this._c].join(' ');
        },
        remove(...a) {
            a.forEach((x) => this._c.delete(x));
            this.className = [...this._c].join(' ');
        },
        toggle(x, on) {
            on ? this._c.add(x) : this._c.delete(x);
            this.className = [...this._c].join(' ');
        },
        contains(x) {
            return this._c.has(x);
        }
    },
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    style: {},
    appendChild(child) {
        if (child) child.parentNode = this;
    },
    insertBefore(child) {
        if (child) child.parentNode = this;
    },
    parentNode: null,
    scrollIntoView() {},
    addEventListener() {},
    querySelector(sel) {
        if (sel && sel.startsWith('#')) return nodes[sel.slice(1)] || null;
        return null;
    },
    querySelectorAll(sel) {
        if (sel === '.nv-routing-view') return viewIds.map((v) => nodes[v]).filter(Boolean);
        if (sel === '.mobile-nav-item') return [];
        if (sel === '.nv-side-nav-item') return [];
        if (sel === '.post-card') return [];
        return [];
    }
});

allIds.forEach((id) => {
    nodes[id] = makeEl(id);
});

const body = makeEl('body');
body.classList._c.clear();
body.insertBefore = function (child) {
    if (child) child.parentNode = this;
};
body.appendChild = function (child) {
    if (child) child.parentNode = this;
};
Object.values(nodes).forEach((node) => {
    node.parentNode = body;
    node.nextSibling = null;
});

const document = {
    getElementById: (id) => nodes[id] || null,
    querySelector: (sel) => {
        if (sel && sel.startsWith('#')) return nodes[sel.slice(1)] || null;
        if (sel === 'body') return body;
        return null;
    },
    querySelectorAll: (sel) => {
        if (sel === '.nv-routing-view') return viewIds.map((v) => nodes[v]).filter(Boolean);
        if (sel === '.mobile-nav-item') return [];
        if (sel === '.nv-side-nav-item') return [];
        if (sel === '.post-card') return [];
        if (sel === '.trending-keyword-row') return [];
        if (sel === '.recent-sale-row') return [];
        return [];
    },
    createElement: () => ({ textContent: '', innerHTML: '', setAttribute() {}, appendChild() {} }),
    body,
    readyState: 'complete',
    addEventListener: () => {}
};

const jQueryFn = function () {
    return {
        collapse: () => {},
        modal: () => {}
    };
};
jQueryFn.fn = {};
const jQuery = jQueryFn;

const errors = [];
const routeErrors = [];
const console = {
    log: () => {},
    warn: (...a) => errors.push({ level: 'warn', msg: a.join(' ') }),
    error: (...a) => errors.push({ level: 'error', msg: a.join(' ') })
};

const window = {
    document,
    location: { hash: '', origin: 'http://localhost', pathname: '/index.html' },
    addEventListener: () => {},
    innerWidth: 1280,
    scrollTo: () => {},
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    jQuery,
    alert: () => {},
    confirm: () => true,
    prompt: () => null,
    open: () => null
};

const ctx = vm.createContext({
    window,
    document,
    console,
    jQuery,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    navigator: { clipboard: { writeText: () => Promise.resolve() } }
});

for (const file of localScripts) {
    if (!fs.existsSync(file)) {
        errors.push({ level: 'error', msg: 'missing script: ' + path.basename(file) });
        continue;
    }
    try {
        vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
    } catch (e) {
        errors.push({ level: 'error', msg: path.basename(file) + ': ' + e.message });
    }
}

// Browser scripts attach namespaces to window; mirror onto VM globals for bare Namvio* references.
Object.keys(window).forEach((key) => {
    if (/^(Namvio|NAMEBIO|DOMAIN_SALES)/.test(key)) ctx[key] = window[key];
});

const handlerRe = /on(?:click|change|submit|keyup|keydown|input)="([^"]+)"/gi;
const handlerBodies = [];
while ((m = handlerRe.exec(html))) handlerBodies.push(m[1]);

const fnCallRe = /([A-Za-z_$][\w$.]*)\s*\(/g;
const handlerFns = new Set();
handlerBodies.forEach((body) => {
    let fm;
    const skip = new Set(['return', 'false', 'true', 'if', 'event', 'this', 'window', 'history']);
    while ((fm = fnCallRe.exec(body))) {
        const name = fm[1].split('.').pop();
        if (!skip.has(name)) handlerFns.add(fm[1]);
    }
});

const missingHandlers = [...handlerFns].filter((name) => {
    if (name.includes('stopPropagation') || name.startsWith('event.')) return false;
    if (name.startsWith('Namvio')) {
        const parts = name.split('.');
        let obj = window;
        for (const p of parts) {
            obj = obj && obj[p];
        }
        return typeof obj !== 'function';
    }
    const top = name.split('.')[0];
    if (top === 'history' || top === 'window') return false;
    return typeof window[top] !== 'function';
});

const routes = [
    'feed', 'market-pulse', 'mesages', 'hof', 'networking', 'marketplace',
    'subscription', 'settings', 'blogs', 'legal', 'support', 'guide', 'rules', 'help',
    'admin', 'identity', 'domain-sales'
];

routes.forEach((view) => {
    try {
        window.routeView(view);
    } catch (e) {
        routeErrors.push({ view, error: e.message });
    }
});

const bootErrors = errors.filter((e) => e.level === 'error');
const result = {
    scripts: localScripts.length,
    views: viewIds.length,
    routesTested: routes.length,
    routeErrors,
    bootErrors: bootErrors.map((e) => e.msg),
    bootWarnings: errors.filter((e) => e.level === 'warn').map((e) => e.msg),
    missingHandlers,
    exportsOk: {
        filterFeedSearch: typeof window.filterFeedSearch === 'function',
        handleSearchKey: typeof window.handleSearchKey === 'function',
        executePostPublish: typeof window.executePostPublish === 'function',
        cancelSubscription: typeof window.cancelSubscription === 'function',
        syncInviteCodeUI: typeof window.syncInviteCodeUI === 'function',
        routeView: typeof window.routeView === 'function',
        startMesageWith: typeof window.startMesageWith === 'function',
        openDomainSalesFullPage: typeof window.openDomainSalesFullPage === 'function',
        NamvioSupport: typeof window.NamvioSupport === 'object',
        submitContactForm: typeof window.submitContactForm === 'function',
        scrollGuideSection: typeof window.scrollGuideSection === 'function'
    }
};

console.log = (...a) => process.stdout.write(a.join(' ') + '\n');
console.log('=== Namvio Full Website Debug ===');
console.log(JSON.stringify(result, null, 2));

const failed =
    bootErrors.length ||
    routeErrors.length ||
    missingHandlers.length ||
    Object.values(result.exportsOk).some((v) => !v);

process.exit(failed ? 1 : 0);