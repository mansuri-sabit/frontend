import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { userAPI } from '../utils/api';
import ChatInterface from './ChatInterface';

const EmbedChat = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProject = useCallback(async () => {
    try {
      const response = await userAPI.getProject(projectId);
      setProject(response.data.project);
    } catch (error) {
      console.error('Error loading project:', error);
      setError('Project not found or inactive');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  if (loading) {
    return (
      <div className="embed-loading">
        <div className="loading-spinner"></div>
        <p>Loading chat...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="embed-error">
        <h3>Chat Unavailable</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="embed-container">
      <ChatInterface 
        projectId={projectId} 
        isEmbedded={true}
        project={project}
      />
      
      <div className="powered-by">
        <span>Powered by <strong>Jevi Chat</strong></span>
      </div>
    </div>
  );
};

export default EmbedChat;
