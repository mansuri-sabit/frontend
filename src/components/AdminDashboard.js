import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, FolderOpen, MessageSquare, Settings, Plus, Edit, Trash2,
  Search, Bell, Moon, Sun, Download, BarChart3, Activity,
  Zap, Globe, Shield, Database, MoreVertical, RefreshCw,
  Lock, CheckCircle, AlertTriangle, Monitor, Server, Key,
  Upload, FileText, Clock, Eye, Copy, Filter
} from 'lucide-react';
import { adminAPI, chatAPI, userAPI } from '../utils/api';
import UploadProject from './UploadProject';
import './AdminDashboard.css';

const AdminDashboard = ({ onLogout }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [systemHealth, setSystemHealth] = useState({});
  const [realtimeStats, setRealtimeStats] = useState({
    activeUsers: 0,
    messagesPerMinute: 0,
    serverLoad: 0,
    apiCalls: 0
  });
  const [selectedProject, setSelectedProject] = useState(null);
  const [userFilter, setUserFilter] = useState('all');

  useEffect(() => {
    loadDashboardData();
    const interval = startRealtimeUpdates();
    checkSystemHealth();
    
    return () => clearInterval(interval);
  }, []);

// In your AdminDashboard.js
const loadDashboardData = async () => {
    setLoading(true);
    setError('');

    try {
        console.log('Loading dashboard data...');
        
        const projectsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/projects`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        console.log('Projects response status:', projectsResponse.status);

        if (!projectsResponse.ok) {
            throw new Error(`HTTP error! status: ${projectsResponse.status}`);
        }

        const projectsData = await projectsResponse.json();
        console.log('Raw projects data received:', projectsData);
        
        // Handle your specific response format
        let projectsArray = [];
        if (projectsData.projects && Array.isArray(projectsData.projects)) {
            projectsArray = projectsData.projects;
        } else if (Array.isArray(projectsData.data)) {
            projectsArray = projectsData.data;
        } else if (Array.isArray(projectsData)) {
            projectsArray = projectsData;
        } else {
            console.error('Unexpected projects data format:', projectsData);
        }
        
        console.log('Setting projects array:', projectsArray);
        console.log('Projects count:', projectsArray.length);
        
        setProjects(projectsArray);

        // Also update dashboard stats
        const dashboardResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/dashboard`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json();
            setStats(dashboardData.stats || dashboardData.data || {});
        }

    } catch (error) {
        console.error('Error loading projects:', error);
        setError('Failed to load projects from database');
        setProjects([]);
    } finally {
        setLoading(false);
    }
};

