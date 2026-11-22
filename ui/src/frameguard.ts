// utils/iframeGuard.ts
//
// Hides an iframe (and shows a message + Retry button) when its host
// can't be reached, either while loading or after it was already playing.
//
// Why not iframe.addEventListener('error')? Browsers never fire `error` on
// <iframe> for refused connections, and the error page is cross-origin, so
// it can't be inspected. Instead we detect failures from outside:
//   1. Probe: a no-cors fetch to the host origin. It rejects on
//      ERR_CONNECTION_REFUSED / DNS failure / offline / timeout.
//   2. Load timeout: no `load` event within N seconds.
//   3. Heartbeat: keeps pinging the host origin while the player is open,
//      so a host that dies mid-playback is caught too.
//   4. offline/online events: hide immediately when the device loses
//      network, retry automatically when it comes back.
//
// Limits: it cannot see framing blocks (X-Frame-Options / frame-ancestors)
// or errors inside the player itself, because the host still answers the
// ping in those cases.

export interface IframeGuardOptions {
  loadTimeoutMs?: number;      // give up if iframe never fires `load`
  heartbeatMs?: number;        // ping interval while the iframe is shown
  pingTimeoutMs?: number;      // abort a single ping after this long
  failuresBeforeHide?: number; // consecutive heartbeat failures before hiding
  message?: string;
}

export function guardIframe(
  iframe: HTMLIFrameElement,
  errorEl: HTMLElement,
  signal?: AbortSignal,
  opts: IframeGuardOptions = {},
): () => void {
  const {
    loadTimeoutMs = 15000,
    heartbeatMs = 10000,
    pingTimeoutMs = 6000,
    failuresBeforeHide = 2,
    message = 'Server refused to connect.',
  } = opts;

  const src = iframe.getAttribute('src') || '';
  let origin = '';
  try {
    origin = new URL(src, window.location.href).origin;
  } catch {
    /* handled below */
  }

  let loaded = false;
  let hidden = false;
  let failures = 0;
  let loadTimer: number | undefined;
  let heartbeat: number | undefined;
  let disposed = false;

  const showError = () => {
    if (hidden || disposed) return;
    hidden = true;
    iframe.style.display = 'none';
    errorEl.innerHTML = '';
    const text = document.createElement('p');
    text.textContent = message;
    errorEl.append(text);
    errorEl.style.display = 'flex';
  };

  const hideError = () => {
    errorEl.style.display = 'none';
    iframe.style.display = '';
  };

  async function ping(): Promise<boolean> {
    if (!origin) return false;
    const ctl = new AbortController();
    const t = window.setTimeout(() => ctl.abort(), pingTimeoutMs);
    try {
      // Opaque response is fine: any answer from the server means it's reachable.
      await fetch(origin + '/', {
        mode: 'no-cors',
        cache: 'no-store',
        credentials: 'omit',
        signal: ctl.signal,
      });
      return true;
    } catch {
      return false;
    } finally {
      window.clearTimeout(t);
    }
  }

  function startWatching() {
    loaded = false;
    failures = 0;

    window.clearTimeout(loadTimer);
    loadTimer = window.setTimeout(() => {
      if (!loaded) showError();
    }, loadTimeoutMs);

    // Initial probe: a single failure is enough.
    ping().then((ok) => {
      if (!ok) showError();
    });

    window.clearInterval(heartbeat);
    heartbeat = window.setInterval(async () => {
      if (hidden || disposed) return;
      if (await ping()) {
        failures = 0;
      } else if (++failures >= failuresBeforeHide) {
        showError();
      }
    }, heartbeatMs);
  }

  function retry() {
    if (disposed) return;
    hidden = false;
    hideError();
    iframe.removeAttribute('src');
    iframe.setAttribute('src', src);
    startWatching();
  }

  const onLoad = () => {
    loaded = true;
    window.clearTimeout(loadTimer);
  };
  const onOffline = () => showError();
  const onOnline = () => {
    if (hidden) retry();
  };

  const dispose = () => {
    disposed = true;
    window.clearTimeout(loadTimer);
    window.clearInterval(heartbeat);
    iframe.removeEventListener('load', onLoad);
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('online', onOnline);
  };

  if (!src || !origin) {
    showError();
    return dispose;
  }

  iframe.addEventListener('load', onLoad);
  window.addEventListener('offline', onOffline);
  window.addEventListener('online', onOnline);
  signal?.addEventListener('abort', dispose);

  if (!navigator.onLine) showError();
  startWatching();

  return dispose;
}