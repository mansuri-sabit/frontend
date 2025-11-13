// src/store/brandingStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { apiClient } from '../lib/api';

// Helper: only send fields the backend Branding model knows about
// and keep pre_questions <= 3 and trimmed.
const sanitizeBrandingForBackend = (raw) => {
  const theme_color = raw?.theme_color || '#3B82F6';
  const welcome_message = raw?.welcome_message || 'Hello! How can I help you today?';
  const logo_url = raw?.logo_url || '';
  const allow_embedding = raw?.allow_embedding !== false; // default true

  const pre_questions = (raw?.pre_questions || [])
    .filter((q) => !!q && q.trim())
    .slice(0, 3);

  return {
    theme_color,
    welcome_message,
    logo_url,
    allow_embedding,
    pre_questions,
    show_powered_by: raw?.show_powered_by === true, // explicit true/false
    // Widget configuration
    widget_width: raw?.widget_width || '360',
    widget_height: raw?.widget_height || '520',
    widget_position: raw?.widget_position || 'bottom-right',
    // Launcher configuration
    launcher_color: raw?.launcher_color || '',
    launcher_text: raw?.launcher_text || '',
    launcher_icon: raw?.launcher_icon || 'chat',
    // Preserve actual values for image/video URLs (don't default to empty string)
    launcher_image_url: raw?.launcher_image_url ?? '',
    launcher_video_url: raw?.launcher_video_url ?? '',
    launcher_svg_url: raw?.launcher_svg_url ?? '',
    launcher_icon_color: raw?.launcher_icon_color || '#FFFFFF',
    // Cancel icon configuration
    cancel_icon: raw?.cancel_icon || 'close',
    // Preserve actual values for cancel image URL (don't default to empty string)
    cancel_image_url: raw?.cancel_image_url ?? '',
    cancel_icon_color: raw?.cancel_icon_color || '#000000',
    // AI Avatar configuration
    ai_avatar_type: raw?.ai_avatar_type || 'logo',
    show_welcome_avatar: raw?.show_welcome_avatar !== false, // default true
    show_chat_avatar: raw?.show_chat_avatar !== false, // default true
    show_typing_avatar: raw?.show_typing_avatar !== false, // default true
  };
};

