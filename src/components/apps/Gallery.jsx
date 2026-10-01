import React, { useState } from 'react';
import './Gallery.css';

// Import images
import imgIoT from '../../assets/images/gallery01.webp';
import imgTOTP from '../../assets/images/gallery02.webp';
import imgScanner from '../../assets/images/gallery03.webp';
import imgAI from '../../assets/images/gallery04.webp';
import imgCindraNet from '../../assets/images/cindranet.svg';

const Gallery = () => {
    const [selectedProject, setSelectedProject] = useState(null);

    const projects = [
        {
            id: 1,
            title: "IoT Smart Air Quality",
            image: imgIoT,
            tech: ["ESP32", "C++", "DHT22", "MQ-135", "SSD1306 OLED", "Blynk"],
            description: "Real-time environment monitoring system built on ESP32 and C++, with integrated DHT22 (temperature/humidity) and MQ-135 (air quality) sensors.\n\nFeatures:\n- Local visualization via I2C on an SSD1306 OLED display\n- Remote monitoring through the Blynk IoT Platform\n- Retro LCD-style UI"
        },
        {
            id: 2,
            title: "Hardware TOTP Token",
            image: imgTOTP,
            tech: ["Embedded C", "OLED 128x64", "Secure Storage"],
            description: "Physical Two-Factor Authentication device built from scratch.\n\nSpecs:\n- Generating Time-Based OTPs\n- OLED Display (128x64)\n- Secure Key Storage\n- Battery powered for portability"
        },
        {
            id: 3,
            title: "Document Scanner",
            image: imgScanner,
            tech: ["C++", "OpenCV", "Canny Edge Detection"],
            description: "Image processing pipeline developed with C++ and OpenCV, using Canny edge detection and transformation matrices for document warping.\n\nCapabilities:\n- Automatic corner detection\n- Perspective correction\n- Adaptive thresholding to enhance text readability and remove environmental shadows"
        },
        {
            id: 4,
            title: "AI Image Detector",
            image: imgAI,
            tech: ["PyTorch", "ResNet18", "Transfer Learning"],
            description: "Binary classification model distinguishing real vs. AI-generated images, using transfer learning on the ResNet18 architecture.\n\nResults:\n- Trained on the CIFAKE dataset (100k+ images)\n- 97.2% test accuracy on held-out data\n- Gradio web interface for live inference"
        },
        {
            id: 5,
            title: "CindraNet",
            image: imgCindraNet,
            tech: ["Rust", "Tauri", "X3DH", "Double Ratchet", "Kademlia DHT"],
            description: "Decentralized, end-to-end encrypted P2P messaging platform built in Rust. (Private repository — code available upon request.)\n\nHighlights:\n- X3DH + Double Ratchet with forward secrecy, skipped-message-key handling, and encrypted local key storage\n- Kademlia-style DHT for public-key peer discovery\n- Multi-hop onion-routing/relay layer (layered X25519 encryption) with trust/latency-based route selection and NAT traversal via rendezvous relaying\n- Signed, hash-chained group membership state and encrypted redundant backups\n- Tauri desktop client sharing the same Rust protocol core; fuzzing-lite and state-machine tests caught real race conditions and mutex poisoning in multi-node testing"
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
                                {selectedProject.tech && (
                                    <div className="gallery-tech-badges">
                                        {selectedProject.tech.map((t) => (
                                            <span key={t} className="gallery-tech-badge">{t}</span>
                                        ))}
                                    </div>
                                )}
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
