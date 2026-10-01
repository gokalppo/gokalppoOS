// Gökalp Bot's brain: a rule-based conversation engine. It is pure (the clock and randomness are passed
// in), keeps a small memory of the chat (name, topic, what was already covered) and returns what to say
// as a list of chat bubbles plus quick-reply buttons.
import { PROJECTS } from '../../../data/projects';
import { OWNER, DEVICE_GROUPS } from '../../../data/profile';
import { PROJECT_NOTES, PERSONAL_FACTS } from '../../../data/botNotes';
import { localized } from '../../../i18n/translate';
import { tokenize, normalizeText, tokenMatches, detectLanguage } from './botNlp';
import { createMatcher, DEFAULT_THRESHOLD } from './botMatch';
import { CORPUS_TR } from './botCorpusTr';
import { CORPUS_EN } from './botCorpusEn';
import { utilityReply } from './botUtilities';
import { checkTeachable, TEACH_Q_MAX } from './botModeration';
import { TEXT, BOT_NAME } from './botText';
import {
    INTENTS, ASPECTS, ASPECT_ORDER, NAVIGATION, SKILL_QUERY_PHRASES, PROJECT_KEYWORDS,
    INTERESTS, INTEREST_PHRASES, SKILLS, projectTitleFor
} from './botKnowledge';

export { BOT_NAME };

export const MAX_LOCAL_TAUGHT = 100;
export const MAX_LESSONS_PER_CHAT = 6;
export const MESSAGE_MIN = 5;
export const MESSAGE_MAX = 1500;
const MATCH_LIMIT = 500;     // only the first characters of a message are analysed
const IDLE_NUDGE_MS = 75000;
export const botIdleMs = () => IDLE_NUDGE_MS;

// Keys whose list value is "several chat bubbles", not "pick one variant".
const BUBBLES = new Set(['firstGreeting', 'returnGreeting', 'returnGreetingAnon', 'aboutOwner', 'projectsIntro', 'recommend', 'contact']);

