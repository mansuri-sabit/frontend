// src/features/client/pages/Branding.jsx
import React, { useEffect, useState } from 'react';
import { useBrandingStore } from '../../../store/brandingStore';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Switch } from '../../../components/ui/Switch';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import toast from '@/lib/toast';
import { useAuthStore } from "../../../store/authStore";
import LauncherMediaManager from '../../../components/LauncherMediaManager';
const Branding = () => {
  const {
    branding,
    previewBranding,
    isLoading,
    isSaving,
    isDirty,
    error,
    loadBranding,
    saveBranding,
    updatePreview,
    resetPreview,
    validateBranding,
    applyPreset,
    getPresets,
    clearError,
  } = useBrandingStore();

  const [activeTab, setActiveTab] = useState('appearance');
  const [validationErrors, setValidationErrors] = useState({});
  const [showPreview, setShowPreview] = useState(true);
  const [embedCode, setEmbedCode] = useState('');
  const [showEmbedModal, setShowEmbedModal] = useState(false);

  useEffect(() => {
    loadBranding();
  }, []);

  // Generate embed code when branding changes
  useEffect(() => {
    if (previewBranding) {
      generateEmbedCode();
    }
  }, [previewBranding]);


  const handleSave = async () => {
    try {
      const validation = validateBranding(previewBranding);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        toast.error('Please fix validation errors before saving');
        return;
      }

      setValidationErrors({});
      await saveBranding(previewBranding);
      toast.success('Branding saved successfully!');
    } catch (error) {
      toast.error('Failed to save branding');
    }
  };

  const handleReset = () => {
    resetPreview();
    setValidationErrors({});
    toast.info('Changes reset to last saved version');
  };

  const handlePresetApply = (presetName) => {
    applyPreset(presetName);
    toast.success(`Applied ${presetName} preset`);
  };

  const updatePreQuestion = (index, value) => {
    const newQuestions = [...(previewBranding?.pre_questions || [])];
    newQuestions[index] = value;
    updatePreview({ pre_questions: newQuestions });
  };

  const addPreQuestion = () => {
    const current = previewBranding?.pre_questions || [];
    if (current.length < 3) {
      updatePreview({
        pre_questions: [...current, '']
      });
    }
  };

  const removePreQuestion = (index) => {
    const newQuestions = (previewBranding?.pre_questions || []).filter((_, i) => i !== index);
    updatePreview({ pre_questions: newQuestions });
  };

  const addPresetQuestion = (question) => {
    const current = previewBranding?.pre_questions || [];
    if (current.length < 3) {
      updatePreview({
        pre_questions: [...current, question]
      });
    }
  };

  const clearAllQuestions = () => {
    updatePreview({ pre_questions: [] });
  };

  // make sure at the top of Branding.jsx you have:
  // import { useAuthStore } from '../../../store/authStore';

  // Generate the public embed snippet (attribute-based loader)
  const generateEmbedCode = (override = {}) => {
    // 1) Resolve base URL and clientId
    const { user } = useAuthStore.getState(); // read once, no hook in render
    const baseUrl = (override.baseUrl || window.location.origin).replace(/\/+$/, '');
    const clientId =
      (override.clientId || user?.client_id || '').trim() || 'your-client-id';

    // Use the store's generateEmbedCode method
    const code = useBrandingStore.getState().generateEmbedCode(baseUrl, clientId, override);
    setEmbedCode(code);
    return code;
  };



  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      toast.success('Embed code copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy embed code');
    });
  };

  const presets = getPresets();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Chatbot Branding
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Customize your chatbot's appearance and behavior to match your brand.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {isDirty && (
            <Badge variant="warning" className="animate-pulse text-center sm:text-left">
              Unsaved Changes
            </Badge>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              onClick={() => setShowEmbedModal(true)}
              variant="outline"
              disabled={!previewBranding?.allow_embedding}
              className="w-full sm:w-auto"
              size="sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="hidden sm:inline">Get Embed Code</span>
              <span className="sm:hidden">Embed Code</span>
            </Button>

            <Button
              onClick={handleReset}
              variant="outline"
              disabled={!isDirty || isSaving}
              className="w-full sm:w-auto"
              size="sm"
            >
              Reset
            </Button>

            <Button
              onClick={handleSave}
              variant="primary"
              loading={isSaving}
              disabled={!isDirty}
              className="w-full sm:w-auto"
              size="sm"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          variant="error"
          title="Error"
          onClose={clearError}
        >
          {error}
        </Alert>
      )}

      {/* Validation Errors */}
      {Object.keys(validationErrors).length > 0 && (
        <Alert variant="error" title="Validation Errors">
          <ul className="list-disc list-inside space-y-1">
            {Object.entries(validationErrors).map(([field, error]) => (
              <li key={field}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className={`grid ${showPreview ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1'} gap-4 sm:gap-6`}>
        {/* Configuration Panel */}
        <div className={`${showPreview ? 'xl:col-span-2' : 'col-span-1'} space-y-2`}>
          {/* Preview Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex space-x-1 bg-muted p-1 rounded-lg overflow-x-auto scrollbar-hide">
              {[
                { id: 'appearance', label: 'Appearance', icon: '🎨', shortLabel: 'App' },
                { id: 'messages', label: 'Messages', icon: '💬', shortLabel: 'Msg' },
                { id: 'behavior', label: 'Behavior', icon: '⚙️', shortLabel: 'Beh' },
                { id: 'widget', label: 'Widget', icon: '🔧', shortLabel: 'Wid' },
                { id: 'launcher', label: 'Launcher', icon: '🚀', shortLabel: 'Lch' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                      ? 'bg-card text-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </button>
              ))}
            </div>

            <div className="flex-shrink-0">
              <Switch
                label="Show Preview"
                checked={showPreview}
                onChange={setShowPreview}
                size="sm"
              />
            </div>
          </div>

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Color Presets */}
              <Card>
                <CardHeader>
                  <h3 className="text-base sm:text-lg font-medium">Quick Presets</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {presets.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => handlePresetApply(preset.name)}
                        className="flex flex-col items-center p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div
                          className="w-8 h-8 rounded-full mb-2"
                          style={{ backgroundColor: preset.color }}
                        />
                        <span className="text-sm font-medium">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Theme Configuration */}
              <Card>
                <CardHeader>
                  <h3 className="text-base sm:text-lg font-medium">Theme Configuration</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Theme Color
                      </label>
                      <div className="flex space-x-3">
                        <input
                          type="color"
                          value={previewBranding?.theme_color || '#3B82F6'}
                          onChange={(e) => updatePreview({ theme_color: e.target.value })}
                          className="w-12 h-10 rounded border border-input"
                        />
                        <Input
                          value={previewBranding?.theme_color || '#3B82F6'}
                          onChange={(e) => updatePreview({ theme_color: e.target.value })}
                          placeholder="#3B82F6"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <Input
                      label="Logo URL (Optional)"
                      placeholder="https://example.com/logo.png"
                      value={previewBranding?.logo_url || ''}
                      onChange={(e) => updatePreview({ logo_url: e.target.value })}
                      error={validationErrors.logo_url}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* AI Bot Avatar Configuration */}
              <Card>
                <CardHeader>
                  <h3 className="text-base sm:text-lg font-medium">AI Bot Avatar Configuration</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Customize your AI bot's avatar that appears in chat messages
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Avatar Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Avatar Type
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => updatePreview({ ai_avatar_type: 'logo' })}
                        className={`p-3 border-2 rounded-lg text-left transition-all ${
                          (previewBranding?.ai_avatar_type || 'logo') === 'logo'
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border hover:bg-muted/50 hover:border-border'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="text-xl flex-shrink-0">🖼️</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm mb-1">Company Logo</div>
                            <div className="text-xs text-muted-foreground">
                              Use your company logo as the avatar
                            </div>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => updatePreview({ ai_avatar_type: 'initial' })}
                        className={`p-3 border-2 rounded-lg text-left transition-all ${
                          previewBranding?.ai_avatar_type === 'initial'
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border hover:bg-muted/50 hover:border-border'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="text-xl flex-shrink-0">🔤</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm mb-1">Company Initial</div>
                            <div className="text-xs text-muted-foreground">
                              Use first letter of company name
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Logo URL Input */}
                  {(previewBranding?.ai_avatar_type || 'logo') === 'logo' && (
                    <div>
                      <Input
                        label="Logo URL"
                        placeholder="https://example.com/logo.png"
                        value={previewBranding?.logo_url || ''}
                        onChange={(e) => updatePreview({ logo_url: e.target.value })}
                        error={validationErrors.logo_url}
                        required
                      />
                      <div className="mt-2 p-3 bg-card border border-border rounded-lg">
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p className="flex items-center">
                            <span className="mr-2">•</span>
                            <span>Supported formats: JPG, PNG, GIF, SVG, WebP</span>
                          </p>
                          <p className="flex items-center">
                            <span className="mr-2">•</span>
                            <span>Recommended size: 64x64px or 128x128px</span>
                          </p>
                          <p className="flex items-center">
                            <span className="mr-2">•</span>
                            <span>Square images work best for circular avatars</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Avatar Settings Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Avatar Background Color
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="color"
                          value={previewBranding?.theme_color || '#3B82F6'}
                          onChange={(e) => updatePreview({ theme_color: e.target.value })}
                          className="w-12 h-10 rounded border border-input cursor-pointer"
                        />
                        <Input
                          value={previewBranding?.theme_color || '#3B82F6'}
                          onChange={(e) => updatePreview({ theme_color: e.target.value })}
                          placeholder="#3B82F6"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Input
                        label="Company Name"
                        value={previewBranding?.name || ''}
                        onChange={(e) => updatePreview({ name: e.target.value })}
                        placeholder="Your Company Name"
                        error={validationErrors.name}
                        maxLength={50}
                        showCharCount
                      />
                    </div>
                  </div>

                  {/* Avatar Preview */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 sm:mb-3">
                      Avatar Preview
                    </label>
                    <div className="flex justify-center p-3 sm:p-4 md:p-6 bg-gradient-to-br from-muted/50 to-muted rounded-lg border border-border min-h-[120px] sm:min-h-[140px] md:min-h-[160px] items-center">
                      <div className="relative">
                        {(previewBranding?.ai_avatar_type || 'logo') === 'logo' && previewBranding?.logo_url ? (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-xl ring-2 sm:ring-4 ring-card overflow-hidden relative transform transition-transform hover:scale-105">
                            <img 
                              src={previewBranding.logo_url} 
                              alt="Bot Avatar" 
                              className="w-full h-full object-cover absolute inset-0"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div 
                              className="w-full h-full flex items-center justify-center text-white font-bold text-base sm:text-lg md:text-xl absolute inset-0"
                              style={{ 
                                background: `linear-gradient(135deg, ${previewBranding?.theme_color || '#3B82F6'}, ${previewBranding?.theme_color || '#3B82F6'}dd)`,
                                display: 'none'
                              }}
                            >
                              {previewBranding?.name?.[0]?.toUpperCase() || 'A'}
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-xl text-white font-bold text-base sm:text-lg md:text-xl ring-2 sm:ring-4 ring-card transform transition-transform hover:scale-105"
                            style={{ 
                              background: `linear-gradient(135deg, ${previewBranding?.theme_color || '#3B82F6'}, ${previewBranding?.theme_color || '#3B82F6'}dd)`
                            }}
                          >
                            {previewBranding?.name?.[0]?.toUpperCase() || 'A'}
                          </div>
                        )}
                        <div className="absolute -bottom-5 sm:-bottom-6 left-1/2 transform -translate-x-1/2 text-[10px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap bg-card px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-sm">
                          AI Bot Avatar
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Avatar Behavior */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground">Avatar Display Settings</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors">
                        <div className="flex-1 pr-4">
                          <div className="text-sm font-medium text-foreground mb-1">
                            Show in Welcome Message
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Display avatar in the initial welcome message
                          </div>
                        </div>
                        <Switch
                          checked={previewBranding?.show_welcome_avatar !== false}
                          onChange={(checked) => updatePreview({ show_welcome_avatar: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors">
                        <div className="flex-1 pr-4">
                          <div className="text-sm font-medium text-foreground mb-1">
                            Show in Chat Messages
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Display avatar next to all AI responses
                          </div>
                        </div>
                        <Switch
                          checked={previewBranding?.show_chat_avatar !== false}
                          onChange={(checked) => updatePreview({ show_chat_avatar: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors">
                        <div className="flex-1 pr-4">
                          <div className="text-sm font-medium text-foreground mb-1">
                            Show in Typing Indicator
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Display avatar while AI is typing a response
                          </div>
                        </div>
                        <Switch
                          checked={previewBranding?.show_typing_avatar !== false}
                          onChange={(checked) => updatePreview({ show_typing_avatar: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-base sm:text-lg font-medium">Welcome Message</h3>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Hello! How can I help you today?"
                    value={previewBranding?.welcome_message || ''}
                    onChange={(e) => updatePreview({ welcome_message: e.target.value })}
                    error={validationErrors.welcome_message}
                    rows={3}
                    maxLength={500}
                    showCharCount
                    required
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-medium">Pre-defined Questions</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Add up to 3 suggested questions to help users get started quickly
                      </p>
                    </div>
                    <Button
                      onClick={addPreQuestion}
                      variant="outline"
                      size="sm"
                      disabled={(previewBranding?.pre_questions || []).length >= 3}
                      className="w-full sm:w-auto"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Question
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(previewBranding?.pre_questions || []).map((question, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-start">
                        <div className="flex-1 min-w-0">
                          <Input
                            placeholder={`Question ${index + 1}`}
                            value={question}
                            onChange={(e) => updatePreQuestion(index, e.target.value)}
                            maxLength={100}
                            className="w-full"
                            error={validationErrors[`pre_question_${index}`]}
                          />
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-1 gap-1 sm:gap-0">
                            <span className="text-xs text-muted-foreground">
                              {question.length}/100 characters
                            </span>
                            {question.trim() && (
                              <span className="text-xs text-primary flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Ready
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => removePreQuestion(index)}
                          variant="destructive"
                          size="sm"
                          className="w-full sm:w-auto sm:mt-1 flex-shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    ))}

                    {(previewBranding?.pre_questions || []).length === 0 && (
                      <div className="text-center py-6 sm:py-8">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                          No pre-defined questions added yet.
                        </p>
                        <p className="text-xs text-muted-foreground mb-4">
                          Add suggested questions to help users get started quickly
                        </p>
                        
                        {/* Quick Add Preset Questions */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Quick Add:</p>
                          <div className="flex flex-wrap gap-2 justify-center px-2">
                            {[
                              'What services do you offer?',
                              'How can I contact support?',
                              'What are your business hours?',
                              'Do you have a pricing guide?',
                              'Can I schedule a demo?',
                              'What makes you different?'
                            ].map((preset, index) => (
                              <button
                                key={index}
                                onClick={() => addPresetQuestion(preset)}
                                className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-full border border-border transition-colors"
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {(previewBranding?.pre_questions || []).length > 0 && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            <span className="text-sm font-medium text-foreground">
                              {(previewBranding?.pre_questions || []).filter(q => q.trim()).length} question(s) ready
                            </span>
                          </div>
                          <Button
                            onClick={clearAllQuestions}
                            variant="destructive"
                            size="sm"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Clear All
                          </Button>
                        </div>
                        
                        <div className="p-3 bg-card border border-border rounded-lg">
                          <div className="flex items-start">
                            <svg className="w-5 h-5 text-primary mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div className="text-sm">
                              <p className="text-foreground font-medium mb-1">
                                💡 Pro Tip
                              </p>
                              <p className="text-muted-foreground">
                                These questions will appear as clickable buttons in your chat widget, helping users start conversations quickly.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Behavior Tab */}
          {activeTab === 'behavior' && (
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-base sm:text-lg font-medium">Widget Behavior</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Switch
                    label="Allow Widget Embedding"
                    description="Enable embedding the chat widget on external websites"
                    checked={previewBranding?.allow_embedding !== false}
                    onChange={(checked) => updatePreview({ allow_embedding: checked })}
                  />

                  <Switch
                    label="Show 'Powered by' Branding"
                    description="Display 'Powered by SaaS Chatbot' in the widget footer"
                    checked={previewBranding?.show_powered_by === true}
                    onChange={(checked) => updatePreview({ show_powered_by: checked })}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Widget Tab */}
          {activeTab === 'widget' && (
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-base sm:text-lg font-medium">Widget Position</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { value: 'bottom-right', label: 'Bottom Right' },
                      { value: 'bottom-left', label: 'Bottom Left' },
                      { value: 'top-right', label: 'Top Right' },
                      { value: 'top-left', label: 'Top Left' },
                    ].map((position) => (
                      <button
                        key={position.value}
                        onClick={() => updatePreview({ widget_position: position.value })}
                        className={`p-3 border rounded-lg text-sm transition-colors ${(previewBranding?.widget_position || 'bottom-right') === position.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:bg-muted/50'
                          }`}
                      >
                        {position.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Widget Size Configuration */}
              <Card>
                <CardHeader>
                  <h3 className="text-base sm:text-lg font-medium">Widget Size</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Configure the default width and height of your chat widget
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Widget Width
                      </label>
                      <div className="flex space-x-2">
                        <Input
                          value={previewBranding?.widget_width || '360'}
                          onChange={(e) => updatePreview({ widget_width: e.target.value })}
                          placeholder="360"
                          className="flex-1"
                          type="number"
                          min="300"
                          max="600"
                        />
                        <span className="flex items-center text-sm text-muted-foreground px-2">
                          px
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: 300-600px
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Widget Height
                      </label>
                      <div className="flex space-x-2">
                        <Input
                          value={previewBranding?.widget_height || '520'}
                          onChange={(e) => updatePreview({ widget_height: e.target.value })}
                          placeholder="520"
                          className="flex-1"
                          type="number"
                          min="400"
                          max="800"
                        />
                        <span className="flex items-center text-sm text-muted-foreground px-2">
                          px
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: 400-800px
                      </p>
                    </div>
                  </div>

                  {/* Size Presets */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Quick Size Presets
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { width: '320', height: '480', label: 'Small' },
                        { width: '360', height: '520', label: 'Medium' },
                        { width: '400', height: '600', label: 'Large' },
                        { width: '480', height: '720', label: 'Extra Large' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => updatePreview({ 
                            widget_width: preset.width, 
                            widget_height: preset.height 
                          })}
                          className={`p-2 border rounded-lg text-sm transition-colors ${
                            (previewBranding?.widget_width || '360') === preset.width && 
                            (previewBranding?.widget_height || '520') === preset.height
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          {preset.label}
                          <div className="text-xs text-muted-foreground mt-1">
                            {preset.width}×{preset.height}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Expand/Collapse Feature Info */}
                  <div className="p-3 bg-card border border-border rounded-lg">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-primary mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm">
                        <p className="text-foreground font-medium mb-1">
                          💡 Expand/Collapse Feature
                        </p>
                        <p className="text-muted-foreground">
                          Users can expand the widget to full screen using the 3-dot menu in the header. The expanded size will be larger than the default size for better readability.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Launcher Tab */}
          {activeTab === 'launcher' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Launcher Appearance */}
              <Card>
                <CardHeader>
                  <h3 className="text-base sm:text-lg font-medium">Launcher Button Appearance</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Launcher Color
                      </label>
                      <div className="flex space-x-3">
                        <input
                          type="color"
                          value={previewBranding?.launcher_color || previewBranding?.theme_color || '#3B82F6'}
                          onChange={(e) => updatePreview({ launcher_color: e.target.value })}
                          className="w-12 h-10 rounded border border-input"
                        />
                        <Input
                          value={previewBranding?.launcher_color || previewBranding?.theme_color || '#3B82F6'}
                          onChange={(e) => updatePreview({ launcher_color: e.target.value })}
                          placeholder="#3B82F6"
                          className="flex-1"
                          error={validationErrors.launcher_color}
                        />
                      </div>
                    </div>

                    <Input
                      label="Launcher Text (Optional)"
                      placeholder="Chat, Support, Help..."
                      value={previewBranding?.launcher_text || ''}
                      onChange={(e) => updatePreview({ launcher_text: e.target.value })}
                      error={validationErrors.launcher_text}
                      maxLength={20}
                      showCharCount
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Launcher Icon
                      </label>
                      <select
                        value={previewBranding?.launcher_icon || 'chat'}
                        onChange={(e) => updatePreview({ launcher_icon: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                      >
                        <option value="chat">💬 Chat</option>
                        <option value="message">📩 Message</option>
                        <option value="smile">😊 Smile</option>
                        <option value="help">❓ Help</option>
                        <option value="star">⭐ Star</option>
                        <option value="headphones">🎧 Support</option>
                        <option value="robot">🤖 Robot</option>
                        <option value="heart">❤️ Heart</option>
                        <option value="lightbulb">💡 Lightbulb</option>
                        <option value="phone">📞 Phone</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        label="Use Theme Color"
                        checked={!previewBranding?.launcher_color}
                        onChange={(checked) => {
                          if (checked) {
                            updatePreview({ launcher_color: '' });
                          } else {
                            updatePreview({ launcher_color: previewBranding?.theme_color || '#3B82F6' });
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Launcher Icon Color
                      </label>
                      <div className="flex space-x-3">
                        <input
                          type="color"
                          value={previewBranding?.launcher_icon_color || '#FFFFFF'}
                          onChange={(e) => updatePreview({ launcher_icon_color: e.target.value })}
                          className="w-12 h-10 rounded border border-input"
                        />
                        <Input
                          value={previewBranding?.launcher_icon_color || '#FFFFFF'}
                          onChange={(e) => updatePreview({ launcher_icon_color: e.target.value })}
                          placeholder="#FFFFFF"
                          className="flex-1"
                          error={validationErrors.launcher_icon_color}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Cancel Icon Color
                      </label>
                      <div className="flex space-x-3">
                        <input
                          type="color"
                          value={previewBranding?.cancel_icon_color || '#FFFFFF'}
                          onChange={(e) => updatePreview({ cancel_icon_color: e.target.value })}
                          className="w-12 h-10 rounded border border-input"
                        />
                        <Input
                          value={previewBranding?.cancel_icon_color || '#FFFFFF'}
                          onChange={(e) => updatePreview({ cancel_icon_color: e.target.value })}
                          placeholder="#FFFFFF"
                          className="flex-1"
                          error={validationErrors.cancel_icon_color}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Launcher Media */}
              <LauncherMediaManager />

              {/* Cancel Icon Configuration */}
              <Card>
                <CardHeader>
                  <h3 className="text-base sm:text-lg font-medium">Cancel/Close Icon (When Popup is Open)</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Customize the icon that appears when the chatbot popup is open
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Cancel Icon Type
                      </label>
                      <select
                        value={previewBranding?.cancel_icon || 'close'}
                        onChange={(e) => updatePreview({ cancel_icon: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                      >
                        <option value="close">❌ Close (X)</option>
                        <option value="times">✖️ Times</option>
                        <option value="arrow-left">⬅️ Arrow Left</option>
                        <option value="arrow-down">⬇️ Arrow Down</option>
                        <option value="minus">➖ Minus</option>
                        <option value="circle-x">⭕ Circle X</option>
                        <option value="square-x">🟥 Square X</option>
                        <option value="hand">✋ Hand Stop</option>
                        <option value="stop">⏹️ Stop</option>
                        <option value="exit">🚪 Exit</option>
                      </select>
                    </div>

                    <Input
                      label="Custom Cancel Icon Image URL (Optional)"
                      placeholder="https://example.com/cancel-icon.png"
                      value={previewBranding?.cancel_image_url || ''}
                      onChange={(e) => updatePreview({ cancel_image_url: e.target.value })}
                      error={validationErrors.cancel_image_url}
                    />
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p>• If custom image is provided, it will override the icon type</p>
                    <p>• Image formats: JPG, PNG, GIF, SVG</p>
                    <p>• Recommended size: 24x24px or 32x32px</p>
                  </div>
                </CardContent>
              </Card>

              {/* Launcher Preview */}
              <Card>
                <CardHeader>
                  <h3 className="text-base sm:text-lg font-medium">Launcher Preview</h3>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center p-8 bg-muted rounded-lg">
                    <div className="relative">
                      {/* Launcher Button Preview */}
                      <button
                        className="w-16 h-16 rounded-full border-0 cursor-pointer flex items-center justify-center text-white text-sm font-medium transition-transform transform hover:scale-105"
                        style={{
                          background: previewBranding?.launcher_color 
                            ? `linear-gradient(135deg, ${previewBranding.launcher_color} 0%, ${previewBranding.launcher_color}dd 100%)`
                            : `linear-gradient(135deg, ${previewBranding?.theme_color || '#3B82F6'} 0%, ${previewBranding?.theme_color || '#3B82F6'}dd 100%)`,
                          boxShadow: '0 8px 22px rgba(0,0,0,.18)'
                        }}
                      >
                        {previewBranding?.launcher_video_url && previewBranding.launcher_video_url.trim() ? (
                          <video
                            src={previewBranding.launcher_video_url}
                            className="w-8 h-8 rounded-full object-cover"
                            autoPlay
                            loop
                            muted
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                        ) : previewBranding?.launcher_image_url && previewBranding.launcher_image_url.trim() ? (
                          <img
                            src={previewBranding.launcher_image_url}
                            alt="Launcher"
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                        ) : null}
                        
                        <div 
                          className="w-8 h-8 flex items-center justify-center"
                          style={{ 
                            display: (previewBranding?.launcher_video_url && previewBranding.launcher_video_url.trim()) || (previewBranding?.launcher_image_url && previewBranding.launcher_image_url.trim()) ? 'none' : 'flex',
                            color: previewBranding?.launcher_icon_color || '#FFFFFF'
                          }}
                        >
                          {previewBranding?.launcher_text ? (
                            <span className="text-xs font-bold" style={{ color: previewBranding?.launcher_icon_color || '#FFFFFF' }}>
                              {previewBranding.launcher_text}
                            </span>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: previewBranding?.launcher_icon_color || '#FFFFFF' }}>
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="xl:col-span-1 min-w-0">
            <Card className="sticky top-4 sm:top-6 xl:top-6">
              <CardHeader>
                <h3 className="text-base sm:text-lg font-medium">Live Preview</h3>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="bg-muted p-3 sm:p-6 rounded-lg flex justify-center">
                  <div
                    className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-xl border border-white/20 backdrop-blur-lg bg-white/70 dark:bg-white/10 transition-all duration-300"
                    style={{
                      minWidth: '280px',
                      borderTop: `0px solid ${previewBranding?.theme_color || '#3B82F6'}`,
                      boxShadow:
                        previewBranding?.show_powered_by === false
                          ? 'none'
                          : '0 8px 20px rgba(0,0,0,0.08)'
                    }}
                  >
                    {/* Widget Header */}
                    {previewBranding?.show_logo !== false && (
                      <div
                        className="px-3 sm:px-4 py-2.5 sm:py-3 text-white sticky top-0 z-50 flex items-center shadow-md min-w-0"
                        style={{
                          background: `linear-gradient(135deg, ${previewBranding?.theme_color || '#3B82F6'
                            }, ${(previewBranding?.theme_color || '#2563EB') + '90'})`
                        }}
                      >
                        {previewBranding?.logo_url ? (
                          <img
                            src={previewBranding.logo_url}
                            alt="Logo"
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded mr-2 sm:mr-3 object-cover flex-shrink-0"
                            onError={(e) => (e.target.style.display = 'none')}
                          />
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 rounded flex items-center justify-center mr-2 sm:mr-3 font-bold flex-shrink-0">
                            C
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-xs sm:text-sm truncate">Your Chatbot</h4>
                          <p className="text-[10px] sm:text-xs opacity-90 truncate">Online</p>
                        </div>
                      </div>
                    )}

                    {/* Widget Content */}
                    <div className="p-3 sm:p-4">
                      {/* Welcome Message */}
                      {previewBranding?.welcome_message &&
                        previewBranding?.show_welcome !== false && (
                          <div className="bg-muted rounded-2xl rounded-tl-none p-2.5 sm:p-3 mb-3 sm:mb-4 shadow-sm">
                            <p className="text-xs sm:text-sm text-foreground">
                              {previewBranding?.welcome_message ||
                                'Hello! How can I help you today?'}
                            </p>
                          </div>
                        )}

                      {/* Pre Questions */}
                      {(previewBranding?.pre_questions || [])
                        .filter((q) => q.trim()).length > 0 &&
                        previewBranding?.show_questions !== false && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Suggested questions:</p>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              {(previewBranding?.pre_questions || [])
                                .filter((q) => q.trim())
                                .slice(0, 3)
                                .map((question, index) => (
                                  <button
                                    key={index}
                                    className="px-2 sm:px-3 py-1.5 text-xs rounded-full border border-border bg-card hover:bg-muted/50 transition-colors break-words"
                                    style={{ wordBreak: 'break-word', maxWidth: '100%' }}
                                  >
                                    <span className="break-words">{question}</span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                      {/* Input Area */}
                      <div className="mt-3 sm:mt-4 flex items-center bg-background border border-border rounded-full px-2 sm:px-3 py-1.5 shadow-sm min-w-0">
                        <input
                          type="text"
                          placeholder="Type your message..."
                          className="flex-1 min-w-0 bg-transparent px-1.5 sm:px-2 py-1 text-xs sm:text-sm focus:outline-none"
                          disabled
                        />
                        <button
                          className="p-1.5 sm:p-2 rounded-full text-white shadow-md transition-transform transform hover:scale-105 flex-shrink-0"
                          style={{
                            backgroundColor:
                              previewBranding?.theme_color || '#3B82F6'
                          }}
                          disabled
                        >
                          <svg
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Footer */}
                    {previewBranding?.show_powered_by !== false && (
                      <div className="px-3 sm:px-4 pb-2 sm:pb-3 text-center">
                        <p className="text-[10px] sm:text-xs text-muted-foreground opacity-75 hover:opacity-100 transition-opacity">
                          Powered by <span className="font-semibold">SaaS Chatbot</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Launcher Preview */}
                <div className="mt-3 sm:mt-4 space-y-6 sm:space-y-8 pb-3 sm:pb-4">
                  <div className="flex flex-col items-center">
                    <button
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-0 cursor-pointer flex items-center justify-center text-white text-sm font-medium transition-transform transform hover:scale-105 mb-2 sm:mb-3"
                      style={{
                        background: previewBranding?.launcher_color 
                          ? `linear-gradient(135deg, ${previewBranding.launcher_color} 0%, ${previewBranding.launcher_color}dd 100%)`
                          : `linear-gradient(135deg, ${previewBranding?.theme_color || '#3B82F6'} 0%, ${previewBranding?.theme_color || '#3B82F6'}dd 100%)`,
                        boxShadow: '0 8px 22px rgba(0,0,0,.18)'
                      }}
                    >
                      {previewBranding?.launcher_video_url ? (
                        <video
                          src={previewBranding.launcher_video_url}
                          className="w-8 h-8 rounded-full object-cover"
                          autoPlay
                          loop
                          muted
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                      ) : previewBranding?.launcher_image_url ? (
                        <img
                          src={previewBranding.launcher_image_url}
                          alt="Launcher"
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                      ) : null}
                      
                      <div 
                        className="w-8 h-8 flex items-center justify-center"
                        style={{ display: previewBranding?.launcher_video_url || previewBranding?.launcher_image_url ? 'none' : 'flex' }}
                      >
                        {previewBranding?.launcher_text ? (
                          <span className="text-xs font-bold">
                            {previewBranding.launcher_text}
                          </span>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        )}
                      </div>
                    </button>
                    <div className="text-[10px] sm:text-xs text-muted-foreground text-center max-w-full px-2 break-words">
                      Launcher Button
                    </div>
                  </div>

                  {/* Cancel Icon Preview */}
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted flex items-center justify-center mb-2 sm:mb-3">
                      {previewBranding?.cancel_image_url && previewBranding.cancel_image_url.trim() ? (
                        <img
                          src={previewBranding.cancel_image_url}
                          alt="Cancel"
                          className="w-5 h-5 sm:w-6 sm:h-6 object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                      ) : null}
                      
                      <div 
                        className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"
                        style={{ 
                          display: (previewBranding?.cancel_image_url && previewBranding.cancel_image_url.trim()) ? 'none' : 'flex',
                          color: previewBranding?.cancel_icon_color || '#FFFFFF'
                        }}
                      >
                        {previewBranding?.cancel_icon === 'close' && (
                          <svg width="18" height="18" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: previewBranding?.cancel_icon_color || '#FFFFFF' }}>
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        )}
                        {previewBranding?.cancel_icon === 'times' && (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: previewBranding?.cancel_icon_color || '#FFFFFF' }}>
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        )}
                        {previewBranding?.cancel_icon === 'arrow-left' && (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: previewBranding?.cancel_icon_color || '#FFFFFF' }}>
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12,19 5,12 12,5"></polyline>
                          </svg>
                        )}
                        {previewBranding?.cancel_icon === 'arrow-down' && (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: previewBranding?.cancel_icon_color || '#FFFFFF' }}>
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <polyline points="19,12 12,19 5,12"></polyline>
                          </svg>
                        )}
                        {previewBranding?.cancel_icon === 'minus' && (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: previewBranding?.cancel_icon_color || '#FFFFFF' }}>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        )}
                        {previewBranding?.cancel_icon === 'circle-x' && (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: previewBranding?.cancel_icon_color || '#FFFFFF' }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                          </svg>
                        )}
                        {previewBranding?.cancel_icon === 'square-x' && (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: previewBranding?.cancel_icon_color || '#FFFFFF' }}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                          </svg>
                        )}
                        {previewBranding?.cancel_icon === 'hand' && (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: previewBranding?.cancel_icon_color || '#FFFFFF' }}>
                            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path>
                            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path>
                            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path>
                            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path>
                          </svg>
                        )}
                        {previewBranding?.cancel_icon === 'stop' && (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: previewBranding?.cancel_icon_color || '#FFFFFF' }}>
                            <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
                          </svg>
                        )}
                        {previewBranding?.cancel_icon === 'exit' && (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: previewBranding?.cancel_icon_color || '#FFFFFF' }}>
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16,17 21,12 16,7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground text-center max-w-full px-2 break-words">
                      Cancel Icon
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        )}

      </div>

      {/* Embed Code Modal */}
      {showEmbedModal && (
        <div className="fixed inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto p-4 sm:p-5 border w-full sm:w-11/12 max-w-2xl shadow-lg rounded-md bg-background border-border">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-medium text-foreground">
                  Widget Embed Code
                </h3>
                <button
                  onClick={() => setShowEmbedModal(false)}
                  className="text-muted-foreground hover:text-foreground flex-shrink-0 ml-2"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Copy and paste this code into your website to embed the chat widget:
                </p>

                <div className="relative">
                  <pre className="bg-muted p-3 sm:p-4 rounded-md text-xs sm:text-sm overflow-x-auto">
                    <code className="text-foreground break-all">{embedCode}</code>
                  </pre>
                  <button
                    onClick={copyEmbedCode}
                    className="absolute top-2 right-2 p-1.5 sm:p-2 bg-card rounded border border-border hover:bg-muted"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { Branding };
export default Branding;
