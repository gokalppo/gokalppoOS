import React, { useState } from 'react';
import './Gallery.css';

import { PROJECTS } from '../../data/projects';
import { useLanguage } from '../../context/LanguageContext';
import { localized } from '../../i18n/translate';

const Gallery = () => {
    const { t, lang } = useLanguage();
    const [selectedProject, setSelectedProject] = useState(null);
    const projects = PROJECTS;

    return (
        <div className="gallery-container">
            <div className="gallery-grid">
                {projects.map(project => (
                    <div
                        key={project.id}
                        className="gallery-item"
                        onClick={() => setSelectedProject(project)}
                    >
                        <div className="gallery-thumb-wrapper">
                            <img src={project.image} alt={project.title} className="gallery-thumb" />
                        </div>
                        <div className="gallery-title">{project.title}</div>
                    </div>
                ))}
            </div>

            {/* DETAIL MODAL */}
            {selectedProject && (
                <div className="gallery-modal-overlay" onClick={() => setSelectedProject(null)}>
                    <div className="gallery-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="gallery-modal-header">
                            <span>{t('gallery.viewer')} - {selectedProject.title}</span>
                            <button className="gallery-modal-close" onClick={() => setSelectedProject(null)}>X</button>
                        </div>
                        <div className="gallery-modal-content">
                            <img src={selectedProject.image} alt={selectedProject.title} className="gallery-full-img" />
                            <div className="gallery-modal-desc-box">
                                <div className="gallery-modal-title">{selectedProject.title}</div>
                                {selectedProject.tech && (
                                    <div className="gallery-tech-badges">
                                        {selectedProject.tech.map((t) => (
                                            <span key={t} className="gallery-tech-badge">{t}</span>
                                        ))}
                                    </div>
                                )}
                                <div style={{ whiteSpace: 'pre-wrap' }}>{localized(selectedProject.description, lang)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Gallery;
