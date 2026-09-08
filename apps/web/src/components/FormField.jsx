export function FormField({ id, label, type = 'text', value, onChange, placeholder, required, error, hint }) {
  return (
    <div>
      <label htmlFor={id} className="text-[12px] font-bold uppercase text-body">
        {label}
        {required ? <span className="text-bad"> *</span> : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
        className={`mt-4 min-h-[44px] w-full rounded border bg-paper px-12 py-8 text-[16px] text-body ${
          error ? 'border-bad' : 'border-edge-ctl'
        }`}
      />
      {error ? (
        <p className="mt-4 text-[12px] text-bad">{error}</p>
      ) : hint ? (
        <p className="mt-4 text-[12px] text-faint">{hint}</p>
      ) : null}
    </div>
  );
}
