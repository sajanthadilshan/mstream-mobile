import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { WebView as RNWebView, type WebViewProps, WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system'; // older SDKs: import * as FileSystem from 'expo-file-system/legacy'
import * as Crypto from 'expo-crypto'; // npx expo install expo-crypto
import { historyHandlers } from './historydb'; // casing must match the real file name exactly

// Cast fixes "No overload matches this call / props: never" typing errors
const WebView = RNWebView as unknown as React.ComponentType<
  WebViewProps & React.RefAttributes<RNWebView>
>;

// Fake origin, never actually requested. Must never be framed.
const BASE_URL = 'https://app.local/';
const APP_HOST = new URL(BASE_URL).hostname;

// Frames are NOT sandboxed. Protection comes from the native navigation gate,
// native popup blocking, the host blocklist below, and a fixed `allow` policy.
// Referrer policy sent by every iframe.
const REFERRER_POLICY = 'origin';

// The ONLY permission granted to iframes. Everything else (camera, microphone,
// geolocation, clipboard, payment, usb, etc.) is never delegated to a frame.
const FRAME_ALLOW = 'fullscreen';

// Optional allowlist. Empty = any public https host (iframe URLs are dynamic at runtime).
// The blocklist below still applies either way.
const ALLOWED_FRAME_HOSTS: string[] = [];

// Set true only if you truly need every subdomain of the hosts above.
const ALLOW_SUBDOMAINS = false;

// App theme background (near-black)
const BG = '#060509';

// ---------- Helpers ----------
// Hosts that must never be framed, even when ALLOWED_FRAME_HOSTS is empty:
// our own fake origin (would be same-origin without sandbox) and local/LAN targets.
const isBlockedHost = (host: string): boolean => {
  const h = host.toLowerCase();
  return (
    h === APP_HOST ||
    h === 'localhost' ||
    h === '[::1]' ||
    h.endsWith('.local') ||
    h.endsWith('.localhost') ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  );
};

const hostPatterns = (): string[] =>
  ALLOWED_FRAME_HOSTS.flatMap((h) =>
    ALLOW_SUBDOMAINS ? [`https://${h}`, `https://*.${h}`] : [`https://${h}`],
  );

const isAllowedFrameUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    if (isBlockedHost(u.hostname)) return false;
    if (ALLOWED_FRAME_HOSTS.length === 0) return true;
    return ALLOWED_FRAME_HOSTS.some(
      (h) => u.hostname === h || (ALLOW_SUBDOMAINS && u.hostname.endsWith('.' + h)),
    );
  } catch {
    return false;
  }
};

// ---------- CSP (no about:, blob:, data: so no same-origin frame tricks) ----------
const buildCsp = (): string => {
  const src = ALLOWED_FRAME_HOSTS.length === 0 ? 'https:' : hostPatterns().join(' ');
  return [
    `frame-src ${src}`,
    `child-src ${src}`,
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
  ].join('; ');
};

// ---------- Native HTML preparation (deterministic, no race) ----------
const prepareHtml = (html: string): string => {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${buildCsp()}">`;

  // Rewrite every static <iframe ...> tag: set referrer policy, drop srcdoc,
  // replace any page-supplied `allow` with fullscreen only.
  // Any sandbox attribute the page sets itself is left alone (it can only be stricter).
  const rewritten = html.replace(/<iframe\b([^>]*)>/gi, (_m, attrs: string) => {
    const strip = (a: string, name: string) =>
      a.replace(new RegExp(`\\s${name}(\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+))?`, 'gi'), '');
    let cleaned = attrs;
    for (const n of ['srcdoc', 'allow', 'allowfullscreen', 'referrerpolicy']) {
      cleaned = strip(cleaned, n);
    }
    return `<iframe referrerpolicy="${REFERRER_POLICY}" allow="${FRAME_ALLOW}" allowfullscreen${cleaned}>`;
  });

  // Match <head> but NOT <header>
  const headRe = /<head(\s[^>]*)?>/i;
  if (headRe.test(rewritten)) return rewritten.replace(headRe, (m) => m + meta);

  // No <head>: put the meta after <html> if present, otherwise before everything
  const htmlRe = /<html(\s[^>]*)?>/i;
  if (htmlRe.test(rewritten)) return rewritten.replace(htmlRe, (m) => `${m}<head>${meta}</head>`);
  return `<!doctype html><html><head>${meta}</head><body>${rewritten}</body></html>`;
};

