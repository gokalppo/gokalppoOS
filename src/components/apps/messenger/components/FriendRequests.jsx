const FriendRequests = ({ requests, onAccept, onDecline }) => {
    if (requests.length === 0) return null;
    return (
        <div className="friend-requests">
            <small style={{ color: 'navy', fontWeight: 'bold' }}>Requests ({requests.length}):</small>
            {requests.map((req) => (
                <div key={req.key} className="request-item" style={{ background: '#ffffe0', border: '1px solid orange', padding: '2px', fontSize: '9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{req.fromName}</span>
                    <div style={{ display: 'flex', gap: '2px' }}>
                        <button onClick={() => onAccept(req)} title="Accept" style={{ color: 'green', cursor: 'pointer' }}>✔</button>
                        <button onClick={() => onDecline(req)} title="Decline" style={{ color: 'red', cursor: 'pointer' }}>X</button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default FriendRequests;
