import React, { useState } from 'react';
import './Gallery.css';

// Import images
import imgIoT from '../../assets/images/gallery01.jpeg';
import imgTOTP from '../../assets/images/gallery02.jpeg';
import imgScanner from '../../assets/images/gallery03.png';
import imgAI from '../../assets/images/gallery04.png';

const Gallery = () => {
    const [selectedProject, setSelectedProject] = useState(null);

    const projects = [
        {
            id: 1,
            title: "IoT Smart Air Quality",
            image: imgIoT,
            description: "A comprehensive IoT solution using ESP32, MQ-135, and DHT22 sensors. \n\nFeatures:\n- Real-time air quality monitoring\n- Temperature & Humidity tracking\n- WebSocket data streaming\n- Retro LCD display integration"
        },
        {
            id: 2,
            title: "Hardware TOTP Token",
            image: imgTOTP,
            description: "Physical Two-Factor Authentication device built from scratch.\n\nSpecs:\n- Generating Time-Based OTPs\n- OLED Display (128x64)\n- Secure Key Storage\n- Battery powered for portability"
        },
        {
            id: 3,
            title: "Document Scanner",
            image: imgScanner,
            description: "Image processing application developed with C++ and OpenCV.\n\nCapabilities:\n- Automatic corner detection\n- Perspective correction\n- Optical Character Recognition (OCR)\n- Edge enhancement filters"
        },
        {
            id: 4,
            title: "AI Image Detector",
            image: imgAI,
            description: "A deep learning model using ResNet18 to detect AI-generated images with 99.97% accuracy. Includes a Gradio web interface."
        }
    ];

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
                            <span>Image Viewer - {selectedProject.title}</span>
                            <button className="gallery-modal-close" onClick={() => setSelectedProject(null)}>X</button>
                        </div>
                        <div className="gallery-modal-content">
                            <img src={selectedProject.image} alt={selectedProject.title} className="gallery-full-img" />
                            <div className="gallery-modal-desc-box">
                                <div className="gallery-modal-title">{selectedProject.title}</div>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{selectedProject.description}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Gallery;
