import { useEffect, useMemo, useState } from "react";
import { playSfx, say } from "../audio";
import { itemsById } from "../content/items";
import type { ListenPictureQ, PictureWordQ, Question, SentenceBuilderQ, SpeakQ } from "../content/types";
import { Instruction } from "../components/Instruction";
import { ItemVisual } from "../components/ItemVisual";

export interface ActivityProps<Q extends Question = Question> {
  question: Q;
  misses: number;
  disabled: boolean;
  e2e: boolean;
  onAttempt(correct: boolean): void;
  onSpeakDone(): void;
}

function shuffled<T>(values: T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function ListenPicture({ question, misses, disabled, e2e, onAttempt }: ActivityProps<ListenPictureQ>) {
  const target = itemsById[question.target];
  const choices = useMemo(() => shuffled(question.choices), [question]);
  useEffect(() => { say(target); }, [target]);
  return (
    <section className="activity" data-testid="question-type" data-question-type="listen-picture">
      <Instruction>きいて、えをタップしてね！</Instruction>
      <button className="replay-button" aria-label="Listen again" onClick={() => say(target)}>🔊</button>
      <div className="picture-grid">
        {choices.map((id) => {
          const item = itemsById[id];
          return (
            <button key={id} className={`picture-choice ${misses >= 2 && id === question.target ? "hint" : ""}`}
              disabled={disabled} data-testid={e2e ? `choice-${id}` : undefined}
              aria-label={`picture ${choices.indexOf(id) + 1}`} onClick={() => onAttempt(id === question.target)}>
              <ItemVisual visual={item.visual} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PictureWord({ question, misses, disabled, e2e, onAttempt }: ActivityProps<PictureWordQ>) {
  const target = itemsById[question.target];
  const choices = useMemo(() => shuffled(question.choices), [question]);
  return (
    <section className="activity" data-testid="question-type" data-question-type="picture-word">
      <Instruction>えにあうことばをタップしてね！</Instruction>
      <div className="prompt-visual"><ItemVisual visual={target.visual} /></div>
      <div className="word-choices">
        {choices.map((id) => (
          <button key={id} disabled={disabled} data-testid={e2e ? `choice-${id}` : undefined}
            className={misses >= 2 && id === question.target ? "hint" : ""}
            onClick={() => {
              const correct = id === question.target;
              say(target);
              onAttempt(correct);
            }}>{itemsById[id].text}</button>
        ))}
      </div>
    </section>
  );
}

function wordsFor(question: SentenceBuilderQ): string[] {
  return itemsById[question.target].text.replace(/[.?!]$/u, "").split(/\s+/u);
}

function SentenceBuilder({ question, misses, disabled, e2e, onAttempt }: ActivityProps<SentenceBuilderQ>) {
  const target = itemsById[question.target];
  const answer = useMemo(() => wordsFor(question), [question]);
  const tiles = useMemo(() => shuffled([...answer, ...(question.distractors ?? [])]).map((word, id) => ({ word: displayTileWord(word), id })), [answer, question]);
  const [placed, setPlaced] = useState<Array<{ word: string; id: number }>>([]);

  useEffect(() => setPlaced([]), [question]);

  function addTile(tile: { word: string; id: number }) {
    if (disabled) return;
    playSfx("tap");
    say(tile.word);
    const next = [...placed, tile];
    setPlaced(next);
    if (next.length === answer.length) {
      const correct = next.every((entry, index) => entry.word === displayTileWord(answer[index]));
      onAttempt(correct);
      if (!correct) window.setTimeout(() => setPlaced([]), e2e ? 0 : 420);
    }
  }

  function removeAt(index: number) {
    if (!disabled) setPlaced((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  const used = new Set(placed.map((tile) => tile.id));
  return (
    <section className="activity" data-testid="question-type" data-question-type="sentence-builder">
      <Instruction>ことばをならべよう！</Instruction>
      <div className="builder-prompt">
        <ItemVisual visual={target.visual} small />
        <button className="round-audio" aria-label="Listen again" onClick={() => say(target)}>🔊</button>
      </div>
      <div className={`sentence-slots ${misses ? "retrying" : ""}`}>
        {disabled ? <p className="sentence-success">{target.text}</p> : <>
          {placed.length === 0 && <span className="slot-placeholder">…</span>}
          {placed.map((tile, index) => <button key={`${tile.id}-${index}`} data-testid={e2e ? "placed-tile" : undefined} onClick={() => removeAt(index)}>{tile.word}</button>)}
        </>}
      </div>
      <div className="tile-bank">
        {tiles.map((tile, index) => <button key={tile.id} disabled={used.has(tile.id) || disabled}
          data-testid={e2e ? `tile-${index}` : undefined}
          data-word={e2e ? tile.word : undefined}
          className={misses >= 2 && displayTileWord(answer[placed.length] ?? "") === tile.word ? "hint" : ""}
          onClick={() => addTile(tile)}>{tile.word}</button>)}
        <button className="undo" data-testid={e2e ? "sentence-undo" : undefined} disabled={!placed.length || disabled}
          aria-label="Undo" onClick={() => setPlaced((current) => current.slice(0, -1))}>⌫</button>
      </div>
    </section>
  );
}

export function displayTileWord(word: string): string {
  return /^(I|Kiko)$/u.test(word) ? word : word.toLocaleLowerCase("en-US");
}

function Speak({ question, e2e, onSpeakDone }: ActivityProps<SpeakQ>) {
  const target = itemsById[question.target];
  const [stage, setStage] = useState<"ready" | "listening" | "done">("ready");
  useEffect(() => { say(target); setStage("ready"); }, [target]);
  function pretendListen() {
    setStage("listening");
    window.setTimeout(() => setStage("done"), e2e ? 10 : 2000);
  }
  return (
    <section className="activity speak-activity" data-testid="question-type" data-question-type="speak">
      <Instruction>いってみよう！</Instruction>
      <div className="prompt-visual"><ItemVisual visual={target.visual} /></div>
      <p className="speak-target">{target.text}</p>
      <button className="speak-action" data-testid={e2e ? "speak-listen" : undefined} onClick={() => say(target)}>🔊 Listen again</button>
      {stage === "ready" && <button className="speak-action primary" data-testid={e2e ? "speak-say" : undefined} onClick={pretendListen}>🎤 Say it!</button>}
      {stage === "listening" && <div className="listening-dots" aria-label="listening"><i /><i /><i /></div>}
      {stage === "done" && <button className="speak-action success" data-testid={e2e ? "speak-done" : undefined} onClick={onSpeakDone}>できた！</button>}
    </section>
  );
}

export const activityRegistry = {
  "listen-picture": ListenPicture,
  "picture-word": PictureWord,
  "sentence-builder": SentenceBuilder,
  speak: Speak,
} satisfies Record<Question["type"], React.ComponentType<ActivityProps<any>>>;
