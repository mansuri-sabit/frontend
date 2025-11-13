// src/hooks/useChat.js
import { useState, useCallback, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { useApi } from './useApi';
import toast from '@/lib/toast';

export const useChat = (conversationId = null) => {
  const { post } = useApi();
  const {
    conversations,
    messages,
    currentConversationId,
    isLoading,
    setCurrentConversation,
    addMessage,
    updateMessage,
    setLoading,
  } = useChatStore();

  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const currentMessages = messages[currentConversationId] || [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, scrollToBottom]);

  const sendMessage = useCallback(async (content, options = {}) => {
    if (!content.trim()) return;

    const tempMessageId = `temp-${Date.now()}`;
    const userMessage = {
      id: tempMessageId,
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      conversation_id: currentConversationId || 'new',
    };

    // Add user message immediately
    addMessage(userMessage);
    setIsTyping(true);

    try {
      const response = await post('/chat/send', {
        message: content.trim(),
        conversation_id: currentConversationId,
        ...options,
      });

      // Remove temp message and add real messages
      const { conversation_id, message: assistantMessage } = response;

      // Update conversation ID if this was a new conversation
      if (!currentConversationId && conversation_id) {
        setCurrentConversation(conversation_id);
      }

      // Update user message with real ID
      updateMessage(tempMessageId, {
        ...userMessage,
        id: response.user_message_id || tempMessageId,
        conversation_id,
      });

      // Add assistant message
      addMessage({
        id: assistantMessage.id || `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantMessage.content || assistantMessage.text,
        timestamp: assistantMessage.timestamp || new Date().toISOString(),
        conversation_id,
        tokens_used: assistantMessage.tokens_used || 0,
      });

      return response;
    } catch (error) {
      // Remove temp message on error
      updateMessage(tempMessageId, {
        ...userMessage,
        error: true,
        content: `Error: ${error.message}`,
      });
      
      toast.error('Failed to send message');
      throw error;
    } finally {
      setIsTyping(false);
    }
  }, [currentConversationId, addMessage, updateMessage, setCurrentConversation, post, toast]);

  const startNewConversation = useCallback(() => {
    setCurrentConversation(null);
  }, [setCurrentConversation]);

  const loadConversation = useCallback(async (id) => {
    if (currentConversationId === id) return;
    
    setCurrentConversation(id);
    
    // Load messages if not already loaded
    if (!messages[id]) {
      setLoading(true);
      try {
        // This would typically load from API
        // For now, we assume messages are managed by the store
      } catch (error) {
        toast.error('Failed to load conversation');
      } finally {
        setLoading(false);
      }
    }
  }, [currentConversationId, messages, setCurrentConversation, setLoading, toast]);

  const retryMessage = useCallback(async (messageId) => {
    const message = currentMessages.find(m => m.id === messageId);
    if (!message || message.role !== 'user') return;

    // Remove the failed message and any subsequent messages
    const messageIndex = currentMessages.findIndex(m => m.id === messageId);
    const messagesToKeep = currentMessages.slice(0, messageIndex);
    
    // Clear subsequent messages
    // This would need to be implemented in the store
    
    // Retry sending
    await sendMessage(message.content);
  }, [currentMessages, sendMessage]);

  const deleteMessage = useCallback((messageId) => {
    // This would need to be implemented in the store
    console.log('Delete message:', messageId);
  }, []);

  const editMessage = useCallback(async (messageId, newContent) => {
    // This would need to be implemented in the store
    console.log('Edit message:', messageId, newContent);
  }, []);

  return {
    // State
    conversations,
    currentMessages,
    currentConversationId,
    isLoading,
    isTyping,
    messagesEndRef,
    
    // Actions
    sendMessage,
    startNewConversation,
    loadConversation,
    retryMessage,
    deleteMessage,
    editMessage,
    scrollToBottom,
    
    // Utilities
    hasMessages: currentMessages.length > 0,
    lastMessage: currentMessages[currentMessages.length - 1],
    messageCount: currentMessages.length,
  };
};
