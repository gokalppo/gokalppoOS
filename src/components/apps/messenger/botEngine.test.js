import { describe, it, expect } from 'vitest';
import {
    respond, createBotState, getBotGreeting, botIdleNudge, botSendResult, botTypingDelayMs, BOT_NAME, MESSAGE_MAX
} from './botEngine';
import { TEXT } from './botText';
import { PROJECTS } from '../../../data/projects';

const MORNING = new Date(2026, 5, 1, 10, 30);
const EVENING = new Date(2026, 5, 1, 20, 15);

// A little conversation helper: keeps the bot's state between messages.
const chat = (options = {}) => {
    let state = options.state || createBotState();
    const defaults = { lang: 'en', now: MORNING, random: () => 0, ...options };
    const say = (message, extra = {}) => {
        const result = respond(message, state, { ...defaults, ...extra });
        state = result.state;
        return result;
    };
    return { say, get state() { return state; } };
};
const text = (result) => result.replies.map((r) => r.text).join('\n');
const FALLBACKS = [...TEXT.en.fallback, ...TEXT.tr.fallback, ...TEXT.en.fallbackTwice, ...TEXT.tr.fallbackTwice];
const isFallback = (result) => FALLBACKS.includes(result.replies[0]?.text);

describe('greeting and small talk', () => {
    it('greets according to the time of day, in both languages', () => {
        expect(text(chat().say('hi'))).toMatch(/^Good morning/);
        expect(text(chat().say('hello', { now: EVENING }))).toMatch(/^Good evening/);
        expect(text(chat({ lang: 'tr' }).say('selam'))).toMatch(/^Günaydın/);
        expect(text(chat({ lang: 'tr' }).say('merhaba', { now: EVENING }))).toMatch(/^İyi akşamlar/);
    });

    it('answers "how are you" and keeps the chat going', () => {
        const r = chat().say('how are you?');
        expect(text(r)).toMatch(/you\?/i);
        expect(r.suggestions.length).toBeGreaterThan(0);
    });

    it('says it is a bot and not the real Gökalp, in both languages', () => {
        expect(text(chat().say('are you a human?'))).toMatch(/not the real Gökalp/);
        expect(text(chat().say('are you chatgpt?'))).toMatch(/rule-based/);
        expect(text(chat({ lang: 'tr' }).say('sen kimsin'))).toMatch(/gerçek Gökalp değilim/);
        expect(text(chat({ lang: 'tr' }).say('beni kim yaptı'))).toBeTruthy();
    });

    it('knows what it can do', () => {
        expect(text(chat().say('what can you do?'))).toMatch(/projects/);
        expect(text(chat().say('help'))).toMatch(/projects/);
        expect(text(chat({ lang: 'tr' }).say('neler yapabilirsin'))).toMatch(/her projesini/);
    });

    it('reacts to thanks, goodbye, praise, rudeness, laughter and plain acknowledgements', () => {
        const c = chat();
        expect(text(c.say('thanks!'))).toMatch(/welcome/i);
        expect(text(c.say('you are awesome'))).toMatch(/thank/i);
        expect(text(c.say('you are stupid'))).toMatch(/Ouch|friendly/);
        expect(text(c.say('hahaha'))).toMatch(/😄/);
        expect(text(c.say('ok'))).toBeTruthy();
        expect(isFallback(c.say('okay'))).toBe(false);
    });

    it('says goodbye without quick-reply buttons, and wakes up again on the next message', () => {
        const c = chat();
        const bye = c.say('bye');
        expect(text(bye)).toMatch(/Guestbook/);
        expect(bye.suggestions).toEqual([]);
        expect(c.state.ended).toBe(true);
        expect(c.say('wait, one more thing: projects').suggestions.length).toBeGreaterThan(0);
        expect(c.state.ended).toBe(false);
    });

    it('answers emoji-only messages and empty messages gently', () => {
        expect(isFallback(chat().say('😊'))).toBe(false);
        expect(text(chat().say('   '))).toMatch(/projects/);
    });

    it('has a few easter eggs', () => {
        expect(text(chat().say('hello world'))).toBe('Hello, World! 🌍');
        expect(text(chat().say('what is the meaning of life?'))).toMatch(/42/);
        expect(text(chat().say('sudo make me a sandwich'))).toMatch(/root/);
        expect(text(chat().say('ping'))).toMatch(/pong/);
    });

    it('feelings: bored, sad, love, weather, age, where it lives', () => {
        const c = chat();
        expect(text(c.say('i am bored'))).toMatch(/joke|fun fact/i);
        expect(text(c.say("i'm sad today"))).toMatch(/sorry/i);
        expect(text(c.say('i love you'))).toMatch(/bot/);
        expect(text(c.say('how is the weather?'))).toMatch(/browser/);
        expect(text(c.say('how old are you?'))).toMatch(/age|birthday/);
        expect(text(c.say('where do you live?'))).toMatch(/browser/);
    });

    it('tells the time and date from the visitor clock', () => {
        expect(text(chat().say('what time is it?'))).toMatch(/10:30/);
        expect(text(chat({ lang: 'tr' }).say('saat kaç'))).toMatch(/10:30/);
        expect(text(chat().say("what's today's date?"))).toMatch(/June 1, 2026/);
    });
});

