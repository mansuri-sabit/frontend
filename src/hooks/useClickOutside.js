// src/hooks/useClickOutside.js
import { useEffect, useRef } from 'react';

export const useClickOutside = (callback, enabled = true) => {
  const ref = useRef();

  useEffect(() => {
    if (!enabled) return;

    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback(event);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [callback, enabled]);

  return ref;
};
