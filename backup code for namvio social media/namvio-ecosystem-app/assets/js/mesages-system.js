/**
 * Namvio Mesages — dynamic member messaging inbox.
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

    const PEER_STATUS = {
        rahul: { online: true, verified: true, escrow: true },
        maya: { online: true, verified: true, escrow: true },
        james: { online: false, verified: true, escrow: false },
        alex: { online: true, verified: true, escrow: true },
        sofia: { online: false, verified: false, escrow: true }
    };

    function getSeedAccounts() {
        return window.SEED_ACCOUNTS || [];
    }

    function getPeerMeta(peerId) {
        const account = getSeedAccounts().find((a) => a.id === peerId);
        const status = PEER_STATUS[peerId] || { online: false, verified: false, escrow: false };
        return {
            online: status.online,
            verified: status.verified,
            escrow: status.escrow,
            niche: account ? account.niche : ''
        };
    }

    const FILTERS = [
        { id: 'all', label: 'All', icon: 'fa-inbox' },
        { id: 'unread', label: 'Unread', icon: 'fa-circle' },
        { id: 'broker', label: 'Brokers', icon: 'fa-handshake' },
        { id: 'investor', label: 'Investors', icon: 'fa-chart-line' },
        { id: 'registrar', label: 'Registrars', icon: 'fa-server' }
    ];

    const QUICK_REPLIES = [
        'Interested in escrow — can we align on terms?',
        'Can you share recent comps for this niche?',
        'Open to a quick call this week.'
    ];

    let activeFilter = 'all';
    let typingHideTimer = null;

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getPeers() {
        return window.MESSAGE_PEERS || {};
    }

    function getMesagesState() {
        if (typeof window.getMesages === 'function') return window.getMesages();
        return window.activeSessionState?.mesages || { threads: [], activeThreadId: null };
    }

    function formatTime(ts) {
        if (typeof window.formatMesageTime === 'function') return window.formatMesageTime(ts);
        return '';
    }

    function formatDayLabel(ts) {
        const d = new Date(ts);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === now.toDateString()) return 'Today';
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }

    function getTotalUnread() {
        return getMesagesState().threads.reduce((s, t) => s + (t.unread || 0), 0);
    }

    function threadMatchesFilter(thread, peer) {
        if (activeFilter === 'unread') return (thread.unread || 0) > 0;
        if (activeFilter === 'all') return true;
        return peer.role === activeFilter;
    }

    function renderKpiStrip() {
        const mesages = getMesagesState();
        const unread = getTotalUnread();
        const online = getSeedAccounts().filter((a) => getPeerMeta(a.id).online).length;
        return `
<div class="msg-kpi">
  <span class="msg-kpi-item"><i class="fa-solid fa-envelope"></i><strong>${mesages.threads.length}</strong> threads</span>
  <span class="msg-kpi-item"><i class="fa-solid fa-circle-exclamation"></i><strong>${unread}</strong> unread</span>
  <span class="msg-kpi-item msg-kpi-item--live"><i class="fa-solid fa-circle"></i><strong>${online}</strong> online</span>
</div>`;
    }

    function renderFilters() {
        return FILTERS.map((f) => {
            const on = activeFilter === f.id ? ' active' : '';
            return `<button type="button" class="msg-filter-btn${on}" data-msg-filter="${esc(f.id)}" onclick="NamvioMesages.setFilter('${esc(f.id)}'); return false;"><i class="fa-solid ${esc(f.icon)}"></i>${esc(f.label)}</button>`;
        }).join('');
    }

    function renderThreadItem(thread, peer, mesages, filterQ) {
        const last = thread.messages[thread.messages.length - 1];
        const preview = last ? last.text : 'No messages yet';
        const q = (filterQ || '').toLowerCase().trim();
        const match =
            !q ||
            peer.name.toLowerCase().includes(q) ||
            peer.handle.toLowerCase().includes(q) ||
            preview.toLowerCase().includes(q);
        if (!match || !threadMatchesFilter(thread, peer)) return '';

        const meta = getPeerMeta(peer.id);
        const roleClass = ROLE_CLASS[peer.role] || 'badge-investor';
        const active = mesages.activeThreadId === thread.peerId ? ' active' : '';
        const unread = thread.unread > 0;
        const unreadBadge = unread ? `<span class="msg-thread-unread">${thread.unread}</span>` : '';

        return `
<div class="msg-thread-item${active}${unread ? ' has-unread' : ''}" data-peer-id="${esc(peer.id)}" onclick="toggleMesageThread('${esc(peer.id)}')">
  <div class="msg-thread-avatar-wrap">
    <div class="profile-thumb rounded-circle overflow-hidden">
      <img src="${esc(peer.avatar)}" alt="" loading="lazy" decoding="async" width="44" height="44">
    </div>
    ${meta.online ? '<span class="msg-online-ring" title="Online"></span>' : ''}
  </div>
  <div class="flex-grow-1 min-width-0">
    <div class="d-flex justify-content-between align-items-center">
      <span class="msg-thread-name">${esc(peer.name)}</span>
      <span class="msg-thread-time">${last ? formatTime(last.at) : ''}</span>
    </div>
    <div class="d-flex justify-content-between align-items-center mt-1">
      <span class="msg-thread-preview">${esc(preview)}</span>
      ${unreadBadge}
    </div>
    <div class="msg-thread-tags mt-1">
      <span class="identity-badge ${roleClass}">${esc(ROLE_LABEL[peer.role] || 'Member')}</span>
      ${meta.escrow ? '<span class="msg-tag msg-tag--escrow"><i class="fa-solid fa-shield-halved"></i> Escrow</span>' : ''}
    </div>
  </div>
</div>`;
    }

    function renderSeedCompose() {
        const wrap = document.getElementById('msg-seed-compose');
        if (!wrap) return;

        const accounts = getSeedAccounts();
        if (!accounts.length) {
            wrap.innerHTML = '';
            return;
        }

        wrap.innerHTML = `
<p class="msg-seed-compose-label mb-2"><i class="fa-solid fa-user-plus mr-1"></i>Message a member</p>
<div class="msg-seed-compose-row">
${accounts
    .map(
        (a) =>
            `<button type="button" class="msg-seed-chip" onclick="startMesageWith('${esc(a.id)}', this); return false;" title="Message ${esc(a.name)}">
    <span class="msg-seed-chip-avatar profile-thumb rounded-circle overflow-hidden"><img src="${esc(a.avatar)}" alt="" width="22" height="22"></span>
    <span class="msg-seed-chip-name">${esc(a.name.split(' ')[0])}</span>
  </button>`
    )
    .join('')}
</div>`;
    }

    function renderThreadList(filterQ) {
        const list = document.getElementById('msg-thread-list');
        if (!list) return;

        const mesages = getMesagesState();
        const peers = getPeers();
        const html = mesages.threads
            .map((thread) => {
                const peer = peers[thread.peerId];
                if (!peer) return '';
                return renderThreadItem(thread, peer, mesages, filterQ);
            })
            .filter(Boolean)
            .join('');

        list.innerHTML =
            html ||
            '<div class="msg-list-empty"><i class="fa-regular fa-folder-open"></i><p>No conversations match.</p></div>';

        if (window.NamvioMotion) window.NamvioMotion.scanReveal(list);
    }

    function renderMessageBlocks(peerId) {
        const thread =
            typeof window.getMesageThread === 'function'
                ? window.getMesageThread(peerId)
                : getMesagesState().threads.find((t) => t.peerId === peerId);
        if (!thread) return '';

        const peer = getPeers()[peerId];
        if (!thread.messages.length) {
            return `<div class="msg-thread-empty-hint text-center py-4">
  <p class="text-muted small mb-0">Start the conversation with <strong>${esc(peer ? peer.name : 'this member')}</strong>.</p>
</div>`;
        }

        let lastDay = '';

        return thread.messages
            .map((msg, i) => {
                const day = formatDayLabel(msg.at);
                let sep = '';
                if (day !== lastDay) {
                    lastDay = day;
                    sep = `<div class="msg-day-sep"><span>${esc(day)}</span></div>`;
                }
                const isMe = msg.from === 'me';
                const avatar =
                    !isMe && peer
                        ? `<div class="msg-bubble-avatar profile-thumb rounded-circle overflow-hidden"><img src="${esc(peer.avatar)}" alt="" width="28" height="28"></div>`
                        : '';
                return `${sep}
<div class="msg-msg-row ${isMe ? 'msg-msg-row--me' : 'msg-msg-row--them'} msg-bubble-enter" style="animation-delay:${Math.min(i * 35, 280)}ms">
  ${!isMe ? avatar : ''}
  <div class="msg-bubble ${isMe ? 'me' : 'them'}">
    <p class="msg-bubble-text mb-0">${esc(msg.text)}</p>
    <span class="msg-bubble-time">${formatTime(msg.at)}${isMe ? ' <i class="fa-solid fa-check-double"></i>' : ''}</span>
  </div>
</div>`;
            })
            .join('');
    }

    function renderMessages(peerId) {
        const box = document.getElementById('msg-messages-box');
        if (!box) return;

        box.innerHTML = renderMessageBlocks(peerId);
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => {
                box.scrollTop = box.scrollHeight;
            });
        } else {
            box.scrollTop = box.scrollHeight;
        }
    }

    function renderQuickReplies() {
        const wrap = document.getElementById('msg-quick-replies');
        if (!wrap) return;
        wrap.innerHTML = QUICK_REPLIES.map(
            (t, i) =>
                `<button type="button" class="msg-quick-reply-chip" onclick="NamvioMesages.useQuickReply(${i}); return false;">${esc(t)}</button>`
        ).join('');
    }

    function useQuickReply(index) {
        const text = QUICK_REPLIES[index];
        if (text) insertQuickReply(text);
    }

    function renderPanelActions(peerId) {
        const el = document.getElementById('msg-panel-actions');
        if (!el) return;
        const meta = getPeerMeta(peerId);
        el.innerHTML = `
<button type="button" class="msg-action-chip" onclick="NamvioMesages.insertQuickReply('Can we run this through Namvio escrow?'); return false;"><i class="fa-solid fa-shield-halved"></i> Escrow</button>
<button type="button" class="msg-action-chip" onclick="NamvioMesages.insertQuickReply('Please share comps for similar names.'); return false;"><i class="fa-solid fa-chart-simple"></i> Comps</button>
<button type="button" class="msg-action-chip" onclick="routeView('marketplace', this); return false;"><i class="fa-solid fa-store"></i> Listings</button>
${meta.verified ? '<span class="msg-action-chip msg-action-chip--static"><i class="fa-solid fa-circle-check text-success"></i> Verified member</span>' : ''}`;
    }

    function updatePeerHeader(peerId) {
        const peer = getPeers()[peerId];
        if (!peer) return;
        const meta = getPeerMeta(peerId);

        const status = document.getElementById('msg-peer-status');
        if (status) {
            status.innerHTML = meta.online
                ? '<span class="msg-status-live"><i class="fa-solid fa-circle"></i> Online now</span>'
                : '<span class="msg-status-away"><i class="fa-regular fa-clock"></i> Away · replies within 24h</span>';
        }

        const metaEl = document.getElementById('msg-peer-meta');
        if (metaEl) {
            metaEl.textContent =
                peer.handle + (meta.niche ? ' · ' + meta.niche : '') + (meta.escrow ? ' · Escrow ready' : '');
        }

        const roleBadge = document.getElementById('msg-peer-role-badge');
        if (roleBadge) {
            roleBadge.textContent = ROLE_LABEL[peer.role] || 'Member';
            roleBadge.className = 'identity-badge ' + (ROLE_CLASS[peer.role] || 'badge-investor');
        }

        const dot = document.getElementById('msg-panel-online-dot');
        if (dot) dot.classList.toggle('d-none', !meta.online);

        const avatar = document.getElementById('msg-peer-avatar');
        const name = document.getElementById('msg-peer-name');
        if (avatar) avatar.src = peer.avatar;
        if (name) name.textContent = peer.name;
    }

    function syncChrome(filterQ) {
        const kpi = document.getElementById('msg-kpi-strip');
        const filters = document.getElementById('msg-filters');
        if (kpi) kpi.innerHTML = renderKpiStrip();
        if (filters) filters.innerHTML = renderFilters();
        renderSeedCompose();
        renderThreadList(filterQ != null ? filterQ : document.getElementById('msg-search-input')?.value || '');
        if (typeof window.updateMesageBadges === 'function') window.updateMesageBadges();
    }

    function setFilter(id) {
        activeFilter = id || 'all';
        syncChrome();
    }

    function insertQuickReply(text) {
        const input = document.getElementById('msg-message-input');
        if (!input || input.disabled) return;
        input.value = text;
        input.focus();
    }

    function showTyping(peerId) {
        const el = document.getElementById('msg-typing-indicator');
        const peer = getPeers()[peerId];
        if (!el || !peer) return;
        el.classList.remove('d-none');
        el.innerHTML = `
<div class="msg-typing-inner">
  <div class="profile-thumb rounded-circle overflow-hidden msg-typing-avatar"><img src="${esc(peer.avatar)}" alt="" width="24" height="24"></div>
  <div class="msg-typing-bubble">
    <span class="msg-typing-name">${esc(peer.name)}</span>
    <span class="msg-typing-dots"><i></i><i></i><i></i></span>
  </div>
</div>`;
        const box = document.getElementById('msg-messages-box');
        if (box) box.scrollTop = box.scrollHeight;
    }

    function hideTyping() {
        const el = document.getElementById('msg-typing-indicator');
        if (el) el.classList.add('d-none');
    }

    function onThreadOpen(peerId) {
        updatePeerHeader(peerId);
        renderPanelActions(peerId);
        renderQuickReplies();
        renderMessages(peerId);
        syncChrome();
        if (window.NamvioMotion) window.NamvioMotion.scanReveal(document.getElementById('msg-active-panel'));
    }

    function onThreadClose() {
        hideTyping();
        syncChrome();
    }

    function onMessageSent(peerId) {
        renderMessages(peerId);
        syncChrome();
        showTyping(peerId);
        clearTimeout(typingHideTimer);
        typingHideTimer = setTimeout(hideTyping, 850);
    }

    function onAutoReplyRendered(peerId) {
        hideTyping();
        renderMessages(peerId);
        syncChrome();
    }

    function init() {
        renderQuickReplies();
        syncChrome('');
        if (window.NamvioMotion) window.NamvioMotion.scanReveal(document.getElementById('view-mesages'));
    }

    window.NamvioMesages = {
        init,
        syncChrome,
        setFilter,
        renderThreadList,
        renderMessages,
        onThreadOpen,
        onThreadClose,
        onMessageSent,
        onAutoReplyRendered,
        insertQuickReply,
        useQuickReply,
        showTyping,
        hideTyping
    };
})();