/**
 * The Browserbase mark, inlined from the official logo lockup
 * (public/browserbase-logo.svg). Hex here is intentional — logo colors are
 * fixed brand assets, identical in both themes, exempt from the token rule.
 */
export function BrowserbaseMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" viewBox="0 0 200 200">
      <rect fill="#FFFFFF" height="124" width="134" x="30" y="36" />
      <path d="M111.168 116.901H83.168V109.901H111.168V116.901Z" fill="#FF4500" />
      <path d="M111.168 86.208H83.168V79.208H111.168V86.208Z" fill="#FF4500" />
      <path
        clipRule="evenodd"
        d="M200 200H0V0H200V200ZM55.4453 147.815H128.678L145.259 131.234V111.891L131.441 98.0723L142.495 87.0186V69.0557L125.914 52.4756H55.4453V147.815Z"
        fill="#FF4500"
        fillRule="evenodd"
      />
    </svg>
  );
}
