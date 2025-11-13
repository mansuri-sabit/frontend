// src/store/chatStore.js
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { apiClient } from '../lib/api';

export const useChatStore = create(
  subscribeWithSelector((set, get) => ({
    // State
    conversations: {},
    messages: {},
    currentConversationId: null,
    isLoading: false,
    isTyping: false,
    error: null,
    typingUsers: {},
    lastMessageTimestamp: null,
    unreadCounts: {},
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    
    // Actions
    setCurrentConversation: (conversationId) => {
      set({ 
        currentConversationId: conversationId,
        error: null,
      });
      
      // Mark messages as read
      if (conversationId) {
        get().markAsRead(conversationId);
      }
    },

    loadConversations: async (params = {}) => {
      set({ isLoading: true, error: null });

      try {
        const response = await apiClient.getConversations(params);
        const conversations = {};
        
        response.conversations.forEach(conv => {
          conversations[conv.id] = conv;
        });

        set({
          conversations,
          isLoading: false,
        });

        return response;
      } catch (error) {
        set({
          isLoading: false,
          error: error.message,
        });
        throw error;
      }
    },

    loadConversation: async (conversationId) => {
      if (!conversationId) return;

      set({ isLoading: true, error: null });

      try {
        const response = await apiClient.getConversation(conversationId);
        const { conversation, messages } = response;

        set(state => ({
          conversations: {
            ...state.conversations,
            [conversationId]: conversation,
          },
          messages: {
            ...state.messages,
            [conversationId]: messages || [],
          },
          isLoading: false,
        }));

        return response;
      } catch (error) {
        set({
          isLoading: false,
          error: error.message,
        });
        throw error;
      }
    },

    sendMessage: async (content, conversationId = null, metadata = {}) => {
      const tempId = `temp-${Date.now()}`;
      const currentConvId = conversationId || get().currentConversationId;
      
      // Optimistic update - add user message
      const userMessage = {
        id: tempId,
        conversation_id: currentConvId || 'new',
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
        status: 'sending',
        metadata,
      };

      set(state => ({
        messages: {
          ...state.messages,
          [currentConvId || 'new']: [
            ...(state.messages[currentConvId || 'new'] || []),
            userMessage,
          ],
        },
        isTyping: true,
        lastMessageTimestamp: Date.now(),
      }));

      try {
        const response = await apiClient.sendMessage(content, currentConvId);
        const { conversation_id, message, user_message } = response;

        // Update conversation if new
        if (!currentConvId && conversation_id) {
          set(state => ({
            currentConversationId: conversation_id,
            conversations: {
              ...state.conversations,
              [conversation_id]: {
                id: conversation_id,
                title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                message_count: 2,
              },
            },
          }));
        }

        // Update messages
        set(state => {
          const convId = conversation_id || currentConvId;
          const currentMessages = state.messages[convId] || [];
          
          // Replace temp message with real user message and add AI response
          const updatedMessages = currentMessages.map(msg => 
            msg.id === tempId 
              ? { 
                  ...msg, 
                  id: user_message?.id || tempId, 
                  status: 'sent',
                  conversation_id: convId,
                }
              : msg
          );

          // Add AI response
          if (message) {
            updatedMessages.push({
              id: message.id || `ai-${Date.now()}`,
              conversation_id: convId,
              role: 'assistant',
              content: message.content || message.text,
              timestamp: message.timestamp || new Date().toISOString(),
              status: 'received',
              tokens_used: message.tokens_used || 0,
              metadata: message.metadata || {},
            });
          }

          return {
            messages: {
              ...state.messages,
              [convId]: updatedMessages,
            },
            isTyping: false,
          };
        });

        return response;
      } catch (error) {
        // Update message status to failed
        set(state => {
          const convId = currentConvId || 'new';
          const currentMessages = state.messages[convId] || [];
          
          const updatedMessages = currentMessages.map(msg => 
            msg.id === tempId 
              ? { ...msg, status: 'failed', error: error.message }
              : msg
          );

          return {
            messages: {
              ...state.messages,
              [convId]: updatedMessages,
            },
            isTyping: false,
            error: error.message,
          };
        });

        throw error;
      }
    },

    retryMessage: async (messageId) => {
      const state = get();
      const currentConvId = state.currentConversationId;
      const messages = state.messages[currentConvId] || [];
      const message = messages.find(m => m.id === messageId);

      if (!message || message.role !== 'user') {
        throw new Error('Message not found or not retryable');
      }

      // Remove failed message and any subsequent messages
      const messageIndex = messages.findIndex(m => m.id === messageId);
      const filteredMessages = messages.slice(0, messageIndex);

      set(state => ({
        messages: {
          ...state.messages,
          [currentConvId]: filteredMessages,
        },
      }));

      // Resend the message
      return get().sendMessage(message.content, currentConvId, message.metadata);
    },

    deleteMessage: async (messageId) => {
      const state = get();
      const currentConvId = state.currentConversationId;
      
      set(state => ({
        messages: {
          ...state.messages,
          [currentConvId]: (state.messages[currentConvId] || []).filter(
            m => m.id !== messageId
          ),
        },
      }));

      // TODO: Implement server-side message deletion if supported
    },

    deleteConversation: async (conversationId) => {
      set({ isLoading: true });

      try {
        await apiClient.deleteConversation(conversationId);

        set(state => {
          const { [conversationId]: deletedConv, ...remainingConversations } = state.conversations;
          const { [conversationId]: deletedMessages, ...remainingMessages } = state.messages;
          
          return {
            conversations: remainingConversations,
            messages: remainingMessages,
            currentConversationId: state.currentConversationId === conversationId 
              ? null 
              : state.currentConversationId,
            isLoading: false,
          };
        });
      } catch (error) {
        set({
          isLoading: false,
          error: error.message,
        });
        throw error;
      }
    },

    updateConversation: async (conversationId, updates) => {
      try {
        const response = await apiClient.updateConversation(conversationId, updates);
        
        set(state => ({
          conversations: {
            ...state.conversations,
            [conversationId]: {
              ...state.conversations[conversationId],
              ...updates,
              updated_at: new Date().toISOString(),
            },
          },
        }));

        return response;
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    searchMessages: async (query) => {
      if (!query.trim()) {
        set({ searchResults: [], searchQuery: '' });
        return;
      }

      set({ isSearching: true, searchQuery: query });

      try {
        // Client-side search for now
        const state = get();
        const results = [];

        Object.entries(state.messages).forEach(([convId, messages]) => {
          messages.forEach(message => {
            if (message.content.toLowerCase().includes(query.toLowerCase())) {
              results.push({
                ...message,
                conversation_id: convId,
                conversation: state.conversations[convId],
              });
            }
          });
        });

        set({
          searchResults: results,
          isSearching: false,
        });
      } catch (error) {
        set({
          isSearching: false,
          error: error.message,
        });
      }
    },

    clearSearch: () => {
      set({
        searchQuery: '',
        searchResults: [],
      });
    },

    markAsRead: (conversationId) => {
      set(state => ({
        unreadCounts: {
          ...state.unreadCounts,
          [conversationId]: 0,
        },
      }));
    },

    setTyping: (conversationId, userId, isTyping) => {
      set(state => {
        const conversationTyping = state.typingUsers[conversationId] || {};
        
        if (isTyping) {
          conversationTyping[userId] = Date.now();
        } else {
          delete conversationTyping[userId];
        }

        return {
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: conversationTyping,
          },
        };
      });

      // Clear typing indicator after timeout
      if (isTyping) {
        setTimeout(() => {
          get().setTyping(conversationId, userId, false);
        }, 3000);
      }
    },

    clearError: () => {
      set({ error: null });
    },

    // Utility getters
    getCurrentMessages: () => {
      const state = get();
      return state.messages[state.currentConversationId] || [];
    },

    getConversationById: (id) => {
      return get().conversations[id];
    },

    getUnreadCount: (conversationId) => {
      return get().unreadCounts[conversationId] || 0;
    },

    getTotalUnreadCount: () => {
      const unreadCounts = get().unreadCounts;
      return Object.values(unreadCounts).reduce((total, count) => total + count, 0);
    },

    isConversationTyping: (conversationId) => {
      const typingUsers = get().typingUsers[conversationId] || {};
      return Object.keys(typingUsers).length > 0;
    },

    // Real-time message handling
    addIncomingMessage: (message) => {
      set(state => {
        const convId = message.conversation_id;
        const currentMessages = state.messages[convId] || [];
        
        // Check if message already exists
        if (currentMessages.find(m => m.id === message.id)) {
          return state;
        }

        // Add to unread count if not current conversation
        const unreadCount = state.currentConversationId !== convId 
          ? (state.unreadCounts[convId] || 0) + 1
          : 0;

        return {
          messages: {
            ...state.messages,
            [convId]: [...currentMessages, message],
          },
          unreadCounts: {
            ...state.unreadCounts,
            [convId]: unreadCount,
          },
          lastMessageTimestamp: Date.now(),
        };
      });
    },

    // Pagination support
    loadMoreMessages: async (conversationId, before) => {
      try {
        const response = await apiClient.getConversation(conversationId, {
          before,
          limit: 20,
        });

        set(state => ({
          messages: {
            ...state.messages,
            [conversationId]: [
              ...response.messages,
              ...(state.messages[conversationId] || []),
            ],
          },
        }));

        return response;
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },
  }))
);

// Auto-cleanup typing indicators
setInterval(() => {
  const state = useChatStore.getState();
  const now = Date.now();
  const timeout = 5000; // 5 seconds

  Object.entries(state.typingUsers).forEach(([convId, users]) => {
    Object.entries(users).forEach(([userId, timestamp]) => {
      if (now - timestamp > timeout) {
        useChatStore.getState().setTyping(convId, userId, false);
      }
    });
  });
}, 1000);

export default useChatStore;
