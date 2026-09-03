const VARIANT_CLASSES = {
  primary: 'bg-brand text-paper hover:opacity-90',
  secondary: 'bg-paper text-brand border border-brand hover:bg-surface',
};

export function Button({ variant = 'primary', type = 'button', children, ...rest }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-[44px] items-center justify-center rounded px-16 py-8 text-[16px] font-bold transition-opacity ${VARIANT_CLASSES[variant]}`}
      {...rest}
    >
      {children}
    </button>
  );
}
