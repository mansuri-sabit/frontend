// src/components/layout/EmbedLayout.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

export const EmbedLayout = ({ children }) => {
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  const [embedConfig, setEmbedConfig] = useState({
    width: '100%',
    height: '100%',
    borderRadius: '0px',
    theme: 'light',
  });

  useEffect(() => {
    // Parse URL parameters for customization
    const width = searchParams.get('width') || '100%';
    const height = searchParams.get('height') || '100%';
    const borderRadius = searchParams.get('radius') || '0px';
    const customColor = searchParams.get('color');

    setEmbedConfig({
      width,
      height,
      borderRadius,
      theme: 'light',
      customColor,
    });

    // Force light theme
    document.documentElement.classList.remove('dark');

    // Apply custom color if provided
    if (customColor) {
      document.documentElement.style.setProperty('--dynamic-brand-color', customColor);
    }

    // Communicate with parent frame
    const messageParent = (data) => {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'saas-chatbot-embed',
          clientId,
          ...data
        }, '*');
      }
    };

    // Notify parent of load
    messageParent({ event: 'loaded' });

    // Handle resize requests
    const handleResize = (height) => {
      messageParent({ event: 'resize', height });
    };

    // Set up resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        handleResize(entry.contentRect.height);
      }
    });

    const embedContainer = document.getElementById('embed-container');
    if (embedContainer) {
      resizeObserver.observe(embedContainer);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [clientId, searchParams]);

  // Handle messages from parent
  useEffect(() => {
    const handleMessage = (event) => {
      // Verify origin in production
      if (import.meta.env.PROD && event.origin !== window.location.origin) {
        // Add allowed origins check here
        return;
      }

      const { type, action, data } = event.data;
      
      if (type === 'saas-chatbot-parent') {
        switch (action) {
          case 'color-change':
            document.documentElement.style.setProperty('--dynamic-brand-color', data.color);
            break;
          case 'resize-container':
            // Handle container resize if needed
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div 
      id="embed-container"
      className="w-full h-full bg-white theme-dynamic"
      style={{
        width: embedConfig.width,
        height: embedConfig.height,
        borderRadius: embedConfig.borderRadius,
        maxHeight: '100vh',
        overflow: 'hidden'
      }}
    >
      {/* Error Boundary for embed */}
      <EmbedErrorBoundary clientId={clientId}>
        {/* Content */}
        <div className="flex flex-col h-full">
          {children}
        </div>
      </EmbedErrorBoundary>

      {/* Embed-specific styles */}
      <style jsx>{`
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        
        /* Hide scrollbars in embed mode */
        ::-webkit-scrollbar {
          width: 4px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 2px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
        
        /* Ensure proper text rendering in iframe */
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </div>
  );
};

// Error boundary specifically for embed widgets
class EmbedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Embed Widget Error:', error, errorInfo);
    
    // Notify parent of error
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'saas-chatbot-embed',
        clientId: this.props.clientId,
        event: 'error',
        error: error.message
      }, '*');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Widget Error
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              The chat widget encountered an error. Please try refreshing.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
            >
              Refresh Widget
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

