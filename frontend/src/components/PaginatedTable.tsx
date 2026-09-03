import { useState, useEffect, type ReactNode } from 'react';
import { apiClient } from '../api/client.js';
import { Search, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

export interface Column<T> {
  header: ReactNode;
  key: string;
  render?: (item: T) => ReactNode;
}

interface PaginatedTableProps<T> {
  columns: Column<T>[];
  fetchUrl: string;
  searchPlaceholder?: string;
  hideInternalSearch?: boolean;
  extraParams?: Record<string, string | number | undefined>;
  rowClassName?: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  onDataLoaded?: (data: T[]) => void;
}

export function PaginatedTable<T>({
  columns,
  fetchUrl,
  searchPlaceholder = 'Search...',
  hideInternalSearch = true,
  extraParams = {},
  rowClassName,
  onRowClick,
  emptyMessage = 'No records found matching your filters.',
  onDataLoaded,
}: PaginatedTableProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search text
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText);
      setPage(1); // Reset to page 1 on new search
    }, 350);
    return () => clearTimeout(handler);
  }, [searchText]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const searchParam = !hideInternalSearch ? debouncedSearch : undefined;
      const result = await apiClient.get<{
        data: T[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }>(fetchUrl, {
        params: {
          page,
          limit,
          search: searchParam,
          ...extraParams,
        },
      });

      if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
        setData(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
        onDataLoaded?.(result.data);
      } else {
        const rawResult = result as unknown;
        const arr = Array.isArray(rawResult) ? (rawResult as T[]) : [];
        setData(arr);
        setTotal(arr.length);
        setTotalPages(1);
        onDataLoaded?.(arr);
      }
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUrl, page, limit, debouncedSearch, JSON.stringify(extraParams)]);

  return (
    <div className="table-wrapper" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1rem' }}>
      {/* Optional Internal Search Header */}
      {!hideInternalSearch && (
        <div className="table-header-controls">
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="table-loading" style={{ padding: '2.5rem 0' }}>
          <div style={{ width: '24px', height: '24px', border: '3px solid #E2E8F0', borderTopColor: '#2250A1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '6px' }}>Loading records...</p>
        </div>
      ) : error ? (
        <div className="table-error" style={{ padding: '2rem 0', textAlign: 'center' }}>
          <AlertTriangle size={28} color="#DC2626" />
          <p style={{ fontSize: '0.85rem', color: '#DC2626', margin: '6px 0 10px 0' }}>{error}</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void fetchData()}
          >
            Retry Connection
          </button>
        </div>
      ) : data.length === 0 ? (
        <div className="table-empty" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx}>{col.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item, rowIdx) => {
                  const customClass = rowClassName ? rowClassName(item) : '';
                  const isClickable = Boolean(onRowClick);

                  return (
                    <tr
                      key={rowIdx}
                      className={customClass}
                      onClick={() => onRowClick && onRowClick(item)}
                      style={{ cursor: isClickable ? 'pointer' : undefined }}
                    >
                      {columns.map((col, colIdx) => (
                        <td key={colIdx}>
                          {col.render
                            ? col.render(item)
                            : (item as Record<string, unknown>)[col.key] !== undefined &&
                              (item as Record<string, unknown>)[col.key] !== null &&
                              (item as Record<string, unknown>)[col.key] !== ''
                            ? String((item as Record<string, unknown>)[col.key])
                            : '—'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Compact Pagination Controls */}
          <div className="table-pagination" style={{ marginTop: '0.85rem', fontSize: '0.8rem', color: '#64748B' }}>
            <div className="pagination-info">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} records
            </div>
            <div className="pagination-buttons">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>
              <span className="page-indicator" style={{ fontWeight: 600, padding: '0 6px' }}>
                Page {page} of {Math.max(totalPages, 1)}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages || totalPages === 0}
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
