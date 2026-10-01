import React, { useEffect } from 'react';
import { useOS } from '../context/OSContext';
import { useLanguage } from '../context/LanguageContext';
import './ErrorBoundary.css';

// Plays the (opt-in) system error sound once when the crash dialog appears.
const CrashSound = () => {
    const { playSound } = useOS();
    useEffect(() => { playSound('error'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
};

const CrashDialog = ({ title, details, showDetails, onClose, onRetry, onToggleDetails }) => {
    const { t } = useLanguage();
    return (
        <div className="eb-root" role="alert">
            <CrashSound />
            <div className="eb-body">
                <div className="eb-icon" aria-hidden="true">✖</div>
                <div className="eb-text">
                    <p>{t('crash.message', { title })}</p>
                    <p>{t('crash.vendor')}</p>
                </div>
            </div>
            {showDetails && <pre className="eb-details">{details}</pre>}
            <div className="eb-buttons">
                <button className="eb-btn" onClick={onClose}>{t('crash.close')}</button>
                <button className="eb-btn" onClick={onRetry}>{t('crash.tryAgain')}</button>
                <button className="eb-btn" onClick={onToggleDetails}>
                    {showDetails ? t('crash.hideDetails') : t('crash.details')}
                </button>
            </div>
        </div>
    );
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
            <CrashDialog
                title={title}
                details={details}
                showDetails={showDetails}
                onClose={onClose}
                onRetry={this.reset}
                onToggleDetails={() => this.setState({ showDetails: !showDetails })}
            />
        );
    }
}

export default ErrorBoundary;
