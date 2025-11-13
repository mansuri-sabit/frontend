import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { apiClient } from '../../../lib/api';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Checkbox } from '../../../components/ui/Checkbox';
import toast from '@/lib/toast';
import { Skeleton } from '../../../components/ui/Skeleton';
import { exportToExcel, exportToPDF } from '../../../utils/exportUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';

const ChatHistory = () => {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversations, setSelectedConversations] = useState([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load conversations
  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getEmbedChatHistory();
      setConversations(response.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversation history');
    } finally {
      setLoading(false);
    }
  };


  // Load messages for a specific conversation
  const loadConversationMessages = async (conversationId) => {
    try {
      setLoading(true);
      // For embed conversations, we need to get messages by session_id
      // Since we're using the embed chat history API, we need to fetch individual messages
      const response = await apiClient.getEmbedConversationMessages(conversationId);
      setMessages(response.messages || []);
      setSelectedConversation(conversationId);
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
      toast.error('Failed to load conversation messages');
    } finally {
      setLoading(false);
    }
  };

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conversation =>
    conversation.first_message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversation.last_message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversation.user_ip?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversation.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversation.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversation.user_agent?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadConversations();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Export handlers
  const handleExportExcel = () => {
    try {
      if (!messages || messages.length === 0) {
        toast.error('No messages to export. Please select a conversation first.');
        return;
      }
      exportToExcel(messages);
      toast.success('Excel file exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export Excel file');
    }
  };

  const handleExportPDF = () => {
    try {
      if (!messages || messages.length === 0) {
        toast.error('No messages to export. Please select a conversation first.');
        return;
      }
      exportToPDF(messages);
      toast.success('PDF file exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export PDF file');
    }
  };

  // Bulk delete handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedConversations(filteredConversations.map(c => c.conversation_id));
    } else {
      setSelectedConversations([]);
    }
  };

  const handleSelectConversation = (conversationId, checked) => {
    if (checked) {
      setSelectedConversations([...selectedConversations, conversationId]);
    } else {
      setSelectedConversations(selectedConversations.filter(id => id !== conversationId));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedConversations.length === 0) {
      toast.error('Please select at least one conversation to delete');
      return;
    }
    setIsDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await apiClient.bulkDeleteEmbedConversations(selectedConversations);
      toast.success(`Successfully deleted ${selectedConversations.length} conversation(s)`);
      setSelectedConversations([]);
      setIsDeleteDialogOpen(false);
      // Reload conversations
      await loadConversations();
      // Clear selected conversation if it was deleted
      if (selectedConversation && selectedConversations.includes(selectedConversation)) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete conversations';
      const errorCode = error.response?.data?.error_code || error.response?.status;
      toast.error(`${errorCode ? `[${errorCode}] ` : ''}${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Chat History</h1>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row items-center gap-3">
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
          {selectedConversations.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete ({selectedConversations.length})
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="primary"
                disabled={!messages || messages.length === 0}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleExportExcel}
                disabled={!messages || messages.length === 0}
                className="cursor-pointer"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportPDF}
                disabled={!messages || messages.length === 0}
                className="cursor-pointer"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-foreground">Conversations</h3>
                {filteredConversations.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedConversations.length === filteredConversations.length && filteredConversations.length > 0}
                      indeterminate={selectedConversations.length > 0 && selectedConversations.length < filteredConversations.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-xs text-muted-foreground">
                      Select All
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No conversations found
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.session_id}
                      className={`p-4 border rounded-lg transition-colors ${
                        selectedConversation === conversation.conversation_id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start gap-3 overflow-hidden">
                        <div className="pt-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedConversations.includes(conversation.conversation_id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSelectConversation(conversation.conversation_id, e.target.checked);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4"
                          />
                        </div>
                        <div
                          className="flex-1 min-w-0 cursor-pointer overflow-hidden"
                          onClick={() => loadConversationMessages(conversation.conversation_id)}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-center gap-2 mb-1 overflow-hidden">
                                <p className="text-sm font-medium text-foreground truncate flex-shrink-0 max-w-[120px]">
                                  {conversation.user_name || 'Embed User'}
                                </p>
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  {conversation.country || 'Unknown'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground truncate mb-2 break-words">
                                {conversation.first_message || 'No message'}
                              </p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                                <span className="truncate">IP: {conversation.user_ip || 'Unknown'}</span>
                                <span className="flex-shrink-0">•</span>
                                <span className="truncate">{conversation.city || 'Unknown'}</span>
                                <span className="flex-shrink-0">•</span>
                                <span className="truncate">{formatDate(conversation.started_at)}</span>
                              </div>
                              {conversation.referrer && (
                                <div className="mt-1 overflow-hidden">
                                  <p className="text-xs text-muted-foreground truncate" title={conversation.referrer}>
                                    <span className="font-medium">From:</span>{' '}
                                    <span className="truncate">{conversation.referrer}</span>
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="ml-2 flex-shrink-0">
                              <Badge variant="secondary" className="whitespace-nowrap">
                                {conversation.message_count} msgs
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Messages Detail */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-medium text-foreground truncate">
                  {selectedConversation ? 'Messages' : 'Select a Conversation'}
                </h3>
                {selectedConversation && messages.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0 whitespace-nowrap">
                    <span>{messages.length} messages</span>
                    <span>•</span>
                    <span>{messages.reduce((total, msg) => total + (msg.token_cost || 0), 0)} tokens</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedConversation ? (
                loading ? (
                  <div className="space-y-6">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex space-x-4">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                          <Skeleton className="h-20 w-full rounded-lg" />
                          <Skeleton className="h-16 w-full rounded-lg" />
                          <Skeleton className="h-12 w-full rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-foreground">No messages found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">This conversation appears to be empty.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {messages.map((message, index) => (
                      <div key={index} className="flex space-x-4">
                        {/* User Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-primary-foreground text-sm font-bold">
                              {message.is_embed_user ? 'E' : 'U'}
                            </span>
                          </div>
                        </div>

                        {/* Message Content */}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          {/* Message Header */}
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="font-semibold text-foreground truncate">
                                {message.is_embed_user ? (message.user_name || 'Embed User') : (message.from_name || 'User')}
                              </span>
                              {message.is_embed_user && (
                                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 flex-shrink-0">
                                  {message.country || 'Unknown'}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {formatDate(message.timestamp)}
                            </span>
                          </div>

                          {/* User Message */}
                          <div className="mb-3">
                            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 shadow-sm">
                              <p className="text-foreground leading-relaxed break-words overflow-wrap-anywhere">
                                {message.message}
                              </p>
                            </div>
                          </div>

                          {/* AI Response */}
                          <div className="mb-4">
                            <div className="bg-muted/50 border border-border rounded-lg p-4 shadow-sm">
                              <div className="flex items-center mb-2">
                                <div className="w-6 h-6 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                  <span className="text-accent-foreground text-xs font-bold">AI</span>
                                </div>
                                <span className="text-sm font-medium text-foreground">AI Assistant</span>
                              </div>
                              <p className="text-foreground leading-relaxed break-words overflow-wrap-anywhere">
                                {message.reply}
                              </p>
                            </div>
                          </div>

                          {/* Tracking Information */}
                          <div className="bg-muted/50 rounded-lg p-4 border border-border">
                            <div className="flex items-center mb-3">
                              <svg className="w-4 h-4 text-muted-foreground mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              <span className="text-sm font-medium text-foreground">Tracking Information</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div className="space-y-2 min-w-0">
                                <div className="flex justify-between gap-2">
                                  <span className="text-muted-foreground flex-shrink-0">Tokens Used:</span>
                                  <span className="font-medium text-foreground truncate">{message.token_cost}</span>
                                </div>
                                {message.user_ip && (
                                  <div className="flex justify-between gap-2">
                                    <span className="text-muted-foreground flex-shrink-0">IP Address:</span>
                                    <span className="font-mono text-foreground truncate" title={message.user_ip}>{message.user_ip}</span>
                                  </div>
                                )}
                                {message.country && (
                                  <div className="flex justify-between gap-2">
                                    <span className="text-muted-foreground flex-shrink-0">Location:</span>
                                    <span className="font-medium text-foreground truncate" title={message.city ? `${message.city}, ${message.country}` : message.country}>
                                      {message.city ? `${message.city}, ` : ''}{message.country}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="space-y-2 min-w-0">
                                {message.referrer && (
                                  <div className="flex justify-between gap-2">
                                    <span className="text-muted-foreground flex-shrink-0">Referrer:</span>
                                    <span className="font-medium text-primary truncate min-w-0" title={message.referrer}>
                                      {message.referrer}
                                    </span>
                                  </div>
                                )}
                                {message.user_agent && (
                                  <div className="flex justify-between gap-2">
                                    <span className="text-muted-foreground flex-shrink-0">Browser:</span>
                                    <span className="font-medium text-foreground truncate min-w-0" title={message.user_agent}>
                                      {message.user_agent}
                                    </span>
                                  </div>
                                )}
                                {message.session_id && (
                                  <div className="flex justify-between gap-2">
                                    <span className="text-muted-foreground flex-shrink-0">Session:</span>
                                    <span className="font-mono text-foreground truncate" title={message.session_id}>
                                      {message.session_id}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-foreground">No conversation selected</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Select a conversation from the list to view messages</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversations</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedConversations.length} conversation(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export { ChatHistory };
export default ChatHistory;