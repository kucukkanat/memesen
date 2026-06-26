// MSN Messenger sound pack.
//
// Primary path: the REAL Messenger sounds (the original MP3s under
// assets/msn/sounds), decoded into AudioBuffers and played through the shared
// master gain so the mute toggle still applies. Fallback path: an additive
// bell-model synthesis (kept below) for any sound we have no sample for, or for
// the brief window before the samples finish decoding.

import typeUrl from '../assets/msn/sounds/type.mp3';
import onlineUrl from '../assets/msn/sounds/online.mp3';
import nudgeUrl from '../assets/msn/sounds/nudge.mp3';
import newalertUrl from '../assets/msn/sounds/newalert.mp3';
import newemailUrl from '../assets/msn/sounds/newemail.mp3';
import outgoingUrl from '../assets/msn/sounds/outgoing.mp3';

export type SoundName = 'message' | 'nudge' | 'online' | 'offline' | 'signin' | 'send' | 'alert' | 'email';

type OscType = OscillatorNode['type'];

// Which SoundName maps to which real Messenger sample. `offline` has no original
// sample, so it always uses the synthesized fallback below.
const FILES: Partial<Record<SoundName, string>> = {
  message: typeUrl, // the iconic new-message "ba-ding"
  nudge: nudgeUrl,
  online: onlineUrl, // contact signs in
  alert: newalertUrl,
  signin: newalertUrl, // reuse the alert chime for "you're connected"
  email: newemailUrl,
  send: outgoingUrl,
};

// Lazily-created, shared across every sound. Kept module-level so we only ever
// hold one AudioContext (browsers cap how many you may open).
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
const samples = new Map<SoundName, AudioBuffer>();
let loadStarted = false;

type AudioWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

// Returns the shared context, creating it on first use. Returns null when Web
// Audio is unavailable (SSR / no window / unsupported browser) so all callers
// can stay no-throw no-ops.
const getCtx = (): AudioContext | null => {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;

  const w = window as AudioWindow;
  const Ctor: typeof AudioContext | undefined = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;

  try {
    const created = new Ctor();
    const gain = created.createGain();
    gain.gain.value = 0.7; // master headroom for the samples + layered partials
    gain.connect(created.destination);
    ctx = created;
    master = gain;
    return created;
  } catch {
    return null;
  }
};

// One enveloped oscillator: silence -> linear attack to `peak` -> exponential
// decay to near-zero. Routed through the shared master gain.
const bell = (
  c: AudioContext,
  out: GainNode,
  freq: number,
  startOffsetSec: number,
  durSec: number,
  peakGain: number,
  type: OscType = 'sine',
): void => {
  const t0 = c.currentTime + startOffsetSec;
  const attack = 0.008; // ~8ms, soft enough to avoid a click

  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;

  const env = c.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(peakGain, t0 + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);

  osc.connect(env);
  env.connect(out);
  osc.start(t0);
  osc.stop(t0 + durSec + 0.02);
};

// A single "note" as a bell: fundamental + octave (2x) + optional two-octave
// (4x) partials with progressively shorter decay and lower gain, giving the
// metallic glockenspiel shimmer.
const bellStack = (
  c: AudioContext,
  out: GainNode,
  freq: number,
  t0: number,
  dur: number,
  peak: number,
  withTwoOctave = true,
): void => {
  bell(c, out, freq, t0, dur, peak);
  bell(c, out, freq * 2, t0, dur * 0.85, peak * 0.45);
  if (withTwoOctave) bell(c, out, freq * 4, t0, dur * 0.7, peak * 0.2);
};

