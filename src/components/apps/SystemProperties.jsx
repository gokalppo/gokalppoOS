import { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { useLanguage } from '../../context/LanguageContext';
import { localized } from '../../i18n/translate';
import { OWNER, SYSTEM_INFO, DEVICE_GROUPS } from '../../data/profile';
import computerIcon from '../../assets/images/This_PC_1995.svg';
import './SystemProperties.css';

const TABS = ['general', 'deviceManager'];
const WINDOW_ID = 'systemproperties';

const General = () => {
    const { t, lang } = useLanguage();
    const registeredTo = [OWNER.name, OWNER.role];
    return (
        <div className="sp-general">
            <img src={computerIcon} alt="" className="sp-computer-icon" />
            <div className="sp-info">
                <div className="sp-label">{t('sp.system')}</div>
                {SYSTEM_INFO.system.map((line, i) => <div key={i} className="sp-line">{localized(line, lang)}</div>)}
                <div className="sp-label">{t('sp.registeredTo')}</div>
                {registeredTo.map((line, i) => <div key={i} className="sp-line">{localized(line, lang)}</div>)}
                <div className="sp-label">{t('sp.computer')}</div>
                {SYSTEM_INFO.computer.map(([key, value], i) => (
                    <div key={i} className="sp-line"><span className="sp-key">{localized(key, lang)}:</span> {localized(value, lang)}</div>
                ))}
            </div>
        </div>
    );
};

const DeviceManager = () => {
    const { t, lang } = useLanguage();
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
                            <span className="sp-box">{expanded.has(group.id) ? '−' : '+'}</span> {localized(group.name, lang)}
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
                        <div className="sp-line"><span className="sp-key">{t('sp.deviceType')}</span> {localized(selected.group.name, lang)}</div>
                        <div className="sp-line"><span className="sp-key">{t('sp.usedIn')}</span> {selected.device.usedIn.map((u) => localized(u, lang)).join(', ')}</div>
                        <div className="sp-line">{localized(selected.device.note, lang)}</div>
                        <div className="sp-status">{t('sp.status')}</div>
                    </>
                ) : (
                    <div className="sp-hint">{t('sp.hint')}</div>
                )}
            </div>
        </div>
    );
};

const SystemProperties = () => {
    const { closeWindow } = useOS();
    const { t } = useLanguage();
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
                        {t(`sp.tab.${name}`)}
                    </button>
                ))}
            </div>
            <div className="sp-panel" role="tabpanel">
                {tab === 'general' ? <General /> : <DeviceManager />}
            </div>
            <div className="sp-buttons">
                <button className="sp-btn" onClick={() => closeWindow(WINDOW_ID)}>{t('sp.ok')}</button>
                <button className="sp-btn" onClick={() => closeWindow(WINDOW_ID)}>{t('sp.cancel')}</button>
            </div>
        </div>
    );
};

export default SystemProperties;
