import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { apiClient } from '../../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Skeleton } from '../../../components/ui/Skeleton';
import toast from '@/lib/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  Mail,
  User,
  Building2,
  Calendar,
  MapPin,
  Search,
  Download,
  FileText,
  Phone,
  Globe,
} from 'lucide-react';

const Proposals = () => {
  const { user } = useAuthStore();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Load proposals
  const loadProposals = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProposals();
      setProposals(response.proposals || []);
    } catch (error) {
      console.error('Failed to load proposals:', error);
      toast.error('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  // Filter proposals based on search term
  const filteredProposals = proposals.filter(proposal =>
    proposal.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proposal.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proposal.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proposal.message_quantity?.toString().includes(searchTerm) ||
    proposal.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proposal.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewDetails = (proposal) => {
    setSelectedProposal(proposal);
    setIsDialogOpen(true);
  };

  const handleExportCSV = () => {
    try {
      if (!proposals || proposals.length === 0) {
        toast.error('No proposals to export');
        return;
      }

      const headers = ['Name', 'Email', 'Company', 'Message Quantity', 'Country', 'City', 'Date'];
      const rows = proposals.map(p => [
        p.user_name || '-',
        p.user_email || '-',
        p.company_name || '-',
        p.message_quantity || '-',
        p.country || '-',
        p.city || '-',
        formatDate(p.proposal_sent_at),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `proposals_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Proposals exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export proposals');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proposals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View all user details from conversations where proposals were sent
          </p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, company, quantity, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Proposals Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Proposal Requests</CardTitle>
            <Badge variant="secondary">{filteredProposals.length} proposals</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No proposals found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Message Quantity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProposals.map((proposal, index) => (
                    <TableRow key={proposal.id || index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{proposal.user_name || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{proposal.user_email || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{proposal.company_name || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{proposal.message_quantity || '-'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {proposal.city && proposal.country
                              ? `${proposal.city}, ${proposal.country}`
                              : proposal.country || proposal.city || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(proposal.proposal_sent_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(proposal)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proposal Details</DialogTitle>
            <DialogDescription>
              Complete information about this proposal request
            </DialogDescription>
          </DialogHeader>
          {selectedProposal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm font-medium mt-1">{selectedProposal.user_name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm mt-1">{selectedProposal.user_email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                  <p className="text-sm mt-1">{selectedProposal.company_name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Message Quantity</label>
                  <p className="text-sm mt-1">{selectedProposal.message_quantity || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Country</label>
                  <p className="text-sm mt-1">{selectedProposal.country || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">City</label>
                  <p className="text-sm mt-1">{selectedProposal.city || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                  <p className="text-sm mt-1 font-mono">{selectedProposal.user_ip || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Proposal Sent At</label>
                  <p className="text-sm mt-1">{formatDate(selectedProposal.proposal_sent_at)}</p>
                </div>
              </div>
              {selectedProposal.conversation_id && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Conversation ID</label>
                  <p className="text-sm mt-1 font-mono">{selectedProposal.conversation_id}</p>
                </div>
              )}
              {selectedProposal.user_agent && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User Agent</label>
                  <p className="text-sm mt-1 text-muted-foreground break-all">{selectedProposal.user_agent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Proposals;

