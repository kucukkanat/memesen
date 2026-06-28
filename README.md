# @memesen/app — MSN Messenger, over Nostr

A faithful early-2000s **MSN / Windows Messenger** clone whose front end is
pixel-for-pixel period nostalgia — and whose back end is the **[Nostr](https://github.com/nostr-protocol/nostr)**
network. You manage real cryptographic identities and relays, your buddy list is
a Nostr follow list, presence and personal messages ride NIP-38 status events,
and chats are **end-to-end encrypted DMs** — all behind the iconic blue title
bars, the butterfly, the glossy presence dots and the real Messenger sounds.

Sign in with a Nostr key, drag your buddy list and conversation windows around
the desktop, add contacts by `npub`/NIP-05, send encrypted messages (typed `:)`
`(L)` `(Y)` codes render as the **real MSN emoticons**), share **pictures**
(pick one, or just paste from the clipboard), and fire off **Nudges** and
**Winks** that travel to the other person over the wire.

## MSN feature → Nostr mapping

| MSN concept | Nostr mechanism |
| --- | --- |
| .NET Passport sign-in | a secp256k1 keypair (`nsec`/`npub`), NIP-19 |
| Screen name + display picture | kind-0 profile metadata (NIP-01) |
| Personal message (PSM) | NIP-38 status content (kind 30315) |
| Online / Busy / Away / Appear Offline | NIP-38 status tag, decayed to *offline* when stale |
| Buddy list | follow list (kind 3, NIP-02), with petnames |
| "Add a Contact" | resolve `npub` / NIP-05 / hex → append to kind 3 |
| "Share my contact" | one-click copy of your `npub`, or an `?add=<npub>` invite link |
| Conversation | **NIP-17** gift-wrapped private DM (kind 14 in a kind-1059 wrap) |
| Talking to a legacy client | also decrypts inbound **NIP-04** (kind 4) |
| Nudge / Wink | a DM carrying a private control marker, rendered as the effect |
| Sharing a picture | the image, downscaled to a small JPEG `data:` URL, in the same gift-wrapped DM (pick or paste) |
| "…is writing a message" | an **ephemeral** kind-20817 ping (relays forward but never store it) |
| Connection settings | the relay manager (the five most popular relays by default) |

Outbound chats are sent as **NIP-17** (wrapped once for your contact and once
for yourself, so your sent history survives a reload); inbound chats are decrypted
from **either NIP-17 or NIP-04**, for the widest interop. Messages dedupe on the
NIP-17 rumor id, so the relay echo of your own send never double-renders.

## Run it

```bash
bun install
bun dev          # hot-reloading dev server → http://localhost:3000
```

On first launch, click **Create a new account** (mints a fresh `nsec`) or
**Move or import an account** to bring an existing Nostr account (scan a QR from
another device, or paste an `nsec`/recovery phrase). Pick a status and
**Sign In** — Messenger connects to the default relays, pulls your profile,
follow list and contacts' presence, and starts listening for DMs. Your account is
remembered and auto-signs-in next time.

To grow your buddy list, use **Add a Contact** (paste an `npub`, NIP-05 or hex
key), or **Share my contact** to copy your `npub` or an invite link. Opening
someone's invite link (`…/?add=<npub>`) prompts you to add them in one click.

### Moving your account between devices

Your account *is* your secret key, so moving it to a new device just means
carrying that key across. **Move account** (in the buddy list) opens one dialog
with three ways to do it, all gated behind a single "show secret" so a glance
can't leak it:

- **📱 To my phone** — a QR code of your key. On the phone, open the app →
  **Move or import an account** → **Scan a QR code**, point it at the screen,
  and you're signed in. The phone's rear camera is used; nothing touches the
  network (the QR is decoded entirely on-device).
- **🔑 Secret key** — copy the `nsec…`, or **Save as file** for a backup.
- **✍️ Recovery words** — a 24-word phrase that encodes the *exact* key bytes
  (BIP-39 encoding of the raw secret, not NIP-06 derivation — so it round-trips
  back to the same `nsec`). Write it down as an offline backup.

Importing accepts any of the three forms (auto-detected) plus a raw hex key.
Your `npub` is the only thing safe to share — the key, phrase and QR are not.

> ⚠️ **Key storage.** Identities are stored **as plaintext `nsec` in
> `localStorage`** — chosen for the frictionless "sign me in automatically" feel.
> Anyone with access to the browser/devtools can read the key. Use a throwaway
> key for playing around; don't import a high-value identity. (Swapping in
> NIP-49 passphrase encryption or NIP-07 extension signing is a localized change
> in `src/nostr/`.)