export const useBrandingStore = create(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // State
        branding: null,
        previewBranding: null,
        isLoading: false,
        isSaving: false,
        isDirty: false,
        error: null,
        lastSaved: null,
        validationErrors: {},

        // Actions
        loadBranding: async () => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const data = await apiClient.getBranding();

            // Debug logging for load process
            console.log('loadBranding - Data received from backend:', data);
            console.log('loadBranding - Image URLs from backend:', {
              launcher_image_url: data?.launcher_image_url,
              launcher_video_url: data?.launcher_video_url,
              cancel_image_url: data?.cancel_image_url
            });
            console.log('loadBranding - Show Powered By from backend:', data?.show_powered_by);

            set((state) => {
              state.branding = data;
              state.previewBranding = { ...data };
              state.isLoading = false;
              state.isDirty = false;
              state.lastSaved = new Date().toISOString();
            });

            return data;
          } catch (error) {
            set((state) => {
              state.isLoading = false;
              state.error = error?.message || 'Failed to load branding';
            });
            throw error;
          }
        },

        saveBranding: async (brandingData) => {
          set((state) => {
            state.isSaving = true;
            state.error = null;
            state.validationErrors = {};
          });

          try {
            const source = brandingData || get().previewBranding || {};
            const payload = sanitizeBrandingForBackend(source);

            // Debug logging for save process
            console.log('saveBranding - Source data:', source);
            console.log('saveBranding - Payload being sent:', payload);
            console.log('saveBranding - Image URLs:', {
              launcher_image_url: source?.launcher_image_url,
              launcher_video_url: source?.launcher_video_url,
              cancel_image_url: source?.cancel_image_url
            });
            console.log('saveBranding - Show Powered By:', {
              source: source?.show_powered_by,
              payload: payload?.show_powered_by
            });

            const savedData = await apiClient.updateBranding(payload);

            set((state) => {
              state.branding = savedData;
              state.previewBranding = { ...savedData };
              state.isSaving = false;
              state.isDirty = false;
              state.lastSaved = new Date().toISOString();
            });

            return savedData;
          } catch (error) {
            set((state) => {
              state.isSaving = false;
              state.error = error?.message || 'Failed to save branding';
            });
            throw error;
          }
        },

        updatePreview: (updates) => {
          // Debug logging for image URL updates
          if (updates.launcher_image_url !== undefined || updates.launcher_video_url !== undefined || updates.cancel_image_url !== undefined) {
            console.log('updatePreview - Image URL updates:', {
              launcher_image_url: updates.launcher_image_url,
              launcher_video_url: updates.launcher_video_url,
              cancel_image_url: updates.cancel_image_url,
              allUpdates: updates
            });
          }
          
          
          set((state) => {
            if (state.previewBranding) {
              Object.assign(state.previewBranding, updates);
            } else {
              state.previewBranding = { ...updates };
            }
            // normalize preview pre_questions to trimmed array (avoid accidental blanks)
            // Only filter empty strings if we're not explicitly adding pre_questions
            if (state.previewBranding.pre_questions && !updates.pre_questions) {
              state.previewBranding.pre_questions = state.previewBranding.pre_questions
                .map((q) => (q ?? '').toString())
                .filter((q) => q.trim());
            }

            // Check if changes are different from saved branding
            const isDifferent =
              JSON.stringify(sanitizeBrandingForBackend(state.branding || {})) !==
              JSON.stringify(sanitizeBrandingForBackend(state.previewBranding || {}));
            state.isDirty = isDifferent;
            
            // Debug logging for final state after update
            if (updates.launcher_image_url !== undefined || updates.launcher_video_url !== undefined || updates.cancel_image_url !== undefined) {
              console.log('updatePreview - Final state after update:', {
                launcher_image_url: state.previewBranding?.launcher_image_url,
                launcher_video_url: state.previewBranding?.launcher_video_url,
                cancel_image_url: state.previewBranding?.cancel_image_url
              });
            }
          });
        },

        resetPreview: () => {
          const { branding } = get();
          set((state) => {
            state.previewBranding = branding ? { ...branding } : null;
            state.isDirty = false;
            state.validationErrors = {};
          });
        },

        validateBranding: (brandingData) => {
          const data = brandingData || get().previewBranding || {};
          const errors = {};

          // Required fields validation
          if (!data?.theme_color) {
            errors.theme_color = 'Theme color is required';
          } else if (!/^#[0-9A-F]{6}$/i.test(data.theme_color)) {
            errors.theme_color = 'Please enter a valid hex color code';
          }

          if (!data?.welcome_message) {
            errors.welcome_message = 'Welcome message is required';
          } else if (data.welcome_message.length < 10) {
            errors.welcome_message = 'Welcome message must be at least 10 characters';
          } else if (data.welcome_message.length > 500) {
            errors.welcome_message = 'Welcome message must be less than 500 characters';
          }

          // Logo URL validation (if provided)
          if (data?.logo_url && !/^https?:\/\/.+\.(jpg|jpeg|png|gif|svg)$/i.test(data.logo_url)) {
            errors.logo_url = 'Please enter a valid image URL';
          }

          // Launcher configuration validation
          if (data?.launcher_color && !/^#[0-9A-F]{6}$/i.test(data.launcher_color)) {
            errors.launcher_color = 'Please enter a valid hex color code for launcher';
          }

          if (data?.launcher_text && data.launcher_text.length > 20) {
            errors.launcher_text = 'Launcher text must be less than 20 characters';
          }

          if (data?.launcher_image_url && !/^https?:\/\/.+\.(jpg|jpeg|png|gif|svg)$/i.test(data.launcher_image_url)) {
            errors.launcher_image_url = 'Please enter a valid image URL for launcher';
          }

          if (data?.launcher_video_url && !/^https?:\/\/.+\.(mp4|webm|ogg)$/i.test(data.launcher_video_url)) {
            errors.launcher_video_url = 'Please enter a valid video URL (mp4, webm, ogg)';
          }

          if (data?.launcher_svg_url && !/^https?:\/\/.+\.svg$/i.test(data.launcher_svg_url)) {
            errors.launcher_svg_url = 'Please enter a valid SVG URL';
          }

          if (data?.cancel_image_url && !/^https?:\/\/.+\.(jpg|jpeg|png|gif|svg)$/i.test(data.cancel_image_url)) {
            errors.cancel_image_url = 'Please enter a valid image URL for cancel icon';
          }

          if (data?.launcher_icon_color && !/^#[0-9A-F]{6}$/i.test(data.launcher_icon_color)) {
            errors.launcher_icon_color = 'Please enter a valid hex color code for launcher icon';
          }

          if (data?.cancel_icon_color && !/^#[0-9A-F]{6}$/i.test(data.cancel_icon_color)) {
            errors.cancel_icon_color = 'Please enter a valid hex color code for cancel icon';
          }

          // Pre-questions validation (backend allows max 3)
          if (data?.pre_questions) {
            const validQuestions = data.pre_questions.filter((q) => q && q.trim());
            if (validQuestions.length > 3) {
              errors.pre_questions = 'Maximum 3 pre-defined questions allowed';
            }
            validQuestions.forEach((question, index) => {
              if (question.length > 100) {
                errors[`pre_question_${index}`] = `Question ${index + 1} must be less than 100 characters`;
              }
            });
          }

          // Widget position validation (frontend-only)
          const validPositions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
          if (data?.widget_position && !validPositions.includes(data.widget_position)) {
            errors.widget_position = 'Invalid widget position';
          }

          // Greeting delay validation
          if (data?.greeting_delay !== undefined) {
            const delay = parseInt(data.greeting_delay, 10);
            if (isNaN(delay) || delay < 0 || delay > 10000) {
              errors.greeting_delay = 'Greeting delay must be between 0 and 10000 milliseconds';
            }
          }

          set((state) => {
            state.validationErrors = errors;
          });

          return {
            isValid: Object.keys(errors).length === 0,
            errors,
          };
        },

        applyPreset: (presetName) => {
          const presets = get().getPresets();
          const preset = presets.find((p) => p.name === presetName);

          if (preset) {
            set((state) => {
              if (!state.previewBranding) state.previewBranding = {};
              Object.assign(state.previewBranding, preset.settings);
              state.isDirty = true;
            });
          }
        },

        getPresets: () => [
          {
            name: 'professional',
            label: 'Professional',
            color: '#1F2937',
            settings: {
              theme_color: '#1F2937',
              welcome_message: "Hello! I'm here to assist you with your inquiries.",
              widget_position: 'bottom-right',
              show_powered_by: true,
              allow_embedding: true,
              auto_open: false,
              greeting_delay: 3000,
              launcher_color: '#1F2937',
              launcher_text: 'Chat',
              launcher_icon: 'chat',
              launcher_image_url: '',
              launcher_video_url: '',
              launcher_icon_color: '#FFFFFF',
              cancel_icon: 'close',
              cancel_image_url: '',
              cancel_icon_color: '#000000',
              // AI Avatar configuration
              ai_avatar_type: 'logo',
              show_welcome_avatar: true,
              show_chat_avatar: true,
              show_typing_avatar: true,
            },
          },
          {
            name: 'friendly',
            label: 'Friendly',
            color: '#10B981',
            settings: {
              theme_color: '#10B981',
              welcome_message: 'Hi there! 👋 How can I help you today?',
              widget_position: 'bottom-right',
              show_powered_by: true,
              allow_embedding: true,
              auto_open: false,
              greeting_delay: 2000,
              launcher_color: '#10B981',
              launcher_text: 'Hi! 👋',
              launcher_icon: 'smile',
              launcher_image_url: '',
              launcher_video_url: '',
              launcher_icon_color: '#FFFFFF',
              cancel_icon: 'close',
              cancel_image_url: '',
              cancel_icon_color: '#000000',
              // AI Avatar configuration
              ai_avatar_type: 'logo',
              show_welcome_avatar: true,
              show_chat_avatar: true,
              show_typing_avatar: true,
            },
          },
          {
            name: 'modern',
            label: 'Modern',
            color: '#3B82F6',
            settings: {
              theme_color: '#3B82F6',
              welcome_message: "Welcome! Let's get started with your questions.",
              widget_position: 'bottom-right',
              show_powered_by: true,
              allow_embedding: true,
              auto_open: false,
              greeting_delay: 3000,
              launcher_color: '#3B82F6',
              launcher_text: 'Chat',
              launcher_icon: 'message',
              launcher_image_url: '',
              launcher_video_url: '',
              launcher_icon_color: '#FFFFFF',
              cancel_icon: 'close',
              cancel_image_url: '',
              cancel_icon_color: '#000000',
              // AI Avatar configuration
              ai_avatar_type: 'logo',
              show_welcome_avatar: true,
              show_chat_avatar: true,
              show_typing_avatar: true,
            },
          },
          {
            name: 'minimal',
            label: 'Minimal',
            color: '#6B7280',
            settings: {
              theme_color: '#6B7280',
              welcome_message: 'How can I assist you?',
              widget_position: 'bottom-right',
              show_powered_by: false,
              allow_embedding: true,
              auto_open: false,
              greeting_delay: 5000,
              launcher_color: '#6B7280',
              launcher_text: '?',
              launcher_icon: 'help',
              launcher_image_url: '',
              launcher_video_url: '',
              launcher_icon_color: '#FFFFFF',
              cancel_icon: 'close',
              cancel_image_url: '',
              cancel_icon_color: '#000000',
              // AI Avatar configuration
              ai_avatar_type: 'logo',
              show_welcome_avatar: true,
              show_chat_avatar: true,
              show_typing_avatar: true,
            },
          },
          {
            name: 'vibrant',
            label: 'Vibrant',
            color: '#F59E0B',
            settings: {
              theme_color: '#F59E0B',
              welcome_message: "Hey! 🌟 Ready to chat? I'm here to help!",
              widget_position: 'bottom-right',
              show_powered_by: true,
              allow_embedding: true,
              auto_open: true,
              greeting_delay: 1500,
              launcher_color: '#F59E0B',
              launcher_text: '🌟',
              launcher_icon: 'star',
              launcher_image_url: '',
              launcher_video_url: '',
              launcher_icon_color: '#FFFFFF',
              cancel_icon: 'close',
              cancel_image_url: '',
              cancel_icon_color: '#000000',
              // AI Avatar configuration
              ai_avatar_type: 'logo',
              show_welcome_avatar: true,
              show_chat_avatar: true,
              show_typing_avatar: true,
            },
          },
          {
            name: 'corporate',
            label: 'Corporate',
            color: '#1E40AF',
            settings: {
              theme_color: '#1E40AF',
              welcome_message:
                'Good day! I\'m your virtual assistant. How may I serve you today?',
              widget_position: 'bottom-right',
              show_powered_by: true,
              allow_embedding: true,
              auto_open: false,
              greeting_delay: 4000,
              launcher_color: '#1E40AF',
              launcher_text: 'Support',
              launcher_icon: 'headphones',
              launcher_image_url: '',
              launcher_video_url: '',
              launcher_icon_color: '#FFFFFF',
              cancel_icon: 'close',
              cancel_image_url: '',
              cancel_icon_color: '#000000',
              // AI Avatar configuration
              ai_avatar_type: 'logo',
              show_welcome_avatar: true,
              show_chat_avatar: true,
              show_typing_avatar: true,
            },
          },
        ],

        // Utility methods
        clearError: () => {
          set((state) => {
            state.error = null;
          });
        },

        clearValidationErrors: () => {
          set((state) => {
            state.validationErrors = {};
          });
        },

        setError: (error) => {
          set((state) => {
            state.error = error;
          });
        },

        // Theme-specific methods
        updateThemeColor: (color) => {
          get().updatePreview({ theme_color: color });
        },

        updateWelcomeMessage: (message) => {
          get().updatePreview({ welcome_message: message });
        },

        updateLogoUrl: (url) => {
          get().updatePreview({ logo_url: url });
        },

        updatePreQuestions: (questions) => {
          const trimmed = (questions || []).map((q) => q?.toString() || '').filter((q) => q.trim()).slice(0, 3);
          get().updatePreview({ pre_questions: trimmed });
        },

        addPreQuestion: (question) => {
          const { previewBranding } = get();
          const current = (previewBranding?.pre_questions || []).filter((q) => q && q.trim());
          if (current.length < 3) {
            get().updatePreview({ pre_questions: [...current, (question || '').toString()] });
          }
        },

        removePreQuestion: (index) => {
          const { previewBranding } = get();
          const current = (previewBranding?.pre_questions || []).filter((q) => q && q.trim());
          get().updatePreview({
            pre_questions: current.filter((_, i) => i !== index),
          });
        },

        updatePreQuestion: (index, value) => {
          const { previewBranding } = get();
          const current = [...(previewBranding?.pre_questions || [])];
          current[index] = (value || '').toString();
          get().updatePreview({ pre_questions: current });
        },

        toggleEmbedding: () => {
          const { previewBranding } = get();
          get().updatePreview({
            allow_embedding: !previewBranding?.allow_embedding,
          });
        },

        togglePoweredBy: () => {
          const { previewBranding } = get();
          get().updatePreview({
            show_powered_by: !previewBranding?.show_powered_by,
          });
        },

        toggleAutoOpen: () => {
          const { previewBranding } = get();
          get().updatePreview({
            auto_open: !previewBranding?.auto_open,
          });
        },

        updateWidgetPosition: (position) => {
          get().updatePreview({ widget_position: position });
        },

        updateGreetingDelay: (delay) => {
          get().updatePreview({ greeting_delay: parseInt(delay, 10) || 0 });
        },

        // Media upload methods
        uploadLauncherMedia: async (file, mediaType, onProgress = null) => {
          try {
            const { apiClient } = await import('../lib/api');
            const result = await apiClient.uploadLauncherMedia(file, mediaType, onProgress);
            
            // Update the appropriate field based on media type
            const fieldName = mediaType === 'image' ? 'launcher_image_url' : 
                             mediaType === 'video' ? 'launcher_video_url' : 
                             'launcher_svg_url';
            
            get().updatePreview({ [fieldName]: result.url });
            return result;
          } catch (error) {
            get().setError(`Failed to upload ${mediaType}: ${error.message}`);
            throw error;
          }
        },

        removeLauncherMedia: (mediaType) => {
          const fieldName = mediaType === 'image' ? 'launcher_image_url' : 
                           mediaType === 'video' ? 'launcher_video_url' : 
                           'launcher_svg_url';
          get().updatePreview({ [fieldName]: '' });
        },

        // Advanced features
        // Generates snippet for public/embed-snippet.js (attribute-based)
