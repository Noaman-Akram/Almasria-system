import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  className?: string;
  expandableRow?: (item: T) => React.ReactNode;
  expandedRowKey?: string | number | null;
}

function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  className = '',
  expandableRow,
  expandedRowKey,
}: DataTableProps<T>) {
  return (
    <div className={`overflow-x-auto -mx-6 lg:mx-0 ${className}`}>
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    scope="col"
                    className={`px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item) => {
                const rowKey = String(keyExtractor(item));
                const isExpanded = String(expandedRowKey) === rowKey;
                return (
                  <React.Fragment key={rowKey}>
                    <tr
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                >
                  {columns.map((column, index) => (
                    <td
                      key={index}
                      className={`px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${column.className || ''}`}
                    >
                      {typeof column.accessor === 'function'
                        ? column.accessor(item)
                        : item[column.accessor] as React.ReactNode}
                    </td>
                  ))}
                </tr>
                    {expandableRow && (
                      <tr>
                        <td colSpan={columns.length} className="p-0 border-t-0">
                          <div
                            style={{
                              maxHeight: isExpanded ? 500 : 0,
                              overflow: 'hidden',
                              transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          >
                            {isExpanded && expandableRow(item)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          
          {data.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No data to display
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DataTable;