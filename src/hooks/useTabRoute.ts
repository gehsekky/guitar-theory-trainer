import { useEffect, useState } from 'react';
import { readSetting, writeSetting, type Codec } from './usePersistentState';

// The active trainer lives in the URL hash ("#/drone"), so trainers can be
// linked to and Back/Forward move between them. Hash URLs need no server
// rewrites, which suits GitHub Pages and the installed PWA. The last trainer
// used is also saved, so a bare URL (or launching the app) reopens it.

const LAST_TAB_KEY = 'last-tab';

/** Retired tab ids and the tab that replaced each, so old links and a saved
 * last tab still land somewhere sensible. */
export type TabAliases<T extends string> = Readonly<Record<string, T>>;

/** The tab an id names, following aliases; undefined if it names none. */
function resolveTab<T extends string>(
  id: string,
  ids: readonly T[],
  aliases: TabAliases<T>,
): T | undefined {
  return ids.includes(id as T) ? (id as T) : aliases[id];
}

const tabCodec = <T extends string>(
  ids: readonly T[],
  aliases: TabAliases<T>,
): Codec<T> => ({
  parse: (raw) => resolveTab(raw, ids, aliases),
  serialize: (id) => id,
});

/** The tab in a hash like "#/drone", or undefined if it names none. */
export function tabFromHash<T extends string>(
  hash: string,
  ids: readonly T[],
  aliases: TabAliases<T> = {},
): T | undefined {
  return resolveTab(hash.replace(/^#\/?/, ''), ids, aliases);
}

/** Which tab to open: the URL's, else the last one used, else `fallback`. */
export function initialTab<T extends string>(
  hash: string,
  ids: readonly T[],
  fallback: T,
  aliases: TabAliases<T> = {},
): T {
  return (
    tabFromHash(hash, ids, aliases) ??
    readSetting(LAST_TAB_KEY, tabCodec(ids, aliases), fallback)
  );
}

const hashFor = (id: string) => `#/${id}`;

const NO_ALIASES: TabAliases<never> = {};

/** The current tab, kept in sync with the URL hash and remembered. */
export function useTabRoute<T extends string>(
  ids: readonly T[],
  fallback: T,
  aliases: TabAliases<T> = NO_ALIASES,
): [T, (id: T) => void] {
  const [tab, setTab] = useState(() =>
    initialTab(window.location.hash, ids, fallback, aliases),
  );

  // Follow Back/Forward and edited URLs; rewrite unknown and retired
  // hashes in place.
  useEffect(() => {
    function onHashChange() {
      const id = tabFromHash(window.location.hash, ids, aliases) ?? tab;
      setTab(id);
      if (window.location.hash !== hashFor(id)) {
        history.replaceState(null, '', hashFor(id));
      }
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [ids, aliases, tab]);

  // Keep the URL showing the current tab (without adding history), and
  // remember it for next time.
  useEffect(() => {
    if (window.location.hash !== hashFor(tab)) {
      history.replaceState(null, '', hashFor(tab));
    }
    writeSetting(LAST_TAB_KEY, tabCodec(ids, aliases), tab);
  }, [ids, aliases, tab]);

  /** Switch tabs, adding a history entry so Back returns here. Renders
   * right away; the hashchange that follows then finds nothing to do. */
  function navigate(id: T) {
    if (id === tab) return;
    setTab(id);
    window.location.hash = hashFor(id);
  }

  return [tab, navigate];
}
