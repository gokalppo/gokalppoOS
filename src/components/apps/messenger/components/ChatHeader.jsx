import { GLOBAL_ROOMS, BOT_ROOM } from '../chatUtils';
import { BOT_NAME } from '../botText';

const roomLabel = (room) => room.charAt(0).toUpperCase() + room.slice(1);

const ChatHeader = ({ currentRoom, activeContact, onSelectGlobalRoom }) => (
    <>
        <div className="messenger-tabs">
            {GLOBAL_ROOMS.map((room) => (
                <button
                    key={room}
                    className={`tab-btn ${currentRoom === room ? 'active' : ''}`}
                    onClick={() => onSelectGlobalRoom(room)}
                >
                    {roomLabel(room)}
                </button>
            ))}
        </div>

        <div className="chat-header">
            <span>
                {currentRoom === BOT_ROOM
                    ? `Chatting with ${BOT_NAME}`
                    : currentRoom === 'private' && activeContact
                        ? `Chatting with ${activeContact.name}`
                        : `Public Room: ${currentRoom.toUpperCase()}`}
            </span>
            <div className="chat-actions" />
        </div>
    </>
);

export default ChatHeader;
