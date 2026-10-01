// "Gökalp Bot": a small rule-based assistant that answers questions about the portfolio.
// It runs entirely in the browser (no backend, no cost) and is honest about being a bot.
import { PROJECTS, GITHUB_PROFILE } from '../../../data/projects';
import { OWNER, DEVICE_GROUPS } from '../../../data/profile';
import { localized } from '../../../i18n/translate';

export const BOT_NAME = 'Gökalp Bot';
const EMAIL = 'ekergokalp@gmail.com';
const LINKEDIN = 'https://www.linkedin.com/in/gokalp-eker/';

const TEXT = {
    en: {
        greeting: `Hi! I'm ${BOT_NAME}, an automated assistant for this portfolio. Ask me about the projects, skills, resume or how to get in touch.`,
        help: 'I can talk about: projects (or any one by name), skills, the resume, contact details, and who Gökalp is. Just type a question or tap a button.',
        whoAmI: `I'm ${BOT_NAME}, a small rule-based bot living in this Messenger. I'm not the real Gökalp, but I know his portfolio well. To reach the real one, ask me for his contact details.`,
        about: (name, role) => `${name} is a ${role}. He enjoys building where hardware meets software: embedded devices, computer vision, machine learning, secure messaging and retro-style web apps like this one.`,
        projects: (lines) => `Here are the projects:\n${lines}\nAsk about any of them by name for details.`,
        project: (p, summary, tech, source, demo) =>
            `${p.title}: ${summary}\nTechnologies: ${tech}.${source ? `\nSource: ${source}` : '\n(Private repository, code is available on request.)'}${demo ? `\nDemo: ${demo}` : ''}`,
        skills: (lines) => `Here's what Gökalp works with:\n${lines}\nOpen Start > Settings > System Properties > Device Manager to see where each one is used.`,
        resume: 'You can read the resume by double-clicking "My Resume" on the desktop, or type "resume" in the Terminal. The PDF can be downloaded from that window too.',
        contact: `You can reach Gökalp at ${EMAIL}. LinkedIn: ${LINKEDIN} and GitHub: ${GITHUB_PROFILE}. The Contact icon on the desktop can copy the email for you.`,
        github: `Gökalp's GitHub: ${GITHUB_PROFILE}`,
        linkedin: `Gökalp's LinkedIn: ${LINKEDIN}`,
        site: 'This whole desktop is a project too: React + Vite, with Firebase for the Messenger, guestbook and leaderboard. Open the "gokalppoOS" source from Internet Explorer > Links.',
        secret: 'A secret? Try the Konami code: ↑ ↑ ↓ ↓ ← → ← → B A. And the Terminal has a hidden command or two.',
        thanks: "You're welcome! Anything else you'd like to know?",
        bye: 'Bye! Thanks for stopping by. Sign the Guestbook on your way out!',
        fallback: "Hmm, I didn't catch that. I can tell you about the projects, skills, resume or contact details. Try one of the buttons below.",
        suggestions: ['Projects', 'Skills', 'Resume', 'Contact']
    },
    tr: {
        greeting: `Merhaba! Ben ${BOT_NAME}, bu portfolyonun otomatik asistanıyım. Bana projeleri, yetenekleri, özgeçmişi veya iletişim bilgilerini sorabilirsin.`,
        help: 'Şunlardan bahsedebilirim: projeler (ya da herhangi biri adıyla), yetenekler, özgeçmiş, iletişim bilgileri ve Gökalp kim. Bir soru yaz ya da bir düğmeye dokun.',
        whoAmI: `Ben ${BOT_NAME}, bu Messenger'da yaşayan küçük, kural tabanlı bir botum. Gerçek Gökalp değilim ama portfolyosunu iyi bilirim. Gerçeğine ulaşmak için bana iletişim bilgilerini sor.`,
        about: (name, role) => `${name}, ${role}. Donanım ile yazılımın buluştuğu şeyler üretmeyi sever: gömülü cihazlar, bilgisayarlı görü, makine öğrenmesi, güvenli mesajlaşma ve bunun gibi retro tarzı web uygulamaları.`,
        projects: (lines) => `Projeler şunlar:\n${lines}\nDetay için herhangi birini adıyla sorabilirsin.`,
        project: (p, summary, tech, source, demo) =>
            `${p.title}: ${summary}\nTeknolojiler: ${tech}.${source ? `\nKaynak: ${source}` : '\n(Özel depo, kod talep üzerine paylaşılır.)'}${demo ? `\nDemo: ${demo}` : ''}`,
        skills: (lines) => `Gökalp'in çalıştığı alanlar:\n${lines}\nHer birinin nerede kullanıldığını görmek için Başlat > Ayarlar > Sistem Özellikleri > Aygıt Yöneticisi'ne bak.`,
        resume: 'Özgeçmişi masaüstündeki "My Resume" simgesine çift tıklayarak okuyabilir, ya da Terminal\'e "resume" yazabilirsin. PDF o pencereden indirilebilir de.',
        contact: `Gökalp'e ${EMAIL} adresinden ulaşabilirsin. LinkedIn: ${LINKEDIN} ve GitHub: ${GITHUB_PROFILE}. Masaüstündeki Contact simgesi e-postayı senin için kopyalayabilir.`,
        github: `Gökalp'in GitHub'ı: ${GITHUB_PROFILE}`,
        linkedin: `Gökalp'in LinkedIn'i: ${LINKEDIN}`,
        site: 'Bu masaüstünün tamamı da bir proje: React + Vite, Messenger, ziyaretçi defteri ve skor tablosu için Firebase. "gokalppoOS" kaynak koduna Internet Explorer > Bağlantılar\'dan ulaşabilirsin.',
        secret: 'Bir sır mı? Konami kodunu dene: ↑ ↑ ↓ ↓ ← → ← → B A. Terminal\'de de bir iki gizli komut var.',
        thanks: 'Rica ederim! Başka merak ettiğin bir şey var mı?',
        bye: 'Görüşürüz! Uğradığın için teşekkürler. Çıkarken Ziyaretçi Defteri\'ni imzalamayı unutma!',
        fallback: 'Hmm, bunu anlayamadım. Projeler, yetenekler, özgeçmiş veya iletişim bilgileri hakkında konuşabilirim. Aşağıdaki düğmelerden birini dene.',
        suggestions: ['Projeler', 'Yetenekler', 'Özgeçmiş', 'İletişim']
    }
};

