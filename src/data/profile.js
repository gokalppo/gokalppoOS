// Content for the System Properties window. Everything here is derived from the
// real projects shown in the Gallery — edit freely, the UI renders whatever is listed.

export const OWNER = {
    name: 'Gökalp Eker',
    role: 'Computer Engineering student (3rd year)'
};

export const SYSTEM_INFO = {
    system: ['gokalppoOS', 'Version 1.0 (Retro Edition)'],
    registeredTo: [OWNER.name, OWNER.role],
    computer: [
        ['Processor', 'React 19 / Vite 7'],
        ['Memory', 'Firebase Realtime Database'],
        ['Storage', 'localStorage (virtual disk)'],
        ['Network', 'Firebase Auth + live sync'],
        ['Hosting', 'Netlify']
    ]
};

const IOT = 'IoT Smart Air Quality';
const TOTP = 'Hardware TOTP Token';
const SCANNER = 'Document Scanner';
const DETECTOR = 'AI Image Detector';
const CINDRA = 'CindraNet';
const OS_SITE = 'gokalppoOS (this site)';

// Skills are shown as "devices" in a Device Manager tree.
export const DEVICE_GROUPS = [
    {
        id: 'languages',
        name: 'Languages',
        devices: [
            { name: 'C++', usedIn: [IOT, SCANNER], note: 'Firmware and image processing.' },
            { name: 'Embedded C', usedIn: [TOTP], note: 'Bare-metal firmware for the hardware token.' },
            { name: 'Rust', usedIn: [CINDRA], note: 'Core of the P2P messenger.' },
            { name: 'Python', usedIn: [DETECTOR], note: 'Model training with PyTorch.' },
            { name: 'JavaScript', usedIn: [OS_SITE], note: 'Everything you are looking at.' }
        ]
    },
    {
        id: 'web',
        name: 'Web & Cloud',
        devices: [
            { name: 'React 19', usedIn: [OS_SITE], note: 'UI, window manager, apps.' },
            { name: 'Vite 7', usedIn: [OS_SITE], note: 'Build tooling and code splitting.' },
            { name: 'Firebase', usedIn: [OS_SITE], note: 'Authentication and Realtime Database (Messenger, visitor counter).' },
            { name: 'Tauri', usedIn: [CINDRA], note: 'Desktop shell for the messenger.' },
            { name: 'Netlify', usedIn: [OS_SITE], note: 'Automatic deploys from GitHub.' }
        ]
    },
    {
        id: 'embedded',
        name: 'Embedded & Hardware',
        devices: [
            { name: 'ESP32', usedIn: [IOT], note: 'Microcontroller with Wi-Fi.' },
            { name: 'DHT22', usedIn: [IOT], note: 'Temperature and humidity sensor.' },
            { name: 'MQ-135', usedIn: [IOT], note: 'Air quality gas sensor.' },
            { name: 'SSD1306 OLED', usedIn: [IOT, TOTP], note: 'I2C display, 128x64.' },
            { name: 'Blynk', usedIn: [IOT], note: 'Remote monitoring dashboard.' }
        ]
    },
    {
        id: 'vision-ml',
        name: 'Computer Vision & ML',
        devices: [
            { name: 'OpenCV', usedIn: [SCANNER], note: 'Corner detection and perspective correction.' },
            { name: 'Canny Edge Detection', usedIn: [SCANNER], note: 'Document boundary finding.' },
            { name: 'PyTorch', usedIn: [DETECTOR], note: 'Training and inference.' },
            { name: 'ResNet18', usedIn: [DETECTOR], note: 'Transfer learning, 97.2% test accuracy.' }
        ]
    },
    {
        id: 'security',
        name: 'Security & Networking',
        devices: [
            { name: 'TOTP', usedIn: [TOTP], note: 'Time-based one-time passwords.' },
            { name: 'X3DH + Double Ratchet', usedIn: [CINDRA], note: 'End-to-end encryption with forward secrecy.' },
            { name: 'Kademlia DHT', usedIn: [CINDRA], note: 'Decentralized peer discovery.' }
        ]
    }
];
