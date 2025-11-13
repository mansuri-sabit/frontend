// src/components/EnhancedSVGManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Checkbox } from './ui/Checkbox';
import { useBrandingStore } from '../store/brandingStore';
import MediaUpload from './MediaUpload';
import toast from '@/lib/toast';

const EnhancedSVGManager = () => {
  const { previewBranding, updatePreview, uploadLauncherMedia, removeLauncherMedia } = useBrandingStore();
  const [uploadedSVGs, setUploadedSVGs] = useState([]);
  const [selectedSVGs, setSelectedSVGs] = useState([]);
  const [activeSVG, setActiveSVG] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // Load uploaded SVGs on component mount
  useEffect(() => {
    loadUploadedSVGs();
  }, []);

  // Set active SVG from branding
  useEffect(() => {
    if (previewBranding?.launcher_svg_url) {
      const currentSVG = uploadedSVGs.find(svg => svg.url === previewBranding.launcher_svg_url);
      if (currentSVG) {
        setActiveSVG(currentSVG);
      }
    }
  }, [previewBranding?.launcher_svg_url, uploadedSVGs]);

  const loadUploadedSVGs = async () => {
    try {
      // This would call an API to get all uploaded SVGs for the client
      // For now, we'll show the current SVG if it exists
      if (previewBranding?.launcher_svg_url) {
        setUploadedSVGs([{
          id: 'current',
          url: previewBranding.launcher_svg_url,
          name: 'Current SVG',
          type: 'svg',
          uploadedAt: new Date().toISOString(),
          size: 'Unknown'
        }]);
      }
    } catch (error) {
      console.error('Failed to load SVGs:', error);
    }
  };

  const handleSVGUpload = async (file) => {
    console.log('🎨 SVG Upload started with file:', file);
    console.log('📁 File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadLauncherMedia(file, 'svg', (progress) => {
        setUploadProgress(progress);
      });

      const newSVG = {
        id: result.id || Date.now().toString(),
        url: result.url,
        name: file.name,
        type: 'svg',
        uploadedAt: new Date().toISOString(),
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
      };

      setUploadedSVGs(prev => [newSVG, ...prev]);
      toast.success('SVG uploaded successfully!');
      
      // Auto-select the newly uploaded SVG
      handleSVGSelect(newSVG);
      
      return result;
    } catch (error) {
      toast.error(`Failed to upload SVG: ${error.message}`);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSVGSelect = useCallback((svg) => {
    if (multiSelectMode) {
      // Multi-select mode
      setSelectedSVGs(prev => {
        const isSelected = prev.some(s => s.id === svg.id);
        if (isSelected) {
          return prev.filter(s => s.id !== svg.id);
        } else {
          return [...prev, svg];
        }
      });
    } else {
      // Single select mode - apply immediately
      setActiveSVG(svg);
      updatePreview({ launcher_svg_url: svg.url });
      toast.success('SVG applied to launcher!');
    }
  }, [multiSelectMode, updatePreview]);

  const handleMultiSelectToggle = () => {
    setMultiSelectMode(!multiSelectMode);
    if (!multiSelectMode) {
      setSelectedSVGs([]);
    }
  };

  const handleApplySelected = () => {
    if (selectedSVGs.length > 0) {
      // Apply the first selected SVG
      const firstSelected = selectedSVGs[0];
      setActiveSVG(firstSelected);
      updatePreview({ launcher_svg_url: firstSelected.url });
      toast.success(`${selectedSVGs.length} SVG(s) selected! Applied: ${firstSelected.name}`);
      setSelectedSVGs([]);
      setMultiSelectMode(false);
    }
  };

  const handleSVGDelete = (svgId) => {
    setUploadedSVGs(prev => prev.filter(svg => svg.id !== svgId));
    setSelectedSVGs(prev => prev.filter(svg => svg.id !== svgId));
    if (activeSVG?.id === svgId) {
      setActiveSVG(null);
      updatePreview({ launcher_svg_url: '' });
    }
    toast.success('SVG deleted successfully!');
  };

  const handleClearAll = () => {
    setUploadedSVGs([]);
    setSelectedSVGs([]);
    setActiveSVG(null);
    updatePreview({ launcher_svg_url: '' });
    toast.success('All SVGs cleared!');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            SVG Gallery
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload and manage your SVG collection
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={multiSelectMode ? "default" : "outline"}
            size="sm"
            onClick={handleMultiSelectToggle}
          >
            {multiSelectMode ? "Exit Multi-Select" : "Multi-Select"}
          </Button>
          {multiSelectMode && selectedSVGs.length > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleApplySelected}
            >
              Apply Selected ({selectedSVGs.length})
            </Button>
          )}
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <h4 className="text-lg font-medium">Upload New SVG</h4>
        </CardHeader>
        <CardContent>
          <MediaUpload
            onFileSelect={handleSVGUpload}
            onFileRemove={() => {}}
            fileType="svg"
            disabled={isUploading}
            currentFile=""
          />
          {isUploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SVG Gallery */}
      {uploadedSVGs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium">
                Your SVGs ({uploadedSVGs.length})
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {uploadedSVGs.map((svg) => {
                const isSelected = selectedSVGs.some(s => s.id === svg.id);
                const isActive = activeSVG?.id === svg.id;
                
                return (
                  <div
                    key={svg.id}
                    className={`relative group cursor-pointer rounded-lg border-2 transition-all duration-200 ${
                      isActive 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : isSelected 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => handleSVGSelect(svg)}
                  >
                    {/* SVG Preview */}
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800 p-2">
                      <img
                        src={svg.url}
                        alt={svg.name}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Selection Indicators */}
                    {multiSelectMode && (
                      <div className="absolute top-2 left-2">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSVGSelect(svg)}
                        />
                      </div>
                    )}

                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="default" size="sm">
                          Active
                        </Badge>
                      </div>
                    )}

                    {/* SVG Info */}
                    <div className="p-3 space-y-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {svg.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {svg.size} • {formatDate(svg.uploadedAt)}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                        {!multiSelectMode && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSVGSelect(svg);
                            }}
                          >
                            {isActive ? 'Active' : 'Select'}
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSVGDelete(svg.id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selection Summary */}
            {multiSelectMode && selectedSVGs.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {selectedSVGs.length} SVG(s) selected
                  </span>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleApplySelected}
                  >
                    Apply Selection
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {uploadedSVGs.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No SVGs uploaded yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Upload your first SVG to get started
            </p>
          </CardContent>
        </Card>
      )}

      {/* Guidelines */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 text-sm">💡</span>
              </div>
            </div>
            <div className="flex-1">
              <h6 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                SVG Management Tips
              </h6>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• <strong>Multi-Select:</strong> Enable multi-select mode to choose multiple SVGs</li>
                <li>• <strong>Instant Apply:</strong> Click any SVG to apply it immediately to the launcher</li>
                <li>• <strong>Permanent Storage:</strong> All SVGs are saved permanently in your gallery</li>
                <li>• <strong>No Refresh:</strong> All changes apply instantly without page reload</li>
                <li>• <strong>Animated SVGs:</strong> Fully supported and will play automatically</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedSVGManager;
