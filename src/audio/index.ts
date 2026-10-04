import type { Item } from "../content/types";
import { audioManifest } from "./manifest";

type Speakable = string | Item;
type SayOptions = { lang?: "en-US" | "ja-JP" };
export type SfxName = "correct" | "wrong" | "tap" | "reward" | "unlock";

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  try {
    const Constructor = window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) return null;
    context ??= new Constructor();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

export function unlockAudio(): void {
  audioContext();
}

export function say(value: Speakable, options: SayOptions = {}): void {
  try {
    const item = typeof value === "string" ? undefined : value;
    const text = typeof value === "string" ? value : value.text;
    const key = item?.audio;
    window.speechSynthesis?.cancel();
    if (key && audioManifest.has(key)) {
      const clip = new Audio(`/audio/${key}.mp3`);
      void clip.play().catch(() => undefined);
      return;
    }
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang ?? "en-US";
    utterance.rate = utterance.lang === "ja-JP" ? 0.95 : 0.85;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang === utterance.lang) ??
      voices.find((voice) => voice.lang.startsWith(utterance.lang.slice(0, 2))) ?? null;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Audio is enhancement-only; unsupported browsers remain fully playable.
  }
}

export function playSfx(name: SfxName): void {
  const ctx = audioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const notes: Record<SfxName, Array<[number, number, number]>> = {
      correct: [[523, 0, 0.1], [784, 0.09, 0.14]],
      wrong: [[220, 0, 0.12], [180, 0.1, 0.12]],
      tap: [[440, 0, 0.035]],
      reward: [[523, 0, 0.1], [659, 0.1, 0.1], [880, 0.2, 0.2]],
      unlock: [[392, 0, 0.09], [523, 0.08, 0.1], [659, 0.17, 0.15]],
    };
    for (const [frequency, offset, length] of notes[name]) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = name === "wrong" ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.09, now + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + length);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + length + 0.02);
    }
  } catch {
    // Never let sound prevent play.
  }
}

