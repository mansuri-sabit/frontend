// src/store/analyticsStore.js
import { create } from 'zustand';
import { apiClient } from '../lib/api';

// --- helpers ----------------------------------------------------
const nowISO = () => new Date().toISOString();

const normalizeSystemStats = (raw) => {
  // Coerce API -> UI shape + safe defaults
  const metrics = raw?.metrics ?? {};
  return {
    status: raw?.status ?? 'unknown',
    database: raw?.database ?? 'unknown',
    // backend might send gemini_api; UI expects a plain string we can display
    gemini: raw?.gemini_api ?? raw?.gemini ?? 'unknown',
    activeSessions: raw?.active_sessions ?? raw?.activeSessions ?? 0,
    metrics: {
      clients: metrics.clients ?? 0,
      users: metrics.users ?? 0,
      pdfs: metrics.pdfs ?? 0,
      messages: metrics.messages ?? 0,
      messages24h: metrics.messages_last_24h ?? metrics.messages24h ?? 0,
      totalTokensUsed: metrics.total_tokens_used ?? metrics.totalTokensUsed ?? 0,
    },
    timestamp: raw?.timestamp ?? nowISO(),
  };
};

const normalizeError = (err) =>
  err?.message || err?.toString?.() || 'Something went wrong';

// ----------------------------------------------------------------

