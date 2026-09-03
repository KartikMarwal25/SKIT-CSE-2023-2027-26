/**
 * Base table shell — columns/rows are plain data in, no data-fetching or
 * pagination logic here yet (that lands once a real endpoint exists to page
 * against, later in Sprint 2).
 */
export function Table({ columns, rows }) {
  return (
    <table className="w-full border-collapse text-left text-[14px]">
      <thead>
        <tr className="border-b border-edge">
          {columns.map((col) => (
            <th key={col.key} className="px-12 py-8 font-bold text-body">
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.id ?? i} className="border-b border-edge">
            {columns.map((col) => (
              <td key={col.key} className="px-12 py-8 text-body">
                {row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
