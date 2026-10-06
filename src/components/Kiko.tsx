import { useId, type SVGProps } from "react";

export type KikoMood = "idle" | "happy" | "cheer" | "encourage";

export interface KikoProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  mood?: KikoMood;
  /** Backwards-compatible alias for mood="cheer". */
  cheering?: boolean;
}

/** Kiko, the soft and fluffy guide for the adventure. */
export function Kiko({ mood, cheering = false, className = "", ...props }: KikoProps) {
  const resolvedMood = mood ?? (cheering ? "cheer" : "idle");
  const furId = useId();
  const bellyId = useId();
  const shadowId = useId();
  const isCheer = resolvedMood === "cheer";
  const isEncourage = resolvedMood === "encourage";
  const isHappy = resolvedMood === "happy" || isCheer;

  return (
    <svg
      {...props}
      className={`kiko kiko--${resolvedMood}${cheering ? " kiko--cheering" : ""}${className ? ` ${className}` : ""}`}
      viewBox="0 0 160 150"
      role="img"
      aria-label="Kiko"
    >
      <defs>
        <linearGradient id={furId} x1="50" y1="18" x2="112" y2="133" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffc08a" />
          <stop offset=".48" stopColor="#ff9661" />
          <stop offset="1" stopColor="#ed704f" />
        </linearGradient>
        <linearGradient id={bellyId} x1="80" y1="80" x2="80" y2="133" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffe3bf" />
          <stop offset="1" stopColor="#ffc995" />
        </linearGradient>
        <radialGradient id={shadowId}>
          <stop stopColor="#774530" stopOpacity=".28" />
          <stop offset="1" stopColor="#774530" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse className="kiko__shadow" cx="80" cy="139" rx="49" ry="8" fill={`url(#${shadowId})`} />
      <g className="kiko__character">
        <g className="kiko__feet" fill="#de684b" stroke="#743f42" strokeWidth="3.4">
          <ellipse cx="55" cy="128" rx="17" ry="9" transform={isCheer ? "rotate(-12 55 128)" : undefined} />
          <ellipse cx="105" cy="128" rx="17" ry="9" transform={isCheer ? "rotate(12 105 128)" : undefined} />
        </g>

        <g className="kiko__ears" stroke="#743f42" strokeWidth="3.7" strokeLinejoin="round">
          <path d="M43 45C28 39 24 23 33 17c9-5 24 8 27 21Z" fill={`url(#${furId})`} />
          <path d="M117 45c15-6 19-22 10-28-9-5-24 8-27 21Z" fill={`url(#${furId})`} />
          <path d="M41 36c-6-4-9-10-7-14 5-1 13 6 17 13Z" fill="#ffcfad" stroke="none" />
          <path d="M119 36c6-4 9-10 7-14-5-1-13 6-17 13Z" fill="#ffcfad" stroke="none" />
        </g>

        <path
          className="kiko__body"
          d="M80 28c28-3 52 18 54 48 1 14-4 24-8 30 4 15-8 28-24 25-10 9-34 9-44 0-16 3-28-10-24-25-5-7-9-17-8-30 2-30 26-51 54-48Z"
          fill={`url(#${furId})`}
          stroke="#743f42"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path className="kiko__fur-highlight" d="M48 48c11-14 29-19 46-14" fill="none" stroke="#ffd0a7" strokeWidth="5" strokeLinecap="round" opacity=".65" />

        <ellipse className="kiko__belly" cx="80" cy="103" rx="30" ry="27" fill={`url(#${bellyId})`} opacity=".92" />

        <g className="kiko__arms" fill={`url(#${furId})`} stroke="#743f42" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
          {isCheer ? (
            <>
              <path className="kiko__arm kiko__arm--left" d="M39 85C23 77 14 63 20 56c5-6 17 3 25 15" />
              <path className="kiko__arm kiko__arm--right" d="M121 85c16-8 25-22 19-29-5-6-17 3-25 15" />
            </>
          ) : isEncourage ? (
            <>
              <path className="kiko__arm kiko__arm--left" d="M40 85c-15 2-21 15-14 20 5 4 13-1 20-8" />
              <path className="kiko__arm kiko__arm--right" d="M120 85c10 4 13 16 7 20-5 3-11-1-16-7" />
            </>
          ) : (
            <>
              <path className="kiko__arm kiko__arm--left" d="M40 82c-13 5-17 17-10 21 5 3 11-2 16-9" />
              <path className="kiko__arm kiko__arm--right" d="M120 82c13 5 17 17 10 21-5 3-11-2-16-9" />
            </>
          )}
        </g>

        <g className="kiko__face">
          {isHappy ? (
            <g className="kiko__eyes kiko__eyes--happy" fill="none" stroke="#50333d" strokeWidth="4.3" strokeLinecap="round">
              <path d="m52 65 7-5 7 5" />
              <path d="m94 65 7-5 7 5" />
            </g>
          ) : (
            <g className="kiko__eyes">
              <ellipse className="kiko__eye kiko__eye--left" cx="59" cy="64" rx="7.4" ry="9.2" fill="#44303a" />
              <ellipse className="kiko__eye kiko__eye--right" cx="101" cy="64" rx="7.4" ry="9.2" fill="#44303a" />
              <circle cx="56.5" cy="60.5" r="2.4" fill="white" />
              <circle cx="98.5" cy="60.5" r="2.4" fill="white" />
            </g>
          )}
          <ellipse cx="45" cy="79" rx="9" ry="5.5" fill="#ee626a" opacity=".43" />
          <ellipse cx="115" cy="79" rx="9" ry="5.5" fill="#ee626a" opacity=".43" />
          <path d="m77 73 3 2.5 3-2.5" fill="none" stroke="#743f42" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {isCheer ? (
            <path className="kiko__mouth kiko__mouth--cheer" d="M62 79q18 28 36 0Z" fill="#713848" stroke="#743f42" strokeWidth="3.1" strokeLinejoin="round" />
          ) : isEncourage ? (
            <path className="kiko__mouth kiko__mouth--encourage" d="M64 83q16 12 32 0" fill="none" stroke="#743f42" strokeWidth="4" strokeLinecap="round" />
          ) : (
            <path className="kiko__mouth" d="M64 81q16 17 32 0" fill="#fff8e8" stroke="#743f42" strokeWidth="3.6" strokeLinejoin="round" />
          )}
          {isCheer && <path d="M73 94q7-6 14 0" fill="#ff7f7e" />}
        </g>

        {isEncourage && (
          <g className="kiko__encourage-spark" fill="#ffd952" stroke="#ad7820" strokeWidth="1.2">
            <path d="m124 47 2.2 4.7 4.8 2.1-4.8 2.2-2.2 4.7-2.1-4.7-4.8-2.2 4.8-2.1Z" />
            <circle cx="137" cy="65" r="2.5" />
          </g>
        )}
      </g>
    </svg>
  );
}