const CANCEL_WORDS = ['cancel', 'iptal', 'vazgec', 'vazgectim', 'stop', 'dur', 'nevermind', 'never mind', 'bos ver', 'neyse'];
const SKIP_WORDS = ['skip', 'gec', 'no', 'hayir', 'istemiyorum', 'no thanks', 'yok', 'nope', 'hayir istemiyorum', 'gerek yok'];
const YES_WORDS = new Set(['yes', 'yep', 'yeah', 'yup', 'sure', 'ok', 'okay', 'please', 'send', 'evet', 'evt', 'tamam', 'olur', 'tabii', 'tabi', 'gonder', 'yolla', 'isterim', 'ister', 'y', 'e']);
const NO_WORDS = new Set(['no', 'nope', 'nah', 'hayir', 'hayır', 'istemiyorum', 'h', 'cancel', 'iptal', 'dont', 'vazgec']);
const CONJUNCTIONS = new Set(['and', 've', 'also', 'ayrica', 'plus', 'ile', 'sonra', 'then', 'ayrıca']);
const NAME_INTRO_RE = /((?:my name is|call me|i am called|adım|adim|ismim)\s+)[\p{L}][\p{L}'-]{1,24}/giu;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

// ---------------------------------------------------------------------------
// state
// ---------------------------------------------------------------------------

export const createBotState = (memory = {}) => ({
    name: memory.name || null,
    returning: Number(memory.visits) > 1,
    lang: null,
    topic: null,          // { type: 'project', slug } while a project is being discussed
    seen: [],             // chip keys already covered (projects, skills, resume ...)
    misses: 0,
    turns: 0,
    ended: false,
    nudged: false,
    used: {},             // text key -> index of the variant used last
    counters: { joke: 0, fact: 0 },
    pending: null,        // { type: 'offer' } | { type: 'message', step, draft } | { type: 'teach', step: 'question'|'answer', draft }
    taught: Array.isArray(memory.taught) ? memory.taught.slice(-MAX_LOCAL_TAUGHT) : [],   // what this visitor taught the bot
    teachCount: 0,        // lessons given in this chat
    lastUnknown: null     // the last thing the bot could not answer, so it can be taught
});

const cloneState = (s) => ({ ...s, seen: [...s.seen], used: { ...s.used }, counters: { ...s.counters }, pending: s.pending ? { ...s.pending, draft: s.pending.draft ? { ...s.pending.draft } : undefined } : null });

// ---------------------------------------------------------------------------
// saying things
// ---------------------------------------------------------------------------

const makeSayer = (s, lang, random) => {
    const table = TEXT[lang] || TEXT.en;
    // One text, picked from its variants without repeating the last one.
    const say = (key, ...args) => {
        const raw = table[key];
        const value = typeof raw === 'function' ? raw(...args) : raw;
        if (!Array.isArray(value)) return value;
        if (value.length === 1) return value[0];
        const usedKey = `${lang}:${key}`;
        const last = s.used[usedKey];
        let index = Math.floor(random() * value.length);
        if (index === last) index = (index + 1) % value.length;
        s.used[usedKey] = index;
        return value[index];
    };
    // Like say(), for a list that is not a top-level key (e.g. the reasons a lesson was refused).
    const pickFrom = (usedKey, list) => {
        if (list.length === 1) return list[0];
        const last = s.used[usedKey];
        let index = Math.floor(random() * list.length);
        if (index === last) index = (index + 1) % list.length;
        s.used[usedKey] = index;
        return list[index];
    };
    const bubbles = (key, ...args) => {
        const raw = table[key];
        const value = typeof raw === 'function' ? raw(...args) : raw;
        return Array.isArray(value) ? value : [value];
    };
    return { say, bubbles, pickFrom, table };
};

// ---------------------------------------------------------------------------
// matching
// ---------------------------------------------------------------------------

const offsetsOf = (tokens) => {
    let at = 0;
    return tokens.map((t) => { const here = at; at += t.length + 1; return here; });
};

const scoreEntry = (entry, tokens, text, offsets) => {
    let score = 0;
    let pos = Infinity;
    const padded = ` ${text} `;
    (entry.phr || []).forEach((phrase) => {
        const at = padded.indexOf(` ${phrase} `);
        if (at >= 0) { score += 3; pos = Math.min(pos, at); }
    });
    (entry.kw || []).forEach((keyword) => {
        const i = tokens.findIndex((t) => tokenMatches(t, keyword));
        if (i >= 0) { score += 1; pos = Math.min(pos, offsets[i]); }
    });
    return { score, pos };
};

const findProject = (text, tokens) => {
    const padded = ` ${text} `;
    return PROJECTS.find((p) => padded.includes(` ${normalizeText(p.title)} `)
        || (PROJECT_KEYWORDS[p.slug] || []).some((k) => (k.includes(' ') ? padded.includes(` ${k} `) : tokens.includes(k)))) || null;
};

const ORDINALS = { first: 1, '1st': 1, birinci: 1, ilk: 1, second: 2, '2nd': 2, ikinci: 2, third: 3, '3rd': 3, ucuncu: 3, fourth: 4, '4th': 4, dorduncu: 4, fifth: 5, '5th': 5, besinci: 5 };

const findProjectByNumber = (tokens) => {
    for (let i = 0; i < tokens.length; i++) {
        const next = tokens[i + 1];
        const prev = tokens[i - 1];
        if (/^(project|proje)/.test(next || '') && /^\d$/.test(tokens[i])) return PROJECTS[Number(tokens[i]) - 1] || null;
        if (/^(project|proje)/.test(tokens[i]) && /^\d$/.test(next || '')) return PROJECTS[Number(next) - 1] || null;
        if (ORDINALS[tokens[i]] && /^(project|proje)/.test(next || '')) return PROJECTS[ORDINALS[tokens[i]] - 1] || null;
        if (ORDINALS[tokens[i]] && prev === undefined && /^(one|tane)$/.test(next || '')) return PROJECTS[ORDINALS[tokens[i]] - 1] || null;
    }
    return null;
};

const findAspect = (tokens, text, offsets) => {
    let best = null;
    ASPECT_ORDER.forEach((id) => {
        const { score } = scoreEntry(ASPECTS[id], tokens, text, offsets);
        if (score > 0 && (!best || score > best.score)) best = { id, score };
    });
    return best ? best.id : null;
};

const findNavigation = (tokens, text, offsets) => {
    const next = scoreEntry(NAVIGATION.next, tokens, text, offsets).score;
    const prev = scoreEntry(NAVIGATION.prev, tokens, text, offsets).score;
    if (!next && !prev) return null;
    return prev > next ? 'prev' : 'next';
};

const findSkill = (tokens, text) => {
    const padded = ` ${text} `;
    return SKILLS.find((skill) => skill.aliases.some((alias) => (alias.includes(' ') ? padded.includes(` ${alias} `) : tokens.includes(alias)))) || null;
};

const findInterest = (tokens, text) => {
    const padded = ` ${text} `;
    const wantsRecommendation = INTEREST_PHRASES.some((p) => padded.includes(` ${p} `));
    if (!wantsRecommendation) return null;
    const hit = INTERESTS.find((i) => i.kw.some((k) => tokens.includes(k)));
    // "I like pizza" or "recommend a movie" is small talk; only a topic or an explicit "where do I start?" counts
    if (!hit && !START_ASKS.some((p) => padded.includes(` ${p} `))) return null;
    return { interest: hit || null };
};

// ---------------------------------------------------------------------------
// replies
// ---------------------------------------------------------------------------

const periodOf = (now) => {
    const h = now.getHours();
    if (h < 5) return 'night';
    if (h < 12) return 'morning';
    if (h < 18) return 'afternoon';
    if (h < 23) return 'evening';
    return 'night';
};

const localeOf = (lang) => (lang === 'tr' ? 'tr-TR' : 'en-US');

const projectLines = (lang) => PROJECTS.map((p, i) => `${i + 1}. ${p.title} - ${localized(p.summary, lang)}`).join('\n');

const skillLines = (lang) => DEVICE_GROUPS
    .map((g) => `• ${localized(g.name, lang)}: ${g.devices.map((d) => d.name).join(', ')}`)
    .join('\n');

const CHIP_FOR = {
    projects: 'projects', project: 'projects', skills: 'skills', skill: 'skills', resume: 'resume', contact: 'contact',
    aboutOwner: 'aboutOwner', education: 'aboutOwner', leaveMessage: 'leaveMessage', joke: 'joke', funFact: 'funFact'
};
const CHIP_POOL = ['projects', 'skills', 'resume', 'contact', 'aboutOwner', 'leaveMessage', 'funFact', 'joke'];

const chipsFor = (s, lang, primary) => {
    const labels = (TEXT[lang] || TEXT.en).chips;
    if (s.ended) return [];
    if (s.pending) {
        if (s.pending.type === 'offer') return [labels.yes, labels.no];
        if (s.pending.type === 'teach') return [labels.cancel];
        if (s.pending.step === 'text') return [labels.cancel];
        if (s.pending.step === 'contact') return [labels.skip, labels.cancel];
        return [labels.yes, labels.no];
    }
    if (s.topic && s.topic.type === 'project') {
        const project = PROJECTS.find((p) => p.slug === s.topic.slug);
        const second = project && project.links && project.links.demo ? labels.demo : labels.source;
        return [labels.more, second, labels.next, labels.allProjects];
    }
    if (primary === 'fallback' && s.lastUnknown) {
        const others = CHIP_POOL.filter((k) => !s.seen.includes(k)).slice(0, 3);
        return [labels.teach, ...others.map((k) => labels[k])];
    }
    if (primary === 'joke') return [labels.joke, labels.funFact, labels.projects, labels.contact];
    if (primary === 'funFact') return [labels.funFact, labels.joke, labels.projects, labels.contact];
    const pool = CHIP_POOL.filter((k) => !s.seen.includes(k) && k !== CHIP_FOR[primary]);
    const rest = CHIP_POOL.filter((k) => !pool.includes(k) && k !== CHIP_FOR[primary]);
    return [...pool, ...rest].slice(0, 4).map((k) => labels[k]);
};

const projectReply = (project, aspect, { lang }) => {
    const table = TEXT[lang] || TEXT.en;
    const { source, demo } = project.links || {};
    const tech = project.tech.join(', ');
    const notes = PROJECT_NOTES[project.slug] || {};
    switch (aspect) {
        case 'tech': return [table.projectTechOnly(project.title, tech)];
        case 'source': return [source ? table.projectSource(project.title, source) : table.projectSourcePrivate(project.title)];
        case 'demo': return [demo ? table.projectDemo(project.title, demo) : table.projectNoDemo(project.title)];
        case 'more': return [table.projectMore(project.title, localized(project.description, lang))];
        case 'challenge':
        case 'learned': {
            const note = notes[aspect] || (aspect === 'learned' ? notes.challenge : null);
            return [note ? localized(note, lang) : table.projectChallenge(project.title)];
        }
        default:
            return [
                table.projectOverview(project, localized(project.summary, lang)),
                table.projectTech(tech, source, demo, !source)
            ];
    }
};

const personalReply = (text, tokens, ctx) => {
    const { lang, say } = ctx;
    const padded = ` ${text} `;
    const has = (list) => list.some((p) => (p.includes(' ') ? padded.includes(` ${p} `) : tokens.some((t) => tokenMatches(t, p))));
    let key = null;
    if (has(['hobby', 'hobbies', 'hobi', 'hobiler', 'free time', 'bos zamanlarinda', 'what does he do for fun'])) key = 'hobbies';
    else if (has(['where does he live', 'where is he based', 'where is he from', 'nerede yasiyor', 'hangi sehir', 'which city', 'nerede oturuyor'])) key = 'location';
    const fact = key && PERSONAL_FACTS[key];
    if (fact) return { bubbles: [localized(fact, lang)] };
    return { bubbles: [say('personal')], offer: true };
};

const buildContext = (s, lang, random, now) => ({ s, lang, random, now, ...makeSayer(s, lang, random) });

// ---------------------------------------------------------------------------
// small talk memory (the SimSimi part) and things people taught the bot
// ---------------------------------------------------------------------------

let corpusIndex = null;
const getCorpus = () => {
    if (!corpusIndex) {
        const build = (corpus) => ({ corpus, matcher: createMatcher(corpus.map(([patterns], id) => ({ id, patterns }))) });
        corpusIndex = { tr: build(CORPUS_TR), en: build(CORPUS_EN) };
    }
    return corpusIndex;
};

// Best stored sentence in either language (a small bonus for the language being spoken).
const corpusMatch = (text, tokens, lang) => {
    const index = getCorpus();
    let best = null;
    ['tr', 'en'].forEach((l) => {
        const hit = index[l].matcher.match(text, tokens);
        if (!hit) return;
        const score = hit.score + (l === lang ? 0.04 : 0);
        if (!best || score > best.score) best = { ...hit, score, lang: l, source: 'corpus', answers: index[l].corpus[hit.id][1], key: `${l}:corpus:${hit.id}` };
    });
    return best;
};

// What visitors taught: [{ q, a, lang }]. Local lessons count a little more than approved shared ones.
const taughtMatch = (entries, text, tokens, bonus, source) => {
    if (!entries || !entries.length) return null;
    const hit = createMatcher(entries.map((e, i) => ({ id: i, patterns: [e.q] }))).match(text, tokens);
    if (!hit) return null;
    return { ...hit, score: hit.score + bonus, source, answers: [entries[hit.id].a], key: `taught:${source}:${hit.id}` };
};

const SOCIAL_KEEP = new Set(['greeting', 'thanks', 'bye']);
const HONEST_INTENTS = new Set(['whoAreYou', 'creator']);
const START_ASKS = ['where should i start', 'what should i look at', 'which one should', 'hangisine bakmaliyim', 'nereden baslamaliyim', 'nereden baslayayim'];

// "teach: hello bot = hey there", "selam kanka dersem naber de", "when I say X, you say Y"
const parseInlineTeach = (raw) => {
    let m = /^(?:öğret|ogret|teach)\s*[:-]\s*(.+?)\s*(?:=>|->|=|>)\s*(.+)$/iu.exec(raw);
    if (m) return { q: m[1].trim(), a: m[2].trim() };
    m = /^(.+?)\s+(?:dersem|desem|derse)\s+(.+?)\s+de$/iu.exec(raw);
    if (m) return { q: m[1].trim(), a: m[2].trim() };
    m = /^when i say\s+(.+?),?\s+(?:you\s+)?(?:say|reply|answer)\s+(.+)$/i.exec(raw);
    if (m) return { q: m[1].trim(), a: m[2].trim() };
    return null;
};

// Stores a lesson; returns the effect that sends it on for approval.
const learn = (s, q, a, lang) => {
    const key = normalizeText(q);
    s.taught = [...s.taught.filter((t) => normalizeText(t.q) !== key), { q, a, lang }].slice(-MAX_LOCAL_TAUGHT);
    s.teachCount += 1;
    s.pending = null;
    s.lastUnknown = null;
    return { type: 'teach', q, a, lang };
};

// Validates a lesson; returns a refusal text or null when it is fine.
const refuseLesson = (q, a, ctx) => {
    for (const [value, kind] of [[q, 'question'], [a, 'answer']]) {
        const reason = checkTeachable(value, kind);
        if (reason !== 'ok') return ctx.pickFrom(`teachRefused:${reason}`, ctx.table.teachRefused[reason]);
    }
    if (normalizeText(q) === normalizeText(a)) return ctx.say('teachSame');
    return null;
};

const handleTeach = (input, s, lang, ctx) => {
    const text = String(input).trim();
    const { pending } = s;
    if (isCancel(text)) {
        s.pending = null;
        return { bubbles: [ctx.say('cancelled')] };
    }
    if (pending.step === 'question') {
        const reason = checkTeachable(text, 'question');
        if (reason !== 'ok') return { bubbles: [ctx.pickFrom(`teachRefused:${reason}`, ctx.table.teachRefused[reason])] };
        s.pending = { type: 'teach', step: 'answer', draft: { q: text } };
        return { bubbles: [ctx.say('teachAskAnswer', text)] };
    }
    const refusal = refuseLesson(pending.draft.q, text, ctx);
    if (refusal) return { bubbles: [refusal] };
    const q = pending.draft.q;
    return { bubbles: [ctx.say('teachSaved', q, text)], effects: [learn(s, q, text, lang)] };
};

// ---------------------------------------------------------------------------
// the "leave a message" conversation
// ---------------------------------------------------------------------------

const isCancel = (text) => CANCEL_WORDS.includes(normalizeText(text));

const isAnswer = (text, words) => {
    const tokens = tokenize(text);
    return tokens.length > 0 && tokens.length <= 3 && tokens.some((t) => words.has(t));
};

const handlePending = (input, s, lang, ctx) => {
    const { say, bubbles } = ctx;
    const text = String(input).trim();
    const pending = s.pending;

    if (pending.type === 'offer') {
        if (isAnswer(text, YES_WORDS) && !isAnswer(text, NO_WORDS)) {
            s.pending = { type: 'message', step: 'text', draft: {} };
            s.topic = null;
            return { bubbles: [say('askMessage')] };
        }
        s.pending = null;
        if (isAnswer(text, NO_WORDS)) return { bubbles: [say('no')] };
        return null; // not an answer: carry on as a normal message
    }

    if (pending.type === 'teach') return handleTeach(text, s, lang, ctx);

    // pending.type === 'message'
    if (isCancel(text)) {
        s.pending = null;
        return { bubbles: [say('cancelled')] };
    }

    if (pending.step === 'text') {
        const letters = (text.match(/\p{L}/gu) || []).length;
        if (letters < MESSAGE_MIN) return { bubbles: [say('messageTooShort')] };
        if (text.length > MESSAGE_MAX) return { bubbles: [say('messageTooLong')] };
        s.pending = { type: 'message', step: 'contact', draft: { message: text } };
        return { bubbles: [say('askContact')] };
    }

    if (pending.step === 'contact') {
        const skipped = SKIP_WORDS.includes(normalizeText(text));
        const email = skipped ? '' : (text.match(EMAIL_RE) || [''])[0];
        const tries = (pending.draft.invalid || 0) + 1;
        if (!skipped && !email && tries < 2) {
            s.pending = { ...pending, draft: { ...pending.draft, invalid: tries } };
            return { bubbles: [say('contactInvalid')] };
        }
        const draft = { message: pending.draft.message, contact: email };
        s.pending = { type: 'message', step: 'confirm', draft };
        return { bubbles: [say('confirmMessage', draft.message, draft.contact)] };
    }

    // confirm
    if (isAnswer(text, NO_WORDS)) {
        s.pending = null;
        return { bubbles: [say('cancelled')] };
    }
    if (isAnswer(text, YES_WORDS)) {
        const draft = pending.draft;
        s.pending = null;
        return {
            bubbles: bubbles('sending'),
            effects: [{ type: 'sendMessage', message: draft.message, contact: draft.contact || '', name: s.name || '', lang }]
        };
    }
    return { bubbles: [say('confirmUnclear')] };
};

// ---------------------------------------------------------------------------
// the main entry point
// ---------------------------------------------------------------------------

// Handlers return { bubbles, topic? (null clears), offer? }.
const HANDLERS = {
    greeting: (c) => ({ bubbles: [c.say('greeting', c.table.periods[periodOf(c.now)], c.s.name)] }),
    howAreYou: (c) => ({ bubbles: [c.say('howAreYou')] }),
    thanks: (c) => ({ bubbles: [c.say('thanks', c.s.name)] }),
    bye: (c) => { c.s.ended = true; return { bubbles: [c.say('bye', c.s.name)] }; },
    compliment: (c) => ({ bubbles: [c.say('compliment')] }),
    insult: (c) => ({ bubbles: [c.say('insult')] }),
    laugh: (c) => ({ bubbles: [c.say('laugh')] }),
    ack: (c) => ({ bubbles: [c.say('ack')] }),
    whoAreYou: (c) => ({ bubbles: [c.say('whoAreYou')] }),
    creator: (c) => ({ bubbles: [c.say('creator')] }),
    capabilities: (c) => ({ bubbles: [c.say('capabilities')] }),
    whatDoing: (c) => ({ bubbles: [c.say('whatDoing')] }),
    whereFrom: (c) => ({ bubbles: [c.say('whereFrom')] }),
    botAge: (c) => ({ bubbles: [c.say('botAge')] }),
    weather: (c) => ({ bubbles: [c.say('weather')] }),
    lonely: (c) => ({ bubbles: [c.say('lonely')] }),
    sad: (c) => ({ bubbles: [c.say('sad')] }),
    loveYou: (c) => ({ bubbles: [c.say('loveYou')] }),
    languageAbility: (c) => ({ bubbles: [c.say('languageAbility')] }),
    helloWorld: (c) => ({ bubbles: [c.say('helloWorld')] }),
    meaningOfLife: (c) => ({ bubbles: [c.say('meaningOfLife')] }),
    sudo: (c) => ({ bubbles: [c.say('sudo')] }),
    ping: (c) => ({ bubbles: [c.say('ping')] }),
    myName: (c) => ({ bubbles: [c.say('yourName', c.s.name)] }),
    time: (c) => ({ bubbles: [c.say('time', c.now.toLocaleTimeString(localeOf(c.lang), { hour: '2-digit', minute: '2-digit' }))] }),
    date: (c) => ({ bubbles: [c.say('date', c.now.toLocaleDateString(localeOf(c.lang), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))] }),
    joke: (c) => {
        const list = c.table.jokes;
        const text = list[c.s.counters.joke % list.length];
        c.s.counters.joke += 1;
        return { bubbles: [text] };
    },
    funFact: (c) => {
        const list = c.table.facts;
        const text = list[c.s.counters.fact % list.length];
        c.s.counters.fact += 1;
        return { bubbles: [text] };
    },
    aboutOwner: (c) => ({ bubbles: c.bubbles('aboutOwner', OWNER.name, localized(OWNER.role, c.lang)) }),
    education: (c) => {
        if (PERSONAL_FACTS.university) return { bubbles: [localized(PERSONAL_FACTS.university, c.lang)] };
        return { bubbles: [c.say('education', localized(OWNER.role, c.lang))], offer: true };
    },
    skills: (c) => ({ bubbles: [c.table.skillsIntro(skillLines(c.lang)), c.say('skillsOutro')], topic: null }),
    projects: (c) => ({ bubbles: c.bubbles('projectsIntro', projectLines(c.lang)), topic: { type: 'projects' } }),
    resume: (c) => ({ bubbles: [c.say('resume')] }),
    contact: (c) => (c.phone ? { bubbles: [c.say('phone')], offer: true } : { bubbles: c.bubbles('contact') }),
    github: (c) => ({ bubbles: [c.say('github')] }),
    linkedin: (c) => ({ bubbles: [c.say('linkedin')] }),
    site: (c) => ({ bubbles: [c.say('site')] }),
    secret: (c) => ({ bubbles: [c.say('secret')] }),
    hire: (c) => ({
        bubbles: [...(PERSONAL_FACTS.availability ? [localized(PERSONAL_FACTS.availability, c.lang)] : []), c.say('hire')],
        offer: true
    }),
    personal: (c) => personalReply(c.text, c.tokens, c),
    teach: (c) => {
        if (c.s.teachCount >= MAX_LESSONS_PER_CHAT) return { bubbles: [c.say('teachLimit')] };
        const question = c.s.lastUnknown;
        if (question) {
            c.s.pending = { type: 'teach', step: 'answer', draft: { q: question } };
            return { bubbles: [c.say('teachAskAnswer', question)] };
        }
        c.s.pending = { type: 'teach', step: 'question', draft: {} };
        return { bubbles: [c.say('teachAskQuestion')] };
    },
    forget: (c) => {
        const last = c.s.taught[c.s.taught.length - 1];
        if (!last) return { bubbles: [c.say('nothingToForget')] };
        c.s.taught = c.s.taught.slice(0, -1);
        return { bubbles: [c.say('forgot', last.q)] };
    },
    leaveMessage: (c) => {
        c.s.pending = { type: 'message', step: 'text', draft: {} };
        return { bubbles: [c.say('askMessage')], topic: null };
    }
};

// Priority when scores tie (earlier wins); everything else sorts by catalog order.
const INTENT_ORDER = INTENTS.map((i) => i.id);

// Intents that make another one redundant.
const SUPPRESS = {
    project: ['projects', 'github', 'site', 'skills', 'contact'],
    skill: ['skills', 'projects'],
    leaveMessage: ['contact', 'hire', 'personal'],
    creator: ['whoAreYou', 'site'],
    whatDoing: ['whoAreYou'],
    whoAreYou: ['aboutOwner'],
    personal: ['aboutOwner', 'education'],
    education: ['aboutOwner'],
    hire: ['contact', 'aboutOwner'],
    contact: ['aboutOwner'],
    capabilities: ['whoAreYou'],
    helloWorld: ['greeting'], sudo: ['greeting'], ping: ['greeting']
};

export const respond = (input, state, options = {}) => {
    const s = cloneState(state);
    const random = options.random || Math.random;
    const now = options.now || new Date();
    const uiLang = options.lang === 'tr' ? 'tr' : 'en';

    const raw = String(input ?? '').trim();
    const forDetection = raw.replace(/gökalp|gokalp/gi, '').replace(NAME_INTRO_RE, '$1');
    const detected = detectLanguage(forDetection);
    const lang = detected || s.lang || uiLang;
    s.lang = lang;
    s.turns += 1;

    const ctx = buildContext(s, lang, random, now);
    const finish = (bubbles, extra = {}) => {
        s.ended = extra.ended ?? s.ended;
        return {
            replies: bubbles.filter(Boolean).map((text) => ({ text })),
            suggestions: extra.chips || chipsFor(s, lang, extra.primary),
            state: s,
            effects: extra.effects || [],
            lang
        };
    };

    // --- a conversation in progress (leaving a message) ---
    if (s.pending) {
        const handled = handlePending(raw, s, lang, ctx);
        if (handled) {
            s.misses = 0;
            return finish(handled.bubbles, { effects: handled.effects, primary: 'leaveMessage' });
        }
    }

    if (!raw) return finish(ctx.bubbles('capabilities'), { primary: 'capabilities' });

    const text = normalizeText(raw.slice(0, MATCH_LIMIT));
    const tokens = tokenize(raw.slice(0, MATCH_LIMIT));
    const offsets = offsetsOf(tokens);
    ctx.text = text;
    ctx.tokens = tokens;
    s.ended = false;

    if (!tokens.length) {
        const emoji = /\p{Extended_Pictographic}/u.test(raw);
        return finish(emoji ? [ctx.say('emoji')] : [ctx.say('fallback')], { primary: 'emoji' });
    }

    const lead = []; // bubbles that come before the main answer (e.g. "Nice to meet you")

    // --- "my name is Ayşe" ---
    const nameMatch = raw.match(/(?:my name is|call me|i am called|adım|adim|ismim)\s+([\p{L}][\p{L}'-]{1,24})/iu);
    if (nameMatch && !/^(is|the|a|an|bot|gokalp|gökalp)$/i.test(nameMatch[1])) {
        const word = nameMatch[1];
        s.name = word.charAt(0).toLocaleUpperCase(lang === 'tr' ? 'tr' : 'en') + word.slice(1).toLocaleLowerCase(lang === 'tr' ? 'tr' : 'en');
        lead.push(ctx.say('niceToMeet', s.name));
    }

    // --- "teach: hello bot = hey there" in one go ---
    const inline = parseInlineTeach(raw);
    if (inline) {
        if (s.teachCount >= MAX_LESSONS_PER_CHAT) return finish([...lead, ctx.say('teachLimit')], { primary: 'teach' });
        const refusal = refuseLesson(inline.q, inline.a, ctx);
        if (refusal) return finish([...lead, refusal], { primary: 'teach' });
        const effect = learn(s, inline.q, inline.a, lang);
        return finish([...lead, ctx.say('teachSaved', inline.q, inline.a)], { primary: 'teach', effects: [effect] });
    }

    // --- something a visitor taught the bot beats everything but the honest "who/what am I" answers
    //     (so a taught "spiderman or hulk, who is stronger?" is not swallowed by the "pick one" trick) ---
    const taughtHit = [taughtMatch(s.taught, text, tokens, 0.08, 'local'), taughtMatch(options.taught, text, tokens, 0.04, 'shared')]
        .filter(Boolean).sort((a, b) => b.score - a.score)[0];
    if (taughtHit && taughtHit.score >= 0.9) {
        // only when the visitor asks exactly one of those questions ("what are you doing" is not "what are you")
        const honest = INTENTS.filter((i) => HONEST_INTENTS.has(i.id)).some((i) => (i.phr || []).includes(text));
        if (!honest) {
            s.misses = 0;
            return finish([...lead, ctx.pickFrom(taughtHit.key, taughtHit.answers)], { primary: 'chat' });
        }
    }

    // --- sums, coin flips, dice, "pizza or burger?" ---
    const utility = utilityReply(raw, lang, random);
    if (utility) {
        s.misses = 0;
        return finish([...lead, utility.text], { primary: 'utility' });
    }

    // --- what is being asked? ---
    const found = [];
    const add = (id, group, score, pos, data) => found.push({ id, group, score, pos, data });

    INTENTS.forEach((intent) => {
        const { score, pos } = scoreEntry(intent, tokens, text, offsets);
        if (score <= 0) return;
        // "ok", "peki" ... only count as a bare acknowledgement when that is nearly all that was said
        if (intent.id === 'ack' && tokens.length > 2) return;
        if (intent.id === 'laugh' && tokens.length > 3) return;
        add(intent.id, intent.group, score, pos, null);
    });

    const padded = ` ${text} `;
    // "do you know me?" is not a question about a technology
    const skillQuery = SKILL_QUERY_PHRASES.some((p) => padded.includes(` ${p} `)) && !tokens.some((t) => ['me', 'my', 'beni', 'bana'].includes(t));
    const skill = findSkill(tokens, text);
    const titled = PROJECTS.find((p) => padded.includes(` ${normalizeText(p.title)} `));
    const interest = findInterest(tokens, text);
    const project = titled || findProjectByNumber(tokens)
        || (skillQuery && skill ? null : (interest ? null : findProject(text, tokens)));
    const aspect = findAspect(tokens, text, offsets);
    const navigation = findNavigation(tokens, text, offsets);
    const onProject = s.topic && s.topic.type === 'project';

    if (project) {
        add('project', 'content', 6, 0, { project, aspect });
    } else if (onProject && navigation) {
        add('projectNav', 'content', 5, 0, { navigation });
    } else if (onProject && aspect) {
        add('projectAspect', 'content', 5, 0, { aspect });
    } else if (navigation && /(^| )(project|proje)/.test(text)) {
        add('projectNav', 'content', 4, 0, { navigation });
    } else if (aspect && !found.some((f) => f.group === 'content') && (ASPECTS[aspect].phr || []).some((p) => padded.includes(` ${p} `))) {
        add('projectAspect', 'content', 3, 0, { aspect });
    }

    if (skill) add('skill', 'content', 5, 0, { skill });
    else if (skillQuery && !found.some((f) => f.id === 'skills')) add('skillUnknown', 'content', 4, 0, null);

    if (interest && !project) add('recommend', 'content', 4, 0, interest);

    // --- choose what to answer ---
    const ids = new Set(found.map((f) => f.id));
    const suppressed = new Set();
    found.forEach((f) => (SUPPRESS[f.id] || []).forEach((id) => suppressed.add(id)));
    if (['helloWorld', 'meaningOfLife', 'sudo', 'ping'].some((id) => ids.has(id))) {
        found.filter((f) => f.group === 'social').forEach((f) => suppressed.add(f.id));
    }
    // a generic "projects" hit adds nothing once a specific project / navigation reply is coming
    if (ids.has('projectNav') || ids.has('projectAspect') || ids.has('recommend')) suppressed.add('projects');
    if (ids.has('projectAspect') || ids.has('projectNav')) { suppressed.add('skills'); suppressed.add('github'); suppressed.add('contact'); }

    const priority = (id) => {
        const special = ['leaveMessage', 'project', 'projectNav', 'projectAspect', 'skill', 'skillUnknown', 'recommend'].indexOf(id);
        return special >= 0 ? special - 100 : INTENT_ORDER.indexOf(id);
    };
    const candidates = found
        .filter((f) => !suppressed.has(f.id))
        .sort((a, b) => b.score - a.score || priority(a.id) - priority(b.id) || a.pos - b.pos);

    const social = candidates.filter((f) => f.group === 'social');
    const main = candidates.filter((f) => f.group !== 'social');
    const conjunction = tokens.some((t) => CONJUNCTIONS.has(t));

    const chosen = [];
    if (main.length) {
        chosen.push(main[0]);
        const second = main.slice(1).find((f) => f.group !== 'egg' && f.id !== main[0].id && (f.score >= 2 || conjunction));
        if (second && main[0].group !== 'egg') chosen.push(second);
        chosen.sort((a, b) => a.pos - b.pos);
    } else if (social.length) {
        chosen.push(social[0]);
        if (social[1] && social[1].id !== social[0].id && social[1].score >= 2) chosen.push(social[1]);
        chosen.sort((a, b) => a.pos - b.pos);
    }
    // a greeting / thanks in front of real content is said first, briefly
    const preface = main.length && social.length && !['bye'].includes(social[0].id) ? [social[0]] : [];

    // --- small talk: the closest sentence the bot remembers (its own, or taught by visitors) ---
    const hasMain = chosen.some((f) => f.group !== 'social');
    if (!hasMain) {
        const candidates = [
            taughtMatch(s.taught, text, tokens, 0.08, 'local'),
            taughtMatch(options.taught, text, tokens, 0.04, 'shared'),
            corpusMatch(text, tokens, lang)
        ].filter(Boolean).sort((a, b) => b.score - a.score);
        const hit = candidates[0];
        const keepsIntent = chosen.some((f) => SOCIAL_KEEP.has(f.id));
        const taughtWins = hit && hit.source !== 'corpus' && hit.score >= 0.9;
        if (hit && hit.score >= DEFAULT_THRESHOLD && (taughtWins || !(chosen.length && (keepsIntent || hit.score < 0.85)))) {
            s.misses = 0;
            const answer = ctx.pickFrom(hit.key, hit.answers);
            return finish([...lead, answer], { primary: 'chat' });
        }
    }

    if (!chosen.length && lead.length) {
        // just an introduction: be friendly, do not count it as a miss
        return finish([...lead, ctx.say('introFollowUp')], { primary: 'greeting' });
    }

    if (!chosen.length) {
        // nothing understood: remember what was said so the visitor can teach an answer
        s.misses += 1;
        const clipped = raw.slice(0, TEACH_Q_MAX);
        s.lastUnknown = checkTeachable(clipped, 'question') === 'ok' ? clipped : null;
        if (s.misses >= 2) {
            s.misses = 0;
            return finish([...lead, ctx.say('fallbackTwice')], { primary: 'fallback' });
        }
        return finish([...lead, ctx.say('fallback')], { primary: 'fallback' });
    }
    s.misses = 0;

    const out = [...lead];
    let primary = chosen[0].id;
    let offer = false;
    let chips = null;

    [...preface, ...chosen].forEach((f) => {
        const isPreface = preface.includes(f) || (lead.length > 0 && f.id === 'greeting');
        const shortKey = { greeting: 'greetingShort', thanks: 'thanksShort' }[f.id];
        if (isPreface && shortKey) {
            out.push(f.id === 'greeting'
                ? ctx.say(shortKey, ctx.table.periods[periodOf(ctx.now)], s.name)
                : ctx.say(shortKey));
            return;
        }
        const result = runIntent(f, ctx);
        out.push(...result.bubbles);
        if (result.offer) offer = true;
        if (result.chips) chips = result.chips;
        if (result.topic !== undefined) s.topic = result.topic;
        const chip = CHIP_FOR[f.id];
        if (chip && !s.seen.includes(chip)) s.seen.push(chip);
    });
    if (offer && !s.pending) s.pending = { type: 'offer' };
    if (primary === 'projectNav' || primary === 'projectAspect') primary = 'project';

    return finish(out, { primary, chips });
};

// Runs one found intent.
const runIntent = (f, ctx) => {
    const { s, lang, say } = ctx;
    const table = ctx.table;

    switch (f.id) {
        case 'project': {
            const project = f.data.project;
            return { bubbles: projectReply(project, f.data.aspect, { lang }), topic: { type: 'project', slug: project.slug } };
        }
        case 'projectAspect': {
            const project = PROJECTS.find((p) => p.slug === (s.topic && s.topic.slug));
            if (!project) return { bubbles: [say('projectWhich')], topic: { type: 'projects' }, chips: PROJECTS.map((p) => p.title) };
            return { bubbles: projectReply(project, f.data.aspect, { lang }) };
        }
        case 'projectNav': {
            const current = PROJECTS.findIndex((p) => p.slug === (s.topic && s.topic.slug));
            const step = f.data.navigation === 'prev' ? -1 : 1;
            const index = current < 0 ? (step === 1 ? 0 : PROJECTS.length - 1) : (current + step + PROJECTS.length) % PROJECTS.length;
            const project = PROJECTS[index];
            return {
                bubbles: [table.projectNext(project.title), ...projectReply(project, null, { lang })],
                topic: { type: 'project', slug: project.slug }
            };
        }
        case 'skill': {
            const { skill } = f.data;
            // usedIn entries are project titles, or { en, tr } labels for things like this site
            const usedIn = skill.usedIn.map((u) => (typeof u === 'string' ? u : localized(u, lang))).join(', ');
            const linked = skill.usedIn.map((u) => (typeof u === 'string' ? projectTitleFor(u) : null)).filter(Boolean);
            return {
                bubbles: [table.skillKnown(skill.name, usedIn, localized(skill.note, lang))],
                topic: linked.length === 1 ? { type: 'project', slug: linked[0].slug } : null
            };
        }
        case 'skillUnknown': {
            const names = SKILLS.map((k) => k.name);
            const shown = `${names.slice(0, 14).join(', ')}${names.length > 14 ? '...' : ''}`;
            return { bubbles: table.skillUnknown(shown), offer: true };
        }
        case 'recommend': {
            const { interest } = f.data;
            if (!interest) return { bubbles: ctx.bubbles('projectsIntro', projectLines(lang)), topic: { type: 'projects' } };
            const project = PROJECTS.find((p) => p.slug === interest.slugs[0]);
            return {
                bubbles: table.recommend(project.title, localized(project.summary, lang)),
                topic: { type: 'project', slug: project.slug }
            };
        }
        case 'contact': {
            const phone = ['phone number', 'telefon', 'whatsapp', 'call him', 'numarasi'].some((p) => ` ${ctx.text} `.includes(` ${p} `));
            return HANDLERS.contact({ ...ctx, phone });
        }
        default: {
            const handler = HANDLERS[f.id];
            return handler ? handler(ctx) : { bubbles: [say('fallback')] };
        }
    }
};

// ---------------------------------------------------------------------------
// greeting, idle nudge, sending results, typing delay
// ---------------------------------------------------------------------------

export const getBotGreeting = (state, uiLang = 'en', options = {}) => {
    const s = cloneState(state);
    const lang = uiLang === 'tr' ? 'tr' : 'en';
    const { bubbles } = makeSayer(s, lang, options.random || Math.random);
    const texts = s.returning
        ? (s.name ? bubbles('returnGreeting', s.name) : bubbles('returnGreetingAnon'))
        : bubbles('firstGreeting');
    return { replies: texts.map((text) => ({ text })), suggestions: chipsFor(s, lang, null), state: s };
};

// One gentle "still there?" after a quiet spell; at most once, and never after goodbye.
export const botIdleNudge = (state, uiLang = 'en', random = Math.random) => {
    if (state.nudged || state.ended || state.turns === 0 || state.pending) return null;
    const s = cloneState(state);
    s.nudged = true;
    const lang = s.lang || (uiLang === 'tr' ? 'tr' : 'en');
    const { say } = makeSayer(s, lang, random);
    return { replies: [{ text: say('idleNudge') }], suggestions: chipsFor(s, lang, null), state: s };
};

// What the bot says once forwarding a message succeeded or not ('sent' | 'failed' | 'tooSoon').
export const botSendResult = (kind, uiLang = 'en') => {
    const lang = uiLang === 'tr' ? 'tr' : 'en';
    const table = TEXT[lang];
    const key = { sent: 'sent', tooSoon: 'sendTooSoon' }[kind] || 'sendFailed';
    return table[key][0];
};

// The little note after a lesson that could not be sent on for approval ('teachGlobalFailed' | 'teachGlobalSlow').
export const botLessonNote = (key, uiLang = 'en') => (TEXT[uiLang === 'tr' ? 'tr' : 'en'][key] || [''])[0];

// Pacing: how long the bot "reads", types and pauses between bubbles. Tests shrink it with setBotTimingScale.
let timingScale = 1;
export const setBotTimingScale = (scale) => { timingScale = scale; };
export const botReadPauseMs = () => Math.round(450 * timingScale);
export const botGapMs = () => Math.round(300 * timingScale);

// How long the "typing..." indicator lasts for a reply (feels more natural than instant).
export const botTypingDelayMs = (replyText) => Math.round(Math.min(1800, 500 + String(replyText).length * 12) * timingScale);

