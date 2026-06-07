/**
 * Namvio Settings — organized panels, KPIs, section nav & motion.
 */
(function () {
    const SECTIONS = [
        { id: 'invite', label: 'Invite', icon: 'fa-share-nodes' },
        { id: 'account', label: 'Account', icon: 'fa-user' },
        { id: 'sale', label: 'Featured sale', icon: 'fa-tag' },
        { id: 'privacy', label: 'Privacy', icon: 'fa-shield-halved' },
        { id: 'notifications', label: 'Notifications', icon: 'fa-bell' },
        { id: 'preferences', label: 'Preferences', icon: 'fa-sliders' },
        { id: 'data', label: 'Data & account', icon: 'fa-lock' }
    ];

    let activeSection = 'account';

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getSession() {
        return window.activeSessionState || {};
    }

    function getSettings() {
        if (typeof window.getSettings === 'function') return window.getSettings();
        return getSession().settings || {};
    }

    function countActiveToggles(keys) {
        const s = getSettings();
        return keys.filter((k) => !!s[k]).length;
    }

    function getCompletionPercent() {
        if (window.NamvioProfile && NamvioProfile.computeProfileCompletion) {
            return NamvioProfile.computeProfileCompletion(getSession()).percent;
        }
        return 72;
    }

    function renderKpis() {
        const s = getSettings();
        const complete = getCompletionPercent();
        const privacyOn = countActiveToggles(['publicProfile', 'showEmail']);
        const notifOn = countActiveToggles(['notifyEmail', 'notifyDeals', 'notifyMentions', 'notifyDigest']);
        const portfolioLabel = s.showPortfolio ? 'Visible' : 'Hidden';
        return `
<div class="col-6 col-md-3 mb-3 mb-md-0">
  <div class="st-kpi-card st-kpi-card--complete"><span class="st-kpi-value">${complete}%</span><span class="st-kpi-label">Profile complete</span></div>
</div>
<div class="col-6 col-md-3 mb-3 mb-md-0">
  <div class="st-kpi-card st-kpi-card--privacy"><span class="st-kpi-value">${privacyOn}/2</span><span class="st-kpi-label">Privacy toggles</span></div>
</div>
<div class="col-6 col-md-3 mb-3 mb-md-0">
  <div class="st-kpi-card st-kpi-card--notify"><span class="st-kpi-value">${notifOn}/4</span><span class="st-kpi-label">Alerts active</span></div>
</div>
<div class="col-6 col-md-3">
  <div class="st-kpi-card st-kpi-card--portfolio"><span class="st-kpi-value st-kpi-value--sm">${esc(portfolioLabel)}</span><span class="st-kpi-label">Portfolio</span></div>
</div>`;
    }

    function renderSectionNav() {
        return SECTIONS.map((sec, i) => {
            const on = activeSection === sec.id ? ' active' : '';
            return `<button type="button" class="st-section-btn${on} st-nav-enter" data-st-section="${esc(sec.id)}" style="animation-delay:${i * 35}ms" onclick="NamvioSettings.goToSection('${esc(sec.id)}'); return false;"><i class="fa-solid ${esc(sec.icon)}"></i><span>${esc(sec.label)}</span></button>`;
        }).join('');
    }

    function refreshKpis() {
        const kpi = document.getElementById('st-kpi-row');
        if (kpi) kpi.innerHTML = renderKpis();
    }

    function refreshNav() {
        const nav = document.getElementById('st-section-nav');
        if (nav) nav.innerHTML = renderSectionNav();
    }

    function goToSection(id) {
        activeSection = id || 'account';
        refreshNav();
        const el = document.getElementById('st-section-' + id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            el.classList.add('st-section-flash');
            setTimeout(() => el.classList.remove('st-section-flash'), 700);
        }
    }

    function showToast() {
        const toast = document.getElementById('settings-save-toast');
        if (!toast) return;
        toast.classList.remove('show');
        void toast.offsetWidth;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3200);
    }

    function bindToggleRefresh() {
        const form = document.getElementById('user-settings-form');
        if (!form || form.dataset.stBound) return;
        form.dataset.stBound = '1';
        form.addEventListener('change', refreshKpis);
        form.addEventListener('input', function (e) {
            if (e.target && e.target.id === 'set-bio') refreshKpis();
        });
    }

    function bindSectionSpy() {
        const root = document.getElementById('view-settings');
        if (!root || root.dataset.stSpy) return;
        root.dataset.stSpy = '1';

        const blocks = SECTIONS.map((s) => document.getElementById('st-section-' + s.id)).filter(Boolean);
        if (!blocks.length || !('IntersectionObserver' in window)) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const id = entry.target.id.replace('st-section-', '');
                    if (SECTIONS.some((s) => s.id === id)) {
                        activeSection = id;
                        refreshNav();
                    }
                });
            },
            { root: null, rootMargin: '-20% 0px -55% 0px', threshold: 0.12 }
        );

        blocks.forEach((el) => observer.observe(el));
    }

    function scanMotion() {
        if (window.NamvioMotion) NamvioMotion.scanReveal(document.getElementById('view-settings'));
    }

    function init() {
        refreshKpis();
        refreshNav();
        bindToggleRefresh();
        bindSectionSpy();
        if (typeof window.syncInviteCodeUI === 'function') window.syncInviteCodeUI();
        scanMotion();
    }

    window.NamvioSettings = {
        init,
        refreshKpis,
        goToSection,
        showToast,
        SECTIONS
    };
})();