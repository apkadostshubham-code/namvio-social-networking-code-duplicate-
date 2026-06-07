/**
 * Namvio Social — Enterprise Moderation System
 * Risk scoring, queues, admin actions, moderation_logs persistence
 */
const NamvioModeration = (function () {
    const STATE_KEY = 'namvio_moderation_state_v1';
    const ADMIN_EMAIL = 'apkadostshubham@gmail.com';

    const RISK_BANDS = [
        { min: 0, max: 20, label: 'Safe', slug: 'safe', action: 'No action' },
        { min: 21, max: 40, label: 'Low Risk', slug: 'low', action: 'Monitor' },
        { min: 41, max: 60, label: 'Medium Risk', slug: 'medium', action: 'Content review queue' },
        { min: 61, max: 80, label: 'High Risk', slug: 'high', action: 'Temporary visibility reduction' },
        { min: 81, max: 100, label: 'Critical', slug: 'critical', action: 'Auto shadow ban and admin review' }
    ];

    const RISK_FACTORS = {
        REPEATED_POSTING: 10,
        SAME_CONTENT: 15,
        MASS_FOLLOWING: 10,
        MASS_MESSAGING: 20,
        SUSPICIOUS_LINKS: 15,
        MULTIPLE_REPORTS: 20,
        NEW_ACCOUNT: 10
    };

    const SUSPICIOUS_LINK =
        /(?:bit\.ly|tinyurl|t\.co|goo\.gl|telegram\.me|t\.me\/|whatsapp\.com|send money|wire transfer|crypto wallet)/i;

    function defaultState() {
        return {
            reports: [],
            moderation_logs: [],
            pendingReviews: [],
            reportedUsers: [],
            reportedPosts: [],
            shadowBannedUsers: [],
            suspendedUsers: []
        };
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STATE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return { ...defaultState(), ...parsed };
            }
        } catch (_) { /* ignore */ }
        return defaultState();
    }

    function saveState(state) {
        try {
            localStorage.setItem(STATE_KEY, JSON.stringify(state));
        } catch (_) { /* quota */ }
    }

    function newId(prefix) {
        return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    }

    function isAdmin(session) {
        return (session && session.email || '').toLowerCase() === ADMIN_EMAIL;
    }

    function getRiskBand(score) {
        const s = Math.min(100, Math.max(0, Number(score) || 0));
        return RISK_BANDS.find((b) => s >= b.min && s <= b.max) || RISK_BANDS[0];
    }

    function ensureModerationSession(session) {
        if (!session.moderation) {
            session.moderation = {
                riskScore: 0,
                accountCreatedAt: Date.now() - 86400000 * 30,
                recentPosts: [],
                recentFollows: [],
                recentMessages: [],
                reportCount: 0,
                isSuspended: false,
                suspensionUntil: null,
                warnedAt: null
            };
        }
        return session.moderation;
    }

    function accountAgeDays(session) {
        const mod = ensureModerationSession(session);
        const created = mod.accountCreatedAt || Date.now();
        return (Date.now() - created) / 86400000;
    }

    function calculateRiskScore(session, context) {
        const mod = ensureModerationSession(session);
        let score = mod.riskScore || 0;
        const ctx = context || {};

        if (ctx.repeatedPosting) score += RISK_FACTORS.REPEATED_POSTING;
        if (ctx.sameContent) score += RISK_FACTORS.SAME_CONTENT;
        if (ctx.massFollowing) score += RISK_FACTORS.MASS_FOLLOWING;
        if (ctx.massMessaging) score += RISK_FACTORS.MASS_MESSAGING;
        if (ctx.suspiciousLinks) score += RISK_FACTORS.SUSPICIOUS_LINKS;
        if (ctx.multipleReports) score += RISK_FACTORS.MULTIPLE_REPORTS;
        if (accountAgeDays(session) < 7) score += RISK_FACTORS.NEW_ACCOUNT;

        score = Math.min(100, Math.max(0, score));
        mod.riskScore = score;
        return { score, band: getRiskBand(score) };
    }

    function analyzePostContent(session, text) {
        const mod = ensureModerationSession(session);
        const body = (text || '').trim();
        const now = Date.now();
        const ctx = { suspiciousLinks: SUSPICIOUS_LINK.test(body) };

        mod.recentPosts = (mod.recentPosts || []).filter((p) => now - p.at < 3600000);
        const sameRecent = mod.recentPosts.filter((p) => p.body === body).length;
        if (mod.recentPosts.length >= 4) ctx.repeatedPosting = true;
        if (sameRecent >= 1 && body.length > 10) ctx.sameContent = true;

        mod.recentPosts.unshift({ body, at: now });
        mod.recentPosts = mod.recentPosts.slice(0, 12);

        const result = calculateRiskScore(session, ctx);
        applyRiskActions(session, result.band);
        return result;
    }

    function recordMassFollow(session) {
        const mod = ensureModerationSession(session);
        const now = Date.now();
        mod.recentFollows = (mod.recentFollows || []).filter((t) => now - t < 600000);
        mod.recentFollows.push(now);
        if (mod.recentFollows.length >= 5) {
            return calculateRiskScore(session, { massFollowing: true });
        }
        return calculateRiskScore(session, {});
    }

    function recordMassMessage(session) {
        const mod = ensureModerationSession(session);
        const now = Date.now();
        mod.recentMessages = (mod.recentMessages || []).filter((t) => now - t < 300000);
        mod.recentMessages.push(now);
        if (mod.recentMessages.length >= 8) {
            return calculateRiskScore(session, { massMessaging: true });
        }
        return calculateRiskScore(session, {});
    }

    function applyRiskActions(session, band) {
        if (!session || !band) return;
        if (band.slug === 'high') {
            session.visibilityReduced = true;
        }
        if (band.slug === 'critical') {
            session.isShadowBanned = true;
            session.visibilityReduced = true;
            const state = loadState();
            const uid = session.handle || session.email;
            if (!state.shadowBannedUsers.includes(uid)) {
                state.shadowBannedUsers.push(uid);
                saveState(state);
            }
            logModeration('AUTO_SHADOW_BAN', uid, 'Critical risk threshold reached');
        }
    }

    function logModeration(action, target, notes, adminEmail) {
        const state = loadState();
        const entry = {
            id: newId('mlog'),
            action,
            target,
            notes: notes || '',
            adminEmail: adminEmail || ADMIN_EMAIL,
            createdAt: new Date().toISOString()
        };
        state.moderation_logs.unshift(entry);
        state.moderation_logs = state.moderation_logs.slice(0, 300);
        saveState(state);
        return entry;
    }

    function fileReport(session, payload) {
        const state = loadState();
        const report = {
            id: newId('rep'),
            type: payload.type || 'post',
            targetId: payload.targetId,
            targetLabel: payload.targetLabel || '',
            reason: payload.reason || 'Other',
            reporter: session.handle || 'anonymous',
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        state.reports.unshift(report);
        if (report.type === 'user') {
            if (!state.reportedUsers.find((r) => r.targetId === report.targetId)) {
                state.reportedUsers.push({ ...report, reports: 1 });
            } else {
                state.reportedUsers.forEach((r) => {
                    if (r.targetId === report.targetId) r.reports = (r.reports || 1) + 1;
                });
            }
        } else {
            if (!state.reportedPosts.find((r) => r.targetId === report.targetId)) {
                state.reportedPosts.push({ ...report, reports: 1 });
            } else {
                state.reportedPosts.forEach((r) => {
                    if (r.targetId === report.targetId) r.reports = (r.reports || 1) + 1;
                });
            }
        }
        state.pendingReviews.push({
            id: newId('rev'),
            reportId: report.id,
            type: report.type,
            targetId: report.targetId,
            targetLabel: report.targetLabel,
            status: 'pending',
            createdAt: report.createdAt
        });
        saveState(state);

        const mod = ensureModerationSession(session);
        mod.reportCount = (mod.reportCount || 0) + 1;
        calculateRiskScore(session, { multipleReports: state.reports.filter((r) => r.status === 'pending').length >= 3 });

        return report;
    }

    function seedDemoQueueIfEmpty() {
        const state = loadState();
        if (state.reports.length > 0) return state;
        state.reports = [
            {
                id: 'rep_seed_1',
                type: 'post',
                targetId: 'seed_1',
                targetLabel: 'Maya Chen — Voice.ai post',
                reason: 'Suspected spam',
                reporter: '@jok_registrar',
                status: 'pending',
                createdAt: new Date(Date.now() - 7200000).toISOString()
            },
            {
                id: 'rep_seed_2',
                type: 'user',
                targetId: '@spam_domains',
                targetLabel: '@spam_domains',
                reason: 'Scam links in bio',
                reporter: '@rahul_domains',
                status: 'pending',
                createdAt: new Date(Date.now() - 3600000).toISOString()
            }
        ];
        state.reportedPosts = [{ targetId: 'seed_1', targetLabel: 'Maya Chen post', reports: 2, status: 'pending' }];
        state.reportedUsers = [{ targetId: '@spam_domains', targetLabel: '@spam_domains', reports: 3, status: 'pending' }];
        state.pendingReviews = state.reports.map((r) => ({
            id: 'rev_' + r.id,
            reportId: r.id,
            type: r.type,
            targetId: r.targetId,
            targetLabel: r.targetLabel,
            status: 'pending',
            createdAt: r.createdAt
        }));
        state.shadowBannedUsers = ['@shadow_demo'];
        state.suspendedUsers = [];
        saveState(state);
        return state;
    }

    function adminAction(session, action, targetId, notes) {
        if (!isAdmin(session)) return { ok: false, message: 'Unauthorized' };
        const state = loadState();
        const esc = window.escapeHtml || ((x) => String(x));

        switch (action) {
            case 'approve':
                resolveReview(state, targetId, 'approved', notes);
                break;
            case 'reject':
                resolveReview(state, targetId, 'rejected', notes);
                break;
            case 'warn':
                logModeration('WARN', targetId, notes, session.email);
                break;
            case 'delete_content':
                logModeration('DELETE_CONTENT', targetId, notes, session.email);
                if (window.NamvioReputation) {
                    NamvioReputation.applyChange(session, 'POST_REMOVED_BY_MODERATOR', {
                        actor: 'admin',
                        note: 'Content removed: ' + targetId
                    });
                }
                break;
            case 'shadow_ban':
                if (!state.shadowBannedUsers.includes(targetId)) state.shadowBannedUsers.push(targetId);
                if ((session.handle || '') === targetId || targetId === 'self') session.isShadowBanned = true;
                logModeration('SHADOW_BAN', targetId, notes, session.email);
                break;
            case 'suspend':
                if (!state.suspendedUsers.includes(targetId)) state.suspendedUsers.push(targetId);
                session.isSuspended = targetId === 'self' || targetId === session.handle;
                if (window.NamvioReputation) {
                    NamvioReputation.applyChange(session, 'ACCOUNT_SUSPENSION', {
                        actor: 'admin',
                        note: notes
                    });
                }
                logModeration('SUSPEND', targetId, notes, session.email);
                break;
            case 'permanent_ban':
                state.suspendedUsers.push(targetId);
                logModeration('PERMANENT_BAN', targetId, notes, session.email);
                if (window.NamvioReputation) {
                    NamvioReputation.applyChange(session, 'ACCOUNT_SUSPENSION', { actor: 'admin', note: 'Permanent ban' });
                }
                break;
            case 'lift_shadow':
                state.shadowBannedUsers = state.shadowBannedUsers.filter((u) => u !== targetId);
                if (targetId === 'self' || targetId === session.handle) session.isShadowBanned = false;
                logModeration('LIFT_SHADOW', targetId, notes, session.email);
                break;
            case 'confirm_report':
                if (window.NamvioReputation) {
                    NamvioReputation.applyChange(session, 'REPORT_CONFIRMED_VALID', {
                        actor: 'admin',
                        note: 'Report confirmed against ' + targetId
                    });
                }
                resolveReview(state, targetId, 'confirmed', notes);
                break;
            case 'spam_detected':
                if (window.NamvioReputation) {
                    NamvioReputation.applyChange(session, 'SPAM_DETECTED', { actor: 'admin', note: notes });
                }
                analyzePostContent(session, '');
                session.moderation.riskScore = Math.min(100, (session.moderation.riskScore || 0) + 50);
                applyRiskActions(session, getRiskBand(session.moderation.riskScore));
                logModeration('SPAM_DETECTED', targetId, notes, session.email);
                break;
            default:
                return { ok: false, message: 'Unknown action' };
        }
        saveState(state);
        if (typeof window.saveSession === 'function') window.saveSession();
        return { ok: true };
    }

    function resolveReview(state, targetId, status, notes) {
        state.pendingReviews.forEach((r) => {
            if (r.targetId === targetId || r.reportId === targetId) r.status = status;
        });
        state.reports.forEach((r) => {
            if (r.targetId === targetId || r.id === targetId) r.status = status;
        });
        logModeration('REVIEW_' + status.toUpperCase(), targetId, notes);
    }

    function renderRiskBadge(session) {
        const mod = ensureModerationSession(session);
        const band = getRiskBand(mod.riskScore || 0);
        const esc = window.escapeHtml || ((x) => String(x));
        return `<span class="mod-risk-pill mod-risk-${esc(band.slug)}" title="${esc(band.action)}">${esc(band.label)} · ${mod.riskScore || 0}</span>`;
    }

    function initDashboard(session) {
        if (!isAdmin(session)) return;
        seedDemoQueueIfEmpty();
        const state = loadState();
        const esc = window.escapeHtml || ((x) => String(x));

        const fillList = (elId, items, renderer) => {
            const el = document.getElementById(elId);
            if (!el) return;
            el.innerHTML = items.length
                ? items.map(renderer).join('')
                : '<p class="text-muted small mb-0">None</p>';
        };

        fillList(
            'mod-reported-users-list',
            state.reportedUsers,
            (r) => `
            <div class="mod-queue-item">
                <div class="flex-grow-1">
                    <strong>${esc(r.targetLabel || r.targetId)}</strong>
                    <span class="text-muted small d-block">${r.reports || 1} report(s) · ${esc(r.status || 'pending')}</span>
                </div>
                <div class="mod-action-btns">
                    <button class="btn btn-sm btn-success" onclick="NamvioModAdminAction('warn','${esc(r.targetId)}')">Warn</button>
                    <button class="btn btn-sm btn-warning" onclick="NamvioModAdminAction('shadow_ban','${esc(r.targetId)}')">Shadow</button>
                    <button class="btn btn-sm btn-danger" onclick="NamvioModAdminAction('suspend','${esc(r.targetId)}')">Suspend</button>
                </div>
            </div>`
        );

        fillList(
            'mod-reported-posts-list',
            state.reportedPosts,
            (r) => `
            <div class="mod-queue-item">
                <div class="flex-grow-1">
                    <strong>${esc(r.targetLabel || r.targetId)}</strong>
                    <span class="text-muted small d-block">${r.reports || 1} report(s)</span>
                </div>
                <div class="mod-action-btns">
                    <button class="btn btn-sm btn-outline-primary" onclick="NamvioModAdminAction('approve','${esc(r.targetId)}')">Approve</button>
                    <button class="btn btn-sm btn-danger" onclick="NamvioModAdminAction('delete_content','${esc(r.targetId)}')">Delete</button>
                    <button class="btn btn-sm btn-warning" onclick="NamvioModAdminAction('confirm_report','${esc(r.targetId)}')">Confirm</button>
                </div>
            </div>`
        );

        fillList(
            'mod-pending-reviews-list',
            state.pendingReviews.filter((r) => r.status === 'pending'),
            (r) => `
            <div class="mod-queue-item">
                <div class="flex-grow-1">
                    <strong>${esc(r.targetLabel || r.targetId)}</strong>
                    <span class="text-muted small d-block">${esc(r.type)} · ${new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <div class="mod-action-btns">
                    <button class="btn btn-sm btn-success" onclick="NamvioModAdminAction('approve','${esc(r.targetId)}')">Approve</button>
                    <button class="btn btn-sm btn-light border" onclick="NamvioModAdminAction('reject','${esc(r.targetId)}')">Reject</button>
                </div>
            </div>`
        );

        fillList(
            'mod-shadow-list',
            state.shadowBannedUsers.map((u) => ({ targetId: u, targetLabel: u })),
            (r) => `
            <div class="mod-queue-item">
                <span>${esc(r.targetLabel)}</span>
                <button class="btn btn-sm btn-outline-primary" onclick="NamvioModAdminAction('lift_shadow','${esc(r.targetId)}')">Lift ban</button>
            </div>`
        );

        fillList(
            'mod-suspended-list',
            state.suspendedUsers.map((u) => ({ targetId: u, targetLabel: u })),
            (r) => `
            <div class="mod-queue-item">
                <span>${esc(r.targetLabel)}</span>
                <button class="btn btn-sm btn-outline-danger" onclick="NamvioModAdminAction('permanent_ban','${esc(r.targetId)}')">Permanent ban</button>
            </div>`
        );

        const repLogsEl = document.getElementById('admin-rep-logs-list');
        if (repLogsEl && window.NamvioReputation) {
            repLogsEl.innerHTML = NamvioReputation.getAllLogs(30)
                .map(
                    (l) => `
                <tr>
                    <td class="small text-muted">${new Date(l.createdAt).toLocaleString()}</td>
                    <td><span class="badge badge-light border">${esc(l.eventType)}</span></td>
                    <td class="font-weight-bold ${l.delta >= 0 ? 'text-success' : 'text-danger'}">${l.delta >= 0 ? '+' : ''}${l.delta}</td>
                    <td>${(l.scoreAfter || 0).toLocaleString()}</td>
                </tr>`
                )
                .join('') || '<tr><td colspan="4" class="text-muted small">No reputation changes yet</td></tr>';
        }

        const logsEl = document.getElementById('mod-logs-list');
        if (logsEl) {
            logsEl.innerHTML = state.moderation_logs
                .slice(0, 25)
                .map(
                    (l) => `
                <tr>
                    <td class="small text-muted">${new Date(l.createdAt).toLocaleString()}</td>
                    <td><span class="badge badge-light border">${esc(l.action)}</span></td>
                    <td>${esc(l.target)}</td>
                    <td class="small">${esc(l.notes || '—')}</td>
                </tr>`
                )
                .join('');
        }

        const riskEl = document.getElementById('mod-admin-risk-display');
        if (riskEl) {
            const mod = ensureModerationSession(session);
            const band = getRiskBand(mod.riskScore || 0);
            riskEl.innerHTML = `${renderRiskBadge(session)} <span class="text-muted small ml-2">${esc(band.action)}</span>`;
        }
    }

    function syncAdminNav(session) {
        const show = isAdmin(session);
        document.querySelectorAll('[data-admin-only]').forEach((el) => {
            el.classList.toggle('d-none', !show);
        });
    }

    return {
        RISK_BANDS,
        RISK_FACTORS,
        isAdmin,
        getRiskBand,
        calculateRiskScore,
        analyzePostContent,
        recordMassFollow,
        recordMassMessage,
        fileReport,
        adminAction,
        logModeration,
        renderRiskBadge,
        initDashboard,
        syncAdminNav,
        loadState,
        seedDemoQueueIfEmpty,
        ensureModerationSession
    };
})();

