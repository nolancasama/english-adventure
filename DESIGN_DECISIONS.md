# Design Decisions

This file records meaningful product, UX, visual, architectural, or behavioral decisions for this project.

For each significant decision, record:

- Date
- What was decided or changed
- Why
- Previous approach, if relevant
- Rejected alternatives, if useful

Only record decisions that may be useful to understand later.

Do NOT record:
- trivial UI adjustments
- routine bug fixes
- formatting changes
- mechanical refactors with no design consequence
- every individual code modification

Git is the source of truth for detailed code-change history.

A useful rule:

> If a future developer or AI could reasonably ask, "Why is it designed this way?", record the answer here.

---

## 2026-10-04 — MVP product decisions (from the initial plan review)

**Product question.** The MVP exists to answer one thing: will a 7-year-old beginner EFL learner (Japanese L1) voluntarily come back to practise short sessions? Fun, momentum and a satisfying loop beat feature count.

**Stack.** Vite + React + TypeScript, `vite-plugin-pwa` for manifest + service worker, localStorage for progress, Vitest for unit tests, Playwright for the full playthrough. No backend, no accounts, no network dependency at runtime (no CDN fonts/images). *Rejected:* vanilla TS (more hand-rolled UI state for several screens); IndexedDB (overkill for a few KB of progress).

**Data-driven content.** The contract is `src/content/types.ts`. Everything learnable is an `Item` (word or phrase) with text, visual, topic and optional pattern. Questions reference items by id. The engine renders by `type`. Sentence-builder tiles are derived from the phrase text, so phrases are authored once. *Rejected:* per-question `audioText`/`answer` strings as in the plan's example — they duplicate content and drift.

**Visuals.** `Visual` union: emoji, colour blob, count-of-emoji (numbers), local image (future art). All rendering goes through one `<ItemVisual>` component so art can be replaced in one place. Choices in a single question must be visually distinct at a glance.

**Non-reader support** (plan modification). The learner is 7 and a beginner, so English text alone cannot be the only cue:
- Picture→Word: a wrong tap gently replays the target word's audio; a correct tap speaks the word.
- Sentence builder: tapping a tile speaks that word; 🔊 replays the full sentence; auto-check when all answer tiles are placed; undo by tapping a placed tile or a ⌫ button.
- After 2 misses on one question, the correct answer is softly highlighted. Mistakes never block.
- Japanese instructions are short hiragana text; tapping the instruction speaks it (ja-JP TTS if available). Japanese is never auto-spoken (it would delay the English audio).

**Feedback.** Correct: chime, small burst, rotating praise (Great! / Nice! / Good job! / すごい！), auto-advance within ~1s. Wrong: soft "boop", wiggle, 「もういちど！」, no red X, no "WRONG".

**Retry and requeue.** A question answered wrong first time is re-queued once at the end of the lesson (at most 2 re-queues per lesson to keep sessions short). Mastery records first-attempt correctness only, for scored types only.

**Review/Boss are generated.** Lesson 9 (Review) and 10 (Boss) use `GenerateSpec`: items drawn from earlier lessons with weight `1 + 3·(1 − accuracy)`, unseen items weight 2; each scored type appears at least once; distractors come from the same topic. Boss: 9 questions, challenge framing (Kiko vs. a friendly "Quiz Monster" health bar that drops with each correct answer — a mini-game feel, not a test).

**Rewards.** First completion: ⭐1, +10 XP, +5 coins (boss: +30 XP, +20 coins, and unlocks the special pet). Replay of a completed lesson: +5 XP, +2 coins, no new star (a reason to come back). Per answer: +2 XP correct first try, +1 XP correct after retry. Treasure-chest milestone after Animals: +10 coins, tapped open on the path.

**Pets.** Cat 🐱 10 coins, Rabbit 🐰 25, Dragon 🐲 40; Unicorn 🦄 is the boss reward. Prices let the first pet arrive around lesson 3–4. The most recently unlocked pet appears on the path beside the current node and cheers at lesson end. No store UI beyond a single "My Pets" screen. *Rejected:* cosmetics/avatar customisation (out of scope).

**Mascot and identity.** Original mascot "Kiko", a round, cheerful orange creature drawn in inline SVG/CSS. Palette: sky teal, sunny yellow, coral, soft cream — deliberately not Duolingo green; no Duolingo-like owl, layout copy, or wording.

**Path.** Vertical winding path of large round nodes: completed (filled + ⭐), current (bouncing, "START" bubble on first run), locked (greyed with 🔒). Auto-scroll to the current node.

**Parent area.** Small ⚙️ in a corner; opens only after a 3-second press-and-hold (おうちのひとへ). Parent view: lessons completed, total XP, learning days, words practised, words to practise (<80% with ≥2 attempts, sorted ascending), patterns to practise. Reset requires two confirmations.

**Leaving a lesson.** ✕ button and the Android/browser back button both ask 「やめる？」 before leaving; partial lesson progress is discarded but answers already given still count toward mastery.

**Audio helper.** `say(item)` plays `/audio/<key>.mp3` if listed in an audio manifest, else Web Speech TTS (en-US, rate ~0.85). SFX are synthesised with WebAudio (no files). Missing TTS must degrade gracefully (text stays visible, no errors).