describe('language', () => {
    it('answers in the language the visitor writes, whatever the app language is', () => {
        expect(text(chat({ lang: 'en' }).say('projelerini göster'))).toMatch(/Gökalp'in projeleri/);
        expect(text(chat({ lang: 'tr' }).say('show me your projects'))).toMatch(/Here are Gökalp's projects/);
    });

    it('sticks with the language already in use when a message is ambiguous', () => {
        const c = chat({ lang: 'en' });
        c.say('merhaba');
        expect(text(c.say('Demo'))).toBeTruthy();
        expect(c.state.lang).toBe('tr');
    });

    it('can talk about its languages', () => {
        expect(text(chat().say('do you speak turkish?'))).toMatch(/Turkish/);
    });
});

describe('remembering the visitor', () => {
    it('learns a name, uses it and does not switch language because of Turkish letters in it', () => {
        const c = chat();
        const r = c.say('my name is ayşe');
        expect(text(r)).toMatch(/Nice to meet you, Ayşe/);
        expect(r.lang).toBe('en');
        expect(c.state.name).toBe('Ayşe');
        expect(text(c.say('thanks'))).toContain('Ayşe');
        expect(text(c.say('what is my name?'))).toContain('Ayşe');
    });

    it('understands the Turkish forms', () => {
        const c = chat({ lang: 'tr' });
        expect(text(c.say('adım ali'))).toMatch(/Tanıştığımıza sevindim Ali/);
        expect(c.state.name).toBe('Ali');
    });

    it('asks for a name it does not know', () => {
        expect(text(chat().say('what is my name'))).toMatch(/haven't told me/);
    });

    it('greets a returning visitor by name', () => {
        const fresh = getBotGreeting(createBotState({ name: null, visits: 1 }), 'en');
        expect(fresh.replies[0].text).toMatch(/I'm Gökalp Bot/);
        const back = getBotGreeting(createBotState({ name: 'Ayşe', visits: 3 }), 'en');
        expect(back.replies[0].text).toMatch(/Welcome back, Ayşe/);
        expect(getBotGreeting(createBotState({ name: 'Ali', visits: 2 }), 'tr').replies[0].text).toMatch(/Tekrar hoş geldin Ali/);
        expect(getBotGreeting(createBotState({ visits: 2 }), 'en').replies[0].text).toMatch(/Welcome back!/);
    });
});

describe('projects', () => {
    it('lists every project', () => {
        const en = text(chat().say('what projects does he have?'));
        const tr = text(chat({ lang: 'tr' }).say('projeleri neler'));
        for (const p of PROJECTS) {
            expect(en).toContain(p.title);
            expect(tr).toContain(p.title);
        }
    });

    it('describes a project by name, keyword, number or ordinal', () => {
        expect(text(chat().say('tell me about the totp token'))).toContain('ESP32-Hardware-TOTP-Token');
        expect(text(chat().say('what is cindranet?'))).toMatch(/private/i);
        expect(text(chat({ lang: 'tr' }).say('esp32 ile ne yapmış'))).toContain('IoT Smart Air Quality');
        expect(text(chat().say('opencv scanner'))).toContain('Document Scanner');
        expect(text(chat().say('tell me about project 4'))).toContain('AI Image Detector');
        expect(text(chat().say('the second project please'))).toContain('Hardware TOTP Token');
        expect(text(chat().say('iot project'))).toContain('youtube.com/shorts');
    });

    it('keeps the accuracy figure consistent with the Gallery', () => {
        expect(text(chat().say('ai image detector'))).toContain('97.2%');
    });

    it('follows up on the project being discussed', () => {
        const c = chat();
        c.say('tell me about the iot project');
        expect(text(c.say('and the tech?'))).toMatch(/built with ESP32/);
        expect(text(c.say('show me a demo'))).toContain('youtube.com/shorts');
        expect(text(c.say('source code'))).toContain('github.com/gokalppo/IoT-Air-Quality-Monitor');
        expect(text(c.say('more details'))).toMatch(/Features:/);
        expect(text(c.say('what was the hardest part?'))).toMatch(/don't have Gökalp's own notes/);
    });

    it('says honestly when a project has no demo or public code', () => {
        const c = chat();
        c.say('totp');
        expect(text(c.say('demo'))).toMatch(/no video demo/);
        c.say('cindranet');
        expect(text(c.say('source code'))).toMatch(/private repository/);
    });

    it('moves to the next and previous project and wraps around', () => {
        const c = chat();
        c.say('cindranet');
        expect(text(c.say('next project'))).toContain('IoT Smart Air Quality');
        expect(text(c.say('previous one'))).toContain('CindraNet');
        expect(text(c.say('previous one'))).toContain('AI Image Detector');
        expect(text(chat({ lang: 'tr' }).say('sonraki proje'))).toContain('IoT Smart Air Quality');
    });

    it('asks which project when a follow-up has nothing to refer to, offering the titles as buttons', () => {
        const r = chat().say('can I see the source code?');
        expect(text(r)).toMatch(/Which project/);
        expect(r.suggestions).toEqual(PROJECTS.map((p) => p.title));
        const c = chat();
        const again = c.say(r.suggestions[4]);
        expect(text(again)).toContain('CindraNet');
    });

    it('forgets the project after the topic changes', () => {
        const c = chat();
        c.say('cindranet');
        c.say('what are his skills?');
        expect(text(c.say('source code'))).toMatch(/Which project/);
    });
});

describe('skills', () => {
    it('lists the skills from the portfolio data', () => {
        const r = text(chat().say('what are his skills?'));
        for (const word of ['C++', 'Rust', 'React 19', 'ESP32', 'OpenCV']) expect(r).toContain(word);
        expect(text(chat({ lang: 'tr' }).say('yetenekler'))).toContain('Diller');
        expect(text(chat().say('what languages does he know?'))).toContain('Languages');
    });

    it('answers "does he know X" with where it was used', () => {
        expect(text(chat().say('does he know rust?'))).toMatch(/CindraNet/);
        expect(text(chat().say('can he do c++?'))).toMatch(/IoT Smart Air Quality, Document Scanner/);
        expect(text(chat().say('pytorch?'))).toContain('AI Image Detector');
        expect(text(chat({ lang: 'tr' }).say('rust biliyor mu'))).toMatch(/CindraNet projesinde/);
        expect(text(chat().say('does he use react?'))).toMatch(/this site/);
    });

    it('is honest about technologies that are not in the portfolio', () => {
        const r = chat().say('does he know java?');
        expect(text(r)).toMatch(/don't see that in Gökalp's portfolio/);
        expect(r.suggestions).toEqual(['Yes', 'No']);
    });

    it('does not mistake ordinary words for technologies', () => {
        expect(isFallback(chat().say('how can I reach him'))).toBe(false);
        expect(text(chat().say('how can I reach him'))).toContain('ekergokalp@gmail.com');
    });
});

describe('recommendations', () => {
    it('suggests a project from what the visitor likes', () => {
        expect(text(chat().say('I love security'))).toContain('CindraNet');
        expect(text(chat().say("i'm interested in embedded hardware"))).toContain('IoT Smart Air Quality');
        expect(text(chat().say('I like machine learning'))).toContain('AI Image Detector');
        expect(text(chat({ lang: 'tr' }).say('yapay zeka ile ilgileniyorum'))).toContain('AI Image Detector');
    });

    it('then keeps talking about that project', () => {
        const c = chat();
        c.say('I love security');
        expect(text(c.say('source code'))).toMatch(/private repository/);
    });
});

describe('practical questions', () => {
    it('gives contact details, links and the resume', () => {
        expect(text(chat().say('how can I contact him?'))).toContain('ekergokalp@gmail.com');
        expect(text(chat({ lang: 'tr' }).say('iletişim'))).toContain('ekergokalp@gmail.com');
        expect(text(chat().say('github?'))).toContain('github.com/gokalppo');
        expect(text(chat().say('linkedin'))).toContain('linkedin.com/in/gokalp-eker');
        expect(text(chat().say('can I see your resume'))).toContain('/resume.pdf');
        expect(text(chat({ lang: 'tr' }).say('özgeçmiş'))).toContain('/resume.pdf');
    });

    it('does not invent a phone number', () => {
        expect(text(chat().say('what is his phone number?'))).toMatch(/don't have a phone number/);
    });

    it('handles hiring and availability without speaking for Gökalp', () => {
        const r = chat().say('is he available for an internship?');
        expect(text(r)).toMatch(/can't speak for Gökalp's availability/);
        expect(r.suggestions).toEqual(['Yes', 'No']);
    });

    it('explains who Gökalp is, what he studies and how the site was built', () => {
        expect(text(chat().say('who is gokalp?'))).toMatch(/Computer Engineering student/);
        expect(text(chat().say('what does he study?'))).toMatch(/Computer Engineering student/);
        expect(text(chat().say('how was this site made?'))).toMatch(/React/);
        expect(text(chat().say('any easter egg?'))).toMatch(/Konami/);
    });

    it('answers several questions in one message, in the order they were asked', () => {
        const r = text(chat().say('show me the projects and also his cv'));
        expect(r.indexOf('Here are Gökalp')).toBeGreaterThanOrEqual(0);
        expect(r.indexOf('/resume.pdf')).toBeGreaterThan(r.indexOf('Here are Gökalp'));
        const withGreeting = text(chat().say('hello there, show me projects and the cv'));
        expect(withGreeting).toMatch(/^Good morning! 🙂/);
        expect(withGreeting).toContain('/resume.pdf');
        expect(withGreeting).not.toContain('What can I do for you');
    });
});

describe('typos and typing without Turkish letters', () => {
    it('understands slightly misspelled words', () => {
        expect(text(chat().say('projlr'))).toContain('CindraNet');
        expect(text(chat().say('resum'))).toContain('/resume.pdf');
        expect(text(chat().say('linkedn'))).toContain('linkedin.com');
        expect(text(chat().say('wat are his skils'))).toBeTruthy();
    });

    it('matches Turkish words written with plain letters', () => {
        expect(text(chat({ lang: 'tr' }).say('ozgecmis'))).toContain('/resume.pdf');
        expect(text(chat({ lang: 'tr' }).say('iletisim'))).toContain('ekergokalp@gmail.com');
        expect(text(chat({ lang: 'tr' }).say('gokalp kimdir'))).toMatch(/Bilgisayar Mühendisliği/);
    });

    it('handles the Turkish capital İ', () => {
        expect(text(chat({ lang: 'tr' }).say('İLETİŞİM'))).toContain('ekergokalp@gmail.com');
    });
});

describe('personal questions', () => {
    it('does not guess about the person and offers to ask him', () => {
        const c = chat();
        const r = c.say('where does he live?');
        expect(text(r)).toMatch(/more personal than what's on the portfolio/);
        expect(r.suggestions).toEqual(['Yes', 'No']);
        expect(text(c.say('yes'))).toMatch(/What would you like me to tell him/);
        expect(text(chat().say('how old is he?'))).toMatch(/I don't have that information|more personal/);
        expect(text(chat().say('is he married?'))).toMatch(/I don't have that information|more personal/);
    });
});

describe('leaving a message for Gökalp', () => {
    const start = (options) => {
        const c = chat(options);
        c.say('I want to leave a message');
        return c;
    };

    it('walks through message, reply address and confirmation, then asks to send', () => {
        const c = chat();
        const first = c.say('leave a message');
        expect(text(first)).toMatch(/What would you like me to tell him/);
        expect(first.suggestions).toEqual(['Cancel']);
        const second = c.say('Hi Gökalp, I loved the CindraNet project. Could we talk about an internship?');
        expect(text(second)).toMatch(/How can he reach you back/);
        expect(second.suggestions).toEqual(['Skip', 'Cancel']);
        const third = c.say('Write me at jane@example.com');
        expect(text(third)).toContain('Reply to: jane@example.com');
        expect(text(third)).toContain('internship');
        expect(third.suggestions).toEqual(['Yes', 'No']);
        const done = c.say('yes');
        expect(done.effects).toEqual([{
            type: 'sendMessage',
            message: 'Hi Gökalp, I loved the CindraNet project. Could we talk about an internship?',
            contact: 'jane@example.com', name: '', lang: 'en'
        }]);
        expect(text(done)).toMatch(/Sending/);
        expect(c.state.pending).toBeNull();
    });

    it('includes the visitor name in what is sent', () => {
        const c = chat();
        c.say('my name is jane');
        c.say('leave a message');
        c.say('Please tell him the demo link is broken on my phone.');
        c.say('skip');
        const done = c.say('evet');
        expect(done.effects[0]).toMatchObject({ name: 'Jane', contact: '' });
    });

    it('rejects messages that are too short or too long', () => {
        const c = start();
        expect(text(c.say('hi'))).toMatch(/a bit short/);
        expect(text(c.say('x'.repeat(MESSAGE_MAX + 1)))).toMatch(/longer than I can pass on/);
        expect(c.state.pending.step).toBe('text');
    });

    it('gives up asking for an e-mail address after two bad tries and sends without one', () => {
        const c = start();
        c.say('A real message about something important.');
        expect(text(c.say('not an email'))).toMatch(/doesn't look like an email/);
        expect(text(c.say('still not'))).toContain('No reply address');
        expect(c.state.pending.step).toBe('confirm');
    });

    it('can be cancelled at every step, and "no" at the end cancels too', () => {
        for (const steps of [[], ['A message that is long enough.'], ['A message that is long enough.', 'skip']]) {
            const c = start();
            steps.forEach((s) => c.say(s));
            expect(text(c.say('cancel'))).toMatch(/cancelled/);
            expect(c.state.pending).toBeNull();
        }
        const c = start();
        c.say('A message that is long enough.');
        c.say('skip');
        expect(text(c.say('no'))).toMatch(/cancelled/);
    });

    it('asks again when the confirmation is unclear', () => {
        const c = start();
        c.say('A message that is long enough.');
        c.say('skip');
        expect(text(c.say('maybe'))).toMatch(/"yes" to send/);
        expect(c.state.pending.step).toBe('confirm');
    });

    it('works in Turkish', () => {
        const c = chat({ lang: 'tr' });
        c.say('mesaj bırak');
        c.say('Merhaba, projelerin çok güzel olmuş. Görüşmek isteriz.');
        c.say('geç');
        const done = c.say('evet');
        expect(done.effects[0].lang).toBe('tr');
        expect(text(done)).toMatch(/gönderiyorum/);
    });

    it('after two misunderstandings in a row it suggests teaching it or leaving a message', () => {
        const c = chat();
        expect(isFallback(c.say('zzzz qqqq'))).toBe(true);
        const second = c.say('xxxx wwww');
        expect(text(second)).toMatch(/Teach me|teach me|leave a message/i);
        expect(second.suggestions[0]).toBe('Let me teach you');
        expect(text(c.say('leave a message'))).toMatch(/What would you like me to tell him/);
    });

    it('lets the visitor carry on normally if they ignore the offer', () => {
        const c = chat();
        c.say('where does he live?');
        expect(text(c.say('show me the projects'))).toMatch(/Here are Gökalp's projects/);
        expect(c.state.pending).toBeNull();
    });

    it('reports how sending went', () => {
        expect(botSendResult('sent')).toMatch(/on its way/);
        expect(botSendResult('tooSoon')).toMatch(/wait a minute/);
        expect(botSendResult('failed')).toMatch(/ekergokalp@gmail.com/);
        expect(botSendResult('sent', 'tr')).toMatch(/yolda/);
    });
});

describe('jokes and facts', () => {
    it('goes through different jokes and facts instead of repeating', () => {
        const c = chat();
        const jokes = [text(c.say('tell me a joke')), text(c.say('another joke')), text(c.say('one more joke'))];
        expect(new Set(jokes).size).toBe(3);
        const facts = [text(c.say('fun fact')), text(c.say('another fact'))];
        expect(new Set(facts).size).toBe(2);
        expect(text(chat({ lang: 'tr' }).say('bana bir fıkra anlat'))).toBeTruthy();
    });

    it('offers another joke or fact as buttons', () => {
        expect(chat().say('tell me a joke').suggestions[0]).toBe('Tell me a joke');
        expect(chat().say('fun fact').suggestions[0]).toBe('Fun fact');
    });

    it('never repeats the same variant twice in a row', () => {
        const c = chat();
        const a = text(c.say('hi'));
        const b = text(c.say('hi'));
        expect(a).not.toBe(b);
    });
});

describe('quick-reply buttons', () => {
    it('every button the bot offers is understood by the bot, in both languages', () => {
        for (const lang of ['en', 'tr']) {
            const labels = new Set();
            const collect = (r) => r.suggestions.forEach((s) => labels.add(s));
            const c = chat({ lang });
            collect(c.say('hello'));
            collect(c.say(lang === 'en' ? 'tell me a joke' : 'fıkra anlat'));
            collect(c.say(lang === 'en' ? 'fun fact' : 'ilginç bilgi'));
            collect(c.say(lang === 'en' ? 'iot project' : 'iot projesi'));
            collect(c.say(lang === 'en' ? 'totp token' : 'totp'));
            collect(c.say(lang === 'en' ? 'where does he live' : 'gokalp nerede yaşıyor'));
            collect(c.say(lang === 'en' ? 'leave a message' : 'mesaj bırak'));
            collect(c.say(lang === 'en' ? 'source code' : 'kaynak kod'));
            PROJECTS.forEach((p) => labels.delete(p.title));
            expect(labels.size).toBeGreaterThan(8);

            for (const label of labels) {
                // each button is pressed in a state where it is offered
                const press = chat({ lang });
                const needsProject = [TEXT[lang].chips.more, TEXT[lang].chips.source, TEXT[lang].chips.demo, TEXT[lang].chips.next, TEXT[lang].chips.allProjects].includes(label);
                const needsPending = [TEXT[lang].chips.yes, TEXT[lang].chips.no, TEXT[lang].chips.skip, TEXT[lang].chips.cancel].includes(label);
                if (needsProject) press.say(lang === 'en' ? 'iot project' : 'iot projesi');
                if (needsPending) press.say(lang === 'en' ? 'leave a message' : 'mesaj bırak');
                const result = press.say(label);
                expect(isFallback(result), `"${label}" (${lang}) was not understood`).toBe(false);
            }
        }
    });

    it('offers new topics first and does not suggest what was just covered', () => {
        const c = chat();
        c.say('what projects does he have?');
        const r = c.say('how can I reach him');
        expect(r.suggestions).not.toContain('Contact');
        expect(r.suggestions).not.toContain('Projects');
    });
});

describe('engine behaviour', () => {
    it('does not change the state it is given', () => {
        const before = createBotState();
        const snapshot = JSON.stringify(before);
        respond('my name is ayşe, show me the projects', before, { lang: 'en' });
        expect(JSON.stringify(before)).toBe(snapshot);
    });

    it('never answers with "undefined" and never claims to be human', () => {
        const questions = [
            'hi', 'who are you', 'projects', 'skills', 'resume', 'contact', 'github', 'linkedin', 'tell me a joke', 'fun fact',
            'where does he live', 'does he know zig', 'I like robots', 'next project', 'source code', 'qwerty', 'thanks', 'bye',
            'does he know react', 'do you know firebase', 'selam', 'nasılsın', 'projeler', 'yetenekler', 'özgeçmiş', 'iletişim', 'mesaj bırak', 'iptal', 'asdf', 'saat kaç'
        ];
        for (const lang of ['en', 'tr']) {
            const c = chat({ lang });
            for (const q of questions) {
                const r = c.say(q);
                const out = text(r);
                expect(out, q).not.toMatch(/undefined|NaN|\[object/);
                expect(out, q).not.toMatch(/I am (a )?human|I'm (a )?human|I'm the real/i);
                expect(r.replies.length, q).toBeGreaterThan(0);
            }
        }
    });

    it('survives long and odd input', () => {
        expect(() => respond('a'.repeat(50000), createBotState(), {})).not.toThrow();
        expect(() => respond('((( ))) ??? !!!', createBotState(), {})).not.toThrow();
        expect(() => respond(null, createBotState(), {})).not.toThrow();
    });

    it('uses Math.random when none is given', () => {
        expect(text(respond('hi', createBotState(), {}))).toBeTruthy();
    });
});

describe('idle nudge and pacing', () => {
    it('nudges once after a quiet spell, never before talking, after goodbye or mid-conversation', () => {
        const fresh = createBotState();
        expect(botIdleNudge(fresh)).toBeNull();
        const c = chat();
        c.say('projects');
        const nudge = botIdleNudge(c.state);
        expect(nudge.replies[0].text).toMatch(/Still there|No rush/);
        expect(botIdleNudge(nudge.state)).toBeNull();

        const bye = chat();
        bye.say('bye');
        expect(botIdleNudge(bye.state)).toBeNull();

        const pending = chat();
        pending.say('leave a message');
        expect(botIdleNudge(pending.state)).toBeNull();
    });

    it('nudges in the language of the conversation', () => {
        const c = chat({ lang: 'en' });
        c.say('merhaba');
        expect(botIdleNudge(c.state).replies[0].text).toMatch(/orada mısın|Acele yok/);
    });

    it('typing time grows with the reply but is capped', () => {
        expect(botTypingDelayMs('hi')).toBeLessThan(botTypingDelayMs('a longer answer that takes a while to type out'));
        expect(botTypingDelayMs('x'.repeat(5000))).toBe(1800);
    });

    it('first greeting is two friendly bubbles with buttons', () => {
        const g = getBotGreeting(createBotState(), 'en');
        expect(g.replies).toHaveLength(2);
        expect(g.replies[0].text).toContain(BOT_NAME);
        expect(g.suggestions).toEqual(['Projects', 'Skills', 'Resume', 'Contact']);
    });
});
