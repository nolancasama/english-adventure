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

## 2026-10-04 — Generated review length and test surface

**Review length.** The generated Review uses eight questions: one short challenge per preceding normal lesson. This keeps the recap broader than a normal 5–7 activity lesson without approaching the nine-question Boss finale.

**Acceptance surface.** When and only when the URL includes `?e2e=1`, the app exposes frozen, read-only helpers for the current lesson id, question type, answer item id, and sentence tile order. The normal DOM does not identify correct answers. This lets the full-playthrough harness follow generated content deterministically without exposing answers in ordinary play.

## 2026-10-04 — Visual review corrections (after the first build)

**Abstract items.** `Item.abstract` marks phrases no picture can honestly show (What's your name?, How are you?). They never appear in picture-based questions; they're taught through sentence-builder and speak, where audio carries the meaning. *Why:* the first build pictured them as ❓🙂🏷️ / ❓🙂💭 — near-identical, unguessable, and a 7-year-old would be guessing, not learning.

**Visuals must fit and read at a glance.** At most 2 emoji per visual, laid out in a single row and scaled to fit its card; count visuals in rows of ≤5. *Why:* multi-emoji visuals wrapped vertically and overflowed their cards at 320px.

**Emoji compatibility.** Only emoji from Unicode Emoji ≤ 12.0 in content and UI, so they render on Windows 10, older Android and ChromeOS. Coins use an inline SVG coin, not 🪙 (rendered as a missing glyph on Windows).

**Bigger targets.** Picture choices, word buttons and tiles are sized from the available screen space, not fixed small boxes; Japanese instructions ≥ 18px.

## 2026-10-04 — Deterministic visual-review surface

**Screenshot mode.** `?e2e=1` removes decorative motion and skips lesson title cards so the semantic playthrough cannot race an auto-advance. The narrower `?e2e=1&shots=1` variant instead holds each title card until tapped, allowing the separate screenshot suite to capture it deterministically. Both modes retain the same lesson, reward, persistence, and navigation behavior as the normal app.

## 2026-10-04 — Second visual correction pass

**Responsive picture visuals.** Choice and hero visuals size from their container so emoji pairs, paint blobs, and count rows remain legible at 320px while scaling up on larger screens. Generated picture choices also preserve the target's word-versus-punctuated-phrase shape; impossible same-topic shapes are excluded from target selection.

**Readable route and tiles.** The home route is a continuous SVG road through node centres, and sentence-builder distractors are lowercased except for legitimate names/pronouns so casing cannot disclose the answer.

## 2026-10-04 — Controller review fixes (final MVP pass)

**Phones stack picture choices.** Below 480px wide, listen-picture choices are three full-width cards (aspect ≈2.8:1) stacked vertically; 480px and up they stay 3 square cards across. *Why:* three squares at 320px are ~85px each, which made two-emoji pictures ~22px — too small for a 7-year-old. Stacked cards give larger pictures and bigger tap targets in space that was empty. Emoji size by glyph count (`--glyphs`) so one emoji fills the card and two fit side by side.

**Road measured, not hand-drawn.** The home road is computed from the lesson nodes' measured centres (ResizeObserver), so it passes through every node at any width. *Rejected:* fixed percentage SVG coordinates — they only lined up at one width and drifted off the nodes on tablets.

**Lowercase tiles everywhere.** All sentence-builder tiles display lowercase except "I" and "Kiko"; the success state shows the properly capitalised sentence. Answer checking, the 2-miss hint and the e2e hook all compare against the displayed form. (A first version lowercased the display but compared against the original casing, making sentences that start with a capital unanswerable — caught by the playthrough.)

**PNG icons for install.** Manifest lists PNG 192/512/maskable (rendered from the SVG originals) ahead of SVG, plus an apple-touch-icon, because Android install is most reliable with raster icons.
