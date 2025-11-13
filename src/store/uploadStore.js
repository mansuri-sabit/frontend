// src/store/uploadStore.js
import { create } from 'zustand';
import { apiClient } from '../lib/api';

export const useUploadStore = create((set, get) => ({
  // State
  uploads: [],
  uploadHistory: [],
  isLoading: false,
  error: null,
  dragActive: false,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/msword', // DOC
    'text/plain' // TXT
  ],
  maxConcurrentUploads: 3,

  // Actions
  addUpload: (file, options = {}) => {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate file
    const validation = get().validateFile(file);
    if (!validation.isValid) {
      set(state => ({
        uploads: [...state.uploads, {
          id: uploadId,
          file,
          status: 'error',
          error: validation.error,
          progress: 0,
          createdAt: new Date(),
          ...options,
        }],
      }));
      return uploadId;
    }

    const upload = {
      id: uploadId,
      file,
      status: 'queued',
      progress: 0,
      speed: 0,
      timeRemaining: null,
      error: null,
      result: null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      retryCount: 0,
      maxRetries: 3,
      ...options,
    };

    set(state => ({
      uploads: [...state.uploads, upload],
    }));

    // Auto-start upload if under concurrent limit
    get().processUploadQueue();

    return uploadId;
  },

  startUpload: async (uploadId) => {
    const upload = get().getUploadById(uploadId);
    if (!upload || upload.status === 'uploading') return;

    set(state => ({
      uploads: state.uploads.map(u => 
        u.id === uploadId 
          ? { ...u, status: 'uploading', startedAt: new Date(), error: null }
          : u
      ),
    }));

    try {
      let lastProgress = 0;
      let lastTime = Date.now();

      const result = await apiClient.uploadPDF(upload.file, (progress) => {
        const now = Date.now();
        const timeDiff = now - lastTime;
        const progressDiff = progress - lastProgress;
        
        let speed = 0;
        let timeRemaining = null;

        if (timeDiff > 0 && progressDiff > 0) {
          speed = (progressDiff / 100) * upload.file.size / (timeDiff / 1000); // bytes per second
          timeRemaining = ((100 - progress) / progressDiff) * (timeDiff / 1000);
        }

        set(state => ({
          uploads: state.uploads.map(u => 
            u.id === uploadId 
              ? { 
                  ...u, 
                  progress: Math.round(progress),
                  speed,
                  timeRemaining,
                }
              : u
          ),
        }));

        lastProgress = progress;
        lastTime = now;
      });

      // Success - check actual backend status
      const backendStatus = result?.status || 'processing';
      const backendProgress = result?.progress || 0;
      
      set(state => ({
        uploads: state.uploads.map(u => 
          u.id === uploadId 
            ? { 
                ...u, 
                status: backendStatus, 
                progress: backendProgress,
                result,
                completedAt: backendStatus === 'completed' ? new Date() : null,
                pdfId: result?.id, // Store PDF ID for status polling
              }
            : u
        ),
        uploadHistory: [
          ...state.uploadHistory,
          {
            ...upload,
            status: backendStatus,
            result,
            completedAt: backendStatus === 'completed' ? new Date() : null,
          },
        ],
      }));

      // Process next in queue
      get().processUploadQueue();

      return result;
    } catch (error) {
      const canRetry = upload.retryCount < upload.maxRetries;
      
      // Parse error message with better error handling
      let errorMessage = 'Upload failed';
      if (error.response) {
        errorMessage = error.response.data?.message || 
                      error.response.data?.error || 
                      error.response.status === 413 ? 'File too large' :
                      error.response.status === 400 ? 'Invalid file' :
                      `HTTP ${error.response.status}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Check for specific error codes
      const isNetworkError = !error.response || error.message?.includes('timeout') || error.message?.includes('network');
      const shouldRetry = (isNetworkError || error.response?.status >= 500) && canRetry;
      
      set(state => ({
        uploads: state.uploads.map(u => 
          u.id === uploadId 
            ? { 
                ...u, 
                status: shouldRetry ? 'queued' : 'failed',
                error: errorMessage,
                retryCount: u.retryCount + 1,
                lastError: errorMessage,
                lastErrorTime: new Date(),
              }
            : u
        ),
      }));

      // Auto-retry network errors with exponential backoff
      if (shouldRetry && upload.retryCount < upload.maxRetries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, upload.retryCount), 30000); // Max 30s
        setTimeout(() => {
          const updatedUpload = get().getUploadById(uploadId);
          if (updatedUpload && updatedUpload.status === 'queued') {
            get().startUpload(uploadId);
          }
        }, backoffDelay);
      }

      // Process next in queue
      get().processUploadQueue();

      throw error;
    }
  },

  retryUpload: async (uploadId) => {
    const upload = get().getUploadById(uploadId);
    if (!upload || upload.retryCount >= upload.maxRetries) return;

    await get().startUpload(uploadId);
  },

  cancelUpload: (uploadId) => {
    // TODO: Implement actual upload cancellation with AbortController
    set(state => ({
      uploads: state.uploads.map(u => 
        u.id === uploadId && u.status === 'uploading'
          ? { ...u, status: 'cancelled' }
          : u
      ),
    }));

    get().processUploadQueue();
  },

  removeUpload: (uploadId) => {
    get().cancelUpload(uploadId);
    
    set(state => ({
      uploads: state.uploads.filter(u => u.id !== uploadId),
    }));
  },

  clearCompleted: () => {
    set(state => ({
      uploads: state.uploads.filter(u => 
        !['completed', 'failed', 'cancelled'].includes(u.status)
      ),
    }));
  },

  clearAll: () => {
    // Cancel all active uploads first
    const activeUploads = get().uploads.filter(u => u.status === 'uploading');
    activeUploads.forEach(upload => get().cancelUpload(upload.id));
    
    set({ uploads: [] });
  },

  processUploadQueue: () => {
    const state = get();
    const activeUploads = state.uploads.filter(u => u.status === 'uploading').length;
    const queuedUploads = state.uploads.filter(u => u.status === 'queued');
    
    const availableSlots = state.maxConcurrentUploads - activeUploads;
    
    if (availableSlots > 0 && queuedUploads.length > 0) {
      const uploadsToStart = queuedUploads.slice(0, availableSlots);
      uploadsToStart.forEach(upload => {
        get().startUpload(upload.id);
      });
    }
  },

  // File validation
  validateFile: (file) => {
    const state = get();
    
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    // Check file size
    if (file.size > state.maxFileSize) {
      return { 
        isValid: false, 
        error: `File size exceeds ${Math.round(state.maxFileSize / 1024 / 1024)}MB limit` 
      };
    }

    // Check file type
    // Also check by extension for better compatibility
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'docx', 'doc', 'txt'];
    const isAllowedByType = state.allowedTypes.includes(file.type);
    const isAllowedByExtension = allowedExtensions.includes(fileExtension);
    
    if (!isAllowedByType && !isAllowedByExtension) {
      return { 
        isValid: false, 
        error: `File type ${file.type} is not allowed. Supported types: PDF, DOCX, DOC, TXT` 
      };
    }

    // Check filename
    if (file.name.length > 255) {
      return { 
        isValid: false, 
        error: 'Filename is too long (max 255 characters)' 
      };
    }

    // Check for suspicious characters
    if (/[<>:"/\\|?*]/.test(file.name)) {
      return { 
        isValid: false, 
        error: 'Filename contains invalid characters' 
      };
    }

    return { isValid: true };
  },

  // Drag and drop handlers
  setDragActive: (active) => {
    set({ dragActive: active });
  },

  handleDragOver: (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!get().dragActive) {
      get().setDragActive(true);
    }
  },

  handleDragLeave: (e) => {
    e.preventDefault();
    e.stopPropagation();
    get().setDragActive(false);
  },

  handleDrop: (e) => {
    e.preventDefault();
    e.stopPropagation();
    get().setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      get().addUpload(file);
    });
  },

  // Load upload history
  loadUploadHistory: async (params = {}) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiClient.getUploads(params);
      
      set({
        uploadHistory: response.uploads || [],
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

  deleteUploadFromHistory: async (uploadId) => {
    try {
      await apiClient.deleteUpload(uploadId);
      
      set(state => ({
        uploadHistory: state.uploadHistory.filter(u => u.id !== uploadId),
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Utility functions
  getUploadById: (uploadId) => {
    return get().uploads.find(u => u.id === uploadId);
  },

  getUploadsByStatus: (status) => {
    return get().uploads.filter(u => u.status === status);
  },

  getTotalProgress: () => {
    const uploads = get().uploads;
    if (uploads.length === 0) return 0;
    
    const totalProgress = uploads.reduce((sum, upload) => sum + upload.progress, 0);
    return Math.round(totalProgress / uploads.length);
  },

  getUploadStats: () => {
    const uploads = get().uploads;
    const history = get().uploadHistory;
    
    return {
      total: uploads.length,
      queued: uploads.filter(u => u.status === 'queued').length,
      uploading: uploads.filter(u => u.status === 'uploading').length,
      completed: uploads.filter(u => u.status === 'completed').length,
      failed: uploads.filter(u => u.status === 'failed').length,
      cancelled: uploads.filter(u => u.status === 'cancelled').length,
      totalSize: uploads.reduce((sum, u) => sum + u.file.size, 0),
      historicalTotal: history.length,
    };
  },

  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  formatSpeed: (bytesPerSecond) => {
    return get().formatFileSize(bytesPerSecond) + '/s';
  },

  formatTimeRemaining: (seconds) => {
    if (!seconds || seconds <= 0) return '';
    
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  },

  clearError: () => {
    set({ error: null });
  },

  // Batch operations
  addMultipleUploads: (files) => {
    const uploadIds = [];
    files.forEach(file => {
      const uploadId = get().addUpload(file);
      uploadIds.push(uploadId);
    });
    return uploadIds;
  },

  retryAll: () => {
    const failedUploads = get().getUploadsByStatus('error');
    failedUploads.forEach(upload => {
      get().retryUpload(upload.id);
    });
  },

  // Settings
  updateSettings: (settings) => {
    set(state => ({
      maxFileSize: settings.maxFileSize || state.maxFileSize,
      allowedTypes: settings.allowedTypes || state.allowedTypes,
      maxConcurrentUploads: settings.maxConcurrentUploads || state.maxConcurrentUploads,
    }));
  },
}));

export default useUploadStore;
