import { useState, useRef, useCallback, useEffect } from 'react';

export const useNotification = () => {
    const [notification, setNotification] = useState(null);
    const timerRef = useRef(null);

    const showNotification = useCallback((msg, type = 'info') => {
        setNotification({ msg, type });
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setNotification(null), 3000);
    }, []);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    return { notification, showNotification };
};
