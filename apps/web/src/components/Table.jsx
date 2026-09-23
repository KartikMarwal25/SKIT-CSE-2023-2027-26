/**
 * Base table shell — columns/rows are plain data in, no data-fetching or
 * pagination logic here yet (that lands once a real endpoint exists to page
 * against). Wrapped in its own horizontal scroll container so a wide table
 * never forces the whole page to scroll sideways on a small screen.
 */
export function Table({ columns, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-left text-[14px]">
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
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
