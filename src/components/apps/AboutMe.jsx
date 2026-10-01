import { useLanguage } from '../../context/LanguageContext';
import { OWNER } from '../../data/profile';
import { PROJECTS, GITHUB_PROFILE } from '../../data/projects';
import { localized } from '../../i18n/translate';
import { openApp } from '../appBus';
import { RESUME_URL, RESUME_FILENAME } from './resumeInfo';
import './AboutMe.css';

const LINKEDIN = 'https://www.linkedin.com/in/gokalp-eker/';

// "About Me": who I am, what I build, and the quickest ways to reach me.
const AboutMe = () => {
    const { t, lang } = useLanguage();
    return (
        <div className="about-root">
            <div className="about-header">
                <div className="about-avatar" aria-hidden="true">GE</div>
                <div>
                    <h1>{OWNER.name}</h1>
                    <div className="about-role">{localized(OWNER.role, lang)}</div>
                </div>
            </div>

            <p>{t('about.intro')}</p>

            <h2>{t('about.highlights')}</h2>
            <ul className="about-list">
                {PROJECTS.slice().reverse().slice(0, 3).map((p) => (
                    <li key={p.id}>
                        <button className="about-link" onClick={() => openApp('gallery')}>{p.title}</button>
                        {' — '}{localized(p.summary, lang)}
                    </li>
                ))}
            </ul>

            <h2>{t('about.getInTouch')}</h2>
            <div className="about-actions">
                <button className="about-btn" onClick={() => openApp('myresume')}>{t('about.resume')}</button>
                <button className="about-btn" onClick={() => openApp('contact')}>{t('about.contact')}</button>
                <button className="about-btn" onClick={() => openApp('internetexplorer')}>{t('about.projects')}</button>
                <a className="about-btn" href={GITHUB_PROFILE} target="_blank" rel="noopener noreferrer">GitHub</a>
                <a className="about-btn" href={LINKEDIN} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                <a className="about-btn" href={RESUME_URL} download={RESUME_FILENAME}>⬇ {t('resume.download')}</a>
            </div>
        </div>
    );
};

export default AboutMe;
