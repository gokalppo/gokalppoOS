import { useLanguage } from '../../context/LanguageContext';
import './ProjectLinks.css';

// "Source code" / "Watch demo" buttons for a project (renders nothing when it has no links).
const ProjectLinks = ({ project }) => {
    const { t } = useLanguage();
    const { source, demo } = project.links || {};
    if (!source && !demo) return null;

    return (
        <div className="project-links">
            {source && (
                <a className="project-link" href={source} target="_blank" rel="noopener noreferrer">
                    {t('project.source')}
                </a>
            )}
            {demo && (
                <a className="project-link" href={demo} target="_blank" rel="noopener noreferrer">
                    {t('project.demo')}
                </a>
            )}
        </div>
    );
};

export default ProjectLinks;
