const fs = require('fs');
const p = require('path').join(__dirname, '..', 'assets/css/custom-style.css');
const extra = `

/* Legal Center — enhanced organization & motion */
.lg-page-hero-icon { animation: lg-icon-glow 4s ease-in-out infinite; }
@keyframes lg-icon-glow {
    0%, 100% { box-shadow: 0 8px 20px rgba(30, 64, 175, 0.12); }
    50% { box-shadow: 0 10px 28px rgba(30, 64, 175, 0.22); }
}
.lg-kpi-card--policies { border-top: 3px solid #1e40af; }
.lg-kpi-card--cats { border-top: 3px solid #6366f1; }
.lg-kpi-card--date { border-top: 3px solid #0891b2; }
.lg-kpi-card--demo { border-top: 3px solid #94a3b8; }
.lg-accordion-head-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    margin-left: auto;
    flex-shrink: 0;
}
.lg-accordion-toolbar { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.lg-toolbar-btn {
    font-size: 11px !important;
    border-radius: 8px !important;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.lg-toolbar-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(30, 64, 175, 0.1); }
.lg-cat-count {
    margin-left: auto;
    font-size: 10px;
    font-weight: 800;
    min-width: 22px;
    height: 22px;
    line-height: 22px;
    text-align: center;
    border-radius: 999px;
    background: #f1f5f9;
    color: var(--nv-text-muted);
    padding: 0 6px;
}
.lg-cat-btn.active .lg-cat-count { background: rgba(30, 64, 175, 0.12); color: #1e40af; }
.lg-policy-toggle {
    display: flex !important;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: left !important;
    padding-right: 36px !important;
}
.lg-policy-num {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    line-height: 28px;
    text-align: center;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 800;
    color: #1e40af;
    background: #eff6ff;
    border: 1px solid rgba(30, 64, 175, 0.15);
}
.lg-policy-title-text { flex: 1; min-width: 0; padding-right: 8px; }
.lg-policy-cat-badge {
    flex-shrink: 0;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.35px;
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid var(--nv-border);
    background: #f8fafc;
    color: var(--nv-text-muted);
}
.lg-policy-cat-badge--core { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
.lg-policy-cat-badge--payments { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
.lg-policy-cat-badge--content { background: #fef3c7; color: #b45309; border-color: #fde68a; }
.lg-policy-cat-badge--security { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.lg-policy-cat-badge--platform { background: #f5f3ff; color: #6d28d9; border-color: #ddd6fe; }
.lg-policy-cat-badge--liability { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }
.lg-policy-item.lg-policy-open {
    border-color: rgba(30, 64, 175, 0.28);
    box-shadow: 0 6px 18px rgba(30, 64, 175, 0.08);
}
.lg-policy-item.lg-policy-open .lg-policy-header {
    border-bottom-color: rgba(30, 64, 175, 0.12);
    background: linear-gradient(180deg, #eff6ff 0%, #fff 100%);
}
.lg-policy-item.lg-policy-open .lg-policy-num {
    background: #1e40af;
    color: #fff;
    border-color: #1e40af;
}
.lg-policy-body { animation: lg-body-in 0.28s ease; }
@keyframes lg-body-in {
    from { opacity: 0.6; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
}
@media (max-width: 767.98px) {
    .lg-accordion-head { flex-wrap: wrap; }
    .lg-accordion-head-actions { width: 100%; align-items: stretch; margin-left: 0; }
    .lg-accordion-toolbar { justify-content: flex-start; }
    .lg-policy-cat-badge { display: none; }
}
`;
if (!fs.readFileSync(p, 'utf8').includes('lg-accordion-head-actions')) {
    fs.appendFileSync(p, extra);
    console.log('appended legal enhancements');
} else {
    console.log('already present');
}