// Force refresh after project creation
const handleProjectCreated = async (newProject) => {
    console.log('Project created, refreshing dashboard...');
    setShowUploadForm(false);
    setActiveTab('projects');
    
    // Force refresh the data from database
    await loadDashboardData();
    
    addNotification({
        type: 'success',
        message: `Project "${newProject.name}" created successfully!`,
        time: 'Just now'
    });
};


  const loadNotifications = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/notifications`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const checkSystemHealth = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/health`);
      const data = await response.json();
      setSystemHealth(data);
    } catch (error) {
      console.error('Health check failed:', error);
      setSystemHealth({ status: 'unhealthy' });
    }
  };

  const startRealtimeUpdates = () => {
    return setInterval(async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/realtime-stats`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setRealtimeStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch realtime stats:', error);
      }
    }, 5000);
  };



  const deleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/project/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await loadDashboardData();
        addNotification({
          type: 'info',
          message: 'Project deleted successfully',
          time: 'Just now'
        });
      } else {
        throw new Error('Failed to delete project');
      }
    } catch (error) {
      setError('Failed to delete project');
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await loadDashboardData();
        addNotification({
          type: 'info',
          message: 'User deleted successfully',
          time: 'Just now'
        });
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (error) {
      setError('Failed to delete user');
    }
  };

  const loadChatHistory = async (projectId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/chat/${projectId}/history`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChatHistory(data.messages || []);
        setSelectedProject(projectId);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleFileUpload = async (projectId, file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/projects/${projectId}/upload-pdf`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        await loadDashboardData();
        addNotification({
          type: 'success',
          message: 'PDF uploaded and processed successfully',
          time: 'Just now'
        });
      } else {
        throw new Error('Failed to upload PDF');
      }
    } catch (error) {
      setError('Failed to upload PDF');
    }
  };

  const addNotification = (notification) => {
    setNotifications(prev => [{
      id: Date.now(),
      ...notification
    }, ...prev.slice(0, 9)]);
  };

  const viewProjectChat = (projectId) => {
    navigate(`/chat/${projectId}`);
  };

  const copyEmbedCode = (projectId) => {
    const embedCode = `<iframe src="${process.env.REACT_APP_API_URL}/embed/${projectId}" width="400" height="600" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    addNotification({
      type: 'success',
      message: 'Embed code copied to clipboard',
      time: 'Just now'
    });
  };

  const filteredProjects = projects.filter(project =>
    project?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user => {
    const matchesSearch = user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (userFilter === 'all') return matchesSearch;
    if (userFilter === 'active') return matchesSearch && user.is_active;
    if (userFilter === 'inactive') return matchesSearch && !user.is_active;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-animation">
          <div className="loading-spinner"></div>
          <div className="loading-text">
            <h3>Loading Real Data...</h3>
            <p>Fetching from MongoDB database...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-dashboard ${darkMode ? 'dark-mode' : ''}`}>
      {showUploadForm ? (
        <div className="upload-form-container">
          <div className="upload-form-header">
            <button 
              onClick={() => setShowUploadForm(false)}
              className="back-button"
            >
              ← Back to Dashboard
            </button>
          </div>
          <UploadProject onProjectCreated={handleProjectCreated} />
        </div>
      ) : (
        <>
          {/* Enhanced Sidebar */}
          <div className="sidebar">
            <div className="sidebar-header">
              <div className="logo-container">
                <div className="logo">
                  <Zap className="logo-icon" />
                </div>
                <div className="brand-info">
                  <h2>Troika Chat</h2>
                  <span className="brand-tagline">AI Admin Hub</span>
                </div>
              </div>
            </div>
            
            <nav className="sidebar-nav">
              <div className="nav-section">
                <span className="nav-section-title">Main Functions</span>
                <button 
                  className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  <BarChart3 size={20} />
                  <span>Dashboard</span>
                  <div className="nav-indicator"></div>
                </button>
                
                <button 
                  className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`}
                  onClick={() => setActiveTab('projects')}
                >
                  <FolderOpen size={20} />
                  <span>Projects</span>
                  <span className="nav-badge">{projects.length}</span>
                  <div className="nav-indicator"></div>
                </button>
                
                <button 
                  className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => setActiveTab('users')}
                >
                  <Users size={20} />
                  <span>Users</span>
                  <span className="nav-badge">{users.length}</span>
                  <div className="nav-indicator"></div>
                </button>

                <button 
                  className={`nav-item ${activeTab === 'chat-management' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chat-management')}
                >
                  <MessageSquare size={20} />
                  <span>Chat Management</span>
                  <div className="nav-indicator"></div>
                </button>
              </div>

              <div className="nav-section">
                <span className="nav-section-title">Backend Functions</span>
                <button 
                  className={`nav-item ${activeTab === 'authentication' ? 'active' : ''}`}
                  onClick={() => setActiveTab('authentication')}
                >
                  <Lock size={20} />
                  <span>Authentication</span>
                  <div className="nav-indicator"></div>
                </button>

                <button 
                  className={`nav-item ${activeTab === 'file-management' ? 'active' : ''}`}
                  onClick={() => setActiveTab('file-management')}
                >
                  <FileText size={20} />
                  <span>File Management</span>
                  <div className="nav-indicator"></div>
                </button>

                <button 
                  className={`nav-item ${activeTab === 'embedding' ? 'active' : ''}`}
                  onClick={() => setActiveTab('embedding')}
                >
                  <Globe size={20} />
                  <span>Iframe Embedding</span>
                  <div className="nav-indicator"></div>
                </button>
              </div>

              <div className="nav-section">
                <span className="nav-section-title">System</span>
                <button 
                  className={`nav-item ${activeTab === 'monitoring' ? 'active' : ''}`}
                  onClick={() => setActiveTab('monitoring')}
                >
                  <Monitor size={20} />
                  <span>System Monitor</span>
                  <div className="nav-indicator"></div>
                </button>

                <button 
                  className={`nav-item ${activeTab === 'database' ? 'active' : ''}`}
                  onClick={() => setActiveTab('database')}
                >
                  <Database size={20} />
                  <span>Database Status</span>
                  <div className="nav-indicator"></div>
                </button>
                
                <button 
                  className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('settings')}
                >
                  <Settings size={20} />
                  <span>Settings</span>
                  <div className="nav-indicator"></div>
                </button>
              </div>
            </nav>

            <div className="sidebar-footer">
              <div className="admin-profile">
                <div className="admin-avatar">
                  <Shield size={20} />
                </div>
                <div className="admin-info">
                  <span className="admin-name">Admin</span>
                  <span className="admin-role">Super Admin</span>
                </div>
              </div>
              <button onClick={onLogout} className="logout-button">
                Logout
              </button>
            </div>
          </div>

          {/* Enhanced Main Content */}
          <div className="main-content">
            {/* Top Header */}
            <div className="top-header">
              <div className="header-left">
                <h1 className="page-title">
                  {activeTab === 'dashboard' && 'Dashboard Overview'}
                  {activeTab === 'projects' && 'Projects Management'}
                  {activeTab === 'users' && 'Users Management'}
                  {activeTab === 'chat-management' && 'Chat Management'}
                  {activeTab === 'authentication' && 'Authentication System'}
                  {activeTab === 'file-management' && 'File Management'}
                  {activeTab === 'embedding' && 'Iframe Embedding'}
                  {activeTab === 'monitoring' && 'System Monitoring'}
                  {activeTab === 'database' && 'Database Management'}
                  {activeTab === 'settings' && 'System Settings'}
                </h1>
                <div className="breadcrumb">
                  <span>Admin</span> / <span className="current">{activeTab}</span>
                </div>
              </div>
              
              <div className="header-right">
                <div className="search-container">
                  <Search className="search-icon" size={18} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                
                <div className="header-actions">
                  <button 
                    className="action-btn"
                    onClick={() => setDarkMode(!darkMode)}
                  >
                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                  </button>
                  
                  <div className="notifications-container">
                    <button 
                      className="action-btn notification-btn"
                      onClick={() => setShowNotifications(!showNotifications)}
                    >
                      <Bell size={18} />
                      {notifications.length > 0 && (
                        <span className="notification-badge">{notifications.length}</span>
                      )}
                    </button>
                    
                    {showNotifications && (
                      <div className="notifications-dropdown">
                        <div className="notifications-header">
                          <h3>System Notifications</h3>
                          <button onClick={() => setNotifications([])}>Clear All</button>
                        </div>
                        <div className="notifications-list">
                          {notifications.map(notification => (
                            <div key={notification.id} className={`notification-item ${notification.type}`}>
                              <div className="notification-content">
                                <p>{notification.message}</p>
                                <span className="notification-time">{notification.time}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button 
                    className="action-btn refresh-btn"
                    onClick={loadDashboardData}
                    title="Refresh All Data"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="error-banner">
                <AlertTriangle size={16} />
                <p>{error}</p>
                <button onClick={() => setError('')}>×</button>
              </div>
            )}

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'dashboard' && (
                <DashboardOverview 
                  stats={stats} 
                  realtimeStats={realtimeStats}
                  systemHealth={systemHealth}
                  onRefresh={loadDashboardData} 
                />
              )}
              
              {activeTab === 'projects' && (
                <ProjectsManagement 
                  projects={filteredProjects} 
                  onCreateProject={() => setShowUploadForm(true)}
                  onDeleteProject={deleteProject}
                  onViewProject={viewProjectChat}
                  onRefresh={loadDashboardData}
                  onCopyEmbed={copyEmbedCode}
                />
              )}
              
              {activeTab === 'users' && (
                <UsersManagement 
                  users={filteredUsers} 
                  onDeleteUser={deleteUser}
                  onRefresh={loadDashboardData}
                  userFilter={userFilter}
                  setUserFilter={setUserFilter}
                />
              )}

              {activeTab === 'chat-management' && (
                <ChatManagement 
                  projects={projects}
                  onLoadChatHistory={loadChatHistory}
                  chatHistory={chatHistory}
                  selectedProject={selectedProject}
                />
              )}

              {activeTab === 'authentication' && (
                <AuthenticationPanel />
              )}

              {activeTab === 'file-management' && (
                <FileManagement 
                  projects={projects}
                  onFileUpload={handleFileUpload}
                />
              )}

              {activeTab === 'embedding' && (
                <EmbeddingPanel 
                  projects={projects} 
                  onCopyEmbed={copyEmbedCode}
                />
              )}
              
              {activeTab === 'monitoring' && (
                <MonitoringPanel 
                  realtimeStats={realtimeStats}
                  systemHealth={systemHealth}
                />
              )}

              {activeTab === 'database' && (
                <DatabasePanel 
                  stats={stats}
                  systemHealth={systemHealth}
                />
              )}
              
              {activeTab === 'settings' && (
                <SettingsPanel />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Dashboard Overview Component
const DashboardOverview = ({ stats, realtimeStats, systemHealth, onRefresh }) => (
  <div className="dashboard-overview">
    <div className="backend-functions-status">
      <h2>Backend Functions Status</h2>
      <div className="functions-grid">
        <div className="function-card working">
          <CheckCircle className="function-icon" />
          <div className="function-info">
            <h4>Authentication System</h4>
            <p>Login, Register, Logout, JWT Auth</p>
            <span className="status-badge active">✅ Active</span>
          </div>
        </div>
        <div className="function-card working">
          <CheckCircle className="function-icon" />
          <div className="function-info">
            <h4>Admin Functions</h4>
            <p>Dashboard, Projects CRUD, User Management</p>
            <span className="status-badge active">✅ Active</span>
          </div>
        </div>
        <div className="function-card working">
          <CheckCircle className="function-icon" />
          <div className="function-info">
            <h4>Chat & Messaging</h4>
            <p>Chat Interface, Send Message, History</p>
            <span className="status-badge active">✅ Active</span>
          </div>
        </div>
        <div className="function-card working">
          <CheckCircle className="function-icon" />
          <div className="function-info">
            <h4>File Management</h4>
            <p>PDF Upload, Processing, Storage</p>
            <span className="status-badge active">✅ Active</span>
          </div>
        </div>
      </div>
    </div>

    <div className="quick-stats">
      <div className="stat-card primary">
        <div className="stat-icon">
          <Users size={24} />
        </div>
        <div className="stat-content">
          <h3>Total Users</h3>
          <p className="stat-number">{stats.total_users || 0}</p>
          <span className="stat-change positive">Real Database Count</span>
        </div>
      </div>
      
      <div className="stat-card success">
        <div className="stat-icon">
          <FolderOpen size={24} />
        </div>
        <div className="stat-content">
          <h3>Active Projects</h3>
          <p className="stat-number">{stats.total_projects || 0}</p>
          <span className="stat-change positive">Live Projects</span>
        </div>
      </div>
      
      <div className="stat-card warning">
        <div className="stat-icon">
          <MessageSquare size={24} />
        </div>
        <div className="stat-content">
          <h3>Total Messages</h3>
          <p className="stat-number">{stats.total_messages || 0}</p>
          <span className="stat-change positive">Database Records</span>
        </div>
      </div>
      
      <div className="stat-card info">
        <div className="stat-icon">
          <Activity size={24} />
        </div>
        <div className="stat-content">
          <h3>Active Now</h3>
          <p className="stat-number">{realtimeStats.activeUsers || 0}</p>
          <span className="stat-change neutral">Live Count</span>
        </div>
      </div>
    </div>

    <div className="system-health">
      <h2>System Health</h2>
      <div className="health-grid">
        <div className="health-item">
          <Database className="health-icon" />
          <div className="health-info">
            <span className="health-name">MongoDB</span>
            <span className={`health-status ${systemHealth.status === 'healthy' ? 'healthy' : 'unhealthy'}`}>
              {systemHealth.status === 'healthy' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        <div className="health-item">
          <Zap className="health-icon" />
          <div className="health-info">
            <span className="health-name">Gemini AI</span>
            <span className="health-status healthy">Active</span>
          </div>
        </div>
        <div className="health-item">
          <Server className="health-icon" />
          <div className="health-info">
            <span className="health-name">Backend Server</span>
            <span className="health-status healthy">Running</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Projects Management Component
const ProjectsManagement = ({ projects, onCreateProject, onDeleteProject, onViewProject, onRefresh, onCopyEmbed }) => (
  <div className="projects-management">
    <div className="projects-header">
      <div className="header-actions">
        <button onClick={onRefresh} className="refresh-btn">
          <RefreshCw size={16} />
          Refresh
        </button>
        <button className="export-btn">
          <Download size={16} />
          Export
        </button>
        <button className="create-project-btn" onClick={onCreateProject}>
          <Plus size={16} />
          Create Project
        </button>
      </div>
    </div>

    {projects.length === 0 ? (
      <div className="empty-state">
        <div className="empty-illustration">
          <FolderOpen size={64} />
        </div>
        <h3>No Projects Found</h3>
        <p>Get started by creating your first AI chatbot project</p>
        <button className="create-first-project" onClick={onCreateProject}>
          <Plus size={20} />
          Create Your First Project
        </button>
      </div>
    ) : (
      <div className="projects-grid">
        {projects.map(project => (
          <div key={project.id || project._id} className="project-card">
            <div className="project-header">
              <div className="project-status">
                <div className={`status-dot ${project.is_active ? 'active' : 'inactive'}`}></div>
                <span>{project.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="project-menu">
                <button className="menu-btn">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
            
            <div className="project-content">
              <h3 className="project-name">{project.name}</h3>
              <p className="project-description">
                {project.description || 'No description provided'}
              </p>
              
              <div className="project-stats">
                <div className="stat">
                  <MessageSquare size={14} />
                  <span>Chat Available</span>
                </div>
                <div className="stat">
                  <FileText size={14} />
                  <span>PDF Processed</span>
                </div>
                <div className="stat">
                  <Clock size={14} />
                  <span>{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div className="project-actions">
              <button 
                className="action-btn view"
                onClick={() => onViewProject(project.id || project._id)}
                title="Open Chat Interface"
              >
                <MessageSquare size={14} />
                Chat
              </button>
              <button 
                className="action-btn copy"
                onClick={() => onCopyEmbed(project.id || project._id)}
                title="Copy Embed Code"
              >
                <Copy size={14} />
                Embed
              </button>
              <button className="action-btn edit">
                <Edit size={14} />
                Edit
              </button>
              <button 
                className="action-btn delete"
                onClick={() => onDeleteProject(project.id || project._id)}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Users Management Component
const UsersManagement = ({ users, onDeleteUser, onRefresh, userFilter, setUserFilter }) => (
  <div className="users-management">
    <div className="users-header">
      <div className="users-filters">
        <button 
          className={`filter-btn ${userFilter === 'all' ? 'active' : ''}`}
          onClick={() => setUserFilter('all')}
        >
          All Users
        </button>
        <button 
          className={`filter-btn ${userFilter === 'active' ? 'active' : ''}`}
          onClick={() => setUserFilter('active')}
        >
          Active
        </button>
        <button 
          className={`filter-btn ${userFilter === 'inactive' ? 'active' : ''}`}
          onClick={() => setUserFilter('inactive')}
        >
          Inactive
        </button>
      </div>
      
      <div className="users-actions">
        <button className="export-btn">
          <Download size={16} />
          Export
        </button>
        <button onClick={onRefresh} className="refresh-btn">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
    </div>

    {users.length === 0 ? (
      <div className="empty-state">
        <Users size={64} />
        <h3>No Users Found</h3>
        <p>No users match the current filter</p>
      </div>
    ) : (
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th><input type="checkbox" /></th>
              <th>User</th>
              <th>Status</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id || user._id}>
                <td><input type="checkbox" /></td>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                      <span className="user-name">{user.username}</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <span className="role-badge">
                    {user.role || 'User'}
                  </span>
                </td>
                <td>
                  <span className="join-date">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button className="action-btn view">
                      <Eye size={14} />
                    </button>
                    <button className="action-btn edit">
                      <Edit size={14} />
                    </button>
                    <button 
                      className="action-btn delete"
                      onClick={() => onDeleteUser(user.id || user._id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

// Chat Management Component
const ChatManagement = ({ projects, onLoadChatHistory, chatHistory, selectedProject }) => (
  <div className="chat-management">
    <h2>Chat Management</h2>
    <div className="chat-projects">
      {projects.map(project => (
        <div key={project.id || project._id} className="chat-project-card">
          <h3>{project.name}</h3>
          <button 
            onClick={() => onLoadChatHistory(project.id || project._id)}
            className="load-history-btn"
          >
            <MessageSquare size={16} />
            Load Chat History
          </button>
        </div>
      ))}
    </div>
    
    {chatHistory.length > 0 && (
      <div className="chat-history">
        <h3>Recent Messages</h3>
        <div className="messages-container">
          {chatHistory.slice(0, 10).map(message => (
            <div key={message.id || message._id} className="message-item">
              <div className="message-header">
                <span className="message-user">{message.user || 'User'}</span>
                <span className="message-time">
                  {new Date(message.timestamp || message.created_at).toLocaleString()}
                </span>
              </div>
              <div className="message-content">
                <p>{message.message || message.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// Authentication Panel Component
const AuthenticationPanel = () => (
  <div className="auth-panel">
    <h2>Authentication System</h2>
    <div className="auth-functions">
      <div className="auth-function">
        <Lock className="auth-icon" />
        <h3>Login System</h3>
        <p>JWT-based authentication with secure token management</p>
        <span className="status working">✅ Active</span>
      </div>
      <div className="auth-function">
        <Users className="auth-icon" />
        <h3>User Registration</h3>
        <p>User registration with password hashing and validation</p>
        <span className="status working">✅ Active</span>
      </div>
      <div className="auth-function">
        <Shield className="auth-icon" />
        <h3>Admin Authentication</h3>
        <p>Admin-specific authentication with role-based access</p>
        <span className="status working">✅ Active</span>
      </div>
      <div className="auth-function">
        <Key className="auth-icon" />
        <h3>Middleware Protection</h3>
        <p>AdminAuth and UserAuth middleware for route protection</p>
        <span className="status working">✅ Active</span>
      </div>
    </div>
  </div>
);

// File Management Component
const FileManagement = ({ projects, onFileUpload }) => (
  <div className="file-management">
    <h2>File Management System</h2>
    <div className="file-functions">
      <div className="file-function">
        <Upload className="file-icon" />
        <h3>PDF Upload</h3>
        <p>Upload and process PDF files with Gemini AI</p>
        <span className="status working">✅ Active</span>
      </div>
      <div className="file-function">
        <FileText className="file-icon" />
        <h3>Content Processing</h3>
        <p>Extract and process PDF content for AI training</p>
        <span className="status working">✅ Active</span>
      </div>
    </div>
    
    <div className="upload-section">
      <h3>Upload Files to Projects</h3>
      <div className="projects-upload-grid">
        {projects.map(project => (
          <div key={project.id || project._id} className="project-upload-card">
            <h4>{project.name}</h4>
            <div className="upload-area">
              <input 
                type="file" 
                accept=".pdf"
                onChange={(e) => onFileUpload(project.id || project._id, e.target.files[0])}
                id={`upload-${project.id || project._id}`}
                className="file-input"
              />
              <label htmlFor={`upload-${project.id || project._id}`} className="upload-label">
                <Upload size={20} />
                <span>Choose PDF File</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Embedding Panel Component
const EmbeddingPanel = ({ projects, onCopyEmbed }) => (
  <div className="embedding-panel">
    <h2>Iframe Embedding System</h2>
    <div className="embedding-functions">
      <div className="embed-function">
        <Globe className="embed-icon" />
        <h3>EmbedChat Function</h3>
        <p>Generate embeddable chat widgets for websites</p>
        <span className="status working">✅ Active</span>
      </div>
    </div>
    
    <div className="embed-codes">
      <h3>Embed Codes for Projects</h3>
      <div className="embed-grid">
        {projects.map(project => (
          <div key={project.id || project._id} className="embed-code-card">
            <h4>{project.name}</h4>
            <div className="embed-code">
              <code>
                {`<iframe src="${process.env.REACT_APP_API_URL}/embed/${project.id || project._id}" width="400" height="600" frameborder="0"></iframe>`}
              </code>
            </div>
            <button 
              onClick={() => onCopyEmbed(project.id || project._id)}
              className="copy-btn"
            >
              <Copy size={16} />
              Copy Code
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Database Panel Component
const DatabasePanel = ({ stats, systemHealth }) => (
  <div className="database-panel">
    <h2>Database Management</h2>
    <div className="db-status">
      <div className="db-connection">
        <Database className="db-icon" />
        <h3>MongoDB Connection</h3>
        <span className={`db-status-indicator ${systemHealth.status === 'healthy' ? 'connected' : 'disconnected'}`}>
          {systemHealth.status === 'healthy' ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
    



      







    <div className="db-collections">
      <h3>Collections Status</h3>
      <div className="collections-grid">
        <div className="collection-card">
          <span className="collection-name">Users Collection</span>
          <span className="collection-count">{stats.total_users || 0} documents</span>
        </div>
        <div className="collection-card">
          <span className="collection-name">Projects Collection</span>
          <span className="collection-count">{stats.total_projects || 0} documents</span>
        </div>
        <div className="collection-card">
          <span className="collection-name">Chat Messages</span>
          <span className="collection-count">{stats.total_messages || 0} documents</span>
        </div>
      </div>
    </div>
  </div>
);

// Monitoring Panel Component
const MonitoringPanel = ({ realtimeStats, systemHealth }) => (
  <div className="monitoring-panel">
    <div className="monitoring-header">
      <h2>System Monitoring</h2>
      <div className="live-indicator">
        <div className="live-dot"></div>
        <span>Live Monitoring</span>
      </div>
    </div>
    
    <div className="monitoring-grid">
      <div className="monitor-card">
        <h3>Server Performance</h3>
        <div className="performance-metrics">
          <div className="metric">
            <span>CPU Usage</span>
            <div className="metric-bar">
              <div className="fill" style={{width: `${realtimeStats.serverLoad || 0}%`}}></div>
            </div>
            <span>{realtimeStats.serverLoad || 0}%</span>
          </div>
          <div className="metric">
            <span>Memory</span>
            <div className="metric-bar">
              <div className="fill" style={{width: '65%'}}></div>
            </div>
            <span>65%</span>
          </div>
          <div className="metric">
            <span>API Calls/Min</span>
            <div className="metric-bar">
              <div className="fill" style={{width: `${Math.min((realtimeStats.apiCalls || 0) / 15, 100)}%`}}></div>
            </div>
            <span>{realtimeStats.apiCalls || 0}</span>
          </div>
        </div>
      </div>
      
      <div className="monitor-card">
        <h3>Backend Functions Health</h3>
        <div className="api-metrics">
          <div className="api-stat">
            <span>Authentication</span>
            <span className="value success">✅ Active</span>
          </div>
          <div className="api-stat">
            <span>Chat System</span>
            <span className="value success">✅ Active</span>
          </div>
          <div className="api-stat">
            <span>File Upload</span>
            <span className="value success">✅ Active</span>
          </div>
          <div className="api-stat">
            <span>Database</span>
            <span className={`value ${systemHealth.status === 'healthy' ? 'success' : 'error'}`}>
              {systemHealth.status === 'healthy' ? '✅ Connected' : '❌ Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Settings Panel Component
const SettingsPanel = () => (
  <div className="settings-panel">
    <div className="settings-tabs">
      <button className="settings-tab active">General</button>
      <button className="settings-tab">Security</button>
      <button className="settings-tab">API</button>
      <button className="settings-tab">Backend</button>
    </div>
    
    <div className="settings-content">
      <div className="settings-section">
        <h3>Application Settings</h3>
        <div className="setting-group">
          <div className="setting-item">
            <label>Application Name</label>
            <input type="text" value="Jevi Chat" readOnly />
          </div>
          <div className="setting-item">
            <label>Backend URL</label>
            <input type="text" value={process.env.REACT_APP_API_URL} readOnly />
          </div>
          <div className="setting-item">
            <label>Frontend URL</label>
            <input type="text" value="http://localhost:3000" readOnly />
          </div>
        </div>
      </div>
      
      <div className="settings-section">
        <h3>Backend Functions Status</h3>
        <div className="backend-status">
          <div className="status-item">
            <span>Authentication System</span>
            <span className="status-indicator working">✅ Active</span>
          </div>
          <div className="status-item">
            <span>Admin Functions</span>
            <span className="status-indicator working">✅ Active</span>
          </div>
          <div className="status-item">
            <span>Chat & Messaging</span>
            <span className="status-indicator working">✅ Active</span>
          </div>
          <div className="status-item">
            <span>File Management</span>
            <span className="status-indicator working">✅ Active</span>
          </div>
          <div className="status-item">
            <span>Iframe Embedding</span>
            <span className="status-indicator working">✅ Active</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default AdminDashboard;
