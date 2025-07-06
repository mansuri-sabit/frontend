import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  X, 
  Check, 
  AlertCircle, 
  Loader, 
  Sparkles,
  Zap,
  Shield,
  Clock,
  Database,
  Settings,
  Eye,
  ChevronRight,
  ChevronLeft,
  Star,
  Rocket,
  Brain,
  Magic
} from 'lucide-react';
import axios from 'axios';
import '../styles/UploadProject.css';

const UploadProject = ({ onProjectCreated }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    category: '',
    gemini_api_key: '',
    gemini_model: 'gemini-1.5-flash',
    gemini_daily_limit: 100,
    gemini_monthly_limit: 3000,
    gemini_enabled: true,
    welcome_message: 'Hello! How can I help you today?'
  });

  // ... (keeping all existing functions unchanged for brevity)

  const stepIcons = [
    { icon: Brain, label: 'Project Setup', desc: 'Define your AI project', color: '#6366f1' },
    { icon: Upload, label: 'Knowledge Base', desc: 'Upload training data', color: '#8b5cf6' },
    { icon: Magic, label: 'AI Configuration', desc: 'Customize intelligence', color: '#ec4899' },
    { icon: Rocket, label: 'Launch Ready', desc: 'Deploy your bot', color: '#06b6d4' }
  ];

  return (
    <div className="upload-project-wrapper">
      {/* Background Elements */}
      <div className="bg-decoration">
        <div className="floating-orb orb-1"></div>
        <div className="floating-orb orb-2"></div>
        <div className="floating-orb orb-3"></div>
        <div className="grid-pattern"></div>
      </div>

      <div className="upload-project-container">
        {/* Enhanced Header */}
        <div className="upload-header">
          <div className="header-badge">
            <Star size={16} />
            <span>AI Project Builder</span>
          </div>
          
          <div className="header-content">
            <div className="header-icon-group">
              <div className="main-icon-wrapper">
                <Brain className="main-icon" />
                <div className="icon-glow"></div>
              </div>
              <div className="floating-icons">
                <Sparkles className="float-icon icon-1" />
                <Zap className="float-icon icon-2" />
                <Magic className="float-icon icon-3" />
              </div>
            </div>
            
            <h1 className="header-title">
              Create Your AI Assistant
              <span className="header-subtitle">
                Transform documents into intelligent conversations
              </span>
            </h1>
          </div>

          <div className="progress-section">
            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ width: `${(currentStep / 4) * 100}%` }}
              >
                <div className="progress-glow"></div>
              </div>
            </div>
            <div className="progress-info">
              <span className="step-counter">{currentStep} / 4</span>
              <span className="step-name">{stepIcons[currentStep - 1]?.label}</span>
            </div>
          </div>
        </div>

        {/* Enhanced Progress Steps */}
        <div className="progress-steps">
          {stepIcons.map((step, index) => {
            const StepIcon = step.icon;
            const stepNumber = index + 1;
            const isActive = currentStep === stepNumber;
            const isCompleted = currentStep > stepNumber;
            const isPending = currentStep < stepNumber;
            
            return (
              <div
                key={stepNumber}
                className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isPending ? 'pending' : ''}`}
              >
                <div className="step-connector">
                  <div className="connector-line"></div>
                </div>
                
                <div className="step-circle" style={{ '--step-color': step.color }}>
                  <div className="circle-inner">
                    {isCompleted ? (
                      <Check size={20} className="step-check" />
                    ) : (
                      <StepIcon size={20} className="step-icon" />
                    )}
                  </div>
                  {isActive && <div className="pulse-ring"></div>}
                </div>
                
                <div className="step-details">
                  <h4 className="step-title">{step.label}</h4>
                  <p className="step-description">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enhanced Messages */}
        {error && (
          <div className="notification error-notification">
            <div className="notification-icon">
              <AlertCircle size={20} />
            </div>
            <div className="notification-content">
              <h4>Oops! Something went wrong</h4>
              <p>{error}</p>
            </div>
            <button onClick={() => setError('')} className="notification-close">
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="notification success-notification">
            <div className="notification-icon">
              <Check size={20} />
            </div>
            <div className="notification-content">
              <h4>Success!</h4>
              <p>{success}</p>
            </div>
            <div className="success-sparkles">
              <Sparkles className="sparkle-1" />
              <Sparkles className="sparkle-2" />
            </div>
          </div>
        )}

        {/* Enhanced Step Content */}
        <div className="step-content-wrapper">
          <div className="content-card">
            {/* Step 1: Enhanced Project Information */}
            {currentStep === 1 && (
              <div className="form-step project-info-step">
                <div className="step-header">
                  <div className="header-icon">
                    <Brain size={24} />
                  </div>
                  <div className="header-text">
                    <h3>Project Foundation</h3>
                    <p>Let's start by defining your AI assistant's identity and purpose</p>
                  </div>
                </div>
                
                <div className="form-layout">
                  <div className="input-group featured">
                    <label className="input-label">
                      <Zap size={16} />
                      <span>Project Name</span>
                      <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        value={projectData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="e.g., Customer Support Bot, Knowledge Assistant..."
                        className="enhanced-input"
                        required
                      />
                      <div className="input-glow"></div>
                    </div>
                  </div>
                  
                  <div className="input-group">
                    <label className="input-label">
                      <Star size={16} />
                      <span>Category</span>
                    </label>
                    <div className="select-wrapper">
                      <select
                        value={projectData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="enhanced-select"
                      >
                        <option value="">Choose your domain</option>
                        <option value="customer-support">🎧 Customer Support</option>
                        <option value="education">📚 Education & Training</option>
                        <option value="healthcare">🏥 Healthcare Assistant</option>
                        <option value="ecommerce">🛒 E-commerce Helper</option>
                        <option value="finance">💰 Financial Advisor</option>
                        <option value="hr">👥 HR Assistant</option>
                        <option value="legal">⚖️ Legal Consultant</option>
                        <option value="other">🔧 Custom Solution</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="input-group full-width">
                    <label className="input-label">
                      <FileText size={16} />
                      <span>Project Vision</span>
                    </label>
                    <div className="textarea-wrapper">
                      <textarea
                        value={projectData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe what you want your AI assistant to accomplish. What problems will it solve? Who will use it?"
                        rows={4}
                        className="enhanced-textarea"
                      />
                      <div className="char-counter">
                        {projectData.description.length} / 500
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Enhanced File Upload */}
            {currentStep === 2 && (
              <div className="form-step upload-step">
                <div className="step-header">
                  <div className="header-icon">
                    <Upload size={24} />
                  </div>
                  <div className="header-text">
                    <h3>Knowledge Base</h3>
                    <p>Upload documents to train your AI assistant's knowledge</p>
                  </div>
                </div>
                
                <div 
                  {...getRootProps()} 
                  className={`enhanced-dropzone ${isDragActive ? 'drag-active' : ''}`}
                >
                  <input {...getInputProps()} />
                  <div className="dropzone-visual">
                    <div className="upload-icon-container">
                      <Upload className="upload-icon" />
                      <div className="upload-rings">
                        <div className="ring ring-1"></div>
                        <div className="ring ring-2"></div>
                        <div className="ring ring-3"></div>
                      </div>
                    </div>
                    
                    <div className="dropzone-content">
                      {isDragActive ? (
                        <div className="drop-active-state">
                          <h4>Perfect! Drop your files now</h4>
                          <p>Release to add them to your knowledge base</p>
                        </div>
                      ) : (
                        <div className="drop-default-state">
                          <h4>Drag & drop your PDF documents</h4>
                          <p>or <span className="browse-link">browse files</span> from your computer</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="upload-specs">
                      <div className="spec-item">
                        <Shield size={14} />
                        <span>Secure & Private</span>
                      </div>
                      <div className="spec-item">
                        <FileText size={14} />
                        <span>PDF Only</span>
                      </div>
                      <div className="spec-item">
                        <Clock size={14} />
                        <span>Max 10MB each</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced File Preview */}
                {uploadedFiles.length > 0 && (
                  <div className="files-section">
                    <div className="files-header">
                      <h4>
                        <Database size={20} />
                        Knowledge Documents ({uploadedFiles.length})
                      </h4>
                      <div className="total-size">
                        Total: {formatFileSize(uploadedFiles.reduce((acc, file) => acc + file.size, 0))}
                      </div>
                    </div>
                    
                    <div className="files-grid">
                      {uploadedFiles.map(file => (
                        <div key={file.id} className={`file-card ${file.status}`}>
                          <div className="file-preview">
                            <div className="file-icon-wrapper">
                              <FileText size={32} />
                              <div className={`status-indicator ${file.status}`}>
                                {file.status === 'completed' && <Check size={12} />}
                                {file.status === 'error' && <X size={12} />}
                                {file.status === 'uploading' && <Loader className="spinner" size={12} />}
                              </div>
                            </div>
                          </div>
                          
                          <div className="file-info">
                            <h5 className="file-name" title={file.name}>
                              {file.name}
                            </h5>
                            <p className="file-size">{formatFileSize(file.size)}</p>
                            
                            {file.status === 'uploading' && (
                              <div className="upload-progress">
                                <div className="progress-bar">
                                  <div 
                                    className="progress-fill" 
                                    style={{ width: `${file.progress}%` }}
                                  />
                                </div>
                                <div className="progress-stats">
                                  <span>{file.progress}%</span>
                                  {file.uploadSpeed > 0 && (
                                    <span>{formatSpeed(file.uploadSpeed)}</span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <div className="file-status">
                              {file.status === 'completed' && (
                                <span className="status-badge success">
                                  <Check size={12} />
                                  Ready
                                </span>
                              )}
                              {file.status === 'error' && (
                                <span className="status-badge error">
                                  <AlertCircle size={12} />
                                  Failed
                                </span>
                              )}
                              {file.status === 'ready' && (
                                <span className="status-badge pending">
                                  <Clock size={12} />
                                  Queued
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => removeFile(file.id)}
                            className="remove-file"
                            disabled={file.status === 'uploading'}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Enhanced Configuration */}
            {currentStep === 3 && (
              <div className="form-step config-step">
                <div className="step-header">
                  <div className="header-icon">
                    <Magic size={24} />
                  </div>
                  <div className="header-text">
                    <h3>AI Intelligence Setup</h3>
                    <p>Configure your assistant's capabilities and behavior</p>
                  </div>
                </div>
                
                <div className="config-sections">
                  <div className="config-card primary">
                    <div className="card-header">
                      <Shield size={20} />
                      <h4>API Configuration</h4>
                      <p>Connect your AI engine</p>
                    </div>
                    
                    <div className="card-content">
                      <div className="input-group">
                        <label className="input-label">
                          <span>Gemini API Key</span>
                          <span className="required">*</span>
                        </label>
                        <div className="input-wrapper secure">
                          <input
                            type="password"
                            value={projectData.gemini_api_key}
                            onChange={(e) => handleInputChange('gemini_api_key', e.target.value)}
                            placeholder="Enter your Gemini API key"
                            className="enhanced-input"
                            required
                          />
                          <div className="security-badge">
                            <Shield size={14} />
                            <span>Encrypted</span>
                          </div>
                        </div>
                        <small className="input-help">
                          🔒 Your API key is encrypted and stored securely
                        </small>
                      </div>
                      
                      <div className="input-group">
                        <label className="input-label">
                          <span>AI Model</span>
                        </label>
                        <div className="model-selector">
                          {[
                            { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: 'Fast & Efficient', icon: '⚡', recommended: true },
                            { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', desc: 'Advanced Reasoning', icon: '🚀' },
                            { value: 'gemini-pro', label: 'Gemini Pro', desc: 'Balanced Performance', icon: '💎' }
                          ].map(model => (
                            <div 
                              key={model.value}
                              className={`model-option ${projectData.gemini_model === model.value ? 'selected' : ''}`}
                              onClick={() => handleInputChange('gemini_model', model.value)}
                            >
                              <div className="model-icon">{model.icon}</div>
                              <div className="model-info">
                                <h5>{model.label}</h5>
                                <p>{model.desc}</p>
                              </div>
                              {model.recommended && (
                                <div className="recommended-badge">
                                  <Star size={12} />
                                  Recommended
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="config-card">
                    <div className="card-header">
                      <Zap size={20} />
                      <h4>Usage Limits</h4>
                      <p>Control your AI usage</p>
                    </div>
                    
                    <div className="card-content">
                      <div className="limits-grid">
                        <div className="limit-group">
                          <label>Daily Requests</label>
                          <select
                            value={projectData.gemini_daily_limit}
                            onChange={(e) => handleInputChange('gemini_daily_limit', parseInt(e.target.value))}
                            className="enhanced-select"
                          >
                            <option value={100}>100 requests</option>
                            <option value={500}>500 requests</option>
                            <option value={1000}>1,000 requests</option>
                            <option value={2000}>2,000 requests</option>
                            <option value={5000}>5,000 requests</option>
                          </select>
                        </div>
                        
                        <div className="limit-group">
                          <label>Monthly Requests</label>
                          <select
                            value={projectData.gemini_monthly_limit}
                            onChange={(e) => handleInputChange('gemini_monthly_limit', parseInt(e.target.value))}
                            className="enhanced-select"
                          >
                            <option value={3000}>3,000 requests</option>
                            <option value={15000}>15,000 requests</option>
                            <option value={30000}>30,000 requests</option>
                            <option value={60000}>60,000 requests</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="config-card full-width">
                    <div className="card-header">
                      <Sparkles size={20} />
                      <h4>Welcome Experience</h4>
                      <p>First impression matters</p>
                    </div>
                    
                    <div className="card-content">
                      <div className="input-group">
                        <label className="input-label">
                          <span>Welcome Message</span>
                        </label>
                        <div className="textarea-wrapper">
                          <textarea
                            value={projectData.welcome_message}
                            onChange={(e) => handleInputChange('welcome_message', e.target.value)}
                            placeholder="Craft a warm welcome message that introduces your AI assistant..."
                            rows={3}
                            className="enhanced-textarea"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Enhanced Review */}
            {currentStep === 4 && (
              <div className="form-step review-step">
                <div className="step-header">
                  <div className="header-icon">
                    <Rocket size={24} />
                  </div>
                  <div className="header-text">
                    <h3>Ready for Launch</h3>
                    <p>Review your AI assistant configuration before deployment</p>
                  </div>
                </div>
                
                <div className="review-layout">
                  <div className="review-card">
                    <div className="card-header">
                      <Brain size={20} />
                      <h4>Project Overview</h4>
                    </div>
                    <div className="review-items">
                      <div className="review-item">
                        <span className="item-label">Name</span>
                        <span className="item-value">{projectData.name}</span>
                      </div>
                      <div className="review-item">
                        <span className="item-label">Category</span>
                        <span className="item-value">{projectData.category || 'Not specified'}</span>
                      </div>
                      <div className="review-item">
                        <span className="item-label">Description</span>
                        <span className="item-value">{projectData.description || 'No description provided'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="review-card">
                    <div className="card-header">
                      <Database size={20} />
                      <h4>Knowledge Base</h4>
                    </div>
                    <div className="review-items">
                      <div className="review-item">
                        <span className="item-label">Documents</span>
                        <span className="item-value">{uploadedFiles.length} PDF files</span>
                      </div>
                      <div className="review-item">
                        <span className="item-label">Total Size</span>
                        <span className="item-value">
                          {formatFileSize(uploadedFiles.reduce((acc, file) => acc + file.size, 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="review-card">
                    <div className="card-header">
                      <Magic size={20} />
                      <h4>AI Configuration</h4>
                    </div>
                    <div className="review-items">
                      <div className="review-item">
                        <span className="item-label">Model</span>
                        <span className="item-value">{projectData.gemini_model}</span>
                      </div>
                      <div className="review-item">
                        <span className="item-label">Daily Limit</span>
                        <span className="item-value">{projectData.gemini_daily_limit.toLocaleString()} requests</span>
                      </div>
                      <div className="review-item">
                        <span className="item-label">Monthly Limit</span>
                        <span className="item-value">{projectData.gemini_monthly_limit.toLocaleString()} requests</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="launch-preview">
                  <div className="preview-header">
                    <h4>Preview</h4>
                    <p>How users will first interact with your AI assistant</p>
                  </div>
                  <div className="chat-preview">
                    <div className="chat-message bot">
                      <div className="message-avatar">
                        <Brain size={16} />
                      </div>
                      <div className="message-content">
                        {projectData.welcome_message}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Navigation */}
        <div className="navigation-section">
          <div className="nav-container">
            <button 
              onClick={prevStep}
              disabled={currentStep === 1}
              className="nav-button secondary"
            >
              <ChevronLeft size={20} />
              <span>Previous</span>
            </button>
            
            <div className="nav-progress">
              {[1, 2, 3, 4].map(step => (
                <div 
                  key={step}
                  className={`progress-dot ${currentStep >= step ? 'active' : ''}`}
                />
              ))}
            </div>
            
            <button 
              onClick={nextStep}
              disabled={loading}
              className="nav-button primary"
            >
              {loading ? (
                <>
                  <Loader className="spinner" size={20} />
                  <span>Creating...</span>
                </>
              ) : currentStep === 4 ? (
                <>
                  <Rocket size={20} />
                  <span>Launch Project</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadProject;
