import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useAnalyticsStore } from '../../../store/analyticsStore';
import { useTheme } from '../../../app/providers';
import { apiClient } from '../../../lib/api';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Alert } from '../../../components/ui/Alert';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import toast from '@/lib/toast';
import { usePagination } from '../../../hooks/usePagination';
import { useDebounce } from '../../../hooks/useDebounce';
import { Modal } from '../../../components/ui/Modal';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../../components/ui/chart';
import { useIsMobile } from '../../../hooks/useMediaQuery';

const safeInitial = (v) =>
  typeof v === 'string' && v.length ? v.charAt(0).toUpperCase() : '?';

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const {
    isLoading: analyticsLoading,
    loadUsageAnalytics,
    getTopMetrics,
    clearError,
  } = useAnalyticsStore();

  // State
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [dateRange, setDateRange] = useState('30d');
  
  // Token renewal state
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedClientForToken, setSelectedClientForToken] = useState(null);
  const [tokenForm, setTokenForm] = useState({
    newTokenLimit: '',
    reason: ''
  });
  const [isRenewing, setIsRenewing] = useState(false);

  // Domain management state
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [selectedClientForDomain, setSelectedClientForDomain] = useState(null);
  const [domainSettings, setDomainSettings] = useState({
    domainWhitelist: [],
    domainBlacklist: [],
    domainMode: 'whitelist',
    requireDomainAuth: false
  });
  const [domain, setDomain] = useState('');
  const [isUpdatingDomain, setIsUpdatingDomain] = useState(false);

  // AI Persona state
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [selectedClientForPersona, setSelectedClientForPersona] = useState(null);
  const [personaFile, setPersonaFile] = useState(null);
  const [isUploadingPersona, setIsUploadingPersona] = useState(false);
  const [existingPersona, setExistingPersona] = useState(null);
  const [showPersonaContent, setShowPersonaContent] = useState(false);

  // Default Persona state (Layer 1)
  const [showDefaultPersonaModal, setShowDefaultPersonaModal] = useState(false);
  const [defaultPersonaFile, setDefaultPersonaFile] = useState(null);
  const [isUploadingDefaultPersona, setIsUploadingDefaultPersona] = useState(false);
  const [existingDefaultPersona, setExistingDefaultPersona] = useState(null);
  const [showDefaultPersonaContent, setShowDefaultPersonaContent] = useState(false);

  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Debug domain settings
  useEffect(() => {
    if (showDomainModal) {
      console.log('🔍 Domain modal opened with settings:', domainSettings);
    }
  }, [showDomainModal, domainSettings]);

  const normalizeClientRow = (item) => {
    // backend returns { client: {...}, usage_percentage, total_messages, active_users, ... }
    const c = item?.client ?? item ?? {};
    return {
      id: c.id || c._id || item.id,
      name: c.name || '',
      status: c.status || 'active',
      token_limit: c.token_limit ?? c.tokenLimit ?? 0,
      token_usage: c.token_used ?? c.tokenUsed ?? 0,
      message_count: item?.total_messages ?? 0,
      created_at: c.created_at || c.createdAt || c.created_at_iso || c.created_at_ts || null,
      last_activity: item?.last_activity || item?.lastActivity || null,
      usage_percentage: item?.usage_percentage ?? 0,
      email: c.email,
      username: c.username,
    };
  };

  // Filter and sort clients
  const filteredClients = clients
    .filter((client) => {
      const q = (debouncedSearchTerm || '').toLowerCase();
      const matchesSearch =
        !q ||
        (client.name || '').toLowerCase().includes(q) ||
        (client.username || '').toLowerCase().includes(q) ||
        (client.email || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'created_at' || sortBy === 'last_activity') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else {
        aVal = (aVal ?? '').toString().toLowerCase();
        bVal = (bVal ?? '').toString().toLowerCase();
      }

      if (sortOrder === 'asc') return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    });

  // Pagination
  const {
    paginatedData: paginatedClients,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
  } = usePagination(filteredClients, 10);

  // Load data on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        await loadDashboardData();
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load dashboard data:', error);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh analytics when date range changes
  useEffect(() => {
    if (dateRange) {
      loadUsageAnalytics({ period: dateRange }).catch(() => {});
    }
  }, [dateRange, loadUsageAnalytics]);

  const loadDashboardData = async () => {
    // Load analytics and clients independently so one failure doesn't block the other
    const analyticsPromise = loadUsageAnalytics({ period: dateRange }).catch((error) => {
      console.error('Failed to load usage analytics:', error);
      // Don't show toast for analytics failure, just log it
    });
    
    const clientsPromise = loadClients().catch((error) => {
      console.error('Failed to load clients in loadDashboardData:', error);
      // Error handling is done in loadClients itself
    });

    // Wait for both to complete (or fail)
    await Promise.allSettled([analyticsPromise, clientsPromise]);
  };

  const loadClients = async () => {
    try {
      setClientsLoading(true);
      setClientsError(null); // Clear any previous errors
      
      const response = await apiClient.getClients({
        page: 1,
        limit: 50,
        include_stats: true,
      });

      // Handle different response structures
      let rows = [];
      if (Array.isArray(response?.clients)) {
        rows = response.clients;
      } else if (Array.isArray(response)) {
        // Handle case where response is directly an array
        rows = response;
      } else if (response?.data && Array.isArray(response.data)) {
        // Handle nested data structure
        rows = response.data;
      }

      console.log('Loaded clients:', rows.length);
      setClients(rows.map(normalizeClientRow));
      setClientsError(null); // Clear error on success
    } catch (error) {
      console.error('Failed to load clients:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load clients';
      setClientsError(errorMessage);
      setClients([]); // Clear clients on error
      toast.error(`Failed to load clients: ${errorMessage}`);
    } finally {
      setClientsLoading(false);
    }
  };

  const handleClientAction = async (clientId, action) => {
    try {
      console.log(`🔄 ${action} client ${clientId}`);
      switch (action) {
        case 'activate':
          const activateResult = await apiClient.updateClient(clientId, { status: 'active' });
          console.log('✅ Activate result:', activateResult);
          toast.success('Client activated successfully');
          break;
        case 'deactivate':
          const deactivateResult = await apiClient.updateClient(clientId, { status: 'inactive' });
          console.log('✅ Deactivate result:', deactivateResult);
          toast.success('Client deactivated successfully');
          break;
        case 'delete':
          if (!window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
            return;
          }
          await apiClient.deleteClient(clientId);
          toast.success('Client deleted successfully');
          break;
        default:
          return;
      }
      console.log('🔄 Reloading clients...');
      await loadClients();
      console.log('✅ Clients reloaded');
    } catch (error) {
      console.error(`❌ Failed to ${action} client:`, error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      toast.error(`Failed to ${action} client: ${error.message}`);
    }
  };

  // Handle token renewal
// In your AdminDashboard.jsx, change the handleTokenRenewal function:
const handleTokenRenewal = async (clientId) => {
  if (!tokenForm.newTokenLimit) {
    toast.error('Please enter a new token limit');
    return;
  }

  const newLimit = parseInt(tokenForm.newTokenLimit);
  if (isNaN(newLimit) || newLimit < 1000) {
    toast.error('Please enter a valid token limit (minimum 1000)');
    return;
  }

  try {
    setIsRenewing(true);
    
    // Fix: Use exact field names that backend expects
    const requestData = {
      new_token_limit: newLimit,  // Exact field name expected by backend
      reason: tokenForm.reason || '',  // Exact field name expected by backend
      admin_user_id: user?.id || ''  // Optional: include admin user ID if available
    };
    
    console.log('Sending exact payload to backend:', requestData);
    
    await apiClient.resetClientTokens(clientId, requestData);
    
    toast.success('Client tokens reset successfully');
    setShowTokenModal(false);
    setTokenForm({ newTokenLimit: '', reason: '' });
    await loadClients();
  } catch (error) {
    console.error('Failed to reset tokens:', error);
    console.error('Error response details:', error.response?.data);
    toast.error(error.response?.data?.message || 'Failed to reset tokens');
  } finally {
    setIsRenewing(false);
  }
};

// Handle domain management
const handleDomainManagement = async (clientId) => {
  try {
    console.log('🔍 Loading domain settings for client:', clientId);
    setSelectedClientForDomain(clientId);
    
    // Fetch current domain settings
    const response = await apiClient.getClientDomains(clientId);
    console.log('📋 Domain settings response:', response);
    
    setDomainSettings({
      domainWhitelist: response.domain_whitelist || [],
      domainBlacklist: response.domain_blacklist || [],
      domainMode: response.domain_mode || 'whitelist',
      requireDomainAuth: response.require_domain_auth || false
    });
    
    setShowDomainModal(true);
  } catch (error) {
    console.error('Failed to load domain settings:', error);
    toast.error('Failed to load domain settings');
  }
};

// Handle domain settings update
const handleDomainUpdate = async () => {
  if (!selectedClientForDomain) return;
  
  try {
    setIsUpdatingDomain(true);
    
    // Prepare the request data in the correct format
    const requestData = {
      client_id: selectedClientForDomain,
      domain_whitelist: domainSettings.domainWhitelist,
      domain_blacklist: domainSettings.domainBlacklist,
      domain_mode: domainSettings.domainMode,
      require_domain_auth: domainSettings.requireDomainAuth
    };
    
    console.log('🔧 Updating domain settings:', requestData);
    await apiClient.updateClientDomains(selectedClientForDomain, requestData);
    
    toast.success('Domain settings updated successfully');
    setShowDomainModal(false);
    setSelectedClientForDomain(null);
  } catch (error) {
    console.error('Failed to update domain settings:', error);
    toast.error('Failed to update domain settings');
  } finally {
    setIsUpdatingDomain(false);
  }
};

// Add domain to list
const addDomainToList = (listType) => {
  if (domain && domain.trim()) {
    // Normalize domain properly
    let normalizedDomain = domain.trim().toLowerCase();
    
    // Remove protocol
    normalizedDomain = normalizedDomain.replace(/^https?:\/\//, '');
    
    // Remove path
    normalizedDomain = normalizedDomain.split('/')[0];
    
    // Remove port
    normalizedDomain = normalizedDomain.split(':')[0];
    
    // Remove www prefix
    normalizedDomain = normalizedDomain.replace(/^www\./, '');
    
    // Handle localhost vs 127.0.0.1
    if (normalizedDomain === '127.0.0.1') {
      normalizedDomain = 'localhost';
    }
    
    console.log('🔧 Normalizing domain:', domain, '->', normalizedDomain);
    
    // Check if domain already exists in either list
    const existsInWhitelist = domainSettings.domainWhitelist.includes(normalizedDomain);
    const existsInBlacklist = domainSettings.domainBlacklist.includes(normalizedDomain);
    
    if (existsInWhitelist || existsInBlacklist) {
      toast.error('Domain already exists in a list');
      return;
    }
    
    setDomainSettings(prev => ({
      ...prev,
      [listType]: [...prev[listType], normalizedDomain]
    }));
    
    // Clear the input field
    setDomain('');
    toast.success(`Domain added to ${listType === 'domainWhitelist' ? 'whitelist' : 'blacklist'}`);
  } else {
    toast.error('Please enter a valid domain');
  }
};

// Remove domain from list
const removeDomainFromList = (listType, index) => {
  setDomainSettings(prev => ({
    ...prev,
    [listType]: prev[listType].filter((_, i) => i !== index)
  }));
};

// Load existing persona when modal opens
const loadExistingPersona = async (clientId) => {
  try {
    const response = await apiClient.getAIPersona(clientId);
    console.log('Loaded AI Persona data:', response.ai_persona);
    setExistingPersona(response.ai_persona);
  } catch (error) {
    console.error('Failed to load existing persona:', error);
    setExistingPersona(null);
  }
};

// Handle AI Persona upload
const handleAIPersonaUpload = async () => {
  if (!selectedClientForPersona || !personaFile) {
    toast.error('Please select a file to upload');
    return;
  }

  // Validate file type - support PDF, DOC, DOCX, TXT
  const allowedTypes = ['pdf', 'doc', 'docx', 'txt'];
  const fileName = personaFile.name.toLowerCase();
  const fileExtension = fileName.split('.').pop();
  
  // Also check MIME type as fallback
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  const isValidExtension = allowedTypes.includes(fileExtension);
  const isValidMimeType = personaFile.type && allowedMimeTypes.includes(personaFile.type.toLowerCase());
  
  if (!isValidExtension && !isValidMimeType) {
    toast.error('Please upload a .pdf, .doc, .docx, or .txt file');
    return;
  }

  try {
    setIsUploadingPersona(true);
    await apiClient.uploadAIPersona(selectedClientForPersona.id, personaFile);
    toast.success('AI Persona uploaded successfully');
    await loadExistingPersona(selectedClientForPersona.id);
    setPersonaFile(null);
  } catch (error) {
    console.error('Failed to upload AI Persona:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to upload AI Persona';
    toast.error(errorMessage);
  } finally {
    setIsUploadingPersona(false);
  }
};

// Handle opening persona modal with existing data
const handleOpenPersonaModal = async (client) => {
  setSelectedClientForPersona(client);
  setShowPersonaModal(true);
  await loadExistingPersona(client.id);
};

// Load default persona
const loadDefaultPersona = async () => {
  try {
    const response = await apiClient.getDefaultPersona();
    console.log('Loaded Default Persona data:', response.default_persona);
    setExistingDefaultPersona(response.default_persona);
  } catch (error) {
    console.error('Failed to load default persona:', error);
    setExistingDefaultPersona(null);
  }
};

// Handle Default Persona upload
const handleDefaultPersonaUpload = async () => {
  if (!defaultPersonaFile) {
    toast.error('Please select a file to upload');
    return;
  }

  // Validate file type - support PDF, DOC, DOCX, TXT
  const allowedTypes = ['pdf', 'doc', 'docx', 'txt'];
  const fileName = defaultPersonaFile.name.toLowerCase();
  const fileExtension = fileName.split('.').pop();
  
  // Also check MIME type as fallback
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  const isValidExtension = allowedTypes.includes(fileExtension);
  const isValidMimeType = defaultPersonaFile.type && allowedMimeTypes.includes(defaultPersonaFile.type.toLowerCase());
  
  if (!isValidExtension && !isValidMimeType) {
    toast.error('Please upload a .pdf, .doc, .docx, or .txt file');
    return;
  }

  try {
    setIsUploadingDefaultPersona(true);
    await apiClient.uploadDefaultPersona(defaultPersonaFile);
    toast.success('Default Persona uploaded successfully');
    await loadDefaultPersona();
    setDefaultPersonaFile(null);
  } catch (error) {
    console.error('Failed to upload Default Persona:', error);
    toast.error(error.response?.data?.message || 'Failed to upload Default Persona');
  } finally {
    setIsUploadingDefaultPersona(false);
  }
};

  const getStatusVariant = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'suspended':
        return 'danger';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('en-US').format(number || 0);
  };

  const topMetrics = getTopMetrics();

  // Calculate inactive users from clients
  const inactiveUsers = useMemo(() => {
    return clients.filter(client => client.status === 'inactive' || client.status === 'Inactive').length;
  }, [clients]);

  // Calculate active and deactive clients
  const activeClients = useMemo(() => {
    return clients.filter(client => client.status === 'active' || client.status === 'Active').length;
  }, [clients]);

  const deactiveClients = useMemo(() => {
    return clients.filter(client => 
      client.status === 'inactive' || 
      client.status === 'Inactive' || 
      client.status === 'suspended' ||
      client.status === 'Suspended'
    ).length;
  }, [clients]);

  // Get computed CSS variable values for charts
  const getComputedColor = useCallback((varName) => {
    if (typeof window === 'undefined') return '#3b82f6';
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#3b82f6';
  }, []);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!topMetrics) return null;

    const totalTokens = topMetrics.totalTokens?.value || 0;
    const totalMessages = topMetrics.totalMessages?.value || 0;
    const activeUsers = topMetrics.activeUsers?.value || 0;

    return [
      {
        name: 'Total Tokens Used',
        value: totalTokens,
        fill: getComputedColor('--color-chart-1'),
      },
      {
        name: 'Messages Sent',
        value: totalMessages,
        fill: getComputedColor('--color-chart-2'),
      },
      {
        name: 'Active Users',
        value: activeUsers,
        fill: getComputedColor('--color-chart-3'),
      },
      {
        name: 'Inactive Users',
        value: inactiveUsers,
        fill: getComputedColor('--color-chart-4'),
      },
    ];
  }, [topMetrics, inactiveUsers, getComputedColor, resolvedTheme]);

  const chartConfig = useMemo(() => {
    return {
      value: {
        label: 'Value',
      },
      'Total Tokens Used': {
        label: 'Total Tokens Used',
        color: getComputedColor('--color-chart-1'),
      },
      'Messages Sent': {
        label: 'Messages Sent',
        color: getComputedColor('--color-chart-2'),
      },
      'Active Users': {
        label: 'Active Users',
        color: getComputedColor('--color-chart-3'),
      },
      'Inactive Users': {
        label: 'Inactive Users',
        color: getComputedColor('--color-chart-4'),
      },
    };
  }, [getComputedColor, resolvedTheme]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {user?.name || user?.username || 'Admin'}.
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3 sm:space-x-3">
          <Select
            value={dateRange}
            onChange={setDateRange}
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
              { value: '1y', label: 'Last year' },
            ]}
            className="w-full sm:w-40"
          />
          <Link to="/admin/clients/new">
            <Button 
              variant="primary" 
              className="min-w-[120px] whitespace-nowrap flex-shrink-0"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Client
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      {analyticsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : topMetrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(topMetrics)
            .filter(([key]) => key !== 'activeUsers') // Remove Active Users card
            .map(([key, metric]) => {
              // Replace avgResponseTime with separate Active and Deactive Clients cards
              if (key === 'avgResponseTime') {
                return (
                  <React.Fragment key={key}>
                    {/* Active Clients Card */}
                    <Card hover>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-muted-foreground">Active Clients</p>
                            <p className="text-2xl font-semibold text-primary mt-1">
                              {formatNumber(activeClients)}
                            </p>
                          </div>
                          <div className="ml-4">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {/* Deactive Clients Card */}
                    <Card hover>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-muted-foreground">Deactive Clients</p>
                            <p className="text-2xl font-semibold text-destructive mt-1">
                              {formatNumber(deactiveClients)}
                            </p>
                          </div>
                          <div className="ml-4">
                            <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </React.Fragment>
                );
              }
              
              // Default metric display
              return (
                <Card key={key} hover>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                        <p className="text-2xl font-semibold text-foreground">
                          {formatNumber(metric.value)}
                        </p>
                        {metric.change !== undefined && (
                          <p
                            className={`text-sm ${
                              metric.change > 0
                                ? 'text-primary'
                                : metric.change < 0
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {metric.change > 0 ? '↗' : metric.change < 0 ? '↘' : '→'}{' '}
                            {Math.abs(metric.change).toFixed(1)}%
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          {key === 'totalTokens' && (
                            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          )}
                          {key === 'totalMessages' && (
                            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      ) : (
        <Alert variant="info">
          <span>No analytics data available. Data will appear as clients start using the platform.</span>
        </Alert>
      )}

      {/* Beautiful Charts & Graphs */}
      {chartData && (
        <Card>
          <CardHeader>
            <h3 className="text-base sm:text-lg font-medium text-foreground">Beautiful Charts & Graphs</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Visual representation of key metrics and usage statistics
            </p>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Bar Chart */}
              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-xs sm:text-sm font-medium text-foreground">Metrics Overview (Bar Chart)</h4>
                <div className="w-full overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                  <ChartContainer config={chartConfig} className={isMobile ? "h-[250px] min-w-[300px]" : "h-[300px]"}>
                    <BarChart 
                      data={chartData} 
                      margin={{ 
                        top: isMobile ? 10 : 20, 
                        right: isMobile ? 8 : 30, 
                        left: isMobile ? 8 : 20, 
                        bottom: isMobile ? 60 : 80 
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={getComputedColor('--color-border')} opacity={0.3} />
                      <XAxis 
                        dataKey="name" 
                        angle={isMobile ? -45 : -45}
                        textAnchor={isMobile ? "end" : "end"}
                        height={isMobile ? 60 : 80}
                        tick={{ 
                          fontSize: isMobile ? 10 : 12, 
                          fill: getComputedColor('--color-muted-foreground') 
                        }}
                        interval={isMobile ? "preserveStartEnd" : 0}
                      />
                      <YAxis 
                        width={isMobile ? 35 : 50}
                        tick={{ 
                          fontSize: isMobile ? 10 : 12, 
                          fill: getComputedColor('--color-muted-foreground') 
                        }} 
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>

              {/* Area Chart */}
              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-xs sm:text-sm font-medium text-foreground">Metrics Trend (Area Chart)</h4>
                <div className="w-full overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                  <ChartContainer config={chartConfig} className={isMobile ? "h-[250px] min-w-[300px]" : "h-[300px]"}>
                    <AreaChart 
                      data={chartData} 
                      margin={{ 
                        top: isMobile ? 10 : 20, 
                        right: isMobile ? 8 : 30, 
                        left: isMobile ? 8 : 20, 
                        bottom: isMobile ? 60 : 80 
                      }}
                    >
                      <defs>
                        <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartData[0]?.fill || '#3b82f6'} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={chartData[0]?.fill || '#3b82f6'} stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartData[1]?.fill || '#10b981'} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={chartData[1]?.fill || '#10b981'} stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorActiveUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartData[2]?.fill || '#f59e0b'} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={chartData[2]?.fill || '#f59e0b'} stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorInactiveUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartData[3]?.fill || '#ef4444'} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={chartData[3]?.fill || '#ef4444'} stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={getComputedColor('--color-border')} opacity={0.3} />
                      <XAxis 
                        dataKey="name" 
                        angle={isMobile ? -45 : -45}
                        textAnchor={isMobile ? "end" : "end"}
                        height={isMobile ? 60 : 80}
                        tick={{ 
                          fontSize: isMobile ? 10 : 12, 
                          fill: getComputedColor('--color-muted-foreground') 
                        }}
                        interval={isMobile ? "preserveStartEnd" : 0}
                      />
                      <YAxis 
                        width={isMobile ? 35 : 50}
                        tick={{ 
                          fontSize: isMobile ? 10 : 12, 
                          fill: getComputedColor('--color-muted-foreground') 
                        }} 
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={chartData[0]?.fill || '#3b82f6'}
                        fillOpacity={1}
                        fill="url(#colorTokens)"
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clients Management */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <h3 className="text-lg font-medium text-foreground">Client Management</h3>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 h-10"
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
              <Button
                onClick={() => {
                  setShowDefaultPersonaModal(true);
                  loadDefaultPersona();
                }}
                variant="outline"
                size="md"
                className="w-full sm:w-auto whitespace-nowrap text-accent border-accent/30 hover:bg-accent/10 hover:border-accent/50 h-10"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Default Persona
              </Button>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'suspended', label: 'Suspended' },
                ]}
                className="w-full sm:w-40 h-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clientsError ? (
            <Alert variant="error" title="Error Loading Clients">
              {clientsError}
              <Button onClick={loadClients} className="ml-4" size="sm">
                Retry
              </Button>
            </Alert>
          ) : clientsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : paginatedClients.length > 0 ? (
            <div className="space-y-4">
              <div className="shadow ring-1 ring-black ring-opacity-5 rounded-lg overflow-x-scroll">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button
                          onClick={() => {
                            setSortBy('name');
                            setSortOrder(sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                          className="flex items-center hover:text-foreground"
                        >
                          Client
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                        </button>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Token Usage</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>
                        <button
                          onClick={() => {
                            setSortBy('created_at');
                            setSortOrder(sortBy === 'created_at' && sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                          className="flex items-center hover:text-foreground"
                        >
                          Created
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                        </button>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {safeInitial(client.name)}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-foreground">
                                {client.name || '—'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {client.username || client.email || ''}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(client.status)}>{client.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {formatNumber(client.token_usage)} / {formatNumber(client.token_limit)}
                            </div>
                            <div className="w-full bg-muted rounded-full h-1 mt-1">
                              <div
                                className="bg-primary h-1 rounded-full"
                                style={{
                                  width: `${Math.min(
                                    ((client.token_usage || 0) / Math.max(client.token_limit || 0, 1)) * 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                            {client.usage_percentage > 90 && (
                              <div className="text-xs text-destructive mt-1">
                                {client.usage_percentage.toFixed(1)}% used
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{formatNumber(client.message_count)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{formatDate(client.created_at)}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {client.status === 'active' ? (
                              <Button
                                onClick={() => handleClientAction(client.id, 'deactivate')}
                                variant="outline"
                                size="sm"
                              >
                                Deactivate
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleClientAction(client.id, 'activate')}
                                variant="outline"
                                size="sm"
                              >
                                Activate
                              </Button>
                            )}
                            <Button
                              onClick={() => {
                                setSelectedClientForToken(client);
                                setShowTokenModal(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                            >
                              Renew Tokens
                            </Button>
                            <Button
                              onClick={() => handleDomainManagement(client.id)}
                              variant="outline"
                              size="sm"
                              className="text-accent border-accent/30 hover:bg-accent/10 hover:border-accent/50"
                            >
                              Access Domain
                            </Button>
                            <Button
                              onClick={() => handleOpenPersonaModal(client)}
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                            >
                              AI Persona
                            </Button>
                            <Link to={`/admin/clients/${client.id}/edit`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                              >
                                Edit
                              </Button>
                            </Link>
                            <Button
                              onClick={() => handleClientAction(client.id, 'delete')}
                              variant="destructive"
                              size="sm"
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, filteredClients.length)} of{' '}
                    {filteredClients.length} clients
                  </p>
                  <div className="flex space-x-2">
                    <Button onClick={prevPage} disabled={!hasPrevPage} variant="outline" size="sm">
                      Previous
                    </Button>
                    <span className="flex items-center px-3 py-1 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button onClick={nextPage} disabled={!hasNextPage} variant="outline" size="sm">
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-medium text-foreground mb-2">No clients found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No clients match your search criteria.' : 'Get started by creating your first client.'}
              </p>
              <Link to="/admin/clients/new">
                <Button variant="primary">Create First Client</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Renewal Modal */}
      <Modal
        isOpen={showTokenModal}
        onClose={() => {
          setShowTokenModal(false);
          setSelectedClientForToken(null);
          setTokenForm({ newTokenLimit: '', reason: '' });
        }}
        title="Reset Client Tokens"
      >
        {selectedClientForToken && (
          <div className="space-y-4">
            <div className="bg-card border border-border p-4 rounded-lg">
              <h4 className="font-medium text-foreground">Client: {selectedClientForToken.name}</h4>
              <p className="text-sm text-muted-foreground">
                Current limit: {formatNumber(selectedClientForToken.token_limit)} | 
                Current usage: {formatNumber(selectedClientForToken.token_usage)}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                New Token Limit
              </label>
<Input
  type="number"
  placeholder="Enter new token limit (minimum 1000)"
  value={tokenForm.newTokenLimit}
  onChange={(e) => setTokenForm({...tokenForm, newTokenLimit: e.target.value})}
  min="1000"
  required
/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Reason for Reset
              </label>
              <Input
                placeholder="Why are you resetting tokens?"
                value={tokenForm.reason}
                onChange={(e) => setTokenForm({...tokenForm, reason: e.target.value})}
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTokenModal(false);
                  setSelectedClientForToken(null);
                  setTokenForm({ newTokenLimit: '', reason: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleTokenRenewal(selectedClientForToken.id)}
                disabled={isRenewing}
              >
                {isRenewing ? 'Resetting...' : 'Reset Tokens'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Domain Management Modal */}
      <Modal
        isOpen={showDomainModal}
        onClose={() => {
          setShowDomainModal(false);
          setSelectedClientForDomain(null);
          setDomain('');
          setDomainSettings({
            domainWhitelist: [],
            domainBlacklist: [],
            domainMode: 'whitelist',
            requireDomainAuth: false
          });
        }}
        title="Domain Access Management"
      >
        {selectedClientForDomain && (
          <div className="space-y-6">
            <div className="bg-card border border-border p-4 rounded-lg">
              <h4 className="font-medium text-foreground">Client: {selectedClientForDomain}</h4>
              <p className="text-sm text-muted-foreground">
                Configure which domains are allowed to embed your chat widget
              </p>
            </div>

            {/* Domain Authorization Toggle */}
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={domainSettings.requireDomainAuth}
                  onChange={(e) => setDomainSettings(prev => ({
                    ...prev,
                    requireDomainAuth: e.target.checked
                  }))}
                  className="w-4 h-4 text-accent border-border rounded focus:ring-ring"
                />
                <span className="text-sm font-medium text-foreground">
                  Enable Domain Authorization
                </span>
              </label>
              <p className="text-xs text-muted-foreground">
                When enabled, only whitelisted domains can embed your chat widget
              </p>
            </div>

            {domainSettings.requireDomainAuth && (
              <>
                {/* Domain Mode Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">
                    Domain Mode
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="whitelist"
                        checked={domainSettings.domainMode === 'whitelist'}
                        onChange={(e) => setDomainSettings(prev => ({
                          ...prev,
                          domainMode: e.target.value
                        }))}
                        className="w-4 h-4 text-accent border-border focus:ring-ring"
                      />
                      <span className="text-sm text-foreground">Whitelist (Allow only listed domains)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="blacklist"
                        checked={domainSettings.domainMode === 'blacklist'}
                        onChange={(e) => setDomainSettings(prev => ({
                          ...prev,
                          domainMode: e.target.value
                        }))}
                        className="w-4 h-4 text-accent border-border focus:ring-ring"
                      />
                      <span className="text-sm text-foreground">Blacklist (Block listed domains)</span>
                    </label>
                  </div>
                </div>

                {/* Domain Input */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">
                    Add Domain
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Enter domain (e.g., example.com)"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addDomainToList('domainWhitelist');
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
                    />
                    <button
                      onClick={() => addDomainToList('domainWhitelist')}
                      className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-md border-2 border-primary/30 text-primary hover:bg-accent/90 hover:border-primary/50 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105"
                      title="Add to Whitelist"
                    >
                      <span className="text-lg font-light">+</span>
                    </button>
                    <button
                      onClick={() => addDomainToList('domainBlacklist')}
                      className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-md border-2 border-rose-200/50 text-rose-500 hover:bg-accent/90 hover:border-rose-300/70 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105"
                      title="Add to Blacklist"
                    >
                      <span className="text-lg font-light">×</span>
                    </button>
                  </div>
                </div>

                {/* Domain Lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Whitelist */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium text-foreground">
                        {domainSettings.domainMode === 'whitelist' ? 'Allowed Domains' : 'Whitelist (Backup)'}
                      </h5>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {domainSettings.domainWhitelist.map((domain, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                          <span className="text-sm text-foreground">{domain}</span>
                          <Button
                            onClick={() => removeDomainFromList('domainWhitelist', index)}
                            variant="destructive"
                            size="sm"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      {domainSettings.domainWhitelist.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">No domains added</p>
                      )}
                    </div>
                  </div>

                  {/* Blacklist */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium text-foreground">
                        {domainSettings.domainMode === 'blacklist' ? 'Blocked Domains' : 'Blacklist (Backup)'}
                      </h5>
                      <Button
                        onClick={() => addDomainToList('domainBlacklist')}
                        variant="destructive"
                        size="sm"
                      >
                        + Add
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {domainSettings.domainBlacklist.map((domain, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                          <span className="text-sm text-foreground">{domain}</span>
                          <Button
                            onClick={() => removeDomainFromList('domainBlacklist', index)}
                            variant="destructive"
                            size="sm"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      {domainSettings.domainBlacklist.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">No domains added</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Help Text */}
                <div className="bg-card border border-border p-3 rounded-lg">
                  <p className="text-xs text-foreground">
                    <strong>Note:</strong> Domain authorization helps prevent unauthorized embedding of your chat widget. 
                    Unauthorized access attempts will be logged and can be viewed in the Alerts section.
                  </p>
                </div>
              </>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDomainModal(false);
                  setSelectedClientForDomain(null);
                  setDomain('');
                  setDomainSettings({
                    domainWhitelist: [],
                    domainBlacklist: [],
                    domainMode: 'whitelist',
                    requireDomainAuth: false
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDomainUpdate}
                disabled={isUpdatingDomain}
                className="bg-primary hover:opacity-90"
              >
                {isUpdatingDomain ? 'Updating...' : 'Update Settings'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* AI Persona Modal */}
      <Modal
        isOpen={showPersonaModal}
        onClose={() => {
          setShowPersonaModal(false);
          setSelectedClientForPersona(null);
          setPersonaFile(null);
          setExistingPersona(null);
          setShowPersonaContent(false);
        }}
        title="Configure AI Persona"
      >
        {selectedClientForPersona && (
          <div className="space-y-4">
            <div className="bg-card border border-border p-4 rounded-lg">
              <h4 className="font-medium text-foreground">Client: {selectedClientForPersona.name}</h4>
              <p className="text-sm text-muted-foreground">
                Upload a PDF, DOC, DOCX, or TXT file to customize the AI's personality and response style for this client. 
                The AI will provide advice, answers, and guidance based on the content of this file.
              </p>
            </div>

            {/* Existing Persona Display */}
            {existingPersona && (
              <div className="bg-card border border-border p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-foreground">Existing Persona File</p>
                      <p className="text-xs text-muted-foreground">
                        {existingPersona?.filename || 'Uploaded file'}
                        {(existingPersona?.size && (
                          <span className="ml-2">
                            ({((existingPersona.size / 1024 / 1024).toFixed(2))} MB)
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowPersonaContent(!showPersonaContent)}
                      className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-md border-2 border-primary/30 text-primary hover:bg-accent/90 hover:border-primary/50 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105"
                      title={showPersonaContent ? 'Hide Content' : 'View Content'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this AI Persona?')) {
                          try {
                            await apiClient.deleteAIPersona(selectedClientForPersona.id);
                            toast.success('AI Persona deleted successfully');
                            setExistingPersona(null);
                          } catch (error) {
                            console.error('Failed to delete AI Persona:', error);
                            toast.error(error.response?.data?.message || 'Failed to delete AI Persona');
                          }
                        }
                      }}
                      className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-md border-2 border-rose-200/50 text-rose-500 hover:bg-accent/90 hover:border-rose-300/70 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105"
                      title="Delete Persona"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {showPersonaContent && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="bg-card p-3 rounded text-xs text-foreground space-y-3">
                      <div>
                        <p className="font-medium mb-2">File Details:</p>
                        <p><strong>Filename:</strong> {existingPersona?.filename || 'N/A'}</p>
                        {existingPersona?.size ? (
                          <p><strong>Size:</strong> {((existingPersona.size / 1024 / 1024).toFixed(2))} MB</p>
                        ) : null}
                        {existingPersona?.uploaded_at ? (
                          <p><strong>Uploaded:</strong> {new Date(existingPersona.uploaded_at).toLocaleString()}</p>
                        ) : null}
                        {existingPersona?.word_count ? (
                          <p><strong>Words:</strong> {existingPersona.word_count.toLocaleString()}</p>
                        ) : null}
                        {existingPersona?.character_count ? (
                          <p><strong>Characters:</strong> {existingPersona.character_count.toLocaleString()}</p>
                        ) : null}
                        {existingPersona?.pages ? (
                          <p><strong>Pages:</strong> {existingPersona.pages}</p>
                        ) : null}
                      </div>

                      {existingPersona?.content ? (
                        <div className="border-t border-border pt-3">
                          <p className="font-medium mb-2">Extracted Content:</p>
                          <div className="bg-muted/50 p-3 rounded max-h-60 overflow-y-auto text-xs">
                            <pre className="whitespace-pre-wrap text-foreground">
                              {existingPersona.content.length > 5000
                                ? existingPersona.content.substring(0, 5000) + '...\n\n[Content truncated - ' + existingPersona.content.length.toLocaleString() + ' characters total]'
                                : existingPersona.content
                              }
                            </pre>
                          </div>
                          {existingPersona.content.length > 5000 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Showing first 5,000 characters. Full content stored in database.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="border-t border-gray-200 pt-3">
                          <p className="text-sm text-gray-500 italic">No content extracted from this file.</p>
                        </div>
                      )}
                      
                      <p className="text-gray-600 italic">
                        Note: This content will be used by the AI to provide personalized responses.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {existingPersona ? 'Replace Persona File (PDF, DOC, DOCX, or TXT)' : 'Select File (PDF, DOC, DOCX, or TXT)'}
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPersonaFile(file);
                  }
                }}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary/10 file:text-primary
                  hover:file:bg-primary/20
                  dark:file:bg-primary/20 dark:file:text-primary"
                style={{ cursor: 'pointer' }}
              />
              {personaFile && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Selected: {personaFile.name}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground italic">
                Note: If files don't appear, try selecting "All Files" from the file type dropdown in the file picker.
              </p>
            </div>
            
            <div className="bg-card border border-border p-3 rounded-lg">
              <p className="text-xs text-foreground">
                <strong>How it works:</strong> Upload a document that describes how you want the AI to respond. 
                For example, if you upload a company policy document, the AI will respond according to those policies. 
                If you upload a training manual, the AI will provide guidance based on that manual's content.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPersonaModal(false);
                  setSelectedClientForPersona(null);
                  setPersonaFile(null);
                  setExistingPersona(null);
                  setShowPersonaContent(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAIPersonaUpload}
                disabled={isUploadingPersona || !personaFile}
                className="bg-primary hover:opacity-90"
              >
                {isUploadingPersona ? 'Uploading...' : 'Upload AI Persona'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Default Persona Modal (Layer 1) */}
      <Modal
        isOpen={showDefaultPersonaModal}
        onClose={() => {
          setShowDefaultPersonaModal(false);
          setDefaultPersonaFile(null);
          setExistingDefaultPersona(null);
          setShowDefaultPersonaContent(false);
        }}
        title="Default Persona (Layer 1)"
        size="lg"
      >
        <div className="space-y-4">
            <div className="bg-card border border-border p-3 rounded-lg">
              <p className="text-xs text-foreground">
                <strong>Layer 1 - Default Persona:</strong> This persona will be automatically applied to all clients who haven't uploaded their own persona (Layer 2). 
                Upload a default personality/behavior document that will serve as the base for all clients.
              </p>
            </div>

            {/* Existing Default Persona Display */}
            {existingDefaultPersona && (
              <div className="bg-card border border-border p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-foreground">Existing Default Persona File</p>
                      <p className="text-xs text-muted-foreground">
                        {existingDefaultPersona?.filename || 'Uploaded file'}
                        {(existingDefaultPersona?.size && (
                          <span className="ml-2">
                            ({((existingDefaultPersona.size / 1024 / 1024).toFixed(2))} MB)
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowDefaultPersonaContent(!showDefaultPersonaContent)}
                      className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-md border-2 border-primary/30 text-primary hover:bg-accent/90 hover:border-primary/50 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105"
                      title={showDefaultPersonaContent ? 'Hide Content' : 'View Content'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete the Default Persona? This will affect all clients without their own persona.')) {
                          try {
                            await apiClient.deleteDefaultPersona();
                            toast.success('Default Persona deleted successfully');
                            setExistingDefaultPersona(null);
                          } catch (error) {
                            console.error('Failed to delete Default Persona:', error);
                            toast.error(error.response?.data?.message || 'Failed to delete Default Persona');
                          }
                        }
                      }}
                      className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-md border-2 border-rose-200/50 text-rose-500 hover:bg-accent/90 hover:border-rose-300/70 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105"
                      title="Delete Default Persona"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {showDefaultPersonaContent && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="bg-card p-3 rounded text-xs text-foreground space-y-3">
                      <div>
                        <p className="font-medium mb-2">File Details:</p>
                        <p><strong>Filename:</strong> {existingDefaultPersona?.filename || 'N/A'}</p>
                        {existingDefaultPersona?.size ? (
                          <p><strong>Size:</strong> {((existingDefaultPersona.size / 1024 / 1024).toFixed(2))} MB</p>
                        ) : null}
                        {existingDefaultPersona?.uploaded_at ? (
                          <p><strong>Uploaded:</strong> {new Date(existingDefaultPersona.uploaded_at).toLocaleString()}</p>
                        ) : null}
                        {existingDefaultPersona?.word_count ? (
                          <p><strong>Words:</strong> {existingDefaultPersona.word_count.toLocaleString()}</p>
                        ) : null}
                        {existingDefaultPersona?.character_count ? (
                          <p><strong>Characters:</strong> {existingDefaultPersona.character_count.toLocaleString()}</p>
                        ) : null}
                        {existingDefaultPersona?.pages ? (
                          <p><strong>Pages:</strong> {existingDefaultPersona.pages}</p>
                        ) : null}
                      </div>

                      {existingDefaultPersona?.content ? (
                        <div className="border-t border-border pt-3">
                          <p className="font-medium mb-2">Extracted Content:</p>
                          <div className="bg-muted/50 p-3 rounded max-h-60 overflow-y-auto text-xs">
                            <pre className="whitespace-pre-wrap text-foreground">
                              {existingDefaultPersona.content.length > 5000
                                ? existingDefaultPersona.content.substring(0, 5000) + '...\n\n[Content truncated - ' + existingDefaultPersona.content.length.toLocaleString() + ' characters total]'
                                : existingDefaultPersona.content
                              }
                            </pre>
                          </div>
                          {existingDefaultPersona.content.length > 5000 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Showing first 5,000 characters. Full content stored in database.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="border-t border-gray-200 pt-3">
                          <p className="text-sm text-gray-500 italic">No content extracted from this file.</p>
                        </div>
                      )}
                      
                      <p className="text-gray-600 italic">
                        Note: This default persona will be used for all clients who haven't uploaded their own persona.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {existingDefaultPersona ? 'Replace Default Persona File (PDF, DOC, DOCX, or TXT)' : 'Select File (PDF, DOC, DOCX, or TXT)'}
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setDefaultPersonaFile(e.target.files[0])}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-accent/10 file:text-accent
                  hover:file:bg-accent/20
                  dark:file:bg-accent/20 dark:file:text-accent"
              />
              {defaultPersonaFile && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Selected: {defaultPersonaFile.name}
                </p>
              )}
            </div>
            
            <div className="bg-card border border-border p-3 rounded-lg">
              <p className="text-xs text-foreground">
                <strong>How it works:</strong> Upload a default document that defines the base personality and behavior for all chatbots. 
                Clients without their own persona (Layer 2) will automatically use this default persona (Layer 1).
              </p>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDefaultPersonaModal(false);
                  setDefaultPersonaFile(null);
                  setExistingDefaultPersona(null);
                  setShowDefaultPersonaContent(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDefaultPersonaUpload}
                disabled={isUploadingDefaultPersona || !defaultPersonaFile}
                className="bg-primary hover:opacity-90"
              >
                {isUploadingDefaultPersona ? 'Uploading...' : 'Upload Default Persona'}
              </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export { AdminDashboard };
export default AdminDashboard;