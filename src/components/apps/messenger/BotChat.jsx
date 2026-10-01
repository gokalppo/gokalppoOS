import './Messenger.css';
import BotPanel from './components/BotPanel';
import { useBotChat } from './hooks/useBotChat';
import { useLanguage } from '../../../context/LanguageContext';
import { BOT_NAME } from './botText';

// Chat with Gökalp Bot without signing in: no account, no Firebase, no cost.
const BotChat = ({ onBack }) => {
    const { lang } = useLanguage();
    const bot = useBotChat(lang);

    return (
        <div className="chat-interface bot-only">
            <div className="msn-chat-area">
                <div className="chat-header">
                    <span>🤖 Chatting with {BOT_NAME}</span>
                    <button className="bot-back-btn" onClick={onBack}>◀ Sign in</button>
                </div>
                <BotPanel bot={bot} />
            </div>
        </div>
    );
};

export default BotChat;
