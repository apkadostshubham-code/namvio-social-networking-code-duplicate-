/**
 * Namvio Listings — marketplace grid, filters, KPIs & motion.
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

    const LISTINGS = [
        {
            id: 'payflow-com',
            domain: 'PayFlow',
            tld: '.com',
            price: 48000,
            priceLabel: '$48,000',
            category: 'brandable',
            tldGroup: 'com',
            sellerRole: 'broker',
            seller: 'Rahul Sharma',
            verified: true,
            escrow: true,
            age: '12y',
            meta: 'Brandable fintech · Clean WHOIS · Strong BIN interest',
            views: 142,
            offers: 3,
            featured: true,
            cta: 'Make offer'
        },
        {
            id: 'metalearn-ai',
            domain: 'MetaLearn',
            tld: '.ai',
            price: 12500,
            priceLabel: '$12,500',
            category: 'keyword',
            tldGroup: 'ai',
            sellerRole: 'investor',
            seller: 'Maya Chen',
            verified: true,
            escrow: true,
            age: '3y',
            meta: 'AI edtech keyword · High CPC niche · Appraisal attached',
            views: 89,
            offers: 2,
            featured: true,
            cta: 'Make offer'
        },
        {
            id: 'quickship-co',
            domain: 'QuickShip',
            tld: '.co',
            price: 3200,
            priceLabel: '$3,200',
            category: 'startup',
            tldGroup: 'co',
            sellerRole: 'elite',
            seller: 'Alex Mercer',
            verified: true,
            escrow: true,
            age: '6y',
            meta: 'Logistics startup match · BIN only · Fast transfer',
            views: 56,
            offers: 1,
            featured: false,
            cta: 'Buy now'
        },
        {
            id: 'neuralstack-io',
            domain: 'NeuralStack',
            tld: '.io',
            price: 8900,
            priceLabel: '$8,900',
            category: 'tech',
            tldGroup: 'io',
            sellerRole: 'investor',
            seller: 'Vikram Patel',
            verified: true,
            escrow: true,
            age: '5y',
            meta: 'Dev-tools brand · .io liquidity · 4 inbound leads',
            views: 71,
            offers: 2,
            featured: false,
            cta: 'Make offer'
        },
        {
            id: 'vaultpay-com',
            domain: 'VaultPay',
            tld: '.com',
            price: 22000,
            priceLabel: '$22,000',
            category: 'fintech',
            tldGroup: 'com',
            sellerRole: 'broker',
            seller: 'Nina Kowalski',
            verified: true,
            escrow: true,
            age: '9y',
            meta: 'Payments keyword · Escrow-preferred · EU buyer interest',
            views: 103,
            offers: 4,
            featured: true,
            cta: 'Make offer'
        },
        {
            id: 'greengrid-ai',
            domain: 'GreenGrid',
            tld: '.ai',
            price: 6500,
            priceLabel: '$6,500',
            category: 'climate',
            tldGroup: 'ai',
            sellerRole: 'investor',
            seller: 'Sofia Petrov',
            verified: false,
            escrow: true,
            age: '2y',
            meta: 'Climate-tech keyword · Growing .ai comps · Motivated seller',
            views: 38,
            offers: 0,
            featured: false,
            cta: 'Make offer'
        }
    ];

    const FILTERS = [
        { id: 'all', label: 'All listings', icon: 'fa-table-cells' },
        { id: 'com', label: '.com', icon: 'fa-globe' },
        { id: 'ai', label: '.ai', icon: 'fa-microchip' },
        { id: 'io', label: '.io', icon: 'fa-code' },
        { id: 'co', label: '.co', icon: 'fa-building' },
        { id: 'under10k', label: 'Under $10k', icon: 'fa-tags' },
        { id: 'escrow', label: 'Escrow ready', icon: 'fa-shield-halved' }
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

    function formatPrice(n) {
        return '$' + Number(n).toLocaleString();
    }

    function getFiltered() {
        const q = searchQuery.toLowerCase().trim();
        return LISTINGS.filter((l) => {
            if (activeFilter === 'under10k' && l.price >= 10000) return false;
            if (activeFilter === 'escrow' && !l.escrow) return false;
            if (['com', 'ai', 'io', 'co'].includes(activeFilter) && l.tldGroup !== activeFilter) return false;
            if (!q) return true;
            return (
                (l.domain + l.tld).toLowerCase().includes(q) ||
                l.meta.toLowerCase().includes(q) ||
                l.seller.toLowerCase().includes(q)
            );
        });
    }

    function renderKpis() {
        const total = LISTINGS.length;
        const vol = LISTINGS.reduce((s, l) => s + l.price, 0);
        const escrow = LISTINGS.filter((l) => l.escrow).length;
        const offers = LISTINGS.reduce((s, l) => s + l.offers, 0);
        return `
<div class="col-6 col-md-3 mb-3 mb-md-0">
  <div class="mp-kpi-card"><span class="mp-kpi-value">${total}</span><span class="mp-kpi-label">Live listings</span></div>
</div>
<div class="col-6 col-md-3 mb-3 mb-md-0">
  <div class="mp-kpi-card"><span class="mp-kpi-value">${formatPrice(vol)}</span><span class="mp-kpi-label">Total ask volume</span></div>
</div>
<div class="col-6 col-md-3 mb-3 mb-md-0">
  <div class="mp-kpi-card"><span class="mp-kpi-value">${escrow}</span><span class="mp-kpi-label">Escrow ready</span></div>
</div>
<div class="col-6 col-md-3">
  <div class="mp-kpi-card"><span class="mp-kpi-value">${offers}</span><span class="mp-kpi-label">Open offers</span></div>
</div>`;
    }

    function renderFilters() {
        return FILTERS.map((f) => {
            const on = activeFilter === f.id ? ' active' : '';
            return `<button type="button" class="mp-filter-btn${on}" onclick="NamvioListings.setFilter('${esc(f.id)}'); return false;"><i class="fa-solid ${esc(f.icon)}"></i>${esc(f.label)}</button>`;
        }).join('');
    }

    function renderCard(l, i) {
        const roleClass = ROLE_CLASS[l.sellerRole] || 'badge-investor';
        const fullDomain = l.domain + l.tld;
        return `
<article class="mp-listing-card${l.featured ? ' mp-listing-card--featured' : ''}" data-listing-id="${esc(l.id)}" style="animation-delay:${i * 60}ms">
  <div class="mp-listing-glow" aria-hidden="true"></div>
  <div class="mp-listing-top">
    <div>
      ${l.featured ? '<span class="mp-featured-badge"><i class="fa-solid fa-star"></i> Featured</span>' : ''}
      <span class="domain-chip mp-domain-chip">${esc(l.domain)}<span class="tld">${esc(l.tld)}</span></span>
      <p class="mp-listing-meta">${esc(l.meta)}</p>
    </div>
    <div class="mp-price-block">
      <span class="mp-listing-price">${esc(l.priceLabel)}</span>
      <span class="mp-listing-age">${esc(l.age)} hold</span>
    </div>
  </div>
  <div class="mp-listing-stats">
    <span><i class="fa-regular fa-eye"></i> ${l.views} views</span>
    <span><i class="fa-solid fa-hand-holding-dollar"></i> ${l.offers} offers</span>
    ${l.escrow ? '<span class="mp-escrow-tag"><i class="fa-solid fa-shield-halved"></i> Escrow</span>' : ''}
  </div>
  <div class="mp-listing-seller">
    <span class="identity-badge ${roleClass}">${esc(ROLE_LABEL[l.sellerRole] || 'Member')}</span>
    <span class="mp-seller-name">${esc(l.seller)}</span>
    ${l.verified ? '<i class="fa-solid fa-circle-check text-success mp-verified-icon" title="Verified seller"></i>' : ''}
  </div>
  <div class="mp-listing-actions">
    <button type="button" class="btn btn-sm btn-primary mp-cta-btn" onclick="NamvioListings.makeOffer('${esc(l.id)}'); return false;">${esc(l.cta)}</button>
    <button type="button" class="btn btn-sm btn-light border" onclick="NamvioShare.openListing('${esc(fullDomain)}', '${esc(l.priceLabel)}', '${esc(l.id)}'); return false;"><i class="fa-solid fa-share-nodes mr-1"></i> Share</button>

  </div>
</article>`;
    }

    function renderGrid() {
        const rows = getFiltered();
        if (!rows.length) {
            return '<div class="mp-empty"><i class="fa-regular fa-folder-open"></i><p>No listings match your filters.</p></div>';
        }
        return `<div class="mp-listing-grid">${rows.map((l, i) => renderCard(l, i)).join('')}</div>
<p class="mp-grid-foot text-muted mb-0">Showing ${rows.length} of ${LISTINGS.length} premium names</p>`;
    }

    function bindSearch() {
        const input = document.getElementById('mp-search-input');
        if (!input || input.dataset.bound) return;
        input.dataset.bound = '1';
        input.addEventListener('input', function () {
            searchQuery = this.value;
            refresh();
        });
    }

    function refresh() {
        const kpi = document.getElementById('mp-kpi-row');
        const filters = document.getElementById('mp-filters');
        const grid = document.getElementById('mp-listings-grid');
        if (kpi) kpi.innerHTML = renderKpis();
        if (filters) filters.innerHTML = renderFilters();
        if (grid) grid.innerHTML = renderGrid();
        if (window.NamvioMotion) NamvioMotion.scanReveal(document.getElementById('view-marketplace'));
    }

    function setFilter(id) {
        activeFilter = id || 'all';
        refresh();
    }

    function makeOffer(id) {
        const l = LISTINGS.find((x) => x.id === id);
        if (!l) return;
        alert(
            'Offer flow (demo): connect with ' +
                l.seller +
                ' for ' +
                l.domain +
                l.tld +
                ' at ' +
                l.priceLabel +
                ' via Namvio escrow.'
        );
    }

    function init() {
        bindSearch();
        refresh();
    }

    window.NamvioListings = {
        LISTINGS,
        init,
        refresh,
        setFilter,
        makeOffer
    };
})();