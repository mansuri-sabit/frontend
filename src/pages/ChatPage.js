import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userAPI, adminAPI } from '../utils/api';
import ChatInterface from '../components/ChatInterface';
import '../styles/ChatPage.css';

const ChatPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  const checkUserRole = useCallback(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setIsAdmin(payload.role === 'admin' || payload.is_admin);
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
  }, []);

  const loadProject = useCallback(async () => {
    if (!projectId) {
      setError('Project ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Use appropriate API based on user role
      const apiCall = isAdmin ? adminAPI.getProject : userAPI.getProject;
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/project/${projectId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please login again.');
        } else if (response.status === 403) {
          throw new Error('You don\'t have permission to access this project.');
        } else if (response.status === 404) {
          throw new Error('Project not found.');
        } else {
          throw new Error(`Failed to load project: ${response.status}`);
        }
      }

      const data = await response.json();
      
      // Handle different response formats
      if (data.project) {
        setProject(data.project);
      } else if (data.data && data.data.project) {
        setProject(data.data.project);
      } else if (data.name) {
        // Direct project object
        setProject(data);
      } else {
        throw new Error('Invalid project data format');
      }

    } catch (error) {
      console.error('Error loading project:', error);
      setError(error.message || 'Failed to load project');
      
      // Redirect to login if authentication error
      if (error.message.includes('Authentication')) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, isAdmin, navigate]);

  useEffect(() => {
    checkUserRole();
  }, [checkUserRole]);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [loadProject, projectId]);

  // Retry function for failed loads
  const retryLoad = () => {
    setError('');
    loadProject();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-animation">
          <div className="loading-spinner"></div>
          <div className="loading-text">
            <h3>Loading Chat...</h3>
            <p>Connecting to {projectId ? `project ${projectId}` : 'chat system'}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h2>Unable to Load Chat</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button onClick={retryLoad} className="retry-btn">
              🔄 Retry
            </button>
            <button onClick={() => navigate('/admin')} className="back-btn">
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-icon">📭</div>
          <h2>Project Not Found</h2>
          <p>The requested project could not be found or may have been deleted.</p>
          <button onClick={() => navigate('/admin')} className="back-btn">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-page-header">
        <div className="header-left">
          <button onClick={() => navigate('/admin')} className="back-btn">
            ← Back to Dashboard
          </button>
          <div className="project-title">
            <h1>Chat with {project.name}</h1>
            <p className="project-description">{project.description}</p>
          </div>
        </div>
        <div className="header-right">
          <div className="project-info">
            <span className={`project-status ${project.is_active ? 'active' : 'inactive'}`}>
              {project.is_active ? '🟢 Active' : '🔴 Inactive'}
            </span>
            <span className="project-id">ID: {projectId}</span>
          </div>
        </div>
      </div>
      
      <div className="chat-container">
        <ChatInterface 
          projectId={projectId} 
          project={project} 
          onError={setError}
          onProjectUpdate={setProject}
        />
      </div>
    </div>
  );
};

export default ChatPage;
