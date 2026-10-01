import { useState } from 'react';
import { monthName, weekdayNames, buildMonthGrid, shiftMonth, isSameDay } from './calendar';
import { useLanguage } from '../context/LanguageContext';
import './CalendarPopup.css';

// Win98 "Date/Time Properties"-style calendar opened from the taskbar clock.
const CalendarPopup = ({ now }) => {
    const { t, lang } = useLanguage();
    const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
    const grid = buildMonthGrid(view.year, view.month);
    const go = (delta) => setView((v) => shiftMonth(v.year, v.month, delta));

    return (
        <div className="calendar-popup" role="dialog" aria-label={t('calendar.title')} onClick={(e) => e.stopPropagation()}>
            <div className="calendar-title">{t('calendar.title')}</div>
            <div className="calendar-nav">
                <button className="calendar-btn" onClick={() => go(-1)} title={t('calendar.prev')}>◀</button>
                <span className="calendar-month">{monthName(lang, view.month)} {view.year}</span>
                <button className="calendar-btn" onClick={() => go(1)} title={t('calendar.next')}>▶</button>
            </div>
            <table className="calendar-grid">
                <thead>
                    <tr>{weekdayNames(lang).map((d) => <th key={d}>{d}</th>)}</tr>
                </thead>
                <tbody>
                    {grid.map((week, wi) => (
                        <tr key={wi}>
                            {week.map((cell) => {
                                const today = isSameDay(new Date(cell.year, cell.month, cell.day), now);
                                return (
                                    <td
                                        key={`${cell.month}-${cell.day}`}
                                        className={`${cell.inMonth ? '' : 'outside'} ${today ? 'today' : ''}`}
                                    >
                                        {cell.day}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="calendar-time">
                {now.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                <span className="calendar-date">{now.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
        </div>
    );
};

export default CalendarPopup;
