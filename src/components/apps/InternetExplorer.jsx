import { useState, useRef, useEffect } from 'react';
import { PROJECTS } from '../../data/projects';
import { OWNER } from '../../data/profile';
import { useLanguage } from '../../context/LanguageContext';
import { localized } from '../../i18n/translate';
import {
    EXTERNAL_LINKS, HOME, toAddress, resolveAddress, initialHistory, navigate, back, forward,
    canGoBack, canGoForward, currentPath
} from './ieNavigation';
import ieLogo from '../../assets/images/ie.webp';
import ProjectLinks from './ProjectLinks';
import './InternetExplorer.css';

const LOAD_MS = 280;

const projectBySlug = (slug) => PROJECTS.find((p) => p.slug === slug);

const ProjectCard = ({ project, lang, onOpen }) => (
    <button className="ie-card" onClick={() => onOpen(`projects/${project.slug}`)}>
        <img src={project.image} alt="" className="ie-card-img" />
        <span className="ie-card-body">
            <strong>{project.title}</strong>
            <span>{localized(project.summary, lang)}</span>
        </span>
    </button>
);

const HomePage = ({ t, lang, onOpen }) => (
    <>
        <h1>{t('ie.welcome')}</h1>
        <p>{t('ie.welcomeText')}</p>
        <h2>{t('ie.featured')}</h2>
        <div className="ie-cards">
            {PROJECTS.slice(-3).reverse().map((p) => <ProjectCard key={p.id} project={p} lang={lang} onOpen={onOpen} />)}
        </div>
        <p>
            <a href="#" onClick={(e) => { e.preventDefault(); onOpen('projects'); }}>{t('ie.allProjects')} »</a>
            {' · '}
            <a href="#" onClick={(e) => { e.preventDefault(); onOpen('about'); }}>{t('ie.about')}</a>
            {' · '}
            <a href="#" onClick={(e) => { e.preventDefault(); onOpen('links'); }}>{t('ie.links')}</a>
        </p>
    </>
);

const AboutPage = ({ t, lang }) => (
    <>
        <h1>{t('ie.about')}</h1>
        <p><strong>{OWNER.name}</strong> — {localized(OWNER.role, lang)}</p>
        <p>{t('ie.aboutText')}</p>
    </>
);

const ProjectsPage = ({ t, lang, onOpen }) => (
    <>
        <h1>{t('ie.allProjects')}</h1>
        <div className="ie-cards">
            {PROJECTS.map((p) => <ProjectCard key={p.id} project={p} lang={lang} onOpen={onOpen} />)}
        </div>
    </>
);

const ProjectPage = ({ project, t, lang, onOpen }) => (
    <>
        <p><a href="#" onClick={(e) => { e.preventDefault(); onOpen('projects'); }}>{t('ie.backToProjects')}</a></p>
        <h1>{project.title}</h1>
        <img src={project.image} alt={project.title} className="ie-project-img" />
        <h2>{t('ie.tech')}</h2>
        <div className="ie-badges">{project.tech.map((x) => <span key={x} className="ie-badge">{x}</span>)}</div>
        <ProjectLinks project={project} />
        <div className="ie-description">{localized(project.description, lang)}</div>
    </>
);

const LinksPage = ({ t }) => (
    <>
        <h1>{t('ie.links')}</h1>
        <ul className="ie-links">
            {EXTERNAL_LINKS.map((l) => (
                <li key={l.id}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a>
                </li>
            ))}
        </ul>
    </>
);

const NotFoundPage = ({ t, address, onOpen }) => (
    <>
        <h1>{t('ie.notFoundTitle')}</h1>
        <p>{t('ie.notFoundText')}</p>
        <p><code>{address}</code></p>
        <p><a href="#" onClick={(e) => { e.preventDefault(); onOpen(HOME); }}>{t('ie.tryHome')}</a></p>
    </>
);

