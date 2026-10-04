// Content contract for My English Adventure.
// Lessons are pure data. The activity engine renders questions by `type`.
// Adding a lesson should only require adding data, never a new screen.

/** How an item is pictured. Swap emoji for custom art later via `image`. */
export type Visual =
  | { kind: "emoji"; value: string }                 // one or more emoji, e.g. "🐶" or "👋🙂"
  | { kind: "color"; value: string }                 // CSS colour, rendered as a friendly paint blob
  | { kind: "count"; n: number; emoji: string }      // n copies of an emoji, e.g. 3 x "🐱"
  | { kind: "image"; src: string; alt: string };     // local asset under /public, for future art

export type Topic =
  | "greetings" | "colors" | "animals" | "numbers" | "food" | "likes" | "family";

/** Sentence patterns tracked for mastery, e.g. "I like ___." */
export interface Pattern {
  id: string;        // "i-like"
  frame: string;     // "I like ___."
}

/**
 * A learnable item: a word ("dog") or a phrase ("I like dogs.").
 * Every item has English text (displayed and spoken), a visual, and a topic.
 */
export interface Item {
  id: string;            // stable key, kebab-case: "dog", "i-like-dogs"
  text: string;          // English exactly as displayed/spoken, with final punctuation for phrases
  visual: Visual;
  topic: Topic;
  pattern?: string;      // Pattern.id when the item is an instance of a tracked pattern
  ja?: string;           // short Japanese gloss, shown only in the parent view
  audio?: string;        // optional recorded-audio key; the audio helper falls back to TTS of `text`
  /**
   * true when no picture can honestly show the meaning (e.g. "What's your name?").
   * Abstract items are never the target or a choice of listen-picture / picture-word;
   * they appear only in sentence-builder and speak, where audio carries the meaning.
   */
  abstract?: boolean;
}

export type QuestionType = "listen-picture" | "picture-word" | "sentence-builder" | "speak";

/** Scored question types. "speak" is unscored and never affects mastery. */
export const SCORED_TYPES: QuestionType[] = ["listen-picture", "picture-word", "sentence-builder"];

/** Hear target audio, tap the matching picture. `choices` includes `target`; order is shuffled at runtime. */
export interface ListenPictureQ { type: "listen-picture"; target: string; choices: string[] }

/** See target picture, tap the matching English text. `choices` includes `target`; shuffled at runtime. */
export interface PictureWordQ { type: "picture-word"; target: string; choices: string[] }

/**
 * Build the target phrase from tiles by tapping.
 * Tiles = target.text split on spaces with trailing . ? ! removed (punctuation is re-added on success).
 * `distractors` are extra tiles that are not part of the answer (optional, keep to 0–1 for beginners).
 */
export interface SentenceBuilderQ { type: "sentence-builder"; target: string; distractors?: string[] }

/** Unscored repeat-after-me. Child listens, says it aloud, taps できた！ */
export interface SpeakQ { type: "speak"; target: string }

export type Question = ListenPictureQ | PictureWordQ | SentenceBuilderQ | SpeakQ;

/** Generated question set for review/boss lessons, weighted toward missed and unseen items. */
export interface GenerateSpec {
  fromLessons: string[];        // lesson ids whose items form the pool
  count: number;                // number of questions to generate
  types: QuestionType[];        // allowed types; generator must include each scored type at least once
}

export interface Reward { xp: number; coins: number; stars: number }

export interface Lesson {
  id: string;                   // "hello", "colors", ...
  title: string;                // English title shown on the path: "Hello!"
  titleJa?: string;             // optional Japanese subtitle
  icon: string;                 // emoji shown on the path node
  kind: "normal" | "review" | "boss";
  items: string[];              // item ids this lesson introduces/uses (for review pools + parent view)
  questions?: Question[];       // authored questions (normal lessons; boss may mix authored + generated)
  generate?: GenerateSpec;      // generated questions (review/boss)
  reward: Reward;               // first-completion reward
}

/** Non-lesson node on the path (e.g. the treasure chest after Animals). */
export interface Milestone {
  id: string;
  afterLesson: string;          // lesson id that must be completed to open it
  icon: string;
  reward: { coins: number };
}

export interface Pet {
  id: string;
  name: string;                 // English name, e.g. "Cat"
  visual: Visual;
  cost: number;                 // coins; 0 with `unlockedBy` for special rewards
  unlockedBy?: string;          // lesson id that grants it for free (boss reward)
}

export interface World {
  id: string;
  title: string;                // "My English Adventure"
  lessons: Lesson[];            // in path order
  milestones: Milestone[];
}
