// Real MSN Messenger emoticons — the original bitmaps (19x19), bundled by Bun.
// Animated ones use the original looping GIFs, just like the real client.
import smile from './msn/emoticons/smile.png';
import openMouth from './msn/emoticons/open-mouthed-smile.png';
import wink from './msn/emoticons/winking-smile.gif';
import tongue from './msn/emoticons/smile-with-tongue-out.png';
import sad from './msn/emoticons/sad-smile.png';
import crying from './msn/emoticons/crying-face.gif';
import surprised from './msn/emoticons/surprised-smile.png';
import embarrassed from './msn/emoticons/embarrassed-smile.png';
import confused from './msn/emoticons/confused-smile.png';
import angry from './msn/emoticons/angry-smile.png';
import disappointed from './msn/emoticons/disappointed-smile.png';
import nerd from './msn/emoticons/nerd-smile.png';
import hot from './msn/emoticons/hot-smile.png';
import angel from './msn/emoticons/angel.png';
import devil from './msn/emoticons/devil.png';
import sick from './msn/emoticons/sick-smile.png';
import sarcastic from './msn/emoticons/sarcastic-smile.png';
import dontTell from './msn/emoticons/dont-tell-anyone-smile.png';
import eyeRoll from './msn/emoticons/eye-rolling-smile.gif';
import party from './msn/emoticons/party-smile.gif';
import redHeart from './msn/emoticons/red-heart.png';
import brokenHeart from './msn/emoticons/broken-heart.png';
import redLips from './msn/emoticons/red-lips.png';
import redRose from './msn/emoticons/red-rose.png';
import thumbsUp from './msn/emoticons/thumbs-up.png';
import thumbsDown from './msn/emoticons/thumbs-down.png';
import birthdayCake from './msn/emoticons/birthday-cake.gif';
import star from './msn/emoticons/star.png';
import coffee from './msn/emoticons/coffee-cup.png';
import beer from './msn/emoticons/beer-mug.png';
import martini from './msn/emoticons/martini-glass.png';
import note from './msn/emoticons/note.png';
import moon from './msn/emoticons/sleeping-half-moon.png';
import sun from './msn/emoticons/sun.png';
import rainbow from './msn/emoticons/rainbow.png';
import messenger from './msn/emoticons/messenger.png';
import phone from './msn/emoticons/telephone-receiver.png';
import email from './msn/emoticons/e-mail.png';
import camera from './msn/emoticons/camera.png';
import gift from './msn/emoticons/gift-with-a-bow.png';
import lightbulb from './msn/emoticons/light-bulb.png';
import cat from './msn/emoticons/cat-face.png';
import dog from './msn/emoticons/dog-face.png';
import boy from './msn/emoticons/boy.png';
import girl from './msn/emoticons/girl.png';

export interface EmoticonDef {
  readonly code: string;
  readonly name: string;
}

// Canonical code -> [name, image]. Order drives the picker grid.
const canonical: readonly (readonly [string, string, string])[] = [
  [':)', 'Smile', smile],
  [':D', 'Open-mouthed', openMouth],
  [';)', 'Winking', wink],
  [':P', 'Tongue out', tongue],
  [':(', 'Sad', sad],
  [":'(", 'Crying', crying],
  [':-O', 'Surprised', surprised],
  [':$', 'Embarrassed', embarrassed],
  [':S', 'Confused', confused],
  [':@', 'Angry', angry],
  [':|', 'Disappointed', disappointed],
  ['8-)', 'Eye-rolling', eyeRoll],
  ['8-|', 'Nerd', nerd],
  ['(H)', 'Hot', hot],
  ['(A)', 'Angel', angel],
  ['(6)', 'Devil', devil],
  ['+o(', 'Sick', sick],
  ['^o)', 'Sarcastic', sarcastic],
  [':-#', "Don't tell", dontTell],
  ['(8o)', 'Party', party],
  ['(L)', 'Red heart', redHeart],
  ['(U)', 'Broken heart', brokenHeart],
  ['(K)', 'Red lips', redLips],
  ['(F)', 'Red rose', redRose],
  ['(Y)', 'Thumbs up', thumbsUp],
  ['(N)', 'Thumbs down', thumbsDown],
  ['(^)', 'Birthday cake', birthdayCake],
  ['(*)', 'Star', star],
  ['(C)', 'Coffee cup', coffee],
  ['(B)', 'Beer mug', beer],
  ['(D)', 'Martini', martini],
  ['(8)', 'Note', note],
  ['(S)', 'Sleeping moon', moon],
  ['(#)', 'Sun', sun],
  ['(R)', 'Rainbow', rainbow],
  ['(M)', 'Messenger', messenger],
  ['(T)', 'Telephone', phone],
  ['(E)', 'E-mail', email],
  ['(P)', 'Camera', camera],
  ['(G)', 'Gift', gift],
  ['(I)', 'Light bulb', lightbulb],
  ['(@)', 'Cat face', cat],
  ['(&)', 'Dog face', dog],
  ['(Z)', 'Boy', boy],
  ['(X)', 'Girl', girl],
];

