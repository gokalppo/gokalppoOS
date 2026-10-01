// Content for the System Properties window. Everything here is derived from the
// real projects shown in the Gallery — edit freely, the UI renders whatever is listed.

export const OWNER = {
    name: 'Gökalp Eker',
    role: { en: 'Computer Engineering student (3rd year)', tr: 'Bilgisayar Mühendisliği öğrencisi (3. sınıf)' }
};

export const SYSTEM_INFO = {
    system: ['gokalppoOS', { en: 'Version 1.0 (Retro Edition)', tr: 'Sürüm 1.0 (Retro Sürüm)' }],
    registeredTo: [OWNER.name, OWNER.role],
    computer: [
        [{ en: 'Processor', tr: 'İşlemci' }, 'React 19 / Vite 7'],
        [{ en: 'Memory', tr: 'Bellek' }, 'Firebase Realtime Database'],
        [{ en: 'Storage', tr: 'Depolama' }, { en: 'localStorage (virtual disk)', tr: 'localStorage (sanal disk)' }],
        [{ en: 'Network', tr: 'Ağ' }, { en: 'Firebase Auth + live sync', tr: 'Firebase Auth + canlı eşitleme' }],
        [{ en: 'Hosting', tr: 'Barındırma' }, 'Netlify']
    ]
};

const IOT = 'IoT Smart Air Quality';
const TOTP = 'Hardware TOTP Token';
const SCANNER = 'Document Scanner';
const DETECTOR = 'AI Image Detector';
const CINDRA = 'CindraNet';
const OS_SITE = { en: 'gokalppoOS (this site)', tr: 'gokalppoOS (bu site)' };

// Skills are shown as "devices" in a Device Manager tree.
export const DEVICE_GROUPS = [
    {
        id: 'languages',
        name: { en: 'Languages', tr: 'Diller' },
        devices: [
            { name: 'C++', usedIn: [IOT, SCANNER], note: { en: 'Firmware and image processing.', tr: 'Üretici yazılım ve görüntü işleme.' } },
            { name: 'Embedded C', usedIn: [TOTP], note: { en: 'Bare-metal firmware for the hardware token.', tr: 'Donanım token\'ı için bare-metal yazılım.' } },
            { name: 'Rust', usedIn: [CINDRA], note: { en: 'Core of the P2P messenger.', tr: 'P2P mesajlaşmanın çekirdeği.' } },
            { name: 'Python', usedIn: [DETECTOR], note: { en: 'Model training with PyTorch.', tr: 'PyTorch ile model eğitimi.' } },
            { name: 'JavaScript', usedIn: [OS_SITE], note: { en: 'Everything you are looking at.', tr: 'Şu an gördüğünüz her şey.' } }
        ]
    },
    {
        id: 'web',
        name: { en: 'Web & Cloud', tr: 'Web ve Bulut' },
        devices: [
            { name: 'React 19', usedIn: [OS_SITE], note: { en: 'UI, window manager, apps.', tr: 'Arayüz, pencere yöneticisi, uygulamalar.' } },
            { name: 'Vite 7', usedIn: [OS_SITE], note: { en: 'Build tooling and code splitting.', tr: 'Derleme araçları ve kod bölme.' } },
            { name: 'Firebase', usedIn: [OS_SITE], note: { en: 'Authentication and Realtime Database (Messenger, visitor counter).', tr: 'Kimlik doğrulama ve Realtime Database (Messenger, ziyaretçi sayacı).' } },
            { name: 'Tauri', usedIn: [CINDRA], note: { en: 'Desktop shell for the messenger.', tr: 'Mesajlaşma uygulamasının masaüstü kabuğu.' } },
            { name: 'Netlify', usedIn: [OS_SITE], note: { en: 'Automatic deploys from GitHub.', tr: 'GitHub\'dan otomatik yayınlama.' } }
        ]
    },
    {
        id: 'embedded',
        name: { en: 'Embedded & Hardware', tr: 'Gömülü Sistemler ve Donanım' },
        devices: [
            { name: 'ESP32', usedIn: [IOT], note: { en: 'Microcontroller with Wi-Fi.', tr: 'Wi-Fi\'lı mikrodenetleyici.' } },
            { name: 'DHT22', usedIn: [IOT], note: { en: 'Temperature and humidity sensor.', tr: 'Sıcaklık ve nem sensörü.' } },
            { name: 'MQ-135', usedIn: [IOT], note: { en: 'Air quality gas sensor.', tr: 'Hava kalitesi gaz sensörü.' } },
            { name: 'SSD1306 OLED', usedIn: [IOT, TOTP], note: { en: 'I2C display, 128x64.', tr: 'I2C ekran, 128x64.' } },
            { name: 'Blynk', usedIn: [IOT], note: { en: 'Remote monitoring dashboard.', tr: 'Uzaktan izleme paneli.' } }
        ]
    },
    {
        id: 'vision-ml',
        name: { en: 'Computer Vision & ML', tr: 'Bilgisayarlı Görü ve ML' },
        devices: [
            { name: 'OpenCV', usedIn: [SCANNER], note: { en: 'Corner detection and perspective correction.', tr: 'Köşe tespiti ve perspektif düzeltme.' } },
            { name: 'Canny Edge Detection', usedIn: [SCANNER], note: { en: 'Document boundary finding.', tr: 'Belge sınırlarını bulma.' } },
            { name: 'PyTorch', usedIn: [DETECTOR], note: { en: 'Training and inference.', tr: 'Eğitim ve çıkarım.' } },
            { name: 'ResNet18', usedIn: [DETECTOR], note: { en: 'Transfer learning, 97.2% test accuracy.', tr: 'Transfer öğrenme, %97,2 test doğruluğu.' } }
        ]
    },
    {
        id: 'security',
        name: { en: 'Security & Networking', tr: 'Güvenlik ve Ağ' },
        devices: [
            { name: 'TOTP', usedIn: [TOTP], note: { en: 'Time-based one-time passwords.', tr: 'Zaman tabanlı tek kullanımlık şifreler.' } },
            { name: 'X3DH + Double Ratchet', usedIn: [CINDRA], note: { en: 'End-to-end encryption with forward secrecy.', tr: 'İleri gizlilikli uçtan uca şifreleme.' } },
            { name: 'Kademlia DHT', usedIn: [CINDRA], note: { en: 'Decentralized peer discovery.', tr: 'Merkezi olmayan eş keşfi.' } }
        ]
    }
];
