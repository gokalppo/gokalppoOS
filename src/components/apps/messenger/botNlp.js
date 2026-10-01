// Tiny language helpers for Gökalp Bot: accent-folding, fuzzy keyword matching and language detection.
// Everything is pure so the bot can be tested with plain strings.

// "İletişim" -> "iletisim", "Özgeçmiş" -> "ozgecmis", "c++" -> "cpp". Lets people type with or without Turkish letters.
export const fold = (value) => String(value ?? '')
    .replace(/İ/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/c\+\+/g, 'cpp')
    .replace(/c#/g, 'csharp');

export const tokenize = (value) => fold(value).split(/[^a-z0-9]+/).filter(Boolean);

// Edit distance with an early exit once it is certain to exceed `limit`.
export const editDistance = (a, b, limit = 3) => {
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const row = [i];
        let rowMin = i;
        for (let j = 1; j <= b.length; j++) {
            row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            rowMin = Math.min(rowMin, row[j]);
        }
        if (rowMin > limit) return limit + 1;
        prev = row;
    }
    return prev[b.length];
};

// Does one typed word match a keyword?
//   "=word"  exact only
//   long words also match with a suffix ("projelerinden" ~ "proje") or one/two typos ("linkedn" ~ "linkedin")
export const tokenMatches = (token, keyword) => {
    if (keyword.startsWith('=')) return token === keyword.slice(1);
    if (token === keyword) return true;
    if (keyword.length >= 4 && token.startsWith(keyword)) return true;
    if (keyword.length >= 5 && token.length >= 5) {
        const limit = keyword.length >= 8 ? 2 : 1;
        return editDistance(token, keyword, limit) <= limit;
    }
    return false;
};

// Does the folded text contain this phrase as whole words?
export const hasPhrase = (foldedText, phrase) => ` ${foldedText} `.includes(` ${phrase} `);

// The folded text with single spaces and no punctuation, for phrase matching.
export const normalizeText = (value) => tokenize(value).join(' ');

const TR_WORDS = new Set(['ve', 'bir', 'bu', 'mi', 'mu', 'ne', 'nasil', 'neden', 'icin', 'ben', 'sen', 'evet', 'hayir', 'tamam',
    'merhaba', 'selam', 'slm', 'naber', 'nasilsin', 'tesekkurler', 'sagol', 'proje', 'projeler', 'yetenekler', 'iletisim',
    'ozgecmis', 'kimdir', 'kim', 'misin', 'musun', 'var', 'yok', 'cok', 'daha', 'gokalp', 'lutfen', 'bana', 'sana', 'biraz',
    'peki', 'anlat', 'goster', 'hangi', 'olarak', 'ama', 'veya', 'de', 'da', 'icin', 'mesaj', 'birak', 'fikra', 'adim', 'ismim']);
const EN_WORDS = new Set(['the', 'is', 'are', 'you', 'what', 'how', 'who', 'why', 'where', 'can', 'your', 'his', 'about', 'me',
    'hi', 'hello', 'hey', 'thanks', 'thank', 'please', 'tell', 'show', 'do', 'does', 'and', 'with', 'for', 'this', 'that',
    'projects', 'skills', 'resume', 'contact', 'message', 'joke', 'yes', 'no', 'my', 'name', 'i', 'am', 'it', 'a', 'to', 'of']);

// 'en' | 'tr' | null (not sure). Turkish-only letters are a strong hint; otherwise count common words.
export const detectLanguage = (text) => {
    const raw = String(text ?? '');
    if (/[çğıöşüÇĞİÖŞÜ]/.test(raw)) return 'tr';
    const tokens = tokenize(raw);
    let tr = 0;
    let en = 0;
    tokens.forEach((t) => {
        if (TR_WORDS.has(t)) tr++;
        if (EN_WORDS.has(t)) en++;
    });
    if (tr === en) return null;
    return tr > en ? 'tr' : 'en';
};
