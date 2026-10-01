import { useState, useRef, useEffect, useCallback } from 'react';
import { getBotReply, getBotGreeting, botTypingDelayMs, BOT_NAME } from '../botReplies';
import { nowMs } from '../chatUtils';

export const ME_UID = 'me-local';
export const BOT_UID = 'gokalpbot';

// Local-only conversation with Gökalp Bot (nothing is stored or sent to a server).
export const useBotChat = (lang) => {
    const counterRef = useRef(0);
    const timersRef = useRef([]);
    const pendingRef = useRef(0);

    const makeMessage = useCallback((fromBot, text, suggestions) => ({
        key: `bot-${counterRef.current++}`,
        senderUid: fromBot ? BOT_UID : ME_UID,
        senderName: fromBot ? BOT_NAME : 'You',
        text,
        timestamp: nowMs(),
        suggestions: suggestions || []
    }), []);

    const [messages, setMessages] = useState(() => {
        const greeting = getBotGreeting(lang);
        return [{
            key: 'bot-greeting', senderUid: BOT_UID, senderName: BOT_NAME,
            text: greeting.text, timestamp: nowMs(), suggestions: greeting.suggestions
        }];
    });
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

    const send = useCallback(async (rawText) => {
        const text = rawText.trim();
        if (!text) return false;

        setMessages((prev) => [...prev, makeMessage(false, text)]);

        const reply = getBotReply(text, lang);
        pendingRef.current += 1;
        setIsTyping(true);
        const timer = setTimeout(() => {
            setMessages((prev) => [...prev, makeMessage(true, reply.text, reply.suggestions)]);
            pendingRef.current -= 1;
            if (pendingRef.current === 0) setIsTyping(false);
        }, botTypingDelayMs(reply.text));
        timersRef.current.push(timer);
        return true;
    }, [lang, makeMessage]);

    return { messages, isTyping, send };
};
