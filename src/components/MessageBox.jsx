import React from 'react';
import './Window.css'; // Assuming we share window styles

const MessageBox = ({ title, message, type = 'info', buttons = ['OK'], onResult }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.1)' // Minimal dimming to focus attention
        }}>
            <div className="window" style={{ width: '300px', boxShadow: '4px 4px 10px rgba(0,0,0,0.5)' }}>
                <div className="title-bar">
                    <div className="title-bar-text">{title}</div>
                    <div className="title-bar-controls">
                        <button aria-label="Close" onClick={() => onResult('Cancel')} />
                    </div>
                </div>
                <div className="window-body">
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '15px', marginBottom: '15px' }}>
                        {/* Icon based on type */}
                        <div style={{ fontSize: '32px' }}>
                            {type === 'error' && '🚫'}
                            {type === 'warning' && '⚠️'}
                            {type === 'info' && 'ℹ️'}
                            {type === 'question' && '❓'}
                        </div>
                        <p style={{ marginTop: '5px' }}>{message}</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        {buttons.map(btn => (
                            <button
                                key={btn}
                                onClick={() => onResult(btn)}
                                style={{ minWidth: '70px', fontWeight: btn === 'OK' || btn === 'Yes' ? 'bold' : 'normal' }}
                            >
                                {btn}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageBox;
