/**
 * Namvio Networking — organized member grid, filters, KPIs & motion.
 */
(function () {
    const ROLE_CLASS = {
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

    const MEMBER_META = {
        rahul: { online: true, verified: true, escrow: true },
        maya: { online: true, verified: true, escrow: true },
        james: { online: false, verified: true, escrow: false },
        alex: { online: true, verified: true, escrow: true },
        sofia: { online: false, verified: false, escrow: true }
    };

    const FILTERS = [
        { id: 'all', label: 'All members', icon: 'fa-users' },
        { id: 'broker', label: 'Brokers', icon: 'fa-handshake' },
        { id: 'investor', label: 'Investors', icon: 'fa-chart-line' },
        { id: 'registrar', label: 'Registrars', icon: 'fa-server' },
        { id: 'elite', label: 'Founders', icon: 'fa-gem' },
        { id: 'top', label: 'Top rep', icon: 'fa-star' }
    ];

    let activeFilter = 'all';
    let searchQuery = '';

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getMembers() {
        return window.NETWORKING_MEMBERS || [];
    }

    function getNetworkingStats() {
        const session = window.activeSessionState || {};
        return session.networking || { connections: 128, pending: 6 };
    }

    function getFiltered() {
        const q = searchQuery.toLowerCase().trim();
        return getMembers().filter((m) => {
            if (activeFilter === 'top' && (m.rep || 0) < 8000) return false;
            if (['broker', 'investor', 'registrar', 'elite'].includes(activeFilter) && m.role !== activeFilter) {
                return false;
            }
            if (!q) return true;
            return (
                m.name.toLowerCase().includes(q) ||
                m.handle.toLowerCase().includes(q) ||
                m.niche.toLowerCase().includes(q)
            );
        });
    }

    function renderKpis() {
        const members = getMembers();
        const net = getNetworkingStats();
        const online = members.filter((m) => MEMBER_META[m.id]?.online).length;
        const avgMutual = members.length
            ? Math.round(members.reduce((s, m) => s + (m.mutual || 0), 0) / members.length)
            : 0;

        return `
<div class="col-6 col-md-3 mb-3 mb-md-0">
  <div class="net-kpi-card"><span class="net-kpi-value" id="net-stat-connections">${net.connections || 128}</span><span class="net-kpi-label">Connections</span></div>
</div>
<div class="col-6 col-md-3 mb-3 mb-md-0">
  <div class="net-kpi-card"><span class="net-kpi-value" id="net-stat-pending">${net.pending || 6}</span><span class="net-kpi-label">Pending invites</span></div>
</div>
<div class="col-6 col-md-3 mb-3 mb-md-0">
  <div class="net-kpi-card"><span class="net-kpi-value">${members.length}</span><span class="net-kpi-label">Suggested</span></div>
</div>
<div class="col-6 col-md-3">
  <div class="net-kpi-card net-kpi-card--live"><span class="net-kpi-value">${online}</span><span class="net-kpi-label">Online now</span></div>
</div>
<p class="net-kpi-foot text-muted mb-0 col-12">Avg ${avgMutual} mutual connections in your circle (demo)</p>`;
    }

    function renderFilters() {
        return FILTERS.map((f) => {
            const on = activeFilter === f.id ? ' active' : '';
            return `<button type="button" class="net-filter-btn${on}" onclick="NamvioNetworking.setFilter('${esc(f.id)}'); return false;"><i class="fa-solid ${esc(f.icon)}"></i>${esc(f.label)}</button>`;
        }).join('');
    }

    function renderMemberCard(m, i) {
        const roleClass = ROLE_CLASS[m.role] || 'badge-investor';
        const roleLabel = ROLE_LABEL[m.role] || 'Member';
        const meta = MEMBER_META[m.id] || {};
        const repHtml = window.NamvioReputation
            ? NamvioReputation.renderUserCard(m.rep)
            : `<span class="net-rep-pill">Rep ${Number(m.rep || 0).toLocaleString()}</span>`;

        return `
<article class="net-member-card${m.mutual >= 10 ? ' net-member-card--hot' : ''}" data-member-id="${esc(m.id)}" style="animation-delay:${i * 55}ms">
  <div class="net-member-glow" aria-hidden="true"></div>
  <div class="net-member-top">
    <div class="net-member-avatar-wrap">
      <div class="profile-thumb rounded-circle overflow-hidden net-member-avatar">
        <img src="${esc(m.avatar)}" alt="" loading="lazy" decoding="async" width="52" height="52">
      </div>
      ${meta.online ? '<span class="net-online-ring" title="Online"></span>' : ''}
    </div>
    <div class="flex-grow-1 min-width-0">
      <div class="d-flex align-items-center flex-wrap mb-1">
        <span class="net-member-name">${esc(m.name)}</span>
        ${meta.verified ? '<i class="fa-solid fa-circle-check text-success net-verified-icon" title="Verified"></i>' : ''}
      </div>
      <p class="net-member-handle mb-1">${esc(m.handle)}</p>
      <span class="identity-badge ${roleClass}">${esc(roleLabel)}</span>
    </div>
    ${m.mutual >= 10 ? '<span class="net-hot-badge"><i class="fa-solid fa-fire"></i> Hot</span>' : ''}
  </div>
  <div class="net-member-mid">
    ${repHtml}
    <p class="net-member-niche mb-0"><i class="fa-solid fa-bullseye mr-1"></i>${esc(m.niche)}</p>
  </div>
  <div class="net-member-tags">
    <span class="net-tag"><i class="fa-solid fa-user-group"></i> ${m.mutual} mutual</span>
    ${meta.escrow ? '<span class="net-tag net-tag--escrow"><i class="fa-solid fa-shield-halved"></i> Escrow</span>' : ''}
  </div>
  <div class="net-member-actions">
    <button type="button" class="btn btn-sm btn-primary net-connect-btn" onclick="connectNetworkingMember(this, '${esc(m.id)}')">
      <i class="fa-solid fa-user-plus mr-1"></i> Connect
    </button>
    <button type="button" class="btn btn-sm btn-outline-primary net-mesage-btn" onclick="startMesageWith('${esc(m.id)}', this); return false;">
      <i class="fa-solid fa-envelope mr-1"></i> Message
    </button>
    <button type="button" class="btn btn-sm btn-light border" onclick="NamvioShare.openProfile({ handle: '${esc(m.handle)}', displayName: '${esc(m.name)}', text: 'Connect with ${esc(m.name)} on Namvio Social — domain investor & ${esc(roleLabel)}.' }); return false;">
      <i class="fa-solid fa-share-nodes"></i>
    </button>
  </div>
</article>`;
    }

    function renderGrid() {
        const rows = getFiltered();
        if (!rows.length) {
            return '<div class="net-empty"><i class="fa-regular fa-user"></i><p>No members match your filters.</p></div>';
        }
        return `<div class="net-member-grid">${rows.map((m, i) => renderMemberCard(m, i)).join('')}</div>
<p class="net-grid-foot text-muted mb-0">Showing ${rows.length} of ${getMembers().length} suggested connections</p>`;
    }

    function bindSearch() {
        const input = document.getElementById('networking-search');
        if (!input || input.dataset.bound) return;
        input.dataset.bound = '1';
        input.addEventListener('input', function () {
            searchQuery = this.value;
            refresh();
        });
    }

    function refresh() {
        const kpi = document.getElementById('net-kpi-row');
        const filters = document.getElementById('net-filters');
        const grid = document.getElementById('networking-members-grid');
        if (kpi) kpi.innerHTML = renderKpis();
        if (filters) filters.innerHTML = renderFilters();
        if (grid) grid.innerHTML = renderGrid();
        if (window.NamvioMotion) window.NamvioMotion.scanReveal(document.getElementById('view-networking'));
    }

    function syncStats(net) {
        const stats = net || getNetworkingStats();
        const connEl = document.getElementById('net-stat-connections');
        const pendEl = document.getElementById('net-stat-pending');
        if (connEl) connEl.textContent = String(stats.connections || 128);
        if (pendEl) pendEl.textContent = String(stats.pending || 6);
    }

    function setFilter(id) {
        activeFilter = id || 'all';
        refresh();
    }

    function filter(query) {
        searchQuery = query || '';
        const input = document.getElementById('networking-search');
        if (input && input.value !== searchQuery) input.value = searchQuery;
        refresh();
    }

    function init() {
        if (typeof window.syncInviteCodeUI === 'function') window.syncInviteCodeUI();
        if (window.NamvioSponsors && typeof window.NamvioSponsors.mountNetworking === 'function') {
            window.NamvioSponsors.mountNetworking();
        }
        bindSearch();
        refresh();
    }

    window.NamvioNetworking = {
        init,
        refresh,
        setFilter,
        filter,
        syncStats
    };
})();