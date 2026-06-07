/**
 * Namvio Hall of Fame — organized leaderboard, podium, filters & user rank.
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

    const HOF_MEMBERS = [
        {
            rank: 1,
            id: 'rahul',
            name: 'Rahul Sharma',
            handle: '@rahul_domains',
            role: 'broker',
            score: 14920,
            deals: 284,
            volume: '$4.8M',
            specialty: 'Fintech & .io flips',
            trend: 420,
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=160'
        },
        {
            rank: 2,
            id: 'alex',
            name: 'Alex Mercer',
            handle: '@alex_elite',
            role: 'elite',
            score: 9850,
            deals: 196,
            volume: '$3.1M',
            specialty: 'Premium .com holds',
            trend: 310,
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=160'
        },
        {
            rank: 3,
            id: 'maya',
            name: 'Maya Chen',
            handle: '@mayac_portfolio',
            role: 'investor',
            score: 8720,
            deals: 168,
            volume: '$2.2M',
            specialty: 'AI & voice keywords',
            trend: 285,
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=160'
        },
        {
            rank: 4,
            id: 'james',
            name: 'James Okonkwo',
            handle: '@jok_registrar',
            role: 'registrar',
            score: 8100,
            deals: 142,
            volume: '$1.9M',
            specialty: 'Registry promos & bulk',
            trend: 198,
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=160'
        },
        {
            rank: 5,
            id: 'sofia',
            name: 'Sofia Petrov',
            handle: '@sofia_domains',
            role: 'investor',
            score: 7650,
            deals: 131,
            volume: '$1.6M',
            specialty: 'EU brandables',
            trend: 176,
            avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=160'
        },
        {
            rank: 6,
            id: 'vikram',
            name: 'Vikram Patel',
            handle: '@vikram_portfolio',
            role: 'investor',
            score: 6920,
            deals: 118,
            volume: '$1.4M',
            specialty: 'SaaS keyword domains',
            trend: 154,
            avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=160'
        },
        {
            rank: 7,
            id: 'nina',
            name: 'Nina Kowalski',
            handle: '@nina_broker',
            role: 'broker',
            score: 6480,
            deals: 109,
            volume: '$1.2M',
            specialty: 'Outbound & escrow closes',
            trend: 132,
            avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=160'
        },
        {
            rank: 8,
            id: 'david',
            name: 'David Liu',
            handle: '@david_domains',
            role: 'elite',
            score: 6010,
            deals: 97,
            volume: '$980k',
            specialty: 'Short .com inventory',
            trend: 118,
            avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=160'
        },
        {
            rank: 9,
            id: 'emma',
            name: 'Emma Walsh',
            handle: '@emma_invest',
            role: 'investor',
            score: 5580,
            deals: 88,
            volume: '$840k',
            specialty: 'Health & wellness TLDs',
            trend: 96,
            avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=160'
        },
        {
            rank: 10,
            id: 'carlos',
            name: 'Carlos Mendez',
            handle: '@carlos_reg',
            role: 'registrar',
            score: 5120,
            deals: 81,
            volume: '$720k',
            specialty: 'LATAM brand protection',
            trend: 84,
            avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=160'
        }
    ];

    const FILTERS = [
        { id: 'all', label: 'All members' },
        { id: 'investor', label: 'Investors' },
        { id: 'broker', label: 'Brokers' },
        { id: 'elite', label: 'Founders' },
        { id: 'registrar', label: 'Registrars' }
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

    function getTier(score) {
        if (window.NamvioReputation && NamvioReputation.getTier) {
            return NamvioReputation.getTier(score);
        }
        return { name: '—', slug: 'new' };
    }

    function getFilteredMembers() {
        const q = searchQuery.toLowerCase().trim();
        return HOF_MEMBERS.filter((m) => {
            if (activeFilter !== 'all' && m.role !== activeFilter) return false;
            if (!q) return true;
            return (
                m.name.toLowerCase().includes(q) ||
                m.handle.toLowerCase().includes(q) ||
                m.specialty.toLowerCase().includes(q)
            );
        });
    }

    function computeUserRank(session) {
        const score = Number(session?.reputationScore) || 0;
        const above = HOF_MEMBERS.filter((m) => m.score > score).length;
        const rank = above + 1;
        const onBoard = HOF_MEMBERS.some((m) => m.score === score);
        const gap = rank <= HOF_MEMBERS.length ? HOF_MEMBERS[rank - 1]?.score - score : 0;
        return { score, rank, onBoard, gap: Math.max(0, gap), total: HOF_MEMBERS.length };
    }

    function renderKpis() {
        const totalDeals = HOF_MEMBERS.reduce((s, m) => s + m.deals, 0);
        const topScore = HOF_MEMBERS[0]?.score || 0;
        return `
<div class="col-6 col-md-3 mb-3 mb-md-0">
  <div class="hof-kpi-card">
    <span class="hof-kpi-value">${HOF_MEMBERS.length}</span>
    <span class="hof-kpi-label">Elite members</span>
  </div>
</div>
<div class="col-6 col-md-3 mb-3 mb-md-0">
  <div class="hof-kpi-card">
    <span class="hof-kpi-value">${totalDeals.toLocaleString()}</span>
    <span class="hof-kpi-label">Verified deals</span>
  </div>
</div>
<div class="col-6 col-md-3 mb-3 mb-md-0">
  <div class="hof-kpi-card">
    <span class="hof-kpi-value">${topScore.toLocaleString()}</span>
    <span class="hof-kpi-label">Top reputation</span>
  </div>
</div>
<div class="col-6 col-md-3">
  <div class="hof-kpi-card">
    <span class="hof-kpi-value">$18M+</span>
    <span class="hof-kpi-label">Reported volume</span>
  </div>
</div>`;
    }

    function renderPodiumSlot(member, place) {
        if (!member) {
            return `<div class="hof-podium-slot hof-podium-slot--empty hof-podium-slot--${place}"></div>`;
        }
        const tier = getTier(member.score);
        const medal =
            place === 1 ? 'fa-crown' : place === 2 ? 'fa-medal' : 'fa-award';
        const medalClass =
            place === 1 ? 'gold' : place === 2 ? 'silver' : 'bronze';
        return `
<div class="hof-podium-slot hof-podium-slot--${place}">
  <div class="hof-podium-medal hof-podium-medal--${medalClass}">
    <i class="fa-solid ${medal}"></i>
    <span>#${member.rank}</span>
  </div>
  <div class="hof-podium-avatar">
    <img src="${esc(member.avatar)}" alt="" loading="lazy" decoding="async" width="72" height="72">
  </div>
  <p class="hof-podium-name">${esc(member.name)}</p>
  <p class="hof-podium-handle">${esc(member.handle)}</p>
  <span class="identity-badge ${ROLE_CLASS[member.role] || 'badge-investor'}">${esc(ROLE_LABEL[member.role] || 'Member')}</span>
  <p class="hof-podium-score">${member.score.toLocaleString()} <span>rep</span></p>
  <span class="rep-tier-pill rep-tier-${esc(tier.slug)}">${esc(tier.name)}</span>
</div>`;
    }

    function renderPodium() {
        const top = HOF_MEMBERS.slice(0, 3);
        return `
<div class="hof-podium-inner">
  ${renderPodiumSlot(top[1], 2)}
  ${renderPodiumSlot(top[0], 1)}
  ${renderPodiumSlot(top[2], 3)}
</div>`;
    }

    function renderYourRank(session) {
        const u = computeUserRank(session);
        const tier = getTier(u.score);
        const gapText =
            u.rank <= u.total
                ? `${u.gap.toLocaleString()} rep to reach #${u.rank}`
                : 'Keep building reputation to enter the board';

        return `
<div class="hof-your-rank">
  <div class="hof-your-rank-main">
    <div class="hof-your-rank-avatar profile-thumb rounded-circle overflow-hidden">
      <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120" alt="">
    </div>
    <div>
      <p class="hof-your-rank-kicker mb-0">Your standing</p>
      <p class="hof-your-rank-title mb-0">${esc(session?.displayName || 'You')} · ${u.score.toLocaleString()} rep</p>
      <p class="hof-your-rank-meta mb-0">
        <span class="rep-tier-pill rep-tier-${esc(tier.slug)}">${esc(tier.name)}</span>
        <span class="text-muted ml-2">Est. rank <strong>#${u.rank}</strong> · ${esc(gapText)}</span>
      </p>
    </div>
  </div>
  <button type="button" class="btn btn-sm btn-outline-primary font-weight-bold" onclick="routeView('identity', this); return false;">View profile</button>
</div>`;
    }

    function renderLeaderRow(m, displayRank) {
        const tier = getTier(m.score);
        const roleClass = ROLE_CLASS[m.role] || 'badge-investor';
        const roleLabel = ROLE_LABEL[m.role] || 'Member';
        const topClass = m.rank <= 3 ? ' hof-leader-row--top' : '';

        return `
<tr class="hof-leader-row${topClass}" data-hof-id="${esc(m.id)}">
  <td class="hof-col-rank">
    <span class="hof-rank-badge${m.rank <= 3 ? ' hof-rank-badge--top' : ''}">#${String(displayRank).padStart(2, '0')}</span>
  </td>
  <td class="hof-col-member">
    <div class="hof-member-cell">
      <div class="hof-member-avatar profile-thumb rounded-circle overflow-hidden">
        <img src="${esc(m.avatar)}" alt="" loading="lazy" decoding="async" width="40" height="40">
      </div>
      <div>
        <span class="hof-member-name">${esc(m.name)}</span>
        <span class="hof-member-handle d-block">${esc(m.handle)}</span>
        <span class="hof-member-specialty d-none d-md-block">${esc(m.specialty)}</span>
      </div>
    </div>
  </td>
  <td class="hof-col-role d-none d-sm-table-cell">
    <span class="identity-badge ${roleClass}">${esc(roleLabel)}</span>
  </td>
  <td class="hof-col-tier d-none d-md-table-cell">
    <span class="rep-tier-pill rep-tier-${esc(tier.slug)}">${esc(tier.name)}</span>
  </td>
  <td class="hof-col-deals d-none d-lg-table-cell text-center">${m.deals}</td>
  <td class="hof-col-volume d-none d-xl-table-cell">${esc(m.volume)}</td>
  <td class="hof-col-rep text-right">
    <span class="hof-rep-value">${m.score.toLocaleString()}</span>
    <span class="hof-rep-trend text-success d-block">+${m.trend} <span class="text-muted">30d</span></span>
    ${window.NamvioReputation ? NamvioReputation.renderCompact(m.score) : ''}
  </td>
</tr>`;
    }

    function renderLeaderboard() {
        const rows = getFilteredMembers();
        if (!rows.length) {
            return '<p class="text-muted small text-center py-4 mb-0">No members match your filter.</p>';
        }
        return `
<div class="table-responsive hof-table-wrap">
  <table class="table table-borderless align-middle mb-0 hof-table">
    <thead>
      <tr class="hof-table-head">
        <th>Rank</th>
        <th>Member</th>
        <th class="d-none d-sm-table-cell">Role</th>
        <th class="d-none d-md-table-cell">Tier</th>
        <th class="d-none d-lg-table-cell text-center">Deals</th>
        <th class="d-none d-xl-table-cell">Volume</th>
        <th class="text-right">Reputation</th>
      </tr>
    </thead>
    <tbody id="hof-table-body">
      ${rows.map((m, i) => renderLeaderRow(m, m.rank)).join('')}
    </tbody>
  </table>
</div>
<p class="hof-table-foot text-muted mb-0">Showing ${rows.length} of ${HOF_MEMBERS.length} Hall of Fame members</p>`;
    }

    function renderFilters() {
        return FILTERS.map((f) => {
            const active = activeFilter === f.id ? ' active' : '';
            return `<button type="button" class="hof-filter-btn${active}" data-hof-filter="${esc(f.id)}" onclick="NamvioHof.setFilter('${esc(f.id)}'); return false;">${esc(f.label)}</button>`;
        }).join('');
    }

    function bindToolbar() {
        const search = document.getElementById('hof-search');
        if (search && !search.dataset.bound) {
            search.dataset.bound = '1';
            search.addEventListener('input', function () {
                searchQuery = this.value;
                refreshBoard();
            });
        }
    }

    function refreshBoard() {
        const board = document.getElementById('hof-leaderboard');
        if (board) board.innerHTML = renderLeaderboard();
        const filters = document.getElementById('hof-filters');
        if (filters) filters.innerHTML = renderFilters();
        if (window.NamvioMotion) NamvioMotion.scanReveal(document.getElementById('view-hof'));
    }

    function setFilter(id) {
        activeFilter = id || 'all';
        refreshBoard();
    }

    function init(session) {
        const kpi = document.getElementById('hof-kpi-row');
        const podium = document.getElementById('hof-podium');
        const yourRank = document.getElementById('hof-your-rank');
        const filters = document.getElementById('hof-filters');
        const board = document.getElementById('hof-leaderboard');

        if (kpi) kpi.innerHTML = renderKpis();
        if (podium) podium.innerHTML = renderPodium();
        if (yourRank) yourRank.innerHTML = renderYourRank(session || window.activeSessionState || {});
        if (filters) filters.innerHTML = renderFilters();
        if (board) board.innerHTML = renderLeaderboard();

        bindToolbar();
        if (window.NamvioMotion) NamvioMotion.scanReveal(document.getElementById('view-hof'));
    }

    window.NamvioHof = {
        HOF_MEMBERS,
        init,
        setFilter,
        refreshBoard,
        getFilteredMembers
    };
})();