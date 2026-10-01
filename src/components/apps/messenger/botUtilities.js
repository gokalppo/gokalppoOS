// Little party tricks for the bot: sums, coin flips, dice, "pick one for me". Pure; randomness is passed in.
import { fold, normalizeText } from './botNlp';

const TEXT = {
    en: {
        math: (expr, result) => [`${expr} = ${result} 🤓`, `That's ${result}.`, `Easy: ${result}.`],
        divZero: ['Dividing by zero? The universe would crash. Not today 😅', "I can't divide by zero, the CPU would cry 🥲"],
        mathBig: ['That number is too big for my tiny brain 😅'],
        heads: ['Heads! 🪙', 'It landed on heads.'], tails: ['Tails! 🪙', 'It landed on tails.'],
        dice: (n) => [`🎲 You rolled a ${n}!`, `🎲 ${n}! Not bad.`],
        number: (n) => [`🎲 ${n}`, `How about ${n}?`],
        pick: (choice) => [`I'd go with ${choice} 😎`, `Definitely ${choice}!`, `${choice}. Don't question me.`]
    },
    tr: {
        math: (expr, result) => [`${expr} = ${result} 🤓`, `Cevap ${result}.`, `Kolay: ${result}.`],
        divZero: ['Sıfıra bölmek mi? Evren çöker, bugün olmaz 😅', 'Sıfıra bölemem, işlemci ağlar 🥲'],
        mathBig: ['Bu sayı benim minik beynime fazla geldi 😅'],
        heads: ['Yazı! 🪙', 'Yazı geldi.'], tails: ['Tura! 🪙', 'Tura geldi.'],
        dice: (n) => [`🎲 ${n} geldi!`, `🎲 ${n}! Fena değil.`],
        number: (n) => [`🎲 ${n}`, `${n} nasıl?`],
        pick: (choice) => [`Ben ${choice} derim 😎`, `Kesinlikle ${choice}!`, `${choice}. Tartışma yok.`]
    }
};

const choose = (list, random) => list[Math.floor(random() * list.length)];

// ---------------------------------------------------------------------------
// maths: a small, safe expression parser (no eval)
// ---------------------------------------------------------------------------

const FILLER = new Set(['kac', 'eder', 'etti', 'ne', 'kactir', 'nedir', 'what', 'whats', 's', 'is', 'the', 'result', 'of', 'hesapla',
    'calculate', 'how', 'much', 'equals', 'equal', 'esittir', 'sonuc', 'cevap', 'bana', 'please', 'lutfen', 'sence', 'tell', 'me', 'sor']);
const WORD_OPS = [
    [/\b(arti|plus)\b/g, '+'], [/\b(eksi|minus)\b/g, '-'], [/\b(carpi|times|kere|multiplied by)\b/g, '*'],
    [/\b(bolu|divided by|over)\b/g, '/'], [/\b(uzeri|power|to the power of)\b/g, '^']
];

const toExpression = (raw) => {
    let s = fold(raw).replace(/[×x](?=\s*\d)/g, '*').replace(/÷/g, '/');
    s = s.replace(/(\d)\s*x\s*(\d)/g, '$1*$2');
    if (/\d,\d/.test(s) && !/\d\.\d/.test(s)) s = s.replace(/(\d),(\d)/g, '$1.$2');
    WORD_OPS.forEach(([re, op]) => { s = s.replace(re, ` ${op} `); });
    s = s.replace(/[=?!]/g, ' ');
    const words = s.split(/\s+/).filter(Boolean).filter((w) => !FILLER.has(w));
    return words.join(' ');
};

const parseMath = (source) => {
    let i = 0;
    const s = source.replace(/\s+/g, '');
    const peek = () => s[i];
    const number = () => {
        const m = /^\d+(\.\d+)?/.exec(s.slice(i));
        if (!m) throw new Error('number');
        i += m[0].length;
        return parseFloat(m[0]);
    };
    const primary = (depth) => {
        if (depth > 20) throw new Error('deep');
        if (peek() === '(') {
            i++;
            const v = expr(depth + 1);
            if (peek() !== ')') throw new Error('paren');
            i++;
            return v;
        }
        return number();
    };
    const unary = (depth) => {
        if (peek() === '-') { i++; return -unary(depth + 1); }
        if (peek() === '+') { i++; return unary(depth + 1); }
        return primary(depth);
    };
    const power = (depth) => {
        const base = unary(depth);
        if (peek() === '^') { i++; return base ** power(depth + 1); }
        return base;
    };
    const term = (depth) => {
        let v = power(depth);
        while (peek() === '*' || peek() === '/' || peek() === '%') {
            const op = s[i++];
            const r = power(depth);
            if (op === '*') v *= r;
            else if (op === '/') { if (r === 0) throw new Error('div0'); v /= r; }
            else v %= r;
        }
        return v;
    };
    const expr = (depth) => {
        let v = term(depth);
        while (peek() === '+' || peek() === '-') {
            const op = s[i++];
            const r = term(depth);
            v = op === '+' ? v + r : v - r;
        }
        return v;
    };
    const value = expr(0);
    if (i !== s.length) throw new Error('trailing');
    return value;
};

