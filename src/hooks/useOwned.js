import { useEffect, useState } from 'react';

const KEY = 'gtb-owned';

// Set of owned character ids, saved in the browser so it survives refreshes.
export default function useOwned() {
  const [owned, setOwned] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify([...owned]));
    } catch {
      /* storage unavailable: just don't save */
    }
  }, [owned]);

  function toggle(id) {
    setOwned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return { owned, toggle, clear: () => setOwned(new Set()) };
}