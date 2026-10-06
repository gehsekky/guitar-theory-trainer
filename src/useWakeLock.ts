import { useEffect } from 'react';

/**
 * Keep the screen awake while `active` is true, e.g. while a drone plays.
 *
 * Browsers drop a wake lock whenever the page is hidden (switching apps,
 * locking the phone), so it's re-requested each time the page becomes
 * visible again. Where the Screen Wake Lock API is missing or a request is
 * refused (low-power mode, insecure origin), this does nothing.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let requesting = false;
    let done = false;

    async function acquire() {
      if (done || requesting || lock || document.visibilityState !== 'visible') {
        return;
      }
      requesting = true;
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (done) {
          void sentinel.release();
          return;
        }
        lock = sentinel;
        sentinel.addEventListener('release', () => {
          if (lock === sentinel) lock = null;
        });
      } catch {
        // Refused; the screen just follows its normal timeout.
      } finally {
        requesting = false;
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') void acquire();
    }

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      done = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void lock?.release();
      lock = null;
    };
  }, [active]);
}
