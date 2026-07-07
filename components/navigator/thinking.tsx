/**
 * Three-dot bounce for the AI-thinking state (DNA §5 dotBounce). The global
 * prefers-reduced-motion rule in globals.css neutralizes the animation.
 */
export function DotBounce({ label = "Thinking…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-text-muted">
      <span aria-hidden className="flex items-center gap-1">
        <i className="size-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.3s]" />
        <i className="size-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.15s]" />
        <i className="size-1.5 animate-bounce rounded-full bg-brand" />
      </span>
      {label}
    </div>
  );
}
