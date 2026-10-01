import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { fetchTopTimes, submitTime } from './leaderboard';
import { NAME_MAX, validateScore, cleanName } from './minesweeperScores';

const NAME_KEY = 'gokalppoOS_minesweeperName';
const readName = () => { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } };
const saveName = (name) => { try { localStorage.setItem(NAME_KEY, name); } catch { /* storage unavailable */ } };

// Overlay with the ten fastest times.
export const BestTimes = ({ onClose, refreshKey }) => {
    const { t } = useLanguage();
    const [scores, setScores] = useState(null); // null = loading
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetchTopTimes()
            .then((rows) => { if (!cancelled) setScores(rows); })
            .catch(() => { if (!cancelled) { setFailed(true); setScores([]); } });
        return () => { cancelled = true; };
    }, [refreshKey]);

    return (
        <div className="ms-overlay" role="dialog" aria-label={t('ms.bestTimes')} onClick={onClose}>
            <div className="ms-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="ms-dialog-title">🏆 {t('ms.bestTimes')}</div>
                {scores === null && <div className="ms-note">{t('window.loading')}</div>}
                {failed && <div className="ms-note">{t('ms.boardError')}</div>}
                {scores && !failed && scores.length === 0 && <div className="ms-note">{t('ms.boardEmpty')}</div>}
                {scores && scores.length > 0 && (
                    <ol className="ms-scores">
                        {scores.map((s) => (
                            <li key={s.id}><span className="ms-score-name">{s.name}</span><span>{s.time}s</span></li>
                        ))}
                    </ol>
                )}
                <button className="ms-btn" onClick={onClose}>{t('window.close')}</button>
            </div>
        </div>
    );
};

// Shown after a win: send the time to the board once.
export const SubmitScore = ({ time, onSubmitted }) => {
    const { t } = useLanguage();
    const [name, setName] = useState(readName);
    const [state, setState] = useState('idle'); // idle | sending | sent | error
    const [error, setError] = useState(null);

    const submit = async (e) => {
        e.preventDefault();
        const problems = validateScore({ name, time });
        if (problems.length) { setError(t(`ms.err.${problems[0]}`)); return; }
        setState('sending');
        setError(null);
        try {
            await submitTime({ name, time });
            saveName(cleanName(name));
            setState('sent');
            onSubmitted();
        } catch {
            setState('error');
            setError(t('ms.err.failed'));
        }
    };

    if (state === 'sent') return <div className="ms-win-banner">{t('ms.submitted')}</div>;

    return (
        <form className="ms-win-banner" onSubmit={submit}>
            <div>{t('ms.winText', { time })}</div>
            <div className="ms-win-row">
                <input
                    className="ms-input"
                    value={name}
                    maxLength={NAME_MAX}
                    placeholder={t('ms.namePlaceholder')}
                    onChange={(e) => setName(e.target.value)}
                    aria-label={t('ms.namePlaceholder')}
                />
                <button className="ms-btn" type="submit" disabled={state === 'sending'}>{t('ms.submit')}</button>
            </div>
            {error && <div className="ms-error">{error}</div>}
        </form>
    );
};
