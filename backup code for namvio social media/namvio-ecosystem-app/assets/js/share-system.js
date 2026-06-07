/**
 * Namvio Share — multi-platform redirects for posts, profiles, invitations & listings.
 */
(function () {
    const INVITE_STORAGE_KEY = 'namvio_invite_code_v1';

    const PLATFORM_DEFS = [
        {
            id: 'twitter',
            label: 'X (Twitter)',
            icon: 'fa-brands fa-x-twitter',
            color: '#0f1419',
            buildUrl(p) {
                const q = new URLSearchParams();
                q.set('text', p.composeText);
                if (p.url) q.set('url', p.url);
                return 'https://twitter.com/intent/tweet?' + q.toString();
            }
        },
        {
            id: 'facebook',
            label: 'Facebook',
            icon: 'fa-brands fa-facebook-f',
            color: '#1877f2',
            buildUrl(p) {
                return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(p.url);
            }
        },
        {
            id: 'linkedin',
            label: 'LinkedIn',
            icon: 'fa-brands fa-linkedin-in',
            color: '#0a66c2',
            buildUrl(p) {
                return (
                    'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(p.url)
                );
            }
        },
        {
            id: 'whatsapp',
            label: 'WhatsApp',
            icon: 'fa-brands fa-whatsapp',
            color: '#25d366',
            buildUrl(p) {
                return 'https://wa.me/?text=' + encodeURIComponent(p.composeText + '\n' + p.url);
            }
        },
        {
            id: 'telegram',
            label: 'Telegram',
            icon: 'fa-brands fa-telegram',
            color: '#0088cc',
            buildUrl(p) {
                const q = new URLSearchParams();
                q.set('url', p.url);
                q.set('text', p.composeText);
                return 'https://t.me/share/url?' + q.toString();
            }
        },
        {
            id: 'reddit',
            label: 'Reddit',
            icon: 'fa-brands fa-reddit-alien',
            color: '#ff4500',
            buildUrl(p) {
                const q = new URLSearchParams();
                q.set('url', p.url);
                q.set('title', p.title);
                return 'https://www.reddit.com/submit?' + q.toString();
            }
        },
        {
            id: 'pinterest',
            label: 'Pinterest',
            icon: 'fa-brands fa-pinterest-p',
            color: '#e60023',
            buildUrl(p) {
                const q = new URLSearchParams();
                q.set('url', p.url);
                q.set('description', p.composeText);
                return 'https://pinterest.com/pin/create/button/?' + q.toString();
            }
        },
        {
            id: 'bluesky',
            label: 'Bluesky',
            icon: 'fa-solid fa-cloud',
            color: '#1185fe',
            buildUrl(p) {
                return (
                    'https://bsky.app/intent/compose?text=' +
                    encodeURIComponent(p.composeText + '\n' + p.url)
                );
            }
        },
        {
            id: 'threads',
            label: 'Threads',
            icon: 'fa-brands fa-threads',
            color: '#101010',
            buildUrl(p) {
                return (
                    'https://www.threads.net/intent/post?text=' +
                    encodeURIComponent(p.composeText + '\n' + p.url)
                );
            }
        },
        {
            id: 'email',
            label: 'Email',
            icon: 'fa-solid fa-envelope',
            color: '#64748b',
            buildUrl(p) {
                const q = new URLSearchParams();
                q.set('subject', p.title);
                q.set('body', p.composeText + '\n\n' + p.url + '\n\n— Namvio Social');
                return 'mailto:?' + q.toString();
            }
        }
    ];

    let modalReady = false;
    let activePayload = null;

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getAppBase() {
        const loc = window.location;
        return loc.origin + loc.pathname;
    }

    function slugHandle(handle) {
        return String(handle || '@user')
            .replace(/^@/, '')
            .replace(/[^a-z0-9_-]/gi, '')
            .toLowerCase() || 'member';
    }

    function getInviteCode(session) {
        try {
            let code = localStorage.getItem(INVITE_STORAGE_KEY);
            if (!code && session) {
                const seed = slugHandle(session.handle);
                code = 'NV-' + seed.slice(0, 6).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
                localStorage.setItem(INVITE_STORAGE_KEY, code);
            }
            return code || 'NV-GUEST';
        } catch (_) {
            return 'NV-GUEST';
        }
    }

    function typeLabel(type) {
        const map = {
            post: 'Post',
            profile: 'Profile',
            invitation: 'Invitation',
            listing: 'Listing'
        };
        return map[type] || 'Link';
    }

    function buildTargetUrl(type, opts) {
        const base = getAppBase();
        const o = opts || {};
        switch (type) {
            case 'post':
                return (
                    base +
                    '#feed' +
                    (o.postId ? '&post=' + encodeURIComponent(o.postId) : '')
                );
            case 'profile':
                return base + '#profile&user=' + encodeURIComponent(o.handle || '@user');
            case 'invitation':
                return base + '#invite=' + encodeURIComponent(o.inviteCode || 'NV-GUEST');
            case 'listing':
                return (
                    base +
                    '#listing=' +
                    encodeURIComponent(o.listingId || o.domain || 'listing')
                );
            default:
                return base + '#feed';
        }
    }

    function buildPayload(options) {
        const type = options.type || 'post';
        const session = window.activeSessionState || {};
        const inviteCode = options.inviteCode || getInviteCode(session);
        const url = options.url || buildTargetUrl(type, { ...options, inviteCode });
        const title = options.title || 'Namvio Social — Domain Investor Network';
        let text = options.text || '';

        if (type === 'invitation' && !text) {
            const name = session.displayName || 'A domain investor';
            text =
                name +
                ' invited you to join Namvio Social — connect with investors, brokers & registrars. Use invite code ' +
                inviteCode +
                '.';
        }
        if (type === 'profile' && !text) {
            text =
                'View ' +
                (session.displayName || 'this member') +
                ' (' +
                (options.handle || session.handle || '@user') +
                ') on Namvio Social — domain investor profile & portfolio.';
        }
        if (type === 'post' && !text) {
            text = 'Domain community update on Namvio Social.';
        }
        if (type === 'listing' && !text) {
            text =
                'Premium domain listing on Namvio: ' +
                (options.domain || 'featured name') +
                (options.price ? ' — ' + options.price : '') +
                '.';
        }

        const composeText = (text + (text.endsWith('.') ? '' : '.')).trim();

        return {
            type,
            url,
            title,
            text,
            composeText,
            inviteCode,
            hashtags: options.hashtags || 'domains,domaining,Namvio'
        };
    }

    function ensureModal() {
        if (modalReady) return;
        const wrap = document.createElement('div');
        wrap.innerHTML = `
<div class="modal fade nv-share-modal" id="nv-share-modal" tabindex="-1" role="dialog" aria-labelledby="nv-share-modal-title" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" role="document">
    <div class="modal-content border-0 shadow-lg">
      <div class="modal-header border-0 pb-0">
        <div>
          <p class="nv-share-eyebrow mb-1">Share on social</p>
          <h5 class="modal-title font-weight-bold text-dark mb-0" id="nv-share-modal-title">Share</h5>
          <p class="text-muted small mb-0 mt-1" id="nv-share-modal-sub"></p>
        </div>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body pt-3">
        <div class="nv-share-preview" id="nv-share-preview"></div>
        <p class="nv-share-grid-label">Choose platform</p>
        <div class="nv-share-grid" id="nv-share-grid"></div>
        <div class="nv-share-util-row">
          <button type="button" class="btn btn-sm btn-light border font-weight-bold" id="nv-share-copy-btn">
            <i class="fa-solid fa-link mr-1"></i> Copy link
          </button>
          <button type="button" class="btn btn-sm btn-outline-primary font-weight-bold d-none" id="nv-share-native-btn">
            <i class="fa-solid fa-share-nodes mr-1"></i> Share via device
          </button>
        </div>
        <p class="text-muted mb-0 mt-2" style="font-size:10px;line-height:1.4;" id="nv-share-hint">
          Opens the platform in a new tab so you can publish your post, profile, or invite.
        </p>
      </div>
    </div>
  </div>
</div>`;
        document.body.appendChild(wrap.firstElementChild);

        document.getElementById('nv-share-copy-btn').addEventListener('click', copyActiveLink);
        const nativeBtn = document.getElementById('nv-share-native-btn');
        if (navigator.share) {
            nativeBtn.classList.remove('d-none');
            nativeBtn.addEventListener('click', nativeShare);
        }

        modalReady = true;
    }

    function renderGrid(payload) {
        const grid = document.getElementById('nv-share-grid');
        if (!grid) return;
        grid.innerHTML = PLATFORM_DEFS.map((plat) => {
            const href = plat.buildUrl(payload);
            return `
<a href="${esc(href)}" class="nv-share-platform" target="_blank" rel="noopener noreferrer"
   data-platform="${esc(plat.id)}" style="--nv-share-color:${esc(plat.color)}"
   title="Share on ${esc(plat.label)}">
  <span class="nv-share-platform-icon"><i class="${esc(plat.icon)}"></i></span>
  <span class="nv-share-platform-label">${esc(plat.label)}</span>
</a>`;
        }).join('');
    }

    function renderPreview(payload) {
        const el = document.getElementById('nv-share-preview');
        if (!el) return;
        el.innerHTML = `
<p class="nv-share-preview-title mb-1">${esc(payload.title)}</p>
<p class="nv-share-preview-text mb-2">${esc(payload.text)}</p>
<p class="nv-share-preview-url mb-0"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>${esc(payload.url)}</p>`;
    }

    function showModal(payload) {
        ensureModal();
        activePayload = payload;
        const titleEl = document.getElementById('nv-share-modal-title');
        const subEl = document.getElementById('nv-share-modal-sub');
        if (titleEl) titleEl.textContent = 'Share ' + typeLabel(payload.type);
        if (subEl) {
            subEl.textContent =
                payload.type === 'invitation'
                    ? 'Invite code ' + payload.inviteCode + ' · share with your network'
                    : 'Pick a platform — you’ll compose the final post there';
        }
        renderPreview(payload);
        renderGrid(payload);
        if (window.jQuery) {
            window.jQuery('#nv-share-modal').modal('show');
        } else {
            const modal = document.getElementById('nv-share-modal');
            if (modal) modal.classList.add('show');
        }
    }

    function copyActiveLink() {
        if (!activePayload) return;
        const line = activePayload.composeText + '\n' + activePayload.url;
        const done = () => showToast('Link copied to clipboard.');
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(line).then(done).catch(fallbackCopy);
        } else fallbackCopy();

        function fallbackCopy() {
            const ta = document.createElement('textarea');
            ta.value = line;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                done();
            } catch (_) {
                alert(line);
            }
            document.body.removeChild(ta);
        }
    }

    function nativeShare() {
        if (!activePayload || !navigator.share) return;
        navigator
            .share({
                title: activePayload.title,
                text: activePayload.composeText,
                url: activePayload.url
            })
            .catch(() => {});
    }

    function showToast(msg) {
        let t = document.getElementById('nv-share-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'nv-share-toast';
            t.className = 'nv-share-toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._hideTimer);
        t._hideTimer = setTimeout(() => t.classList.remove('show'), 2400);
    }

    function open(options) {
        const payload = buildPayload(options || {});
        showModal(payload);
        return payload;
    }

    function openInvitation(extra) {
        const session = window.activeSessionState || {};
        return open({
            type: 'invitation',
            inviteCode: getInviteCode(session),
            title: (session.displayName || 'Namvio member') + ' invites you to Namvio Social',
            ...(extra || {})
        });
    }

    function openPostFromButton(btn) {
        const card = btn && btn.closest ? btn.closest('.card-component') : null;
        const postId = card?.dataset?.postId || '';
        const bodyEl = card?.querySelector('p.text-dark');
        const authorEl = card?.querySelector('h6.font-weight-bold');
        const author = authorEl ? authorEl.textContent.trim() : 'Namvio member';
        const body = bodyEl ? bodyEl.textContent.trim() : 'Domain community update';
        return open({
            type: 'post',
            postId,
            title: author + ' on Namvio Social',
            text: body.slice(0, 220) + (body.length > 220 ? '…' : '')
        });
    }

    function openProfile(extra) {
        const session = window.activeSessionState || {};
        return open({
            type: 'profile',
            handle: (extra && extra.handle) || session.handle,
            title: (extra && extra.displayName) || session.displayName || 'Namvio Profile',
            text:
                (extra && extra.text) ||
                'Check out my domain investor profile on Namvio Social — portfolio, reputation & deals.',
            ...(extra || {})
        });
    }

    function openListing(domain, price, listingId) {
        return open({
            type: 'listing',
            domain,
            price,
            listingId: listingId || domain,
            title: 'Listing: ' + domain,
            text: 'Premium domain for sale on Namvio Social' + (price ? ' — ' + price : '') + '.'
        });
    }

    window.NamvioShare = {
        open,
        openInvitation,
        openPostFromButton,
        openProfile,
        openListing,
        getInviteCode,
        buildPayload,
        copyActiveLink
    };
})();