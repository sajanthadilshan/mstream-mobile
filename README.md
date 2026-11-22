# MSTREAM

MSTREAM is an Android app for browsing movies and TV series and watching them through third-party streaming servers. Titles and details come from the [TMDB API](https://www.themoviedb.org/documentation/api). Video player iframes come from configurable third-party servers, and the app blocks the popups and redirects those players try to open.

## Features

- Browse and search movies and TV series with TMDB metadata (posters, ratings, overview, cast, seasons, episodes)
- Connect to third-party movie servers to load video player iframes
- Popup and redirect blocking inside the player WebView
- Server list delivered as an encrypted `servers.json`, so you can update servers without rebuilding the app
- Web-based UI rendered inside a React Native WebView, bundled as a single `index.html`

## Tech Stack

| Layer | Technology |
| --- | --- |
| Mobile app | React Native (Expo), TypeScript |
| UI | TypeScript, HTML, Tailwind CSS (exported as a single HTML file) |
| API tooling | Node.js |

## Project Structure

```
mstream/
├── api/     # Node.js script that generates the encrypted servers.json
├── app/     # React Native (Expo) project, builds the .apk
│   ├── assets/ui/        # Place the built single index.html here
│   └── src/config/config.tsx
└── ui/      # Web interface (TypeScript + Tailwind), builds to one HTML file
    └── dist-single/      # Output of the single-file build
```

## Prerequisites

- Node.js (LTS recommended) and npm
- A [TMDB API key](https://www.themoviedb.org/settings/api)
- An [Expo](https://expo.dev) account (for exporting the APK)
- A place to host a static file (any web server, object storage, or static hosting)

## Build Order

Set up the components in this order, since each step feeds the next:

1. `api`: generate and host `servers.json`
2. `ui`: build the single-file web interface
3. `app`: configure, embed the UI, and build the APK

---

## 1. API (`/api`)

Creates an encrypted `servers.json` that the app downloads at runtime.

### Usage

```bash
cd api
```

1. Open `encrypt.js` and set:
   - `ENCTKEY`: your encryption key (choose a strong, private value and remember it, since the app needs the same key)
   - `tmdbkey`: your TMDB API key
2. Add your server entries as required by the script.
3. Run:

   ```bash
   node encrypt.js
   ```

4. This generates `servers.json`. **Upload it to a remote server** so it is reachable from a public URL. You will need that URL for the app configuration.

> To change servers later, regenerate `servers.json` and re-upload it. No app rebuild is needed as long as the key and URL stay the same.

---

## 2. UI (`/ui`)

The web interface rendered inside the app's WebView.

### Usage

```bash
cd ui
npm install
```

1. Edit the TypeScript files in `./ui/src` to suit your preferences.
2. Build:

   ```bash
   npm run build
   ```

3. Open the `dist-single/` folder. It contains the single `index.html` file with everything inlined.

---

## 3. App (`/app`)

The React Native Expo project that wraps the UI and produces the Android `.apk`.

### Usage

1. **Configure the app.** Edit `app/src/config/config.tsx`:

   ```tsx
   DECRYPTKEY: "<the same key you used as ENCTKEY in api/encrypt.js>"
   MOVIE_ENDPOINT: "<public URL of your hosted servers.json>"
   ```

2. **Add the UI.** Build the UI (see section 3 above) and copy the generated single HTML file to:

   ```
   app/assets/ui/index.html
   ```

3. **Install dependencies and build:**

   ```bash
   cd app
   npm install
   npm run build
   ```

4. **Export the APK.** Log in to your Expo account and export the app:

   ```bash
   npx expo login
   ```

   Then follow your preferred Expo build flow (for example, EAS Build) to produce the `.apk`.

> The `DECRYPTKEY` in the app **must exactly match** the `ENCTKEY` used in `api/encrypt.js`, otherwise `servers.json` cannot be decrypted.

---

## Quick Start (Summary)

```bash
# 1. Generate servers.json
cd api
# edit encrypt.js -> set ENCTKEY and tmdbkey
node encrypt.js
# upload servers.json to a public host

# 2. Build the UI
cd ../ui
npm install
npm run build        # output: dist-single/index.html

# 3. Build the app
cd ../app
# edit src/config/config.tsx -> DECRYPTKEY, MOVIE_ENDPOINT
cp ../ui/dist-single/index.html ./assets/ui/index.html
npm install
npm run build
# log in to Expo and export the .apk
```

## Security Notes

- Do not commit real values for `ENCTKEY`, `tmdbkey`, or `DECRYPTKEY` to a public repository. Use placeholders or environment variables where possible.
- Encryption of `servers.json` hides server details from casual inspection only. Because the decryption key ships inside the app, it is not a strong secret.

## Disclaimer

- MSTREAM does not host, store, or distribute any video content. It only displays metadata from TMDB and loads players provided by third-party servers that you configure.
- You are solely responsible for the servers you add and for making sure your use complies with the laws and copyright rules in your region.
- This product uses the TMDB API but is not endorsed or certified by TMDB.
- Parts of this project's code were generated with the help of AI. Review it before using it in production.

## License

This project is licensed under the [MIT License](./LICENSE).

The license covers the MSTREAM source code only. It does not cover TMDB data or any third-party content, which remain subject to their own terms.