function NamvioModAdminAction(action, targetId) {
    if (!window.activeSessionState && typeof activeSessionState !== 'undefined') {
        window.activeSessionState = activeSessionState;
    }
    const session = window.activeSessionState || (typeof activeSessionState !== 'undefined' ? activeSessionState : null);
    const notes = prompt('Moderation note (optional):', '') || '';
    const res = NamvioModeration.adminAction(session, action, targetId, notes);
    if (res.ok) {
        NamvioModeration.initDashboard(session);
        if (typeof syncIdentityUI === 'function') syncIdentityUI();
        if (typeof initFeed === 'function') initFeed();
        alert('Action recorded: ' + action);
    } else {
        alert(res.message || 'Action failed');
    }
}

const NV_REPORT_REASONS = [
    'Spam',
    'Harassment',
    'Scam',
    'Fake Information',
    'Impersonation',
    'Other'
];

function pickReportReason(contextLabel) {
    const menu =
        'Select report reason (enter number):\n' +
        NV_REPORT_REASONS.map((r, i) => `${i + 1}. ${r}`).join('\n');
    const raw = prompt(menu, '1');
    if (raw === null) return null;
    const idx = parseInt(raw, 10) - 1;
    if (idx >= 0 && idx < NV_REPORT_REASONS.length) return NV_REPORT_REASONS[idx];
    const match = NV_REPORT_REASONS.find((r) => r.toLowerCase() === String(raw).toLowerCase().trim());
    return match || 'Other';
}

function NamvioReportPost(postId, label) {
    const session = window.activeSessionState || activeSessionState;
    const reason = pickReportReason('post');
    if (!reason) return;
    NamvioModeration.fileReport(session, {
        type: 'post',
        targetId: postId,
        targetLabel: label || postId,
        reason
    });
    alert('Report submitted (' + reason + '). Namvio moderators will review it.');
}

function NamvioReportUser(handle) {
    const session = window.activeSessionState || activeSessionState;
    const reason = pickReportReason('user');
    if (!reason) return;
    NamvioModeration.fileReport(session, {
        type: 'user',
        targetId: handle,
        targetLabel: handle,
        reason
    });
    alert('User report submitted (' + reason + '). Moderators will review it.');
}

window.NamvioModeration = NamvioModeration;
window.NamvioModAdminAction = NamvioModAdminAction;
window.NamvioReportPost = NamvioReportPost;
window.NamvioReportUser = NamvioReportUser;