## Window switcher (Alt+Tab)

On the desktop layout you can flick between open conversations the way you'd
switch apps, with a 3D cover-flow overlay of every window (the buddy list plus
each open chat, each showing the contact, status and last line):

- **macOS** — hold **Option (⌥)** and tap **Tab** (`⇧` to go back). macOS leaves
  Alt+Tab unbound, so it's free to use.
- **Windows / Linux** — hold **Alt** and tap **`` ` ``** (backtick, the key right
  above Tab). Their Alt+Tab belongs to the OS switcher and Ctrl+Tab to the
  browser's tab strip, so the cycle key shifts one row up to the unclaimed
  backtick while keeping the same "hold Alt, tap the key above Tab" feel.

Cards are ordered most-recently-used, so a quick tap-and-release toggles between
the two windows you use most. While the overlay is up, arrow keys move the
selection, **Esc** cancels, and releasing the modifier (or clicking a card)
jumps to it. Lives in `hooks/useWindowSwitcher.ts` (the keyboard state machine,
pure and headless) and `components/Switcher.tsx` (the carousel); the buddy list
gains a `buddyZ` so "Contacts" can be raised above the chats on selection.

## Mobile & PWA

The same app is touch-first on phones. Above 760px you get the authentic
desktop experience — draggable, resizable, overlapping windows — untouched. At
or below 760px (`useIsMobile`) the window manager is replaced rather than shrunk:

- **No floating windows.** The buddy list becomes a full-screen home view; a
  conversation opens as a full-screen page with a **‹ back** button; the taskbar
  becomes a touch **bottom nav** that tabs between Contacts and open chats. Only
  one screen shows at a time (`App` tracks the foreground chat).
- **Dialogs adapt.** `Modal` (and so every dialog built on it) becomes a
  full-width, height-capped, scrollable card — no per-dialog code changes.
- **Touch niceties.** Bigger tap targets, 16px inputs (no iOS focus-zoom),
  `100dvh` sizing, and `env(safe-area-inset-*)` padding for notches.

It's an **installable PWA**: a web manifest, maskable icons and a service worker
(precaches the shell, runtime-caches hashed assets) make it "Add to Home Screen"
on iOS and "Install app" on Android, launching standalone and working offline.
PWA assets live in `public/` and are copied into `dist/` by `bun run build`; all
paths are relative so it works under the GitHub Pages project subpath.

## Other commands

```bash
bun run build      # bundle to ./dist (minified)
bun run typecheck  # tsc --noEmit, strict
bun test           # unit + integration tests (pure logic + crypto helpers)
bun run test:e2e   # placeholder — browser E2E lives here, kept separate on purpose
```

## How it's built

The UI is a thin shell over a **pure reducer**. All non-determinism — the clock,
randomness, timers, **and every network/crypto side effect** — is resolved at the
edges and handed to the reducer as plain values, so the reducer never reaches for
`Date.now()`, the network, or a secret key itself and stays trivially testable.

```
src/
  nostr/            # the network/crypto layer (the only impure part)
    kinds.ts        # the Nostr event kinds we speak
    relays.ts       # the 5 default relays + URL normalisation
    keys.ts         # pure: key gen/import, npub/nsec, avatar + handle derivation
    profiles.ts     # pure: kind-0 metadata parse/serialise
    wire.ts         # pure: the Nudge/Wink/picture control-marker codec
    images.ts       # downscale + JPEG-compress a picked/pasted picture to a small data URL
    identity.ts     # localStorage: identities, active account, relay set
    storage.ts      # never-throwing localStorage JSON helpers
    client.ts       # NostrClient — owns the relay pool, subs, encrypt/decrypt
  state/
    types.ts        # AppState, Action union, domain types
    data.ts         # status labels, presence TTL, wink glyphs
    helpers.ts      # pure: clock formatting, clamp, pick(rng)
    view.ts         # pure: normalised graph → MSN-shaped contact view
    reducer.ts      # (state, action) => state — the single source of truth
    *.test.ts       # unit + integration coverage
  hooks/
    useNostr.ts     # bridges NostrClient ↔ reducer; owns client lifecycle
    useDrag.ts useResize.ts
  assets/  audio/  ui/  components/   # the MSN look & feel (see below)
  App.tsx           # wiring: reducer + timers + sound/toast/idle + commands
  index.tsx index.html
