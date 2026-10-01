// Pure calendar helpers for the taskbar clock popup.

// Localized names (Sunday-first weekdays, like the grid).
export const monthName = (lang, month) =>
    new Intl.DateTimeFormat(lang, { month: 'long' }).format(new Date(2000, month, 1));

export const weekdayNames = (lang) =>
    Array.from({ length: 7 }, (_, i) =>
        new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(new Date(2000, 0, 2 + i)));

export const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// 6 weeks x 7 days (Sunday first). Days outside `month` are flagged inMonth: false.
export const buildMonthGrid = (year, month) => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const cells = [];
    for (let i = 0; i < 42; i++) {
        const date = new Date(year, month, 1 - firstWeekday + i);
        cells.push({
            day: date.getDate(),
            month: date.getMonth(),
            year: date.getFullYear(),
            inMonth: date.getMonth() === month
        });
    }
    const weeks = [];
    for (let w = 0; w < 6; w++) weeks.push(cells.slice(w * 7, w * 7 + 7));
    return weeks;
};

export const shiftMonth = (year, month, delta) => {
    const d = new Date(year, month + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
};

export const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
