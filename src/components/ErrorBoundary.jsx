import React, { useEffect } from 'react';
import { useOS } from '../context/OSContext';
import './ErrorBoundary.css';

// Plays the (opt-in) system error sound once when the crash dialog appears.
const CrashSound = () => {
    const { playSound } = useOS();
    useEffect(() => { playSound('error'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
};

class ErrorBoundary extends React.Component {
    state = { error: null, showDetails: false };

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error(`[${this.props.title}] crashed:`, error, info?.componentStack);
    }

    reset = () => this.setState({ error: null, showDetails: false });

    render() {
        const { error, showDetails } = this.state;
        if (!error) return this.props.children;

        const { title, onClose } = this.props;
        const details = `${error?.name || 'Error'}: ${error?.message || String(error)}`;

        return (
            <div className="eb-root" role="alert">
                <CrashSound />
                <div className="eb-body">
                    <div className="eb-icon" aria-hidden="true">✖</div>
                    <div className="eb-text">
                        <p><strong>{title}</strong> has performed an illegal operation and will be shut down.</p>
                        <p>If the problem persists, contact the program vendor.</p>
                    </div>
                </div>
                {showDetails && <pre className="eb-details">{details}</pre>}
                <div className="eb-buttons">
                    <button className="eb-btn" onClick={onClose}>Close</button>
                    <button className="eb-btn" onClick={this.reset}>Try Again</button>
                    <button className="eb-btn" onClick={() => this.setState({ showDetails: !showDetails })}>
                        {showDetails ? 'Hide Details' : 'Details >>'}
                    </button>
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
