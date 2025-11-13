import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../../store/authStore';
import { apiClient } from '../../../lib/api';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Alert } from '../../../components/ui/Alert';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Input } from '../../../components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Checkbox } from '../../../components/ui/checkbox';
import { Label } from '../../../components/ui/label';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import toast from '@/lib/toast';

// Client sidebar navigation items
const CLIENT_SIDEBAR_ITEMS = [
  { key: 'dashboard', name: 'Dashboard', href: '/client/dashboard' },
  { key: 'branding', name: 'Branding', href: '/client/branding' },
  { key: 'documents', name: 'Documents', href: '/client/documents' },
  { key: 'email-templates', name: 'Email Template', href: '/client/email-templates' },
  { key: 'chat', name: 'Chat', href: '/client/chat' },
  { key: 'tokens', name: 'Token Usage', href: '/client/tokens' },
  { key: 'analytics', name: 'Analytics', href: '/client/analytics' },
  { key: 'chat-history', name: 'Chat History', href: '/client/chat-history' },
  { key: 'proposals', name: 'Proposals', href: '/client/proposals' },
];

const ClientAccess = () => {
  const { user } = useAuthStore();
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientPermissions, setClientPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setClientsLoading(true);
      const response = await apiClient.getClients({
        page: 1,
        limit: 100,
        include_stats: true,
      });

      const rows = Array.isArray(response?.clients) ? response.clients : [];
      const normalizedClients = rows.map(normalizeClientRow);
      
      // Fetch domain information for each client if not already included
      const clientsWithDomains = await Promise.all(
        normalizedClients.map(async (client) => {
          // If domain info is already present, use it
          if (client.domain_whitelist !== undefined || client.domain_blacklist !== undefined) {
            return client;
          }
          
          // Otherwise, fetch domain info
          try {
            const domainResponse = await apiClient.getClientDomains(client.id);
            return {
              ...client,
              domain_whitelist: domainResponse.domain_whitelist || [],
              domain_blacklist: domainResponse.domain_blacklist || [],
              domain_mode: domainResponse.domain_mode || 'whitelist',
              require_domain_auth: domainResponse.require_domain_auth || false,
            };
          } catch (error) {
            console.error(`Failed to load domains for client ${client.id}:`, error);
            return client;
          }
        })
      );
      
      setClients(clientsWithDomains);
    } catch (error) {
      console.error('Failed to load clients:', error);
      setClientsError(error.message);
      toast.error('Failed to load clients');
    } finally {
      setClientsLoading(false);
    }
  };

  const normalizeClientRow = (item) => {
    const c = item?.client ?? item ?? {};
    return {
      id: c.id || c._id || item.id,
      name: c.name || '',
      status: c.status || 'active',
      email: c.email,
      username: c.username,
      domain_whitelist: c.domain_whitelist || [],
      domain_blacklist: c.domain_blacklist || [],
      domain_mode: c.domain_mode || 'whitelist',
      require_domain_auth: c.require_domain_auth || false,
    };
  };

  const filteredClients = clients.filter((client) => {
    const q = (searchTerm || '').toLowerCase();
    return (
      !q ||
      (client.name || '').toLowerCase().includes(q) ||
      (client.username || '').toLowerCase().includes(q) ||
      (client.email || '').toLowerCase().includes(q)
    );
  });

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

  const safeInitial = (v) =>
    typeof v === 'string' && v.length ? v.charAt(0).toUpperCase() : '?';

  const handleOpenPermissionModal = async (client) => {
    setSelectedClient(client);
    setPermissionModalOpen(true);
    setPermissionsLoading(true);
    
    try {
      const response = await apiClient.getClientPermissions(client.id);
      // If permissions exist, use them; otherwise, default to all enabled
      const permissions = response?.permissions || CLIENT_SIDEBAR_ITEMS.map(item => item.key);
      setClientPermissions(permissions);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      // Default to all enabled if API fails
      setClientPermissions(CLIENT_SIDEBAR_ITEMS.map(item => item.key));
      toast.error('Failed to load permissions. Showing default settings.');
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handleClosePermissionModal = () => {
    setPermissionModalOpen(false);
    setSelectedClient(null);
    setClientPermissions([]);
  };

  const handleDialogOpenChange = (open) => {
    if (!open) {
      handleClosePermissionModal();
    } else {
      setPermissionModalOpen(true);
    }
  };

  const handlePermissionToggle = (itemKey) => {
    setClientPermissions((prev) => {
      if (prev.includes(itemKey)) {
        return prev.filter((key) => key !== itemKey);
      } else {
        return [...prev, itemKey];
      }
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedClient) return;

    setPermissionsLoading(true);
    try {
      await apiClient.updateClientPermissions(selectedClient.id, clientPermissions);
      toast.success('Permissions updated successfully');
      handleClosePermissionModal();
    } catch (error) {
      console.error('Failed to update permissions:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update permissions';
      toast.error(errorMessage);
    } finally {
      setPermissionsLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </CardContent>
      </Card>

      {/* Clients Access Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium text-foreground">Client Access Management</h3>
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
          ) : filteredClients.length > 0 ? (
            <div className="space-y-4">
              <div className="shadow ring-1 ring-black ring-opacity-5 rounded-lg overflow-x-scroll">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Domain Auth</TableHead>
                      <TableHead>Domain Mode</TableHead>
                      <TableHead>Allowed Domains</TableHead>
                      <TableHead>Blocked Domains</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
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
                          {client.require_domain_auth ? (
                            <Badge variant="success">Enabled</Badge>
                          ) : (
                            <Badge variant="default">Disabled</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="info" className="capitalize">
                            {client.domain_mode || 'whitelist'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {client.domain_whitelist && client.domain_whitelist.length > 0 ? (
                              <div className="space-y-1">
                                {client.domain_whitelist.slice(0, 3).map((domain, idx) => (
                                  <div key={idx} className="text-foreground">
                                    {domain}
                                  </div>
                                ))}
                                {client.domain_whitelist.length > 3 && (
                                  <div className="text-muted-foreground text-xs">
                                    +{client.domain_whitelist.length - 3} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {client.domain_blacklist && client.domain_blacklist.length > 0 ? (
                              <div className="space-y-1">
                                {client.domain_blacklist.slice(0, 3).map((domain, idx) => (
                                  <div key={idx} className="text-foreground">
                                    {domain}
                                  </div>
                                ))}
                                {client.domain_blacklist.length > 3 && (
                                  <div className="text-muted-foreground text-xs">
                                    +{client.domain_blacklist.length - 3} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleOpenPermissionModal(client)}
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Permission
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-lg font-medium text-foreground mb-2">No clients found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No clients match your search criteria.' : 'No clients available.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Dialog - Shadcn */}
      <Dialog open={permissionModalOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Manage Permissions - {selectedClient?.name || 'Client'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              Select which sidebar navigation items should be visible for this client. Unchecked items will be hidden from the client's sidebar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {permissionsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...Array(CLIENT_SIDEBAR_ITEMS.length)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 p-4 rounded-lg border border-border"
                  >
                    <Skeleton className="h-5 w-5 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnimatePresence>
                  {CLIENT_SIDEBAR_ITEMS.map((item, index) => {
                    const isChecked = clientPermissions.includes(item.key);
                    return (
                      <motion.div
                        key={item.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-lg border transition-all duration-200 cursor-pointer",
                          "hover:bg-accent/50 hover:border-primary/50 hover:shadow-sm",
                          isChecked 
                            ? "border-primary/50 bg-primary/5 dark:bg-primary/10" 
                            : "border-border bg-card"
                        )}
                        onClick={() => handlePermissionToggle(item.key)}
                      >
                        <div className="flex-shrink-0 pt-0.5">
                          <Checkbox
                            id={`permission-${item.key}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              handlePermissionToggle(item.key);
                            }}
                            className="h-5 w-5"
                          />
                        </div>
                        <Label
                          htmlFor={`permission-${item.key}`}
                          className="flex-1 cursor-pointer space-y-1.5 min-w-0"
                        >
                          <div className="text-sm font-semibold text-foreground leading-tight">
                            {item.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono leading-tight opacity-80">
                            {item.href}
                          </div>
                        </Label>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClosePermissionModal}
              disabled={permissionsLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSavePermissions}
              disabled={permissionsLoading}
            >
              {permissionsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Permissions'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { ClientAccess };
export default ClientAccess;


