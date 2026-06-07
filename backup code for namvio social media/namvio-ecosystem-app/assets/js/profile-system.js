/**
 * Namvio Social — Profile System (verification, trust, tabs, achievements)
 * Preserves existing design tokens; Supabase-ready session.profile shape
 */
const NamvioProfile = (function () {
    const VERIFY = {
        investor: { label: 'Verified Investor', icon: 'fa-circle-check', class: 'nv-verify-investor', title: 'Blue Check — Verified Investor' },
        broker: { label: 'Verified Broker', icon: 'fa-circle-check', class: 'nv-verify-broker', title: 'Green Check — Verified Broker' },
        expert: { label: 'Industry Expert', icon: 'fa-circle-check', class: 'nv-verify-expert', title: 'Gold Check — Industry Expert' },
        founder: { label: 'Founder', icon: 'fa-circle-check', class: 'nv-verify-founder', title: 'Purple Check — Founder' }
    };

    const ACHIEVEMENTS = [
        { id: 'first_post', label: 'First Post', icon: 'fa-pen', check: (s) => (s.profile?.stats?.posts || 0) >= 1 },
        { id: 'followers_100', label: 'First 100 Followers', icon: 'fa-users', check: (s) => (s.profile?.stats?.followers || 0) >= 100 },
        { id: 'rep_1000', label: 'First 1000 Reputation', icon: 'fa-star', check: (s) => (s.reputationScore || 0) >= 1000 },
        { id: 'verified', label: 'Verified Investor', icon: 'fa-certificate', check: (s) => hasVerification(s) },
        { id: 'founder', label: 'Founder', icon: 'fa-gem', check: (s) => !!(s.profile?.founderPassNumber || s.verificationBadges?.includes('founder')) },
        { id: 'hof', label: 'Hall Of Fame', icon: 'fa-crown', check: (s) => !!s.isHofMember },
        { id: 'top_contributor', label: 'Top Contributor', icon: 'fa-trophy', check: (s) => (s.reputationScore || 0) >= 5000 }
    ];

    let lazyObserver = null;
    let _renderSig = '';
    let _tabsBuilt = {};
    let _trustCache = null;

    const STAT_ICONS = {
        Posts: 'fa-file-lines',
        Followers: 'fa-users',
        Following: 'fa-user-plus',
        'Likes received': 'fa-heart',
        'Comments received': 'fa-comments',
        'Reputation earned': 'fa-star'
    };

    function esc(s) {
        return window.escapeHtml ? window.escapeHtml(s) : String(s ?? '');
    }

    function defaultProfile() {
        return {
            memberSince: '2026-06-01',
            country: 'Germany',
            experienceYears: 8,
            portfolioWebsite: 'https://DomainEmpire.com',
            founderPassNumber: 127,
            socialLinks: {
                linkedin: 'https://linkedin.com/in/namvio-demo',
                x: 'https://x.com/namvio_demo',
                website: 'https://DomainEmpire.com'
            },
            featuredSale: {
                domain: 'CloudStack.com',
                price: 15000,
                year: 2026,
                description: 'Premium brandable sale — liquidity event for portfolio rebalance.',
                screenshotUrl: ''
            },
            pinnedPostId: null,
            stats: {
                posts: 18,
                followers: 342,
                following: 128,
                likesReceived: 1240,
                commentsReceived: 286,
                reputationEarned: 4120
            },
            reputationHistory: [
                { month: '2025-12', score: 1800 },
                { month: '2026-01', score: 2450 },
                { month: '2026-02', score: 2890 },
                { month: '2026-03', score: 3210 },
                { month: '2026-04', score: 3680 },
                { month: '2026-05', score: 4120 }
            ]
        };
    }

    function normalizeProfile(session) {
        const base = defaultProfile();
        const p = session.profile && typeof session.profile === 'object' ? { ...base, ...session.profile } : { ...base };
        p.socialLinks = { ...base.socialLinks, ...(p.socialLinks || {}) };
        p.featuredSale = { ...base.featuredSale, ...(p.featuredSale || {}) };
        p.stats = { ...base.stats, ...(p.stats || {}) };
        p.stats.reputationEarned = session.reputationScore || p.stats.reputationEarned;
        if (!Array.isArray(p.reputationHistory) || !p.reputationHistory.length) {
            p.reputationHistory = buildReputationHistoryFromLogs(session);
        }
        session.profile = p;

        if (!Array.isArray(session.verificationBadges)) {
            session.verificationBadges = deriveVerificationBadges(session);
        }
        _trustCache = null;
        return p;
    }

    function deriveVerificationBadges(session) {
        const badges = [];
        if (session.isVerified) badges.push('investor');
        if (session.role === 'broker') badges.push('broker');
        if (session.role === 'registrar') badges.push('expert');
        if (session.role === 'elite' || session.profile?.founderPassNumber) badges.push('founder');
        if (session.subscription?.planId === 'founder') badges.push('founder');
        return [...new Set(badges)];
    }

    function hasVerification(session) {
        return !!(session.isVerified || (session.verificationBadges && session.verificationBadges.length));
    }

    function getExperienceLabel(years) {
        const y = Number(years) || 0;
        if (y >= 10) return { label: 'Veteran', sub: '10+ years domain investing' };
        if (y >= 5) return { label: 'Professional', sub: '5–10 years experience' };
        if (y >= 2) return { label: 'Intermediate', sub: '2–5 years experience' };
        return { label: 'Beginner', sub: '0–2 years experience' };
    }

    function getTrustBand(score) {
        const s = Math.min(100, Math.max(0, Math.round(score)));
        if (s >= 90) return { label: 'Excellent', class: 'trust-excellent' };
        if (s >= 70) return { label: 'Good', class: 'trust-good' };
        if (s >= 50) return { label: 'Average', class: 'trust-average' };
        return { label: 'Low Trust', class: 'trust-low' };
    }

    function setHtml(el, html) {
        if (!el) return;
        const sig = String(html.length) + ':' + html.slice(0, 48);
        if (el.dataset.renderSig === sig) return;
        el.dataset.renderSig = sig;
        el.innerHTML = html;
    }

    function isProfileViewVisible() {
        const v = document.getElementById('view-identity');
        return !!(v && !v.classList.contains('d-none'));
    }

    function sessionSig(session) {
        const p = session.profile || {};
        return [
            session.reputationScore,
            session.displayName,
            session.handle,
            session.role,
            session.settings?.bio,
            p.pinnedPostId,
            p.country,
            p.experienceYears,
            JSON.stringify(p.stats),
            (session.verificationBadges || []).join(','),
            session.isHofMember
        ].join('|');
    }

    function computeTrustScore(session) {
        if (_trustCache && _trustCache._for === session) return _trustCache.result;
        const profile = session.profile || {};
        let score = 42;
        const factors = [];

        if (hasVerification(session)) {
            score += 18;
            factors.push({ ok: true, text: 'Verified account' });
        } else factors.push({ ok: false, text: 'Verified account' });

        const memberSince = profile.memberSince ? new Date(profile.memberSince + 'T12:00:00') : new Date();
        const ageMonths = (Date.now() - memberSince.getTime()) / (30 * 86400000);
        if (ageMonths >= 6) {
            score += 12;
            factors.push({ ok: true, text: 'Established account age' });
        } else factors.push({ ok: false, text: 'Account age' });

        const violations = !!(session.isSuspended || session.isShadowBanned || (session.moderation?.riskScore || 0) > 40);
        if (!violations && !session.isShadowBanned) {
            score += 18;
            factors.push({ ok: true, text: 'No moderation violations' });
        } else factors.push({ ok: false, text: 'No moderation violations' });

        const rep = Number(session.reputationScore) || 0;
        if (rep >= 1000) {
            score += 14;
            factors.push({ ok: true, text: 'Strong community reputation' });
        } else if (rep >= 100) {
            score += 8;
            factors.push({ ok: true, text: 'Growing community reputation' });
        } else factors.push({ ok: false, text: 'Community reputation' });

        const completion = computeProfileCompletion(session).percent;
        score += Math.round((completion / 100) * 12);
        factors.push({ ok: completion >= 70, text: 'Profile completion' });

        const result = { score: Math.min(100, score), factors };
        _trustCache = { _for: session, result };
        return result;
    }

    function computeProfileCompletion(session) {
        const settings = session.settings || {};
        const profile = session.profile || {};
        const checks = [
            { key: 'photo', done: true, label: 'Profile photo' },
            { key: 'bio', done: !!(settings.bio && settings.bio.trim()), label: 'Bio' },
            { key: 'website', done: !!(profile.portfolioWebsite || profile.socialLinks?.website), label: 'Website' },
            { key: 'location', done: !!(profile.country && profile.country.trim()), label: 'Location' },
            { key: 'experience', done: profile.experienceYears != null && profile.experienceYears !== '', label: 'Experience' },
            { key: 'verification', done: hasVerification(session), label: 'Verification' }
        ];
        const done = checks.filter((c) => c.done).length;
        const percent = Math.round((done / checks.length) * 100);
        return { percent, checks };
    }

    function buildReputationHistoryFromLogs(session) {
        const handle = (session.handle || session.email || 'user').toLowerCase();
        const logs =
            window.NamvioReputation && NamvioReputation.getLogsForUser
                ? NamvioReputation.getLogsForUser(handle, 200)
                : [];
        const byMonth = new Map();
        logs.forEach((l) => {
            const m = (l.createdAt || '').slice(0, 7);
            if (m) byMonth.set(m, l.scoreAfter);
        });
        const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-8);
        if (months.length) return months.map(([month, score]) => ({ month, score }));
        const score = Number(session.reputationScore) || 0;
        const now = new Date();
        const out = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const month = d.toISOString().slice(0, 7);
            out.push({ month, score: Math.max(0, Math.round(score * (0.55 + (5 - i) * 0.09))) });
        }
        return out;
    }

    function renderVerificationBadges(session) {
        const badges = session.verificationBadges || [];
        if (!badges.length) return '';
        return badges
            .map((key) => {
                const v = VERIFY[key];
                if (!v) return '';
                return `<span class="nv-verify-badge ${v.class}" title="${esc(v.title)}"><i class="fa-solid ${v.icon}"></i></span>`;
            })
            .join('');
    }

    function renderFounderPass(session) {
        const num = session.profile?.founderPassNumber;
        if (!num) return '';
        return `
            <div class="profile-founder-pass">
                <div class="profile-founder-glow"></div>
                <div class="d-flex align-items-center flex-wrap profile-founder-inner">
                    <span class="identity-badge badge-elite profile-founder-badge"><i class="fa-solid fa-gem mr-1"></i> Founder #${esc(String(num))}</span>
                    <div class="profile-founder-benefits small mb-0">
                        <span class="d-block font-weight-bold text-dark">Founder Member</span>
                        <span class="text-muted">Early Supporter · Lifetime Recognition</span>
                    </div>
                </div>
            </div>`;
    }

    function renderHeroMetrics(session) {
        const rep = Number(session.reputationScore) || 0;
        const trust = computeTrustScore(session).score;
        const { percent } = computeProfileCompletion(session);
        const tier =
            window.NamvioReputation && NamvioReputation.getTier
                ? NamvioReputation.getTier(rep).name
                : 'Member';
        return `
            <div class="profile-metric-pill profile-metric-rep">
                <i class="fa-solid fa-star"></i>
                <div>
                    <span class="profile-metric-val">${rep.toLocaleString()}</span>
                    <span class="profile-metric-lbl">Reputation · ${esc(tier)}</span>
                </div>
            </div>
            <div class="profile-metric-pill profile-metric-trust">
                <i class="fa-solid fa-shield-halved"></i>
                <div>
                    <span class="profile-metric-val">${trust}<span class="profile-metric-unit">/100</span></span>
                    <span class="profile-metric-lbl">Trust score</span>
                </div>
            </div>
            <div class="profile-metric-pill profile-metric-complete">
                <i class="fa-solid fa-circle-check"></i>
                <div>
                    <span class="profile-metric-val">${percent}%</span>
                    <span class="profile-metric-lbl">Profile complete</span>
                </div>
            </div>`;
    }

    function renderMemberChips(session) {
        const profile = session.profile || {};
        const roleLabel = window.ROLE_LABEL ? window.ROLE_LABEL[session.role] || 'Investor' : 'Domain Investor';
        const since = profile.memberSince
            ? new Date(profile.memberSince + 'T12:00:00').toLocaleString(undefined, { month: 'short', year: 'numeric' })
            : '';
        const chips = [];
        if (since) chips.push({ icon: 'fa-calendar', text: 'Since ' + since });
        if (profile.country) chips.push({ icon: 'fa-location-dot', text: profile.country });
        chips.push({ icon: 'fa-user-tag', text: roleLabel });
        const site = profile.portfolioWebsite || '';
        if (site) {
            const label = site.replace(/^https?:\/\//i, '').replace(/\/$/, '');
            chips.push({ icon: 'fa-link', text: label, href: site });
        }
        return chips
            .map((c) =>
                c.href
                    ? `<a href="${esc(c.href)}" target="_blank" rel="noopener noreferrer" class="profile-info-chip"><i class="fa-solid ${c.icon}"></i>${esc(c.text)}</a>`
                    : `<span class="profile-info-chip"><i class="fa-solid ${c.icon}"></i>${esc(c.text)}</span>`
            )
            .join('');
    }

    function renderTrustBlock(session) {
        const { score, factors } = computeTrustScore(session);
        const band = getTrustBand(score);
        const ringPct = score;
        const factorsHtml = factors
            .map(
                (f) =>
                    `<li class="profile-trust-factor ${f.ok ? 'done' : ''}"><i class="fa-solid fa-${f.ok ? 'check' : 'minus'}"></i>${esc(f.text)}</li>`
            )
            .join('');
        return `
            <div class="profile-trust-block">
                <div class="d-flex align-items-center flex-wrap" style="gap:16px;">
                    <div class="profile-trust-ring" style="--trust-pct:${ringPct}" title="Trust ${score}/100">
                        <span class="profile-trust-ring-val">${score}</span>
                    </div>
                    <div>
                        <p class="text-uppercase text-muted small font-weight-bold mb-1">Trust score</p>
                        <p class="h5 font-weight-bold mb-0 ${band.class}">${esc(band.label)}</p>
                        <p class="text-muted small mb-0">Separate from reputation — safety &amp; verification signals</p>
                    </div>
                </div>
                <ul class="profile-trust-factors">${factorsHtml}</ul>
            </div>`;
    }

    function renderCompletion(session) {
        const { percent, checks } = computeProfileCompletion(session);
        const done = checks.filter((c) => c.done).length;
        return `
            <div class="profile-completion-card">
                <div class="d-flex align-items-start justify-content-between mb-3">
                    <div>
                        <p class="text-uppercase text-muted small font-weight-bold mb-1">Profile strength</p>
                        <p class="h3 font-weight-bold text-primary mb-0">${percent}%</p>
                        <p class="text-muted small mb-0">${done} of ${checks.length} fields complete</p>
                    </div>
                    <div class="profile-completion-ring" style="--complete-pct:${percent}">
                        <span>${percent}%</span>
                    </div>
                </div>
                <div class="rep-progress-wrap profile-completion-bar">
                    <div class="rep-progress-fill" style="width:${percent}%"></div>
                </div>
                <div class="profile-completion-checks">
                    ${checks.map((c) => `<span class="profile-check-item ${c.done ? 'done' : ''}"><i class="fa-solid fa-${c.done ? 'check' : 'circle'}"></i>${esc(c.label)}</span>`).join('')}
                </div>
            </div>`;
    }

    function renderStatsGrid(session) {
        const st = session.profile?.stats || {};
        const items = [
            { label: 'Posts', value: st.posts, icon: 'fa-file-lines' },
            { label: 'Followers', value: st.followers, icon: 'fa-users' },
            { label: 'Following', value: st.following, icon: 'fa-user-plus' },
            { label: 'Likes received', value: st.likesReceived, icon: 'fa-heart' },
            { label: 'Comments received', value: st.commentsReceived, icon: 'fa-comments' },
            { label: 'Reputation earned', value: (st.reputationEarned || session.reputationScore || 0).toLocaleString(), icon: 'fa-star' }
        ];
        return items
            .map(
                (it) => `
            <div class="profile-stat-cell">
                <span class="profile-stat-icon"><i class="fa-solid ${it.icon}"></i></span>
                <span class="profile-stat-value">${esc(String(it.value ?? 0))}</span>
                <span class="profile-stat-label">${esc(it.label)}</span>
            </div>`
            )
            .join('');
    }

    function renderRepChart(session) {
        const hist = session.profile?.reputationHistory || [];
        if (!hist.length) return '<p class="text-muted small mb-0">Reputation history will appear as you earn rep.</p>';
        const max = Math.max(...hist.map((h) => h.score), 1);
        return `
            <div class="profile-rep-chart" role="img" aria-label="Reputation growth chart">
                ${hist
                    .map((h, i) => {
                        const pct = Math.max(8, (h.score / max) * 100);
                        const lbl = h.month.slice(5) + '/' + h.month.slice(2, 4);
                        return `
                    <div class="profile-rep-bar-col" title="${esc(lbl)}: ${h.score.toLocaleString()} rep">
                        <span class="profile-rep-bar-val">${h.score >= 1000 ? Math.round(h.score / 1000) + 'k' : h.score}</span>
                        <div class="profile-rep-bar-track"><div class="profile-rep-bar-fill" style="height:${pct}%"></div></div>
                        <span class="profile-rep-bar-lbl">${esc(lbl)}</span>
                    </div>`;
                    })
                    .join('')}
            </div>`;
    }

    function renderAchievements(session) {
        return ACHIEVEMENTS.map((a) => {
            const unlocked = a.check(session);
            return `
                <span class="profile-achievement ${unlocked ? 'unlocked' : 'locked'}" title="${esc(a.label)}">
                    <i class="fa-solid ${a.icon}"></i>
                    <span>${esc(a.label)}</span>
                </span>`;
        }).join('');
    }

    function renderFeaturedSale(session) {
        const sale = session.profile?.featuredSale;
        if (!sale || !sale.domain) {
            return '<p class="text-muted small mb-0">Add a featured sale in Settings to highlight your best deal.</p>';
        }
        const price = Number(sale.price) || 0;
        const priceStr = price >= 1000 ? '$' + price.toLocaleString() : '$' + price;
        const shot = sale.screenshotUrl
            ? `<img src="${esc(sale.screenshotUrl)}" alt="" class="profile-sale-shot" loading="lazy" decoding="async">`
            : '';
        return `
            <div class="profile-featured-sale">
                <div class="profile-sale-highlight">
                    <i class="fa-solid fa-sack-dollar"></i>
                    <span class="profile-sale-price-lg">${esc(priceStr)}</span>
                </div>
                ${shot}
                <div class="profile-sale-grid small">
                    <div><span class="text-muted d-block">Domain</span><span class="font-weight-bold text-dark">${esc(sale.domain)}</span></div>
                    <div><span class="text-muted d-block">Year</span><span class="font-weight-bold">${esc(String(sale.year || '—'))}</span></div>
                </div>
                ${sale.description ? `<p class="text-muted small mb-0 mt-3">${esc(sale.description)}</p>` : ''}
            </div>`;
    }

    function renderSocialLinks(session) {
        const links = session.profile?.socialLinks || {};
        const items = [];
        if (links.linkedin) items.push({ icon: 'fa-brands fa-linkedin', url: links.linkedin, label: 'LinkedIn' });
        if (links.x) items.push({ icon: 'fa-brands fa-x-twitter', url: links.x, label: 'X' });
        if (links.website || session.profile?.portfolioWebsite) {
            items.push({ icon: 'fa-solid fa-globe', url: links.website || session.profile.portfolioWebsite, label: 'Website' });
        }
        if (!items.length) return '';
        return `<div class="profile-social-links">${items.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" class="profile-social-btn" title="${esc(l.label)}"><i class="${l.icon}"></i></a>`).join('')}</div>`;
    }

    function renderMemberInfo(session) {
        const profile = session.profile || {};
        const roleLabel = window.ROLE_LABEL ? window.ROLE_LABEL[session.role] || 'Member' : 'Domain Investor';
        const since = profile.memberSince
            ? new Date(profile.memberSince + 'T12:00:00').toLocaleString(undefined, { month: 'long', year: 'numeric' })
            : '—';
        const country = profile.country ? esc(profile.country) : '';
        const exp = getExperienceLabel(profile.experienceYears);
        const site = profile.portfolioWebsite || '';
        const siteHtml = site
            ? `<p class="text-muted small mb-1"><i class="fa-solid fa-link mr-1"></i><a href="${esc(site)}" target="_blank" rel="noopener noreferrer" class="text-primary font-weight-bold">${esc(site.replace(/^https?:\/\//i, ''))}</a></p>`
            : '';
        return `
            <p class="text-muted small mb-1"><i class="fa-regular fa-calendar mr-1"></i> Member since ${esc(since)}</p>
            ${country ? `<p class="text-muted small mb-1"><i class="fa-solid fa-location-dot mr-1"></i> ${country}</p>` : ''}
            <p class="text-muted small mb-1"><i class="fa-solid fa-user-tag mr-1"></i> ${esc(roleLabel)}</p>
            <p class="text-muted small mb-1"><i class="fa-solid fa-chart-line mr-1"></i> <span class="font-weight-bold text-dark">${esc(exp.label)}</span> — ${esc(exp.sub)}</p>
            ${siteHtml}`;
    }

    function renderHofBanner(session) {
        if (!session.isHofMember) return '';
        return `
            <div class="profile-hof-banner">
                <i class="fa-solid fa-crown text-warning mr-2"></i>
                <span class="font-weight-bold">Hall of Fame Member</span>
                <span class="small text-muted ml-2">Elite domain community recognition</span>
            </div>`;
    }

    function renderProfileActions(session, isSelf) {
        if (!isSelf) {
            return `
                <div class="profile-actions d-flex flex-wrap mt-3" style="gap:8px;">
                    <button type="button" class="btn btn-sm btn-primary font-weight-bold" style="background:var(--nv-primary);border-color:var(--nv-primary);" onclick="NamvioProfile.followUser(this)">Follow</button>
                    <button type="button" class="btn btn-sm btn-light border font-weight-bold" onclick="NamvioProfile.messageUser()"><i class="fa-solid fa-envelope mr-1"></i>Message</button>
                    <button type="button" class="btn btn-sm btn-light border font-weight-bold" onclick="NamvioProfile.shareProfile()">Share profile</button>
                    <button type="button" class="btn btn-sm btn-link text-muted" onclick="NamvioProfile.reportUser()">Report user</button>
                </div>`;
        }
        return `
            <div class="profile-actions d-flex flex-wrap mt-3" style="gap:8px;">
                <button type="button" class="btn btn-sm btn-primary font-weight-bold" style="background:var(--nv-primary);border-color:var(--nv-primary);" onclick="routeView('settings', this); return false;">Edit profile</button>
                <button type="button" class="btn btn-sm btn-light border font-weight-bold" onclick="NamvioProfile.shareProfile()">Share profile</button>
            </div>`;
    }

    function renderTabPosts(session) {
        const posts = session.posts || [];
        if (!posts.length) {
            return '<div class="profile-empty-state"><i class="fa-solid fa-pen"></i><p>No posts yet. Share domain intel from Home.</p></div>';
        }
        return posts
            .map(
                (p) => `
            <article class="profile-tab-post">
                <span class="profile-tab-post-time">${esc(p.time || 'Recent')}</span>
                <p class="profile-tab-post-body">${esc(p.body || '')}</p>
            </article>`
            )
            .join('');
    }

    function renderTabMedia(session) {
        const domains = new Set();
        (session.posts || []).forEach((p) => {
            (p.domains || []).forEach((d) => domains.add(d));
        });
        (session.portfolio || []).forEach((d) => domains.add(d));
        if (!domains.size) return '<p class="text-muted small py-3 text-center mb-0">No media domains yet.</p>';
        return `<div class="d-flex flex-wrap py-2" style="gap:8px;">${[...domains].map((d) => `<span class="domain-chip">${esc(d)}</span>`).join('')}</div>`;
    }

    function renderTabAbout(session) {
        const settings = session.settings || {};
        return `
            <div class="py-2">
                <p class="text-dark small">${esc(settings.bio || '—')}</p>
                ${renderMemberInfo(session)}
                <hr class="my-3">
                <h6 class="font-weight-bold text-muted text-uppercase small mb-2">Portfolio snapshot</h6>
                <div id="identity-portfolio-wrap-tab"></div>
            </div>`;
    }

    const TAB_RENDERERS = {
        posts: (s) => renderTabPosts(s),
        media: (s) => renderTabMedia(s),
        achievements: (s) => `<div class="profile-achievements-grid">${renderAchievements(s)}</div>`,
        sales: (s) => renderFeaturedSale(s),
        about: (s) => renderTabAbout(s)
    };

    function renderTab(session, tabId, force) {
        const pane = document.querySelector(`[data-profile-pane="${tabId}"]`);
        if (!pane) return;
        const sig = sessionSig(session) + ':' + tabId;
        if (!force && _tabsBuilt[tabId] === sig) return;
        _tabsBuilt[tabId] = sig;
        const fn = TAB_RENDERERS[tabId];
        setHtml(pane, fn ? fn(session) : '');
        if (tabId === 'about' && window.renderPortfolio) {
            window.renderPortfolio();
            const tabWrap = document.getElementById('identity-portfolio-wrap-tab');
            const mainWrap = document.getElementById('identity-portfolio-wrap');
            if (tabWrap && mainWrap) tabWrap.innerHTML = mainWrap.innerHTML;
        }
    }

    function switchTab(tabId) {
        document.querySelectorAll('.profile-tab-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.profileTab === tabId);
        });
        document.querySelectorAll('.profile-tab-pane').forEach((pane) => {
            const show = pane.dataset.profilePane === tabId;
            pane.classList.toggle('d-none', !show);
            if (show) pane.classList.add('profile-tab-pane-animated');
        });
        const session = window.activeSessionState;
        if (session) renderTab(session, tabId, false);
    }

    function initLazySections(session) {
        if (lazyObserver) return;
        lazyObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (!e.isIntersecting) return;
                    e.target.classList.add('profile-lazy-visible');
                    const s = window.activeSessionState;
                    if (!s) return;
                    if (e.target.id === 'profile-section-chart') {
                        setHtml(document.getElementById('identity-rep-chart'), renderRepChart(s));
                    }
                    lazyObserver.unobserve(e.target);
                });
            },
            { rootMargin: '120px', threshold: 0.01 }
        );
        document.querySelectorAll('.profile-lazy-section').forEach((el) => lazyObserver.observe(el));
    }

    function render(session, opts) {
        if (!session) return;
        normalizeProfile(session);
        const isSelf = opts?.isSelf !== false;
        const force = !!(opts && opts.force);
        const visible = isProfileViewVisible();

        if (!visible && !force) {
            _renderSig = '';
            return;
        }

        const sig = sessionSig(session);
        if (!force && sig === _renderSig) {
            return;
        }
        _renderSig = sig;
        _tabsBuilt = {};

        const exp = getExperienceLabel(session.profile.experienceYears);
        setHtml(document.getElementById('identity-verify-badges'), renderVerificationBadges(session));
        const expEl = document.getElementById('identity-experience-line');
        if (expEl) {
            expEl.innerHTML = `<span class="identity-badge badge-investor">${esc(exp.label)}</span><span class="text-muted small ml-1">${esc(exp.sub)}</span>`;
        }

        setHtml(document.getElementById('identity-founder-pass-wrap'), renderFounderPass(session));
        setHtml(document.getElementById('identity-member-chips'), renderMemberChips(session));
        setHtml(document.getElementById('identity-hero-metrics'), renderHeroMetrics(session));
        setHtml(document.getElementById('identity-trust-wrap'), renderTrustBlock(session));
        setHtml(document.getElementById('identity-completion-wrap'), renderCompletion(session));
        setHtml(document.getElementById('identity-stats-grid'), renderStatsGrid(session));
        setHtml(document.getElementById('identity-featured-sale-wrap'), renderFeaturedSale(session));
        setHtml(document.getElementById('identity-hof-wrap'), renderHofBanner(session));
        setHtml(document.getElementById('identity-social-wrap'), renderSocialLinks(session));
        setHtml(document.getElementById('identity-actions-wrap'), renderProfileActions(session, isSelf));
        setHtml(document.getElementById('identity-pinned-wrap'), renderPinnedPreview(session));

        if (window.NamvioReputation && document.getElementById('identity-reputation-block')) {
            setHtml(
                document.getElementById('identity-reputation-block'),
                NamvioReputation.renderProfileBlock(session.reputationScore)
            );
        }

        setHtml(document.getElementById('identity-rep-chart'), renderRepChart(session));

        const activeTab =
            document.querySelector('.profile-tab-btn.active')?.dataset.profileTab || 'posts';
        renderTab(session, activeTab, true);

        requestAnimationFrame(() => initLazySections(session));
    }

    function renderPinnedPreview(session) {
        const id = session.profile?.pinnedPostId;
        if (!id) return '';
        const keyFn = window.getPostKey || ((p) => p.id);
        const post = (session.posts || []).find((p) => keyFn(p) === id);
        if (!post) return '';
        return `
            <div class="profile-pinned-preview mt-3">
                <i class="fa-solid fa-thumbtack"></i>
                <span><strong>Pinned</strong> — ${esc((post.body || '').slice(0, 100))}${(post.body || '').length > 100 ? '…' : ''}</span>
            </div>`;
    }

    function pinPost(postKey) {
        const session = window.activeSessionState;
        if (!session?.profile) return;
        session.profile.pinnedPostId = session.profile.pinnedPostId === postKey ? null : postKey;
        if (window.saveSession) window.saveSession();
        if (window.initFeed) window.initFeed();
        _renderSig = '';
        _tabsBuilt = {};
        render(session, { force: true });
        alert(session.profile.pinnedPostId ? 'Post pinned to your profile & feed.' : 'Post unpinned.');
    }

    function shareProfile() {
        if (window.NamvioShare) {
            NamvioShare.openProfile();
            return;
        }
        const session = window.activeSessionState;
        const text = (session?.displayName || 'Member') + ' on Namvio Social — ' + (session?.handle || '');
        alert(text);
    }

    function followUser(btn) {
        if (!btn) return;
        const following = btn.dataset.following === '1';
        if (!following) {
            if (window.NamvioModeration && window.activeSessionState) {
                NamvioModeration.recordMassFollow(window.activeSessionState);
            }
            if (window.nvApplyRep) nvApplyRep('GAIN_FOLLOWER', { note: 'Profile follow' });
            const session = window.activeSessionState;
            if (session?.profile?.stats) session.profile.stats.followers = (session.profile.stats.followers || 0) + 1;
            if (window.saveSession) window.saveSession();
            _renderSig = '';
            if (session) render(session, { force: true });
        }
        btn.textContent = following ? 'Follow' : 'Following';
        btn.dataset.following = following ? '0' : '1';
    }

    function messageUser() {
        if (typeof window.startMesageWith === 'function') {
            window.startMesageWith('rahul', null);
            return;
        }
        if (typeof window.routeView === 'function') window.routeView('mesages');
    }

    function reportUser() {
        const session = window.activeSessionState;
        const handle = session?.handle || '@user';
        if (window.NamvioReportUser) {
            NamvioReportUser(handle);
            return;
        }
        alert('User report submitted. Moderators will review.');
    }

    function renderPinnedFeedCard(session) {
        const id = session.profile?.pinnedPostId;
        if (!id || !window.renderPostCard) return '';
        const keyFn = window.getPostKey || ((p) => p.id);
        const post = (session.posts || []).find((p) => keyFn(p) === id);
        if (!post) return '';
        const card = window.renderPostCard(
            {
                ...post,
                author: session.displayName,
                handle: session.handle,
                role: session.role,
                reputation: session.reputationScore,
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'
            },
            true
        );
        return `<div class="profile-pinned-feed-label small font-weight-bold text-primary mb-2"><i class="fa-solid fa-thumbtack mr-1"></i> Pinned post</div>${card}`;
    }

    return {
        defaultProfile,
        normalizeProfile,
        render,
        switchTab,
        pinPost,
        shareProfile,
        followUser,
        messageUser,
        reportUser,
        computeTrustScore,
        computeProfileCompletion,
        renderPinnedFeedCard,
        deriveVerificationBadges
    };
})();

window.NamvioProfile = NamvioProfile;