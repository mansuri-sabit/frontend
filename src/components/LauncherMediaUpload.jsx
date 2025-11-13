// src/components/LauncherMediaUpload.jsx
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Switch } from './ui/Switch';
import { Input } from './ui/Input';
import toast from '@/lib/toast';
import { useBrandingStore } from '../store/brandingStore';
import MediaUpload from './MediaUpload';

const LauncherMediaUpload = ({ 
  mediaType = 'image', // 'image', 'video', 'svg'
  onUpload,
  onRemove,
  currentUrl = '',
  isUploading = false,
  uploadProgress = 0
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [useCustomUrl, setUseCustomUrl] = useState(!!currentUrl);
  const [customUrl, setCustomUrl] = useState(currentUrl);
  const { updatePreview } = useBrandingStore();

  const getMediaTypeLabel = () => {
    switch (mediaType) {
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

  const getMediaTypeIcon = () => {
    switch (mediaType) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'svg':
        return '🎨';
      default:
        return '📁';
    }
  };

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file);
    setUseCustomUrl(false);
  }, []);

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    
    try {
      const result = await onUpload(selectedFile);
      if (result) {
        toast.success(`${getMediaTypeLabel()} uploaded successfully!`);
        setSelectedFile(null);
      }
    } catch (error) {
      toast.error(`Failed to upload ${getMediaTypeLabel().toLowerCase()}: ${error.message}`);
    }
  }, [selectedFile, onUpload, toast]);

  const handleCustomUrlChange = useCallback((url) => {
    setCustomUrl(url);
    const fieldName = mediaType === 'image' ? 'launcher_image_url' : 
                     mediaType === 'video' ? 'launcher_video_url' : 
                     'launcher_svg_url';
    updatePreview({ [fieldName]: url });
  }, [mediaType, updatePreview]);

  const handleRemove = useCallback(() => {
    const fieldName = mediaType === 'image' ? 'launcher_image_url' : 
                     mediaType === 'video' ? 'launcher_video_url' : 
                     'launcher_svg_url';
    updatePreview({ [fieldName]: '' });
    setCustomUrl('');
    setUseCustomUrl(false);
    onRemove?.();
  }, [mediaType, updatePreview, onRemove]);

  const getPreviewContent = () => {
    if (selectedFile) {
      const previewUrl = URL.createObjectURL(selectedFile);
      return (
        <div className="relative">
          {mediaType === 'video' ? (
            <video 
              src={previewUrl} 
              controls 
              className="w-full h-32 object-cover rounded-lg"
            />
          ) : (
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-32 object-cover rounded-lg"
            />
          )}
          {mediaType === 'svg' && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" size="sm">Animated</Badge>
            </div>
          )}
        </div>
      );
    }
    
    if (customUrl) {
      return (
        <div className="relative">
          {mediaType === 'video' ? (
            <video 
              src={customUrl} 
              controls 
              className="w-full h-32 object-cover rounded-lg"
            />
          ) : (
            <img 
              src={customUrl} 
              alt="Preview" 
              className="w-full h-32 object-cover rounded-lg"
            />
          )}
          {mediaType === 'svg' && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" size="sm">Animated</Badge>
            </div>
          )}
        </div>
      );
    }
    
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getMediaTypeIcon()}</span>
            <div>
              <h3 className="text-lg font-medium">Launcher {getMediaTypeLabel()}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {mediaType === 'svg' 
                  ? 'Upload an animated SVG for your launcher button'
                  : `Upload a ${getMediaTypeLabel().toLowerCase()} for your launcher button`
                }
              </p>
            </div>
          </div>
          <Switch
            label="Use URL"
            checked={useCustomUrl}
            onChange={setUseCustomUrl}
            size="sm"
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {useCustomUrl ? (
          <div className="space-y-4">
            <Input
              label={`${getMediaTypeLabel()} URL`}
              placeholder={`https://example.com/launcher-${getMediaTypeLabel().toLowerCase()}.${mediaType === 'video' ? 'mp4' : mediaType === 'svg' ? 'svg' : 'png'}`}
              value={customUrl}
              onChange={(e) => handleCustomUrlChange(e.target.value)}
              className="w-full"
            />
            
            {customUrl && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Preview:</h4>
                {getPreviewContent()}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <MediaUpload
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              fileType={mediaType}
              disabled={isUploading}
            />
            
            {selectedFile && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400">
                        {getMediaTypeIcon()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFileRemove}
                    disabled={isUploading}
                  >
                    Remove
                  </Button>
                </div>
                
                {getPreviewContent()}
                
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading... {uploadProgress}%</span>
                    </div>
                  ) : (
                    `Upload ${getMediaTypeLabel()}`
                  )}
                </Button>
                
                {isUploading && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {(selectedFile || customUrl) && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={isUploading}
            >
              Remove {getMediaTypeLabel()}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LauncherMediaUpload;