// JavaScript's \b only understands ASCII letters, so Turkish words like "özgeçmiş" never match it.
// This wraps alternatives in Unicode-aware "not part of a longer word" boundaries instead.
const word = (alternatives) =>
    new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}])`, 'iu');

// Intents are checked in order; patterns cover English and Turkish.
const INTENTS = [
    { id: 'thanks', test: word('thanks?|thank you|thx|teşekkür(ler)?|tesekkur(ler)?|sağ ?ol|sagol|eyvallah') },
    { id: 'bye', test: word('bye|goodbye|see you|görüşürüz|gorusuruz|hoşça ?kal|hosca ?kal|çıkıyorum|cikiyorum') },
    { id: 'whoAmI', test: /(who are you|are you (a )?(real|bot)|kimsin|sen kimsin|bot musun|gerçek misin)/i },
    { id: 'help', test: word('help|yardım|yardim|what can you|neler yapabil\\w*|ne yapabil\\w*|menu|menü|commands?') },
    { id: 'resume', test: word('resume|cv|özgeçmiş|ozgecmis') },
    { id: 'contact', test: word('contact|e-?mail|mail|reach|hire|iletişim|iletisim|ulaş\\w*|ulas\\w*|e-?posta') },
    { id: 'github', test: word('github|git hub') },
    { id: 'linkedin', test: word('linkedin') },
    { id: 'site', test: /(this (site|website|desktop)|bu site|bu masaüstü|gokalppoos|how (was|is) this (made|built))/i },
    { id: 'secret', test: word('secret|easter egg|konami|sır|sir|gizli') },
    { id: 'skills', test: word('skills?|tech(nolog(y|ies))?|stack|languages?|yetenek(ler)?|teknoloji(ler)?|diller') },
    { id: 'projects', test: word('projects?|portfolio|portfolyo|proje(ler)?|works?|çalışma\\w*|calisma\\w*') },
    { id: 'about', test: /(who is|about (gökalp|gokalp|him|the owner)|gökalp kim|gokalp kim|hakkında|hakkinda|tell me about)/i },
    { id: 'greeting', test: /^\s*(hi|hello|hey|yo|merhaba|selam|slm|günaydın|gunaydin|iyi (akşamlar|günler)|good (morning|evening|afternoon))(?![\p{L}\p{N}])/iu }
];

// Keywords that point at one specific project (matched before the generic "projects" list).
const PROJECT_KEYWORDS = {
    'iot-air-quality': ['iot', 'air quality', 'hava kalite', 'esp32', 'dht22', 'mq-135', 'mq135', 'blynk'],
    'totp-token': ['totp', 'token', '2fa', 'two-factor', 'authenticator', 'doğrulama', 'dogrulama'],
    'document-scanner': ['scanner', 'tarayıcı', 'tarayici', 'opencv', 'document'],
    'ai-image-detector': ['detector', 'dedektör', 'dedektor', 'resnet', 'pytorch', 'ai image', 'yapay zeka'],
    cindranet: ['cindra', 'cindranet', 'rust', 'p2p', 'x3dh', 'double ratchet']
};

const findProject = (input) => {
    const lower = input.toLowerCase();
    return PROJECTS.find((p) =>
        lower.includes(p.title.toLowerCase()) || (PROJECT_KEYWORDS[p.slug] || []).some((k) => lower.includes(k)));
};

const projectLines = (lang) => PROJECTS.map((p, i) => `${i + 1}. ${p.title} — ${localized(p.summary, lang)}`).join('\n');

const skillLines = (lang) => DEVICE_GROUPS
    .map((g) => `• ${localized(g.name, lang)}: ${g.devices.map((d) => d.name).join(', ')}`)
    .join('\n');

// Returns { text, suggestions } for whatever the visitor typed.
export const getBotReply = (input, lang = 'en') => {
    const t = TEXT[lang] || TEXT.en;
    // Turkish capital İ would otherwise lower-case to "i" + a combining dot and miss every pattern.
    const text = String(input ?? '').trim().replace(/İ/g, 'i');
    const suggestions = t.suggestions;

    if (!text) return { text: t.help, suggestions };

    const project = findProject(text);
    if (project) {
        const { source, demo } = project.links || {};
        return {
            text: t.project(project, localized(project.summary, lang), project.tech.join(', '), source, demo),
            suggestions
        };
    }

    const intent = INTENTS.find((i) => i.test.test(text));
    switch (intent?.id) {
        case 'greeting': return { text: t.greeting, suggestions };
        case 'help': return { text: t.help, suggestions };
        case 'whoAmI': return { text: t.whoAmI, suggestions };
        case 'about': return { text: t.about(OWNER.name, localized(OWNER.role, lang)), suggestions };
        case 'projects': return { text: t.projects(projectLines(lang)), suggestions };
        case 'skills': return { text: t.skills(skillLines(lang)), suggestions };
        case 'resume': return { text: t.resume, suggestions };
        case 'contact': return { text: t.contact, suggestions };
        case 'github': return { text: t.github, suggestions };
        case 'linkedin': return { text: t.linkedin, suggestions };
        case 'site': return { text: t.site, suggestions };
        case 'secret': return { text: t.secret, suggestions };
        case 'thanks': return { text: t.thanks, suggestions };
        case 'bye': return { text: t.bye, suggestions: [] };
        default: return { text: t.fallback, suggestions };
    }
};

export const getBotGreeting = (lang = 'en') => {
    const t = TEXT[lang] || TEXT.en;
    return { text: t.greeting, suggestions: t.suggestions };
};

// How long the "typing..." indicator lasts for a reply (feels more natural than instant).
export const botTypingDelayMs = (replyText) => Math.min(1400, 450 + replyText.length * 6);
