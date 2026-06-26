# @memesen/app — MSN Messenger nostalgia

A faithful early-2000s **MSN / Windows Messenger** clone, rebuilt from the
[`MSN Messenger.dc.html`](https://claude.ai/design/p/9e9dcb81-adb9-45c6-98c3-eb09fbbca54d)
design as a clean React + TypeScript app on Bun.

Sign in, drag your buddy list and conversation windows around the desktop, open
chats, send messages (typed `:)` `(L)` `(Y)` codes render as the **real MSN
emoticons**), get auto-replies, and fire off **Nudges** and **Winks** — all with
the iconic synthesized **MSN sounds**.

### What makes it feel like the real thing

- **The original MSN emoticon bitmaps** — the actual 19×19 Messenger emoticons
  (including the animated GIFs for the wink, crying face and birthday cake).
  Typed shortcuts auto-render inline in the transcript, and the emoticon picker
  shows the full grid of 45.
- **Real display pictures** — the classic default MSN avatars (flower, moto,
  rocket, soccer…), each shown inside the genuine **status-coloured presence
  frame** (green online / red busy / amber away / grey offline).
- **The real MSN butterfly** and the glossy **presence dots** — in the sign-in
  header, title bars, contact list, taskbar tray and toasts — plus the real
  toolbar icons (Nudge, Winks, webcam, voice, invite, games…).
- **The real Messenger sounds** — the original `type` ("ba-ding") new-message
  chime, the `nudge`, the contact-sign-in `online` ding, and the alert/e-mail
  sounds, decoded and played through the Web Audio API (with a synthesized bell
  fallback for the instant before the samples decode). Toggle with the 🔊 tray
  icon.
- **Resizable conversation windows** — drag the corner grip to resize any chat
  window (the transcript reflows to fill it); the buddy list and sign-in stay
  fixed, just like the real client.
- **Authentic behaviours**: corner *toast* alerts when contacts sign in or
  message you, **taskbar buttons that flash orange** (plus a flashing tab title)
  on unread messages, a **nudge cooldown** ("You may not send a Nudge that
  often."), **auto-Away after 5 min idle**, personal messages shown in the
  contact list, and the ever-present *Get Hotmail Plus!* ad banner.

> **Assets & credits.** The emoticons, avatars, presence frames, butterfly,
> toolbar icons **and sounds** under `src/assets/msn/` are the original Microsoft
> MSN/Windows Live Messenger assets, archived by the community
> ([bernzrdo/msn-emoticons](https://github.com/bernzrdo/msn-emoticons),
> [ManzDev/twitch-msn-messenger](https://github.com/ManzDev/twitch-msn-messenger),
> [romulodm/modernlivemessenger.com.br](https://github.com/romulodm/modernlivemessenger.com.br) — the sounds come from the last).
> They remain © Microsoft and are bundled here only for this personal,
> non-commercial nostalgia project — don't ship them in anything you sell.

## Run it

```bash
bun install
bun dev          # hot-reloading dev server → http://localhost:3000
```

Sign in with any e-mail (your screen name is the part before `@`) and a
password — it's all local, nothing is sent anywhere.

## Other commands

```bash
bun run build      # bundle to ./dist (minified)
bun run typecheck  # tsc --noEmit, strict
bun test           # unit + integration tests (pure logic)
bun run test:e2e   # placeholder — browser E2E lives here, kept separate on purpose
```

## How it's built

The UI is a thin shell over a **pure reducer**. All non-determinism (the clock,
RNG for auto-replies/winks, deferred timers) is resolved at the edges in
`App.tsx` and handed to the reducer as plain values — so the reducer is trivially
testable and never reaches for `Date.now()` or `Math.random()` itself.

```
src/
  state/
    types.ts     # AppState, Action union, domain types
    data.ts      # contacts, statuses, auto-replies, emoticon codes (seed data)
    helpers.ts   # pure: clock formatting, clamp, pick(rng)
    reducer.ts   # (state, action) => state — the single source of truth
    *.test.ts    # unit + integration coverage of the logic
  assets/
    msn/          # the real MSN bitmaps: emoticons, avatars, status, toolbar, ui
    emoticons.tsx # code→bitmap registry (45 emoticons) + the RichText renderer
    icons.tsx     # the MSN butterfly + glossy presence-dot status icons
    avatars.tsx   # display-picture registry + status-coloured presence frames
    assets.d.ts   # ambient module types for Bun's image imports
  audio/
    sounds.ts    # plays the real MSN samples (Web Audio), synth bell fallback
  hooks/
    useDrag.ts   # clamped window dragging
    useResize.ts # clamped corner resizing (conversation windows only)
  ui/
    chrome.ts    # shared Luna/XP window-chrome style fragments
  components/
    Taskbar.tsx  SignIn.tsx  BuddyList.tsx  ChatWindow.tsx  Toasts.tsx
  App.tsx        # wiring: reducer + timers + sound/toast/idle orchestration
  index.tsx      # React root
  index.html     # Bun fullstack entry point
```

### State flow

`useReducer` holds one immutable `AppState`. Components dispatch typed
`Action`s; side effects that need timers (a buddy "typing…" then replying, the
nudge shake, the wink overlay) live in `App.tsx`, read the latest state through a
ref, and dispatch follow-up actions on `setTimeout`. The reducer stays pure.

### Visual fidelity

Static window chrome (the blue title-bar gradients, beige menu bars, green
buttons) is reproduced inline near the markup; the things inline styles can't
express — keyframes (`msn-shake`, `msn-wink`, `msn-toast`, `msn-taskflash`),
`::-webkit-scrollbar`, and `:hover`/`:focus` states — live in `src/styles.css`.

Iconography is the **real MSN artwork** under `src/assets/msn/` (see the credits
note above). Each module wraps the bitmaps behind a small typed API —
`<Emoticon>`/`<RichText>`, `<Butterfly>`/`<StatusIcon>`, `<Avatar>` — so the rest
of the app stays asset-agnostic. The transcript renders text via `<RichText>`,
which tokenises the message (longest emoticon code first, so `:'(` beats `:(`)
and inlines the matching bitmap; Bun fingerprints and serves every image at build
time.

### Sound

`src/audio/sounds.ts` plays the **real Messenger samples** (`type`, `nudge`,
`online`, `newalert`, `newemail`, `outgoing`) through one shared `AudioContext`:
on the Sign-In click it unlocks the context and `fetch`/`decodeAudioData`s each
MP3 into an `AudioBuffer`, then routes playback through the master gain so the
🔊 mute toggle applies. For the brief moment before a sample finishes decoding —
and for `offline`, which has no original sample — it falls back to a synthesized
bell model (`OscillatorNode` + `GainNode`, pitch contours from FFT analysis of
the originals). Everything is a no-op when muted or unavailable, so the pure
state layer never touches audio.
