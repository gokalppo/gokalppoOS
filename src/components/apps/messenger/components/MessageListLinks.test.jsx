import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import MessageList from './MessageList';

afterEach(() => cleanup());

const renderMessages = (messages) => {
    Element.prototype.scrollIntoView = () => {};
    return render(
        <MessageList
            messages={messages} user={{ uid: 'me', role: 'user' }} contacts={[]} isTyping={false}
            activeContact={null} scrollKey="x" onUserContextMenu={() => {}} onDeleteMessage={() => {}}
        />
    );
};

describe('links in messages', () => {
    it('makes web addresses and e-mail addresses clickable and safe', () => {
        renderMessages([{ key: '1', senderUid: 'bot', senderName: 'Bot', text: 'See https://github.com/gokalppo or mail ekergokalp@gmail.com.', timestamp: 1 }]);
        const link = screen.getByRole('link', { name: 'https://github.com/gokalppo' });
        expect(link.getAttribute('href')).toBe('https://github.com/gokalppo');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toContain('noopener');
        expect(screen.getByRole('link', { name: 'ekergokalp@gmail.com' }).getAttribute('href')).toBe('mailto:ekergokalp@gmail.com');
    });

    it('does not turn script-like text into a link', () => {
        renderMessages([{ key: '1', senderUid: 'x', senderName: 'X', text: 'javascript:alert(1) <b>bold</b>', timestamp: 1 }]);
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByText(/javascript:alert\(1\)/)).toBeTruthy();
        expect(document.querySelector('.msg-text b')).toBeNull();
    });
});
