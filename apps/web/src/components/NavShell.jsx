/**
 * Shared header shell — the real per-portal navigation (institution/student/
 * verifier) gets wired to real routes once each dashboard shell exists
 * (Weeks 3+); this week is just the reusable header structure.
 */
export function NavShell({ children }) {
  return (
    <header className="flex min-h-[64px] items-center justify-between border-b border-edge bg-paper px-24">
      <span className="text-[18px] font-bold text-ink">SecureCred</span>
      <nav className="flex items-center gap-16">{children}</nav>
    </header>
  );
}
