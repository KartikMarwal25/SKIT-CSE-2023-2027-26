export function FormField({ id, label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="text-[12px] font-bold uppercase text-body">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-4 min-h-[44px] w-full rounded border border-edge-ctl bg-paper px-12 py-8 text-[16px] text-body"
      />
    </div>
  );
}
