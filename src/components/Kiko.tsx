export function Kiko({ cheering = false }: { cheering?: boolean }) {
  return (
    <svg className={`kiko${cheering ? " kiko--cheering" : ""}`} viewBox="0 0 140 130" role="img" aria-label="Kiko">
      <path d="M29 47 18 20l29 16M111 47l11-27-29 16" fill="#ff9d66" stroke="#703c3c" strokeWidth="5" strokeLinejoin="round" />
      <ellipse cx="70" cy="70" rx="51" ry="48" fill="#ff9d66" stroke="#703c3c" strokeWidth="5" />
      <ellipse cx="51" cy="65" rx="6" ry="8" fill="#352a36" />
      <ellipse cx="89" cy="65" rx="6" ry="8" fill="#352a36" />
      <path d="M55 85q15 15 30 0" fill="none" stroke="#703c3c" strokeWidth="5" strokeLinecap="round" />
      <circle cx="40" cy="81" r="7" fill="#ff6f61" opacity=".55" />
      <circle cx="100" cy="81" r="7" fill="#ff6f61" opacity=".55" />
    </svg>
  );
}

