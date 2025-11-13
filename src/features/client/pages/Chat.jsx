// src/features/client/pages/Chat.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import toast from '@/lib/toast';

const Chat = () => {
  const { user } = useAuthStore();

  // Conversations list
  const [conversations, setConversations] = useState([]); // [{id, title?, message_count, updated_at, total_tokens}]
  const [loadingConvos, setLoadingConvos] = useState(true);

  // Current conversation + messages
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]); // [{id, role:'user'|'assistant', content, timestamp}]
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Composer
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // UI
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile, will be responsive
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Open sidebar by default on larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    
    // Set initial state
    handleResize();
    
    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  // -------- API wiring --------
  async function loadConversations() {
    setLoadingConvos(true);
    try {
      // backend returns: { conversations: [ { conversation_id, last_message, message_count, total_tokens, updated_at } ], total }
      const res = await apiClient.get('/chat/conversations');
      const list = (res?.conversations || res?.data?.conversations || []).map((c) => ({
        id: c.conversation_id || c.id,
        title: c.last_message?.message?.slice(0, 40) || 'New Conversation',
        message_count: c.message_count ?? 0,
        updated_at: c.updated_at || c.last_message?.timestamp,
        total_tokens: c.total_tokens ?? 0,
      }));
      setConversations(list);
    } catch (e) {
      console.error('loadConversations error', e);
      toast.error('Failed to load conversations');
    } finally {
      setLoadingConvos(false);
    }
  }

  async function loadConversation(conversationId) {
    if (!conversationId) return;
    setLoadingHistory(true);
    try {
      // backend returns: ConversationHistory { messages: [ Message{message, reply, timestamp, _id} ] ... }
      const res = await apiClient.get(`/chat/conversations/${conversationId}`);
      const docs = res?.messages || res?.data?.messages || [];
      // Each DB record has user message + ai reply in the same doc.
      const flat = [];
      docs.forEach((m) => {
        // user bubble
        flat.push({
          id: `${m.id || m._id}-u`,
          role: 'user',
          content: m.message,
          timestamp: m.timestamp,
        });
        // ai bubble (if present)
        if (m.reply) {
          flat.push({
            id: `${m.id || m._id}-a`,
            role: 'assistant',
            content: m.reply,
            timestamp: m.timestamp, // backend doesn’t store separate reply time; using same
          });
        }
      });
      setMessages(flat);
      setCurrentConversationId(conversationId);
    } catch (e) {
      console.error('loadConversation error', e);
      toast.error('Failed to load conversation');
    } finally {
      setLoadingHistory(false);
    }
  }

  async function sendChatMessage(text) {
    // optimistic user message
    const tempId = crypto.randomUUID();
    const userMsg = {
      id: tempId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      status: 'sending',
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const payload = {
        message: text,
        ...(currentConversationId ? { conversation_id: currentConversationId } : {}),
      };

      const res = await apiClient.post('/chat/send', payload);
      const data = res?.data || res;

      // ensure conversation id from backend
      const cid = data.conversation_id;
      if (!currentConversationId && cid) {
        setCurrentConversationId(cid);
      }

      // replace temp user status -> sent
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' } : m))
      );

      // append AI reply
      const aiMsg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // refresh conversations list preview
      loadConversations();
    } catch (e) {
      console.error('sendChatMessage error', e);
      const status = e?.response?.status;
      const server = e?.response?.data;

      // mark last user message failed
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );

      if (status === 402 || server?.error_code === 'token_limit_exceeded') {
        toast.error('Token limit exceeded. Please increase token limit in settings.');
      } else if (server?.error_code === 'ai_service_error') {
        toast.error('AI service failed. Check Gemini API key/config on server.');
      } else if (status === 403) {
        toast.error('Forbidden. Make sure this user has a Client ID (tenant).');
      } else {
        toast.error(server?.message || 'Failed to send message');
      }
    } finally {
      setIsTyping(false);
    }
  }

  // -------- Handlers --------
  const handleSend = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || isTyping) return;
    setNewMessage('');
    await sendChatMessage(text);
    inputRef.current?.focus();
  };

  const handleSelectConversation = async (id) => {
    await loadConversation(id);
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setNewMessage('');
  };

  // -------- UI helpers --------
  const filteredConversations = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return conversations.filter((c) => (c.title || 'New Conversation').toLowerCase().includes(s));
  }, [conversations, searchTerm]);

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Function to parse markdown bold syntax (**text**) into HTML <strong> tags
  const parseMarkdownBold = (text) => {
    if (!text) return text;
    
    // Convert **text** to <strong>text</strong>
    return text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  };

  const formatDateLabel = (ts) => {
    const d = new Date(ts);
    const t = new Date();
    const y = new Date(); y.setDate(t.getDate() - 1);
    if (d.toDateString() === t.toDateString()) return 'Today';
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
  };

  const grouped = useMemo(() => {
    const g = {};
    messages.forEach((m) => {
      const k = formatDateLabel(m.timestamp);
      if (!g[k]) g[k] = [];
      g[k].push(m);
    });
    return g;
  }, [messages]);

  return (
    <div className="relative flex flex-col sm:flex-row h-[calc(100vh-8rem)] sm:h-[calc(100vh-8rem)] bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80 sm:w-80 max-w-[85vw] sm:max-w-none' : 'w-0 hidden sm:block'} transition-all duration-300 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col absolute sm:relative z-50 sm:z-auto h-full`}>
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Conversations</h2>
            <Button onClick={handleNewConversation} variant="outline" size="sm" className="text-xs sm:text-sm">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="hidden sm:inline">New</span>
            </Button>
          </div>
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            className="text-xs sm:text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-2 sm:space-x-3">
                  <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3 sm:h-4 w-24 sm:w-32 mb-1" />
                    <Skeleton className="h-2 sm:h-3 w-16 sm:w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length ? (
            <div className="p-1 sm:p-2">
              {filteredConversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    handleSelectConversation(c.id);
                    if (window.innerWidth < 640) setSidebarOpen(false);
                  }}
                  className={`flex items-center p-2 sm:p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    currentConversationId === c.id ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100' : ''
                  }`}
                >
                  <Avatar size="sm" name="Chat" className="bg-gray-400 text-white mr-2 sm:mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">{c.title || 'New Conversation'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : ''} • {c.message_count || 0} messages
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 sm:p-8 text-center">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">{searchTerm ? 'No conversations found' : 'No conversations yet'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <Button onClick={() => setSidebarOpen(!sidebarOpen)} variant="outline" size="sm" className="flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white truncate">AI Assistant</h1>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0 ${isTyping ? 'bg-yellow-500' : 'bg-green-500'}`} />
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{isTyping ? 'Typing...' : 'Online'}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Badge variant="info" size="sm" className="hidden sm:inline-flex">{messages.length} messages</Badge>
              <Badge variant="info" size="sm" className="sm:hidden">{messages.length}</Badge>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {loadingHistory ? (
            <div className="space-y-3 sm:space-y-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-5 sm:h-6 w-2/3 sm:w-2/3" />)}
            </div>
          ) : messages.length ? (
            <div className="space-y-4 sm:space-y-6">
              {Object.entries(grouped).map(([date, day]) => (
                <div key={date}>
                  <div className="flex items-center justify-center mb-3 sm:mb-4">
                    <div className="px-2 sm:px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{date}</span>
                    </div>
                  </div>
                  {day.map((m) => (
                    <div key={m.id} className={`flex items-start space-x-2 sm:space-x-3 mb-3 sm:mb-4 ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <Avatar size="sm" name={m.role === 'user' ? user?.name : 'AI'} className={`${m.role === 'user' ? 'bg-primary-600' : 'bg-gray-600'} flex-shrink-0`} />
                      <div className={`flex-1 max-w-[85%] sm:max-w-lg ${m.role === 'user' ? 'text-right' : ''}`}>
                        <div className={`inline-block p-2 sm:p-3 rounded-lg text-sm sm:text-base ${
                          m.role === 'user'
                            ? 'bg-primary-600 text-white rounded-br-sm'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                        }`}>
                          {m.role === 'assistant' ? (
                            <p 
                              className="whitespace-pre-wrap break-words"
                              dangerouslySetInnerHTML={{ __html: parseMarkdownBold(m.content) }}
                            />
                          ) : (
                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          )}
                        </div>
                        <div className={`mt-1 flex items-center text-xs text-gray-500 ${m.role === 'user' ? 'justify-end' : ''}`}>
                          <span>{formatTime(m.timestamp)}</span>
                          {m.status === 'failed' && (
                            <>
                              <span className="mx-1">•</span>
                              <span className="text-red-600">failed</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {isTyping && (
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <Avatar size="sm" name="AI" className="bg-gray-600 flex-shrink-0" />
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg rounded-bl-sm p-2 sm:p-3">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full px-4">
              <div className="text-center max-w-sm mx-auto">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">Start a Conversation</h3>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">Send a message to begin chatting with your AI assistant.</p>
                <div className="space-y-2">
                  {['What can you help me with?', 'Tell me about your features', 'How does this chatbot work?'].map((s, i) => (
                    <button key={i} onClick={() => setNewMessage(s)} className="block w-full px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSend} className="flex items-end space-x-2 sm:space-x-3">
            <div className="flex-1 min-w-0">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={isTyping}
                autoComplete="off"
                className="text-sm sm:text-base"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />
            </div>
            <Button type="submit" disabled={!newMessage.trim() || isTyping} loading={isTyping} className="flex-shrink-0 px-3 sm:px-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </Button>
          </form>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 hidden sm:block">Press Enter to send, Shift + Enter for new line</div>
        </div>
      </div>
    </div>
  );
};

export { Chat };
export default Chat;
