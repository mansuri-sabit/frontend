// src/features/client/components/PDFUpload.jsx
import React, { useState, useCallback, useRef } from 'react';
import { useUploadStore } from '../../../store/uploadStore';
import { Button } from '../../../components/ui/Button';
import { Progress } from '../../../components/ui/Progress';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import toast from '@/lib/toast';

const PDFUpload = ({ 
  onUploadComplete,
  onUploadError,
  multiple = true,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  accept = '.pdf',
  disabled = false,
  className = ''
}) => {
  const fileInputRef = useRef(null);
  const {
    uploads,
    dragActive,
    addUpload,
    removeUpload,
    retryUpload,
    clearCompleted,
    formatFileSize,
    handleDrop: storeDrop,
    setDragActive,
  } = useUploadStore();

  const [validationErrors, setValidationErrors] = useState([]);

  const validateFiles = useCallback((files) => {
    const errors = [];
    const fileArray = Array.from(files);

    // Check file count
    if (multiple && fileArray.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
    }

    // Check individual files
    fileArray.forEach((file, index) => {
      // Check file type
      if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        errors.push(`File ${index + 1}: Only PDF files are allowed`);
      }

      // Check file size
      if (file.size > maxFileSize) {
        errors.push(`File ${index + 1}: File size exceeds ${formatFileSize(maxFileSize)} limit`);
      }

      // Check for duplicate files
      const existingUpload = uploads.find(upload => 
        upload.file.name === file.name && upload.file.size === file.size
      );
      if (existingUpload) {
        errors.push(`File ${index + 1}: "${file.name}" is already being uploaded`);
      }
    });

    return errors;
  }, [maxFiles, maxFileSize, multiple, uploads, formatFileSize]);

  const handleFileSelect = useCallback((files) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const errors = validateFiles(fileArray);

    setValidationErrors(errors);

    if (errors.length > 0) {
      toast.error(`Upload validation failed: ${errors[0]}`);
      return;
    }

    // Add files to upload queue
    fileArray.forEach(file => {
      addUpload(file, {
        onComplete: (result) => {
          toast.success(`"${file.name}" uploaded successfully`);
          if (onUploadComplete) {
            onUploadComplete(result, file);
          }
        },
        onError: (error) => {
          toast.error(`Failed to upload "${file.name}": ${error.message}`);
          if (onUploadError) {
            onUploadError(error, file);
          }
        },
      });
    });

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [validateFiles, addUpload, onUploadComplete, onUploadError, toast]);

  const handleInputChange = (event) => {
    handleFileSelect(event.target.files);
  };

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setDragActive(false);
    
    const files = event.dataTransfer.files;
    handleFileSelect(files);
  }, [handleFileSelect, setDragActive]);

  const handleDragEnter = useCallback((event) => {
    event.preventDefault();
    setDragActive(true);
  }, [setDragActive]);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    // Only set drag inactive if we're leaving the drop zone entirely
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setDragActive(false);
    }
  }, [setDragActive]);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
  }, []);

  const handleRemoveUpload = (uploadId) => {
    removeUpload(uploadId);
    toast.info('Upload removed');
  };

  const handleRetryUpload = (uploadId) => {
    retryUpload(uploadId);
    toast.info('Retrying upload...');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'uploading': return 'info';
      case 'processing': return 'warning';
      case 'failed': return 'danger';
      case 'cancelled': return 'warning';
      case 'paused': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'uploading':
        return (
          <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-4 h-4 text-yellow-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'paused':
        return (
          <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <Card>
        <CardContent className="p-0">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              dragActive
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : disabled
                ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onDragEnter={!disabled ? handleDragEnter : undefined}
            onDragOver={!disabled ? handleDragOver : undefined}
            onDragLeave={!disabled ? handleDragLeave : undefined}
            onDrop={!disabled ? handleDrop : undefined}
          >
            {/* Upload Icon */}
            <div className="mx-auto mb-4">
              <svg
                className={`w-12 h-12 ${disabled ? 'text-gray-300' : 'text-gray-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <p className={`text-lg font-medium ${disabled ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                {dragActive 
                  ? 'Drop your PDF files here' 
                  : 'Upload PDF Documents'
                }
              </p>
              <p className={`${disabled ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {dragActive 
                  ? 'Release to upload'
                  : 'Drag and drop files here, or click to browse'
                }
              </p>
              <p className="text-sm text-gray-400">
                Maximum file size: {formatFileSize(maxFileSize)}
                {multiple && ` • Up to ${maxFiles} files`}
              </p>
            </div>

            <div className="mt-6">
              <input
                ref={fileInputRef}
                type="file"
                multiple={multiple}
                accept={accept}
                onChange={handleInputChange}
                className="hidden"
                id="pdf-upload-input"
                disabled={disabled}
              />
              <label htmlFor="pdf-upload-input">
                <Button
                  as="span"
                  variant="primary"
                  disabled={disabled}
                  className="cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Choose Files
                </Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="error" title="Upload Errors">
          <ul className="list-disc list-inside space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="text-sm">{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Active Uploads */}
      {uploads.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Uploading Files</h3>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={clearCompleted}
                  variant="outline"
                  size="sm"
                  disabled={!uploads.some(u => u.status === 'completed')}
                >
                  Clear Completed
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {upload.file.name}
                      </p>
                      {getStatusIcon(upload.status)}
                    </div>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(upload.file.size)}
                      {upload.status === 'uploading' && upload.speed && (
                        <span className="ml-2">
                          • {formatFileSize(upload.speed)}/s
                        </span>
                      )}
                    </p>

                    {/* Progress Bar */}
                    {(upload.status === 'uploading' || upload.status === 'processing') && (
                      <div className="mt-2">
                        <Progress
                          value={upload.progress || 0}
                          className="h-2"
                          showLabel
                        />
                        {upload.status === 'uploading' && upload.timeRemaining && upload.timeRemaining > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {Math.ceil(upload.timeRemaining / 1000)}s remaining
                          </p>
                        )}
                        {upload.status === 'processing' && (
                          <p className="text-xs text-yellow-600 mt-1">
                            Processing PDF content...
                          </p>
                        )}
                      </div>
                    )}

                    {/* Error Message */}
                    {upload.status === 'failed' && upload.error && (
                      <div className="mt-2">
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {upload.error}
                        </p>
                        {upload.error.includes('timeout') && (
                          <p className="text-xs text-gray-500 mt-1">
                            Try uploading a smaller file or check your internet connection.
                          </p>
                        )}
                        {upload.error.includes('API key') && (
                          <p className="text-xs text-gray-500 mt-1">
                            Please contact support to check the API configuration.
                          </p>
                        )}
                        {upload.error.includes('invalid PDF') && (
                          <p className="text-xs text-gray-500 mt-1">
                            Please ensure the file is a valid PDF document.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status and Actions */}
                  <div className="flex items-center space-x-3">
                    <Badge variant={getStatusColor(upload.status)} size="sm">
                      {upload.status}
                    </Badge>

                    <div className="flex items-center space-x-1">
                      {upload.status === 'failed' && upload.retryCount < (upload.maxRetries || 3) && (
                        <Button
                          onClick={() => handleRetryUpload(upload.id)}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          Retry
                        </Button>
                      )}

                      <Button
                        onClick={() => handleRemoveUpload(upload.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Guidelines */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            Upload Guidelines
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Only PDF files are supported</li>
            <li>• Maximum file size: {formatFileSize(maxFileSize)}</li>
            {multiple && <li>• Upload up to {maxFiles} files at once</li>}
            <li>• Files are processed automatically for AI training</li>
            <li>• Processing may take a few minutes for large files</li>
            <li>• Ensure files contain readable text (not just images)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export { PDFUpload };
export default PDFUpload;
