import { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { useLanguage } from '../../context/LanguageContext';
import { OWNER } from '../../data/profile';
import { PROJECTS } from '../../data/projects';
import { localized } from '../../i18n/translate';
import { openApp } from '../appBus';
import { WELCOME_HIDDEN_KEY, isWelcomeHidden, setWelcomeHidden } from './welcomeStorage';
import './Welcome.css';

const FEATURED = PROJECTS.slice(-3).reverse();

// Win98 "Welcome"/Tip of the Day style window shown at startup.
const Welcome = () => {
    const { closeWindow } = useOS();
    const { t, lang } = useLanguage();
    const [showAtStartup, setShowAtStartup] = useState(() => !isWelcomeHidden());

    const toggle = (e) => {
        setShowAtStartup(e.target.checked);
        setWelcomeHidden(!e.target.checked);
    };

    const go = (id) => { openApp(id); closeWindow('welcome'); };

    return (
        <div className="welcome-root" data-key={WELCOME_HIDDEN_KEY}>
            <div className="welcome-main">
                <div className="welcome-logo" aria-hidden="true">💡</div>
                <div className="welcome-text">
                    <h1>{t('welcome.heading')}</h1>
                    <p>{t('welcome.intro', { name: OWNER.name, role: localized(OWNER.role, lang) })}</p>
                    <h2>{t('welcome.featured')}</h2>
                    <ul>
                        {FEATURED.map((p) => (
                            <li key={p.id}><strong>{p.title}</strong> — {localized(p.summary, lang)}</li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="welcome-actions">
                <button className="welcome-btn" onClick={() => go('myresume')}>{t('welcome.resume')}</button>
                <button className="welcome-btn" onClick={() => go('gallery')}>{t('welcome.projects')}</button>
                <button className="welcome-btn" onClick={() => go('aboutme')}>{t('welcome.about')}</button>
                <button className="welcome-btn" onClick={() => go('contact')}>{t('welcome.contact')}</button>
            </div>
            <div className="welcome-footer">
                <label>
                    <input type="checkbox" checked={showAtStartup} onChange={toggle} />
                    {t('welcome.showAtStartup')}
                </label>
                <button className="welcome-btn" onClick={() => closeWindow('welcome')}>{t('welcome.close')}</button>
            </div>
        </div>
    );
};

export default Welcome;
