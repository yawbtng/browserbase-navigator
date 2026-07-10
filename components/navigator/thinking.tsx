/**
 * Three-dot bounce for the AI-thinking state (DNA §5 dotBounce). Dots only —
 * no label (user call 2026-07-09); screen readers get an sr-only status. The
 * global prefers-reduced-motion rule in globals.css neutralizes the animation.
 */
export function DotBounce() {
  return (
    <div className="flex items-center gap-1" role="status">
      <span className="sr-only">Thinking</span>
      <i className="size-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.3s]" />
      <i className="size-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.15s]" />
      <i className="size-1.5 animate-bounce rounded-full bg-brand" />
    </div>
  );
}