const synth: Record<SoundName, (c: AudioContext, out: GainNode) => void> = {
  // message: D5 -> G5 -> A5 rising, measured from the original "ba-ding".
  message: (c, out) => {
    bellStack(c, out, 587, 0, 0.3, 0.5);
    bellStack(c, out, 784, 0.12, 0.3, 0.5);
    bellStack(c, out, 880, 0.24, 0.38, 0.5); // last note rings a touch longer
  },

  // nudge: low G3 body thud + metallic G5/C6 ring with a gentle 5Hz wobble.
  nudge: (c, out) => {
    // Body: 196Hz (G3), square, slow swell so it thuds rather than clicks.
    const t0 = c.currentTime;
    const body = c.createOscillator();
    body.type = 'square';
    body.frequency.value = 196;
    const bodyEnv = c.createGain();
    bodyEnv.gain.setValueAtTime(0, t0);
    bodyEnv.gain.linearRampToValueAtTime(0.5, t0 + 0.08); // ~80ms swell
    bodyEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    body.connect(bodyEnv);
    bodyEnv.connect(out);
    body.start(t0);
    body.stop(t0 + 0.52);

    // Ring: G5 bell + C6 sine, with a 5Hz LFO amplitude wobble for the "boing".
    const ring = c.createGain();
    ring.gain.value = 1;
    ring.connect(out);
    const lfo = c.createOscillator();
    lfo.frequency.value = 5;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.3; // wobble depth around the ring gain
    lfo.connect(lfoGain);
    lfoGain.connect(ring.gain);
    lfo.start(t0);
    lfo.stop(t0 + 0.9);

    bellStack(c, ring, 784, 0, 0.9, 0.3);
    bell(c, ring, 1047, 0, 0.9, 0.3); // 1047Hz (C6) sine
  },

  // online: single warm D5 + D6 bell "ding".
  online: (c, out) => {
    bell(c, out, 587, 0, 0.7, 0.45);
    bell(c, out, 1175, 0, 0.6, 0.45 * 0.45);
  },

  // offline: descending D5 -> A4, darker and shorter.
  offline: (c, out) => {
    bellStack(c, out, 587, 0, 0.4, 0.35, false);
    bellStack(c, out, 440, 0.12, 0.4, 0.35, false);
  },

  // signin: rising arpeggio D5 -> G5 -> A5 -> D6, "you're connected".
  signin: (c, out) => {
    bellStack(c, out, 587, 0, 0.3, 0.45);
    bellStack(c, out, 784, 0.1, 0.3, 0.45);
    bellStack(c, out, 880, 0.2, 0.3, 0.45);
    bellStack(c, out, 1175, 0.32, 0.45, 0.45); // last note rings ~0.45s
  },

  // send: deliberately tiny outgoing tick — original MSN was silent on send.
  send: (c, out) => {
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1175; // D6
    const env = c.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(0.12, t0 + 0.002); // 2ms attack
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
    osc.connect(env);
    env.connect(out);
    osc.start(t0);
    osc.stop(t0 + 0.1);
  },

  // alert: two-note rising D5 -> A5 with a soft swell on the first note.
  alert: (c, out) => {
    const t0 = c.currentTime;
    // First note: ~60ms swell instead of the default 8ms bell attack.
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 587; // D5
    const env = c.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(0.45, t0 + 0.06);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
    osc.connect(env);
    env.connect(out);
    osc.start(t0);
    osc.stop(t0 + 0.42);
    bell(c, out, 1174, 0, 0.4, 0.45 * 0.45); // octave partial for the first note

    bellStack(c, out, 880, 0.25, 0.45, 0.45); // A5 bell
  },

  // email: single warm D5 bell, slightly softer than `online`.
  email: (c, out) => {
    bell(c, out, 587, 0, 0.7, 0.4);
    bell(c, out, 1175, 0, 0.6, 0.4 * 0.45);
  },
};

// Fetch + decode every real Messenger sample once, into the shared context.
// Best-effort: a sample that fails to load simply falls back to synthesis.
const loadSamples = (c: AudioContext): void => {
  if (loadStarted) return;
  loadStarted = true;
  for (const [name, url] of Object.entries(FILES) as [SoundName, string][]) {
    void fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => c.decodeAudioData(data))
      .then((buf) => {
        samples.set(name, buf);
      })
      .catch(() => undefined);
  }
};

const playSample = (c: AudioContext, out: GainNode, buf: AudioBuffer): void => {
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(out);
  src.start();
};

// Play a Messenger sound: the real sample if decoded, else the synthesized
// fallback. Lazily creates the shared AudioContext. No-op if muted or if Web
// Audio is unavailable. Never throws.
export const playSound = (name: SoundName): void => {
  if (muted) return;
  const c = getCtx();
  if (!c || !master) return;
  if (c.state === 'suspended') void c.resume().catch(() => undefined);
  try {
    const buf = samples.get(name);
    if (buf) playSample(c, master, buf);
    else synth[name](c, master);
  } catch {
    // Audio must never surface to the UI.
  }
};

// Call from a user-gesture handler to unlock/resume the context and kick off
// sample decoding. Safe to call repeatedly.
export const resumeAudio = (): void => {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => undefined);
  loadSamples(c);
};

export const setMuted = (next: boolean): void => {
  muted = next;
};

export const isMuted = (): boolean => muted;