// ---------- Injected hardening script (defense-in-depth for runtime-created iframes) ----------
const buildHarden = (): string => `
(function () {
  if (window.__hardened) return;
  var REFERRER = ${JSON.stringify(REFERRER_POLICY)};
  var ALLOW = ${JSON.stringify(FRAME_ALLOW)};
  var APP = ${JSON.stringify(APP_HOST)};
  var HOSTS = ${JSON.stringify(ALLOWED_FRAME_HOSTS)};
  var SUBS = ${JSON.stringify(ALLOW_SUBDOMAINS)};

  function def(obj, name, value) {
    try { Object.defineProperty(obj, name, { value: value, writable: false, configurable: false }); } catch (e) {}
  }

  function blocked(h) {
    h = h.toLowerCase();
    return h === APP || h === 'localhost' || h === '[::1]' ||
      /\\.local(host)?$/.test(h) ||
      /^127\\./.test(h) || /^10\\./.test(h) || /^192\\.168\\./.test(h) ||
      /^169\\.254\\./.test(h) || /^172\\.(1[6-9]|2\\d|3[01])\\./.test(h);
  }

  function hostOk(url) {
    try {
      var u = new URL(String(url), location.href);
      if (u.protocol !== 'https:') return false;
      if (blocked(u.hostname)) return false;
      if (HOSTS.length === 0) return true;
      return HOSTS.some(function (h) {
        return u.hostname === h || (SUBS && u.hostname.endsWith('.' + h));
      });
    } catch (e) { return false; }
  }

  // 1. Popups and dialogs
  def(window, 'open', function () { return null; });
  def(window, 'alert', function () {});
  def(window, 'confirm', function () { return false; });
  def(window, 'prompt', function () { return null; });

  // 2. Links, middle-click and forms with a target
  function blockTargets(e) {
    var t = e.target && e.target.closest && e.target.closest('a[target], area[target], form[target]');
    if (t && t.target !== '_self') { e.preventDefault(); e.stopPropagation(); }
  }
  ['click', 'auxclick', 'submit'].forEach(function (ev) {
    document.addEventListener(ev, blockTargets, true);
  });

  var origSet = Element.prototype.setAttribute;
  var origRemove = Element.prototype.removeAttribute;

  // 3. Normalise an iframe: referrer policy, no srcdoc, allow = fullscreen ONLY, https-only src.
  //    Each attribute is only written when it differs, so the MutationObserver below
  //    cannot loop on its own writes.
  function lockdown(f) {
    try {
      if (f.getAttribute('referrerpolicy') !== REFERRER) origSet.call(f, 'referrerpolicy', REFERRER);
      origRemove.call(f, 'srcdoc');
      if (f.getAttribute('allow') !== ALLOW) origSet.call(f, 'allow', ALLOW);
      if (!f.hasAttribute('allowfullscreen')) origSet.call(f, 'allowfullscreen', '');
      var s = f.getAttribute('src');
      if (s && !hostOk(s)) origSet.call(f, 'src', 'about:blank');
    } catch (e) {}
  }

  // 4. Iframes created via createElement / createElementNS
  var origCreate = Document.prototype.createElement;
  def(Document.prototype, 'createElement', function () {
    var el = origCreate.apply(this, arguments);
    if (el instanceof HTMLIFrameElement) lockdown(el);
    return el;
  });
  var origCreateNS = Document.prototype.createElementNS;
  def(Document.prototype, 'createElementNS', function () {
    var el = origCreateNS.apply(this, arguments);
    if (el instanceof HTMLIFrameElement) lockdown(el);
    return el;
  });

  // 5. Iframe property setters: src, srcdoc, referrerPolicy, allow, allowFullscreen
  var srcD = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
  if (srcD && srcD.set) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
      get: srcD.get, configurable: false,
      set: function (v) { lockdown(this); srcD.set.call(this, hostOk(v) ? v : 'about:blank'); }
    });
  }
  var sdD = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'srcdoc');
  if (sdD) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'srcdoc', {
      get: sdD.get, configurable: false, set: function () {}
    });
  }
  var rpD = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'referrerPolicy');
  if (rpD) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'referrerPolicy', {
      get: rpD.get, configurable: false, set: function () {}
    });
  }
  // iframe.allow = "camera; microphone" must not widen the policy
  var alD = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'allow');
  if (alD) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'allow', {
      get: alD.get, configurable: false, set: function () { lockdown(this); }
    });
  }
  // iframe.allowFullscreen = false must not turn fullscreen back off
  var afD = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'allowFullscreen');
  if (afD) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'allowFullscreen', {
      get: afD.get, configurable: false, set: function () { lockdown(this); }
    });
  }

  // 6. setAttribute / setAttributeNS / removeAttribute on iframes
  def(Element.prototype, 'setAttribute', function (k, v) {
    if (this instanceof HTMLIFrameElement) {
      var key = String(k).toLowerCase();
      if (key === 'srcdoc') return;
      if (key === 'allow') v = ALLOW;                 // clamp: fullscreen only
      else if (key === 'allowfullscreen') v = '';     // always on
      else if (key === 'referrerpolicy') v = REFERRER;
      else if (key === 'src') { lockdown(this); if (!hostOk(v)) v = 'about:blank'; }
    }
    return origSet.call(this, k, v);
  });
  var origSetNS = Element.prototype.setAttributeNS;
  def(Element.prototype, 'setAttributeNS', function (ns, k, v) {
    if (this instanceof HTMLIFrameElement) return;
    return origSetNS.call(this, ns, k, v);
  });
  def(Element.prototype, 'removeAttribute', function (k) {
    if (this instanceof HTMLIFrameElement) {
      var key = String(k).toLowerCase();
      if (key === 'referrerpolicy' || key === 'allow' || key === 'allowfullscreen') return;
    }
    return origRemove.call(this, k);
  });

  // 7. HTML string injection: rewrite iframe tags BEFORE they are parsed into the DOM
  function rewriteHtml(html) {
    return String(html).replace(/<iframe\\b([^>]*)>/gi, function (_m, attrs) {
      var cleaned = attrs.replace(/\\s(sandbox|srcdoc|allow|allowfullscreen|referrerpolicy)(\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+))?/gi, '');
      return '<iframe referrerpolicy="' + REFERRER + '" allow="' + ALLOW + '" allowfullscreen' + cleaned + '>';
    });
  }
  function wrapSetter(proto, prop) {
    var d = Object.getOwnPropertyDescriptor(proto, prop);
    if (!d || !d.set) return;
    Object.defineProperty(proto, prop, {
      get: d.get, configurable: false,
      set: function (v) { d.set.call(this, rewriteHtml(v)); }
    });
  }
  wrapSetter(Element.prototype, 'innerHTML');
  wrapSetter(Element.prototype, 'outerHTML');
  var origAdj = Element.prototype.insertAdjacentHTML;
  def(Element.prototype, 'insertAdjacentHTML', function (pos, html) {
    return origAdj.call(this, pos, rewriteHtml(html));
  });
  var origCtx = Range.prototype.createContextualFragment;
  def(Range.prototype, 'createContextualFragment', function (html) {
    return origCtx.call(this, rewriteHtml(html));
  });
  var origParse = DOMParser.prototype.parseFromString;
  def(DOMParser.prototype, 'parseFromString', function (html, type) {
    return origParse.call(this, type === 'text/html' ? rewriteHtml(html) : html, type);
  });

  // 8. Final sweep for anything else (cloneNode, importNode, shadow DOM edge cases)
  function sweep(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.tagName === 'IFRAME') lockdown(root);
    var list = root.querySelectorAll('iframe');
    for (var i = 0; i < list.length; i++) lockdown(list[i]);
  }
  new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      if (m.type === 'attributes') { sweep(m.target); return; }
      m.addedNodes.forEach(function (n) { if (n.nodeType === 1) sweep(n); });
    });
  }).observe(document, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ['src', 'srcdoc', 'allow', 'allowfullscreen', 'referrerpolicy']
  });

  def(window, '__hardened', true);
})();
true;
`;

