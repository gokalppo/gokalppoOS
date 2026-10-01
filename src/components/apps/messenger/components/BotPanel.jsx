import MessageList from './MessageList';
import Composer from './Composer';
import { BOT_NAME } from '../botReplies';
import { ME_UID } from '../hooks/useBotChat';

const ME = { uid: ME_UID, role: 'user' };
const BOT_CONTACT = { name: BOT_NAME };
const noop = () => { };

// The chat body for Gökalp Bot: messages, quick-reply buttons and the composer.
const BotPanel = ({ bot }) => {
    const last = bot.messages[bot.messages.length - 1];
    const suggestions = !bot.isTyping && last && last.suggestions ? last.suggestions : [];

    return (
        <>
            <MessageList
                messages={bot.messages}
                user={ME}
                contacts={[]}
                isTyping={bot.isTyping}
                activeContact={BOT_CONTACT}
                scrollKey="bot"
                onUserContextMenu={noop}
                onDeleteMessage={noop}
            />
            {suggestions.length > 0 && (
                <div className="bot-suggestions" role="group" aria-label="Suggested questions">
                    {suggestions.map((label) => (
                        <button key={label} className="bot-chip" onClick={() => bot.send(label)}>{label}</button>
                    ))}
                </div>
            )}
            <Composer
                disabled={false}
                showNudge={false}
                onSend={bot.send}
                onNudge={noop}
                onTyping={noop}
                onStopTyping={noop}
            />
        </>
    );
};

export default BotPanel;
