/**
 * A loading placeholder — a plain pulsing block, sized by the caller via
 * className. Used anywhere real data is being fetched (currently just the
 * certificate detail page; RegistryPage/GalleryPage are still mock data with
 * nothing to actually wait on yet).
 */
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-surface ${className}`} />;
}