generateEmbedCode: (baseUrl, clientId, opts = {}) => {
  const { previewBranding } = get();

  // resolve base url (no trailing slash)
  const origin = (baseUrl || window.location.origin).replace(/\/+$/, '');

  // resolve client id (keep placeholder only if really unknown)
  const resolvedClientId = (clientId || '').trim() || 'your-client-id';

  // position map → JSON object expected by embed-snippet.js
  const posKey = (opts.position || previewBranding?.widget_position || 'bottom-right');
  const posMap = {
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left':  { bottom: '20px', left: '20px'  },
    'top-right':    { top: '20px',    right: '20px' },
    'top-left':     { top: '20px',    left: '20px'  },
  };
  const posObj = typeof posKey === 'object' ? posKey : (posMap[posKey] || posMap['bottom-right']);
  const positionJSON = JSON.stringify(posObj);

  const width         = opts.width  || previewBranding?.widget_width + 'px' || '360px';
  const height        = opts.height || previewBranding?.widget_height + 'px' || '520px';
  const theme         = opts.theme  || 'light'; // light | dark | auto
  const autoOpen      = !!(opts.autoOpen ?? previewBranding?.auto_open);
  const greetingDelay = Number.isFinite(previewBranding?.greeting_delay)
    ? previewBranding.greeting_delay
    : (Number.isFinite(opts.greetingDelay) ? opts.greetingDelay : 3000);

  // Launcher configuration
  const launcherColor = previewBranding?.launcher_color || previewBranding?.theme_color || '#3B82F6';
  const launcherText = previewBranding?.launcher_text || '';
  const launcherIcon = previewBranding?.launcher_icon || 'chat';
  const launcherImageUrl = previewBranding?.launcher_image_url || '';
  const launcherVideoUrl = previewBranding?.launcher_video_url || '';
  const launcherSvgUrl = previewBranding?.launcher_svg_url || '';
  const launcherIconColor = previewBranding?.launcher_icon_color || '#FFFFFF';
  const cancelIcon = previewBranding?.cancel_icon || 'close';
  const cancelImageUrl = previewBranding?.cancel_image_url || '';
  const cancelIconColor = previewBranding?.cancel_icon_color || '#000000';

  // Debug logging for launcher media
  if (launcherImageUrl || launcherVideoUrl || launcherSvgUrl) {
    console.log('generateEmbedCode - Launcher media found:', {
      launcherImageUrl,
      launcherVideoUrl,
      launcherSvgUrl,
      previewBranding: previewBranding
    });
  }

  // optional CSP nonce support
  const nonceAttr = opts.nonce ? ` nonce="${opts.nonce}"` : '';

  // Build data attributes for launcher configuration
  const launcherAttrs = [];
  if (launcherColor) launcherAttrs.push(`data-launcher-color="${launcherColor}"`);
  if (launcherText) launcherAttrs.push(`data-launcher-text="${launcherText}"`);
  if (launcherIcon) launcherAttrs.push(`data-launcher-icon="${launcherIcon}"`);
  if (launcherImageUrl !== undefined) launcherAttrs.push(`data-launcher-image="${launcherImageUrl}"`);
  if (launcherVideoUrl !== undefined) launcherAttrs.push(`data-launcher-video="${launcherVideoUrl}"`);
  if (launcherSvgUrl !== undefined) launcherAttrs.push(`data-launcher-svg="${launcherSvgUrl}"`);
  if (launcherIconColor) launcherAttrs.push(`data-launcher-icon-color="${launcherIconColor}"`);
  if (cancelIcon) launcherAttrs.push(`data-cancel-icon="${cancelIcon}"`);
  if (cancelImageUrl !== undefined) launcherAttrs.push(`data-cancel-image="${cancelImageUrl}"`);
  if (cancelIconColor) launcherAttrs.push(`data-cancel-icon-color="${cancelIconColor}"`);

  const launcherAttrsStr = launcherAttrs.length > 0 ? '\n        ' + launcherAttrs.join('\n        ') : '';

  // NOTE: simplified format - only client-id required, others are defaults
  return `<!-- SaaS Chatbot Widget -->
<div id="saas-chatbot-widget"></div>
<script src="${origin}/embed-snippet.js"${nonceAttr}
        data-client-id="${resolvedClientId}"${launcherAttrsStr}>
</script>`;
},


        exportBranding: (format = 'json') => {
          const { previewBranding } = get();

          switch (format) {
            case 'json':
              return JSON.stringify(sanitizeBrandingForBackend(previewBranding || {}), null, 2);
            case 'css':
              return `
/* SaaS Chatbot Custom Styles */
:root {
  --chatbot-primary-color: ${previewBranding?.theme_color || '#3B82F6'};
  --chatbot-greeting-delay: ${previewBranding?.greeting_delay || 3000}ms;
}

.saas-chatbot-widget {
  position: fixed;
  ${previewBranding?.widget_position?.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
  ${previewBranding?.widget_position?.includes('right') ? 'right: 20px;' : 'left: 20px;'}
  z-index: 9999;
}

.saas-chatbot-header {
  background-color: var(--chatbot-primary-color);
}
              `;
            case 'html':
              return `
<!DOCTYPE html>
<html>
<head>
  <title>Chatbot Preview</title>
  <style>
    /* Chatbot styles would go here */
  </style>
</head>
<body>
  <div class="chatbot-preview">
    <div class="chatbot-header" style="background-color: ${previewBranding?.theme_color || '#3B82F6'}">
      <h4>Chatbot Preview</h4>
    </div>
    <div class="chatbot-body">
      <p>${previewBranding?.welcome_message || 'Hello! How can I help you today?'}</p>
    </div>
  </div>
</body>
</html>
              `;
            default:
              return JSON.stringify(sanitizeBrandingForBackend(previewBranding || {}), null, 2);
          }
        },

        importBranding: (brandingData) => {
          try {
            const parsedData = typeof brandingData === 'string' ? JSON.parse(brandingData) : brandingData;

            const validation = get().validateBranding(parsedData);
            if (!validation.isValid) {
              throw new Error('Invalid branding data format');
            }

            // Enforce backend-compatible shape right away
            const cleaned = sanitizeBrandingForBackend(parsedData);

            set((state) => {
              state.previewBranding = { ...state.previewBranding, ...cleaned };
              state.isDirty = true;
            });

            return true;
          } catch (error) {
            set((state) => {
              state.error = 'Failed to import branding data: ' + error.message;
            });
            return false;
          }
        },

        // Analytics and insights
        getBrandingInsights: () => {
          const { previewBranding } = get();

          const insights = [];

          // Color contrast check
          const isLightColor = (hex) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            return brightness > 128;
          };

          if (previewBranding?.theme_color) {
            if (isLightColor(previewBranding.theme_color)) {
              insights.push({
                type: 'warning',
                message: 'Light theme colors may have poor contrast with white text',
                suggestion: 'Consider using a darker shade for better readability',
              });
            }
          }

          // Message length check
          if (previewBranding?.welcome_message && previewBranding.welcome_message.length > 200) {
            insights.push({
              type: 'info',
              message: 'Long welcome messages may overwhelm users',
              suggestion: 'Keep welcome messages concise and friendly',
            });
          }

          // Pre-questions optimization
          const validQuestions = (previewBranding?.pre_questions || []).filter((q) => q.trim());
          if (validQuestions.length === 0) {
            insights.push({
              type: 'tip',
              message: 'No pre-defined questions set',
              suggestion: 'Add common questions to help users get started quickly',
            });
          }
          if (validQuestions.length > 3) {
            insights.push({
              type: 'warning',
              message: 'More than 3 pre-questions are set',
              suggestion: 'Backend allows up to 3. Extra items will be ignored.',
            });
          }

          // Auto-open behavior
          if (previewBranding?.auto_open && (previewBranding?.greeting_delay ?? 0) < 2000) {
            insights.push({
              type: 'warning',
              message: 'Auto-opening too quickly may be intrusive',
              suggestion: 'Consider a delay of at least 2–3 seconds',
            });
          }

          // Embedding settings
          if (previewBranding?.allow_embedding === false) {
            insights.push({
              type: 'info',
              message: 'Widget embedding is disabled',
              suggestion: 'Enable embedding to use the widget on external sites',
            });
          }

          return insights;
        },

        // Debug helpers
        ...(import.meta.env.DEV && {
          debug: () => {
            const state = get();
            return {
              branding: state.branding,
              previewBranding: state.previewBranding,
              isDirty: state.isDirty,
              isLoading: state.isLoading,
              isSaving: state.isSaving,
              lastSaved: state.lastSaved,
              validationErrors: state.validationErrors,
              insights: state.getBrandingInsights(),
            };
          },

          resetToDefaults: () => {
            const defaultBranding = {
              theme_color: '#3B82F6',
              welcome_message: 'Hello! How can I help you today?',
              pre_questions: [
                'What services do you offer?',
                'How can I contact support?',
                'What are your business hours?',
              ],
              logo_url: '',
              allow_embedding: true,
              show_powered_by: true, // frontend-only flag; tolerated
              widget_position: 'bottom-right', // frontend-only
              auto_open: false,
              greeting_delay: 3000,
            };

            set((state) => {
              state.previewBranding = { ...defaultBranding };
              state.isDirty = true;
            });
          },
        }),
      })),
      {
        name: 'branding-storage',
        partialize: (state) => ({
          branding: state.branding,
          lastSaved: state.lastSaved,
        }),
        version: 1,
        migrate: (persistedState, version) => {
          if (version < 1) {
            return {
              ...persistedState,
            };
          }
          return persistedState;
        },
      }
    )
  )
);

// Subscribe to preview changes for auto-save (optional)
let autoSaveTimeout;
useBrandingStore.subscribe(
  (state) => state.isDirty,
  (isDirty) => {
    if (isDirty && import.meta.env.VITE_AUTO_SAVE_BRANDING === 'true') {
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => {
        const { previewBranding, saveBranding } = useBrandingStore.getState();
        if (previewBranding) {
          saveBranding(previewBranding);
        }
      }, 5000); // Auto-save after 5 seconds of inactivity
    }
  }
);

// Subscribe to branding changes for analytics
useBrandingStore.subscribe(
  (state) => state.branding,
  (branding, previousBranding) => {
    if (branding && previousBranding && import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
      console.log('Branding updated:', {
        previous: previousBranding,
        current: branding,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Export selectors for performance optimization
export const selectBranding = (state) => state.branding;
export const selectPreviewBranding = (state) => state.previewBranding;
export const selectIsLoading = (state) => state.isLoading;
export const selectIsSaving = (state) => state.isSaving;
export const selectIsDirty = (state) => state.isDirty;
export const selectError = (state) => state.error;
export const selectValidationErrors = (state) => state.validationErrors;

export default useBrandingStore;
