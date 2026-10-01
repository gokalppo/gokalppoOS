const NotificationBar = ({ notification }) => {
    if (!notification) return null;
    return (
        <div className="msn-notification-bar" role="status" style={{
            position: 'absolute', bottom: '40px', left: '10px', right: '10px',
            background: '#ffffe0', border: '1px solid black', padding: '5px',
            fontSize: '11px', color: notification.type === 'error' ? 'red' : 'black',
            zIndex: 2000, boxShadow: '2px 2px 5px rgba(0,0,0,0.2)'
        }}>
            {notification.type === 'error' ? '⚠️ ' : 'ℹ️ '}
            {notification.msg}
        </div>
    );
};

export default NotificationBar;
