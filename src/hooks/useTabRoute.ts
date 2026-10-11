import { useEffect, useState } from 'react';
import { oneOf, readSetting, writeSetting } from './usePersistentState';

// The active trainer lives in the URL hash ("#/drone"), so trainers can be
// linked to and Back/Forward move between them. Hash URLs need no server
// rewrites, which suits GitHub Pages and the installed PWA. The last trainer
// used is also saved, so a bare URL (or launching the app) reopens it.

const LAST_TAB_KEY = 'last-tab';

/** The tab id in a hash like "#/drone", or undefined if it isn't one. */
export function tabFromHash<T extends string>(
  hash: string,
  ids: readonly T[],
): T | undefined {
  const id = hash.replace(/^#\/?/, '');
  return ids.includes(id as T) ? (id as T) : undefined;
}

/** Which tab to open: the URL's, else the last one used, else `fallback`. */
export function initialTab<T extends string>(
  hash: string,
  ids: readonly T[],
  fallback: T,
): T {
  return tabFromHash(hash, ids) ?? readSetting(LAST_TAB_KEY, oneOf(ids), fallback);
}

const hashFor = (id: string) => `#/${id}`;

/** The current tab, kept in sync with the URL hash and remembered. */
export function useTabRoute<T extends string>(
  ids: readonly T[],
  fallback: T,
): [T, (id: T) => void] {
  const [tab, setTab] = useState(() =>
    initialTab(window.location.hash, ids, fallback),
  );

  // Follow Back/Forward and edited URLs; correct unknown hashes in place.
  useEffect(() => {
    function onHashChange() {
      const id = tabFromHash(window.location.hash, ids);
      if (id) setTab(id);
      else history.replaceState(null, '', hashFor(tab));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [ids, tab]);

  // Keep the URL showing the current tab (without adding history), and
  // remember it for next time.
  useEffect(() => {
    if (window.location.hash !== hashFor(tab)) {
      history.replaceState(null, '', hashFor(tab));
    }
    writeSetting(LAST_TAB_KEY, oneOf(ids), tab);
  }, [ids, tab]);

  /** Switch tabs, adding a history entry so Back returns here. Renders
   * right away; the hashchange that follows then finds nothing to do. */
  function navigate(id: T) {
    if (id === tab) return;
    setTab(id);
    window.location.hash = hashFor(id);
  }

  return [tab, navigate];
}
