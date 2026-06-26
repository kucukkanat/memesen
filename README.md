# @memesen/app — MSN Messenger, over Nostr

A faithful early-2000s **MSN / Windows Messenger** clone whose front end is
pixel-for-pixel period nostalgia — and whose back end is the **[Nostr](https://github.com/nostr-protocol/nostr)**
network. You manage real cryptographic identities and relays, your buddy list is
a Nostr follow list, presence and personal messages ride NIP-38 status events,
and chats are **end-to-end encrypted DMs** — all behind the iconic blue title
bars, the butterfly, the glossy presence dots and the real Messenger sounds.

Sign in with a Nostr key, drag your buddy list and conversation windows around
the desktop, add contacts by `npub`/NIP-05, send encrypted messages (typed `:)`
`(L)` `(Y)` codes render as the **real MSN emoticons**), and fire off **Nudges**
and **Winks** that travel to the other person over the wire.

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

On first launch, click **Create a new identity** (mints a fresh `nsec`) or
**Import a key (nsec)** to bring an existing Nostr account. Pick a status and
**Sign In** — Messenger connects to the default relays, pulls your profile,
follow list and contacts' presence, and starts listening for DMs. Your account is
remembered and auto-signs-in next time.

To grow your buddy list, use **Add a Contact** (paste an `npub`, NIP-05 or hex
key), or **Share my contact** to copy your `npub` or an invite link. Opening
someone's invite link (`…/?add=<npub>`) prompts you to add them in one click.

> ⚠️ **Key storage.** Identities are stored **as plaintext `nsec` in
> `localStorage`** — chosen for the frictionless "sign me in automatically" feel.
> Anyone with access to the browser/devtools can read the key. Use a throwaway
> key for playing around; don't import a high-value identity. (Swapping in
> NIP-49 passphrase encryption or NIP-07 extension signing is a localized change
> in `src/nostr/`.)

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
    wire.ts         # pure: the Nudge/Wink control-marker codec
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
  unread, the **nudge cooldown**, **auto-Away after 5 min idle**, corner toasts
  when a contact signs in or messages you, and the ever-present ad banner.

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
