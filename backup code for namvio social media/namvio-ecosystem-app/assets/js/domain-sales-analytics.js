/**
 * Namvio Domain Sales — analytics dashboard (charts, KPIs, full Top 100 table)
 */
(function (global) {
    const CHART_COLORS = [
        '#4f46e5',
        '#059669',
        '#d97706',
        '#0ea5e9',
        '#8b5cf6',
        '#ec4899',
        '#14b8a6',
        '#f59e0b',
        '#6366f1',
        '#64748b'
    ];

    function escapeHtml(s) {
        if (global.escapeHtml) return global.escapeHtml(s);
        const d = document.createElement('div');
        d.textContent = String(s ?? '');
        return d.innerHTML;
    }

    function formatMoneyFull(amount) {
        const v = Number(amount) || 0;
        return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }

    function formatCompact(amount) {
        if (global.formatSalePrice) return global.formatSalePrice(amount);
        const v = Number(amount) || 0;
        if (v >= 1e6) return '$' + (v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1) + 'M';
        if (v >= 1e3) return '$' + Math.round(v / 1e3) + 'k';
        return '$' + v;
    }

    function getSalesList(yearKey) {
        if (global.getFilteredDomainSales) return global.getFilteredDomainSales(yearKey || 'all');
        const byYear = global.NAMEBIO_SALES_BY_YEAR || {};
        const key = yearKey || 'all';
        return byYear[key] || global.NAMEBIO_TOP_SALES || [];
    }

    function getTld(domain) {
        const parts = String(domain || '').toLowerCase().split('.');
        if (parts.length < 2) return 'other';
        const last = parts[parts.length - 1];
        const prev = parts[parts.length - 2];
        if (['co', 'com', 'org', 'net', 'ac'].includes(prev) && last.length <= 3 && parts.length >= 3) {
            return '.' + prev + '.' + last;
        }
        return '.' + last;
    }

    function getLabelBase(domain) {
        const d = String(domain || '').toLowerCase();
        const idx = d.indexOf('.');
        return idx > 0 ? d.slice(0, idx) : d;
    }

    function getDomainLength(domain) {
        return getLabelBase(domain).replace(/[^a-z0-9]/gi, '').length;
    }

    function median(values) {
        if (!values.length) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    function computeMetrics(sales, yearKey) {
        const prices = sales.map((s) => s.price);
        const total = prices.reduce((a, b) => a + b, 0);
        const avg = sales.length ? total / sales.length : 0;
        const med = median(prices);
        const max = sales[0] || null;
        const min = sales[sales.length - 1] || null;

        const tiers = [
            { label: '$10M+', min: 1e7, count: 0, vol: 0 },
            { label: '$5M – $10M', min: 5e6, max: 1e7, count: 0, vol: 0 },
            { label: '$1M – $5M', min: 1e6, max: 5e6, count: 0, vol: 0 },
            { label: '$500K – $1M', min: 5e5, max: 1e6, count: 0, vol: 0 },
            { label: '$100K – $500K', min: 1e5, max: 5e5, count: 0, vol: 0 },
            { label: 'Under $100K', max: 1e5, count: 0, vol: 0 }
        ];
        sales.forEach((s) => {
            const p = s.price;
            if (p >= 1e7) {
                tiers[0].count++;
                tiers[0].vol += p;
            } else if (p >= 5e6) {
                tiers[1].count++;
                tiers[1].vol += p;
            } else if (p >= 1e6) {
                tiers[2].count++;
                tiers[2].vol += p;
            } else if (p >= 5e5) {
                tiers[3].count++;
                tiers[3].vol += p;
            } else if (p >= 1e5) {
                tiers[4].count++;
                tiers[4].vol += p;
            } else {
                tiers[5].count++;
                tiers[5].vol += p;
            }
        });

        const tldMap = new Map();
        sales.forEach((s) => {
            const t = getTld(s.domain);
            if (!tldMap.has(t)) tldMap.set(t, { count: 0, vol: 0 });
            const e = tldMap.get(t);
            e.count++;
            e.vol += s.price;
        });
        const tlds = [...tldMap.entries()]
            .map(([tld, d]) => ({ tld, ...d }))
            .sort((a, b) => b.vol - a.vol);

        const venueMap = new Map();
        sales.forEach((s) => {
            const v = (s.venue || 'Private').trim() || 'Private';
            if (!venueMap.has(v)) venueMap.set(v, { count: 0, vol: 0 });
            const e = venueMap.get(v);
            e.count++;
            e.vol += s.price;
        });
        const venues = [...venueMap.entries()]
            .map(([venue, d]) => ({ venue, ...d }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const monthMap = new Map();
        const quarterMap = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
        sales.forEach((s) => {
            const d = s.date || '';
            const m = d.slice(0, 7);
            if (m) {
                monthMap.set(m, (monthMap.get(m) || 0) + s.price);
            }
            const month = parseInt(d.slice(5, 7), 10);
            if (month >= 1 && month <= 3) quarterMap.Q1 += s.price;
            else if (month <= 6) quarterMap.Q2 += s.price;
            else if (month <= 9) quarterMap.Q3 += s.price;
            else if (month <= 12) quarterMap.Q4 += s.price;
        });
        const months = [...monthMap.entries()]
            .map(([month, vol]) => ({ month, vol }))
            .sort((a, b) => a.month.localeCompare(b.month));

        const lenBuckets = [
            { label: '1–3 chars', min: 1, max: 3, count: 0 },
            { label: '4–6 chars', min: 4, max: 6, count: 0 },
            { label: '7–10 chars', min: 7, max: 10, count: 0 },
            { label: '11+ chars', min: 11, max: 999, count: 0 }
        ];
        sales.forEach((s) => {
            const len = getDomainLength(s.domain);
            const b = lenBuckets.find((x) => len >= x.min && len <= x.max);
            if (b) b.count++;
        });

        let prevYearVol = null;
        if (yearKey && yearKey !== 'all') {
            const prev = String(parseInt(yearKey, 10) - 1);
            const prevSales = getSalesList(prev);
            if (prevSales.length) {
                prevYearVol = prevSales.reduce((a, s) => a + s.price, 0);
            }
        }

        const comShare = tlds.find((t) => t.tld === '.com');
        const aiShare = tlds.find((t) => t.tld === '.ai');

        return {
            count: sales.length,
            total,
            avg,
            med,
            max,
            min,
            tiers,
            tlds,
            venues,
            months,
            quarterMap,
            lenBuckets,
            prevYearVol,
            comPct: comShare ? (comShare.vol / total) * 100 : 0,
            aiPct: aiShare ? (aiShare.vol / total) * 100 : 0,
            top10: sales.slice(0, 10)
        };
    }

    function renderKpiCards(m) {
        const el = document.getElementById('ds-kpi-grid');
        if (!el) return;
        const yoy =
            m.prevYearVol != null && m.prevYearVol > 0
                ? (((m.total - m.prevYearVol) / m.prevYearVol) * 100).toFixed(1)
                : null;
        const yoyHtml =
            yoy != null
                ? `<span class="ds-kpi-delta ${Number(yoy) >= 0 ? 'up' : 'down'}"><i class="fa-solid fa-${Number(yoy) >= 0 ? 'arrow-trend-up' : 'arrow-trend-down'}"></i> ${Math.abs(yoy)}% vs prior year (Top 100)</span>`
                : '';

        const cards = [
            {
                icon: 'fa-sack-dollar',
                tone: 'primary',
                label: 'Total volume',
                value: formatMoneyFull(m.total),
                sub: 'Sum of Top 100 cash sales'
            },
            {
                icon: 'fa-chart-line',
                tone: 'success',
                label: 'Average sale',
                value: formatMoneyFull(m.avg),
                sub: 'Mean price in cohort'
            },
            {
                icon: 'fa-chart-simple',
                tone: 'info',
                label: 'Median sale',
                value: formatMoneyFull(m.med),
                sub: 'Middle price (50th %ile)'
            },
            {
                icon: 'fa-trophy',
                tone: 'warning',
                label: 'Highest sale',
                value: m.max ? formatCompact(m.max.price) : '—',
                sub: m.max ? escapeHtml(m.max.domain) : ''
            },
            {
                icon: 'fa-layer-group',
                tone: 'violet',
                label: 'Sales tracked',
                value: String(m.count),
                sub: 'NameBio Top 100 cohort'
            },
            {
                icon: 'fa-percent',
                tone: 'slate',
                label: '.com volume share',
                value: m.comPct.toFixed(1) + '%',
                sub: m.aiPct > 0 ? '.ai share ' + m.aiPct.toFixed(1) + '%' : 'TLD concentration'
            }
        ];

        el.innerHTML =
            cards
                .map(
                    (c) => `
            <div class="ds-kpi-card ds-kpi-${c.tone}">
                <div class="ds-kpi-icon"><i class="fa-solid ${c.icon}"></i></div>
                <div class="ds-kpi-body">
                    <span class="ds-kpi-label">${escapeHtml(c.label)}</span>
                    <span class="ds-kpi-value">${c.value}</span>
                    <span class="ds-kpi-sub">${c.sub}</span>
                </div>
            </div>`
                )
                .join('') + (yoyHtml ? `<div class="ds-kpi-yoy-wrap">${yoyHtml}</div>` : '');
    }

    function renderBarChart(containerId, items, valueKey, labelKey, opts) {
        const el = document.getElementById(containerId);
        if (!el || !items.length) {
            if (el) el.innerHTML = '<p class="ds-empty-chart">No data for this period.</p>';
            return;
        }
        const max = Math.max(...items.map((i) => i[valueKey]), 1);
        const isMoney = opts && opts.money;
        el.innerHTML = `
            <div class="ds-bar-chart" role="img" aria-label="Bar chart">
                ${items
                    .map((item, idx) => {
                        const pct = Math.max(4, (item[valueKey] / max) * 100);
                        const color = CHART_COLORS[idx % CHART_COLORS.length];
                        const tip = isMoney ? formatMoneyFull(item[valueKey]) : item[valueKey];
                        return `
                    <div class="ds-bar-col" title="${escapeHtml(item[labelKey])}: ${tip}">
                        <span class="ds-bar-val">${isMoney ? formatCompact(item[valueKey]) : item[valueKey]}</span>
                        <div class="ds-bar-track">
                            <div class="ds-bar-fill" style="height:${pct}%;background:${color}"></div>
                        </div>
                        <span class="ds-bar-lbl">${escapeHtml(item[labelKey])}</span>
                    </div>`;
                    })
                    .join('')}
            </div>`;
    }

    function renderDonut(containerId, segments) {
        const el = document.getElementById(containerId);
        const legend = document.getElementById(containerId + '-legend');
        if (!el) return;
        const total = segments.reduce((a, s) => a + s.vol, 0) || 1;
        let acc = 0;
        const stops = segments.map((s, i) => {
            const pct = (s.vol / total) * 100;
            const start = acc;
            acc += pct;
            return `${CHART_COLORS[i % CHART_COLORS.length]} ${start}% ${acc}%`;
        });
        el.innerHTML = `<div class="ds-donut-ring" style="background:conic-gradient(${stops.join(', ')})"></div><div class="ds-donut-hole"><span class="ds-donut-total">${formatCompact(total)}</span><span class="ds-donut-cap">volume</span></div>`;
        if (legend) {
            legend.innerHTML = segments
                .map((s, i) => {
                    const pct = ((s.vol / total) * 100).toFixed(1);
                    return `
                <div class="ds-legend-row">
                    <span class="ds-legend-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>
                    <span class="ds-legend-tld">${escapeHtml(s.tld)}</span>
                    <span class="ds-legend-meta">${s.count} sales · ${pct}%</span>
                </div>`;
                })
                .join('');
        }
    }

    function renderHBars(containerId, items, maxVal) {
        const el = document.getElementById(containerId);
        if (!el) return;
        const max = maxVal || Math.max(...items.map((i) => i.pct), 1);
        el.innerHTML = items
            .map(
                (item, i) => `
            <div class="ds-hbar-row">
                <span class="ds-hbar-label" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
                <div class="ds-hbar-track">
                    <div class="ds-hbar-fill" style="width:${(item.pct / max) * 100}%;background:${CHART_COLORS[i % CHART_COLORS.length]}"></div>
                </div>
                <span class="ds-hbar-val">${item.val}</span>
            </div>`
            )
            .join('');
    }

    function renderTierBreakdown(m) {
        const el = document.getElementById('ds-tier-breakdown');
        if (!el) return;
        const max = Math.max(...m.tiers.map((t) => t.count), 1);
        el.innerHTML = m.tiers
            .map(
                (t, i) => `
            <div class="ds-tier-row">
                <div class="ds-tier-head">
                    <span class="ds-tier-label">${escapeHtml(t.label)}</span>
                    <span class="ds-tier-stat">${t.count} sales · ${formatCompact(t.vol)} vol</span>
                </div>
                <div class="ds-tier-track">
                    <div class="ds-tier-fill" style="width:${(t.count / max) * 100}%;background:${CHART_COLORS[i % CHART_COLORS.length]}"></div>
                </div>
            </div>`
            )
            .join('');
    }

    function renderLengthBreakdown(m) {
        const el = document.getElementById('ds-length-breakdown');
        if (!el) return;
        const max = Math.max(...m.lenBuckets.map((b) => b.count), 1);
        el.innerHTML = m.lenBuckets
            .map(
                (b, i) => `
            <div class="ds-len-card">
                <div class="ds-len-ring" style="--pct:${(b.count / max) * 100};--c:${CHART_COLORS[i]}">
                    <span class="ds-len-num">${b.count}</span>
                </div>
                <span class="ds-len-label">${escapeHtml(b.label)}</span>
            </div>`
            )
            .join('');
    }

    function renderTopSpotlight(sales) {
        const el = document.getElementById('ds-top-spotlight');
        if (!el) return;
        const chip = global.renderDomainSaleChip || ((d) => escapeHtml(d));
        el.innerHTML = sales
            .slice(0, 5)
            .map(
                (s, i) => `
            <div class="ds-spot-card">
                <span class="ds-spot-rank">#${i + 1}</span>
                ${chip(s.domain)}
                <span class="ds-spot-price">${formatMoneyFull(s.price)}</span>
                <span class="ds-spot-date">${escapeHtml(s.date)}</span>
                <span class="ds-spot-venue">${escapeHtml(s.venue)}</span>
            </div>`
            )
            .join('');
    }

    function renderInsights(m, yearKey) {
        const el = document.getElementById('ds-insights-list');
        if (!el) return;
        const topTld = m.tlds[0];
        const topVenue = m.venues[0];
        const topMonth = [...m.months].sort((a, b) => b.vol - a.vol)[0];
        const insights = [];
        if (topTld) {
            insights.push(
                `<strong>${escapeHtml(topTld.tld)}</strong> leads by volume with ${formatMoneyFull(topTld.vol)} across ${topTld.count} sales in this Top 100.`
            );
        }
        if (topVenue) {
            insights.push(
                `<strong>${escapeHtml(topVenue.venue)}</strong> is the most active venue (${topVenue.count} reported sales).`
            );
        }
        if (topMonth) {
            const [y, mo] = topMonth.month.split('-');
            const monthName = new Date(y + '-' + mo + '-01T12:00:00').toLocaleString(undefined, { month: 'long', year: 'numeric' });
            insights.push(`Peak month by volume: <strong>${monthName}</strong> (${formatMoneyFull(topMonth.vol)}).`);
        }
        if (m.max) {
            insights.push(
                `#1 sale: <strong>${escapeHtml(m.max.domain)}</strong> at ${formatMoneyFull(m.max.price)} — ${((m.max.price / m.total) * 100).toFixed(1)}% of cohort volume.`
            );
        }
        if (yearKey === 'all') {
            insights.push('All-time view aggregates NameBio’s highest recorded cash domain sales globally.');
        }
        el.innerHTML = insights.map((t) => `<li>${t}</li>`).join('');
    }

    function renderFullTable(sales) {
        const tableBody = document.getElementById('domain-sales-full-tbody');
        if (!tableBody) return;
        const chip = global.renderDomainSaleChip || ((d) => escapeHtml(d));
        const fmtDate = global.formatSaleDate || ((d) => d);
        if (!sales.length) {
            tableBody.innerHTML =
                '<tr><td colspan="5" class="text-center text-muted py-4">No sales found for this period.</td></tr>';
            return;
        }
        tableBody.innerHTML = sales
            .map(
                (sale, i) => `
        <tr class="domain-sales-full-row">
            <td class="domain-sales-full-rank">#${i + 1}</td>
            <td>${chip(sale.domain)}</td>
            <td class="domain-sales-full-price">${formatMoneyFull(sale.price)}</td>
            <td>${fmtDate(sale.date)}</td>
            <td class="text-muted">${escapeHtml(sale.venue)}</td>
        </tr>`
            )
            .join('');
    }

    function bindYearSelect(yearKey) {
        const select = document.getElementById('domain-sales-full-year-select');
        const options = global.DOMAIN_SALES_YEAR_OPTIONS || [];
        if (!select) return;
        if (!select.dataset.built) {
            select.innerHTML = options
                .map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`)
                .join('');
            select.dataset.built = '1';
        }
        if (!select.dataset.dsBound) {
            select.dataset.dsBound = '1';
            select.onchange = function () {
                if (global.onDomainSalesYearChange) global.onDomainSalesYearChange(this.value);
                render(this.value);
            };
        }
        select.value = yearKey;
    }

    function render(yearKey) {
        const key = yearKey || (global.activeDomainSalesYear != null ? global.activeDomainSalesYear : 'all');
        const sales = getSalesList(key);
        const options = global.DOMAIN_SALES_YEAR_OPTIONS || [];
        const label = options.find((o) => o.value === key)?.label || 'Domain Sales Analytics';
        const m = computeMetrics(sales, key);

        bindYearSelect(key);

        const titleEl = document.getElementById('domain-sales-full-title');
        const subEl = document.getElementById('domain-sales-full-subtitle');
        const countEl = document.getElementById('domain-sales-full-count');
        if (titleEl) titleEl.textContent = label;
        if (subEl) {
            subEl.textContent =
                'Market intelligence dashboard · NameBio Top 100 cash sales · Visual breakdown by TLD, venue, price tier, timing & domain length.';
        }
        if (countEl) countEl.textContent = sales.length + ' sales in cohort';

        renderKpiCards(m);
        renderTopSpotlight(sales);
        renderInsights(m, key);

        const quarterItems = [
            { label: 'Q1', vol: m.quarterMap.Q1 },
            { label: 'Q2', vol: m.quarterMap.Q2 },
            { label: 'Q3', vol: m.quarterMap.Q3 },
            { label: 'Q4', vol: m.quarterMap.Q4 }
        ].filter((q) => q.vol > 0);
        renderBarChart('ds-chart-quarterly', quarterItems, 'vol', 'label', { money: true });

        const monthItems = m.months.map((x) => ({
            label: x.month.slice(5) + '/' + x.month.slice(2, 4),
            vol: x.vol
        }));
        renderBarChart('ds-chart-monthly', monthItems.length ? monthItems : [{ label: '—', vol: 0 }], 'vol', 'label', {
            money: true
        });

        renderDonut('ds-chart-tld', m.tlds.slice(0, 8));
        renderTierBreakdown(m);
        renderLengthBreakdown(m);

        const venueItems = m.venues.map((v) => ({
            label: v.venue.length > 22 ? v.venue.slice(0, 20) + '…' : v.venue,
            pct: v.count,
            val: v.count + ' · ' + formatCompact(v.vol)
        }));
        renderHBars('ds-chart-venues', venueItems, m.venues[0]?.count || 1);

        const tldTable = document.getElementById('ds-tld-table-body');
        if (tldTable) {
            const total = m.total || 1;
            tldTable.innerHTML = m.tlds
                .map(
                    (t) => `
                <tr>
                    <td><span class="ds-tld-badge">${escapeHtml(t.tld)}</span></td>
                    <td>${t.count}</td>
                    <td>${formatMoneyFull(t.vol)}</td>
                    <td>${((t.vol / total) * 100).toFixed(1)}%</td>
                    <td>${formatCompact(Math.round(t.vol / t.count))}</td>
                </tr>`
                )
                .join('');
        }

        renderFullTable(sales);
    }

    global.NamvioDomainSales = { render, computeMetrics };
})(typeof window !== 'undefined' ? window : globalThis);