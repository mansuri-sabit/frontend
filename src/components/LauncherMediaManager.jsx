// src/components/LauncherMediaManager.jsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import toast from '@/lib/toast';
import { useBrandingStore } from '../store/brandingStore';

const LauncherMediaManager = () => {
  const { 
    branding, 
    previewBranding, 
    updatePreview, 
    saveBranding
  } = useBrandingStore();
  
  const [activeTab, setActiveTab] = useState('image');
  const autoSaveTimeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleUrlChange = useCallback((mediaType, url) => {
    const fieldName = `launcher_${mediaType}_url`;
    updatePreview({ [fieldName]: url });
    
    // Auto-save after 1.5 seconds of inactivity
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveBranding();
        toast.success(`${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} URL saved automatically!`);
      } catch (error) {
        toast.error('Failed to save changes');
      }
    }, 1500);
  }, [updatePreview, saveBranding]);

  const handleRemove = useCallback(async (mediaType) => {
    const fieldName = `launcher_${mediaType}_url`;
    updatePreview({ [fieldName]: '' });
    try {
      await saveBranding();
      toast.success(`${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} removed successfully!`);
    } catch (error) {
      toast.error('Failed to save changes');
    }
  }, [updatePreview, saveBranding]);

  const getCurrentUrl = useCallback((mediaType) => {
    return previewBranding?.[`launcher_${mediaType}_url`] || branding?.[`launcher_${mediaType}_url`] || '';
  }, [previewBranding, branding]);

  const mediaTypes = [
    { 
      id: 'image', 
      label: 'Image', 
      icon: '🖼️',
      description: 'Static image for your launcher button',
      placeholder: 'https://example.com/launcher-image.png',
      acceptedFormats: 'JPG, PNG, GIF, WebP'
    },
    { 
      id: 'video', 
      label: 'Video', 
      icon: '🎥',
      description: 'Animated video for your launcher button',
      placeholder: 'https://example.com/launcher-video.mp4',
      acceptedFormats: 'MP4, WebM, OGG'
    },
    { 
      id: 'svg', 
      label: 'SVG', 
      icon: '🎨',
      description: 'Scalable vector graphic for your launcher button',
      placeholder: 'https://example.com/launcher-animation.svg',
      acceptedFormats: 'SVG'
    }
  ];

  const getPreviewContent = (mediaType, url) => {
    if (!url) return null;

    if (mediaType === 'video') {
      return (
        <video 
          src={url} 
          controls 
          className="w-16 h-16 rounded-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
      );
    } else if (mediaType === 'image' || mediaType === 'svg') {
      return (
        <img 
          src={url} 
          alt="Preview" 
          className="w-16 h-16 rounded-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🎯</span>
          <div>
            <h3 className="text-lg font-medium">Launcher Media Manager</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add media URLs for your launcher button
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {mediaTypes.map((type) => (
              <TabsTrigger 
                key={type.id} 
                value={type.id}
                className="flex items-center space-x-2"
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {mediaTypes.map((type) => (
            <TabsContent key={type.id} value={type.id} className="mt-6">
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-lg font-medium flex items-center justify-center space-x-2">
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {type.description}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <Input
                    label={`${type.label} URL`}
                    placeholder={type.placeholder}
                    value={getCurrentUrl(type.id)}
                    onChange={(e) => handleUrlChange(type.id, e.target.value)}
                    className="w-full"
                  />
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <p>• Supported formats: {type.acceptedFormats}</p>
                    <p>• Recommended size: 64x64px to 128x128px</p>
                    {type.id === 'svg' && <p>• SVG files work best for crisp graphics at any size</p>}
                    {type.id === 'video' && <p>• Keep videos short and optimized for web</p>}
                  </div>
                  
                  {getCurrentUrl(type.id) && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview:</h5>
                      <div className="flex items-center justify-center">
                        <div className="relative inline-block">
                          {getPreviewContent(type.id, getCurrentUrl(type.id))}
                          <div 
                            className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400"
                            style={{ display: 'none' }}
                          >
                            <div className="text-center">
                              <div className="text-2xl">{type.icon}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {getCurrentUrl(type.id) && (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemove(type.id)}
                      >
                        Remove {type.label}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
        
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>💡 <strong>Tip:</strong> Use SVG for crisp graphics at any size, videos for animations, or images for static content.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LauncherMediaManager;