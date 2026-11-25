export function BrandMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M3 16.5c2.4-3.2 4.4-3.2 6.8 0s4.4 3.2 6.8 0 3.2-3.2 4.4-3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M7 9.5 10.2 6l2.1 3.2L14.8 6 18 10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
