import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { playSfx, unlockAudio } from "./audio";
import { ItemVisual } from "./components/ItemVisual";
import { Coin } from "./components/Coin";
import { Kiko } from "./components/Kiko";
import { Icon } from "./components/Icon";
import { QuizMonster, QuizMonsterEncounter } from "./components/QuizMonster";
import { generateQuestions } from "./content/generate";
import { itemsById } from "./content/items";
import { world } from "./content/lessons";
import { patternsById } from "./content/patterns";
import { pets } from "./content/pets";
import type { Lesson, Question } from "./content/types";
import { activityRegistry, displayTileWord } from "./engine/activities";
import {
  completeLesson,
  createFreshProgress,
  loadProgress,
  masteryAccuracy,
  openMilestone,
  purchasePet,
  recordFirstAttempt,
  resetProgress,
  rewardCorrectAnswer,
  saveProgress,
  type ProgressState,
} from "./state";

type Screen = "home" | "pets" | "parent";
type Feedback = "correct" | "wrong" | null;

declare global {
  interface Window {
    __mea?: Readonly<{
      currentQuestionType(): Question["type"] | null;
      correctAnswerIds(): string[];
      tileOrder(): string[];
      currentLessonId(): string | null;
    }>;
  }
}

const praises = ["Great!", "Nice!", "Good job!", "すごい！"];

const topicClass: Readonly<Record<string, string>> = {
  hello: "greetings",
  colors: "colors",
  animals: "animals",
  numbers: "numbers",
  food: "food",
  "i-like": "likes",
  "do-you-like": "likes",
  family: "family",
  review: "review",
  boss: "boss",
};

