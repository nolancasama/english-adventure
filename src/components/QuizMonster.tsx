import { useId, type SVGProps } from "react";

export type QuizMonsterState = "idle" | "hit" | "defeated";

export interface QuizMonsterProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  state?: QuizMonsterState;
}

/** A friendly fuzzy rival for boss lessons. */
export function QuizMonster({ state = "idle", className = "", ...props }: QuizMonsterProps) {
  const furId = useId();
  const shadowId = useId();
  const defeated = state === "defeated";
  const hit = state === "hit";

  return (
    <svg
      {...props}
      className={`quiz-monster quiz-monster--${state}${className ? ` ${className}` : ""}`}
      viewBox="0 0 180 156"
      role="img"
      aria-label={defeated ? "Quiz Monster defeated" : "Quiz Monster"}
    >
      <defs>
        <linearGradient id={furId} x1="54" y1="28" x2="121" y2="133" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c68dff" />
          <stop offset=".5" stopColor="#9258d6" />
          <stop offset="1" stopColor="#6734a8" />
        </linearGradient>
        <radialGradient id={shadowId}>
          <stop stopColor="#38264b" stopOpacity=".3" />
          <stop offset="1" stopColor="#38264b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse className="quiz-monster__shadow" cx="90" cy="143" rx="57" ry="9" fill={`url(#${shadowId})`} />
      <g className="quiz-monster__character">
        <g className="quiz-monster__feet" fill="#63309d" stroke="#472461" strokeWidth="4">
          <ellipse cx="61" cy="130" rx="23" ry="11" transform={defeated ? "rotate(-18 61 130)" : undefined} />
          <ellipse cx="119" cy="130" rx="23" ry="11" transform={defeated ? "rotate(18 119 130)" : undefined} />
        </g>
        <path className="quiz-monster__horn quiz-monster__horn--left" d="M57 39C48 17 59 7 72 30" fill="#7de1d7" stroke="#472461" strokeWidth="4" strokeLinejoin="round" />
        <path className="quiz-monster__horn quiz-monster__horn--right" d="M123 39c9-22-2-32-15-9" fill="#7de1d7" stroke="#472461" strokeWidth="4" strokeLinejoin="round" />
        <path
          className="quiz-monster__body"
          d="M90 27c10-7 20 1 25 4 12-2 20 5 21 16 11 4 14 14 9 24 8 8 6 20-3 26 3 12-5 21-17 22-5 12-16 16-27 10-7 10-21 10-28 0-11 6-23 2-27-10-12-1-20-10-17-22-9-6-11-18-3-26-5-10-2-20 9-24 1-11 9-18 21-16 5-3 15-11 25-4Z"
          fill={`url(#${furId})`}
          stroke="#472461"
          strokeWidth="4.4"
          strokeLinejoin="round"
        />
        <path d="M49 49c10-13 25-19 40-17" fill="none" stroke="#e2bdff" strokeWidth="6" strokeLinecap="round" opacity=".58" />
        <g className="quiz-monster__arms" fill="#8349c4" stroke="#472461" strokeWidth="4" strokeLinecap="round">
          <path d={defeated ? "M39 80C18 83 13 98 22 103c7 4 15-5 22-10" : "M39 77c-17-5-28 4-24 13 3 7 15 6 27 1"} />
          <path d={defeated ? "M141 80c21 3 26 18 17 23-7 4-15-5-22-10" : "M141 77c17-5 28 4 24 13-3 7-15 6-27 1"} />
        </g>
        <ellipse cx="90" cy="102" rx="34" ry="24" fill="#b989e2" opacity=".47" />
        <g className="quiz-monster__face">
          {defeated ? (
            <g className="quiz-monster__eyes quiz-monster__eyes--dizzy" fill="none" stroke="#35233f" strokeWidth="4" strokeLinecap="round">
              <path d="m56 57 12 12m0-12L56 69m44-12 12 12m0-12-12 12" />
            </g>
          ) : hit ? (
            <g className="quiz-monster__eyes quiz-monster__eyes--hit" fill="none" stroke="#35233f" strokeWidth="4" strokeLinecap="round">
              <path d="m55 66 7-5 7 5m42 0-7-5-7 5" />
            </g>
          ) : (
            <g className="quiz-monster__eyes">
              <ellipse cx="63" cy="64" rx="9" ry="10.5" fill="white" />
              <ellipse cx="107" cy="64" rx="9" ry="10.5" fill="white" />
              <circle cx="65" cy="66" r="4.6" fill="#35233f" />
              <circle cx="105" cy="66" r="4.6" fill="#35233f" />
              <circle cx="63.5" cy="64" r="1.4" fill="white" />
              <circle cx="103.5" cy="64" r="1.4" fill="white" />
            </g>
          )}
          {defeated ? (
            <path className="quiz-monster__mouth" d="M70 93q20-13 40 0" fill="none" stroke="#472461" strokeWidth="4" strokeLinecap="round" />
          ) : (
            <path className="quiz-monster__mouth" d="M68 86q22 23 44 0Z" fill="#3f244b" stroke="#472461" strokeWidth="3.5" strokeLinejoin="round" />
          )}
          {!defeated && <path d="m77 88 5 7 5-8m6 0 5 8 5-7" fill="white" stroke="#472461" strokeWidth="1.3" strokeLinejoin="round" />}
        </g>
        {hit && <path className="quiz-monster__hit-flash" d="m144 32 3.2 7.2 7.3 3.2-7.3 3.3-3.2 7.2-3.3-7.2-7.2-3.3 7.2-3.2Z" fill="#fff49a" stroke="#a87924" strokeWidth="1.5" />}
        {defeated && (
          <g className="quiz-monster__defeated-stars" fill="#ffd950" stroke="#8b6920" strokeWidth="1.3">
            <path d="m42 34 2 4.2 4.5.7-3.2 3.1.7 4.5-4-2.1-4 2.1.8-4.5-3.3-3.1 4.5-.7Z" />
            <path d="m139 22 2.8 5.6 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2-4.5-4.4 6.2-.9Z" />
          </g>
        )}
      </g>
    </svg>
  );
}

