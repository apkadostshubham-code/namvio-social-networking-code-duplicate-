/**
 * Namvio Nav — unified sidebar, header, mobile & bottom navigation.
 */
(function () {
    const PRIMARY = [
        { id: 'feed', label: 'Home', icon: 'fa-house' },
        { id: 'marketplace', label: 'Listings', icon: 'fa-store' },
        { id: 'market-pulse', label: 'Market Pulse', icon: 'fa-chart-line' },
        { id: 'hof', label: 'Hall of Fame', icon: 'fa-crown', short: 'HoF' },
        { id: 'networking', label: 'Networking', icon: 'fa-handshake' },
        { id: 'mesages', label: 'Messages', icon: 'fa-envelope', badgeId: 'sidebar-mesages-badge' },
        { id: 'subscription', label: 'Plans', icon: 'fa-credit-card' }
    ];

    const SIDEBAR_SECTIONS = [
        {
            label: 'Menu',
            items: PRIMARY
        },
        {
            label: 'More',
            items: [{ id: 'blogs', label: 'Blogs', icon: 'fa-blog' }, { id: 'admin', label: 'Moderation', icon: 'fa-shield-halved', adminOnly: true }]
        },
        {
            label: 'Account',
            items: [
                { id: 'identity', label: 'Profile', icon: 'fa-id-card' },
                { id: 'settings', label: 'Settings', icon: 'fa-gear' }
            ]
        },
        {
            label: 'Support',
            items: [
                { id: 'support', label: 'Support Namvio', icon: 'fa-hand-holding-heart' },
                { id: 'guide', label: 'How To Use', icon: 'fa-book-open' },
                { id: 'rules', label: 'Community Rules', icon: 'fa-scale-balanced' },
                { id: 'help', label: 'Help Center', icon: 'fa-life-ring' }
            ]
        },
        {
            label: 'Legal',
            items: [{ id: 'legal', label: 'Legal Center', icon: 'fa-balance-scale' }]
        }
    ];

    const MOBILE_EXTRA = [
        { id: 'blogs', label: 'Blogs', icon: 'fa-blog' },
        { id: 'identity', label: 'Profile', icon: 'fa-id-card' },
        { id: 'settings', label: 'Settings', icon: 'fa-gear' },
        { id: 'support', label: 'Support Namvio', icon: 'fa-hand-holding-heart' },
        { id: 'guide', label: 'How To Use', icon: 'fa-book-open' },
        { id: 'rules', label: 'Community Rules', icon: 'fa-scale-balanced' },
        { id: 'help', label: 'Help Center', icon: 'fa-life-ring' },
        { id: 'legal', label: 'Legal Center', icon: 'fa-balance-scale' },
        { id: 'admin', label: 'Moderation', icon: 'fa-shield-halved', adminOnly: true }
    ];

    const BOTTOM = [
        { id: 'feed', label: 'Home', icon: 'fa-house' },
        { id: 'mesages', label: 'Messages', icon: 'fa-envelope' },
        { id: 'marketplace', label: 'Listings', icon: 'fa-store' },
        { id: 'hof', label: 'Hall of Fame', icon: 'fa-crown', short: 'HoF' },
        { id: 'subscription', label: 'Plans', icon: 'fa-credit-card' }
    ];

    let activeView = 'feed';
    let resizeTimer = null;

    function nextFrame(fn) {
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(fn);
        else setTimeout(fn, 0);
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function routeOnclick(id, closeMobile) {
        const extra = closeMobile ? '; closeMobileNav()' : '';
        return `routeView('${esc(id)}', this)${extra}; return false;`;
    }

    function badgeHtml(item) {
        if (!item.badgeId) return '';
        return `<span class="badge badge-primary badge-pill ml-auto d-none" id="${esc(item.badgeId)}">0</span>`;
    }

    function renderHeaderItem(item, i) {
        return `
<li data-nav="${esc(item.id)}" class="nv-nav-enter" style="animation-delay:${i * 40}ms">
  <a href="#" onclick="${routeOnclick(item.id, false)}">
    <span class="nv-nav-icon-box"><i class="fa-solid ${esc(item.icon)}"></i></span>
    <span>${esc(item.label)}</span>
  </a>
</li>`;
    }

    function renderSidebarItem(item) {
        const adminAttr = item.adminOnly ? ' data-admin-only' : '';
        const adminClass = item.adminOnly ? ' class="d-none"' : '';
        return `
<li id="sidemenu-${esc(item.id)}"${adminAttr}${adminClass}>
  <a href="#" onclick="${routeOnclick(item.id, false)}">
    <i class="fa-solid ${esc(item.icon)}"></i><span>${esc(item.label)}</span>
    ${badgeHtml(item)}
  </a>
</li>`;
    }

    function renderSidebarSection(section, isFirst) {
        const items = section.items.map((item) => renderSidebarItem(item)).join('');
        const labelClass = isFirst ? 'nv-side-nav-label' : 'nv-side-nav-label mt-3';
        return `
  <p class="${labelClass}">${esc(section.label)}</p>
  <ul class="nav flex-column side-menu-list">${items}</ul>`;
    }

    function renderMobileItem(item, closeMobile, i) {
        const admin = item.adminOnly ? ' d-none' : '';
        const adminAttr = item.adminOnly ? ' data-admin-only' : '';
        return `
<li data-nav="${esc(item.id)}" class="nv-mobile-nav-item nv-nav-enter${admin}"${adminAttr} style="animation-delay:${i * 30}ms">
  <a href="#" onclick="${routeOnclick(item.id, closeMobile)}">
    <span class="nv-mobile-icon-wrap"><i class="fa-solid ${esc(item.icon)}"></i></span>
    <span>${esc(item.label)}</span>
    ${badgeHtml(item)}
  </a>
</li>`;
    }

    function renderBottomItem(item, i) {
        const label = item.short || item.label;
        return `
<a href="#" class="mobile-nav-item nv-bottom-nav-item nv-nav-enter" data-mobile-nav="${esc(item.id)}"
   onclick="${routeOnclick(item.id, false)}" style="animation-delay:${i * 45}ms">
  <span class="nv-bottom-icon-wrap"><i class="fa-solid ${esc(item.icon)}"></i></span>
  <span>${esc(label)}</span>
</a>`;
    }

    function renderHeader() {
        const ul = document.getElementById('header-main-nav');
        if (!ul) return;
        ul.innerHTML = PRIMARY.map((item, i) => renderHeaderItem(item, i)).join('');
    }

    function renderSidebar() {
        const host = document.getElementById('nv-sidebar-nav-host');
        if (!host) return;
        host.innerHTML = SIDEBAR_SECTIONS.map((section, i) => renderSidebarSection(section, i === 0)).join('');
    }

    function renderMobile() {
        let host = document.getElementById('nv-mobile-nav-host');
        if (!host) {
            const panel = document.getElementById('nv-mobile-nav');
            if (!panel) return;
            host = document.createElement('div');
            host.id = 'nv-mobile-nav-host';
            panel.appendChild(host);
        }
        const primary = `<p class="nv-mobile-nav-label">Menu</p>
<ul class="list-unstyled mb-0 nv-mobile-nav-list">${PRIMARY.map((item, i) => renderMobileItem(item, true, i)).join('')}</ul>`;
        const extra = `<p class="nv-mobile-nav-label mt-3">More</p>
<ul class="list-unstyled mb-0 nv-mobile-nav-list nv-mobile-nav-secondary">${MOBILE_EXTRA.map((item, i) => renderMobileItem(item, true, i + PRIMARY.length)).join('')}</ul>`;
        host.innerHTML = primary + extra;
    }

    function renderBottom() {
        let inner = document.getElementById('nv-bottom-nav-inner');
        if (!inner) {
            const bar = document.getElementById('mobile-bottom-nav');
            if (!bar) return;
            inner = document.createElement('div');
            inner.id = 'nv-bottom-nav-inner';
            inner.className = 'd-flex w-100 justify-content-around align-items-center';
            bar.appendChild(inner);
        }
        inner.innerHTML = BOTTOM.map((item, i) => renderBottomItem(item, i)).join('');
    }

    function positionIndicator(trackSel, indicatorId, activeSel, axis) {
        const track = document.querySelector(trackSel);
        const indicator = document.getElementById(indicatorId);
        const active = track ? track.querySelector(activeSel) : null;
        if (!track || !indicator || !active) {
            if (indicator) indicator.style.opacity = '0';
            return;
        }
        const tr = track.getBoundingClientRect();
        const ar = active.getBoundingClientRect();
        if (axis === 'bottom') {
            indicator.style.left = ar.left - tr.left + ar.width / 2 + 'px';
            indicator.style.opacity = '1';
        } else {
            indicator.style.left = ar.left - tr.left + 'px';
            indicator.style.width = ar.width + 'px';
            indicator.style.opacity = '1';
        }
    }

    function updateIndicators() {
        positionIndicator('.nv-header-nav-track', 'nv-header-nav-indicator', '.nv-main-nav > li.active > a', 'header');
        positionIndicator('#mobile-bottom-nav', 'nv-bottom-nav-indicator', '.mobile-nav-item.active', 'bottom');
    }

    function setActiveClasses(viewId) {
        activeView = viewId || 'feed';
        document.querySelectorAll('.nv-main-nav > li[data-nav]').forEach((li) => {
            li.classList.toggle('active', li.dataset.nav === activeView);
        });
        document.querySelectorAll('.nv-mobile-nav-list li[data-nav]').forEach((li) => {
            li.classList.toggle('active', li.dataset.nav === activeView);
        });
        document.querySelectorAll('.mobile-nav-item[data-mobile-nav]').forEach((a) => {
            a.classList.toggle('active', a.dataset.mobileNav === activeView);
        });
        document.querySelectorAll('.side-menu-list li').forEach((li) => li.classList.remove('active'));
        const sideNode = document.getElementById('sidemenu-' + activeView);
        if (sideNode) sideNode.classList.add('active');
    }

    function syncActive(viewId) {
        setActiveClasses(viewId);
        nextFrame(updateIndicators);
    }

    function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateIndicators, 80);
    }

    function init() {
        renderHeader();
        renderSidebar();
        renderMobile();
        renderBottom();
        setActiveClasses(activeView);
        nextFrame(updateIndicators);
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('resize', onResize);
        }
        if (window.NamvioMotion && typeof document.querySelector === 'function') {
            window.NamvioMotion.scanReveal(document.querySelector('.nv-left-sidebar'));
            window.NamvioMotion.scanReveal(document.getElementById('nv-mobile-nav'));
        }
    }

    window.NamvioNav = {
        init,
        syncActive,
        updateIndicators,
        PRIMARY,
        SIDEBAR_SECTIONS
    };
})();