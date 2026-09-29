import React from 'react';
import { cn } from '../../utils/cn';

export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  onRowClick,
  emptyMessage = "No records found in database.",
  className
}) {
  return (
    <div className={cn("w-full overflow-hidden rounded-xl border border-slate-800 bg-command-900/60 backdrop-blur-md", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-command-950/80 text-xs uppercase font-mono tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className={cn("px-6 py-4 font-semibold", col.headerClassName)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-slate-500 font-mono text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row[keyField] || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={cn(
                    "transition-colors hover:bg-slate-800/40",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={cn("px-6 py-4 text-sm whitespace-nowrap", col.className)}
                    >
                      {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
