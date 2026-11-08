import { useRef, useState, useLayoutEffect } from 'react';

// The inner size (clientWidth/Height) of an element, kept up to date while the window is resized or maximized.
// Returns [ref, { width, height }]. Before the first measurement (and where ResizeObserver does not exist)
// the size is 0 x 0, which the layout helpers treat as "use the normal size".
export const useElementSize = () => {
    const ref = useRef(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return undefined;
        const read = () => setSize((prev) => (
            prev.width === element.clientWidth && prev.height === element.clientHeight
                ? prev
                : { width: element.clientWidth, height: element.clientHeight }
        ));
        read();
        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(read);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return [ref, size];
};