export const EMOTICON_LIST: readonly EmoticonDef[] = canonical.map(([code, name]) => ({ code, name }));

const byCode = new Map(canonical.map(([code, , src]) => [code, src]));
const at = (code: string): string => {
  const src = byCode.get(code);
  if (src === undefined) throw new Error(`Unknown canonical emoticon: ${code}`);
  return src;
};

// Extra textual variants that map to the same image as a canonical code.
const variants: Readonly<Record<string, string>> = {
  ':-)': at(':)'),
  ':-D': at(':D'),
  ';-)': at(';)'),
  ':-P': at(':P'),
  ':p': at(':P'),
  ":'-(": at(":'("),
  ':-(': at(':('),
  ':o': at(':-O'),
  ':O': at(':-O'),
  ':s': at(':S'),
  ':-|': at(':|'),
  '8o|': at('8-|'),
  '(h)': at('(H)'),
  '(a)': at('(A)'),
  '(l)': at('(L)'),
  '(u)': at('(U)'),
  '(k)': at('(K)'),
  '(f)': at('(F)'),
  '(y)': at('(Y)'),
  '(n)': at('(N)'),
  '(c)': at('(C)'),
  '(b)': at('(B)'),
  '(d)': at('(D)'),
  '(s)': at('(S)'),
  '(m)': at('(M)'),
  '(t)': at('(T)'),
  '(e)': at('(E)'),
  '(p)': at('(P)'),
  '(g)': at('(G)'),
  '(i)': at('(I)'),
  '(z)': at('(Z)'),
  '(x)': at('(X)'),
  '(r)': at('(R)'),
};

const registry: Readonly<Record<string, string>> = {
  ...Object.fromEntries(canonical.map(([code, , src]) => [code, src])),
  ...variants,
};

export const Emoticon = ({ code, size = 19 }: { code: string; size?: number }): JSX.Element | null => {
  const src = registry[code];
  if (src === undefined) return null;
  return (
    <img
      src={src}
      alt={code}
      width={size}
      height={size}
      style={{ verticalAlign: 'middle', imageRendering: 'auto' }}
      draggable={false}
    />
  );
};

// All known codes, longest first, so e.g. `:'(` matches before `:(`.
const codesByLength: readonly string[] = Object.keys(registry).sort((a, b) => b.length - a.length);

export const RichText = ({ text, size = 19 }: { text: string; size?: number }): JSX.Element => {
  const nodes: JSX.Element[] = [];
  let buffer = '';
  let key = 0;
  const flush = (): void => {
    if (buffer.length > 0) {
      nodes.push(<span key={key++}>{buffer}</span>);
      buffer = '';
    }
  };

  let i = 0;
  while (i < text.length) {
    const match = codesByLength.find((code) => text.startsWith(code, i));
    if (match !== undefined) {
      flush();
      nodes.push(
        <span key={key++} style={{ verticalAlign: 'middle' }}>
          <Emoticon code={match} size={size} />
        </span>,
      );
      i += match.length;
    } else {
      buffer += text.charAt(i);
      i += 1;
    }
  }
  flush();
  return <>{nodes}</>;
};