// ---------- Bridge helpers (pure, safe outside the component) ----------
// JSON is valid JS except for these two line-separator characters.
const safeJson = (v: unknown) =>
  JSON.stringify(v ?? null).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

export default function SecureWebView() {
  const ref = useRef<RNWebView>(null);
  const canGoBack = useRef(false);
  const [html, setHtml] = useState<string | null>(null);
  const harden = useMemo(buildHarden, []);

  // Secret known only to the app's own page. Cross-origin iframes (the video
  // players) can see window.ReactNativeWebView on Android, but cannot read this
  // token, so they cannot issue bridge commands such as deleting history.
  const token = useMemo(() => Crypto.randomUUID(), []);
  const injected = useMemo(
    () => `${harden}\nwindow.__BRIDGE_TOKEN = ${JSON.stringify(token)};\ntrue;`,
    [harden, token],
  );

  //bridge
  //const reply = useCallback((id: number, data: unknown, error?: string) => {
  //  const js = error
  //    ? `window.__resolve(${id}, null, ${safeJson(error)}); true;`
  //    : `window.__resolve(${id}, ${safeJson(data)}); true;`;
  //   ref.current?.injectJavaScript(js);
  //}, []);

const [nudge, setNudge] = useState(0);

const reply = useCallback((id: number, data: unknown, error?: string) => {
  const js = error? `window.__resolve(${id}, null, ${safeJson(error)}); true;`: 
    `window.__resolve(${id}, ${safeJson(data)}); true;`;
  ref.current?.injectJavaScript(js);
  ref.current?.requestFocus?.();
  requestAnimationFrame(() => setNudge((n) => n + 1));
}, []);



  const onMessage = useCallback(
    async (e: WebViewMessageEvent) => {
      let msg: { id: number; cmd: string; args: unknown[]; token?: string };
      try {
        msg = JSON.parse(e.nativeEvent.data);
      console.log(msg)
      } catch {
        return; // not one of our bridge messages
      }

      const { id, cmd, args } = msg;
      if (msg.token !== token) return; // not from the app's own page
      if (typeof id !== 'number' || typeof cmd !== 'string') return;

      try {
        const handler = Object.prototype.hasOwnProperty.call(historyHandlers, cmd)
          ? historyHandlers[cmd]
          : undefined;
        if (!handler) throw new Error(`Unknown command: ${cmd}`);

        const result = await handler(...(Array.isArray(args) ? args : []));
        console.log(id, result)
        reply(id, result);
      } catch (err: any) {
        reply(id, null, String(err?.message ?? err));
      }
    },
    [token, reply],
  );
  // -------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const asset = Asset.fromModule(require('../../assets/ui/index.html'));
        await asset.downloadAsync();
        const text = await new File(asset.localUri ?? asset.uri).text();
        if (!cancelled) setHtml(prepareHtml(text));
      } catch (e) {
        console.warn('Failed to load UI', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Android back: go back inside the web UI only if possible, otherwise let the OS handle it
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current) {
        ref.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  // Native navigation gate. JS in the page cannot bypass this.
  const onShouldStart = useCallback((req: ShouldStartLoadRequest) => {
    const { url } = req;
    if (url === 'about:blank' || url.startsWith(BASE_URL)) return true;
    // iOS reports subframe loads (isTopFrame === false); apply the host rules to them.
    // Android only reports main-frame loads, so a framed page trying to navigate the
    // top window is rejected here, and CSP frame-src covers subframes.
    if ((req as any).isTopFrame === false) return isAllowedFrameUrl(url);
    return false; // never navigate the main frame away from the app
  }, []);

  if (!html) return <ActivityIndicator style={{ flex: 1, backgroundColor: BG }} color="#a78bfa" />;

  return (
    <View style={styles.root}>
      <WebView
        ref={ref}
        androidLayerType="hardware"
        source={{ html, baseUrl: BASE_URL }}
        //style={styles.web}
        style={[styles.web, { opacity: nudge % 2 ? 0.999 : 1 }]}
        onMessage={onMessage}

        //JS/storage
        javaScriptEnabled
        domStorageEnabled
        injectedJavaScriptBeforeContentLoaded={injected}
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly
        incognito
        saveFormDataDisabled
        cacheEnabled={false}

        //navigation lockdown
        // Keep '*' so react-native-webview does NOT hand URLs to Linking.openURL;
        // onShouldStartLoadWithRequest is the single decision point.
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={onShouldStart}
        onNavigationStateChange={(s) => {
          canGoBack.current = s.canGoBack;
        }}
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        onOpenWindow={() => {}}
        allowsLinkPreview={false}

        //file system/OS access(all still denied)
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        geolocationEnabled={false}
        mixedContentMode="never"
        thirdPartyCookiesEnabled={false}
        sharedCookiesEnabled={false}
        webviewDebuggingEnabled={false}
        textZoom={100}

        //media/fullscreen
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction

        //recovery
        onRenderProcessGone={() => ref.current?.reload()}// Android
        onContentProcessDidTerminate={() => ref.current?.reload()}// iOS
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  web: { flex: 1, backgroundColor: BG },
});