```

### State & data flow

`useReducer` holds one immutable `AppState`. `NostrClient` (in `src/nostr/`)
owns the relay connections and all secp256k1 work (via the audited
[`nostr-tools`](https://github.com/nbd-wtf/nostr-tools) / noble crypto — we never
hand-roll crypto). It emits **normalised, UI-agnostic events** (profile loaded,
follows loaded, presence, decrypted message, relay status). `useNostr` turns those
into reducer actions and exposes typed **commands** (`sendText`, `sendNudge`,
`setStatus`, `addContact`, …) for the other direction; it recreates the client
whenever the active identity or enabled relay set changes, and persists
identities/relays to `localStorage`. The reducer stays pure; effects that need
timers (the nudge shake, the wink overlay, auto-Away) live in `App.tsx`.

The reducer normalises the social graph into maps (`profiles`, `presence`,
`petnames`) keyed by pubkey; `state/view.ts` projects those into the denormalised
`{ name, handle, psm, status, avatar }` the MSN components render — including
**presence decay** (a contact silently drops to *offline* once their last status
is older than `PRESENCE_TTL_MS`).

## The MSN look & feel

Everything below is unchanged from the original nostalgia build — the refactor
swapped the *back end*, not the chrome.

- **The original MSN emoticon bitmaps** (incl. animated GIFs) auto-render inline
  from typed shortcuts, with the full picker grid of 45.
- **Real default display pictures** inside the genuine **status-coloured presence
  frames**, deterministically assigned per pubkey so every contact has a stable,
  MSN-flavoured avatar.
- **The real MSN butterfly**, glossy **presence dots**, and toolbar icons.
- **The real Messenger sounds** (`type` "ba-ding", `nudge`, contact-sign-in
  `online`, alert/e-mail) via Web Audio, with a synthesized bell fallback. Toggle
  with the 🔊 tray icon.
- **Resizable conversation windows**, **flashing taskbar buttons** + tab title on
  unread, the **"…is writing a message" typing indicator**, the **nudge cooldown**,
  **auto-Away after 5 min idle**, corner toasts when a contact signs in or messages
  you, and the ever-present ad banner.

Static window chrome is reproduced inline near the markup; keyframes,
`::-webkit-scrollbar` and `:hover` states live in `src/styles.css`.

> **Assets & credits.** The emoticons, avatars, presence frames, butterfly,
> toolbar icons **and sounds** under `src/assets/msn/` are the original Microsoft
> MSN/Windows Live Messenger assets, archived by the community
> ([bernzrdo/msn-emoticons](https://github.com/bernzrdo/msn-emoticons),
> [ManzDev/twitch-msn-messenger](https://github.com/ManzDev/twitch-msn-messenger),
> [romulodm/modernlivemessenger.com.br](https://github.com/romulodm/modernlivemessenger.com.br) — the sounds come from the last).
> They remain © Microsoft and are bundled here only for this personal,
> non-commercial nostalgia project — don't ship them in anything you sell.
