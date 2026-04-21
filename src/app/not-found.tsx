import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
      <div className="font-mono text-6xl font-bold text-border">404</div>
      <p className="font-sans text-text-muted">this page doesn&apos;t exist</p>
      <Link
        href="/"
        className="font-mono text-sm text-accent hover:text-accent-dim transition-colors"
      >
        ← back home
      </Link>
    </div>
  );
}
