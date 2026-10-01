import { useState, useRef, useEffect, useCallback } from 'react';
import {
    respond, createBotState, getBotGreeting, botIdleNudge, botSendResult, botTypingDelayMs, botReadPauseMs, botGapMs, botIdleMs, BOT_NAME
} from '../botEngine';
import { loadBotMemory, saveBotMemory } from '../botMemory';
import { nowMs } from '../chatUtils';

export const ME_UID = 'me-local';
export const BOT_UID = 'gokalpbot';

const defaultSubmit = (payload) => import('../botInbox').then((m) => m.submitBotMessage(payload));

// Conversation with Gökalp Bot. Nothing is stored on a server; only the visitor's name and visit count
// are remembered, in this browser. A message the visitor asks the bot to pass on goes through `submit`.
export const useBotChat = (lang, { submit = defaultSubmit } = {}) => {
    const counterRef = useRef(0);
    const timersRef = useRef([]);
    const pendingRef = useRef(0);
    const busyUntilRef = useRef(0);
    const idleTimerRef = useRef(null);
    const aliveRef = useRef(true);
    const langRef = useRef(lang);
    useEffect(() => { langRef.current = lang; });

    // The visitor's name and visit count live in this browser only.
    const [initial] = useState(() => {
        const saved = loadBotMemory();
        const memory = { name: saved.name, visits: saved.visits + 1 };
        return { memory, bot: createBotState(memory) };
    });
    const memoryRef = useRef(initial.memory);
    const stateRef = useRef(initial.bot);
    useEffect(() => { saveBotMemory(memoryRef.current); }, []);

    const makeMessage = useCallback((fromBot, text, suggestions) => ({
        key: `bot-${counterRef.current++}`,
        senderUid: fromBot ? BOT_UID : ME_UID,
        senderName: fromBot ? BOT_NAME : 'You',
        text,
        timestamp: nowMs(),
        suggestions: suggestions || []
    }), []);

    const [messages, setMessages] = useState(() => {
        const greeting = getBotGreeting(initial.bot, lang);
        return greeting.replies.map((reply, i) => ({
            key: `bot-greeting-${i}`, senderUid: BOT_UID, senderName: BOT_NAME, text: reply.text, timestamp: nowMs(),
            suggestions: i === greeting.replies.length - 1 ? greeting.suggestions : []
        }));
    });
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        aliveRef.current = true;
        const timers = timersRef.current; // the same array for the whole life of the hook
        return () => {
            aliveRef.current = false;
            timers.forEach(clearTimeout);
            clearTimeout(idleTimerRef.current);
        };
    }, []);

    const later = useCallback((fn, ms) => {
        timersRef.current.push(setTimeout(() => { if (aliveRef.current) fn(); }, ms));
    }, []);

    // Shows each reply as its own bubble, with a "typing..." pause before it. Answers queue up behind
    // anything the bot is still saying. Returns how long (ms from now) until the last bubble appears.
    const play = useCallback((replies, suggestions) => {
        const start = Math.max(0, busyUntilRef.current - Date.now());
        let offset = start;
        replies.forEach((reply, i) => {
            offset += (i === 0 ? botReadPauseMs() : botGapMs()) + botTypingDelayMs(reply.text);
            const isLast = i === replies.length - 1;
            pendingRef.current += 1;
            later(() => {
                setMessages((prev) => [...prev, makeMessage(true, reply.text, isLast ? suggestions : [])]);
                pendingRef.current -= 1;
                if (pendingRef.current === 0) setIsTyping(false);
            }, offset);
        });
        if (replies.length) setIsTyping(true);
        busyUntilRef.current = Date.now() + offset;
        return offset;
    }, [later, makeMessage]);

    const armIdleNudge = useCallback((afterMs) => {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
            if (!aliveRef.current) return;
            const nudge = botIdleNudge(stateRef.current, langRef.current);
            if (!nudge) return;
            stateRef.current = nudge.state;
            play(nudge.replies, nudge.suggestions);
        }, afterMs + botIdleMs());
    }, [play]);

    const send = useCallback(async (rawText) => {
        const text = rawText.trim();
        if (!text) return false;

        setMessages((prev) => [...prev, makeMessage(false, text)]);

        const out = respond(text, stateRef.current, { lang, now: new Date() });
        stateRef.current = out.state;
        if (out.state.name !== memoryRef.current.name) {
            memoryRef.current = { ...memoryRef.current, name: out.state.name };
            saveBotMemory(memoryRef.current);
        }

        const total = play(out.replies, out.suggestions);
        armIdleNudge(total);

        // A message the visitor asked the bot to pass on: send it after the "Sending..." bubble.
        out.effects.filter((e) => e.type === 'sendMessage').forEach((effect) => {
            Promise.resolve()
                .then(() => submit(effect))
                .catch(() => 'failed')
                .then((kind) => {
                    if (!aliveRef.current) return;
                    play([{ text: botSendResult(kind, out.lang) }], out.suggestions);
                });
        });
        return true;
    }, [lang, makeMessage, play, armIdleNudge, submit]);

    return { messages, isTyping, send };
};
