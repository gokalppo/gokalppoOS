import React from 'react';
import './TaskSwitcher.css';

// Win98-style Alt+Tab box: one tile per window, the selected one highlighted.
const TaskSwitcher = ({ windows, selectedIndex }) => {
    const selected = windows[selectedIndex];
    return (
        <div className="task-switcher-backdrop" role="dialog" aria-label="Switch windows">
            <div className="task-switcher">
                <div className="task-switcher-tiles">
                    {windows.map((win, i) => (
                        <div key={win.id} className={`task-switcher-tile ${i === selectedIndex ? 'selected' : ''}`}>
                            {React.isValidElement(win.icon)
                                ? React.cloneElement(win.icon, { style: { width: '32px', height: '32px' } })
                                : <span className="task-switcher-fallback">▣</span>}
                        </div>
                    ))}
                </div>
                <div className="task-switcher-title">{selected ? selected.title : ''}</div>
            </div>
        </div>
    );
};

export default TaskSwitcher;
