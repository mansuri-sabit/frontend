// src/features/client/components/TokenUsage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAnalyticsStore } from '../../../store/analyticsStore';
import { useAuthStore } from '../../../store/authStore';
import { apiClient } from '../../../lib/api';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Progress } from '../../../components/ui/Progress';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import toast from '@/lib/toast';

const TokenUsage = ({ 
  showHeader = true, 
  compact = false, 
  className = '',
  onLimitReached,
  refreshInterval = 30000  // Default to 30 seconds if not provided
}) => {
  const { user } = useAuthStore();
  const {
    clientAnalytics,
    isLoading,
    error,
    loadClientAnalytics,
    clearError,
  } = useAnalyticsStore();

  const [tokenData, setTokenData] = useState({
    current_usage: 0,
    token_limit: 0,
    usage_today: 0,
    usage_this_week: 0,
    usage_this_month: 0,
    reset_date: null,
    efficiency_score: 0,
    cost_per_token: 0.0001,
    last_updated: null,
  });

  const getNextMonthFirst = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  };

  const loadTokenUsageData = useCallback(async () => {
    try {
      // 1) Get current token usage and limit from /client/tokens endpoint
      const tokensJson = await apiClient.getTokenUsage(); // { used, limit, remaining, usage }

      // 2) Get period analytics (last 30 days) for time series data
      const analytics = await loadClientAnalytics({ period: '30d' });
      const timeSeries = Array.isArray(analytics?.time_series) ? analytics.time_series : [];

      // Helpers for date calculations
      const iso = (d) => new Date(d).toISOString().slice(0, 10);
      const today = iso(new Date());
      const sumTokens = (arr) => arr.reduce((acc, x) => acc + (Number(x?.total_tokens) || 0), 0);

      // Calculate usage_today from time series
      const usage_today = sumTokens(
        timeSeries.filter((d) => d?.date === today)
      );

      // Calculate usage_this_week (last 7 days including today)
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 6);
      const usage_this_week = sumTokens(
        timeSeries.filter((d) => {
          const dd = new Date(d?.date);
          return dd >= weekAgo && dd <= now;
        })
      );

      // Calculate usage_this_month (calendar month)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const usage_this_month = sumTokens(
        timeSeries.filter((d) => {
          const dd = new Date(d?.date);
          return dd >= monthStart && dd <= now;
        })
      );

      const newTokenData = {
        current_usage: Number(tokensJson?.used) || 0,
        token_limit: Number(tokensJson?.limit) || 0,
        usage_today,
        usage_this_week,
        usage_this_month,
        reset_date: getNextMonthFirst(),
        efficiency_score: 0, // not tracked server-side
        cost_per_token: 0.0001,
        last_updated: new Date().toISOString(),
      };

      setTokenData(newTokenData);

      // Check if limit is reached or approaching
      const usagePercentage = newTokenData.token_limit > 0 
        ? (newTokenData.current_usage / newTokenData.token_limit) * 100 
        : 0;
      if (usagePercentage >= 90 && onLimitReached) {
        onLimitReached(newTokenData);
      }
    } catch (error) {
      console.error('Failed to load token usage data:', error);
      toast.error('Failed to load token usage data');
      // Don't set fallback data - let the component show loading/error state
    }
  }, [loadClientAnalytics, onLimitReached]);

  useEffect(() => {
    loadTokenUsageData();
  }, [loadTokenUsageData]);

  const usagePercentage = tokenData.token_limit > 0 
    ? (tokenData.current_usage / tokenData.token_limit) * 100 
    : 0;
  const remainingTokens = Math.max(
    (tokenData.token_limit || 0) - (tokenData.current_usage || 0),
    0
  );
  const daysInMonth = new Date().getDate() || 1;
  const dailyAverage = daysInMonth > 0 
    ? (tokenData.usage_this_month || 0) / daysInMonth 
    : 0;
  const projectedMonthlyUsage = dailyAverage * 30;
  const daysUntilReset = tokenData.reset_date 
    ? Math.max(
        Math.ceil(
          (new Date(tokenData.reset_date) - new Date()) / (1000 * 60 * 60 * 24)
        ),
        0
      )
    : 0;
  
  const getUsageColor = () => {
    if (usagePercentage >= 90) return 'danger';
    if (usagePercentage >= 75) return 'warning';
    if (usagePercentage >= 50) return 'info';
    return 'success';
  };

  const getUsageStatus = () => {
    if (usagePercentage >= 90) return 'Critical';
    if (usagePercentage >= 75) return 'High';
    if (usagePercentage >= 50) return 'Moderate';
    return 'Normal';
  };

  const getEfficiencyColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(number || 0));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(amount);
  };

  // Calculate cost for THIS MONTH (not cumulative)
  // Fallback to current_usage if monthly data not available yet
  const monthlyUsage = tokenData.usage_this_month > 0 
    ? tokenData.usage_this_month 
    : tokenData.current_usage;
  
  const estimatedCost = monthlyUsage * tokenData.cost_per_token;
  const projectedCost = projectedMonthlyUsage * tokenData.cost_per_token;

  if (isLoading && !tokenData.last_updated) {
    return (
      <div className={`space-y-3 sm:space-y-4 ${className}`}>
        {compact ? (
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-3 sm:h-4 w-20 sm:w-24 mb-2" />
                  <Skeleton className="h-2 w-full mb-1" />
                  <Skeleton className="h-2 sm:h-3 w-14 sm:w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {showHeader && <Skeleton className="h-6 sm:h-8 w-40 sm:w-48" />}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 sm:p-6">
                    <Skeleton className="h-3 sm:h-4 w-16 sm:w-20 mb-2" />
                    <Skeleton className="h-5 sm:h-6 w-12 sm:w-16 mb-1" />
                    <Skeleton className="h-2 sm:h-3 w-20 sm:w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-3 sm:p-4">
          {error && (
            <Alert variant="error" className="mb-3 sm:mb-4 text-xs sm:text-sm" onClose={clearError}>
              {error}
            </Alert>
          )}

          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                usagePercentage >= 90 ? 'bg-red-500' :
                usagePercentage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
              }`} />
              <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate">
                Token Usage
              </h3>
            </div>
            <Badge variant={getUsageColor()} size="sm" className="flex-shrink-0 text-xs">
              {getUsageStatus()}
            </Badge>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-600 dark:text-gray-400 truncate">
                {formatNumber(tokenData.current_usage)} / {formatNumber(tokenData.token_limit)}
              </span>
              <span className="font-medium flex-shrink-0 ml-2">
                {usagePercentage.toFixed(1)}%
              </span>
            </div>

            <Progress
              value={usagePercentage}
              variant={getUsageColor()}
              className="h-1.5 sm:h-2"
            />

            <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div>
                <span>Today: </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatNumber(tokenData.usage_today)}
                </span>
              </div>
              <div>
                <span>Remaining: </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatNumber(remainingTokens)}
                </span>
              </div>
              <div>
                <span>Est. Cost: </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(estimatedCost)}
                </span>
              </div>
              <div>
                <span>Resets: </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {daysUntilReset}d
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              Token Usage Overview
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Monitor your token consumption and track usage patterns
            </p>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Button
              onClick={() => {
                loadTokenUsageData();
                toast.success('Refreshing token usage data...');
              }}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="text-xs sm:text-sm"
            >
              {isLoading ? (
                <svg className="animate-spin h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : null}
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          variant="error"
          title="Failed to Load Token Usage"
          onClose={clearError}
        >
          {error}
        </Alert>
      )}

      {/* Usage Alerts */}
      {usagePercentage >= 90 && (
        <Alert variant="error" title="Critical Usage Alert">
          <div className="space-y-2 sm:space-y-3">
            <p className="text-sm sm:text-base">You have used {usagePercentage.toFixed(1)}% of your token limit!</p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 sm:space-x-2">
              <Button variant="primary" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                Upgrade Plan
              </Button>
              <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                Optimize Usage
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {usagePercentage >= 75 && usagePercentage < 90 && (
        <Alert variant="warning" title="High Usage Warning">
          <p className="text-sm sm:text-base">You have used {usagePercentage.toFixed(1)}% of your token limit. Consider monitoring usage more closely.</p>
        </Alert>
      )}

      {/* Main Usage Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Current Usage */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Current Usage
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {formatNumber(tokenData.current_usage)}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  of {formatNumber(tokenData.token_limit)} tokens
                </p>
              </div>
              <div className="ml-3 sm:ml-4 flex-shrink-0">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                  usagePercentage >= 90 ? 'bg-red-100 text-red-600' :
                  usagePercentage >= 75 ? 'bg-yellow-100 text-yellow-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  <span className="text-sm sm:text-lg font-bold">
                    {Math.round(usagePercentage)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Usage */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Today's Usage
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {formatNumber(tokenData.usage_today)}
                </p>
                <p className="text-xs text-gray-500">
                  tokens used today
                </p>
              </div>
              <div className="ml-3 sm:ml-4 flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remaining Tokens */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Remaining Tokens
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {formatNumber(remainingTokens)}
                </p>
                <p className="text-xs text-gray-500">
                  tokens remaining
                </p>
              </div>
              <div className="ml-3 sm:ml-4 flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Progress Section */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
              Usage Progress
            </h3>
            <Badge variant={getUsageColor()} className="w-fit">
              {getUsageStatus()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Monthly Progress
              </span>
              <span className="text-xs sm:text-sm text-gray-500">
                {formatNumber(tokenData.current_usage)} / {formatNumber(tokenData.token_limit)} tokens
              </span>
            </div>

            <Progress
              value={usagePercentage}
              variant={getUsageColor()}
              className="h-2 sm:h-3"
              showLabel={false}
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {formatNumber(tokenData.usage_today)}
                </div>
                <div className="text-xs text-gray-500">Today</div>
              </div>
              <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {formatNumber(tokenData.usage_this_week)}
                </div>
                <div className="text-xs text-gray-500">This Week</div>
              </div>
              <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {formatNumber(dailyAverage)}
                </div>
                <div className="text-xs text-gray-500">Daily Average</div>
              </div>
              <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {daysUntilReset}
                </div>
                <div className="text-xs text-gray-500">Days to Reset</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
            Usage Tips
          </h3>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">Optimize Conversations</h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Use concise, clear messages to reduce token consumption while maintaining quality.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2 sm:space-x-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">Monitor Patterns</h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Track peak usage times and adjust your strategy accordingly.
                </p>
              </div>
            </div>
          </div>

          {tokenData.last_updated && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last updated: {new Date(tokenData.last_updated).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export { TokenUsage };
export default TokenUsage;
