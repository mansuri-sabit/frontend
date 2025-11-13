// src/hooks/useUpload.js
import { useState, useCallback, useRef } from 'react';
import { useApi } from './useApi';
import toast from '@/lib/toast';

export const useUpload = () => {
  const [uploads, setUploads] = useState([]);
  const { upload: apiUpload } = useApi();
  const abortControllersRef = useRef(new Map());

  const uploadFile = useCallback(async (file, endpoint = '/client/upload', options = {}) => {
    const uploadId = Date.now().toString();
    const abortController = new AbortController();
    abortControllersRef.current.set(uploadId, abortController);

    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`);
    }

    const allowedTypes = options.allowedTypes || ['application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('File type not allowed');
    }

    // Create upload record
    const upload = {
      id: uploadId,
      file,
      progress: 0,
      status: 'uploading',
      error: null,
      result: null,
    };

    setUploads(prev => [...prev, upload]);

    try {
      const formData = new FormData();
      formData.append(options.fieldName || 'pdf', file);

      // Add additional fields if provided
      if (options.additionalFields) {
        Object.keys(options.additionalFields).forEach(key => {
          formData.append(key, options.additionalFields[key]);
        });
      }

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploads(prev => prev.map(u => 
          u.id === uploadId 
            ? { ...u, progress: Math.min(u.progress + 10, 90) }
            : u
        ));
      }, 200);

      const result = await apiUpload(endpoint, formData, {
        signal: abortController.signal,
      });

      clearInterval(progressInterval);

      // Update upload record - check actual backend status
      const backendStatus = result?.pdf?.status || result?.status || 'processing';
      const backendProgress = result?.pdf?.progress || result?.progress || 0;
      
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, progress: backendProgress, status: backendStatus, result }
          : u
      ));

      if (backendStatus === 'completed') {
        toast.success(`Successfully uploaded and processed ${file.name}`);
      } else {
        toast.success(`Successfully uploaded ${file.name} - processing in background`);
      }
      
      // Clean up
      abortControllersRef.current.delete(uploadId);

      return result;
    } catch (error) {
      // Update upload record with error
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, status: 'error', error: error.message }
          : u
      ));

      if (error.name !== 'AbortError') {
        toast.error(`Upload failed: ${error.message}`);
      }

      // Clean up
      abortControllersRef.current.delete(uploadId);
      
      throw error;
    }
  }, [apiUpload, toast]);

  const cancelUpload = useCallback((uploadId) => {
    const abortController = abortControllersRef.current.get(uploadId);
    if (abortController) {
      abortController.abort();
      abortControllersRef.current.delete(uploadId);
    }

    setUploads(prev => prev.map(u => 
      u.id === uploadId 
        ? { ...u, status: 'cancelled' }
        : u
    ));
  }, []);

  const removeUpload = useCallback((uploadId) => {
    cancelUpload(uploadId);
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  }, [cancelUpload]);

  const clearUploads = useCallback(() => {
    // Cancel all active uploads
    uploads.forEach(upload => {
      if (upload.status === 'uploading') {
        cancelUpload(upload.id);
      }
    });
    setUploads([]);
  }, [uploads, cancelUpload]);

  const getUploadById = useCallback((uploadId) => {
    return uploads.find(u => u.id === uploadId);
  }, [uploads]);

  const getUploadsByStatus = useCallback((status) => {
    return uploads.filter(u => u.status === status);
  }, [uploads]);

  return {
    uploads,
    uploadFile,
    cancelUpload,
    removeUpload,
    clearUploads,
    getUploadById,
    getUploadsByStatus,
    
    // Computed values
    activeUploads: uploads.filter(u => u.status === 'uploading'),
    completedUploads: uploads.filter(u => u.status === 'completed'),
    failedUploads: uploads.filter(u => u.status === 'error'),
    hasActiveUploads: uploads.some(u => u.status === 'uploading'),
  };
};
