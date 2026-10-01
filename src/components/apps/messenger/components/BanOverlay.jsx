import ReactDOM from 'react-dom';

const BanOverlay = () => ReactDOM.createPortal(
    <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: '#0000AA', color: 'white', zIndex: 99999999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Courier New", monospace', fontSize: '24px', fontWeight: 'bold'
    }}>
        <div style={{ background: 'white', color: 'blue', padding: '10px 20px', marginBottom: '20px' }}>
            SYSTEM ERROR: ACCESS_DENIED
        </div>
        <div>You have been banned by administrator.</div>
        <div style={{ fontSize: '14px', marginTop: '20px' }}>Terminating session...</div>
        <div style={{ fontSize: '72px', marginTop: '30px' }}>☹</div>
    </div>,
    document.body
);

export default BanOverlay;
