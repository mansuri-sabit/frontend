// src/components/OCRUpload.jsx
import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { apiClient } from '../lib/api';
import toast from '@/lib/toast';
import { 
  CloudUploadIcon, 
  DocumentIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const OCRUpload = ({ onUploadComplete, onStatusUpdate, className = '' }) => {
  const [uploads, setUploads] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const abortControllersRef = useRef(new Map());
  const statusPollingRef = useRef(new Map());

  // OCR Options
  const [ocrOptions, setOcrOptions] = useState({
    languages: 'eng+hin',
    confidenceThreshold: 0.7,
    extractTables: true,
    extractImages: true,
    preserveLayout: true
  });

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    
    for (const file of acceptedFiles) {
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create upload record
      const upload = {
        id: uploadId,
        file,
        status: 'uploading',
        progress: 0,
        speed: 0,
        eta: null,
        error: null,
        result: null,
        pdfId: null,
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: null,
        retryCount: 0,
        maxRetries: 3
      };

      setUploads(prev => [...prev, upload]);

      try {
        // Start upload with OCR
        const result = await uploadFileWithOCR(uploadId, file, ocrOptions);
        
        // Update upload record
        setUploads(prev => prev.map(u => 
          u.id === uploadId 
            ? { 
                ...u, 
                status: result.pdf?.status || 'processing',
                progress: result.pdf?.progress || 0,
                result,
                pdfId: result.pdf?.id
              }
            : u
        ));

        // Notify parent component
        onUploadComplete?.(result);

        // Start status polling if not completed
        if (result.pdf?.status !== 'completed') {
          startStatusPolling(uploadId, result.pdf?.id);
        }

        toast.success(`Uploaded "${file.name}" - OCR processing started`);

      } catch (error) {
        // Update upload record with error
        setUploads(prev => prev.map(u => 
          u.id === uploadId 
            ? { ...u, status: 'error', error: error.message }
            : u
        ));

        toast.error(`Upload failed: ${error.message}`);
      }
    }

    setIsUploading(false);
  }, [ocrOptions, onUploadComplete]);

  const uploadFileWithOCR = async (uploadId, file, options) => {
    const abortController = new AbortController();
    abortControllersRef.current.set(uploadId, abortController);

    try {
      let lastProgress = 0;
      let lastTime = Date.now();

      const result = await apiClient.uploadPDFWithOCR(file, (progress) => {
        const now = Date.now();
        const timeDiff = now - lastTime;
        const progressDiff = progress - lastProgress;
        
        let speed = 0;
        let eta = null;

        if (timeDiff > 0 && progressDiff > 0) {
          speed = (progressDiff / 100) * file.size / (timeDiff / 1000); // bytes per second
          eta = ((100 - progress) / progressDiff) * (timeDiff / 1000);
        }

        setUploads(prev => prev.map(u => 
          u.id === uploadId 
            ? { 
                ...u, 
                progress: Math.round(progress),
                speed,
                eta
              }
            : u
        ));

        lastProgress = progress;
        lastTime = now;
      }, options);

      abortControllersRef.current.delete(uploadId);
      return result;

    } catch (error) {
      abortControllersRef.current.delete(uploadId);
      throw error;
    }
  };

  const startStatusPolling = (uploadId, pdfId) => {
    if (!pdfId) return;

    const pollStatus = async () => {
      try {
        const statusResult = await apiClient.getOCRStatus(pdfId);
        const status = statusResult.pdf?.status;
        const progress = statusResult.pdf?.progress || 0;

        setUploads(prev => prev.map(u => 
          u.id === uploadId 
            ? { 
                ...u, 
                status,
                progress,
                completedAt: status === 'completed' ? new Date() : null
              }
            : u
        ));

        // Notify parent component of status update
        onStatusUpdate?.(uploadId, status, progress);

        if (status === 'completed') {
          toast.success('OCR processing completed!');
          stopStatusPolling(uploadId);
        } else if (status === 'failed') {
          toast.error('OCR processing failed');
          stopStatusPolling(uploadId);
        } else {
          // Continue polling
          setTimeout(pollStatus, 2000); // Poll every 2 seconds
        }

      } catch (error) {
        console.error('Status polling error:', error);
        stopStatusPolling(uploadId);
      }
    };

    statusPollingRef.current.set(uploadId, pollStatus);
    pollStatus();
  };

  const stopStatusPolling = (uploadId) => {
    const poller = statusPollingRef.current.get(uploadId);
    if (poller) {
      statusPollingRef.current.delete(uploadId);
    }
  };

  const cancelUpload = (uploadId) => {
    const abortController = abortControllersRef.current.get(uploadId);
    if (abortController) {
      abortController.abort();
      abortControllersRef.current.delete(uploadId);
    }
    stopStatusPolling(uploadId);
    
    setUploads(prev => prev.map(u => 
      u.id === uploadId 
        ? { ...u, status: 'cancelled' }
        : u
    ));
  };

  const retryUpload = async (uploadId) => {
    const upload = uploads.find(u => u.id === uploadId);
    if (!upload || upload.retryCount >= upload.maxRetries) return;

    setUploads(prev => prev.map(u => 
      u.id === uploadId 
        ? { ...u, status: 'uploading', error: null, retryCount: u.retryCount + 1 }
        : u
    ));

    try {
      const result = await uploadFileWithOCR(uploadId, upload.file, ocrOptions);
      
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { 
              ...u, 
              status: result.pdf?.status || 'processing',
              progress: result.pdf?.progress || 0,
              result,
              pdfId: result.pdf?.id
            }
          : u
      ));

      if (result.pdf?.status !== 'completed') {
        startStatusPolling(uploadId, result.pdf?.id);
      }

    } catch (error) {
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, status: 'error', error: error.message }
          : u
      ));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 5,
    disabled: isUploading
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <ClockIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'uploading':
        return <CloudUploadIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <DocumentIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'processing':
        return 'text-blue-600 bg-blue-50';
      case 'uploading':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond) => {
    if (bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* OCR Options */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-3">OCR Processing Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Languages
            </label>
            <select
              value={ocrOptions.languages}
              onChange={(e) => setOcrOptions(prev => ({ ...prev, languages: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="eng">English Only</option>
              <option value="eng+hin">English + Hindi</option>
              <option value="eng+spa">English + Spanish</option>
              <option value="eng+hin+spa">English + Hindi + Spanish</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Confidence Threshold
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={ocrOptions.confidenceThreshold}
              onChange={(e) => setOcrOptions(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{ocrOptions.confidenceThreshold}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={ocrOptions.extractTables}
              onChange={(e) => setOcrOptions(prev => ({ ...prev, extractTables: e.target.checked }))}
              className="mr-2"
            />
            Extract Tables
          </label>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={ocrOptions.extractImages}
              onChange={(e) => setOcrOptions(prev => ({ ...prev, extractImages: e.target.checked }))}
              className="mr-2"
            />
            Extract Images
          </label>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={ocrOptions.preserveLayout}
              onChange={(e) => setOcrOptions(prev => ({ ...prev, preserveLayout: e.target.checked }))}
              className="mr-2"
            />
            Preserve Layout
          </label>
        </div>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? 'Drop PDF files here' : 'Drag & drop PDF files here, or click to select'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Supports up to 5 files, 10MB each
        </p>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Upload Progress</h3>
          {uploads.map((upload) => (
            <div key={upload.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(upload.status)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{upload.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(upload.file.size)} • {upload.status}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {upload.status === 'error' && upload.retryCount < upload.maxRetries && (
                    <button
                      onClick={() => retryUpload(upload.id)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Retry
                    </button>
                  )}
                  {(upload.status === 'uploading' || upload.status === 'processing') && (
                    <button
                      onClick={() => cancelUpload(upload.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    upload.status === 'completed' ? 'bg-green-500' :
                    upload.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${upload.progress}%` }}
                />
              </div>

              {/* Progress Info */}
              <div className="flex justify-between text-xs text-gray-500">
                <span>{upload.progress}% complete</span>
                {upload.speed > 0 && (
                  <span>{formatSpeed(upload.speed)}</span>
                )}
                {upload.eta && upload.eta < 3600 && (
                  <span>{Math.round(upload.eta)}s remaining</span>
                )}
              </div>

              {/* Error Message */}
              {upload.error && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                  {upload.error}
                </div>
              )}

              {/* Status Badge */}
              <div className="mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(upload.status)}`}>
                  {upload.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OCRUpload;
