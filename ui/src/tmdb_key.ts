// pages/apiKeyPrompt.ts
//
// Shared "TMDB API key invalid" screen. Any page's render()/init() can
// use this in its own data-fetch failure path:
//
//   export async function renderHome(): Promise<string> {
//     let tmdbErr: unknown = null;
//     const [a, b] = await Promise.all([
//       window.getTrending(1).catch((e) => { tmdbErr = e; return null; }),
//       window.getPopularMovies(1).catch((e) => { tmdbErr = e; return null; }),
//     ]);
//     if (isApiKeyError(tmdbErr)) return renderApiKeyAlert();
//     // ...normal rendering
//   }
//
//   export function initHome(): void {
//     if (document.getElementById("api-key-form")) {
//       initApiKeyAlert();
//       return; // the rest of the page wasn't rendered — nothing else to wire up
//     }
//     // ...normal init
//   }


//window functions
// declare global {
//   interface Window {
//     updateApiKey: (data: { apiKey?: string; bearerToken?: string }) => Promise<any>;
//   }
// }


const TMDB_KEY_ERROR_MESSAGE = "TMDB_key_invalid";

/** True if `err` is specifically the backend's "TMDB key invalid/missing" error. */
export function isApiKeyError(err: unknown): boolean {
  return err instanceof Error && err.message === TMDB_KEY_ERROR_MESSAGE;
}

/** Pure render — returns HTML only, no DOM access. Safe to call from any page's render(). */
export function renderApiKeyAlert(): string {
  return `
  <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0c0d21] text-gray-100 px-4">
    <div class="w-full max-w-md rounded-2xl bg-[#181931] border border-gray-800 p-8 shadow-2xl text-center">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/30">
        <svg class="h-7 w-7 text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h2 class="text-xl font-bold text-white">TMDB API Key Invalid</h2>
      <p class="mt-2 text-sm text-gray-400">
        MSTREAM couldn't authenticate with The Movie Database. Enter your own TMDB API key or read-access token below to continue.
      </p>

      <form id="api-key-form" class="mt-6 text-left" novalidate>
        <label for="api-key-input" class="block text-xs font-semibold text-gray-400 mb-1.5">TMDB API Key / Read Access Token</label>
        <input
          id="api-key-input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="Paste your key here"
          class="w-full rounded-xl bg-[#0c0d21] border border-gray-700/50 py-2.5 px-4 text-sm text-gray-200 placeholder-gray-500 focus:border-[#22d3ee] focus:outline-none focus:ring-1 focus:ring-[#22d3ee] transition-all duration-300"
        >
        <p id="api-key-error" class="mt-2 text-xs text-red-400 hidden"></p>

        <button id="api-key-submit" type="submit" class="mt-4 w-full rounded-xl bg-gradient-to-r from-[#a855f7] to-[#9333ea] px-6 py-3 font-bold text-white hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100">
          Save & Continue
        </button>
      </form>

      <p class="mt-4 text-xs text-gray-500">
        You can generate a free key from your
        <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" class="text-[#22d3ee] hover:underline">TMDB account settings</a>.
      </p>
    </div>
  </div>`;
}

/**
 * Wires the form rendered by renderApiKeyAlert(). Call from init() once
 * that HTML is actually in the DOM.
 *
 * @param onSuccess - called instead of the default full reload on a
 *   validated key, if the caller would rather do a lighter retry.
 */
export function initApiKeyAlert(onSuccess?: () => void): void {
  const form = document.getElementById("api-key-form") as HTMLFormElement | null;
  const input = document.getElementById("api-key-input") as HTMLInputElement | null;
  const errorEl = document.getElementById("api-key-error");
  const submitBtn = document.getElementById("api-key-submit") as HTMLButtonElement | null;
  if (!form || !input || !errorEl || !submitBtn) return;

  input.focus();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const key = input.value.trim();

    if (!key) {
      errorEl.textContent = "Enter a key before continuing.";
      errorEl.classList.remove("hidden");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Checking...";
    errorEl.classList.add("hidden");

    // TMDB issues both classic API keys (32 hex chars) and v4 read
    // access tokens (JWT-shaped, contains dots) — route whichever shape
    // was pasted to the matching field instead of guessing server-side.
    const looksLikeBearerToken = key.includes(".");
    const payload = looksLikeBearerToken ? { bearerToken: key } : { apiKey: key };

    try {
      await window.updateApiKey(payload);
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      errorEl.textContent =
        message === TMDB_KEY_ERROR_MESSAGE
          ? "That key was rejected by TMDB. Double-check it and try again."
          : "Couldn't save the key. Check your connection and try again.";
      errorEl.classList.remove("hidden");
      submitBtn.disabled = false;
      submitBtn.textContent = "Save & Continue";
    }
  });
}