import React from 'react';

const MyResume = () => {
    return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            <iframe
                src="/resume.pdf#toolbar=0&navpanes=0&scrollbar=0"
                title="Gokalp Eker Resume"
                width="100%"
                height="100%"
                style={{ border: 'none' }}
            />
        </div>
    );
};

export default MyResume;