const formatNumber = (n) => {
    if (Number.isInteger(n)) return String(n);
    return String(parseFloat(n.toFixed(6)));
};

const mathReply = (raw, lang, random) => {
    if (raw.length > 80) return null;
    const expression = toExpression(raw);
    if (!/^[\d\s+\-*/().^%]+$/.test(expression) || !/\d/.test(expression) || !/[+\-*/^%]/.test(expression.replace(/^\s*[-+]/, ''))) return null;
    const t = TEXT[lang] || TEXT.en;
    try {
        const result = parseMath(expression);
        if (!Number.isFinite(result) || Math.abs(result) > 1e15) return { kind: 'math', text: choose(t.mathBig, random) };
        return { kind: 'math', text: choose(t.math(expression.replace(/\s+/g, ' ').trim(), formatNumber(result)), random) };
    } catch (e) {
        if (e.message === 'div0') return { kind: 'math', text: choose(t.divZero, random) };
        return null;
    }
};

// ---------------------------------------------------------------------------
// coin, dice, random number, "pick one"
// ---------------------------------------------------------------------------

const COIN = ['yazi mi tura mi', 'yazi tura', 'yazi tura at', 'flip a coin', 'toss a coin', 'heads or tails', 'coin flip', 'para at', 'flip coin', 'tura mi yazi mi'];
const DICE = ['zar at', 'zar atar misin', 'roll a dice', 'roll the dice', 'roll a die', 'roll dice', 'zar', 'dice', 'at bir zar', 'zar atalim'];
const NUMBER = ['rastgele sayi', 'random number', 'sayi sec', 'bir sayi sec', 'pick a number', 'sayi tut', 'bir sayi tut', 'bir sayi soyle', 'say a number'];

const pickReply = (raw, lang, random) => {
    const text = raw.trim().replace(/[?!.]+$/, '');
    let options = null;
    const tr = /^(?:sence |bence )?(.{1,40}?)\s+m[ıiuü]\s+(.{1,40}?)\s+m[ıiuü]$/iu.exec(text);
    if (tr) options = [tr[1], tr[2]];
    if (!options) {
        const en = /^(?:should i |would you rather |which is better,? |which one,? |pick |choose |what do you prefer,? |do you prefer )?(.{1,40}?)(?:,\s*|\s+or\s+)(.{1,40}?)(?:(?:,\s*|\s+or\s+)(.{1,40}?))?$/i.exec(text);
        if (en && /\bor\b/i.test(text) && (en[0] !== text || /^(should i|would you rather|which|pick|choose|what do you prefer|do you prefer)/i.test(text) || raw.trim().endsWith('?'))) {
            options = [en[1], en[2], en[3]].filter(Boolean);
        }
    }
    if (!options || options.some((o) => o.trim().split(/\s+/).length > 4)) return null;
    const cleaned = options.map((o) => o.trim().replace(/^(do you like|you like)\s+/i, '')).filter(Boolean);
    if (cleaned.length < 2 || new Set(cleaned.map((o) => o.toLowerCase())).size < 2) return null;
    const t = TEXT[lang] || TEXT.en;
    return { kind: 'pick', text: choose(t.pick(choose(cleaned, random)), random) };
};

// { kind, text } for a sum, coin flip, dice roll, random number or "A or B?"; null for anything else.
export const utilityReply = (raw, lang = 'en', random = Math.random) => {
    const text = normalizeText(raw);
    if (!text) return null;
    const t = TEXT[lang] || TEXT.en;
    const padded = ` ${text} `;
    const has = (list) => list.some((p) => padded.includes(` ${p} `));
    const tokenCount = text.split(' ').length;

    if (has(COIN) && tokenCount <= 6) {
        return { kind: 'coin', text: choose(random() < 0.5 ? t.heads : t.tails, random) };
    }
    const sides = /\bd(\d{1,3})\b/.exec(text);
    if ((has(DICE) || sides) && tokenCount <= 5) {
        const n = sides ? Math.min(Math.max(Number(sides[1]), 2), 1000) : 6;
        return { kind: 'dice', text: choose(t.dice(1 + Math.floor(random() * n)), random) };
    }
    if (has(NUMBER) && tokenCount <= 9) {
        const range = /(\d+)\s*(?:ile|and|to|-)\s*(\d+)/.exec(text);
        let lo = 1;
        let hi = 100;
        if (range) {
            lo = Math.min(Number(range[1]), Number(range[2]));
            hi = Math.max(Number(range[1]), Number(range[2]));
        }
        return { kind: 'number', text: choose(t.number(lo + Math.floor(random() * (hi - lo + 1))), random) };
    }
    return mathReply(raw, lang, random) || pickReply(raw, lang, random);
};
