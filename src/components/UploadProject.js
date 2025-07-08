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
  ChevronLeft
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
    
    // Gemini Configuration
    gemini_api_key: '',
    gemini_model: 'gemini-1.5-flash',
    gemini_daily_limit: 100,
    gemini_monthly_limit: 3000,
    gemini_enabled: true,
    
    // Subscription Management
    monthly_token_limit: 100000,
    subscription_duration: 30, // days
    
    welcome_message: 'Hello! How can I help you today?'
  });

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      setError('Some files were rejected. Please upload PDF files only (max 10MB each).');
      return;
    }

    const newFiles = acceptedFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'ready',
      uploadSpeed: 0,
      timeRemaining: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true
  });

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatSpeed = (bytesPerSecond) => {
    if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${Math.round(bytesPerSecond / 1024)} KB/s`;
    return `${Math.round(bytesPerSecond / (1024 * 1024))} MB/s`;
  };

  // File upload function
  const uploadFilesToProject = async (projectId) => {
    console.log('🔍 [DEBUG] Starting file upload for project:', projectId);
    
    try {
      setUploadedFiles(prev => 
        prev.map(file => ({ 
          ...file, 
          status: 'uploading', 
          progress: 0,
          uploadSpeed: 0,
          timeRemaining: 0
        }))
      );

      for (const fileObj of uploadedFiles) {
        console.log(`🔍 [DEBUG] Uploading file: ${fileObj.name}`);
        
        const formData = new FormData();
        formData.append('files', fileObj.file);
        
        const uploadUrl = `${process.env.REACT_APP_API_URL}/public/projects/${projectId}/upload-pdf`;
        
        let uploadStartTime = Date.now();
        let lastLoaded = 0;
        
        try {
          const response = await axios({
            method: 'POST',
            url: uploadUrl,
            data: formData,
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            timeout: 120000,
            onUploadProgress: (progressEvent) => {
              const { loaded, total } = progressEvent;
              const progress = Math.round((loaded * 100) / total);
              
              const currentTime = Date.now();
              const timeElapsed = (currentTime - uploadStartTime) / 1000;
              const bytesUploaded = loaded - lastLoaded;
              const uploadSpeed = timeElapsed > 0 ? bytesUploaded / timeElapsed : 0;
              
              const remainingBytes = total - loaded;
              const timeRemaining = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0;
              
              setUploadedFiles(prev => 
                prev.map(file => 
                  file.id === fileObj.id 
                    ? { 
                        ...file, 
                        progress,
                        uploadSpeed,
                        timeRemaining,
                        bytesLoaded: loaded,
                        bytesTotal: total
                      }
                    : file
                )
              );
              
              lastLoaded = loaded;
            }
          });
          
          console.log('✅ Upload successful:', response.data);
          
          setUploadedFiles(prev => 
            prev.map(file => 
              file.id === fileObj.id 
                ? { 
                    ...file, 
                    status: 'completed', 
                    progress: 100,
                    uploadSpeed: 0,
                    timeRemaining: 0
                  }
                : file
            )
          );
          
        } catch (uploadError) {
          console.error('❌ Upload failed:', uploadError);
          
          setUploadedFiles(prev => 
            prev.map(file => 
              file.id === fileObj.id 
                ? { 
                    ...file, 
                    status: 'error', 
                    progress: 0,
                    uploadSpeed: 0,
                    timeRemaining: 0
                  }
                : file
            )
          );
          
          throw new Error(`Upload failed for ${fileObj.name}: ${uploadError.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('✅ All files uploaded successfully');
      
    } catch (error) {
      console.error('❌ Upload process failed:', error);
      
      setUploadedFiles(prev => 
        prev.map(file => 
          file.status === 'uploading' 
            ? { ...file, status: 'error', progress: 0 }
            : file
        )
      );
      
      throw error;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔍 [DEBUG] Creating project:', projectData);

      const response = await axios({
        method: 'POST',
        url: `${process.env.REACT_APP_API_URL}/api/admin/projects`,
        data: projectData,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        withCredentials: true,
        timeout: 30000
      });

      console.log('✅ Project created successfully:', response.data);

      if (uploadedFiles.length > 0 && response.data.project && response.data.project.id) {
        try {
          await uploadFilesToProject(response.data.project.id);
          setSuccess(`Project "${projectData.name}" created successfully with ${uploadedFiles.length} files uploaded!`);
        } catch (uploadError) {
          console.error('❌ File upload failed:', uploadError);
          setSuccess(`Project "${projectData.name}" created successfully, but file upload failed: ${uploadError.message}`);
        }
      } else {
        setSuccess(`Project "${projectData.name}" created successfully!`);
      }
      
      setTimeout(() => {
        onProjectCreated && onProjectCreated(response.data.project);
      }, 2000);

    } catch (error) {
      console.error('❌ Project creation failed:', error);
      
      if (error.response) {
        setError(error.response.data?.error || `Server error: ${error.response.status}`);
      } else if (error.request) {
        setError('Network error: Unable to reach server');
      } else {
        setError(error.message || 'Failed to create project');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!projectData.name.trim()) {
          setError('Project name is required');
          return false;
        }
        if (projectData.name.length < 3) {
          setError('Project name must be at least 3 characters long');
          return false;
        }
        break;
      case 2:
        if (uploadedFiles.length === 0) {
          setError('Please upload at least one PDF file');
          return false;
        }
        break;
      case 3:
        if (!projectData.gemini_api_key.trim()) {
          setError('Gemini API key is required');
          return false;
        }
        if (projectData.gemini_api_key.length < 20) {
          setError('Please enter a valid Gemini API key');
          return false;
        }
        break;
      default:
        break;
    }
    setError('');
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handleInputChange = (field, value) => {
    setProjectData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const stepIcons = [
    { icon: Database, label: 'Project Info', desc: 'Basic details' },
    { icon: Upload, label: 'Upload Files', desc: 'Training documents' },
    { icon: Settings, label: 'Configuration', desc: 'AI settings' },
    { icon: Eye, label: 'Review', desc: 'Final check' }
  ];

  return (
    <div className="upload-project-wrapper">
      <div className="upload-project-container">
        {/* Header */}
        <div className="upload-header">
          <div className="header-icon-wrapper">
            <Sparkles className="header-sparkle" />
            <Zap className="header-icon" />
            <Sparkles className="header-sparkle" />
          </div>
          <h1 className="header-title">
            Create AI Project
            <span className="header-subtitle">Build your intelligent chatbot</span>
          </h1>
          <div className="header-progress">
            <div className="progress-line">
              <div 
                className="progress-fill" 
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>
            <span className="progress-text">Step {currentStep} of 4</span>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="progress-steps">
          {stepIcons.map((step, index) => {
            const StepIcon = step.icon;
            const stepNumber = index + 1;
            const isActive = currentStep >= stepNumber;
            const isCompleted = currentStep > stepNumber;
            
            return (
              <div
                key={stepNumber}
                className={`step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                <div className="step-connector" />
                <div className="step-circle">
                  <div className="step-icon-wrapper">
                    {isCompleted ? (
                      <Check size={20} className="step-check" />
                    ) : (
                      <StepIcon size={20} className="step-icon" />
                    )}
                  </div>
                </div>
                <div className="step-content">
                  <span className="step-label">{step.label}</span>
                  <span className="step-desc">{step.desc}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Messages */}
        {error && (
          <div className="message error-message">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError('')} className="message-close">
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="message success-message">
            <Check size={20} />
            <span>{success}</span>
            <Sparkles size={16} className="success-sparkle" />
          </div>
        )}

        {/* Step Content */}
        <div className="step-content">
          {/* Step 1: Project Information */}
          {currentStep === 1 && (
            <div className="form-step">
              <div className="step-header">
                <Database className="step-header-icon" />
                <h3>Project Information</h3>
                <p>Tell us about your AI chatbot project</p>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    <Zap size={16} />
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={projectData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your project name"
                    className="form-input"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>
                    <FileText size={16} />
                    Category
                  </label>
                  <select
                    value={projectData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select a category</option>
                    <option value="customer-support">🎧 Customer Support</option>
                    <option value="education">📚 Education</option>
                    <option value="healthcare">🏥 Healthcare</option>
                    <option value="ecommerce">🛒 E-commerce</option>
                    <option value="finance">💰 Finance</option>
                    <option value="other">🔧 Other</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group full-width">
                <label>
                  <FileText size={16} />
                  Description
                </label>
                <textarea
                  value={projectData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your project and its purpose..."
                  rows={4}
                  className="form-textarea"
                />
              </div>
            </div>
          )}

          {/* Step 2: File Upload */}
          {currentStep === 2 && (
            <div className="form-step">
              <div className="step-header">
                <Upload className="step-header-icon" />
                <h3>Upload Training Documents</h3>
                <p>Upload PDF documents to train your AI chatbot</p>
              </div>
              
              <div 
                {...getRootProps()} 
                className={`dropzone ${isDragActive ? 'active' : ''}`}
              >
                <input {...getInputProps()} />
                <div className="dropzone-content">
                  <div className="dropzone-icon-wrapper">
                    <Upload className="dropzone-icon" />
                    <div className="dropzone-sparkles">
                      <Sparkles className="sparkle-1" />
                      <Sparkles className="sparkle-2" />
                      <Sparkles className="sparkle-3" />
                    </div>
                  </div>
                  <div className="dropzone-text">
                    {isDragActive ? (
                      <span className="drop-active">Drop your PDF files here!</span>
                    ) : (
                      <>
                        <span className="drop-main">Drag & drop PDF files here</span>
                        <span className="drop-sub">or click to browse</span>
                      </>
                    )}
                  </div>
                  <div className="dropzone-info">
                    <Shield size={16} />
                    <span>PDF files only • Max 10MB each • Secure upload</span>
                  </div>
                </div>
              </div>

              {/* File Preview */}
              {uploadedFiles.length > 0 && (
                <div className="file-preview">
                  <div className="file-preview-header">
                    <h4>
                      <FileText size={20} />
                      Files Ready ({uploadedFiles.length})
                    </h4>
                  </div>
                  
                  <div className="file-list">
                    {uploadedFiles.map(file => (
                      <div key={file.id} className={`file-item ${file.status}`}>
                        <div className="file-icon">
                          <FileText size={24} />
                        </div>
                        
                        <div className="file-details">
                          <div className="file-name">{file.name}</div>
                          <div className="file-size">{formatFileSize(file.size)}</div>
                          
                          {/* Progress Bar */}
                          {file.status === 'uploading' && (
                            <div className="progress-container">
                              <div className="progress-bar">
                                <div 
                                  className="progress-fill" 
                                  style={{ width: `${file.progress}%` }}
                                />
                                <div className="progress-text">{file.progress}%</div>
                              </div>
                              <div className="progress-details">
                                <span className="upload-speed">
                                  <Zap size={12} />
                                  {file.uploadSpeed > 0 && formatSpeed(file.uploadSpeed)}
                                </span>
                                <span className="time-remaining">
                                  <Clock size={12} />
                                  {file.timeRemaining > 0 && formatTime(file.timeRemaining)}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Status Indicators */}
                          <div className="file-status">
                            {file.status === 'completed' && (
                              <span className="status completed">
                                <Check size={14} />
                                Upload Complete
                              </span>
                            )}
                            {file.status === 'error' && (
                              <span className="status error">
                                <X size={14} />
                                Upload Failed
                              </span>
                            )}
                            {file.status === 'ready' && (
                              <span className="status ready">
                                <Clock size={14} />
                                Ready for Upload
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => removeFile(file.id)}
                          className="remove-file-btn"
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

          {/* Step 3: Configuration */}
          {currentStep === 3 && (
            <div className="form-step">
              <div className="step-header">
                <Settings className="step-header-icon" />
                <h3>AI Configuration</h3>
                <p>Configure your AI chatbot settings</p>
              </div>
              
              {/* Gemini Configuration */}
              <div className="config-section">
                <h4>
                  <Sparkles size={18} />
                  Gemini AI Configuration
                </h4>
                
                <div className="form-group">
                  <label>Gemini API Key *</label>
                  <input
                    type="password"
                    value={projectData.gemini_api_key}
                    onChange={(e) => handleInputChange('gemini_api_key', e.target.value)}
                    placeholder="Enter your Gemini API key"
                    className="form-input"
                    required
                  />
                  <small>🔒 Your API key will be encrypted and stored securely</small>
                </div>
                
                <div className="form-group">
                  <label>Gemini Model</label>
                  <select
                    value={projectData.gemini_model}
                    onChange={(e) => handleInputChange('gemini_model', e.target.value)}
                    className="form-select"
                  >
                    <option value="gemini-1.5-flash">⚡ Gemini 1.5 Flash (Recommended)</option>
                    <option value="gemini-1.5-pro">🚀 Gemini 1.5 Pro</option>
                    <option value="gemini-pro">💎 Gemini Pro</option>
                  </select>
                </div>
              </div>
              
              {/* Subscription Configuration */}
              <div className="config-section">
                <h4>
                  <Clock size={18} />
                  Subscription & Limits
                </h4>
                
                <div className="form-group">
                  <label>Monthly Token Limit</label>
                  <select
                    value={projectData.monthly_token_limit}
                    onChange={(e) => handleInputChange('monthly_token_limit', parseInt(e.target.value))}
                    className="form-select"
                  >
                    <option value={50000}>50,000 tokens/month</option>
                    <option value={100000}>100,000 tokens/month</option>
                    <option value={250000}>250,000 tokens/month</option>
                    <option value={500000}>500,000 tokens/month</option>
                    <option value={1000000}>1,000,000 tokens/month</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Subscription Duration</label>
                  <select
                    value={projectData.subscription_duration}
                    onChange={(e) => handleInputChange('subscription_duration', parseInt(e.target.value))}
                    className="form-select"
                  >
                    <option value={30}>1 Month</option>
                    <option value={90}>3 Months</option>
                    <option value={180}>6 Months</option>
                    <option value={365}>1 Year</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Daily Usage Limit</label>
                  <select
                    value={projectData.gemini_daily_limit}
                    onChange={(e) => handleInputChange('gemini_daily_limit', parseInt(e.target.value))}
                    className="form-select"
                  >
                    <option value={100}>100 requests/day</option>
                    <option value={500}>500 requests/day</option>
                    <option value={1000}>1000 requests/day</option>
                    <option value={2000}>2000 requests/day</option>
                    <option value={5000}>5000 requests/day</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Monthly Usage Limit</label>
                  <select
                    value={projectData.gemini_monthly_limit}
                    onChange={(e) => handleInputChange('gemini_monthly_limit', parseInt(e.target.value))}
                    className="form-select"
                  >
                    <option value={3000}>3000 requests/month</option>
                    <option value={15000}>15000 requests/month</option>
                    <option value={30000}>30000 requests/month</option>
                    <option value={60000}>60000 requests/month</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group full-width">
                <label>
                  <Sparkles size={16} />
                  Welcome Message
                </label>
                <textarea
                  value={projectData.welcome_message}
                  onChange={(e) => handleInputChange('welcome_message', e.target.value)}
                  placeholder="Enter a welcome message for your chatbot..."
                  rows={3}
                  className="form-textarea"
                />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="form-step">
              <div className="step-header">
                <Eye className="step-header-icon" />
                <h3>Review & Submit</h3>
                <p>Review your project details before creating</p>
              </div>
              
              <div className="review-grid">
                <div className="review-section">
                  <h4>
                    <Database size={18} />
                    Project Details
                  </h4>
                  <div className="review-items">
                    <div className="review-item">
                      <span className="label">Name:</span>
                      <span className="value">{projectData.name}</span>
                    </div>
                    <div className="review-item">
                      <span className="label">Category:</span>
                      <span className="value">{projectData.category || 'Not selected'}</span>
                    </div>
                    <div className="review-item">
                      <span className="label">Description:</span>
                      <span className="value">{projectData.description || 'Not provided'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="review-section">
                  <h4>
                    <Upload size={18} />
                    AI & Subscription
                  </h4>
                  <div className="review-items">
                    <div className="review-item">
                      <span className="label">Files:</span>
                      <span className="value">{uploadedFiles.length} PDF files</span>
                    </div>
                    <div className="review-item">
                      <span className="label">AI Model:</span>
                      <span className="value">{projectData.gemini_model}</span>
                    </div>
                    <div className="review-item">
                      <span className="label">Monthly Token Limit:</span>
                      <span className="value">{projectData.monthly_token_limit.toLocaleString()} tokens</span>
                    </div>
                    <div className="review-item">
                      <span className="label">Subscription Duration:</span>
                      <span className="value">
                        {projectData.subscription_duration === 30 ? '1 Month' :
                         projectData.subscription_duration === 90 ? '3 Months' :
                         projectData.subscription_duration === 180 ? '6 Months' : '1 Year'}
                      </span>
                    </div>
                    <div className="review-item">
                      <span className="label">Daily Limit:</span>
                      <span className="value">{projectData.gemini_daily_limit} requests</span>
                    </div>
                    <div className="review-item">
                      <span className="label">Monthly Limit:</span>
                      <span className="value">{projectData.gemini_monthly_limit} requests</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="form-navigation">
          <button 
            onClick={prevStep}
            disabled={currentStep === 1}
            className="nav-btn prev"
          >
            <ChevronLeft size={20} />
            Previous
          </button>
          
          <div className="nav-center">
            <div className="nav-dots">
              {[1, 2, 3, 4].map(step => (
                <div 
                  key={step}
                  className={`nav-dot ${currentStep >= step ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>
          
          <button 
            onClick={nextStep}
            disabled={loading}
            className="nav-btn next"
          >
            {loading ? (
              <>
                <Loader className="spinner" size={20} />
                Creating...
              </>
            ) : currentStep === 4 ? (
              <>
                <Sparkles size={20} />
                Create Project
              </>
            ) : (
              <>
                Next
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadProject;