const InternetExplorer = () => {
    const { t, lang } = useLanguage();
    const [history, setHistory] = useState(() => initialHistory());
    const [addressText, setAddressText] = useState(toAddress(HOME));
    const [menuOpen, setMenuOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState(null);
    const loadTimer = useRef(null);

    useEffect(() => () => clearTimeout(loadTimer.current), []);

    const startLoading = () => {
        setLoading(true);
        clearTimeout(loadTimer.current);
        loadTimer.current = setTimeout(() => setLoading(false), LOAD_MS);
    };

    const go = (path) => {
        setMenuOpen(false);
        setNotice(null);
        setHistory((h) => navigate(h, path));
        setAddressText(toAddress(path));
        startLoading();
    };

    const step = (fn) => {
        const next = fn(history);
        setHistory(next);
        setAddressText(toAddress(currentPath(next)));
        setNotice(null);
        startLoading();
    };

    const submitAddress = (e) => {
        e.preventDefault();
        const target = resolveAddress(addressText);
        if (target.type === 'external') {
            window.open(target.url, '_blank', 'noopener,noreferrer');
            setNotice(t('ie.openedNewTab'));
            setAddressText(toAddress(currentPath(history)));
        } else {
            go(target.path);
        }
    };

    const path = currentPath(history);
    const projectMatch = path.match(/^projects\/([a-z0-9-]+)$/);
    const project = projectMatch ? projectBySlug(projectMatch[1]) : null;

    let page;
    if (path === 'home') page = <HomePage t={t} lang={lang} onOpen={go} />;
    else if (path === 'about') page = <AboutPage t={t} lang={lang} />;
    else if (path === 'projects') page = <ProjectsPage t={t} lang={lang} onOpen={go} />;
    else if (path === 'links') page = <LinksPage t={t} />;
    else if (project) page = <ProjectPage project={project} t={t} lang={lang} onOpen={go} />;
    else page = <NotFoundPage t={t} address={toAddress(path)} onOpen={go} />;

    return (
        <div className="ie-root" onClick={() => setMenuOpen(false)}>
            <div className="ie-menubar">
                <div className="ie-menu-wrap">
                    <button
                        className={`ie-menu-btn ${menuOpen ? 'open' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                        aria-expanded={menuOpen}
                    >
                        {t('ie.favorites')}
                    </button>
                    {menuOpen && (
                        <div className="ie-dropdown" role="menu" onClick={(e) => e.stopPropagation()}>
                            <button role="menuitem" onClick={() => go('home')}>🏠 {t('ie.home')}</button>
                            <button role="menuitem" onClick={() => go('about')}>👤 {t('ie.about')}</button>
                            <button role="menuitem" onClick={() => go('projects')}>📁 {t('ie.allProjects')}</button>
                            {PROJECTS.map((p) => (
                                <button key={p.id} role="menuitem" className="indent" onClick={() => go(`projects/${p.slug}`)}>
                                    {p.title}
                                </button>
                            ))}
                            <div className="ie-sep" />
                            {EXTERNAL_LINKS.filter((l) => l.id !== 'email').map((l) => (
                                <a key={l.id} role="menuitem" href={l.url} target="_blank" rel="noopener noreferrer">🔗 {l.label}</a>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="ie-toolbar">
                <button className="ie-tool" onClick={() => step(back)} disabled={!canGoBack(history)}>◀ {t('ie.back')}</button>
                <button className="ie-tool" onClick={() => step(forward)} disabled={!canGoForward(history)}>{t('ie.forward')} ▶</button>
                <button className="ie-tool" onClick={() => go(HOME)}>🏠 {t('ie.home')}</button>
                <img src={ieLogo} alt="" className={`ie-throbber ${loading ? 'spinning' : ''}`} aria-hidden="true" />
            </div>

            <form className="ie-address" onSubmit={submitAddress}>
                <label htmlFor="ie-address-input">{t('ie.address')}</label>
                <input
                    id="ie-address-input"
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    spellCheck="false"
                />
                <button type="submit" className="ie-tool">{t('ie.go')}</button>
            </form>

            <div className="ie-page" key={path}>{page}</div>

            <div className="ie-status">{loading ? t('ie.loading') : (notice || t('ie.done'))}</div>
        </div>
    );
};

export default InternetExplorer;
