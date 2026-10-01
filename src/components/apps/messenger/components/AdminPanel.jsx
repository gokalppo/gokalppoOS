const AdminPanel = ({ currentUid, allUsers, appUsage = [], onClose, onMigrateEmails, onToggleBan }) => (
    <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '300px', height: '400px', background: 'var(--win-gray)', border: '2px outset white',
        zIndex: 9999, display: 'flex', flexDirection: 'column', padding: '5px', boxShadow: '5px 5px 10px rgba(0,0,0,0.5)'
    }}>
        <div style={{ background: 'darkblue', color: 'white', padding: '2px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>Admin Tools</span>
            <button onClick={onClose} style={{ background: 'var(--win-gray)', border: '1px outset white', cursor: 'pointer' }}>X</button>
        </div>
        <button
            onClick={onMigrateEmails}
            title="One-time: move any legacy email fields out of the public users/ node"
            style={{ marginTop: '5px', fontSize: '10px', padding: '3px', cursor: 'pointer' }}
        >
            🔒 Migrate legacy emails to userPrivate
        </button>
        <div style={{ background: 'white', border: '2px inset white', marginTop: '5px', padding: '5px', fontSize: '11px', maxHeight: '110px', overflowY: 'auto' }}>
            <strong>App usage (opens)</strong>
            {appUsage.length === 0 ? (
                <div style={{ color: 'gray' }}>No data yet.</div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        {appUsage.map(({ app, opens }) => (
                            <tr key={app} style={{ borderBottom: '1px solid #eee' }}>
                                <td>{app}</td>
                                <td style={{ textAlign: 'right' }}>{opens}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', background: 'white', border: '2px inset white', marginTop: '5px', padding: '5px' }}>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid black' }}>
                        <th>User</th>
                        <th>Role</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {allUsers.map((u) => (
                        <tr key={u.uid} style={{ borderBottom: '1px solid #eee' }}>
                            <td>{u.username} <br /><small style={{ color: 'gray' }}>{u.email}</small></td>
                            <td>{u.role || 'user'}</td>
                            <td>
                                {u.uid !== currentUid && (
                                    <button
                                        onClick={() => onToggleBan(u.uid, u.isBanned)}
                                        style={{
                                            background: u.isBanned ? 'green' : 'red',
                                            color: 'white', border: '1px outset white',
                                            cursor: 'pointer', padding: '2px 5px'
                                        }}
                                    >
                                        {u.isBanned ? 'UNBAN' : 'BAN'}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

export default AdminPanel;
