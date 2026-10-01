import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { RESUME_URL, RESUME_FILENAME } from './resumeInfo';
import './MyResume.css';

const MyResume = () => {
    const { t } = useLanguage();
    return (
        <div className="resume-root">
            <div className="resume-bar">
                <a className="resume-btn" href={RESUME_URL} download={RESUME_FILENAME}>⬇ {t('resume.download')}</a>
                <a className="resume-btn" href={RESUME_URL} target="_blank" rel="noopener noreferrer">↗ {t('resume.openTab')}</a>
                <span className="resume-hint">{t('resume.hint')}</span>
            </div>
            <iframe
                className="resume-frame"
                src={`${RESUME_URL}#toolbar=0&navpanes=0&scrollbar=0`}
                title="Gokalp Eker Resume"
            />
        </div>
    );
};

export default MyResume;
