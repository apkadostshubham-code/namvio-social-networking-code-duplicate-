/**
 * Network Sponsor — glassmorphism sponsored placements (feed, sidebar, networking).
 */
(function () {
    const SPONSORS = [
        {
            id: 'grego',
            brand: 'Grego.io',
            productBadge: 'Google Maps Data Scraper',
            headline: 'Grego.io — Google Maps Data Scraper',
            description:
                'Extract deep business details, phone arrays, and maps profile matrix indicators with zero parsing delays. Deploy targeted pipelines automatically.',
            url: 'https://grego.io',
            cta: 'Deploy pipeline',
            theme: 'sponsor-theme-indigo',
            icon: 'fa-solid fa-map-location-dot'
        },
        {
            id: 'segregative',
            brand: 'Segregative.com',
            productBadge: 'Glassmorphism UI SaaS Stack',
            headline: 'Segregative.com',
            tagline: 'We Segregate the Noise. You Get the Leads.',
            description:
                'Stop Scraping. Start Closing. Instant high-intent client filtration node.',
            frameworkBadge: 'B2B Lead Framework',
            url: 'https://segregative.com',
            cta: 'Start closing',
            theme: 'sponsor-theme-violet',
            icon: 'fa-solid fa-filter'
        }
    ];

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function trackUrl(base, placement) {
        try {
            const u = new URL(base);
            u.searchParams.set('utm_source', 'namvio');
            u.searchParams.set('utm_medium', 'sponsored');
            u.searchParams.set('utm_campaign', placement || 'network');
            return u.toString();
        } catch (_) {
            return base;
        }
    }

    function renderSponsorCard(sponsor, opts) {
        const compact = opts && opts.compact;
        const placement = (opts && opts.placement) || 'network';
        const href = trackUrl(sponsor.url, placement + '_' + sponsor.id);

        const taglineHtml = sponsor.tagline
            ? `<p class="nv-sponsor-tagline">${esc(sponsor.tagline)}</p>`
            : '';
        const frameworkHtml = sponsor.frameworkBadge
            ? `<span class="nv-sponsor-framework">${esc(sponsor.frameworkBadge)}</span>`
            : '';

        return `
<article class="nv-sponsor-card ${esc(sponsor.theme)}${compact ? ' nv-sponsor-card--compact' : ''}" data-sponsor-id="${esc(sponsor.id)}">
  <div class="nv-sponsor-glass">
    <div class="nv-sponsor-card-top">
      <span class="nv-sponsor-icon"><i class="${esc(sponsor.icon)}"></i></span>
      <div class="nv-sponsor-brand-wrap">
        <span class="nv-sponsor-product-badge">${esc(sponsor.productBadge)}</span>
        <h6 class="nv-sponsor-headline mb-0">${esc(sponsor.headline)}</h6>
      </div>
    </div>
    ${taglineHtml}
    <p class="nv-sponsor-desc">${esc(sponsor.description)}</p>
    ${frameworkHtml}
    <a href="${esc(href)}" class="btn btn-sm nv-sponsor-cta font-weight-bold" target="_blank" rel="noopener noreferrer sponsored">
      ${esc(sponsor.cta)} <i class="fa-solid fa-arrow-up-right-from-square ml-1"></i>
    </a>
  </div>
</article>`;
    }

    function renderSectionHeader(compact) {
        if (compact) {
            return `
<div class="nv-sponsor-section-head nv-sponsor-section-head--compact">
  <span class="nv-sponsor-section-title">Network Sponsor</span>
  <span class="nv-sponsor-pill">SPONSORED</span>
</div>`;
        }
        return `
<div class="nv-sponsor-section-head">
  <div>
    <p class="nv-sponsor-section-kicker mb-0">Network Sponsor</p>
    <p class="nv-sponsor-section-sub text-muted mb-0">Partner tools for domain investors &amp; outbound teams</p>
  </div>
  <span class="nv-sponsor-pill">SPONSORED</span>
</div>`;
    }

    function renderBlock(opts) {
        const compact = opts && opts.compact;
        const placement = (opts && opts.placement) || 'network';
        const cards = SPONSORS.map((s) => renderSponsorCard(s, { compact, placement })).join('');
        return `
<div class="nv-sponsor-block${compact ? ' nv-sponsor-block--compact' : ''}">
  ${renderSectionHeader(compact)}
  <div class="nv-sponsor-stack">${cards}</div>
</div>`;
    }

    /** Full-width feed placement (between posts) */
    function renderFeedPlacement(index) {
        const sponsor = SPONSORS[index % SPONSORS.length];
        return `
<div class="nv-sponsor-feed-wrap mb-3" data-sponsored-feed="${esc(sponsor.id)}">
  ${renderSectionHeader(false)}
  ${renderSponsorCard(sponsor, { placement: 'feed' })}
</div>`;
    }

    function mountSidebar() {
        const el = document.getElementById('nv-network-sponsors-sidebar');
        if (el) el.innerHTML = renderBlock({ compact: true, placement: 'sidebar' });
    }

    function mountNetworking() {
        const el = document.getElementById('nv-network-sponsors-main');
        if (el) el.innerHTML = renderBlock({ compact: false, placement: 'networking' });
    }

    function mountMarketPulse() {
        const el = document.getElementById('nv-network-sponsors-market-pulse');
        if (el) el.innerHTML = renderBlock({ compact: false, placement: 'market_pulse' });
    }

    function injectFeedSponsors() {
        const container = document.getElementById('feed-pipeline-cards');
        if (!container || container.querySelector('[data-sponsored-feed]')) return;

        const children = Array.from(container.children);
        if (!children.length) {
            container.insertAdjacentHTML('afterbegin', renderFeedPlacement(0));
            return;
        }

        const insertAt = Math.min(2, children.length);
        const node = children[insertAt];
        if (node) {
            node.insertAdjacentHTML('beforebegin', renderFeedPlacement(0));
        } else {
            container.insertAdjacentHTML('beforeend', renderFeedPlacement(0));
        }

        if (children.length > 5) {
            const second = container.children[Math.min(6, container.children.length - 1)];
            if (second && !second.dataset?.sponsoredFeed) {
                second.insertAdjacentHTML('beforebegin', renderFeedPlacement(1));
            }
        }
    }

    function init() {
        mountSidebar();
        mountNetworking();
        mountMarketPulse();
        injectFeedSponsors();
    }

    window.NamvioSponsors = {
        SPONSORS,
        init,
        mountSidebar,
        mountNetworking,
        mountMarketPulse,
        renderBlock,
        renderFeedPlacement,
        injectFeedSponsors
    };
})();