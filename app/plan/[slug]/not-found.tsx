import Link from "next/link";

export default function PlanNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="eyebrow text-brand-text">404</span>
      <h1 className="text-2xl font-medium tracking-[-0.01em] text-text">
        This plan doesn&rsquo;t exist.
      </h1>
      <p className="text-sm text-text-muted">
        It was never saved, or the link is wrong.
      </p>
      <Link
        href="/"
        className="rounded-pill bg-brand px-5 py-2.5 text-sm font-medium text-brand-fg-strong shadow-inset-top transition-[background-color,border-radius] duration-200 ease-brand hover:bg-brand-hover hover:rounded-lg"
      >
        New conversation →
      </Link>
    </main>
  );
}