function Confetti({ count = 36 }: { count?: number }) {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: Math.min(count, 60) }, (_, index) => (
        <i
          key={index}
          style={{
            "--i": index,
            "--x": `${(index * 37) % 100}%`,
            "--delay": `${(index % 9) * -0.08}s`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

function RewardCount({ value, prefix = "", suffix = "", immediate }: {
  value: number;
  prefix?: string;
  suffix?: string;
  immediate: boolean;
}) {
  const [shown, setShown] = useState(immediate ? value : 0);
  useEffect(() => {
    if (immediate) { setShown(value); return; }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 650);
      setShown(Math.round(value * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [immediate, value]);
  return <>{prefix}{shown}{suffix}</>;
}

function questionTiles(question: Question | undefined): string[] {
  if (!question || question.type !== "sentence-builder") return [];
  return itemsById[question.target].text.replace(/[.?!]$/u, "").split(/\s+/u).map(displayTileWord);
}

function Header({ progress }: { progress: ProgressState }) {
  return (
    <header className="status-header" aria-label="Rewards">
      <span data-testid="stat-stars"><Icon name="star" size={20} /> {progress.stars}</span>
      <span data-testid="stat-xp">XP {progress.xp}</span>
      <span data-testid="stat-coins"><Coin size={18} /> {progress.coins}</span>
    </header>
  );
}

function HomeScreen({ progress, e2e, onLesson, onPets, onParent, onChest }: {
  progress: ProgressState;
  e2e: boolean;
  onLesson(lesson: Lesson): void;
  onPets(): void;
  onParent(): void;
  onChest(): void;
}) {
  const firstIncomplete = world.lessons.findIndex((lesson) => !progress.completedLessons.includes(lesson.id));
  const currentIndex = firstIncomplete === -1 ? world.lessons.length - 1 : firstIncomplete;
  const currentRef = useRef<HTMLButtonElement>(null);
  const [lockedWiggle, setLockedWiggle] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const latestPet = [...progress.unlockedPets]
    .reverse()
    .map((id) => pets.find((pet) => pet.id === id))
    .find(Boolean);
  const milestone = world.milestones[0];
  const chestEligible = progress.completedLessons.includes(milestone.afterLesson);
  const chestOpen = progress.openedMilestones.includes(milestone.id);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentIndex]);

  // The road is drawn through the nodes' measured centres so it fits any screen width.
  const pathRef = useRef<HTMLDivElement>(null);
  const [road, setRoad] = useState("");
  useLayoutEffect(() => {
    const container = pathRef.current;
    if (!container) return;
    const measure = () => {
      const box = container.getBoundingClientRect();
      const points = [...container.querySelectorAll<HTMLElement>(".road-anchor")].map((node) => {
        const rect = node.getBoundingClientRect();
        return { x: rect.left - box.left + rect.width / 2, y: rect.top - box.top + rect.height / 2 };
      });
      setRoad(points.map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const previous = points[index - 1];
        const midY = (previous.y + point.y) / 2;
        return `C ${previous.x} ${midY} ${point.x} ${midY} ${point.x} ${point.y}`;
      }).join(" "));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  function beginHold() {
    setHolding(true);
    holdTimer.current = window.setTimeout(() => {
      setHolding(false);
      playSfx("unlock");
      onParent();
    }, 3000);
  }
  function cancelHold() {
    setHolding(false);
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
  }

  return (
    <main className="screen home-screen" data-testid="screen-home">
      <div className="world-scenery" aria-hidden="true">
        <span className="cloud cloud--one" />
        <span className="cloud cloud--two" />
        <span className="cloud cloud--three" />
        <span className="hill hill--far" /><span className="hill hill--near" />
      </div>
      <Header progress={progress} />
      <div className="home-title">
        <Kiko mood="idle" />
        <div>
          <span className="eyebrow">Kiko's</span>
          <h1>My English<br />Adventure</h1>
          <p>えいごの ぼうけん</p>
        </div>
      </div>
      <button
        className={`parent-gate ${holding ? "holding" : ""}`}
        data-testid="parent-gate"
        aria-label="おうちのひとへ 3秒長押し"
        onPointerDown={beginHold}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onPointerLeave={cancelHold}
      >
        <Icon name="gear" />
      </button>
      <div className="path" aria-label="Lesson path" ref={pathRef}>
        <svg className="path-line" aria-hidden="true">
          {road && <>
            <path className="road-edge" d={road} />
            <path className="road-sand" d={road} />
            <path className="road-dash" d={road} />
          </>}
        </svg>
        {world.lessons.map((lesson, index) => {
          const complete = progress.completedLessons.includes(lesson.id);
          const unlocked = index === 0 || progress.completedLessons.includes(world.lessons[index - 1].id);
          const current = index === currentIndex;
          const insertMilestone = lesson.id === milestone.afterLesson;
          return <Fragment key={lesson.id}>
            <div className={`path-row path-row--${index % 3}`} key={lesson.id}>
              <button
                ref={current ? currentRef : undefined}
                data-testid={`lesson-node-${lesson.id}`}
                data-state={complete ? "completed" : unlocked ? "unlocked" : "locked"}
                className={[
                  "lesson-node road-anchor",
                  `topic-${topicClass[lesson.id]}`,
                  complete ? "complete" : current && unlocked ? "current" : "locked",
                  lockedWiggle === lesson.id ? "wiggle" : "",
                ].join(" ")}
                aria-label={`${lesson.title} ${complete ? "complete" : unlocked ? "unlocked" : "locked"}`}
                onClick={() => {
                  if (unlocked) onLesson(lesson);
                  else {
                    setLockedWiggle(lesson.id);
                    playSfx("wrong");
                    window.setTimeout(() => setLockedWiggle(null), 450);
                  }
                }}
              >
                {complete
                  ? <span className="node-star"><Icon name="star" size={37} /></span>
                  : unlocked
                    ? <ItemVisual visual={{ kind: "emoji", value: lesson.icon }} small />
                    : <Icon name="lock" size={31} />}
              </button>
              <div className="node-label">
                <span className="label-pin" aria-hidden="true" />
                <strong>{lesson.title}</strong>
                {lesson.titleJa && <small>{lesson.titleJa}</small>}
              </div>
              {current && unlocked && progress.completedLessons.length === 0 && (
                <span className="start-bubble" data-testid="start-bubble">START!<i /></span>
              )}
              {current && latestPet && (
                <span className="path-pet" aria-label={latestPet.name}>
                  <ItemVisual visual={latestPet.visual} small />
                </span>
              )}
            </div>
            {insertMilestone && (
              <div className="path-row milestone-row">
                <button
                  className={`chest-node road-anchor ${chestOpen ? "opened" : chestEligible ? "ready" : "locked"}`}
                  data-state={chestOpen ? "opened" : chestEligible ? "ready" : "locked"}
                  data-testid="milestone-chest"
                  disabled={!chestEligible || chestOpen}
                  onClick={onChest}
                  aria-label={chestOpen ? "Treasure opened" : chestEligible ? "Open treasure" : "Treasure locked"}
                >
                  <Icon name={chestOpen || chestEligible ? "chest" : "lock"} size={42} />
                  <small>{chestOpen ? "OPEN!" : <><span>+10</span> <Coin size={16} /></>}</small>
                </button>
                <div className="node-label milestone-label">
                  <strong>Treasure!</strong>
                  <small>ごほうび</small>
                </div>
              </div>
            )}
          </Fragment>;
        })}
      </div>
      <div className="home-dock">
        <button className="pets-button" data-testid="pets-button" onClick={onPets}>
          <Icon name="paw" /> My Pets
        </button>
      </div>
    </main>
  );
}

function PetsScreen({ progress, e2e, onBack, onBuy }: {
  progress: ProgressState;
  e2e: boolean;
  onBack(): void;
  onBuy(id: string): void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const selected = pets.find((pet) => pet.id === confirmId);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, []);
  return (
    <main className="screen sub-screen" data-testid="screen-pets">
      <div className="pets-scenery" aria-hidden="true"><span /><span /></div>
      <Header progress={progress} />
      <div className="screen-heading">
        <button className="back" data-testid="pets-back" onClick={onBack} aria-label="Back">
          <Icon name="back" />
        </button>
        <div>
          <h1><Icon name="paw" /> My Pets</h1>
          <p>なかまたち</p>
        </div>
      </div>
      <div className="pet-grid">
        {pets.map((pet) => {
          const owned = progress.unlockedPets.includes(pet.id);
          const rewardOnly = Boolean(pet.unlockedBy) && !owned;
          const affordable = progress.coins >= pet.cost;
          return (
            <button
              key={pet.id}
              data-testid={`pet-${pet.id}`}
              className={`pet-card ${owned ? "owned" : affordable && !rewardOnly ? "affordable" : "unavailable"}`}
              data-unlocked={owned ? "true" : "false"}
              disabled={owned || rewardOnly || !affordable}
              onClick={() => setConfirmId(pet.id)}
            >
              <span className="pet-spotlight" aria-hidden="true" />
              <span className="pet-art"><ItemVisual visual={pet.visual} /></span>
              <span className="pet-pedestal" aria-hidden="true" />
              <strong>{pet.name}</strong>
              {owned
                ? <span className="owned-ribbon"><Icon name="check" size={18} /> MY PET</span>
                : rewardOnly
                  ? <span className="pet-price"><Icon name="lock" size={17} /> BOSS</span>
                  : affordable
                    ? <span className="pet-price"><Coin /> {pet.cost}</span>
                    : (
                      <span className="pet-price">
                        <Coin /> {pet.cost} <small>あと {pet.cost - progress.coins}</small>
                      </span>
                    )}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="modal-backdrop">
          <div className="modal pet-confirm">
            <span className="modal-sparkles" aria-hidden="true" />
            <div className="confirm-pet-art"><ItemVisual visual={selected.visual} /></div>
            <h2>{selected.name}?</h2>
            <button
              className="primary-button"
              data-testid="pet-confirm"
              onClick={() => {
                onBuy(selected.id);
                setConfirmId(null);
              }}
            >
              <Coin /> {selected.cost} — OK!
            </button>
            <button onClick={() => setConfirmId(null)}>もどる</button>
          </div>
        </div>
      )}
    </main>
  );
}

function ParentScreen({ progress, onBack, onReset }: {
  progress: ProgressState;
  onBack(): void;
  onReset(): void;
}) {
  const [resetStep, setResetStep] = useState(0);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, []);
  const weakItems = Object.entries(progress.itemMastery)
    .filter(([, record]) => record.attempts >= 2 && record.correct / record.attempts < 0.8)
    .sort((a, b) => a[1].correct / a[1].attempts - b[1].correct / b[1].attempts);
  const weakPatterns = Object.entries(progress.patternMastery)
    .filter(([, record]) => record.attempts >= 2 && record.correct / record.attempts < 0.8)
    .sort((a, b) => a[1].correct / a[1].attempts - b[1].correct / b[1].attempts);
  const percentage = (correct: number, attempts: number) => `${Math.round(correct / attempts * 100)}%`;
  return (
    <main className="screen parent-screen" data-testid="screen-parent">
      <div className="screen-heading">
        <button className="back" data-testid="parent-back" onClick={onBack} aria-label="Back">
          <Icon name="back" />
        </button>
        <div><h1>おうちのひとへ</h1><p>Parent view</p></div>
      </div>
      <section className="parent-stats">
        <div data-testid="parent-lessons-completed">
          <strong>{progress.completedLessons.length}/10</strong>
          <span>レッスン / Lessons</span>
        </div>
        <div data-testid="parent-total-xp"><strong>{progress.xp}</strong><span>XP</span></div>
        <div data-testid="parent-learning-days">
          <strong>{progress.learningDays.length}</strong>
          <span>学習日 / Learning days</span>
        </div>
        <div data-testid="parent-words-practised">
          <strong>{Object.keys(progress.itemMastery).length}</strong>
          <span>練習したことば / Words practised</span>
        </div>
      </section>
      <section className="practice-list">
        <h2>Words to practise <small>練習することば</small></h2>
        {weakItems.length
          ? weakItems.map(([id, record]) => (
            <p key={id}>
              <span>{itemsById[id]?.text ?? id}</span>
              <strong>{percentage(record.correct, record.attempts)}</strong>
            </p>
          ))
          : <p className="empty-list">まだありません / Nothing yet</p>}
      </section>
      <section className="practice-list">
        <h2>Patterns to practise <small>練習する文</small></h2>
        {weakPatterns.length
          ? weakPatterns.map(([id, record]) => (
            <p key={id}>
              <span>{patternsById[id]?.frame ?? id}</span>
              <strong>{percentage(record.correct, record.attempts)}</strong>
            </p>
          ))
          : <p className="empty-list">まだありません / Nothing yet</p>}
      </section>
      <div className="reset-zone">
        {resetStep === 0 && (
          <button className="danger-outline" data-testid="parent-reset" onClick={() => setResetStep(1)}>
            Reset progress
          </button>
        )}
        {resetStep === 1 && <>
          <p>本当にリセットしますか？<br />Reset all progress?</p>
          <button className="danger-outline" data-testid="reset-confirm-1" onClick={() => setResetStep(2)}>
            はい、つぎへ / Continue
          </button>
          <button onClick={() => setResetStep(0)}>Cancel</button>
        </>}
        {resetStep === 2 && <>
          <p>元にもどせません。Are you sure?</p>
          <button className="danger" data-testid="reset-confirm-2" onClick={onReset}>
            すべてリセット / Reset
          </button>
          <button onClick={() => setResetStep(0)}>Cancel</button>
        </>}
      </div>
    </main>
  );
}

function LessonScreen({ lesson, progress, e2e, shots, onProgress, onExit, onComplete, exposeQuestion }: {
  lesson: Lesson;
  progress: ProgressState;
  e2e: boolean;
  shots: boolean;
  onProgress(updater: (state: ProgressState) => ProgressState): void;
  onExit(): void;
  onComplete(result: ReturnType<typeof completeLesson>): void;
  exposeQuestion(question: Question | undefined): void;
}) {
  const initialQuestions = useMemo(() => lesson.generate
    ? generateQuestions(lesson.generate, { mastery: progress.itemMastery, seed: `${lesson.id}-${progress.xp}` })
    : lesson.questions ?? [], [lesson, progress.itemMastery, progress.xp]);
  const [queue, setQueue] = useState<Question[]>(initialQuestions);
  const [index, setIndex] = useState(0);
  const [misses, setMisses] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [praise, setPraise] = useState(praises[0]);
  const [stage, setStage] = useState<"title" | "questions" | "celebration">(e2e && !shots ? "questions" : "title");
  const [requeues, setRequeues] = useState(0);
  const [bossHits, setBossHits] = useState(0);
  const [completion, setCompletion] = useState<ReturnType<typeof completeLesson> | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const question = queue[index];
  const firstResponse = useRef(true);
  const advanceTimer = useRef<number | undefined>(undefined);
  const requeuedQuestions = useRef(new Set<Question>());
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    if (shots) return;
    const timer = window.setTimeout(() => setStage((current) => (current === "title" ? "questions" : current)), 1500);
    return () => window.clearTimeout(timer);
  }, [shots]);
  useEffect(() => {
    exposeQuestion(stage === "questions" ? question : undefined);
    firstResponse.current = true;
    setMisses(0);
    setFeedback(null);
  }, [question, stage, exposeQuestion]);
  useEffect(() => {
    history.pushState({ lesson: lesson.id }, "");
    const handleBack = () => { setLeaveOpen(true); history.pushState({ lesson: lesson.id }, ""); };
    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, [lesson.id]);

  function finish() {
    const result = completeLesson(progressRef.current, lesson.id, { kind: lesson.kind });
    setCompletion(result);
    onProgress(() => result.state);
    playSfx("reward");
    setStage("celebration");
    exposeQuestion(undefined);
  }
  function next() {
    if (index + 1 >= queue.length) finish();
    else setIndex((value) => value + 1);
  }
  function handleAttempt(correct: boolean) {
    if (!question || feedback === "correct") return;
    if (firstResponse.current && question.type !== "speak") {
      const item = itemsById[question.target];
      onProgress((state) => recordFirstAttempt(state, { itemId: item.id, patternId: item.pattern, correct }));
      firstResponse.current = false;
      if (!correct && requeues < 2 && !requeuedQuestions.current.has(question)) {
        requeuedQuestions.current.add(question);
        setQueue((current) => [...current, question]);
        setRequeues((value) => value + 1);
      }
    }
    if (!correct) {
      playSfx("wrong");
      setMisses((value) => value + 1);
      setFeedback("wrong");
      window.setTimeout(() => setFeedback(null), e2e ? 180 : 650);
      return;
    }
    const firstTry = misses === 0;
    onProgress((state) => rewardCorrectAnswer(state, firstTry));
    if (lesson.kind === "boss") setBossHits((value) => value + 1);
    setPraise(praises[(index + misses) % praises.length]);
    setFeedback("correct");
    playSfx("correct");
    advanceTimer.current = window.setTimeout(next, e2e ? 15 : 900);
  }
  function speakDone() { next(); }
  function requestExit() { setLeaveOpen(true); }

  const lessonNumber = world.lessons.findIndex((entry) => entry.id === lesson.id) + 1;
  const lessonVisual = itemsById[lesson.items[0]]?.visual ?? { kind: "emoji" as const, value: lesson.icon };
  const currentPet = [...progress.unlockedPets]
    .reverse()
    .map((id) => pets.find((pet) => pet.id === id))
    .find(Boolean);
  const palette = topicClass[lesson.id] ?? "greetings";

  if (stage === "title") return (
    <main
      className={`screen lesson-screen title-card topic-${palette} ${lesson.kind === "boss" ? "boss-title" : ""}`}
      data-testid="lesson-title-card"
      onClick={() => setStage((current) => (current === "title" ? "questions" : current))}
    >
      <div className="sunburst" aria-hidden="true" />
      <span className="lesson-ribbon">Lesson {lessonNumber}</span>
      <div className="title-character">
        {lesson.kind === "boss"
          ? <><Kiko mood="encourage" /><QuizMonster state="idle" /></>
          : <><Kiko mood="happy" /><ItemVisual visual={lessonVisual} /></>}
      </div>
      <h1>{lesson.title}</h1>
      {lesson.titleJa && <p>{lesson.titleJa}</p>}
      <small>タップでスタート</small>
    </main>
  );

  if (stage === "celebration" && completion) return (
    <main
      className={`screen celebration topic-${palette} ${lesson.kind === "boss" ? "boss-celebration" : ""}`}
      data-testid="lesson-celebration"
    >
      <div className="sunburst" aria-hidden="true" />
      <Confetti count={lesson.kind === "boss" ? 54 : 38} />
      <div className="big-star"><Icon name="star" size={112} /></div>
      <h1>{lesson.kind === "boss" ? "World Complete!" : "Great job!"}</h1>
      <div className="celebration-party">
        <Kiko mood="cheer" />
        {currentPet && <ItemVisual visual={currentPet.visual} />}
        {lesson.kind === "boss" && <QuizMonster state="defeated" />}
      </div>
      <div className="reward-row">
        <span>
          <RewardCount immediate={e2e} value={completion.reward.xp} prefix="+" suffix=" XP" />
        </span>
        <span>
          <RewardCount immediate={e2e} value={completion.reward.coins} prefix="+" /> <Coin />
        </span>
        {completion.reward.stars > 0 && (
          <span>
            <RewardCount immediate={e2e} value={1} prefix="+" /> <Icon name="star" size={20} />
          </span>
        )}
      </div>
      {lesson.kind === "boss" && completion.firstCompletion && (
        <p className="unicorn-reward">
          <ItemVisual visual={{ kind: "emoji", value: "🦄" }} small /> Unicorn unlocked!
        </p>
      )}
      <button
        className="primary-button continue-button"
        data-testid="celebration-continue"
        onClick={() => onComplete(completion)}
      >
        Pathへ <Icon name="back" className="forward-icon" />
      </button>
    </main>
  );

  if (!question) return null;
  const Activity = activityRegistry[question.type] as React.ComponentType<any>;
  const progressPercent = ((index + (feedback === "correct" ? 1 : 0)) / queue.length) * 100;
  const bossTotal = lesson.generate?.count ?? initialQuestions.length;
  return (
    <main
      className={`screen lesson-screen topic-${palette} ${feedback === "wrong" ? "wiggle" : ""}`}
      data-testid="screen-lesson"
    >
      <div className="lesson-backdrop" aria-hidden="true"><i /><i /><i /></div>
      <div className="lesson-top">
        <button className="lesson-exit" data-testid="lesson-exit" onClick={requestExit} aria-label="Exit lesson">
          <Icon name="close" />
        </button>
        <div
          className="progress-track"
          data-testid="lesson-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPercent)}
        >
          <i style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
      {lesson.kind === "boss" && (
        <QuizMonsterEncounter
          total={bossTotal}
          hits={bossHits}
          state={feedback === "correct" ? "hit" : "idle"}
          label="Quiz Monster"
          className="boss-encounter"
        />
      )}
      <div className="question-card" key={`${index}-${queue.length}`}>
        <Activity
          question={question}
          misses={misses}
          disabled={feedback === "correct"}
          e2e={e2e}
          onAttempt={handleAttempt}
          onSpeakDone={speakDone}
        />
      </div>
      {feedback === "wrong" && (
        <div className="feedback wrong" data-testid="feedback-wrong">
          <Kiko mood="encourage" /><span>もういちど！</span>
        </div>
      )}
      {feedback === "correct" && (
        <div className="feedback correct">
          <div className="feedback-particles" aria-hidden="true">
            {Array.from({ length: 10 }, (_, particle) => <i key={particle} />)}
          </div>
          <Kiko mood="happy" /><span>{praise}</span>
        </div>
      )}
      {leaveOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>やめる？</h2>
            <button className="danger-outline" onClick={onExit}>はい</button>
            <button className="primary-button" onClick={() => setLeaveOpen(false)}>つづける</button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function App() {
  const search = new URLSearchParams(location.search);
  const e2e = search.get("e2e") === "1";
  const shots = e2e && search.get("shots") === "1";
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>("home");
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | undefined>();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { saveProgress(progress); }, [progress]);
  useEffect(() => {
    document.documentElement.classList.toggle("e2e", e2e);
    return () => document.documentElement.classList.remove("e2e");
  }, [e2e]);
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);
  useEffect(() => {
    if (!e2e) {
      delete window.__mea;
      return;
    }
    window.__mea = Object.freeze({
      currentQuestionType: () => currentQuestion?.type ?? null,
      correctAnswerIds: () => (
        currentQuestion && currentQuestion.type !== "speak" ? [currentQuestion.target] : []
      ),
      tileOrder: () => questionTiles(currentQuestion),
      currentLessonId: () => activeLesson?.id ?? null,
    });
    return () => {
      delete window.__mea;
    };
  }, [activeLesson, currentQuestion, e2e]);

  function updateProgress(updater: (state: ProgressState) => ProgressState) {
    setProgress((state) => updater(state));
  }
  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), e2e ? 20 : 1500);
  }
  function buyPet(id: string) {
    const pet = pets.find((entry) => entry.id === id);
    if (!pet) return;
    const result = purchasePet(progress, pet);
    if (result.purchased) {
      setProgress(result.state);
      playSfx("unlock");
      showToast(`${pet.name}!`);
    }
  }
  function openChest() {
    const milestone = world.milestones[0];
    const result = openMilestone(progress, milestone.id, milestone.reward.coins);
    if (result.opened) {
      setProgress(result.state);
      playSfx("reward");
      showToast("+10 coins");
    }
  }

  if (activeLesson) {
    return (
      <LessonScreen
        lesson={activeLesson}
        progress={progress}
        e2e={e2e}
        shots={shots}
        onProgress={updateProgress}
        onExit={() => {
          setActiveLesson(null);
          setCurrentQuestion(undefined);
        }}
        exposeQuestion={setCurrentQuestion}
        onComplete={() => {
          setActiveLesson(null);
          setCurrentQuestion(undefined);
          setScreen("home");
        }}
      />
    );
  }

  return (
    <>
      {screen === "home" && (
        <HomeScreen
          progress={progress}
          e2e={e2e}
          onLesson={setActiveLesson}
          onPets={() => setScreen("pets")}
          onParent={() => setScreen("parent")}
          onChest={openChest}
        />
      )}
      {screen === "pets" && (
        <PetsScreen
          progress={progress}
          e2e={e2e}
          onBack={() => setScreen("home")}
          onBuy={buyPet}
        />
      )}
      {screen === "parent" && (
        <ParentScreen
          progress={progress}
          onBack={() => setScreen("home")}
          onReset={() => {
            const fresh = resetProgress();
            setProgress(fresh);
            setScreen("home");
            showToast("リセットしました");
          }}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