export interface QuizMonsterHealthBarProps {
  total: number;
  /** Number of questions already answered correctly. */
  hits?: number;
  state?: QuizMonsterState;
  label?: string;
  className?: string;
}

/** One health segment per boss question, with semantic progress exposed to assistive tech. */
export function QuizMonsterHealthBar({
  total,
  hits = 0,
  state = "idle",
  label = "Quiz Monster health",
  className = "",
}: QuizMonsterHealthBarProps) {
  const safeTotal = Math.max(1, Math.floor(total));
  const safeHits = Math.min(safeTotal, Math.max(0, Math.floor(hits)));
  const remaining = state === "defeated" ? 0 : safeTotal - safeHits;

  return (
    <div
      className={`monster-health monster-health--${state}${className ? ` ${className}` : ""}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeTotal}
      aria-valuenow={remaining}
      aria-valuetext={`${remaining} of ${safeTotal} health remaining`}
    >
      <span className="monster-health__label">Quiz Monster</span>
      <span className="monster-health__segments" aria-hidden="true">
        {Array.from({ length: safeTotal }, (_, index) => {
          const active = index < remaining;
          const justLost = state === "hit" && index === remaining;
          return (
            <i
              key={index}
              className={`monster-health__segment${active ? " monster-health__segment--active" : " monster-health__segment--empty"}${justLost ? " monster-health__segment--damage" : ""}`}
            />
          );
        })}
      </span>
    </div>
  );
}

export interface QuizMonsterEncounterProps extends QuizMonsterHealthBarProps {
  monsterClassName?: string;
}

/** Convenient composed boss header; the character and bar can also be used separately. */
export function QuizMonsterEncounter({ monsterClassName, ...healthProps }: QuizMonsterEncounterProps) {
  return (
    <section className={`quiz-monster-encounter quiz-monster-encounter--${healthProps.state ?? "idle"}`} aria-label="Quiz Monster">
      <QuizMonster state={healthProps.state} className={monsterClassName} aria-hidden="true" />
      <QuizMonsterHealthBar {...healthProps} />
    </section>
  );
}
