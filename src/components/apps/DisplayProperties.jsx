import { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDisplay } from '../../context/DisplayContext';
import { WALLPAPER_IDS, SAVER_IDS, SAVER_MINUTES, SCHEME_IDS, schemeCssVars } from '../../display/displayConfig';
import { WALLPAPERS } from '../../display/wallpapers';
import { prefersReducedMotion } from '../../display/motion';
import './DisplayProperties.css';

const TABS = ['background', 'screenSaver', 'appearance'];
const WINDOW_ID = 'displayproperties';

// A little monitor showing the wallpaper (and desktop colour) of a draft selection.
const Monitor = ({ wallpaper, scheme, children }) => {
    const image = WALLPAPERS[wallpaper]?.thumb;
    const vars = schemeCssVars(scheme);
    return (
        <div className="dp-monitor" aria-hidden="true">
            <div
                className="dp-screen"
                style={{
                    backgroundColor: vars['--os-bg'],
                    backgroundImage: image ? `url(${image})` : 'none'
                }}
            >
                {children}
            </div>
            <div className="dp-stand" />
        </div>
    );
};

const Background = ({ draft, setDraft, t }) => (
    <div className="dp-pane">
        <Monitor wallpaper={draft.wallpaper} scheme={draft.scheme} />
        <div className="dp-label" id="dp-wallpaper-label">{t('dp.wallpaper')}</div>
        <div className="dp-list" role="radiogroup" aria-labelledby="dp-wallpaper-label">
            {WALLPAPER_IDS.map((id) => (
                <button
                    key={id}
                    role="radio"
                    aria-checked={draft.wallpaper === id}
                    className={`dp-option ${draft.wallpaper === id ? 'selected' : ''}`}
                    onClick={() => setDraft({ ...draft, wallpaper: id })}
                >
                    {WALLPAPERS[id].thumb
                        ? <img src={WALLPAPERS[id].thumb} alt="" className="dp-thumb" />
                        : <span className="dp-thumb dp-thumb-solid" />}
                    {t(`dp.wp.${id}`)}
                </button>
            ))}
        </div>
    </div>
);

const ScreenSaverTab = ({ draft, setDraft, t }) => {
    const reduced = prefersReducedMotion();
    return (
        <div className="dp-pane">
            <Monitor wallpaper={draft.wallpaper} scheme={draft.scheme}>
                <span className="dp-saver-preview">{draft.saver === 'none' ? '' : '✦'}</span>
            </Monitor>
            <label className="dp-label" htmlFor="dp-saver">{t('dp.saver')}</label>
            <select
                id="dp-saver"
                className="dp-select"
                value={draft.saver}
                onChange={(e) => setDraft({ ...draft, saver: e.target.value })}
            >
                {SAVER_IDS.map((id) => <option key={id} value={id}>{t(`dp.saver.${id}`)}</option>)}
            </select>
            <div className="dp-row">
                <label htmlFor="dp-wait">{t('dp.wait')}</label>
                <select
                    id="dp-wait"
                    className="dp-select narrow"
                    value={draft.saverMinutes}
                    disabled={draft.saver === 'none'}
                    onChange={(e) => setDraft({ ...draft, saverMinutes: Number(e.target.value) })}
                >
                    {SAVER_MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <span>{t('dp.minutes')}</span>
                <button
                    className="dp-btn"
                    disabled={draft.saver === 'none' || reduced}
                    onClick={() => window.dispatchEvent(new CustomEvent('screensaver-preview', { detail: { saver: draft.saver } }))}
                >
                    {t('dp.preview')}
                </button>
            </div>
            {reduced && <div className="dp-note">{t('dp.reducedMotion')}</div>}
        </div>
    );
};

const Appearance = ({ draft, setDraft, t }) => {
    const vars = schemeCssVars(draft.scheme);
    return (
        <div className="dp-pane">
            <Monitor wallpaper="teal" scheme={draft.scheme}>
                <div className="dp-sample" style={vars}>
                    <div className="dp-sample-title">{t('dp.sample.active')}</div>
                    <div className="dp-sample-body">{t('dp.sample.text')}</div>
                </div>
                <div className="dp-sample inactive" style={vars}>
                    <div className="dp-sample-title">{t('dp.sample.inactive')}</div>
                </div>
            </Monitor>
            <label className="dp-label" htmlFor="dp-scheme">{t('dp.scheme')}</label>
            <select
                id="dp-scheme"
                className="dp-select"
                value={draft.scheme}
                onChange={(e) => setDraft({ ...draft, scheme: e.target.value })}
            >
                {SCHEME_IDS.map((id) => <option key={id} value={id}>{t(`dp.scheme.${id}`)}</option>)}
            </select>
        </div>
    );
};

const DisplayProperties = () => {
    const { closeWindow } = useOS();
    const { t } = useLanguage();
    const { display, applyDisplay } = useDisplay();
    const [tab, setTab] = useState(TABS[0]);
    const [draft, setDraft] = useState(display);

    const dirty = JSON.stringify(draft) !== JSON.stringify(display);
    const close = () => closeWindow(WINDOW_ID);

    return (
        <div className="dp-root">
            <div className="dp-tabs" role="tablist">
                {TABS.map((name) => (
                    <button
                        key={name}
                        role="tab"
                        aria-selected={tab === name}
                        className={`dp-tab ${tab === name ? 'active' : ''}`}
                        onClick={() => setTab(name)}
                    >
                        {t(`dp.tab.${name}`)}
                    </button>
                ))}
            </div>
            <div className="dp-panel" role="tabpanel">
                {tab === 'background' && <Background draft={draft} setDraft={setDraft} t={t} />}
                {tab === 'screenSaver' && <ScreenSaverTab draft={draft} setDraft={setDraft} t={t} />}
                {tab === 'appearance' && <Appearance draft={draft} setDraft={setDraft} t={t} />}
            </div>
            <div className="dp-buttons">
                <button className="dp-btn" onClick={() => { applyDisplay(draft); close(); }}>{t('sp.ok')}</button>
                <button className="dp-btn" onClick={close}>{t('sp.cancel')}</button>
                <button className="dp-btn" disabled={!dirty} onClick={() => applyDisplay(draft)}>{t('dp.apply')}</button>
            </div>
        </div>
    );
};

export default DisplayProperties;
