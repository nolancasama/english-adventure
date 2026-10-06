import { useId, type SVGProps } from "react";

export type IconName =
  | "close"
  | "back"
  | "speaker"
  | "microphone"
  | "gear"
  | "lock"
  | "backspace"
  | "star"
  | "paw"
  | "check"
  | "chest";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  name: IconName;
  /** Adds an accessible name. Decorative icons are hidden by default. */
  title?: string;
  size?: number | string;
}

/** A single, rounded icon family for all game chrome. */
export function Icon({ name, title, size = "1em", className = "", ...props }: IconProps) {
  const titleId = useId();
  const gradientId = useId();
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      {...props}
      className={`game-icon game-icon--${name}${className ? ` ${className}` : ""}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : undefined}
      aria-labelledby={title ? titleId : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title id={titleId}>{title}</title>}
      {name === "close" && <path {...common} d="m6.25 6.25 11.5 11.5m0-11.5-11.5 11.5" />}
      {name === "back" && (
        <path {...common} d="M19 12H5m6.25-6.25L5 12l6.25 6.25" />
      )}
      {name === "speaker" && (
        <g {...common}>
          <path fill="currentColor" stroke="none" d="M4.2 9.1h3.25l4.1-3.35a1 1 0 0 1 1.63.77v10.96a1 1 0 0 1-1.63.77l-4.1-3.35H4.2a1.2 1.2 0 0 1-1.2-1.2v-3.4a1.2 1.2 0 0 1 1.2-1.2Z" />
          <path className="game-icon__wave game-icon__wave--near" d="M16 9.15c.7.76 1.05 1.7 1.05 2.85S16.7 14.1 16 14.85" />
          <path className="game-icon__wave game-icon__wave--far" d="M18.8 6.8A7.1 7.1 0 0 1 21 12a7.1 7.1 0 0 1-2.2 5.2" />
        </g>
      )}
      {name === "microphone" && (
        <g {...common}>
          <rect x="8" y="2.25" width="8" height="13" rx="4" fill="currentColor" stroke="none" />
          <path d="M4.9 11.5a7.1 7.1 0 0 0 14.2 0M12 18.6v3.15m-4 0h8" />
          <path d="M10.4 5.1h3.2" stroke="white" strokeWidth="1.25" opacity=".75" />
        </g>
      )}
      {name === "gear" && (
        <g {...common}>
          <path d="m9.65 3.45.42-1.2h3.86l.42 1.2a2 2 0 0 0 2.62 1.2l1.14-.55 2.73 2.73-.55 1.14a2 2 0 0 0 1.2 2.62l1.2.42v3.86l-1.2.42a2 2 0 0 0-1.2 2.62l.55 1.14-2.73 2.73-1.14-.55a2 2 0 0 0-2.62 1.2l-.42 1.2h-3.86l-.42-1.2a2 2 0 0 0-2.62-1.2l-1.14.55-2.73-2.73.55-1.14a2 2 0 0 0-1.2-2.62l-1.2-.42v-3.86l1.2-.42a2 2 0 0 0 1.2-2.62L3.16 6.83 5.9 4.1l1.14.55a2 2 0 0 0 2.62-1.2Z" />
          <circle cx="12" cy="12" r="3.15" />
        </g>
      )}
      {name === "lock" && (
        <g {...common}>
          <rect x="4.25" y="9.75" width="15.5" height="11" rx="3" fill="currentColor" stroke="none" />
          <path d="M7.35 9.75V7.4a4.65 4.65 0 0 1 9.3 0v2.35" />
          <circle cx="12" cy="15" r="1.25" fill="white" stroke="none" />
        </g>
      )}
      {name === "backspace" && (
        <g {...common}>
          <path d="M9.2 5h10.35A2.45 2.45 0 0 1 22 7.45v9.1A2.45 2.45 0 0 1 19.55 19H9.2L2 12l7.2-7Z" />
          <path d="m13 9 6 6m0-6-6 6" />
        </g>
      )}
      {name === "star" && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="7" y1="3" x2="16" y2="21" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fff1a3" />
              <stop offset=".42" stopColor="#ffd447" />
              <stop offset="1" stopColor="#f2a919" />
            </linearGradient>
          </defs>
          <path d="m12 1.9 3.07 6.22 6.87 1-4.97 4.84 1.17 6.84L12 17.57 5.86 20.8l1.17-6.84-4.97-4.84 6.87-1L12 1.9Z" fill={`url(#${gradientId})`} stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round" />
          <path d="m8.3 8.4 2.25-4.05" stroke="#fff8ca" strokeWidth="1.25" strokeLinecap="round" opacity=".8" />
        </>
      )}
      {name === "paw" && (
        <g fill="currentColor">
          <ellipse cx="12" cy="16.25" rx="5.6" ry="4.35" />
          <ellipse cx="5.35" cy="10.7" rx="2.15" ry="2.75" transform="rotate(-27 5.35 10.7)" />
          <ellipse cx="9.45" cy="6.65" rx="2.15" ry="2.75" transform="rotate(-8 9.45 6.65)" />
          <ellipse cx="14.7" cy="6.65" rx="2.15" ry="2.75" transform="rotate(8 14.7 6.65)" />
          <ellipse cx="18.75" cy="10.7" rx="2.15" ry="2.75" transform="rotate(27 18.75 10.7)" />
        </g>
      )}
      {name === "check" && <path {...common} strokeWidth="3" d="m4.2 12.5 5.1 5.05L20 6.8" />}
      {name === "chest" && (
        <g {...common}>
          <path fill="#9a572b" d="M3 10.2h18v9.25A1.55 1.55 0 0 1 19.45 21H4.55A1.55 1.55 0 0 1 3 19.45V10.2Z" />
          <path fill="#d98636" d="M4.2 4.2h15.6A1.2 1.2 0 0 1 21 5.4v5.3H3V5.4a1.2 1.2 0 0 1 1.2-1.2Z" />
          <path stroke="#ffd66b" strokeWidth="2" d="M7 4.4v16.1m10-16.1v16.1M3.5 10.7h17" />
          <rect x="9.65" y="9.05" width="4.7" height="5.4" rx="1" fill="#ffe38b" stroke="#7b4524" strokeWidth="1.45" />
          <path d="M12 11.15v1.3" stroke="#7b4524" strokeWidth="1.4" />
        </g>
      )}
    </svg>
  );
}
