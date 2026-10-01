// Pure calendar helpers for the taskbar clock popup.

export const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
export const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

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
