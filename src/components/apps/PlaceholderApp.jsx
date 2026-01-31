import React from 'react';

const PlaceholderApp = ({ text, bg = 'white', color = 'black', fontFamily = 'gokalppoOS' }) => {
    return (
        <div style={{
            padding: '20px',
            height: '100%',
            backgroundColor: bg,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: fontFamily,
            fontSize: '16px',
            textAlign: 'center'
        }}>
            {text}
        </div>
    );
};

export default PlaceholderApp;
