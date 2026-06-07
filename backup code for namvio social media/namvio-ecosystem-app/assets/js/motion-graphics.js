/**
 * Namvio Motion — scroll reveal, feed stagger, route transitions.
 */
(function () {
    const STAGGER_MS = 55;
    const REVEAL_SELECTOR =
        '.card-component, .nv-feed-hero, .nv-sponsor-block, .nv-sponsor-feed-wrap, .network-member-card, .listing-card, .hof-hero, .hof-kpi-card, .hof-podium-slot, .hof-your-rank, .mp-page-hero, .mp-kpi-card, .mp-listing-card, .net-page-hero, .net-kpi-card, .net-member-card, .net-invite-shell, .nv-sidebar-profile, .nv-side-nav-shell, .nv-side-nav-item, .nv-mobile-nav-hero, .profile-hero-card, .lg-page-hero, .lg-kpi-card, .lg-nav-shell, .lg-accordion-shell, .lg-policy-item, .mkt-page-hero, .mkt-kpi-card, .msg-page-hero, .msg-thread-item, .sp-page-hero, .sp-kpi-card, .sp-wall-card, .nv-doc-hero, .nv-guide-section, .nv-rules-section, .nv-help-hub-card';

    let revealObserver = null;
    let reducedMotion = false;

    function prefersReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function initAmbient() {
        if (document.body) document.body.classList.add('nv-motion-on');
    }

    function isInHiddenBranch(el) {
        const routeView = el.closest('.nv-routing-view');
        if (routeView && routeView.classList.contains('d-none')) return true;
        const appLayout = document.getElementById('nv-app-layout');
        if (appLayout && appLayout.classList.contains('d-none')) return true;
        return false;
    }

    function revealNow(el) {
        if (!el) return;
        el.classList.add('nv-reveal', 'nv-revealed');
        if (revealObserver) revealObserver.unobserve(el);
    }

    function revealChromePanels() {
        document.querySelectorAll('#nv-right-sidebar, .nv-left-sidebar').forEach((root) => {
            root.querySelectorAll(REVEAL_SELECTOR + ', .trending-keyword-row, .recent-sale-row').forEach(revealNow);
        });
    }

    function revealActiveView(root) {
        if (!root) return;
        root.querySelectorAll('.nv-reveal:not(.nv-revealed)').forEach(revealNow);
        root.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
            if (!el.classList.contains('nv-revealed')) revealNow(el);
        });
    }

    function setupRevealObserver() {
        if (revealObserver || reducedMotion) return;
        if (typeof IntersectionObserver !== 'function') return;

        revealObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    revealNow(entry.target);
                });
            },
            { root: null, rootMargin: '0px 0px -6% 0px', threshold: 0.08 }
        );
    }

    function scanReveal(root) {
        if (reducedMotion) return;
        setupRevealObserver();
        const scope = root || document;
        if (!scope || typeof scope.querySelectorAll !== 'function') return;
        scope.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
            if (isInHiddenBranch(el)) return;
            if (el.classList.contains('nv-revealed')) return;
            if (!el.classList.contains('nv-reveal')) el.classList.add('nv-reveal');
            if (revealObserver) revealObserver.observe(el);
            else revealNow(el);
        });
    }

    function staggerChildren(container, itemSelector) {
        if (!container || reducedMotion) return;
        const items = container.querySelectorAll(itemSelector || ':scope > *');
        items.forEach((el, i) => {
            el.classList.remove('nv-stagger-item');
            void el.offsetWidth;
            el.classList.add('nv-stagger-item');
            el.style.animationDelay = i * STAGGER_MS + 'ms';
        });
    }

    function staggerFeed() {
        const feed = document.getElementById('feed-pipeline-cards');
        if (!feed) return;
        staggerChildren(feed, ':scope > .card-component, :scope > .nv-sponsor-feed-wrap');
        scanReveal(feed);
    }

    function onRouteChange(viewId) {
        const node = document.getElementById('view-' + viewId);
        if (!node) return;

        revealActiveView(node);

        if (!reducedMotion) {
            node.classList.remove('nv-view-enter');
            void node.offsetWidth;
            node.classList.add('nv-view-enter');
            window.setTimeout(() => scanReveal(node), 40);
        }

        revealChromePanels();

        if (viewId === 'feed') {
            window.setTimeout(staggerFeed, 80);
        }
    }

    function decorateInteractive() {
        document.querySelectorAll('#view-feed .btn-primary').forEach((btn) => {
            if (!btn.classList.contains('nv-btn-shine')) btn.classList.add('nv-btn-shine');
        });
    }

    function init() {
        reducedMotion = prefersReducedMotion();
        initAmbient();
        decorateInteractive();

        const feedView = document.getElementById('view-feed');
        if (feedView) scanReveal(feedView);
        revealChromePanels();

        const feed = document.getElementById('feed-pipeline-cards');
        if (feed && feed.children.length) {
            staggerFeed();
        }

        if (window.matchMedia) {
            window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
                reducedMotion = e.matches;
                if (reducedMotion) {
                    document.querySelectorAll('.nv-reveal').forEach((el) => {
                        el.classList.add('nv-revealed');
                    });
                }
            });
        }
    }

    window.NamvioMotion = {
        init,
        scanReveal,
        staggerFeed,
        onRouteChange,
        staggerChildren,
        revealNow,
        revealChromePanels,
        revealActiveView
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else if (document.body) {
        init();
    }
})();