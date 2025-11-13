// src/features/client/components/TokenUsage.jsx
import React, { useState, useEffect } from 'react';
import { useAnalyticsStore } from '../../../store/analyticsStore';
import { apiClient } from '../../../lib/api';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
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
  refreshInterval = 30000, // Default to 30 seconds if not provided
}) => {
  const {
    isLoading: analyticsLoading,
    error,
    loadClientAnalytics,
    clearError,
  } = useAnalyticsStore();

  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadTokenUsageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTokenUsageData = async () => {
    try {
      setLoading(true);

      // 1) Cumulative usage/limit
      const tokensJson = await apiClient.getTokenUsage(); // { used, limit, remaining, usage }

      // 2) Period analytics (last 30 days)
      const analytics = await loadClientAnalytics({ period: '30d' }); // hits /client/analytics
      const timeSeries = Array.isArray(analytics?.time_series)
        ? analytics.time_series
        : [];

      // Helpers
      const iso = (d) => new Date(d).toISOString().slice(0, 10);
      const today = iso(new Date());

      const sumTokens = (arr) =>
        arr.reduce((acc, x) => acc + (Number(x?.total_tokens) || 0), 0);

      const usage_today = sumTokens(
        timeSeries.filter((d) => d?.date === today)
      );

      // last 7 days (including today)
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 6);
      const usage_this_week = sumTokens(
        timeSeries.filter((d) => {
          const dd = new Date(d?.date);
          return dd >= weekAgo && dd <= now;
        })
      );

      // this month (calendar month)
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
        efficiency_score: 0, // not tracked server-side; keep as 0
        cost_per_token: 0.0001,
        last_updated: new Date().toISOString(),
      };

      setTokenData(newTokenData);

      const usagePct =
        newTokenData.token_limit > 0
          ? (newTokenData.current_usage / newTokenData.token_limit) * 100
          : 0;
      if (usagePct >= 90 && onLimitReached) onLimitReached(newTokenData);
    } catch (e) {
      console.error('Failed to load token usage data:', e);
      toast.error('Failed to load token usage');
    } finally {
      setLoading(false);
    }
  };

  const getNextMonthFirst = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  };

  const usagePercentage =
    tokenData.token_limit > 0
      ? (tokenData.current_usage / tokenData.token_limit) * 100
      : 0;

  const remainingTokens = Math.max(
    (tokenData.token_limit || 0) - (tokenData.current_usage || 0),
    0
  );
  const daysInMonth = new Date().getDate() || 1;
  const dailyAverage =
    daysInMonth > 0 ? (tokenData.usage_this_month || 0) / daysInMonth : 0;
  const projectedMonthlyUsage = dailyAverage * 30;
  const daysUntilReset = Math.max(
    Math.ceil(
      (new Date(tokenData.reset_date) - new Date()) / (1000 * 60 * 60 * 24)
    ),
    0
  );

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

  const formatNumber = (n) =>
    new Intl.NumberFormat('en-US').format(Math.round(Number(n) || 0));
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(Number(amount) || 0);

  // Calculate cost for THIS MONTH (not cumulative)
  // Fallback to current_usage if monthly data not available yet
  const monthlyUsage = tokenData.usage_this_month > 0 
    ? tokenData.usage_this_month 
    : (tokenData.current_usage || 0);
  
  const estimatedCost = monthlyUsage * tokenData.cost_per_token;
  const projectedCost = projectedMonthlyUsage * tokenData.cost_per_token;

  // Skeleton while first load
  if ((loading || analyticsLoading) && !tokenData.last_updated) {
    return (
      <div className={`space-y-4 ${className}`}>
        {compact ? (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-2 w-full mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {showHeader && <Skeleton className="h-8 w-48" />}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-6 w-16 mb-1" />
                    <Skeleton className="h-3 w-24" />
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
        <CardContent className="p-4">
          {error && (
            <Alert variant="error" className="mb-4" onClose={clearError}>
              {error}
            </Alert>
          )}

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  usagePercentage >= 90
                    ? 'bg-red-500'
                    : usagePercentage >= 75
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
              />
              <h3 className="font-medium text-gray-900 dark:text-white">
                Token Usage
              </h3>
            </div>
            <Badge variant={getUsageColor()} size="sm">
              {getUsageStatus()}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {formatNumber(tokenData.current_usage)} /{' '}
                {formatNumber(tokenData.token_limit)}
              </span>
              <span className="font-medium">{usagePercentage.toFixed(1)}%</span>
            </div>

            <Progress value={usagePercentage} variant={getUsageColor()} className="h-2" />

            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
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
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Token Usage Overview
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Monitor your token consumption and track usage patterns
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button onClick={loadTokenUsageData} variant="outline" size="sm" disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="error" title="Failed to Load Token Usage" onClose={clearError}>
          {error}
        </Alert>
      )}

      {/* Usage Alerts */}
      {usagePercentage >= 90 && (
        <Alert variant="error" title="Critical Usage Alert">
          <div className="space-y-2">
            <p>You have used {usagePercentage.toFixed(1)}% of your token limit!</p>
            <div className="flex space-x-2">
              <Button variant="primary" size="sm">
                Upgrade Plan
              </Button>
              <Button variant="outline" size="sm">
                Optimize Usage
              </Button>
            </div>
          </div>
        </Alert>
      )}
      {usagePercentage >= 75 && usagePercentage < 90 && (
        <Alert variant="warning" title="High Usage Warning">
          You have used {usagePercentage.toFixed(1)}% of your token limit. Consider monitoring
          usage more closely.
        </Alert>
      )}

      {/* Main Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Usage</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(tokenData.current_usage)}
                </p>
                <p className="text-xs text-gray-500">
                  of {formatNumber(tokenData.token_limit)} tokens
                </p>
              </div>
              <div className="ml-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    usagePercentage >= 90
                      ? 'bg-red-100 text-red-600'
                      : usagePercentage >= 75
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-green-100 text-green-600'
                  }`}
                >
                  <span className="text-lg font-bold">{Math.round(usagePercentage)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Today's Usage</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(tokenData.usage_today)}
                </p>
                <p className="text-xs text-gray-500">tokens used today</p>
              </div>
              <div className="ml-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Remaining Tokens</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(remainingTokens)}
                </p>
                <p className="text-xs text-gray-500">tokens remaining</p>
              </div>
              <div className="ml-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Usage Progress</h3>
            <Badge variant={getUsageColor()}>{getUsageStatus()}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Progress</span>
              <span className="text-sm text-gray-500">
                {formatNumber(tokenData.current_usage)} / {formatNumber(tokenData.token_limit)} tokens
              </span>
            </div>

            <Progress value={usagePercentage} variant={getUsageColor()} className="h-3" showLabel={false} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatNumber(tokenData.usage_today)}
                </div>
                <div className="text-xs text-gray-500">Today</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatNumber(tokenData.usage_this_week)}
                </div>
                <div className="text-xs text-gray-500">This Week</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatNumber(dailyAverage)}
                </div>
                <div className="text-xs text-gray-500">Daily Average</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{daysUntilReset}</div>
                <div className="text-xs text-gray-500">Days to Reset</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Usage Tips</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Optimize Conversations</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Use concise, clear messages to reduce token consumption while maintaining quality.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Monitor Patterns</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Track peak usage times and adjust your strategy accordingly.
                </p>
              </div>
            </div>
          </div>

          {tokenData.last_updated && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
