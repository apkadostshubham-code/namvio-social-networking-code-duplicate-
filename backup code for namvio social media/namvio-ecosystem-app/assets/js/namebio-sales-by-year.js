/**
 * NameBio Top 100 by year — built from all-time list at load time.
 */
(function () {
    const all = window.NAMEBIO_TOP_SALES || [];
    const byYear = { all: all.slice() };

    for (let y = 2026; y >= 2006; y--) {
        const ys = String(y);
        byYear[ys] = all.filter((s) => (s.date || '').startsWith(ys));
    }

    window.NAMEBIO_SALES_BY_YEAR = byYear;
})();