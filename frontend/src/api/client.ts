const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: any;
}

export const apiClient = {
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers, ...rest } = options;
    
    // Construct query parameters
    let url = `${BASE_URL}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined) {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    // Set default headers
    const reqHeaders = new Headers(headers);
    if (!reqHeaders.has('Content-Type') && !(options.body instanceof FormData)) {
      reqHeaders.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...rest,
      headers: reqHeaders,
      credentials: 'include', // Ensure cookies are sent and received
    });

    const contentType = response.headers.get('content-type');
    let data: any = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg = (data && typeof data === 'object' && data.message) 
        ? String(data.message) 
        : `HTTP error! status: ${response.status}`;
        
      if (response.status === 401 && !path.startsWith('/auth/login')) {
        // Dispatch custom event to notify auth context
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        
        // Also fallback to hard redirect if we're not already on login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      
      throw new Error(errorMsg);
    }

    // Unpack NestJS unified response format if present
    if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
      const unpacked = data as ApiResponse<T>;
      return unpacked.data;
    }

    return data as T;
  },

  get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  },

  post<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  },
};
export type { ApiResponse };
