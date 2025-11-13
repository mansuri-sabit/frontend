import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { apiClient } from '../../../lib/api';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import toast from '@/lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Modal } from '../../../components/ui/Modal';

const EditClient = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // State
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Document Management State
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsPage, setDocumentsPage] = useState(1);
  const [documentsTotal, setDocumentsTotal] = useState(0);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    document: null,
    isDeleting: false,
  });
  
  // Upload State
  const [uploadQueue, setUploadQueue] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  
  // Embed Code State
  const [embedCode, setEmbedCode] = useState(null);
  const [embedCodeLoading, setEmbedCodeLoading] = useState(false);
  const [embedCodeError, setEmbedCodeError] = useState(null);
  const [activeEmbedTab, setActiveEmbedTab] = useState('html');
  const [embedConfig, setEmbedConfig] = useState({
    baseUrl: window.location.origin,
    clientId: '',
    theme: 'auto',
    position: 'bottom-right',
    maxWidth: 350,
    maxHeight: 500,
  });
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    status: 'active',
    token_limit: 1000,
    branding: {
      logo_url: '',
      theme_color: '#3B82F6',
      welcome_message: '',
      pre_questions: [],
      allow_embedding: true,
      show_powered_by: true,
      widget_position: 'bottom-right',
      launcher_color: '',
      launcher_icon_color: '#FFFFFF',
      launcher_image_url: '',
      launcher_video_url: '',
      launcher_svg_url: '',
      launcher_text: '',
      launcher_icon: 'chat'
    }
  });

  // User credentials state
  const [userCredentials, setUserCredentials] = useState({
    username: '',
    password: '',
    hasUser: false
  });
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);

  // Status options
  const statusOptions = [
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'inactive', label: 'Inactive', color: 'gray' },
    { value: 'suspended', label: 'Suspended', color: 'red' },
    { value: 'trial', label: 'Trial', color: 'blue' }
  ];

  // Fetch documents - memoized with useCallback
  const fetchDocuments = useCallback(async (page = 1) => {
    if (!id) return;
    try {
      setDocumentsLoading(true);
      const response = await apiClient.getClientDocuments(id, { page, limit: 10 });
      console.log('Documents response:', response);
      
      // Handle different response formats
      const pdfs = response?.pdfs || response?.data?.pdfs || [];
      const total = response?.total || response?.data?.total || 0;
      
      setDocuments(pdfs);
      setDocumentsTotal(total);
      setDocumentsPage(page);
      
      if (pdfs.length === 0 && page === 1) {
        console.log('No documents found for client:', id);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load documents';
      toast.error(errorMessage);
      
      // Set empty state on error
      setDocuments([]);
      setDocumentsTotal(0);
    } finally {
      setDocumentsLoading(false);
    }
  }, [id]);

  // Load client user credentials
  const loadUserCredentials = useCallback(async () => {
    if (!id) return;
    try {
      console.log('Loading user credentials for client:', id);
      const response = await apiClient.getClientUser(id);
      console.log('User credentials response:', response);
      setUserCredentials({
        username: response.username || '',
        password: '', // Never show existing password
        hasUser: response.has_user !== undefined ? response.has_user : (response.username ? true : false)
      });
      console.log('Set user credentials:', {
        username: response.username || '',
        hasUser: response.has_user !== undefined ? response.has_user : (response.username ? true : false)
      });
    } catch (error) {
      console.error('Error loading user credentials:', error);
      console.error('Error response:', error.response?.data);
      // Don't show error toast for missing user - it's optional
      if (error.response?.status !== 404) {
        toast.error('Failed to load user credentials');
      } else {
        // User doesn't exist, set empty credentials
        setUserCredentials({
          username: '',
          password: '',
          hasUser: false
        });
      }
    }
  }, [id]);

  // Load client data
  useEffect(() => {
    let isMounted = true;
    const loadClient = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Add timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          if (isMounted) {
            setIsLoading(false);
            setError('Request timeout - please try again');
            toast.error('Request took too long. Please check your connection and try again.');
          }
        }, 30000); // 30 second timeout
        
        try {
          const response = await apiClient.getClient(id);
          
          clearTimeout(timeoutId);
          
          if (!isMounted) return;
          
          setClient(response.client);
          
          // Ensure we handle all possible field names and null/undefined values
          const clientData = response.client || {};
          setFormData({
            name: clientData.name || '',
            contact_email: clientData.contact_email || '',
            contact_phone: clientData.contact_phone || '',
            status: clientData.status || 'active',
            token_limit: clientData.token_limit || 1000,
            branding: {
              logo_url: clientData.branding?.logo_url || '',
              theme_color: clientData.branding?.theme_color || '#3B82F6',
              welcome_message: clientData.branding?.welcome_message || '',
              pre_questions: clientData.branding?.pre_questions || [],
              allow_embedding: clientData.branding?.allow_embedding ?? true,
              show_powered_by: clientData.branding?.show_powered_by ?? true,
              widget_position: clientData.branding?.widget_position || 'bottom-right',
              launcher_color: clientData.branding?.launcher_color || '',
              launcher_icon_color: clientData.branding?.launcher_icon_color || '#FFFFFF',
              launcher_image_url: clientData.branding?.launcher_image_url || '',
              launcher_video_url: clientData.branding?.launcher_video_url || '',
              launcher_svg_url: clientData.branding?.launcher_svg_url || '',
              launcher_text: clientData.branding?.launcher_text || '',
              launcher_icon: clientData.branding?.launcher_icon || 'chat'
            }
          });
        } catch (error) {
          clearTimeout(timeoutId);
          if (!isMounted) return;
          
          console.error('Error loading client:', error);
          const errorMessage = error.response?.data?.message || error.message || 'Failed to load client data';
          setError(errorMessage);
          toast.error(errorMessage);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Unexpected error loading client:', error);
          setError('An unexpected error occurred');
          toast.error('An unexpected error occurred');
          setIsLoading(false);
        }
      }
    };

    if (id) {
      loadClient();
      loadUserCredentials();
      fetchDocuments(1);
    }
    
    return () => {
      isMounted = false;
    };
  }, [id, fetchDocuments, loadUserCredentials]);

  // Handle document delete
  const handleDeleteDocument = (doc) => {
    setDeleteModal({
      isOpen: true,
      document: doc,
      isDeleting: false,
    });
  };

  const confirmDeleteDocument = async () => {
    if (!deleteModal.document || !id) return;
    
    try {
      setDeleteModal(prev => ({ ...prev, isDeleting: true }));
      const docId = deleteModal.document._id || deleteModal.document.id;
      await apiClient.deleteClientDocument(id, docId);
      
      toast.success('Document deleted successfully');
      setDeleteModal({ isOpen: false, document: null, isDeleting: false });
      
      // Refresh documents list
      fetchDocuments(documentsPage);
    } catch (error) {
      console.error('Error deleting document:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete document';
      toast.error(errorMessage);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  // Format bytes
  const formatBytes = (bytes = 0) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  };

  // Get clean filename
  const getCleanFilename = (filename) => {
    if (!filename) return 'Unknown Document';
    const baseName = filename.split('/').pop().split('\\').pop();
    const timestampHashPattern = /^\d{8}_\d{6}_[a-f0-9]+_/;
    return baseName.replace(timestampHashPattern, '');
  };

  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'danger';
      default:
        return 'default';
    }
  };

  // Upload handlers
  const handleFileSelect = (e) => {
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'];
    const allFiles = Array.from(e.target.files || []);
    
    const files = allFiles.filter((f) => {
      const fileName = f.name.toLowerCase();
      const lastDotIndex = fileName.lastIndexOf('.');
      const fileExtension = lastDotIndex >= 0 ? fileName.substring(lastDotIndex) : '';
      const isAllowedByExtension = fileExtension && allowedExtensions.includes(fileExtension);
      const isAllowedByType = f.type && allowedTypes.includes(f.type);
      return isAllowedByExtension || isAllowedByType;
    });
    
    if (files.length === 0 && allFiles.length > 0) {
      toast.error('No supported files selected. Supported: PDF, DOCX, DOC, TXT');
      return;
    }
    
    if (files.length === 0) return;
    files.forEach(queueUpload);
    e.target.value = '';
  };

  const queueUpload = (file) => {
    const uploadId = crypto.randomUUID();
    const uploadItem = {
      id: uploadId,
      file,
      progress: 0,
      status: 'queued',
      error: '',
    };
    setUploadQueue((q) => [...q, uploadItem]);
    startUpload(uploadId, file);
  };

  const startUpload = async (uploadId, file) => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setUploadQueue((q) => q.map((u) => 
        u.id === uploadId 
          ? { ...u, status: 'failed', error: `File exceeds 100MB limit` }
          : u
      ));
      toast.error(`"${file.name}" exceeds the 100MB file size limit`);
      return;
    }

    setUploadQueue((q) => q.map((u) => 
      u.id === uploadId ? { ...u, status: 'uploading' } : u
    ));

    try {
      const result = await apiClient.uploadClientDocument(
        id,
        file,
        (percentage, progressEvent) => {
          setUploadQueue((q) => q.map((u) => 
            u.id === uploadId 
              ? { ...u, progress: percentage }
              : u
          ));
        }
      );

      setUploadQueue((q) => q.map((u) => 
        u.id === uploadId 
          ? { 
              ...u, 
              progress: 100, 
              status: result.status === 'completed' ? 'completed' : 'processing'
            }
          : u
      ));

      toast.success(`"${file.name}" uploaded successfully`);
      
      // Refresh documents list
      setTimeout(() => {
        fetchDocuments(documentsPage);
        setUploadQueue((q) => q.filter(u => u.id !== uploadId));
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
      setUploadQueue((q) => q.map((u) => 
        u.id === uploadId 
          ? { ...u, status: 'failed', error: errorMessage }
          : u
      ));
      toast.error(`Failed to upload "${file.name}": ${errorMessage}`);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'];
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => {
      const fileName = f.name.toLowerCase();
      const lastDotIndex = fileName.lastIndexOf('.');
      const fileExtension = lastDotIndex >= 0 ? fileName.substring(lastDotIndex) : '';
      const isAllowedByExtension = fileExtension && allowedExtensions.includes(fileExtension);
      const isAllowedByType = f.type && allowedTypes.includes(f.type);
      return isAllowedByExtension || isAllowedByType;
    });
    
    if (files.length === 0) {
      toast.error('No supported files. Supported: PDF, DOCX, DOC, TXT');
      return;
    }
    
    files.forEach(queueUpload);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (name === 'features') {
        setFormData(prev => ({
          ...prev,
          features: checked 
            ? [...prev.features, value]
            : prev.features.filter(f => f !== value)
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseInt(value) || 0 : value
      }));
    }
  };

  // Handle user credentials update
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Submitting credentials:', {
      username: userCredentials.username,
      hasPassword: !!userCredentials.password,
      hasUser: userCredentials.hasUser
    });
    
    if (!userCredentials.username && !userCredentials.password) {
      toast.error('Please provide at least a username or password');
      return;
    }

    // If creating new user, both fields are required
    if (!userCredentials.hasUser && (!userCredentials.username || !userCredentials.password)) {
      toast.error('Both username and password are required to create a new user');
      return;
    }
    
    try {
      setIsSavingCredentials(true);
      const credentials = {};
      if (userCredentials.username && userCredentials.username.trim()) {
        credentials.username = userCredentials.username.trim();
      }
      if (userCredentials.password && userCredentials.password.trim()) {
        credentials.password = userCredentials.password;
      }
      
      console.log('Sending credentials update:', credentials);
      const response = await apiClient.updateClientUser(id, credentials);
      console.log('Update response:', response);
      
      toast.success('User credentials updated successfully');
      
      // Reload credentials to get updated username
      await loadUserCredentials();
      
      // Clear password field after successful update
      setUserCredentials(prev => ({ ...prev, password: '' }));
    } catch (error) {
      console.error('Error updating user credentials:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update user credentials';
      toast.error(errorMessage);
    } finally {
      setIsSavingCredentials(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      await apiClient.updateClient(id, formData);
      
      toast.success('Client updated successfully');
      
      navigate('/admin');
    } catch (error) {
      console.error('Error updating client:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update client';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Load embed code
  const loadEmbedCode = async () => {
    if (!id) return;
    try {
      setEmbedCodeLoading(true);
      setEmbedCodeError(null);
      const response = await apiClient.getClientEmbedCode(id);
      setEmbedCode(response);
      // Update embed config with client ID
      setEmbedConfig(prev => ({
        ...prev,
        clientId: response.client_id || id,
      }));
      // Generate initial code
      generateEmbedCodeSnippet('html', response);
    } catch (error) {
      console.error('Error loading embed code:', error);
      setEmbedCodeError(error.response?.data?.message || error.message || 'Failed to load embed code');
      toast.error('Failed to load embed code');
    } finally {
      setEmbedCodeLoading(false);
    }
  };

  // Generate embed code snippets (similar to client side)
  const generateEmbedCodeSnippet = (tab, embedData = embedCode) => {
    if (!embedData) return '';
    
    const baseUrl = embedConfig.baseUrl.replace(/\/+$/, '');
    const clientId = embedData.client_id || embedConfig.clientId || id;

    // Get launcher customization from formData.branding
    const launcherColor = formData.branding?.launcher_color || formData.branding?.theme_color || '';
    const launcherText = formData.branding?.launcher_text || '';
    const launcherIcon = formData.branding?.launcher_icon || 'chat';
    const launcherImageUrl = formData.branding?.launcher_image_url || '';
    const launcherVideoUrl = formData.branding?.launcher_video_url || '';
    const launcherSvgUrl = formData.branding?.launcher_svg_url || '';
    const launcherIconColor = formData.branding?.launcher_icon_color || '#FFFFFF';

    // Build data attributes for launcher configuration
    const launcherAttrs = [];
    if (launcherColor) launcherAttrs.push(`data-launcher-color="${launcherColor}"`);
    if (launcherText) launcherAttrs.push(`data-launcher-text="${launcherText}"`);
    if (launcherIcon) launcherAttrs.push(`data-launcher-icon="${launcherIcon}"`);
    if (launcherImageUrl) launcherAttrs.push(`data-launcher-image="${launcherImageUrl}"`);
    if (launcherVideoUrl) launcherAttrs.push(`data-launcher-video="${launcherVideoUrl}"`);
    if (launcherSvgUrl) launcherAttrs.push(`data-launcher-svg="${launcherSvgUrl}"`);
    if (launcherIconColor) launcherAttrs.push(`data-launcher-icon-color="${launcherIconColor}"`);

    const launcherAttrsStr = launcherAttrs.length > 0 ? '\n        ' + launcherAttrs.join('\n        ') : '';

    switch (tab) {
      case 'html':
        return `<!-- SaaS Chatbot Widget -->
<div id="saas-chatbot-widget"></div>
<script src='${baseUrl}/embed-snippet.js' 
        data-client-id='${clientId}'${launcherAttrsStr}>
</script>`;
      
      case 'react':
        const reactAttrs = launcherAttrs.map(attr => {
          const [key, value] = attr.split('=');
          return `    s.setAttribute('${key}', '${value.replace(/"/g, '')}');`;
        }).join('\n');
        return `// React example — place this anywhere in your app
import { useEffect } from 'react';

export default function ChatbotLoader(){
  useEffect(() => {
    const s = document.createElement('script');
    s.src = '${baseUrl}/embed-snippet.js';
    s.async = true;
    s.setAttribute('data-client-id', '${clientId}');${reactAttrs ? '\n' + reactAttrs : ''}
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, []);

  // optional placeholder element
  return <div id="saas-chatbot-widget" />;
}`;
      
      case 'vanilla':
        const vanillaAttrs = launcherAttrs.map(attr => {
          const [key, value] = attr.split('=');
          return `  s.setAttribute('${key}', '${value.replace(/"/g, '')}');`;
        }).join('\n');
        return `// Vanilla JS
(function(){
  var s = document.createElement('script');
  s.src = '${baseUrl}/embed-snippet.js';
  s.async = true;
  s.setAttribute('data-client-id', '${clientId}');${vanillaAttrs ? '\n' + vanillaAttrs : ''}
  document.head.appendChild(s);
})();`;
      
      case 'wordpress':
        return `<?php
// Add this to your theme's functions.php or a small plugin
add_action('wp_footer', function () {
  ?>
  <div id="saas-chatbot-widget"></div>
  <script src='${baseUrl}/embed-snippet.js' 
          data-client-id='${clientId}'${launcherAttrsStr}>
  </script>
  <?php
});`;
      
      case 'iframe':
        const iframeSecret = embedData.embed_secret ? `?secret=${embedData.embed_secret}` : '';
        return `<!-- SaaS Chatbot iFrame Embed -->
<iframe
  id="saas-chatbot-iframe"
  src="${baseUrl}/embed/${clientId}${iframeSecret}"
  width="${embedConfig.maxWidth}"
  height="${embedConfig.maxHeight}"
  frameborder="0"
  scrolling="no"
  style="
    position: fixed;
    ${embedConfig.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
    ${embedConfig.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
    z-index: 9999;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    background: white;
    overflow: hidden;
  "
  allow="clipboard-write"
  title="SaaS Chatbot Widget">
</iframe>

<script>
// optional: listen for resize messages sent by the widget
window.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'saas-chatbot-embed' && e.data.action === 'resize') {
    var el = document.getElementById('saas-chatbot-iframe');
    if (el && e.data.height) el.style.height = e.data.height + 'px';
  }
});
</script>`;
      
      default:
        return '';
    }
  };

  // Current embed code snippet - regenerate when formData.branding changes
  const currentEmbedSnippet = embedCode ? generateEmbedCodeSnippet(activeEmbedTab, embedCode) : '';
  
  // Regenerate embed code when launcher customization changes
  useEffect(() => {
    if (embedCode) {
      // Force re-render of embed code when branding changes
      // The generateEmbedCodeSnippet function will use the latest formData.branding
    }
  }, [
    formData.branding?.launcher_color,
    formData.branding?.launcher_text,
    formData.branding?.launcher_icon,
    formData.branding?.launcher_image_url,
    formData.branding?.launcher_video_url,
    formData.branding?.launcher_svg_url,
    formData.branding?.launcher_icon_color,
    activeEmbedTab,
    embedCode
  ]);

  // Copy embed code to clipboard
  const copyEmbedCode = (code) => {
    const codeToCopy = code || currentEmbedSnippet;
    if (!codeToCopy) return;
    navigator.clipboard.writeText(codeToCopy).then(() => {
      toast.success('Embed code copied to clipboard!');
    }).catch((err) => {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy embed code');
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
        <Button onClick={() => navigate('/admin')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Client</h1>
          <p className="text-gray-600 dark:text-gray-300">Update client information and settings</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin')}
        >
          Back to Dashboard
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Client Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
              <Input
                label="Contact Email"
                name="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={handleInputChange}
              />
              <Input
                label="Contact Phone"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleInputChange}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Input
                label="Token Limit"
                name="token_limit"
                type="number"
                value={formData.token_limit}
                onChange={handleInputChange}
                min="1000"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Branding Settings */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Branding Settings</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Logo URL
                </label>
                {/* Logo Preview */}
                {formData.branding.logo_url && (
                  <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Logo Preview:</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          branding: { ...prev.branding, logo_url: '' }
                        }))}
                        className="text-xs h-6 px-2 text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="relative inline-block">
                      <img
                        key={formData.branding.logo_url}
                        src={formData.branding.logo_url}
                        alt="Client Logo"
                        className="max-w-[200px] max-h-[100px] object-contain border border-gray-300 rounded-lg p-2 bg-white shadow-sm"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const errorDiv = e.target.nextSibling;
                          if (errorDiv) errorDiv.style.display = 'flex';
                        }}
                      />
                      <div 
                        className="hidden items-center justify-center w-[200px] h-[100px] border border-red-300 rounded-lg bg-red-50 text-red-600 text-xs"
                        style={{ display: 'none' }}
                      >
                        Failed to load image
                      </div>
                    </div>
                  </div>
                )}
                {/* Logo URL Input */}
                <Input
                  label=""
                  name="branding.logo_url"
                  placeholder="https://example.com/logo.png"
                  value={formData.branding.logo_url}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    branding: { ...prev.branding, logo_url: e.target.value }
                  }))}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enter the URL of your logo image. The logo will be displayed in the chat widget.
                </p>
              </div>
              <Input
                label="Theme Color"
                name="branding.theme_color"
                type="color"
                value={formData.branding.theme_color}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  branding: { ...prev.branding, theme_color: e.target.value }
                }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Welcome Message
              </label>
              <textarea
                name="branding.welcome_message"
                value={formData.branding.welcome_message}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  branding: { ...prev.branding, welcome_message: e.target.value }
                }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Welcome message for the chat widget"
              />
            </div>

            {/* Pre-defined Questions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pre-defined Questions (max 3)
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add up to 3 suggested questions to help users get started quickly
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    const current = formData.branding.pre_questions || [];
                    if (current.length < 3) {
                      setFormData(prev => ({
                        ...prev,
                        branding: { ...prev.branding, pre_questions: [...current, ''] }
                      }));
                    }
                  }}
                  variant="outline"
                  size="sm"
                  disabled={(formData.branding.pre_questions || []).length >= 3}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Question
                </Button>
              </div>

              <div className="space-y-3">
                {(formData.branding.pre_questions || []).map((question, index) => (
                  <div key={index} className="flex space-x-3 items-start">
                    <div className="flex-1">
                      <Input
                        placeholder={`Question ${index + 1}`}
                        value={question}
                        onChange={(e) => {
                          const newQuestions = [...(formData.branding.pre_questions || [])];
                          newQuestions[index] = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            branding: { ...prev.branding, pre_questions: newQuestions }
                          }));
                        }}
                        maxLength={100}
                        className="w-full"
                      />
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {question.length}/100 characters
                        </span>
                        {question.trim() && question.length >= 5 && (
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Ready
                          </span>
                        )}
                        {question.trim() && question.length < 5 && (
                          <span className="text-xs text-yellow-600 dark:text-yellow-400">
                            Min 5 characters
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        const newQuestions = (formData.branding.pre_questions || []).filter((_, i) => i !== index);
                        setFormData(prev => ({
                          ...prev,
                          branding: { ...prev.branding, pre_questions: newQuestions }
                        }));
                      }}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50 mt-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                ))}

                {(formData.branding.pre_questions || []).length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      No pre-defined questions added yet.
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                      Add suggested questions to help users get started quickly
                    </p>
                    
                    {/* Quick Add Preset Questions */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Quick Add:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {[
                          'What services do you offer?',
                          'How can I contact support?',
                          'What are your business hours?',
                          'Do you have a pricing guide?',
                          'Can I schedule a demo?',
                          'What makes you different?'
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const current = formData.branding.pre_questions || [];
                              if (current.length < 3) {
                                setFormData(prev => ({
                                  ...prev,
                                  branding: { ...prev.branding, pre_questions: [...current, preset] }
                                }));
                              }
                            }}
                            className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {(formData.branding.pre_questions || []).length > 0 && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {(formData.branding.pre_questions || []).filter(q => q && q.trim()).length} question(s) ready
                        </span>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            branding: { ...prev.branding, pre_questions: [] }
                          }));
                        }}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear All
                      </Button>
                    </div>
                    
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm">
                          <p className="text-blue-800 dark:text-blue-300 font-medium mb-1">
                            💡 Pro Tip
                          </p>
                          <p className="text-blue-700 dark:text-blue-300">
                            These questions will appear as clickable buttons in your chat widget, helping users start conversations quickly.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Widget Position
                </label>
                <select
                  name="branding.widget_position"
                  value={formData.branding.widget_position}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    branding: { ...prev.branding, widget_position: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.branding.allow_embedding}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      branding: { ...prev.branding, allow_embedding: e.target.checked }
                    }))}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Allow Embedding</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.branding.show_powered_by}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      branding: { ...prev.branding, show_powered_by: e.target.checked }
                    }))}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show Powered By</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Launcher Customization */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Launcher Button Customization</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Customize the chatbot launcher button appearance (color, image, video, SVG)
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Launcher Color */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Launcher Button Color
                </label>
                <div className="flex space-x-3">
                  <input
                    type="color"
                    value={formData.branding.launcher_color || formData.branding.theme_color || '#3B82F6'}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      branding: { ...prev.branding, launcher_color: e.target.value }
                    }))}
                    className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600"
                  />
                  <Input
                    value={formData.branding.launcher_color || formData.branding.theme_color || '#3B82F6'}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      branding: { ...prev.branding, launcher_color: e.target.value }
                    }))}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Leave empty to use theme color
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Launcher Icon Color
                </label>
                <div className="flex space-x-3">
                  <input
                    type="color"
                    value={formData.branding.launcher_icon_color || '#FFFFFF'}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      branding: { ...prev.branding, launcher_icon_color: e.target.value }
                    }))}
                    className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600"
                  />
                  <Input
                    value={formData.branding.launcher_icon_color || '#FFFFFF'}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      branding: { ...prev.branding, launcher_icon_color: e.target.value }
                    }))}
                    placeholder="#FFFFFF"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Launcher Text */}
            <div>
              <Input
                label="Launcher Text (Optional)"
                value={formData.branding.launcher_text || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  branding: { ...prev.branding, launcher_text: e.target.value }
                }))}
                placeholder="Chat"
                maxLength={20}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Text to display on the launcher button (max 20 characters)
              </p>
            </div>

            {/* Launcher Media URLs */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Launcher Media</h3>
              
              {/* Image URL */}
              <div>
                <Input
                  label="Launcher Image URL"
                  value={formData.branding.launcher_image_url || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    branding: { ...prev.branding, launcher_image_url: e.target.value }
                  }))}
                  placeholder="https://example.com/launcher-image.png"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  JPG, PNG, GIF, WebP (Recommended: 64x64px to 128x128px)
                </p>
                {formData.branding.launcher_image_url && (
                  <div className="mt-2 flex items-center space-x-2">
                    <img
                      src={formData.branding.launcher_image_url}
                      alt="Launcher Preview"
                      className="w-16 h-16 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'block';
                        }
                      }}
                    />
                    <div className="hidden w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-xs">
                      Invalid URL
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        branding: { ...prev.branding, launcher_image_url: '' }
                      }))}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              {/* Video URL */}
              <div>
                <Input
                  label="Launcher Video URL"
                  value={formData.branding.launcher_video_url || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    branding: { ...prev.branding, launcher_video_url: e.target.value }
                  }))}
                  placeholder="https://example.com/launcher-video.mp4"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  MP4, WebM, OGG (Keep videos short and optimized for web)
                </p>
                {formData.branding.launcher_video_url && (
                  <div className="mt-2 flex items-center space-x-2">
                    <video
                      src={formData.branding.launcher_video_url}
                      controls
                      className="w-16 h-16 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'block';
                        }
                      }}
                    />
                    <div className="hidden w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-xs">
                      Invalid URL
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        branding: { ...prev.branding, launcher_video_url: '' }
                      }))}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              {/* SVG URL */}
              <div>
                <Input
                  label="Launcher SVG URL"
                  value={formData.branding.launcher_svg_url || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    branding: { ...prev.branding, launcher_svg_url: e.target.value }
                  }))}
                  placeholder="https://example.com/launcher-animation.svg"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  SVG files work best for crisp graphics at any size
                </p>
                {formData.branding.launcher_svg_url && (
                  <div className="mt-2 flex items-center space-x-2">
                    <img
                      src={formData.branding.launcher_svg_url}
                      alt="Launcher Preview"
                      className="w-16 h-16 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'block';
                        }
                      }}
                    />
                    <div className="hidden w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-xs">
                      Invalid URL
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        branding: { ...prev.branding, launcher_svg_url: '' }
                      }))}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Launcher Preview */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Launcher Preview</h3>
              <div className="flex justify-center p-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <button
                  type="button"
                  className="w-16 h-16 rounded-full border-0 cursor-pointer flex items-center justify-center text-white text-sm font-medium transition-transform transform hover:scale-105"
                  style={{
                    background: formData.branding.launcher_color
                      ? `linear-gradient(135deg, ${formData.branding.launcher_color} 0%, ${formData.branding.launcher_color}dd 100%)`
                      : `linear-gradient(135deg, ${formData.branding.theme_color || '#3B82F6'} 0%, ${formData.branding.theme_color || '#3B82F6'}dd 100%)`,
                    boxShadow: '0 8px 22px rgba(0,0,0,.18)'
                  }}
                >
                  {formData.branding.launcher_video_url && formData.branding.launcher_video_url.trim() ? (
                    <video
                      src={formData.branding.launcher_video_url}
                      autoPlay
                      loop
                      muted
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : formData.branding.launcher_image_url && formData.branding.launcher_image_url.trim() ? (
                    <img
                      src={formData.branding.launcher_image_url}
                      alt="Launcher"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : formData.branding.launcher_svg_url && formData.branding.launcher_svg_url.trim() ? (
                    <img
                      src={formData.branding.launcher_svg_url}
                      alt="Launcher"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center"
                      style={{ color: formData.branding.launcher_icon_color || '#FFFFFF' }}
                    >
                      {formData.branding.launcher_text ? (
                        <span className="text-xs font-bold">
                          {formData.branding.launcher_text}
                        </span>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: formData.branding.launcher_icon_color || '#FFFFFF' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      )}
                    </div>
                  )}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Get Embed Code */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Get Embed Code</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Generate and copy embed code for this client's chatbot widget
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  ✨ Embed code includes launcher customization settings from above
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadEmbedCode}
                disabled={embedCodeLoading}
              >
                {embedCodeLoading ? 'Loading...' : 'Generate Embed Code'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {embedCodeError ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{embedCodeError}</p>
              </div>
            ) : embedCode ? (
              <div className="space-y-4">
                {/* Tab Selection */}
                <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  {[
                    { value: 'html', label: 'HTML/JavaScript', icon: '🌐' },
                    { value: 'react', label: 'React', icon: '⚛️' },
                    { value: 'vanilla', label: 'Vanilla JS', icon: '📝' },
                    { value: 'wordpress', label: 'WordPress', icon: '🔌' },
                    { value: 'iframe', label: 'iFrame', icon: '🖼️' },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveEmbedTab(tab.value)}
                      className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeEmbedTab === tab.value
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Embed Code Display */}
                <div className="relative">
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">
                      <code>{currentEmbedSnippet}</code>
                    </pre>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyEmbedCode()}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Code
                  </Button>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">How to use:</h4>
                  <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                    <li>Copy the {activeEmbedTab === 'html' ? 'HTML' : activeEmbedTab === 'iframe' ? 'iframe' : activeEmbedTab} code above</li>
                    <li>Paste it into your website's HTML where you want the chatbot to appear</li>
                    <li>The chatbot widget will automatically load on your website</li>
                    {activeEmbedTab === 'html' && (
                      <li>The loader script (<code>embed-snippet.js</code>) injects the iframe and button automatically</li>
                    )}
                    {activeEmbedTab === 'iframe' && (
                      <li>You can customize the iframe size and position using CSS</li>
                    )}
                    {activeEmbedTab === 'react' && (
                      <li>Import and use this component in your React app</li>
                    )}
                    {activeEmbedTab === 'wordpress' && (
                      <li>Add this code to your theme's functions.php file</li>
                    )}
                  </ol>
                </div>

                {/* Launcher Customization Info */}
                {(formData.branding?.launcher_color || formData.branding?.launcher_image_url || formData.branding?.launcher_video_url || formData.branding?.launcher_svg_url || formData.branding?.launcher_text) && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Launcher Customization Included
                    </h4>
                    <ul className="text-sm text-green-800 dark:text-green-300 space-y-1 list-disc list-inside">
                      {formData.branding?.launcher_color && (
                        <li>Launcher color: <code className="bg-green-100 px-1 rounded">{formData.branding.launcher_color}</code></li>
                      )}
                      {formData.branding?.launcher_text && (
                        <li>Launcher text: <code className="bg-green-100 px-1 rounded">{formData.branding.launcher_text}</code></li>
                      )}
                      {formData.branding?.launcher_image_url && (
                        <li>Launcher image included</li>
                      )}
                      {formData.branding?.launcher_video_url && (
                        <li>Launcher video included</li>
                      )}
                      {formData.branding?.launcher_svg_url && (
                        <li>Launcher SVG included</li>
                      )}
                      {formData.branding?.launcher_icon_color && formData.branding.launcher_icon_color !== '#FFFFFF' && (
                        <li>Icon color: <code className="bg-green-100 px-1 rounded">{formData.branding.launcher_icon_color}</code></li>
                      )}
                    </ul>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                      💡 These settings are automatically included in the embed code above
                    </p>
                  </div>
                )}

                {/* Client Info */}
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Client ID:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400 font-mono">{embedCode.client_id}</span>
                    </div>
                    {embedCode.embed_secret && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Embed Secret:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400 font-mono text-xs">{embedCode.embed_secret}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Embed Code Generated</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Click "Generate Embed Code" to create embed code for this client.
                </p>
                <Button
                  type="button"
                  onClick={loadEmbedCode}
                  disabled={embedCodeLoading}
                >
                  {embedCodeLoading ? 'Generating...' : 'Generate Embed Code'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Document Management</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Upload, view and manage client's documents
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchDocuments(documentsPage)}
                disabled={documentsLoading}
              >
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Upload Documents</h3>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <input
                  type="file"
                  id="document-upload"
                  multiple
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="document-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <svg
                    className="w-12 h-12 text-gray-400 mb-3"
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
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PDF, DOCX, DOC, TXT (Max 100MB per file)
                  </p>
                </label>
              </div>

              {/* Upload Queue */}
              {uploadQueue.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadQueue.map((upload) => (
                    <div
                      key={upload.id}
                      className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {upload.file.name}
                        </p>
                        <div className="mt-1">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                upload.status === 'completed'
                                  ? 'bg-green-500'
                                  : upload.status === 'failed'
                                  ? 'bg-red-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${upload.progress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {upload.status === 'queued' && 'Queued...'}
                              {upload.status === 'uploading' && `${upload.progress}%`}
                              {upload.status === 'completed' && 'Completed'}
                              {upload.status === 'processing' && 'Processing...'}
                              {upload.status === 'failed' && 'Failed'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatBytes(upload.file.size)}
                            </span>
                          </div>
                          {upload.error && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{upload.error}</p>
                          )}
                        </div>
                      </div>
                      {upload.status === 'failed' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUploadQueue((q) => q.filter((u) => u.id !== upload.id));
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents List */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Uploaded Documents</h3>
            {documentsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="w-8 h-8" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            ) : documents.length > 0 ? (
              <div className="space-y-4">
                <div className="shadow ring-1 ring-black ring-opacity-5 rounded-lg overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[300px]">Document</TableHead>
                        <TableHead className="min-w-[100px]">Size</TableHead>
                        <TableHead className="min-w-[80px]">Pages</TableHead>
                        <TableHead className="min-w-[180px]">Uploaded</TableHead>
                        <TableHead className="min-w-[120px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => {
                        const docId = doc._id || doc.id;
                        return (
                          <TableRow key={docId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <TableCell className="min-w-[300px]">
                              <div className="flex items-center space-x-3">
                                <svg className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <div className="min-w-0 flex-1">
                                  <p 
                                    className="font-medium text-gray-900 dark:text-white truncate" 
                                    title={doc.filename}
                                  >
                                    {getCleanFilename(doc.filename)}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">Document</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[100px] text-gray-900 dark:text-white">
                              {formatBytes(doc?.metadata?.size)}
                            </TableCell>
                            <TableCell className="min-w-[80px] text-gray-900 dark:text-white">
                              {doc?.metadata?.pages ?? '-'}
                            </TableCell>
                            <TableCell className="min-w-[180px]">
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : '-'}
                              </span>
                            </TableCell>
                            <TableCell className="min-w-[120px]">
                              <Badge variant={getStatusVariant(doc.status)}>
                                {doc.status || 'Unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell className="min-w-[120px]">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteDocument(doc)}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination */}
                {documentsTotal > 10 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {((documentsPage - 1) * 10) + 1} to {Math.min(documentsPage * 10, documentsTotal)} of {documentsTotal} documents
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchDocuments(documentsPage - 1)}
                        disabled={documentsPage === 1 || documentsLoading}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchDocuments(documentsPage + 1)}
                        disabled={documentsPage * 10 >= documentsTotal || documentsLoading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No documents found</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  This client hasn't uploaded any documents yet.
                </p>
              </div>
            )}
            </div>
          </CardContent>
        </Card>

        {/* Delete Document Modal */}
        <Modal
          isOpen={deleteModal.isOpen}
          onClose={() => !deleteModal.isDeleting && setDeleteModal({ isOpen: false, document: null, isDeleting: false })}
          title="Delete Document"
        >
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{deleteModal.document ? getCleanFilename(deleteModal.document.filename) : ''}</strong>?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This action cannot be undone. The document will be permanently removed from the client's knowledge base.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteModal({ isOpen: false, document: null, isDeleting: false })}
                disabled={deleteModal.isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={confirmDeleteDocument}
                disabled={deleteModal.isDeleting}
                loading={deleteModal.isDeleting}
              >
                {deleteModal.isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Update Client'}
          </Button>
        </div>
      </form>

      {/* Admin Change Username and Existing Password - Separate form outside main form */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Change Username and Existing Password</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Update the client user's login credentials. Leave password empty to keep the existing password.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Username"
                name="username"
                value={userCredentials.username}
                onChange={(e) => setUserCredentials(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
                required={!userCredentials.hasUser}
              />
              <Input
                label="Password"
                name="password"
                type="password"
                value={userCredentials.password}
                onChange={(e) => setUserCredentials(prev => ({ ...prev, password: e.target.value }))}
                placeholder={userCredentials.hasUser ? "Leave empty to keep existing password" : "Enter password"}
                required={!userCredentials.hasUser}
              />
            </div>
            {userCredentials.hasUser && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ℹ️ Username is auto-filled from existing user. Leave password empty to keep the current password.
              </p>
            )}
            {!userCredentials.hasUser && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                ℹ️ No user exists for this client. Both username and password are required to create a new user.
              </p>
            )}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSavingCredentials}
              >
                {isSavingCredentials ? 'Saving...' : 'Update Credentials'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditClient;
