// A first line of defence for what visitors teach the bot. Anything that passes still waits for
// Gökalp's approval before other people see it; this just keeps the obvious junk out of the queue.
import { fold, tokenize } from './botNlp';

export const TEACH_Q_MAX = 80;
export const TEACH_A_MAX = 200;
export const TEACH_MIN_LETTERS = 2;

// Strong insults, slurs and sexual words, written folded (no Turkish letters). Matched as whole words
// or as the start of a word, so "orospu" also catches "orospuluk". The bot itself may say "lan" or
// "salak"; this list is only for things people try to make it repeat.
const BLOCKED_STEMS = [
    // Turkish
    'orospu', 'oruspu', 'amk', 'aq', 'sik', 'siktir', 'sikik', 'yarak', 'yarrak', 'amcik', 'gotveren', 'ibne',
    'pust', 'gavat', 'kahpe', 'tasak', 'sokuk', 'serefsiz', 'pezevenk', 'yavsak', 'anani', 'bacini', 'amina',
    'aminakoy', 'dalyarak', 'gerizekali', 'dangalak',
    // English
    'fuck', 'shit', 'bitch', 'cunt', 'pussy', 'asshole', 'bastard', 'whore', 'slut', 'nigger', 'nigga', 'faggot',
    'retard', 'porn', 'wanker', 'motherfucker', 'dick', 'cock', 'rape'
];

// Short stems that are also ordinary words elsewhere ("dick" a name, "cock" in "cocktail", "sik" in "sikayet")
// only count when they are the whole word.
const EXACT_ONLY = new Set(['amk', 'aq', 'sik', 'dick', 'cock', 'rape', 'pust']);

const BLOCKED = BLOCKED_STEMS.map((s) => fold(s));
const isBlockedToken = (token) => BLOCKED.some((stem) => (EXACT_ONLY.has(stem) ? token === stem : token === stem || token.startsWith(stem)));

export const hasBlockedWord = (text) => {
    if (tokenize(text).some(isBlockedToken)) return true;
    // "s i k t i r" or "f.u.c.k": single letters separated by spaces or punctuation, glued back together
    const spelled = String(text).match(/(?:^|[^\p{L}])((?:\p{L}[\s.\-_*]+){3,}\p{L})(?![\p{L}])/gu) || [];
    return spelled.some((chunk) => tokenize(chunk.replace(/[\s.\-_*]+/g, '')).some(isBlockedToken));
};

const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|me|co|tr|ru|xyz|info|ly|gg)\b)/i;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const REPEAT_RE = /(.)\1{5,}/;

// 'ok' or the reason it was refused: 'short' | 'long' | 'link' | 'contact' | 'spam' | 'rude'
export const checkTeachable = (text, kind = 'answer') => {
    const value = String(text ?? '').trim();
    const max = kind === 'question' ? TEACH_Q_MAX : TEACH_A_MAX;
    const letters = (value.match(/\p{L}/gu) || []).length;
    if (letters < TEACH_MIN_LETTERS) return 'short';
    if (value.length > max) return 'long';
    if (EMAIL_RE.test(value) || PHONE_RE.test(value)) return 'contact';
    if (URL_RE.test(value)) return 'link';
    if (REPEAT_RE.test(value)) return 'spam';
    if (hasBlockedWord(value)) return 'rude';
    return 'ok';
};
