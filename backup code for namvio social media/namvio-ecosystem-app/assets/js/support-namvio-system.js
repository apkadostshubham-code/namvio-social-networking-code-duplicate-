/**
 * Namvio Social — Support Namvio (member financial support)
 * Stripe-ready checkout hooks · Supabase-ready persistence (localStorage demo)
 */
const NamvioSupport = (function () {
    const STATE_KEY = 'namvio_support_state_v1';
    const AMOUNTS = [5, 10, 25, 50, 100, 250];

    const BADGE_TIERS = [
        { min: 5, slug: 'supporter', label: 'Supporter', icon: 'fa-heart' },
        { min: 25, slug: 'champion', label: 'Champion', icon: 'fa-medal' },
        { min: 100, slug: 'patron', label: 'Patron', icon: 'fa-gem' },
        { min: 500, slug: 'visionary', label: 'Visionary', icon: 'fa-crown' }
    ];

    const SEED_SUPPORTERS = [
        { handle: '@rahul_domains', name: 'Rahul Sharma', amount: 250, public: true, badge: 'patron', at: '2026-05-12' },
        { handle: '@priya_io', name: 'Priya Kapoor', amount: 100, public: true, badge: 'patron', at: '2026-05-18' },
        { handle: '@marcus_vc', name: 'Marcus Chen', amount: 50, public: true, badge: 'champion', at: '2026-06-01' },
        { handle: '@lena_brand', name: 'Lena Brand', amount: 25, public: true, badge: 'champion', at: '2026-06-03' },
        { handle: '@apkadostshubham', name: 'Shubham', amount: 100, public: false, badge: 'patron', at: '2026-06-04' },
        { handle: '@domain_ace', name: 'Alex Rivera', amount: 10, public: true, badge: 'supporter', at: '2026-06-05' },
        { handle: '@broker_elite', name: 'Sam Brooks', amount: 500, public: true, badge: 'visionary', at: '2026-06-06' }
    ];

    let selectedAmount = 25;
    let isPublic = true;

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function defaultState() {
        return {
            supporters: [...SEED_SUPPORTERS],
            history: [],
            stats: {
                totalRaised: 4820,
                supporterCount: 128,
                monthlyGoal: 10000
            }
        };
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STATE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return { ...defaultState(), ...parsed, supporters: parsed.supporters || defaultState().supporters };
            }
        } catch (_) { /* ignore */ }
        return defaultState();
    }

    function saveState(state) {
        try {
            localStorage.setItem(STATE_KEY, JSON.stringify(state));
        } catch (_) { /* quota */ }
    }

    /** Supabase: insert into support_contributions { user_id, amount_cents, is_public, stripe_session_id } */
    function persistContribution(entry) {
        const state = loadState();
        state.history.unshift(entry);
        if (entry.publicDisplay) {
            state.supporters.unshift({
                handle: entry.handle,
                name: entry.name,
                amount: entry.amount,
                public: true,
                badge: badgeForAmount(entry.amount).slug,
                at: entry.createdAt.slice(0, 10)
            });
        }
        state.stats.totalRaised = (state.stats.totalRaised || 0) + entry.amount;
        state.stats.supporterCount = (state.stats.supporterCount || 0) + 1;
        state.history = state.history.slice(0, 100);
        state.supporters = state.supporters.slice(0, 80);
        saveState(state);
        return state;
    }

    function badgeForAmount(amount) {
        const a = Number(amount) || 0;
        let badge = BADGE_TIERS[0];
        BADGE_TIERS.forEach((t) => {
            if (a >= t.min) badge = t;
        });
        return badge;
    }

    function getSessionUser() {
        return window.activeSessionState || null;
    }

    /**
     * Stripe Checkout — replace URL with your Edge Function:
     * POST /api/stripe/create-support-session { amountCents, metadata, successUrl, cancelUrl }
     */
    function createStripeCheckoutSession(amountCents, metadata) {
        return Promise.resolve({
            id: 'cs_demo_' + Date.now(),
            url: null,
            demo: true,
            amountCents,
            metadata
        });
    }

    function renderAmountGrid() {
        const el = document.getElementById('sp-amount-grid');
        if (!el) return;
        el.innerHTML = AMOUNTS.map(
            (amt) => `
            <button type="button" class="sp-amount-btn ${selectedAmount === amt ? 'active' : ''}"
                    data-sp-amount="${amt}" onclick="NamvioSupport.selectAmount(${amt})">
                <span class="sp-amount-val">$${amt}</span>
                <span class="sp-amount-lbl">USD</span>
            </button>`
        ).join('');
    }

    function selectAmount(amt) {
        selectedAmount = Number(amt) || 0;
        const custom = document.getElementById('sp-custom-amount');
        if (custom) {
            custom.value = '';
            custom.classList.remove('is-active');
        }
        document.querySelectorAll('.sp-amount-btn').forEach((btn) => {
            btn.classList.toggle('active', Number(btn.dataset.spAmount) === selectedAmount);
        });
        updateSummary();
    }

    function onCustomAmountInput() {
        const input = document.getElementById('sp-custom-amount');
        if (!input) return;
        const v = parseFloat(input.value);
        if (!isNaN(v) && v > 0) {
            selectedAmount = Math.min(10000, Math.round(v * 100) / 100);
            document.querySelectorAll('.sp-amount-btn').forEach((btn) => btn.classList.remove('active'));
            input.classList.add('is-active');
        } else {
            input.classList.remove('is-active');
        }
        updateSummary();
    }

    function togglePublic(checked) {
        isPublic = !!checked;
        const lbl = document.getElementById('sp-privacy-label');
        if (lbl) {
            lbl.textContent = isPublic
                ? 'Show my name on the Supporter Wall'
                : 'Keep my support private (still counted in stats)';
        }
    }

    function updateSummary() {
        const el = document.getElementById('sp-checkout-summary');
        if (!el) return;
        const badge = badgeForAmount(selectedAmount);
        el.innerHTML = `
            <span class="sp-summary-amt">$${selectedAmount.toLocaleString()}</span>
            <span class="sp-summary-badge sp-badge-${esc(badge.slug)}"><i class="fa-solid ${badge.icon}"></i> ${esc(badge.label)} badge</span>`;
    }

    function renderStats(state) {
        const el = document.getElementById('sp-community-stats');
        if (!el) return;
        const s = state.stats || {};
        const goal = s.monthlyGoal || 10000;
        const raised = s.totalRaised || 0;
        const pct = Math.min(100, Math.round((raised / goal) * 100));
        el.innerHTML = `
            <div class="col-6 col-md-3 mb-3 mb-md-0">
                <div class="sp-kpi-card"><span class="sp-kpi-val">$${raised.toLocaleString()}</span><span class="sp-kpi-lbl">Total supported</span></div>
            </div>
            <div class="col-6 col-md-3 mb-3 mb-md-0">
                <div class="sp-kpi-card sp-kpi-card--primary"><span class="sp-kpi-val">${(s.supporterCount || 0).toLocaleString()}</span><span class="sp-kpi-lbl">Supporters</span></div>
            </div>
            <div class="col-6 col-md-3 mb-3 mb-md-0">
                <div class="sp-kpi-card"><span class="sp-kpi-val">${pct}%</span><span class="sp-kpi-lbl">Monthly goal</span></div>
            </div>
            <div class="col-6 col-md-3">
                <div class="sp-kpi-card"><span class="sp-kpi-val sp-kpi-val--sm">Stripe</span><span class="sp-kpi-lbl">Secure checkout</span></div>
            </div>
            <div class="col-12 mt-2">
                <div class="sp-goal-bar"><div class="sp-goal-fill" style="width:${pct}%"></div></div>
                <p class="text-muted small mb-0 mt-1">$${raised.toLocaleString()} of $${goal.toLocaleString()} monthly growth goal</p>
            </div>`;
    }

    function renderSupporterWall(state) {
        const el = document.getElementById('sp-supporter-wall');
        if (!el) return;
        const publicOnes = (state.supporters || []).filter((s) => s.public);
        if (!publicOnes.length) {
            el.innerHTML = '<p class="text-muted small mb-0">Be the first public supporter on the wall.</p>';
            return;
        }
        el.innerHTML = publicOnes
            .slice(0, 24)
            .map((s) => {
                const b = BADGE_TIERS.find((t) => t.slug === s.badge) || badgeForAmount(s.amount);
                return `
                <div class="sp-wall-card">
                    <span class="sp-wall-badge sp-badge-${esc(b.slug)}"><i class="fa-solid ${b.icon}"></i></span>
                    <span class="sp-wall-name font-weight-bold">${esc(s.name)}</span>
                    <span class="sp-wall-handle text-muted small">${esc(s.handle)}</span>
                    <span class="sp-wall-amt">$${Number(s.amount).toLocaleString()}</span>
                </div>`;
            })
            .join('');
    }

    function renderTopSupporters(state) {
        const el = document.getElementById('sp-top-supporters');
        if (!el) return;
        const top = [...(state.supporters || [])]
            .filter((s) => s.public)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
        el.innerHTML = top
            .map(
                (s, i) => `
            <div class="sp-top-row">
                <span class="sp-top-rank">#${i + 1}</span>
                <div class="sp-top-meta">
                    <span class="font-weight-bold">${esc(s.name)}</span>
                    <span class="text-muted small d-block">${esc(s.handle)}</span>
                </div>
                <span class="sp-top-amt font-weight-bold text-primary">$${Number(s.amount).toLocaleString()}</span>
            </div>`
            )
            .join('');
    }

    function renderHistory(state) {
        const el = document.getElementById('sp-history-body');
        const wrap = document.getElementById('sp-history-section');
        if (!el || !wrap) return;
        const session = getSessionUser();
        const handle = (session?.handle || '').toLowerCase();
        const mine = (state.history || []).filter((h) => (h.handle || '').toLowerCase() === handle);
        if (!handle || !mine.length) {
            wrap.classList.add('d-none');
            return;
        }
        wrap.classList.remove('d-none');
        el.innerHTML = mine
            .map(
                (h) => `
            <tr>
                <td>${esc((h.createdAt || '').slice(0, 10))}</td>
                <td class="font-weight-bold">$${Number(h.amount).toLocaleString()}</td>
                <td>${h.publicDisplay ? '<span class="text-success">Public</span>' : '<span class="text-muted">Private</span>'}</td>
                <td><span class="sp-badge-pill sp-badge-${esc(h.badge || 'supporter')}">${esc(h.badge || 'supporter')}</span></td>
                <td class="text-muted small">${esc(h.stripeSessionId || 'demo')}</td>
            </tr>`
            )
            .join('');
    }

    function showThankYou(entry) {
        const panel = document.getElementById('sp-thank-you');
        if (!panel) return;
        const badge = badgeForAmount(entry.amount);
        panel.classList.remove('d-none');
        panel.innerHTML = `
            <div class="sp-thank-inner">
                <i class="fa-solid fa-circle-check text-success sp-thank-icon"></i>
                <h5 class="font-weight-bold text-dark mb-1">Thank you for supporting Namvio</h5>
                <p class="text-muted small mb-2">Your <strong>$${entry.amount.toLocaleString()}</strong> contribution helps us build better tools for domain investors worldwide.</p>
                <span class="sp-summary-badge sp-badge-${esc(badge.slug)}"><i class="fa-solid ${badge.icon}"></i> ${esc(badge.label)} Supporter</span>
                <p class="text-muted small mt-3 mb-0"><i class="fa-brands fa-stripe mr-1"></i> Demo checkout complete — connect Stripe for live payments.</p>
            </div>`;
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async function submitSupport() {
        const session = getSessionUser();
        if (!session) {
            alert('Sign in to support Namvio.');
            return;
        }
        const custom = document.getElementById('sp-custom-amount');
        if (custom && custom.value.trim()) onCustomAmountInput();
        const amount = selectedAmount;
        if (!amount || amount < 1) {
            alert('Choose or enter a support amount.');
            return;
        }
        const publicToggle = document.getElementById('sp-public-toggle');
        const publicDisplay = publicToggle ? publicToggle.checked : isPublic;
        const amountCents = Math.round(amount * 100);
        const btn = document.getElementById('sp-checkout-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Processing…';
        }

        try {
            const stripeMeta = {
                user_id: session.handle,
                display_name: session.displayName,
                is_public: String(publicDisplay),
                product: 'support_namvio'
            };
            const checkout = await createStripeCheckoutSession(amountCents, stripeMeta);
            const badge = badgeForAmount(amount);
            const entry = {
                id: 'sup_' + Date.now(),
                handle: session.handle,
                name: session.displayName || 'Member',
                amount,
                publicDisplay,
                badge: badge.slug,
                stripeSessionId: checkout.id,
                createdAt: new Date().toISOString()
            };
            const state = persistContribution(entry);
            renderAll(state);
            showThankYou(entry);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-brands fa-stripe mr-1"></i> Support with Stripe';
            }
        }
    }

    function renderAll(state) {
        state = state || loadState();
        renderAmountGrid();
        updateSummary();
        renderStats(state);
        renderSupporterWall(state);
        renderTopSupporters(state);
        renderHistory(state);
    }

    function init() {
        const state = loadState();
        const toggle = document.getElementById('sp-public-toggle');
        if (toggle && !toggle.dataset.spBound) {
            toggle.dataset.spBound = '1';
            toggle.checked = isPublic;
            toggle.addEventListener('change', () => togglePublic(toggle.checked));
        }
        const custom = document.getElementById('sp-custom-amount');
        if (custom && !custom.dataset.spBound) {
            custom.dataset.spBound = '1';
            custom.addEventListener('input', onCustomAmountInput);
        }
        renderAll(state);
        const root = document.getElementById('view-support');
        if (window.NamvioMotion) {
            NamvioMotion.scanReveal(root);
            NamvioMotion.staggerChildren(document.getElementById('sp-community-stats'), ':scope > [class*="col-"]');
        }
    }

    return {
        init,
        selectAmount,
        submitSupport,
        loadState,
        createStripeCheckoutSession,
        BADGE_TIERS,
        AMOUNTS
    };
})();

window.NamvioSupport = NamvioSupport;