/** Postr brand mark. SVG logo — works on light and dark themes. */
export function Logo({ className = "size-8" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/postr-logo.svg" alt="Postr" className={className} draggable={false} />
  );
}
