import imgIoT from '../assets/images/gallery01.webp';
import imgTOTP from '../assets/images/gallery02.webp';
import imgScanner from '../assets/images/gallery03.webp';
import imgAI from '../assets/images/gallery04.webp';
import imgCindraNet from '../assets/images/cindranet.svg';

// Single source of truth for the portfolio projects (Gallery, Internet Explorer, Terminal).
// `description` is localized: { en, tr }.
export const PROJECTS = [
    {
        id: 1,
        slug: 'iot-air-quality',
        title: 'IoT Smart Air Quality',
        image: imgIoT,
        tech: ['ESP32', 'C++', 'DHT22', 'MQ-135', 'SSD1306 OLED', 'Blynk'],
        summary: {
            en: 'ESP32 environment monitor with temperature, humidity and air-quality sensors.',
            tr: 'Sıcaklık, nem ve hava kalitesi sensörlü ESP32 ortam izleme sistemi.'
        },
        description: {
            en: 'Real-time environment monitoring system built on ESP32 and C++, with integrated DHT22 (temperature/humidity) and MQ-135 (air quality) sensors.\n\nFeatures:\n- Local visualization via I2C on an SSD1306 OLED display\n- Remote monitoring through the Blynk IoT Platform\n- Retro LCD-style UI',
            tr: 'ESP32 ve C++ üzerine kurulu, DHT22 (sıcaklık/nem) ve MQ-135 (hava kalitesi) sensörlerini içeren gerçek zamanlı ortam izleme sistemi.\n\nÖzellikler:\n- SSD1306 OLED ekranda I2C ile yerel görselleştirme\n- Blynk IoT Platformu üzerinden uzaktan izleme\n- Retro LCD tarzı arayüz'
        }
    },
    {
        id: 2,
        slug: 'totp-token',
        title: 'Hardware TOTP Token',
        image: imgTOTP,
        tech: ['Embedded C', 'OLED 128x64', 'Secure Storage'],
        summary: {
            en: 'A physical two-factor authentication device built from scratch.',
            tr: 'Sıfırdan geliştirilmiş fiziksel bir iki faktörlü doğrulama cihazı.'
        },
        description: {
            en: 'Physical Two-Factor Authentication device built from scratch.\n\nSpecs:\n- Generating Time-Based OTPs\n- OLED Display (128x64)\n- Secure Key Storage\n- Battery powered for portability',
            tr: 'Sıfırdan geliştirilmiş fiziksel iki faktörlü doğrulama cihazı.\n\nÖzellikler:\n- Zaman tabanlı tek kullanımlık şifre (TOTP) üretimi\n- OLED ekran (128x64)\n- Güvenli anahtar depolama\n- Taşınabilirlik için pil ile çalışır'
        }
    },
    {
        id: 3,
        slug: 'document-scanner',
        title: 'Document Scanner',
        image: imgScanner,
        tech: ['C++', 'OpenCV', 'Canny Edge Detection'],
        summary: {
            en: 'C++/OpenCV pipeline: corner detection, perspective correction, shadow removal.',
            tr: 'C++/OpenCV hattı: köşe tespiti, perspektif düzeltme, gölge giderme.'
        },
        description: {
            en: 'Image processing pipeline developed with C++ and OpenCV, using Canny edge detection and transformation matrices for document warping.\n\nCapabilities:\n- Automatic corner detection\n- Perspective correction\n- Adaptive thresholding to enhance text readability and remove environmental shadows',
            tr: 'C++ ve OpenCV ile geliştirilmiş, Canny kenar tespiti ve dönüşüm matrisleriyle belgeyi düzleştiren görüntü işleme hattı.\n\nYetenekler:\n- Otomatik köşe tespiti\n- Perspektif düzeltme\n- Metin okunabilirliğini artıran ve ortam gölgelerini gideren uyarlanabilir eşikleme'
        }
    },
    {
        id: 4,
        slug: 'ai-image-detector',
        title: 'AI Image Detector',
        image: imgAI,
        tech: ['PyTorch', 'ResNet18', 'Transfer Learning'],
        summary: {
            en: 'ResNet18 model that tells real images from AI-generated ones (97.2% accuracy).',
            tr: 'Gerçek görselleri yapay zekâ ürünlerinden ayıran ResNet18 modeli (%97,2 doğruluk).'
        },
        description: {
            en: 'Binary classification model distinguishing real vs. AI-generated images, using transfer learning on the ResNet18 architecture.\n\nResults:\n- Trained on the CIFAKE dataset (100k+ images)\n- 97.2% test accuracy on held-out data\n- Gradio web interface for live inference',
            tr: 'ResNet18 mimarisi üzerinde transfer öğrenme kullanarak gerçek ve yapay zekâ üretimi görselleri ayıran ikili sınıflandırma modeli.\n\nSonuçlar:\n- CIFAKE veri kümesiyle eğitildi (100 binden fazla görsel)\n- Ayrılmış test verisinde %97,2 doğruluk\n- Canlı çıkarım için Gradio web arayüzü'
        }
    },
    {
        id: 5,
        slug: 'cindranet',
        title: 'CindraNet',
        image: imgCindraNet,
        tech: ['Rust', 'Tauri', 'X3DH', 'Double Ratchet', 'Kademlia DHT'],
        summary: {
            en: 'Decentralized, end-to-end encrypted P2P messaging platform built in Rust.',
            tr: 'Rust ile geliştirilmiş, merkezi olmayan, uçtan uca şifreli P2P mesajlaşma platformu.'
        },
        description: {
            en: 'Decentralized, end-to-end encrypted P2P messaging platform built in Rust. (Private repository — code available upon request.)\n\nHighlights:\n- X3DH + Double Ratchet with forward secrecy, skipped-message-key handling, and encrypted local key storage\n- Kademlia-style DHT for public-key peer discovery\n- Multi-hop onion-routing/relay layer (layered X25519 encryption) with trust/latency-based route selection and NAT traversal via rendezvous relaying\n- Signed, hash-chained group membership state and encrypted redundant backups\n- Tauri desktop client sharing the same Rust protocol core; fuzzing-lite and state-machine tests caught real race conditions and mutex poisoning in multi-node testing',
            tr: 'Rust ile geliştirilmiş, merkezi olmayan, uçtan uca şifreli P2P mesajlaşma platformu. (Özel depo — kod talep üzerine paylaşılır.)\n\nÖne çıkanlar:\n- İleri gizlilikli X3DH + Double Ratchet, atlanan mesaj anahtarı yönetimi ve şifreli yerel anahtar depolama\n- Açık anahtarla eş keşfi için Kademlia tarzı DHT\n- Güven/gecikme tabanlı rota seçimli, çok sıçramalı onion-routing/röle katmanı (katmanlı X25519 şifreleme) ve rendezvous röleleriyle NAT geçişi\n- İmzalı, hash zincirli grup üyelik durumu ve şifreli yedekli yedekler\n- Aynı Rust protokol çekirdeğini paylaşan Tauri masaüstü istemcisi; hafif fuzzing ve durum makinesi testleri, çok düğümlü testlerde gerçek yarış durumlarını ve mutex zehirlenmesini yakaladı'
        }
    }
];
