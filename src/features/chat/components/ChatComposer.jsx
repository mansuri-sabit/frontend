// src/features/chat/components/ChatComposer.jsx
import { useState, useRef } from 'react';
import { Button } from '../../../components/ui/Button';
import { useDebounce } from '../../../hooks/useDebounce';

export const ChatComposer = ({ onSendMessage, disabled = false, placeholder = "Type your message..." }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef(null);
  
  const debouncedSend = useDebounce(handleSend, 300);

  async function handleSend() {
    if (!message.trim() || isLoading) return;
    
    setIsLoading(true);
    try {
      await onSendMessage(message.trim());
      setMessage('');
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      debouncedSend();
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="border-t bg-white p-4">
      <div className="flex items-end space-x-3">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className="w-full resize-none border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent max-h-30"
            rows={1}
          />
        </div>
        <Button
          onClick={debouncedSend}
          disabled={disabled || isLoading || !message.trim()}
          variant="primary"
          size="lg"
          className="px-6"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
            </svg>
          )}
        </Button>
      </div>
    </div>
  );
};

// src/features/chat/components/MessageBubble.jsx
import { formatDistanceToNow } from 'date-fns';

export const MessageBubble = ({ message, isUser = false, timestamp, isTyping = false }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isUser 
          ? 'bg-primary-500 text-white' 
          : 'bg-gray-100 text-gray-900'
      }`}>
        {isTyping ? (
          <div className="flex items-center space-x-1">
            <span className="text-sm">AI is thinking</span>
            <div className="loading-dots">
              <div style={{'--i': 0}} className="bg-current"></div>
              <div style={{'--i': 1}} className="bg-current"></div>
              <div style={{'--i': 2}} className="bg-current"></div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{message}</p>
            {timestamp && (
              <p className={`text-xs mt-1 ${
                isUser ? 'text-primary-100' : 'text-gray-500'
              }`}>
                {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
