export function Coin({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="coin-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="10" fill="#d99b16" />
      <circle cx="12" cy="11" r="8" fill="#ffd84d" stroke="#fff1a6" strokeWidth="1.5" />
      <path d="M13.8 6.8h-2.2a2.7 2.7 0 0 0 0 5.4h.8a2.2 2.2 0 0 1 0 4.4H9.7M12 5.4V18" fill="none" stroke="#9b6810" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