export const useAnalyticsStore = create((set, get) => ({
  // State
  usageData: null,
  systemStats: null,
  clientAnalytics: null,
  isLoading: false,
  error: null,
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
  },
  filters: {
    period: 'month',
    client_id: null,
    metric: 'all',
  },
  cachedData: {},
  lastFetched: null,

  // Actions
  loadUsageAnalytics: async (params = {}) => {
    const finalParams = { ...get().filters, ...params };
    const cacheKey = JSON.stringify(finalParams);

    // cache hit (5 min)
    const cached = get().cachedData[cacheKey];
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      set({ usageData: cached.data });
      return cached.data;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.getUsageAnalytics(finalParams);

      set((state) => ({
        usageData: response,
        isLoading: false,
        lastFetched: Date.now(),
        cachedData: {
          ...state.cachedData,
          [cacheKey]: { data: response, timestamp: Date.now() },
        },
      }));

      return response;
    } catch (error) {
      const msg = normalizeError(error);
      set({ isLoading: false, error: msg });
      throw error;
    }
  },

  loadSystemStats: async () => {
    const cacheKey = 'system_stats';

    // cache hit (2 min)
    const cached = get().cachedData[cacheKey];
    if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) {
      set({ systemStats: cached.data });
      return cached.data;
    }

    set({ isLoading: true, error: null });
    try {
      const raw = await apiClient.getSystemStats();
      const response = normalizeSystemStats(raw); // ⬅️ normalize here

      set((state) => ({
        systemStats: response,
        isLoading: false,
        cachedData: {
          ...state.cachedData,
          [cacheKey]: { data: response, timestamp: Date.now() },
        },
      }));

      return response;
    } catch (error) {
      const msg = normalizeError(error);
      set({ isLoading: false, error: msg });
      throw error;
    }
  },

  loadClientAnalytics: async (params = {}) => {
    const finalParams = { ...get().filters, ...params };
    const cacheKey = `client_analytics_${JSON.stringify(finalParams)}`;

    const cached = get().cachedData[cacheKey];
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      set({ clientAnalytics: cached.data });
      return cached.data;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.getClientAnalytics(finalParams);

      set((state) => ({
        clientAnalytics: response,
        isLoading: false,
        cachedData: {
          ...state.cachedData,
          [cacheKey]: { data: response, timestamp: Date.now() },
        },
      }));

      return response;
    } catch (error) {
      const msg = normalizeError(error);
      set({ isLoading: false, error: msg });
      throw error;
    }
  },

  setDateRange: (start, end) => {
    set({
      dateRange: { start, end },
      filters: {
        ...get().filters,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
      },
    });
  },

  setFilters: (newFilters) => {
    set({ filters: { ...get().filters, ...newFilters } });
  },

  clearCache: () => set({ cachedData: {} }),

  refreshData: async () => {
    get().clearCache();
    const jobs = [];
    if (get().usageData) jobs.push(get().loadUsageAnalytics());
    if (get().systemStats) jobs.push(get().loadSystemStats());
    if (get().clientAnalytics) jobs.push(get().loadClientAnalytics());
    await Promise.all(jobs);
  },

  // ---- Data processing utils -----------------------------------
  processTimeSeriesData: (data, metric) => {
    if (!data || !data.time_series) return [];
    return data.time_series.map((p) => ({
      date: new Date(p.date),
      value: p[metric] || 0,
      label: new Date(p.date).toLocaleDateString(),
    }));
  },

  calculateGrowthRate: (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  },

  getTopMetrics: () => {
    const data = get().usageData;
    if (!data) return null;

    return {
      totalTokens: {
        value: data.total_tokens || 0,
        change: get().calculateGrowthRate(
          data.total_tokens,
          data.previous_period?.total_tokens
        ),
        label: 'Total Tokens Used',
      },
      totalMessages: {
        value: data.total_messages || 0,
        change: get().calculateGrowthRate(
          data.total_messages,
          data.previous_period?.total_messages
        ),
        label: 'Messages Sent',
      },
      activeUsers: {
        value: data.active_users || 0,
        change: get().calculateGrowthRate(
          data.active_users,
          data.previous_period?.active_users
        ),
        label: 'Active Users',
      },
      avgResponseTime: {
        value: data.avg_response_time || 0,
        change: get().calculateGrowthRate(
          data.avg_response_time,
          data.previous_period?.avg_response_time
        ),
        label: 'Avg Response Time (ms)',
        format: 'duration',
      },
    };
  },

  getUsageByPeriod: (period = 'day') => {
    const data = get().usageData;
    if (!data || !data.usage_by_period) return [];
    return data.usage_by_period
      .filter((i) => i.period === period)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  getTopClients: (limit = 10) => {
    const data = get().usageData;
    if (!data || !data.client_usage) return [];
    return data.client_usage
      .sort((a, b) => b.total_tokens - a.total_tokens)
      .slice(0, limit);
  },

  getConversationMetrics: () => {
    const data = get().clientAnalytics || get().usageData;
    if (!data) return null;

    return {
      totalConversations: data.total_conversations || 0,
      avgConversationLength: data.avg_conversation_length || 0,
      avgMessagesPerConversation: data.avg_messages_per_conversation || 0,
      conversationCompletionRate: data.conversation_completion_rate || 0,
      userSatisfactionScore: data.user_satisfaction_score || 0,
    };
  },

  // Export
  exportData: (format = 'csv') => {
    const data = get().usageData;
    if (!data) return null;

    if (format === 'csv') return get().convertToCSV(data);
    if (format === 'json') return JSON.stringify(data, null, 2);
    return null;
  },

  convertToCSV: (data) => {
    if (!data.time_series || !Array.isArray(data.time_series)) return '';
    const headers = ['Date', 'Messages', 'Tokens', 'Users', 'Conversations'];
    const rows = data.time_series.map((p) => [
      p.date,
      p.total_messages || 0,
      p.total_tokens || 0,
      p.active_users || 0,
      p.total_conversations || 0,
    ]);
    return [headers, ...rows].map((r) => r.join(',')).join('\n');
  },

  // Realtime (mock)
  addRealtimeMetric: (metric) => {
    set((state) => {
      if (!state.usageData) return state;
      return {
        usageData: {
          ...state.usageData,
          total_messages:
            (state.usageData.total_messages || 0) + (metric.messages || 0),
          total_tokens:
            (state.usageData.total_tokens || 0) + (metric.tokens || 0),
          active_users: Math.max(
            state.usageData.active_users || 0,
            metric.users || 0
          ),
        },
      };
    });
  },

  // Formatting helpers
  formatMetricValue: (value, type = 'number') => {
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'duration':
        return `${value.toFixed(0)}ms`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(value);
    }
  },

  getChangeColor: (change) =>
    change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600',

  getChangeIcon: (change) => (change > 0 ? '↗' : change < 0 ? '↘' : '→'),

  clearError: () => set({ error: null }),

  // Mock realtime subscription
  subscribeToRealtimeUpdates: () => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        get().addRealtimeMetric({
          messages: Math.floor(Math.random() * 5),
          tokens: Math.floor(Math.random() * 100),
          users: Math.floor(Math.random() * 3),
        });
      }
    }, 30000);
    return () => clearInterval(interval);
  },
}));

export default useAnalyticsStore;
