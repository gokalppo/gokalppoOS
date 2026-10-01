const UserContextMenu = ({ menu, currentUid, contacts, onAddFriend }) => {
    if (!menu) return null;
    const alreadyFriends = contacts.some((c) => c.uid === menu.user.senderUid);

    return (
        <div
            className="msn-context-menu"
            style={{
                position: 'absolute',
                top: menu.y,
                left: menu.x,
                background: 'white',
                border: '1px solid gray',
                boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
                zIndex: 1000,
                padding: '5px',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid #eee', marginBottom: '2px' }}>{menu.user.senderName}</div>
            {alreadyFriends ? (
                <div style={{ color: 'gray', fontStyle: 'italic', fontSize: '10px' }}>Already Friends</div>
            ) : (
                menu.user.senderUid !== currentUid && (
                    <button
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                        onClick={() => onAddFriend(menu.user)}
                    >
                        + Add as Friend
                    </button>
                )
            )}
        </div>
    );
};

export default UserContextMenu;
