# Lumi

Turn your lectures into clean, beautiful study notes. Record a class, get
organised notes with summaries, diagrams, formulas and a glossary — editable
and exportable to PDF. Free for every CUST student.

Lumi runs as a web app and ships as **downloadable, open-source installers** on
the [Releases page](../../releases) for Android, Windows, macOS and Linux. The
same codebase also installs as a PWA (handy for iPhone/iPad).

## Download and install

Grab the file for your platform from the **latest [Release](../../releases/latest)**.

**Android** — download `lumi.apk`. Open it on your phone; if prompted, allow
"Install unknown apps" for your browser or file manager, then tap **Install**.
(The APK is signed with the project's own key, so Android may warn that it is
not from the Play Store — this is expected for open-source side-loaded apps.)

**Windows** — download the `.msi` (or `.exe`) installer and run it. Windows
SmartScreen may warn because the build is unsigned; choose **More info → Run
anyway**.

**macOS** — download the `.dmg`, open it, drag **Lumi** to Applications. The
build is unsigned, so the first launch needs **right-click → Open** (or System
Settings → Privacy & Security → **Open Anyway**).

**Linux** — download the `.AppImage` (`chmod +x` then run), or the `.deb` /
`.rpm` and install with your package manager.

**iPhone & iPad** — there is no App Store build yet. Open the site in Safari →
**Share** → **Add to Home Screen** to install it as an app.

The desktop and Android apps are thin wrappers around the deployed site, so they
update themselves whenever the site updates — no reinstalling.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
```

The service worker is **production-only** (so it never fights dev hot-reload).
To test a production build:

```bash
npm run build
npm start
```

`scripts/gen-sw.mjs` runs automatically before `dev` and `build`, stamping a
fresh `BUILD_ID` into `public/sw.js` so browsers detect each new deploy.

## Building the installers

The installers are built by GitHub Actions, not locally. They wrap the live
site, so two things must be configured once in the repo settings:

**1. `APP_URL` variable** (Settings → Secrets and variables → Actions →
*Variables*) — the full HTTPS URL of the deployed site, e.g.
`https://lumi.vercel.app`. Both the Android and desktop builds read it.

**2. Android signing secrets** (same page, *Secrets* tab) — required for the
APK:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_B64` | base64 of the release keystore |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore/key password |
| `ANDROID_KEY_ALIAS` | `lumi` |

The Android app is a [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity)
built with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap); it only
opens full-screen (no browser URL bar) once `public/.well-known/assetlinks.json`
is served from `APP_URL` with the signing certificate's SHA-256 fingerprint
(already committed). The desktop apps are [Tauri](https://tauri.app) shells.

### Cut a release

```bash
npm version patch        # bumps package.json + creates a git tag
git push --follow-tags   # pushes the commit and the tag
```

Pushing a `v*` tag runs `.github/workflows/release.yml`: it creates the GitHub
Release, then builds the Android APK (`android.yml`) and the desktop installers
(`desktop.yml`) and attaches them. Each build workflow can also be run on its
own from the **Actions** tab (*Run workflow*) to produce downloadable artifacts
without tagging.

### Manual APK fallback

If the Android workflow is unavailable, you can generate an APK from the
deployed PWA with [PWABuilder](https://www.pwabuilder.com): enter `APP_URL`,
choose **Android → Download**, and sign the result with the same keystore so it
matches `assetlinks.json`.

