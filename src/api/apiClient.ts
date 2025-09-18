import axios from 'axios';
import type {
  GraphData,
  GraphNode,
  GraphEdge,
  CreateNodeRequest,
  UpdateNodeRequest,
  CreateEdgeRequest,
  UpdateEdgeRequest
} from '../types/graph';

// Configure axios defaults
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Graph API functions
export const graphApi = {
  // Get entire graph
  async getGraph(): Promise<GraphData> {
    try {
      const response = await api.get<GraphData>('/graph');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch graph:', error);
      throw new Error('Failed to load graph data');
    }
  },

  // Node operations
  async createNode(data: CreateNodeRequest): Promise<GraphNode> {
    try {
      const response = await api.post<GraphNode>('/nodes', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create node:', error);
      throw new Error('Failed to create node');
    }
  },

  async updateNode(id: string, data: UpdateNodeRequest): Promise<GraphNode> {
    try {
      const response = await api.put<GraphNode>(`/nodes/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update node:', error);
      throw new Error('Failed to update node');
    }
  },

  async deleteNode(id: string): Promise<void> {
    try {
      await api.delete(`/nodes/${id}`);
    } catch (error) {
      console.error('Failed to delete node:', error);
      throw new Error('Failed to delete node');
    }
  },

  // Edge operations
  async createEdge(data: CreateEdgeRequest): Promise<GraphEdge> {
    try {
      const response = await api.post<GraphEdge>('/edges', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create edge:', error);
      throw new Error('Failed to create edge');
    }
  },

  async updateEdge(id: string, data: UpdateEdgeRequest): Promise<GraphEdge> {
    try {
      const response = await api.put<GraphEdge>(`/edges/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update edge:', error);
      throw new Error('Failed to update edge');
    }
  },

  async deleteEdge(id: string): Promise<void> {
    try {
      await api.delete(`/edges/${id}`);
    } catch (error) {
      console.error('Failed to delete edge:', error);
      throw new Error('Failed to delete edge');
    }
  },

  // Search operations
  async searchNodes(query: string): Promise<GraphNode[]> {
    try {
      if (!query.trim()) {
        return [];
      }
      const response = await api.get<GraphNode[]>('/search', {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to search nodes:', error);
      throw new Error('Failed to search nodes');
    }
  }
};

// Debounced API call utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Position update debouncer for node dragging
export const debouncedUpdateNodePosition = debounce(
  (id: string, x: number, y: number) => {
    return graphApi.updateNode(id, { x, y });
  },
  500 // 500ms delay
);

export default api; 