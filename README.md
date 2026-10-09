# YouTube → Instagram Story

Any YouTube video becomes a **1080×1920 story card** — the video's own cover art,
its title, the channel and a link sticker — and goes straight into Instagram
Stories or a DM.

This repository contains the **built, installable web app** (a PWA). There is no
build step, no server and no API key: serve these files over HTTPS and it works.

## Live

| Host | URL |
| --- | --- |
| Cloudflare (edge Worker + static assets) | https://site-8cac8cb2f02c4c2881b8dd3ff7c45403.freebuff.page |
| GitHub Pages | https://kalabduke.github.io/yt-to-ig-story/ |

Both serve these exact files. Only the credentials-free Cloudflare Worker in
`worker.js` (in the build project) sits in front of the assets, purely to pin the
manifest's content type; the GitHub Pages copy is served as plain static files.

## Use it

1. Open the site on your phone.
2. Install it — Android Chrome: menu → **Install app**. iPhone Safari:
   Share → **Add to Home Screen**.
3. **On Android**, YouTube's own Share sheet then lists **YT → IG Story**: tap
   *Share* on any video, pick it, and the card is already on screen when the app
   opens. (Sharing from youtube.com in Chrome works the same way.)
4. Tap **Share → Instagram** and choose *Your story*, or use **Send it in a DM**.

There are also two direct buttons on phones — *Open Story with the card* and
*Send it in a DM* — which save the PNG to Photos first, then jump into the
Instagram app, falling back to the web if it isn't installed.

## What each platform can do

| | Install it | Send a link *into* it | Share the card out |
| --- | --- | --- | --- |
| Chrome on Android | yes | **yes — appears in the YouTube Share sheet** | Share sheet → Instagram → *Your story* / DM |
| Safari on iPhone / iPad | yes | **no** — Apple gives web apps no share target | Share sheet → Instagram; or Copy → Paste |
| Desktop browsers | yes | no | Download the PNG (desktop browsers have no Instagram share target) |

## Honest limits

- **There is no public Instagram API for posting Stories.** The hand-off is the
  OS share sheet, or a `instagram://` deep link into the app. The Spotify→Stories
  flow is a private partnership, not an API.
- **iOS has no share target for web apps.** Nothing can redirect a shared link
  into this app on an iPhone — that is an Apple platform rule, not a missing
  feature. The round trip there is YouTube → *Share → Copy* → open the app →
  **Paste**.
- **Chrome on Android cannot run extensions**, which is exactly why the phone
  half is a PWA rather than a browser extension.
- **The link pill on the card is drawn, not tappable.** To make it work for
  viewers you add a real link sticker inside Instagram Stories. Images are not
  clickable on their own inside Instagram.
- **Sharing into Stories needs a secure context.** `navigator.share` only exists
  over HTTPS, so an `http://` or self-signed-cert origin cannot do this.

Metadata comes from YouTube's public **oEmbed** endpoint, and thumbnails from
`i.ytimg.com`. Both send permissive CORS headers, so there is no backend
anywhere in this project.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The app — link form, card preview, options, share buttons |
| `app.js` | The bundled UI and renderer |
| `app.css`, `studio.css` | Styles |
| `sw.js` | Service worker — makes the app installable and hosts the shell offline |
| `manifest.webmanifest` | Installability plus the `share_target` that puts the app in Android's Share sheet |
| `icons/` | 192, 512 and maskable app icons |
| `.nojekyll` | Stops GitHub Pages from running Jekyll over the output |

The card renders entirely on-device with `<canvas>`: the cover's blurred bleed,
the rounded cover tile, auto-fitted title, channel, handle, brand row and the
link sticker. Dark and light themes, five accents, and toggles for the sticker,
channel and handle — the choices persist.

Built from the `betterbuff` project's `yt-to-ig/` directory, which also ships a
Chrome / Edge / Firefox extension that puts a **Share to Instagram** button
directly on youtube.com for desktop.
