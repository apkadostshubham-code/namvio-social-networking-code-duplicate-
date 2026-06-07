/**
 * Namvio Docs — Legal Center (organized nav, search, motion).
 */
(function () {
    const LEGAL_CATEGORIES = [
        { id: 'all', label: 'All policies', icon: 'fa-layer-group', short: 'All' },
        { id: 'core', label: 'Core', icon: 'fa-file-lines', short: 'Core' },
        { id: 'payments', label: 'Payments', icon: 'fa-credit-card', short: 'Pay' },
        { id: 'content', label: 'Content & IP', icon: 'fa-copyright', short: 'Content' },
        { id: 'security', label: 'Security', icon: 'fa-shield-halved', short: 'Security' },
        { id: 'platform', label: 'Platform', icon: 'fa-server', short: 'Platform' },
        { id: 'liability', label: 'Liability & law', icon: 'fa-gavel', short: 'Legal' }
    ];

    const CAT_BY_ID = Object.fromEntries(LEGAL_CATEGORIES.map((c) => [c.id, c]));

    const LEGAL_CAT_BY_NUM = {
        1: 'core', 2: 'core', 3: 'core',
        4: 'payments',
        5: 'content', 6: 'content', 7: 'content', 8: 'content', 9: 'content', 10: 'content', 11: 'content', 27: 'content',
        12: 'security', 13: 'security', 25: 'security',
        14: 'platform', 20: 'platform', 21: 'platform', 22: 'platform', 23: 'platform', 24: 'platform', 26: 'platform', 30: 'platform',
        15: 'liability', 16: 'liability', 17: 'liability', 18: 'liability', 19: 'liability', 28: 'liability', 29: 'liability'
    };

    let activeLegalCat = 'all';
    let legalSearchQuery = '';

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function scanMotion(root) {
        if (window.NamvioMotion) NamvioMotion.scanReveal(root || document);
    }

    function getLegalPolicyNumber(card) {
        const btn = card.querySelector('.card-header button');
        if (!btn) return 0;
        const m = btn.textContent.trim().match(/^(\d+)\./);
        return m ? parseInt(m[1], 10) : 0;
    }

    function getCategoryCounts() {
        const accordion = document.getElementById('legal-accordion');
        const counts = { all: 0 };
        LEGAL_CATEGORIES.forEach((c) => {
            if (c.id !== 'all') counts[c.id] = 0;
        });
        if (!accordion) return counts;
        accordion.querySelectorAll(':scope > .card').forEach((card) => {
            counts.all += 1;
            const cat = card.dataset.lgCat || LEGAL_CAT_BY_NUM[getLegalPolicyNumber(card)] || 'platform';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    }

    function decoratePolicyToggle(btn, num, cat) {
        if (!btn || btn.dataset.lgDecorated) return;
        btn.dataset.lgDecorated = '1';
        const raw = btn.textContent.trim();
        const title = raw.replace(/^\d+\.\s*/, '');
        const meta = CAT_BY_ID[cat] || { label: cat, short: cat };
        btn.innerHTML = `<span class="lg-policy-num" aria-hidden="true">${num}</span><span class="lg-policy-title-text">${esc(title)}</span><span class="lg-policy-cat-badge lg-policy-cat-badge--${esc(cat)}">${esc(meta.short)}</span>`;
    }

    function enhanceLegalAccordion() {
        const accordion = document.getElementById('legal-accordion');
        if (!accordion || accordion.dataset.lgEnhanced) return;
        accordion.dataset.lgEnhanced = '1';

        accordion.querySelectorAll(':scope > .card').forEach((card, i) => {
            const num = getLegalPolicyNumber(card);
            const cat = LEGAL_CAT_BY_NUM[num] || 'platform';
            card.classList.add('lg-policy-item', 'lg-section-enter');
            card.dataset.lgCat = cat;
            card.dataset.lgNum = String(num);
            card.style.animationDelay = i * 22 + 'ms';

            const header = card.querySelector('.card-header');
            const btn = card.querySelector('.card-header button');
            const body = card.querySelector('.card-body');
            const collapse = card.querySelector('.collapse');
            if (header) header.classList.add('lg-policy-header');
            if (btn) {
                btn.classList.add('lg-policy-toggle');
                decoratePolicyToggle(btn, num, cat);
            }
            if (body) body.classList.add('lg-policy-body');
            if (collapse && collapse.classList.contains('show')) card.classList.add('lg-policy-open');
        });

        bindAccordionMotion(accordion);
    }

    function bindAccordionMotion(accordion) {
        if (!accordion || accordion.dataset.lgMotion) return;
        accordion.dataset.lgMotion = '1';

        accordion.querySelectorAll('.collapse').forEach((panel) => {
            panel.addEventListener('show.bs.collapse', function () {
                const card = panel.closest('.lg-policy-item');
                if (card) card.classList.add('lg-policy-open');
            });
            panel.addEventListener('hide.bs.collapse', function () {
                const card = panel.closest('.lg-policy-item');
                if (card) card.classList.remove('lg-policy-open');
            });
        });
    }

    function renderLegalToolbar() {
        const toolbar = document.getElementById('lg-accordion-toolbar');
        if (!toolbar) return;
        toolbar.innerHTML = `
<button type="button" class="btn btn-sm btn-light border font-weight-bold lg-toolbar-btn" onclick="NamvioDocs.expandAllPolicies(); return false;" title="Expand all visible policies">
  <i class="fa-solid fa-angles-down mr-1"></i>Expand
</button>
<button type="button" class="btn btn-sm btn-light border font-weight-bold lg-toolbar-btn" onclick="NamvioDocs.collapseAllPolicies(); return false;" title="Collapse all policies">
  <i class="fa-solid fa-angles-up mr-1"></i>Collapse
</button>`;
    }

    function expandAllPolicies() {
        const accordion = document.getElementById('legal-accordion');
        if (!accordion || !window.jQuery) return;
        accordion.querySelectorAll(':scope > .card:not(.d-none) .collapse').forEach((el) => {
            window.jQuery(el).collapse('show');
        });
    }

    function collapseAllPolicies() {
        const accordion = document.getElementById('legal-accordion');
        if (!accordion || !window.jQuery) return;
        accordion.querySelectorAll(':scope > .card .collapse.show').forEach((el) => {
            window.jQuery(el).collapse('hide');
        });
    }

    function renderLegalKpis() {
        const row = document.getElementById('lg-kpi-row');
        if (!row) return;
        const accordion = document.getElementById('legal-accordion');
        const total = accordion ? accordion.querySelectorAll(':scope > .card').length : 30;
        const cats = LEGAL_CATEGORIES.length - 1;
        row.innerHTML = `
<div class="col-6 col-md-3 mb-3 mb-md-0">
  <div class="lg-kpi-card lg-kpi-card--policies"><span class="lg-kpi-value">${total}</span><span class="lg-kpi-label">Total policies</span></div>
</div>
<div class="col-6 col-md-3 mb-3 mb-md-0">
  <div class="lg-kpi-card lg-kpi-card--cats"><span class="lg-kpi-value">${cats}</span><span class="lg-kpi-label">Categories</span></div>
</div>
<div class="col-6 col-md-3 mb-3 mb-md-0">
  <div class="lg-kpi-card lg-kpi-card--date"><span class="lg-kpi-value lg-kpi-value--sm">Jun 2026</span><span class="lg-kpi-label">Last updated</span></div>
</div>
<div class="col-6 col-md-3">
  <div class="lg-kpi-card lg-kpi-card--demo"><span class="lg-kpi-value lg-kpi-value--sm">Demo</span><span class="lg-kpi-label">Illustrative only</span></div>
</div>`;
    }

    function renderLegalCatNav() {
        const nav = document.getElementById('lg-cat-nav');
        if (!nav) return;
        const counts = getCategoryCounts();
        nav.innerHTML = LEGAL_CATEGORIES.map((cat, i) => {
            const on = activeLegalCat === cat.id ? ' active' : '';
            const count = counts[cat.id] || 0;
            return `<button type="button" class="lg-cat-btn${on} lg-nav-enter" data-lg-cat="${esc(cat.id)}" style="animation-delay:${i * 30}ms"><i class="fa-solid ${esc(cat.icon)}"></i><span>${esc(cat.label)}</span><span class="lg-cat-count">${count}</span></button>`;
        }).join('');

        nav.querySelectorAll('[data-lg-cat]').forEach((btn) => {
            btn.addEventListener('click', function () {
                filterLegalPolicies(btn.getAttribute('data-lg-cat'), legalSearchQuery);
            });
        });
    }

    function updateLegalCount(visible, total) {
        const el = document.getElementById('lg-policy-count');
        if (!el) return;
        el.textContent = visible === total ? total + ' policies' : visible + ' of ' + total + ' shown';
    }

    function filterLegalPolicies(catId, query) {
        activeLegalCat = catId || 'all';
        legalSearchQuery = (query || '').trim().toLowerCase();
        renderLegalCatNav();

        const accordion = document.getElementById('legal-accordion');
        if (!accordion) return;

        const items = accordion.querySelectorAll(':scope > .card');
        let visible = 0;
        items.forEach((card) => {
            const cat = card.dataset.lgCat || 'platform';
            const btn = card.querySelector('.lg-policy-toggle');
            const title = btn ? btn.textContent.toLowerCase() : '';
            const body = card.querySelector('.lg-policy-body');
            const text = body ? body.textContent.toLowerCase() : '';
            const catMatch = activeLegalCat === 'all' || cat === activeLegalCat;
            const qMatch = !legalSearchQuery || title.indexOf(legalSearchQuery) >= 0 || text.indexOf(legalSearchQuery) >= 0;
            const show = catMatch && qMatch;
            card.classList.toggle('d-none', !show);
            if (show) visible += 1;
        });

        updateLegalCount(visible, items.length);

        if (window.NamvioMotion) {
            window.NamvioMotion.staggerChildren(accordion, ':scope > .card:not(.d-none)');
        }

        const empty = document.getElementById('lg-policy-empty');
        if (visible === 0) {
            if (!empty) {
                const msg = document.createElement('p');
                msg.id = 'lg-policy-empty';
                msg.className = 'lg-policy-empty text-muted small mb-0';
                msg.textContent = 'No policies match your search. Try another keyword or category.';
                accordion.parentNode.insertBefore(msg, accordion.nextSibling);
            }
        } else if (empty) {
            empty.remove();
        }
    }

    function bindLegalSearch() {
        const input = document.getElementById('lg-policy-search');
        if (!input || input.dataset.lgBound) return;
        input.dataset.lgBound = '1';
        input.addEventListener('input', function () {
            filterLegalPolicies(activeLegalCat, input.value);
        });
    }

    function initLegal() {
        enhanceLegalAccordion();
        renderLegalKpis();
        renderLegalToolbar();
        bindLegalSearch();
        const input = document.getElementById('lg-policy-search');
        filterLegalPolicies(activeLegalCat, input ? input.value : '');

        const root = document.getElementById('view-legal');
        if (window.NamvioMotion) {
            NamvioMotion.scanReveal(root);
            NamvioMotion.staggerChildren(document.getElementById('lg-kpi-row'), ':scope > [class*="col-"]');
        }
        scanMotion(root);
    }

    const GUIDE_SECTIONS = [
        { id: 'guide-welcome', num: 1, title: 'Welcome To Namvio', body: '<p class="text-muted small mb-0">Namvio is a professional social network built exclusively for domain investors, brokers, founders and buyers. Share sales, build reputation, and connect with verified peers.</p>' },
        { id: 'guide-profile', num: 2, title: 'Create Your Profile', body: '<p class="text-muted small mb-2">Add the essentials:</p><ul class="text-muted small pl-3 mb-0"><li>Profile photo</li><li>Bio</li><li>Portfolio website</li><li>Experience level</li><li>Role</li></ul>' },
        { id: 'guide-reputation', num: 3, title: 'Build Your Reputation', body: '<p class="text-muted small mb-0">Post valuable content. Help others. Share knowledge. Gain followers. Get verified. Higher reputation unlocks credibility across the network.</p>' },
        { id: 'guide-posts', num: 4, title: 'Create Posts', body: '<p class="text-muted small mb-2">Share domain sales, portfolio updates, industry insights, acquisitions, and lessons learned. Text and image posts are supported.</p>' },
        { id: 'guide-follow', num: 5, title: 'Follow Other Investors', body: '<p class="text-muted small mb-0">Build your network. Learn from experienced investors. Stay updated on market moves and deal flow.</p>' },
        { id: 'guide-dm', num: 6, title: 'Use Direct Messages', body: '<p class="text-muted small mb-0">Connect privately. Discuss deals. Build partnerships. Use Messages from the sidebar or member cards.</p>' },
        { id: 'guide-verify', num: 7, title: 'Verification Program', body: '<p class="text-muted small mb-0">Apply for verification. Verified members receive additional trust signals on their profile, posts, and comments.</p>' },
        { id: 'guide-founder', num: 8, title: 'Founder Pass', body: '<p class="text-muted small mb-2">Founder Pass is limited. Benefits include:</p><ul class="text-muted small pl-3 mb-0"><li>Founder badge</li><li>Founder recognition</li><li>Early supporter status</li></ul>' },
        { id: 'guide-hof', num: 9, title: 'Hall Of Fame', body: '<p class="text-muted small mb-0">Industry legends are featured here. Selection is managed by Namvio administrators.</p>' },
        { id: 'guide-standards', num: 10, title: 'Community Standards', body: '<p class="text-muted small mb-0">Be professional. Be respectful. Avoid spam. Contribute value. Read the full <a href="#" onclick="routeView(\'rules\', this); return false;">Community Rules</a> for enforcement details.</p>' },
        { id: 'guide-safety', num: 11, title: 'Safety Tips', body: '<ul class="text-muted small pl-3 mb-0"><li>Never send money without verification.</li><li>Always perform due diligence.</li><li>Verify ownership before transactions.</li></ul>' },
        { id: 'guide-support', num: 12, title: 'Support Center', body: '<p class="text-muted small mb-2">Contact support, report issues, or submit feedback.</p><button type="button" class="btn btn-sm btn-primary font-weight-bold" style="background:var(--nv-primary);border-color:var(--nv-primary);" onclick="routeView(\'help\', this); return false;"><i class="fa-solid fa-life-ring mr-1"></i> Open Support Center</button>' }
    ];

    const RULES_SECTIONS = [
        { title: 'Allowed content', icon: 'fa-circle-check text-success', items: ['Domain investing discussions', 'Domain sales stories', 'Broker experiences', 'Portfolio showcases', 'Industry news', 'Educational content', 'Networking'] },
        { title: 'Not allowed', icon: 'fa-ban text-danger', items: ['Spam', 'Fake domain sales', 'Scams', 'Harassment', 'Threats', 'Impersonation', 'Fake verification claims', 'Repeated promotions', 'Mass unsolicited messages', 'Malware links', 'Illegal content'] },
        { title: 'Violations & enforcement', icon: 'fa-gavel text-primary', items: ['First violation: Warning', 'Second: Temporary restriction', 'Third: Suspension', 'Severe violations: Immediate ban'] },
        { title: 'Reporting', icon: 'fa-flag text-warning', items: ['Spam', 'Harassment', 'Scam', 'Fake information', 'Impersonation', 'Other — all reviewed by moderators'] }
    ];

    function scrollGuideSection(id) {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderGuide() {
        const toc = document.getElementById('gd-toc-nav');
        const col = document.getElementById('gd-sections-col');
        if (!col) return;
        if (toc) {
            toc.innerHTML = GUIDE_SECTIONS.map((s) =>
                `<a href="#${esc(s.id)}" onclick="NamvioDocs.scrollGuideSection('${esc(s.id)}'); return false;">${s.num}. ${esc(s.title)}</a>`
            ).join('');
        }
        col.innerHTML = GUIDE_SECTIONS.map((s) =>
            `<div class="card-component p-4 mb-3 nv-guide-section" id="${esc(s.id)}">
                <span class="nv-guide-num">${s.num}</span>
                <h6 class="font-weight-bold text-dark mb-2">${esc(s.title)}</h6>
                ${s.body}
            </div>`
        ).join('');
    }

    function renderRules() {
        const el = document.getElementById('rules-sections-col');
        if (!el) return;
        el.innerHTML = RULES_SECTIONS.map((sec) =>
            `<div class="card-component p-4 mb-3 nv-rules-section">
                <h6 class="font-weight-bold text-dark mb-3"><i class="fa-solid ${sec.icon} mr-2"></i>${esc(sec.title)}</h6>
                <ul class="text-muted small mb-0 pl-3">${sec.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
            </div>`
        ).join('') + `
            <div class="card-component p-4 mb-3">
                <p class="text-muted small mb-3">Use the <strong>Report</strong> link on any post, or contact moderators through the Support Center.</p>
                <button type="button" class="btn btn-sm btn-outline-primary font-weight-bold" onclick="routeView('help', this); return false;">
                    <i class="fa-solid fa-life-ring mr-1"></i> Go to Support Center
                </button>
            </div>
            <div class="card-component p-3">
                <a href="#" class="nv-doc-link-item" onclick="routeView('guide', this); return false;"><i class="fa-solid fa-book-open"></i> How To Use Namvio</a>
                <a href="#" class="nv-doc-link-item" onclick="routeView('legal', this); return false;"><i class="fa-solid fa-balance-scale"></i> Legal Center</a>
            </div>`;
    }

    function renderHelpHub() {
        const hub = document.getElementById('help-hub-grid');
        if (hub) {
            hub.innerHTML = `
                <a href="#" class="nv-help-hub-card" onclick="routeView('guide', this); return false;">
                    <i class="fa-solid fa-book-open text-primary"></i>
                    <strong>How To Use Namvio</strong>
                    <span class="text-muted small">Full platform guide</span>
                </a>
                <a href="#" class="nv-help-hub-card" onclick="routeView('rules', this); return false;">
                    <i class="fa-solid fa-scale-balanced text-primary"></i>
                    <strong>Community Rules</strong>
                    <span class="text-muted small">Official policies</span>
                </a>
                <a href="#" class="nv-help-hub-card" onclick="routeView('support', this); return false;">
                    <i class="fa-solid fa-hand-holding-heart text-primary"></i>
                    <strong>Support Namvio</strong>
                    <span class="text-muted small">Help grow the platform</span>
                </a>
                <a href="#" class="nv-help-hub-card" onclick="routeView('legal', this); return false;">
                    <i class="fa-solid fa-balance-scale text-primary"></i>
                    <strong>Legal Center</strong>
                    <span class="text-muted small">Terms &amp; policies</span>
                </a>`;
        }
    }

    function submitContactForm(e) {
        if (e && e.preventDefault) e.preventDefault();
        const name = document.getElementById('help-contact-name');
        const email = document.getElementById('help-contact-email');
        const topic = document.getElementById('help-contact-topic');
        const msg = document.getElementById('help-contact-message');
        const status = document.getElementById('help-contact-status');
        if (!msg || !msg.value.trim()) {
            if (status) status.textContent = 'Please enter a message.';
            return false;
        }
        if (status) {
            status.innerHTML = '<span class="text-success"><i class="fa-solid fa-check mr-1"></i>Thank you — your message was received (demo). Our team will respond soon.</span>';
        }
        if (name) name.value = '';
        if (email) email.value = '';
        if (topic) topic.value = 'feedback';
        if (msg) msg.value = '';
        return false;
    }

    function initGuide() {
        renderGuide();
        const root = document.getElementById('view-guide');
        if (window.NamvioMotion) NamvioMotion.scanReveal(root);
        scanMotion(root);
    }

    function initRules() {
        renderRules();
        const root = document.getElementById('view-rules');
        if (window.NamvioMotion) NamvioMotion.scanReveal(root);
        scanMotion(root);
    }

    function initHelp() {
        renderHelpHub();
        const root = document.getElementById('view-help');
        if (window.NamvioMotion) NamvioMotion.scanReveal(root);
        scanMotion(root);
    }

    window.NamvioDocs = {
        initLegal,
        initGuide,
        initRules,
        initHelp,
        scrollGuideSection,
        submitContactForm,
        filterLegalPolicies,
        expandAllPolicies,
        collapseAllPolicies,
        LEGAL_CATEGORIES,
        GUIDE_SECTIONS
    };

    window.scrollGuideSection = scrollGuideSection;
    window.submitContactForm = submitContactForm;
})();