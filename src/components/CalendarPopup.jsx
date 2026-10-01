import { useState } from 'react';
import { WEEKDAYS, MONTHS, buildMonthGrid, shiftMonth, isSameDay } from './calendar';
import './CalendarPopup.css';

// Win98 "Date/Time Properties"-style calendar opened from the taskbar clock.
const CalendarPopup = ({ now }) => {
    const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
    const grid = buildMonthGrid(view.year, view.month);
    const go = (delta) => setView((v) => shiftMonth(v.year, v.month, delta));

    return (
        <div className="calendar-popup" onClick={(e) => e.stopPropagation()}>
            <div className="calendar-title">Date/Time</div>
            <div className="calendar-nav">
                <button className="calendar-btn" onClick={() => go(-1)} title="Previous month">◀</button>
                <span className="calendar-month">{MONTHS[view.month]} {view.year}</span>
                <button className="calendar-btn" onClick={() => go(1)} title="Next month">▶</button>
            </div>
            <table className="calendar-grid">
                <thead>
                    <tr>{WEEKDAYS.map((d) => <th key={d}>{d}</th>)}</tr>
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
                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                <span className="calendar-date">{now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
        </div>
    );
};

export default CalendarPopup;
