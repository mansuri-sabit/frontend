// src/components/MediaUpload.jsx
import React, { useState, useRef, useCallback } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import toast from '@/lib/toast';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB for media files
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const SUPPORTED_SVG_TYPES = ['image/svg+xml'];

export const MediaUpload = ({ 
  onFileSelect, 
  onFileRemove,
  currentFile = null,
  fileType = 'image', // 'image', 'video', 'svg'
  disabled = false,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const getAcceptedTypes = () => {
    let acceptedTypes;
    switch (fileType) {
      case 'image':
        acceptedTypes = SUPPORTED_IMAGE_TYPES.join(',');
        break;
      case 'video':
        acceptedTypes = SUPPORTED_VIDEO_TYPES.join(',');
        break;
      case 'svg':
        acceptedTypes = SUPPORTED_SVG_TYPES.join(',');
        break;
      default:
        acceptedTypes = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES, ...SUPPORTED_SVG_TYPES].join(',');
    }
    console.log('📁 Accepted file types for', fileType, ':', acceptedTypes);
    return acceptedTypes;
  };

  const getFileTypeLabel = () => {
    switch (fileType) {
      case 'image':
        return 'Image';
      case 'video':
        return 'Video';
      case 'svg':
        return 'SVG';
      default:
        return 'Media';
    }
  };

  const validateFile = useCallback((file) => {
    console.log('🔍 Validating file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      fileType: fileType
    });
    
    setError('');
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      console.log('❌ File too large:', file.size, '>', MAX_FILE_SIZE);
      setError(`File size must be less than ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`);
      return false;
    }

    // Check file type
    const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
    const isVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);
    const isSvg = SUPPORTED_SVG_TYPES.includes(file.type);

    console.log('🔍 File type checks:', {
      isImage,
      isVideo,
      isSvg,
      fileType,
      supportedImageTypes: SUPPORTED_IMAGE_TYPES,
      supportedVideoTypes: SUPPORTED_VIDEO_TYPES,
      supportedSvgTypes: SUPPORTED_SVG_TYPES
    });

    if (fileType === 'image' && !isImage) {
      console.log('❌ Invalid image file type');
      setError('Please select a valid image file (JPEG, PNG, GIF, WebP)');
      return false;
    }
    
    if (fileType === 'video' && !isVideo) {
      console.log('❌ Invalid video file type');
      setError('Please select a valid video file (MP4, WebM, OGG)');
      return false;
    }
    
    if (fileType === 'svg' && !isSvg) {
      console.log('❌ Invalid SVG file type');
      setError('Please select a valid SVG file');
      return false;
    }

    if (fileType === 'all' && !isImage && !isVideo && !isSvg) {
      console.log('❌ Invalid media file type');
      setError('Please select a valid media file (Image, Video, or SVG)');
      return false;
    }

    console.log('✅ File validation passed');
    return true;
  }, [fileType]);

  const createPreview = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && validateFile(file)) {
      createPreview(file);
      onFileSelect(file);
    }
  }, [disabled, validateFile, createPreview, onFileSelect]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    console.log('📁 File selected:', file);
    console.log('📁 File validation result:', file ? validateFile(file) : 'No file');
    
    if (file && validateFile(file)) {
      console.log('✅ File validated, creating preview and calling onFileSelect');
      createPreview(file);
      onFileSelect(file);
    } else {
      console.log('❌ File validation failed or no file selected');
    }
  }, [validateFile, createPreview, onFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleRemove = useCallback(() => {
    setPreview(null);
    setError('');
    onFileRemove?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileRemove]);

  const getFileIcon = () => {
    switch (fileType) {
      case 'image':
        return (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
          </svg>
        );
      case 'video':
        return (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
          </svg>
        );
      case 'svg':
        return (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" clipRule="evenodd"/>
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4l-2-2-2 2V5z" clipRule="evenodd"/>
          </svg>
        );
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
        `}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptedTypes()}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-gray-400 dark:text-gray-500">
            {getFileIcon()}
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {isDragOver ? `Drop your ${getFileTypeLabel().toLowerCase()} here` : `Upload ${getFileTypeLabel()}`}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Drag and drop or click to select • Max {Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {fileType === 'image' && (
                <>
                  <Badge variant="secondary" size="sm">JPEG</Badge>
                  <Badge variant="secondary" size="sm">PNG</Badge>
                  <Badge variant="secondary" size="sm">GIF</Badge>
                  <Badge variant="secondary" size="sm">WebP</Badge>
                </>
              )}
              {fileType === 'video' && (
                <>
                  <Badge variant="secondary" size="sm">MP4</Badge>
                  <Badge variant="secondary" size="sm">WebM</Badge>
                  <Badge variant="secondary" size="sm">OGG</Badge>
                </>
              )}
              {fileType === 'svg' && (
                <Badge variant="secondary" size="sm">SVG</Badge>
              )}
            </div>
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Choose {getFileTypeLabel()}
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {preview && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Preview
                </h4>
                <div className="relative">
                  {fileType === 'video' ? (
                    <video 
                      src={preview} 
                      controls 
                      className="max-w-full max-h-48 rounded-lg"
                      style={{ maxHeight: '200px' }}
                    />
                  ) : (
                    <img 
                      src={preview} 
                      alt="Preview" 
                      className="max-w-full max-h-48 rounded-lg object-contain"
                      style={{ maxHeight: '200px' }}
                    />
                  )}
                  {fileType === 'svg' && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" size="sm">Animated SVG</Badge>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                className="ml-4"
              >
                Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MediaUpload;
