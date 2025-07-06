import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI, userAPI } from '../utils/api';
import { Send } from 'lucide-react';

const ChatInterface = ({ projectId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Generate session ID on component mount
  useEffect(() => {
    const generateSessionId = () => {
      return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    };
    setSessionId(generateSessionId());
  }, []);

  const loadProjectData = useCallback(async () => {
    try {
      const response = await userAPI.getProject(projectId);
      setProject(response.data.project);
    } catch (error) {
      console.error('Error loading project:', error);
      setError('Failed to load project data');
    }
  }, [projectId]);

  const loadChatHistory = useCallback(async () => {
    try {
      const response = await chatAPI.getChatHistory(projectId);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([]);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
      loadChatHistory();
    }
  }, [loadProjectData, loadChatHistory, projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fixed sendMessage function that integrates with component state
  const sendMessage = async (message, sessionId) => {
    try {
      console.log('Sending message:', message, 'to project:', projectId);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/user/chat/${projectId}/message`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: message,
          session_id: sessionId
        })
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Chat response:', result);
      return result;
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || loading) {
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage('');
    setLoading(true);
    setError('');

    try {
      // Add user message to UI immediately
      const userMessage = {
        id: Date.now(),
        message: messageText,
        is_user: true,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Send message to backend
      const response = await sendMessage(messageText, sessionId);
      
      // Add AI response to UI
      const aiMessage = {
        id: Date.now() + 1,
        message: messageText,
        response: response.response,
        is_user: false,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      
      // Remove the user message if sending failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h2>{project?.name || 'Chat'}</h2>
        <p>{project?.description}</p>
        {project?.welcome_message && (
          <div className="welcome-message">
            {project.welcome_message}
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="empty-chat">
            <p>Start a conversation by typing a message below.</p>
          </div>
        )}
        
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`message ${message.is_user ? 'user' : 'bot'}`}
          >
            <div className="message-content">
              {message.is_user ? message.message : message.response}
            </div>
            <div className="message-time">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="message bot">
            <div className="message-content typing">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              AI is thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <form onSubmit={handleSubmit} className="message-form">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            maxLength={1000}
          />
          <button 
            type="submit" 
            disabled={loading || !newMessage.trim()}
            className="send-button"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
