import { useEffect, useRef } from "react";

/**
 * Auto-resizes font down from max to min if text wraps or overflows.
 * Ideal use case: Prevent long text from wrapping while keeping large size.
 */
export function useAutoFontSize(minPx: number = 16, maxPx: number = 93) {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const resize = () => {
            if (!el) return;

            let size = maxPx;
            el.style.fontSize = `${size}px`;

            while (
                size > minPx &&
                (el.scrollWidth > el.offsetWidth ||
                    el.scrollHeight > el.offsetHeight)
            ) {
                size -= 1;
                el.style.fontSize = `${size}px`;
            }
        };

        resize();

        const observer = new ResizeObserver(resize);
        observer.observe(el);

        return () => observer.disconnect();
    }, [minPx, maxPx]);

    return ref;
}
