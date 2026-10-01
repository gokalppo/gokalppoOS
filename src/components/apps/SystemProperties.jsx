import { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { OWNER, SYSTEM_INFO, DEVICE_GROUPS } from '../../data/profile';
import computerIcon from '../../assets/images/This_PC_1995.svg';
import './SystemProperties.css';

const TABS = ['General', 'Device Manager'];
const WINDOW_ID = 'systemproperties';

const General = () => (
    <div className="sp-general">
        <img src={computerIcon} alt="" className="sp-computer-icon" />
        <div className="sp-info">
            <div className="sp-label">System:</div>
            {SYSTEM_INFO.system.map((line) => <div key={line} className="sp-line">{line}</div>)}
            <div className="sp-label">Registered to:</div>
            {SYSTEM_INFO.registeredTo.map((line) => <div key={line} className="sp-line">{line}</div>)}
            <div className="sp-label">Computer:</div>
            {SYSTEM_INFO.computer.map(([key, value]) => (
                <div key={key} className="sp-line"><span className="sp-key">{key}:</span> {value}</div>
            ))}
        </div>
    </div>
);

const DeviceManager = () => {
    const [expanded, setExpanded] = useState(() => new Set(DEVICE_GROUPS.map((g) => g.id)));
    const [selected, setSelected] = useState(null); // { group, device }

    const toggle = (id) => setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    return (
        <div className="sp-devices">
            <div className="sp-tree" role="tree">
                <div className="sp-tree-root">🖥️ {OWNER.name.toUpperCase()}</div>
                {DEVICE_GROUPS.map((group) => (
                    <div key={group.id} role="group">
                        <button className="sp-tree-group" onClick={() => toggle(group.id)} aria-expanded={expanded.has(group.id)}>
                            <span className="sp-box">{expanded.has(group.id) ? '−' : '+'}</span> {group.name}
                        </button>
                        {expanded.has(group.id) && group.devices.map((device) => (
                            <button
                                key={device.name}
                                role="treeitem"
                                aria-selected={selected?.device === device}
                                className={`sp-tree-device ${selected?.device === device ? 'selected' : ''}`}
                                onClick={() => setSelected({ group, device })}
                            >
                                {device.name}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
            <div className="sp-details" aria-live="polite">
                {selected ? (
                    <>
                        <div className="sp-details-title">{selected.device.name}</div>
                        <div className="sp-line"><span className="sp-key">Device type:</span> {selected.group.name}</div>
                        <div className="sp-line"><span className="sp-key">Used in:</span> {selected.device.usedIn.join(', ')}</div>
                        <div className="sp-line">{selected.device.note}</div>
                        <div className="sp-status">Device status: This device is working properly.</div>
                    </>
                ) : (
                    <div className="sp-hint">Select a device to see where it is used.</div>
                )}
            </div>
        </div>
    );
};

const SystemProperties = () => {
    const { closeWindow } = useOS();
    const [tab, setTab] = useState(TABS[0]);

    return (
        <div className="sp-root">
            <div className="sp-tabs" role="tablist">
                {TABS.map((name) => (
                    <button
                        key={name}
                        role="tab"
                        aria-selected={tab === name}
                        className={`sp-tab ${tab === name ? 'active' : ''}`}
                        onClick={() => setTab(name)}
                    >
                        {name}
                    </button>
                ))}
            </div>
            <div className="sp-panel" role="tabpanel">
                {tab === 'General' ? <General /> : <DeviceManager />}
            </div>
            <div className="sp-buttons">
                <button className="sp-btn" onClick={() => closeWindow(WINDOW_ID)}>OK</button>
                <button className="sp-btn" onClick={() => closeWindow(WINDOW_ID)}>Cancel</button>
            </div>
        </div>
    );
};

export default SystemProperties;
