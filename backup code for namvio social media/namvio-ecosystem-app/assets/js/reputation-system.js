/**
 * Namvio Social — Reputation System
 * Scoring rules, tiers, progress UI, reputation_logs persistence
 */
const NamvioReputation = (function () {
    const LOG_KEY = 'namvio_reputation_logs_v1';

    const RULES = {
        POST_CREATED: 5,
        COMMENT_CREATED: 2,
        POST_RECEIVES_LIKE: 1,
        COMMENT_RECEIVES_LIKE: 1,
        POST_RECEIVES_REPOST: 3,
        GAIN_FOLLOWER: 2,
        VERIFICATION_APPROVED: 100,
        FOUNDER_PASS_HOLDER: 50,
        HALL_OF_FAME_MEMBER: 500,
        REPORT_CONFIRMED_VALID: -20,
        SPAM_DETECTED: -50,
        POST_REMOVED_BY_MODERATOR: -30,
        ACCOUNT_SUSPENSION: -200,
        ADMIN_MANUAL_ADJUST: 0
    };

    const TIERS = [
        { min: 0, max: 99, name: 'New Member', slug: 'new' },
        { min: 100, max: 499, name: 'Active Member', slug: 'active' },
        { min: 500, max: 999, name: 'Trusted Member', slug: 'trusted' },
        { min: 1000, max: 4999, name: 'Respected Investor', slug: 'respected' },
        { min: 5000, max: 9999, name: 'Industry Contributor', slug: 'contributor' },
        { min: 10000, max: 24999, name: 'Industry Leader', slug: 'leader' },
        { min: 25000, max: Infinity, name: 'Domain Legend', slug: 'legend' }
    ];

    function loadLogs() {
        try {
            const raw = localStorage.getItem(LOG_KEY);
            if (raw) {
                const arr = JSON.parse(raw);
                return Array.isArray(arr) ? arr : [];
            }
        } catch (_) { /* ignore */ }
        return [];
    }

    function saveLogs(logs) {
        try {
            localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, 500)));
        } catch (_) { /* quota */ }
    }

    function newLogId() {
        return 'rlog_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    }

    function getTier(score) {
        const s = Math.max(0, Number(score) || 0);
        const tier = TIERS.find((t) => s >= t.min && s <= t.max) || TIERS[0];
        const next = TIERS.find((t) => t.min > s);
        const ceiling = next ? next.min : tier.max === Infinity ? s + 1 : tier.max + 1;
        const floor = tier.min;
        const range = ceiling - floor;
        const progress = range > 0 ? Math.min(100, Math.round(((s - floor) / range) * 100)) : 100;
        return {
            name: tier.name,
            slug: tier.slug,
            min: tier.min,
            max: tier.max,
            nextName: next ? next.name : null,
            nextAt: next ? next.min : null,
            progress
        };
    }

    function getRuleDelta(eventType, overrideDelta) {
        if (eventType === 'ADMIN_MANUAL_ADJUST' && typeof overrideDelta === 'number') {
            return overrideDelta;
        }
        return RULES[eventType] != null ? RULES[eventType] : 0;
    }

    /**
     * Apply reputation change for session user; writes to reputation_logs table (localStorage).
     */
    function applyChange(session, eventType, meta) {
        if (!session) return { ok: false };
        const userId = session.handle || session.email || 'user';
        const before = Math.max(0, Number(session.reputationScore) || 0);
        const override = meta && typeof meta.delta === 'number' ? meta.delta : null;
        const delta = getRuleDelta(eventType, override);
        const after = Math.max(0, before + delta);

        session.reputationScore = after;

        const entry = {
            id: newLogId(),
            userId,
            eventType,
            delta,
            scoreBefore: before,
            scoreAfter: after,
            meta: meta || {},
            actor: (meta && meta.actor) || 'system',
            createdAt: new Date().toISOString()
        };

        const logs = loadLogs();
        logs.unshift(entry);
        saveLogs(logs);

        return { ok: true, delta, before, after, entry, tier: getTier(after) };
    }

    function renderCompact(score, opts) {
        const s = Math.max(0, Number(score) || 0);
        const tier = getTier(s);
        const esc = (window.escapeHtml || ((x) => String(x))).bind(null);
        const showBar = opts && opts.showBar;
        const bar = showBar
            ? `<div class="rep-progress-mini mt-1" title="${esc(tier.nextName ? tier.progress + '% to ' + tier.nextName : 'Max tier')}">
                <div class="rep-progress-fill" style="width:${tier.progress}%"></div>
               </div>`
            : '';
        return `<span class="rep-inline" title="${esc(tier.name)}">
            <span class="rep-score-num">${s.toLocaleString()}</span>
            <span class="rep-tier-pill rep-tier-${esc(tier.slug)}">${esc(tier.name)}</span>
            ${bar}
        </span>`;
    }

    function renderProfileBlock(score) {
        const s = Math.max(0, Number(score) || 0);
        const tier = getTier(s);
        const esc = (window.escapeHtml || ((x) => String(x))).bind(null);
        const nextLabel = tier.nextName
            ? `${tier.progress}% to ${tier.nextName} (${(tier.nextAt || 0).toLocaleString()} rep)`
            : 'Maximum tier reached';
        return `
            <div class="rep-profile-block">
                <div class="d-flex justify-content-between align-items-end flex-wrap mb-2">
                    <div>
                        <span class="text-uppercase text-muted d-block small font-weight-bold">Reputation Score</span>
                        <span class="font-weight-bold text-primary h4 mb-0" id="identity-score-box">${s.toLocaleString()}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-uppercase text-muted d-block small font-weight-bold">Tier</span>
                        <span class="font-weight-bold text-dark h5 mb-0 rep-tier-pill rep-tier-${esc(tier.slug)}" id="identity-tier-name">${esc(tier.name)}</span>
                    </div>
                </div>
                <div class="rep-progress-wrap" title="${esc(nextLabel)}">
                    <div class="rep-progress-fill" id="identity-rep-progress" style="width:${tier.progress}%"></div>
                </div>
                <p class="text-muted small mb-0 mt-2" id="identity-rep-progress-label">${esc(nextLabel)}</p>
            </div>`;
    }

    function renderUserCard(score) {
        const s = Math.max(0, Number(score) || 0);
        const tier = getTier(s);
        const esc = (window.escapeHtml || ((x) => String(x))).bind(null);
        return `
            <div class="rep-user-card mt-2">
                <div class="d-flex justify-content-between align-items-center small">
                    <span class="font-weight-bold text-primary">${s.toLocaleString()} rep</span>
                    <span class="rep-tier-pill rep-tier-${esc(tier.slug)}">${esc(tier.name)}</span>
                </div>
                <div class="rep-progress-wrap mt-1">
                    <div class="rep-progress-fill" style="width:${tier.progress}%"></div>
                </div>
            </div>`;
    }

    function adminAdjust(session, delta, note) {
        return applyChange(session, 'ADMIN_MANUAL_ADJUST', {
            delta,
            actor: 'admin',
            note: note || 'Manual adjustment'
        });
    }

    function getLogsForUser(userId, limit) {
        const id = (userId || '').toLowerCase();
        return loadLogs()
            .filter((l) => (l.userId || '').toLowerCase() === id)
            .slice(0, limit || 50);
    }

    function getAllLogs(limit) {
        return loadLogs().slice(0, limit || 100);
    }

    function syncSessionFlags(session) {
        if (!session) return;
        if (session.isVerified && !session._repVerifiedGranted) {
            applyChange(session, 'VERIFICATION_APPROVED', { actor: 'system', note: 'Verification approved' });
            session._repVerifiedGranted = true;
        }
        if (session.subscription && session.subscription.planId === 'founder' && !session._repFounderGranted) {
            applyChange(session, 'FOUNDER_PASS_HOLDER', { actor: 'system', note: 'Founder pass active' });
            session._repFounderGranted = true;
        }
        if (session.isHofMember && !session._repHofGranted) {
            applyChange(session, 'HALL_OF_FAME_MEMBER', { actor: 'system', note: 'Hall of Fame member' });
            session._repHofGranted = true;
        }
    }

    return {
        RULES,
        TIERS,
        getTier,
        applyChange,
        renderCompact,
        renderProfileBlock,
        renderUserCard,
        adminAdjust,
        getLogsForUser,
        getAllLogs,
        loadLogs,
        syncSessionFlags
    };
})();

window.NamvioReputation = NamvioReputation;