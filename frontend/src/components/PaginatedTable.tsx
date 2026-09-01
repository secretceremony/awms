import { useState, useEffect, type ReactNode } from 'react';
import { apiClient } from '../api/client.js';
import { Search, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

export interface Column<T> {
  header: string;
  key: string;
  render?: (item: T) => ReactNode;
}

interface PaginatedTableProps<T> {
  columns: Column<T>[];
  fetchUrl: string;
  searchPlaceholder?: string;
  extraParams?: Record<string, string | number | undefined>;
}

export function PaginatedTable<T>({
  columns,
  fetchUrl,
  searchPlaceholder = 'Search...',
  extraParams = {},
}: PaginatedTableProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
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
    }, 400);
    return () => clearTimeout(handler);
  }, [searchText]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<{
        data: T[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }>(fetchUrl, {
        params: {
          page,
          limit,
          search: debouncedSearch || undefined,
          ...extraParams,
        },
      });

      if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
        setData(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
      } else {
        const rawResult = result as unknown;
        setData(Array.isArray(rawResult) ? (rawResult as T[]) : []);
        setTotal(Array.isArray(rawResult) ? rawResult.length : 0);
        setTotalPages(1);
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
    <div className="table-wrapper">
      {/* Search Header */}
      <div className="table-header-controls">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="table-loading">
          <div className="skeleton-row header-skeleton"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-row"></div>
          ))}
        </div>
      ) : error ? (
        <div className="table-error">
          <AlertTriangle size={32} />
          <p>{error}</p>
          <button type="button" className="btn-retry-table" onClick={() => void fetchData()}>
            Try Again
          </button>
        </div>
      ) : data.length === 0 ? (
        <div className="table-empty">
          <p>No records found.</p>
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
                {data.map((item, rowIdx) => (
                  <tr key={rowIdx}>
                    {columns.map((col, colIdx) => (
                      <td key={colIdx}>
                        {col.render
                          ? col.render(item)
                          : (item as Record<string, unknown>)[col.key] !== undefined
                          ? String((item as Record<string, unknown>)[col.key])
                          : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="table-pagination">
            <div className="pagination-info">
              Showing {(page - 1) * limit + 1} to{' '}
              {Math.min(page * limit, total)} of {total} results
            </div>
            <div className="pagination-buttons">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>
              <span className="page-indicator">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages || totalPages === 0}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
