export function Card({ children, className = '' }) {
  return (
    <div className={`rounded border border-edge bg-paper p-16 shadow-sm sm:p-24 ${className}`}>
      {children}
    </div>
  );
}
