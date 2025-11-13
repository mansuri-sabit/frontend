// src/components/FileDropzone.jsx
import { useState, useRef } from 'react';
import { Button } from './ui/Button';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const FileDropzone = ({ 
  onFileSelect, 
  accept = ".pdf",
  maxSize = MAX_FILE_SIZE,
  disabled = false 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    setError('');
    
    if (!file.type.includes('pdf')) {
      setError('Only PDF files are allowed');
      return false;
    }
    
    if (file.size > maxSize) {
      setError(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
      return false;
    }
    
    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-gray-400">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4l-2-2-2 2V5z" clipRule="evenodd"/>
            </svg>
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragOver ? 'Drop your PDF here' : 'Upload PDF Document'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Drag and drop or click to select • Max {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
          
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Choose File
          </Button>
        </div>
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

// src/features/client/components/PDFUpload.jsx
import { useState } from 'react';
import { FileDropzone } from '../../../components/FileDropzone';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { apiClient } from '../../../lib/api';
import toast from '@/lib/toast';

export const PDFUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const result = await apiClient.uploadPDF(selectedFile);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      toast.success(`Successfully uploaded ${result.filename} with ${result.chunk_count} chunks`);
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Upload PDF Documents</h2>
      
      <div className="space-y-6">
        <FileDropzone
          onFileSelect={handleFileSelect}
          disabled={isUploading}
        />
        
        {selectedFile && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFile(null)}
                disabled={isUploading}
              >
                Remove
              </Button>
            </div>
            
            {isUploading && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? 'Processing...' : 'Upload Document'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
