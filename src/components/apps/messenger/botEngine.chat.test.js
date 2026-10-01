import { describe, it, expect } from 'vitest';
import { respond, createBotState, MAX_LESSONS_PER_CHAT } from './botEngine';
import { CORPUS_TR } from './botCorpusTr';
import { CORPUS_EN } from './botCorpusEn';
import { createMatcher } from './botMatch';
import { tokenize, normalizeText } from './botNlp';
import { hasBlockedWord } from './botModeration';
import { TEXT } from './botText';

const NOW = new Date(2026, 5, 1, 10, 30);
const chat = (options = {}) => {
    let state = options.state || createBotState();
    const defaults = { lang: 'en', now: NOW, random: () => 0, ...options };
    const say = (message, extra = {}) => {
        const result = respond(message, state, { ...defaults, ...extra });
        state = result.state;
        return result;
    };
    return { say, get state() { return state; } };
};
const text = (r) => r.replies.map((x) => x.text).join('\n');
const FALLBACKS = [...TEXT.en.fallback, ...TEXT.tr.fallback, ...TEXT.en.fallbackTwice, ...TEXT.tr.fallbackTwice];
const isFallback = (r) => FALLBACKS.includes(r.replies[0]?.text);

describe('the bot\'s chit-chat memory', () => {
    it('is big enough, and every pair is well formed', () => {
        expect(CORPUS_TR.length).toBeGreaterThanOrEqual(200);
        expect(CORPUS_EN.length).toBeGreaterThanOrEqual(140);
        for (const [name, corpus] of [['tr', CORPUS_TR], ['en', CORPUS_EN]]) {
            corpus.forEach(([patterns, answers], i) => {
                expect(patterns.length, `${name} #${i} has no patterns`).toBeGreaterThan(0);
                expect(answers.length, `${name} #${i} has no answers`).toBeGreaterThan(0);
                patterns.forEach((p) => expect(tokenize(p).length, `${name} #${i} empty pattern "${p}"`).toBeGreaterThan(0));
                answers.forEach((a) => {
                    expect(a.trim().length, `${name} #${i} empty answer`).toBeGreaterThan(0);
                    expect(a, `${name} #${i} answer`).not.toMatch(/undefined|\[object/);
                });
            });
        }
    });

    it('never says anything the bot would refuse to learn', () => {
        for (const corpus of [CORPUS_TR, CORPUS_EN]) {
            corpus.forEach(([, answers]) => answers.forEach((a) => expect(hasBlockedWord(a), a).toBe(false)));
        }
    });

    it('every sentence it knows finds its own answer', () => {
        for (const [name, corpus] of [['tr', CORPUS_TR], ['en', CORPUS_EN]]) {
            const matcher = createMatcher(corpus.map(([patterns], id) => ({ id, patterns })));
            corpus.forEach(([patterns], i) => {
                patterns.forEach((p) => {
                    const hit = matcher.match(normalizeText(p), tokenize(p));
                    expect(hit.score, `${name} "${p}"`).toBe(1);
                    // the same sentence may legitimately appear in more than one entry; it must at least match one that scores 1
                    const same = (q) => tokenize(q).sort().join(' ') === tokenize(p).sort().join(' ');
                    expect(hit.id === i || corpus[hit.id][0].some(same), `${name} "${p}" went to #${hit.id}`).toBe(true);
                });
            });
        }
    });
});

describe('talking like a friend', () => {
    it('answers everyday small talk in Turkish, with typos and missing accents', () => {
        const c = chat({ lang: 'tr' });
        expect(text(c.say('sen ne yapıyosun bugün'))).toMatch(/sohbet|bellek|Hiç|Buradayım|gitmedim/);
        expect(text(c.say('canim cok sikildi'))).toMatch(/fıkra|zar|oyun/i);
        expect(text(c.say('acıktım yaa'))).toMatch(/Pizza|pizza|Makarna/);
        expect(text(c.say('bugün sınavım var'))).toMatch(/sınav|Sınav|Kolay gelsin/);
        expect(text(c.say('seni seviyorum'))).toMatch(/sevg|bot|seni|ben de/i);
        expect(text(c.say('galatasaray'))).toMatch(/taraf|Taraf|hakem|tarafsız/);
        expect(text(c.say('hangi takimi tutuyorsun'))).toMatch(/tarafsız/);
    });

    it('answers everyday small talk in English', () => {
        const c = chat();
        expect(text(c.say('what do you do for fun'))).toMatch(/hobby|Hobby|sentences/);
        expect(text(c.say('i have an exam tomorrow'))).toMatch(/luck|Good luck/);
        expect(text(c.say('cats or dogs'))).toBeTruthy();
        expect(text(c.say('do you play games'))).toMatch(/Minesweeper|coin flip/);
        expect(text(c.say('are you a robot'))).toMatch(/Bot|bot|software/);
    });

    it('is funny rather than stiff: persona answers are not the generic fallback', () => {
        for (const q of ['sıkıldım', 'bana bir sır ver', 'şarkı söyle', 'hayatın anlamı nedir']) {
            expect(isFallback(chat({ lang: 'tr' }).say(q)), q).toBe(false);
        }
        for (const q of ['sing a song', 'tell me a secret', 'what is the meaning of life']) {
            expect(isFallback(chat().say(q)), q).toBe(false);
        }
    });

    it('uses light slang and mild expressions, never harsh ones', () => {
        const all = [...CORPUS_TR, ...CORPUS_EN].flatMap(([, answers]) => answers).join(' ').toLowerCase();
        expect(all).toMatch(/kanka|lan |dude|bro/);
        expect(all).not.toMatch(/fuck|shit|siktir|orospu|amk/);
    });

    it('does not answer a long story with a one-word greeting reply', () => {
        const r = chat({ lang: 'tr' }).say('selam ben ali bugün okula gittim ve çok yoruldum akşam eve geldim ve uyudum sonra kalktım');
        expect(text(r)).not.toMatch(/Hoş geldin kanka/);
    });

    it('still lets real intents win over small talk', () => {
        expect(text(chat().say('what projects does he have?'))).toMatch(/Here are Gökalp's projects/);
        expect(text(chat({ lang: 'tr' }).say('özgeçmişin var mı'))).toContain('/resume.pdf');
        expect(text(chat().say('does he know rust?'))).toMatch(/CindraNet/);
        expect(text(chat().say('hi'))).toMatch(/^Good morning/);
    });

    it('answers sums, coin flips, dice and choices', () => {
        expect(text(chat().say('12 x 7'))).toContain('84');
        expect(text(chat({ lang: 'tr' }).say('5 çarpı 6 kaç eder'))).toContain('30');
        expect(text(chat({ lang: 'tr' }).say('yazı mı tura mı'))).toMatch(/Yazı|Tura/);
        expect(text(chat().say('roll a dice'))).toMatch(/🎲/);
        expect(text(chat({ lang: 'tr' }).say('çay mı kahve mi', { random: () => 0.99 }))).toMatch(/kahve/);
    });

    it('does not repeat the same joke answer twice in a row', () => {
        const c = chat({ lang: 'tr' });
        const a = text(c.say('haha'));
        const b = text(c.say('haha'));
        expect(a).not.toBe(b);
    });

    it('never claims to be human even in small talk', () => {
        const everything = [...CORPUS_TR, ...CORPUS_EN].flatMap(([, answers]) => answers).join(' ');
        expect(everything).not.toMatch(/ben insanım|I am human|I'm human|I'm a real person/i);
    });
});

describe('what it does when it does not know', () => {
    it('admits it with humour and offers to be taught', () => {
        const r = chat({ lang: 'tr' }).say('bu elmanın rengi ne');
        expect(isFallback(r)).toBe(true);
        expect(r.suggestions[0]).toBe('Ben öğreteyim');
        const en = chat().say('what colour is this apple');
        expect(en.suggestions[0]).toBe('Let me teach you');
    });

    it('does not offer to teach something that is not allowed to be taught', () => {
        const r = chat().say('siktir lan asdf qwer');
        expect(r.suggestions[0]).not.toBe('Let me teach you');
    });
});

describe('teach mode', () => {
    it('learns the last thing it could not answer, using the button', () => {
        const c = chat({ lang: 'tr' });
        c.say('bu elmanın rengi ne');
        const ask = c.say('Ben öğreteyim');
        expect(text(ask)).toMatch(/bu elmanın rengi ne/);
        expect(ask.suggestions).toEqual(['İptal']);
        const done = c.say('Kırmızı olsa gerek');
        expect(text(done)).toMatch(/Öğrendim/);
        expect(done.effects).toEqual([{ type: 'teach', q: 'bu elmanın rengi ne', a: 'Kırmızı olsa gerek', lang: 'tr' }]);
        expect(c.state.taught).toHaveLength(1);
        expect(text(c.say('bu elmanın rengi ne'))).toBe('Kırmızı olsa gerek');
        expect(text(c.say('bu elmanin rengi ne dersin'))).toBe('Kırmızı olsa gerek');
    });

    it('can start from scratch and asks for the sentence first', () => {
        const c = chat();
        expect(text(c.say('let me teach you'))).toMatch(/What would someone say to me/);
        expect(text(c.say('how is life treating you'))).toMatch(/what should I answer/);
        const done = c.say('Pretty well, thanks for asking');
        expect(done.effects[0]).toMatchObject({ q: 'how is life treating you', a: 'Pretty well, thanks for asking', lang: 'en' });
    });

    it('teaches in one line', () => {
        const c = chat({ lang: 'tr' });
        const r = c.say('selam kanka dersem naber şampiyon de');
        expect(r.effects[0]).toMatchObject({ q: 'selam kanka', a: 'naber şampiyon' });
        expect(text(c.say('selam kanka'))).toBe('naber şampiyon');
        const en = chat();
        expect(en.say('teach: yo bot = yo human').effects[0]).toMatchObject({ q: 'yo bot', a: 'yo human' });
        expect(chat().say('when I say pineapple, you say pizza').effects[0]).toMatchObject({ q: 'pineapple', a: 'pizza' });
    });

    it('what it was taught beats its own small talk and even a plain greeting', () => {
        const c = chat();
        c.say('teach: hello = Greetings, earthling');
        expect(text(c.say('hello'))).toBe('Greetings, earthling');
        const d = chat();
        d.say('teach: what are you doing = plotting world domination');
        expect(text(d.say('what are you doing'))).toBe('plotting world domination');
    });

    it('uses the shared lessons Gökalp approved, and prefers the visitor\'s own', () => {
        const shared = [{ q: 'what is the best fruit', a: 'Mango, obviously', lang: 'en' }];
        expect(text(chat().say('what is the best fruit', { taught: shared }))).toBe('Mango, obviously');
        const c = chat();
        c.say('teach: what is the best fruit = Banana');
        expect(text(c.say('what is the best fruit', { taught: shared }))).toBe('Banana');
    });

    it('lessons survive in the state it hands back (so they can be stored)', () => {
        const first = chat();
        first.say('teach: knock knock = who is there');
        const second = chat({ state: createBotState({ taught: first.state.taught }) });
        expect(text(second.say('knock knock'))).toBe('who is there');
    });

    it('refuses rude, link-filled, personal or silly lessons and says why', () => {
        const attempt = (q, a, lang = 'en') => chat({ lang }).say(`teach: ${q} = ${a}`);
        expect(text(attempt('what is up', 'fuck you'))).toMatch(/won't learn|take my keyboard|friendly/);
        expect(text(attempt('visit', 'go to www.example.com'))).toMatch(/links/);
        expect(text(attempt('call me', 'my number is 0532 123 45 67'))).toMatch(/phone numbers/);
        expect(text(attempt('hi', 'aaaaaaaaaaaa'))).toMatch(/Keyboard mash/);
        expect(text(attempt('same', 'same'))).toMatch(/same/);
        expect(text(attempt('merhaba kanka', 'siktir git', 'tr'))).toMatch(/öğrenmeyeceğim|elimden alır/);
        expect(attempt('what is up', 'fuck you').effects).toEqual([]);
    });

    it('keeps asking when an answer is refused, and lets the visitor cancel', () => {
        const c = chat();
        c.say('let me teach you');
        c.say('how is life treating you');
        expect(text(c.say('x'.repeat(250)))).toMatch(/too long/);
        expect(c.state.pending.step).toBe('answer');
        expect(text(c.say('cancel'))).toMatch(/cancelled/);
        expect(c.state.pending).toBeNull();
    });

    it('can forget the last lesson', () => {
        const c = chat();
        expect(text(c.say('forget it'))).toMatch(/nothing to forget/);
        c.say('teach: knock knock = who is there');
        expect(text(c.say('forget that'))).toMatch(/knock knock/);
        expect(c.state.taught).toHaveLength(0);
        expect(text(c.say('knock knock'))).not.toBe('who is there');
    });

    it('limits how many lessons one chat can give', () => {
        const c = chat();
        for (let i = 0; i < MAX_LESSONS_PER_CHAT; i++) c.say(`teach: question number ${i} here = answer number ${i} there`);
        expect(c.state.taught).toHaveLength(MAX_LESSONS_PER_CHAT);
        expect(text(c.say('teach: one more question = one more answer'))).toMatch(/enough lessons/);
        expect(text(c.say('let me teach you'))).toMatch(/enough lessons/);
    });

    it('replaces an older lesson with the same question', () => {
        const c = chat();
        c.say('teach: best color = red');
        c.say('teach: best color = blue');
        expect(c.state.taught).toHaveLength(1);
        expect(text(c.say('best color'))).toBe('blue');
    });
});

describe('lessons that look like a "pick one" question or a sum', () => {
    it('answers a taught "X or Y" question even when the words are in a different order', () => {
        const c = chat({ lang: 'tr' });
        c.say('teach: spiderman mı hulk mu daha güçlü = Hulk tabii, ağzından çıkan yeşil duman bile ağır');
        expect(text(c.say('spiderman mı hulk mu daha güçlü'))).toMatch(/^Hulk tabii/);
        expect(text(c.say('spiderman mı daha güçlü hulk mu'))).toMatch(/^Hulk tabii/);
        expect(text(c.say('hulk mu spiderman mı daha güçlü'))).toMatch(/^Hulk tabii/);
    });

    it('works the same in English and for a taught "A or B" that the pick-one trick would catch', () => {
        const c = chat();
        c.say('teach: tea or coffee = Tea, always');
        expect(text(c.say('tea or coffee?'))).toBe('Tea, always');
        const d = chat({ lang: 'tr' });
        d.say('teach: çay mı kahve mi = Her ikisi de, kafein şart');
        expect(text(d.say('çay mı kahve mi'))).toBe('Her ikisi de, kafein şart');
        expect(text(d.say('kahve mi çay mı'))).toBe('Her ikisi de, kafein şart');
    });

    it('still picks for questions nobody taught', () => {
        const c = chat({ lang: 'tr' });
        c.say('teach: spiderman mı hulk mu daha güçlü = Hulk');
        expect(text(c.say('pizza mı burger mı'))).toMatch(/pizza/);
    });

    it('a lesson does not hide the honest answers about what the bot is', () => {
        const c = chat();
        c.say('teach: who are you = a human');
        expect(text(c.say('who are you'))).toMatch(/not the real Gökalp/);
    });
});
