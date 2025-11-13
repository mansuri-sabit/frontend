import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';

// Avatar generation utilities
const generateUserAvatar = (userId, availableAvatars = []) => {
  // Create a simple hash from userId for consistent avatar generation
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo for consistent results
  const seed = Math.abs(hash);
  
  // Color schemes for avatars
  const colorSchemes = [
    { bg: 'from-blue-500 to-blue-600', text: 'text-white' },
    { bg: 'from-green-500 to-green-600', text: 'text-white' },
    { bg: 'from-purple-500 to-purple-600', text: 'text-white' },
    { bg: 'from-pink-500 to-pink-600', text: 'text-white' },
    { bg: 'from-indigo-500 to-indigo-600', text: 'text-white' },
    { bg: 'from-red-500 to-red-600', text: 'text-white' },
    { bg: 'from-yellow-500 to-yellow-600', text: 'text-white' },
    { bg: 'from-teal-500 to-teal-600', text: 'text-white' },
  ];
  
  // Use available avatars or fallback to defaults
  const avatars = availableAvatars.length > 0 ? availableAvatars : [
    { id: 'default-1', name: 'Person 1', category: 'people', type: 'svg', content: '👤' },
    { id: 'default-2', name: 'Person 2', category: 'people', type: 'svg', content: '👤' },
    { id: 'default-3', name: 'Person 3', category: 'people', type: 'svg', content: '👤' },
    { id: 'default-4', name: 'Person 4', category: 'people', type: 'svg', content: '👤' },
    { id: 'default-5', name: 'Person 5', category: 'people', type: 'svg', content: '👤' },
    { id: 'default-6', name: 'Person 6', category: 'people', type: 'svg', content: '👤' },
  ];
  
  // Select avatar based on seed
  const avatarIndex = seed % avatars.length;
  const selectedAvatar = avatars[avatarIndex];
  const colorIndex = seed % colorSchemes.length;
  
  return {
    ...selectedAvatar,
    colors: colorSchemes[colorIndex],
    id: userId
  };
};

// Generate a simple user ID based on session or IP
const generateUserId = () => {
  // Try to get existing user ID from sessionStorage
  let userId = sessionStorage.getItem('chatbot_user_id');
  
  if (!userId) {
    // Generate a new user ID based on timestamp and random number
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('chatbot_user_id', userId);
  }
  
  return userId;
};


const ChatInterface = () => {
  const user = { name: 'Guest', username: 'guest' };
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  const qs = useMemo(() => {
    return {
      theme: (searchParams.get('theme') || 'light').toLowerCase(),
      secret: searchParams.get('secret') || searchParams.get('embed_secret') || '',
      preview: searchParams.get('preview') === 'true',
    };
  }, [searchParams]);

  // Refs
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  // State
  const [branding, setBranding] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMessage, setCurrentMessage] = useState('');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [showPreQuestions, setShowPreQuestions] = useState(true);
  const [conversation, setConversation] = useState([]);
  
  // User avatar state
  const [userAvatar, setUserAvatar] = useState(null);
  const [availableAvatars, setAvailableAvatars] = useState([]);

  // Domain authorization state
  const [isDomainAuthorized, setIsDomainAuthorized] = useState(true);
  const [domainError, setDomainError] = useState(null);
  const [domainSettings, setDomainSettings] = useState(null);
  
  // Expand/Collapse state
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Quote modal state
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteStep, setQuoteStep] = useState(1);
  const [isSendingProposal, setIsSendingProposal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  
  // Debug logging
  console.log('🔍 Domain Auth State:', { isDomainAuthorized, domainError, domainSettings });

  // Parse messages from URL params
  const urlMessages = useMemo(() => {
    const messagesParam = searchParams.get('messages');
    if (messagesParam) {
      try {
        return JSON.parse(decodeURIComponent(messagesParam));
      } catch {
        return {};
      }
    }
    return {};
  }, [searchParams]);

  // Domain checking functions
  const getCurrentDomain = () => {
    try {
      // Get the current domain from window.location
      const hostname = window.location.hostname;
      // Remove www. prefix and normalize for comparison
      let domain = hostname.replace(/^www\./, '').toLowerCase();
      
      // Handle localhost vs 127.0.0.1
      if (domain === '127.0.0.1') {
        domain = 'localhost';
      }
      
      console.log('🌐 Normalized domain:', domain);
      return domain;
    } catch (error) {
      console.error('Error getting current domain:', error);
      return '';
    }
  };

  const checkDomainAuthorization = async () => {
    if (!clientId) return;

    try {
      console.log('🔍 Checking domain authorization for client:', clientId);
      
      // Get current domain
      const currentDomain = getCurrentDomain();
      console.log('🌐 Current domain:', currentDomain);

      // Fetch domain settings from backend
      const response = await apiClient.getClientDomains(clientId);
      console.log('📋 Domain settings:', response);

      setDomainSettings(response);

      // If domain authorization is not required, allow access
      if (!response.require_domain_auth) {
        console.log('🔓 Domain authorization not required');
        setIsDomainAuthorized(true);
        setDomainError(null);
        return;
      }

      // Check if current domain is authorized
      const isAuthorized = checkDomainAccess(currentDomain, response);
      console.log('✅ Domain authorized:', isAuthorized);

      if (!isAuthorized) {
        console.log('❌ Domain not authorized, showing popup');
        setIsDomainAuthorized(false);
        setDomainError('Domain not authorized for this client');
      } else {
        console.log('✅ Domain authorized, hiding popup');
        setIsDomainAuthorized(true);
        setDomainError(null);
      }
    } catch (error) {
      console.error('❌ Error checking domain authorization:', error);
      // On error, allow access but log the error
      setIsDomainAuthorized(true);
      setDomainError(null);
    }
  };

  const checkDomainAccess = (currentDomain, settings) => {
    if (!settings.require_domain_auth) return true;

    const { domain_mode, domain_whitelist, domain_blacklist } = settings;

    // Normalize domains for comparison
    const normalizeDomain = (domain) => {
      // Remove protocol and path
      let normalized = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      // Remove port
      normalized = normalized.split(':')[0];
      // Remove www prefix
      normalized = normalized.replace(/^www\./, '').toLowerCase();
      // Handle localhost vs 127.0.0.1
      if (normalized === '127.0.0.1') {
        normalized = 'localhost';
      }
      return normalized;
    };

    console.log('🔍 Checking domain access:', {
      currentDomain,
      domain_mode,
      whitelist: domain_whitelist,
      blacklist: domain_blacklist
    });

    if (domain_mode === 'whitelist') {
      // In whitelist mode, domain must be in whitelist
      const isAuthorized = domain_whitelist.some(domain => {
        const normalizedDomain = normalizeDomain(domain);
        const match = currentDomain === normalizedDomain || currentDomain.endsWith('.' + normalizedDomain);
        console.log(`🔍 Checking whitelist domain: ${domain} -> ${normalizedDomain} vs ${currentDomain} = ${match}`);
        return match;
      });
      console.log('✅ Whitelist check result:', isAuthorized);
      return isAuthorized;
    } else if (domain_mode === 'blacklist') {
      // In blacklist mode, domain must not be in blacklist
      const isBlocked = domain_blacklist.some(domain => {
        const normalizedDomain = normalizeDomain(domain);
        const match = currentDomain === normalizedDomain || currentDomain.endsWith('.' + normalizedDomain);
        console.log(`🔍 Checking blacklist domain: ${domain} -> ${normalizedDomain} vs ${currentDomain} = ${match}`);
        return match;
      });
      console.log('✅ Blacklist check result:', !isBlocked);
      return !isBlocked;
    }

    return true; // Default to allow if mode is not recognized
  };

  // Load available avatars
  useEffect(() => {
    const loadAvatars = async () => {
      try {
        const response = await apiClient.getAvatars();
        setAvailableAvatars(response.avatars || []);
      } catch (error) {
        console.warn('Failed to load avatars, using defaults:', error);
        // Use default avatars as fallback
        setAvailableAvatars([
          { id: 'default-1', name: 'Person 1', category: 'people', type: 'svg', content: '👤' },
          { id: 'default-2', name: 'Person 2', category: 'people', type: 'svg', content: '👨' },
          { id: 'default-3', name: 'Person 3', category: 'people', type: 'svg', content: '👩' },
          { id: 'default-4', name: 'Person 4', category: 'people', type: 'svg', content: '🧑' },
          { id: 'default-5', name: 'Person 5', category: 'people', type: 'svg', content: '👦' },
          { id: 'default-6', name: 'Person 6', category: 'people', type: 'svg', content: '👧' },
        ]);
      }
    };
    
    loadAvatars();
  }, []);

  // Check domain authorization on component load
  useEffect(() => {
    if (clientId) {
      checkDomainAuthorization();
    }
  }, [clientId]);

  // Initialize user avatar
  useEffect(() => {
    if (availableAvatars.length === 0) return;
    
    const userId = generateUserId();
    const avatar = generateUserAvatar(userId, availableAvatars);
    setUserAvatar(avatar);
    
    console.log('🎭 Generated user avatar:', { userId, avatar });
    
    // Listen for storage changes to detect new sessions
    const handleStorageChange = (e) => {
      if (e.key === 'chatbot_user_id' && e.newValue !== e.oldValue) {
        const newUserId = e.newValue;
        const newAvatar = generateUserAvatar(newUserId, availableAvatars);
        setUserAvatar(newAvatar);
        console.log('🎭 Updated user avatar:', { newUserId, newAvatar });
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [availableAvatars]);

  // Load branding and initialize
  useEffect(() => {
    let mounted = true;

    const loadBranding = async () => {
      try {
        setIsLoading(true);
        const brandingData = await apiClient.getPublicBranding(clientId, qs.secret);
        if (!mounted) return;

        const combinedBranding = {
          ...brandingData,
          welcome_message: urlMessages.welcome || brandingData?.welcome_message,
          pre_questions: urlMessages.preQuestions || brandingData?.pre_questions || []
        };

        setBranding(combinedBranding);
        applyBranding(combinedBranding, qs.theme);
        postToParent('widget-initialized', { 
          clientId, 
          branding: combinedBranding,
          user 
        });
      } catch (e) {
        console.error('Failed to load branding:', e);
        setError('Failed to load chat widget. Please try again later.');
        postToParent('widget-error', { error: e?.message || String(e) });
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (clientId) loadBranding();
    return () => { mounted = false; };
  }, [clientId, qs.theme, qs.secret, urlMessages]);

  // Listen for parent → iframe commands
  useEffect(() => {
    const onMessage = (event) => {
      const msg = event?.data;
      if (!msg || msg.type !== 'saas-chatbot-parent') return;
      const { action, data } = msg;
      if (action === 'send-message' && data?.message) {
        sendMessage(String(data.message));
      }
      if (action === 'widget-expanded') {
        setIsExpanded(data?.expanded || false);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Auto-resize parent container - DISABLED for fixed-height widget to prevent upward shifts
  // The widget container is always 100vh, so no dynamic resizing is needed
  // Content scrolls internally within the fixed-height container
  useEffect(() => {
    if (!containerRef.current) return;
    const target = containerRef.current;
    
    // Only send initial height once, don't listen for changes
    // This prevents the iframe from resizing and shifting upward when messages are sent
    const initialHeight = Math.ceil(target.getBoundingClientRect().height);
    if (initialHeight > 0) {
      // Send initial height only once on mount
      // Since container is 100vh, this height should remain constant
      postToParent('resize', { height: initialHeight });
    }
    
    // Don't observe for changes - container height is fixed at 100vh
    // This prevents upward shifting when messages are added
    return () => {
      // Cleanup not needed since we're not using ResizeObserver
    };
  }, []);



  // ✅ FIXED: Theming helpers with proper CSS variable setting
  const applyBranding = (brandingData, themeMode = 'light') => {
    const root = document.documentElement;
    document.body.style.backgroundColor = 'transparent';

    const color = brandingData?.theme_color || '#3B82F6';
    
    // Set primary color
    root.style.setProperty('--widget-primary-color', color);

    // ✅ FIXED: Properly extract RGB values
    const { r, g, b } = hexToRgb(color);
    root.style.setProperty('--widget-primary-rgb', `${r}, ${g}, ${b}`); // Note: comma-separated
    
    // Calculate lighter and darker shades
    const lighterRgb = lightenColor(r, g, b, 0.2);
    const darkerRgb = darkenColor(r, g, b, 0.2);
    
    root.style.setProperty('--widget-primary-light', lighterRgb);
    root.style.setProperty('--widget-primary-dark', darkerRgb);
    
    // Set gradient values
    root.style.setProperty('--widget-gradient-from', color);
    root.style.setProperty('--widget-gradient-to', `rgb(${lighterRgb})`);
    
    root.setAttribute('data-embed-theme', themeMode);

    if (brandingData?.custom_css) {
      const styleEl = document.createElement('style');
      styleEl.textContent = brandingData.custom_css;
      document.head.appendChild(styleEl);
    }
  };

  const normalizeResponse = (res) => {
    const reply = res?.reply ?? res?.message?.content ?? res?.message?.text ?? res?.text ?? res?.content ?? null;
    const tokens = res?.token_cost ?? res?.tokens_used ?? res?.usage?.tokens ?? 0;
    return { reply, tokens };
  };

  const sendMessage = async (message) => {
    if (!message.trim()) return;

    const ts = Date.now();
    const userMessage = {
      id: `msg_${ts}`,
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
    };

    setConversation((prev) => [...prev, userMessage]);
    setCurrentMessage('');
    setShowPreQuestions(false);
    setIsTyping(true);
    setTimeout(scrollToBottom, 80);

    try {
      console.log('📤 Sending message:', { clientId, message: message.trim(), sessionId });
      const response = await apiClient.sendPublicMessage(clientId, message.trim(), sessionId);
      console.log('📥 Received response:', response);
      
      const { reply, tokens } = normalizeResponse(response);
      console.log('📝 Normalized response:', { reply, tokens });

      if (!reply || reply.trim() === '') {
        console.warn('⚠️ Empty or null reply received from backend');
      }

      const aiMessage = {
        id: `msg_${ts + 1}`,
        role: 'assistant',
        content: reply || 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        tokens_used: tokens || 0,
        proposal_sent: response.proposal_sent || false,
        proposal_email: response.proposal_email || null,
      };

      console.log('💬 Adding AI message to conversation:', aiMessage);
      setConversation((prev) => [...prev, aiMessage]);
      
      // Show success notification if proposal was sent
      if (response.proposal_sent) {
        console.log('✅ Proposal automatically sent to:', response.proposal_email);
        // The confirmation message is already in the reply, but we can add a visual indicator
        postToParent('proposal-sent', { 
          email: response.proposal_email,
          automatic: true 
        });
      }
      postToParent('message-sent', {
        user_message: userMessage,
        ai_message: aiMessage,
        session_id: sessionId,
      });
    } catch (e) {
      console.error('❌ Failed to send message:', e);
      console.log('🔍 Error details:', {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
        fullError: e
      });
      
      // Check for client inactive error (new)
      const isClientInactive = e?.response?.status === 403 && 
                               (e?.response?.data?.error_code === 'client_inactive' || 
                                e?.message?.includes('not active'));
      
      if (isClientInactive) {
        const errorMsg = e?.response?.data?.message || 'This client account is not active';
        console.log('🚫 Client inactive error detected');
        const errorMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: errorMsg,
          timestamp: new Date().toISOString(),
          error: true,
          clientInactive: true,
        };
        setConversation((prev) => [...prev, errorMessage]);
        postToParent('message-error', { error: errorMsg });
        return;
      }
      
      // Check for 403 error in multiple ways (domain authorization)
      const is403Error = e?.response?.status === 403 || 
                        e?.message?.includes('403') || 
                        e?.message?.includes('Forbidden');
      
      if (is403Error) {
        console.log('🚫 403 Error detected, showing domain error popup');
        setDomainError('Domain not authorized for this client');
        return;
      }
      
      // Also check for domain authorization in error message
      if (e?.message?.includes('Domain not authorized') || 
          e?.message?.includes('not authorized')) {
        console.log('🚫 Domain authorization error in message, showing popup');
        setDomainError('Domain not authorized for this client');
        return;
      }
      
      const errorMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: 'I\'m having trouble connecting right now. Please try again in a moment.',
        timestamp: new Date().toISOString(),
        error: true,
      };
      setConversation((prev) => [...prev, errorMessage]);
      postToParent('message-error', { error: e?.message || String(e) });
    } finally {
      // Always reset typing state, even if there was an error
      setIsTyping(false);
      setTimeout(scrollToBottom, 80);
    }
  };

  const handlePreQuestionClick = (q) => sendMessage(q);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentMessage.trim() && !isTyping) sendMessage(currentMessage);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const postToParent = (action, data) => {
    try {
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'saas-chatbot-embed',
            action,
            clientId,
            sessionId,
            data,
          },
          '*'
        );
      }
    } catch {
      // ignore
    }
  };

  // Expand/Collapse functions
  const handleExpand = () => {
    setIsExpanded(true);
    setShowDropdown(false);
    postToParent('widget-expanded', { expanded: true });
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setShowDropdown(false);
    postToParent('widget-expanded', { expanded: false });
  };

  const handleGetQuote = () => {
    setShowDropdown(false);
    // First expand the widget if it's collapsed
    if (!isExpanded) {
      setIsExpanded(true);
      postToParent('widget-expanded', { expanded: true });
    }
    // Then show the quote modal
    setShowQuoteModal(true);
    setQuoteStep(1);
    postToParent('get-quote', {});
  };

  const handleCloseQuoteModal = () => {
    setShowQuoteModal(false);
    setQuoteStep(1);
    setIsSendingProposal(false);
    setUserEmail('');
  };

  // Email validation
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendProposal = async () => {
    // Validate email before sending
    if (!userEmail || !isValidEmail(userEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    setIsSendingProposal(true);
    try {
      await apiClient.sendQuoteProposal(clientId, {
        companyName: branding?.name || 'Company',
        companyDescription: branding?.description || '',
        clientEmail: userEmail, // Use user's email
      });
      
      // Switch to confirmation step after successful send
      setIsSendingProposal(false);
      setQuoteStep(2); // Switch to Step 2: Confirmation
      postToParent('proposal-sent', {});
    } catch (error) {
      console.error('Failed to send proposal:', error);
      alert('Failed to send proposal. Please try again.');
      setIsSendingProposal(false);
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.relative')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);


  // ✅ FIXED: Proper RGB extraction
  const hexToRgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m ? {
      r: parseInt(m[1], 16),
      g: parseInt(m[2], 16), // ✅ Fixed: was m[1]
      b: parseInt(m[3], 16)  // ✅ Fixed: was m[2]
    } : { r: 59, g: 130, b: 246 };
  };

  // ✅ FIXED: Return RGB string format
  const lightenColor = (r, g, b, t) => {
    const newR = Math.round(r + (255 - r) * t);
    const newG = Math.round(g + (255 - g) * t);
    const newB = Math.round(b + (255 - b) * t);
    return `${newR}, ${newG}, ${newB}`;
  };

  const darkenColor = (r, g, b, t) => {
    const newR = Math.round(r * (1 - t));
    const newG = Math.round(g * (1 - t));
    const newB = Math.round(b * (1 - t));
    return `${newR}, ${newG}, ${newB}`;
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Function to parse markdown bold syntax (**text**) into HTML <strong> tags
  const parseMarkdownBold = (text) => {
    if (!text) return text;
    
    // Convert **text** to <strong>text</strong>
    return text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  };

  // Function to regenerate user avatar (useful for testing)
  const regenerateUserAvatar = () => {
    const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('chatbot_user_id', newUserId);
    const newAvatar = generateUserAvatar(newUserId);
    setUserAvatar(newAvatar);
    console.log('🎭 Regenerated user avatar:', { newUserId, newAvatar });
  };

  // ✅ Compute dynamic styles using CSS variables
  const themeStyles = useMemo(() => ({
    headerGradient: `linear-gradient(135deg, var(--widget-primary-color, #3B82F6) 0%, rgba(var(--widget-primary-rgb, 59, 130, 246), 0.85) 100%)`,
    avatarGradient: `linear-gradient(135deg, var(--widget-primary-color, #3B82F6), rgba(var(--widget-primary-rgb, 59, 130, 246), 0.8))`,
    userMessageBg: `linear-gradient(135deg, var(--widget-primary-color, #3B82F6), rgba(var(--widget-primary-rgb, 59, 130, 246), 0.9))`,
    sendButtonBg: `linear-gradient(135deg, var(--widget-primary-color, #3B82F6), rgba(var(--widget-primary-rgb, 59, 130, 246), 0.9))`,
    linkColor: 'var(--widget-primary-color, #3B82F6)'
  }), []);

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <Spinner size="lg" className="mb-4" />
            <div className="absolute inset-0 blur-xl opacity-30" 
                 style={{ backgroundColor: themeStyles.linkColor }} />
          </div>
          <p className="text-gray-600 font-medium">Loading your chat...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4 min-h-[400px] bg-gradient-to-br from-red-50 to-gray-50">
        <div className="text-center glass-card p-8 rounded-2xl max-w-sm animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-red-700 text-sm font-medium mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* CSS Animations */}
      <style>
        {`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0; 
            transform: translateY(20px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        @keyframes dropdownSlideIn {
          from { 
            opacity: 0; 
            transform: translateY(-10px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
          .animate-fade-in {
            animation: fadeIn 0.3s ease-out;
          }
          .animate-slide-up {
            animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
        `}
      </style>
      
      <div 
        ref={containerRef} 
        className="flex rounded-1xl flex-col widget-container overflow-hidden shadow-2xl relative"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          background: 'rgba(255, 255, 255, 0.95)',
          height: '100vh',
          maxHeight: '100vh',
          minHeight: '100vh',
          width: '100%',
          margin: 0,
          padding: 0,
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >


      {/* Error Popup */}
      {domainError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md mx-4 p-0 overflow-hidden animate-slide-up">
            {/* Header with theme colors */}
            <div 
              className="px-6 py-4 text-white relative"
              style={{ 
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3)'
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold">Access Denied</h3>
                  <p className="text-red-100 text-sm">Domain Authorization Error</p>
                </div>
              </div>
              <button
                onClick={() => setDomainError(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all duration-200"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Error Message */}
              <div className="mb-6">
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-red-800">Domain Not Authorized</h4>
                      <p className="mt-1 text-sm text-red-700">
                        {domainError || 'This domain is not authorized to use this chat widget.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Domain Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Domain Information
                </h5>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Current Domain:</span>
                    <span className="font-mono bg-white px-3 py-1 rounded-md text-red-600 border border-red-200 text-xs">
                      {getCurrentDomain()}
                    </span>
                  </div>
                  {domainSettings && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Authorization Mode:</span>
                        <span className="px-2 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800">
                          {domainSettings.domain_mode || 'whitelist'}
                        </span>
                      </div>
                      {domainSettings.domain_mode === 'whitelist' && domainSettings.domain_whitelist.length > 0 && (
                        <div>
                          <span className="text-gray-600 block mb-2">Allowed Domains:</span>
                          <div className="space-y-1">
                            {domainSettings.domain_whitelist.map((domain, index) => (
                              <div key={index} className="font-mono text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200">
                                {domain}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setDomainError(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setDomainError(null);
                    // Refresh the page to retry
                    window.location.reload();
                  }}
                  className="flex-1 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 hover:shadow-lg"
                  style={{ 
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  Retry
                </button>
              </div>

              {/* Contact Info */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  Need access? Contact the website administrator.
                </p>
              </div>
              
            </div>
          </div>
        </div>
      )}
      {/* HEADER - Using CSS variables properly */}
      <div
        className={`sticky top-0 z-20 flex items-center rounded-lg justify-between px-5 py-4 backdrop-blur-xl flex-shrink-0 shadow-sm ${!isDomainAuthorized ? 'blur-sm opacity-50' : ''}`}
        style={{ 
          background: themeStyles.headerGradient,
          position: 'sticky',
          top: 0,
          isolation: 'isolate',
          transform: 'translateZ(0)',
          willChange: 'transform'
        }}
      >
        <div className="flex items-center min-w-0 flex-1 space-x-3">
          {branding?.logo_url ? (
            <div className="relative">
              <img 
                src={branding.logo_url} 
                alt="Logo" 
                className="w-10 h-10 rounded-xl object-cover shadow-lg ring-2 ring-white ring-opacity-30"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
            </div>
          ) : (
            <div className="relative w-10 h-10 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg ring-2 ring-white ring-opacity-20">
              <span className="text-base font-bold text-white">{branding?.name?.[0] || 'C'}</span>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-white truncate">{branding?.name || 'Chat Support'}</h3>
            <div className="flex items-center space-x-1 text-xs text-white text-opacity-90">
              {/* Typing indicator commented out - always show Online */}
              {/* {isTyping ? (
                <>
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="ml-1 text-xs">Typing</span>
                </>
              ) : (
                <span>Online</span>
              )} */}
              <span>Online</span>
            </div>
          </div>
        </div>

        {/* 3-Dot Menu */}
        <div className="relative">
          <button
            onClick={toggleDropdown}
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-10 transition-all duration-300 focus:outline-none group"
            aria-label="Widget options"
            style={{
              backgroundColor: showDropdown ? 'rgba(255, 255, 255, 0.15)' : 'transparent'
            }}
          >
            <svg 
              className="w-5 h-5 text-white transition-all duration-300 group-hover:scale-110" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 overflow-hidden"
                 style={{
                   animation: 'dropdownSlideIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                   backdropFilter: 'blur(10px)',
                   background: 'rgba(255, 255, 255, 0.95)',
                   boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                 }}>
              <button
                onClick={isExpanded ? handleCollapse : handleExpand}
                className="w-full px-4 py-3 text-left text-sm text-gray-700 flex items-center space-x-3"
                style={{
                  borderRadius: '8px',
                  margin: '4px 8px'
                }}
              >
                {isExpanded ? (
                  <>
                    <div className="w-5 h-5 flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9v4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15v-4.5M15 15h4.5M15 15l5.5 5.5" />
                      </svg>
                    </div>
                    <span className="font-medium">Collapse Window</span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </div>
                    <span className="font-medium">Expand Window</span>
                  </>
                )}
              </button>
              
              {/* Get Quote button */}
              <button
                onClick={handleGetQuote}
                className="w-full px-4 py-3 text-left text-sm text-gray-700 flex items-center space-x-3"
                style={{
                  borderRadius: '8px',
                  margin: '4px 8px'
                }}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="font-medium">Get Quote</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Chat Content */}
      <div 
        className={`flex-1 overflow-y-auto p-6 min-h-0 messages-container ${!isDomainAuthorized ? 'blur-sm opacity-50' : ''}`}
        aria-live="polite"
        style={{ 
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #f1f5f9 100%)',
          height: '100%',
          maxHeight: '100%',
          backgroundColor: '#f8fafc',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
            {/* Welcome Message */}
            {conversation.length === 0 && (
              <div className="flex items-end space-x-3 animate-slide-up mb-6">
                <div className="flex-shrink-0 mb-1">
                  {branding?.logo_url ? (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white ring-opacity-20 overflow-hidden relative">
                      <img 
                        src={branding.logo_url} 
                        alt="Bot Avatar" 
                        className="w-full h-full object-cover absolute inset-0"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div 
                        className="w-full h-full flex items-center justify-center text-white font-semibold text-sm absolute inset-0"
                        style={{ 
                          background: themeStyles.avatarGradient,
                          display: 'none'
                        }}
                      >
                        {branding?.name?.[0] || 'A'}
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-white font-semibold text-sm ring-2 ring-white ring-opacity-20"
                      style={{ background: themeStyles.avatarGradient }}
                    >
                      {branding?.name?.[0] || 'A'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col items-start">
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3 shadow-lg transition-shadow duration-200" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <p className="text-sm text-gray-800 leading-relaxed">
                      {branding?.welcome_message || 'Hello! How can I help you today?'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 px-1 text-left">{formatTime(new Date().toISOString())}</p>
                </div>
              </div>
            )}

            {/* Suggested Questions */}
            {showPreQuestions && branding?.pre_questions?.length > 0 && conversation.length === 0 && (
              <div className="space-y-2.5 animate-slide-up" style={{ animationDelay: '100ms' }}>
                <p className="text-xs font-medium text-gray-500 px-1">Suggested questions:</p>
                <div className="flex flex-col gap-2">
                  {branding.pre_questions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handlePreQuestionClick(q)}
                      disabled={isTyping}
                      className="group px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:text-gray-900 transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center space-x-1.5">
                        <span>{q}</span>
                        <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {conversation.map((m, idx) => (
              <div
                key={m.id}
                className={`flex items-end space-x-3 animate-slide-up mb-6 ${
                  m.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Bot Avatar */}
                {m.role === 'assistant' && (
                  <div className="flex-shrink-0 mb-1">
                    {branding?.logo_url ? (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white ring-opacity-20 overflow-hidden relative">
                        <img 
                          src={branding.logo_url} 
                          alt="Bot Avatar" 
                          className="w-full h-full object-cover absolute inset-0"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div 
                          className="w-full h-full flex items-center justify-center text-white font-semibold text-sm absolute inset-0"
                          style={{ 
                            background: themeStyles.avatarGradient,
                            display: 'none'
                          }}
                        >
                          {branding?.name?.[0] || 'A'}
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-white font-semibold text-sm ring-2 ring-white ring-opacity-20"
                        style={{ background: themeStyles.avatarGradient }}
                      >
                        {branding?.name?.[0] || 'A'}
                      </div>
                    )}
                  </div>
                )}

                {/* User Avatar */}
                {m.role === 'user' && userAvatar && (
                  <div className="flex-shrink-0 mb-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br ${userAvatar.colors.bg} ${userAvatar.colors.text} text-lg ring-2 ring-white ring-opacity-20`}>
                      {userAvatar.type === 'image' && userAvatar.url ? (
                        <img 
                          src={userAvatar.url} 
                          alt={userAvatar.name}
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-full h-full rounded-full flex items-center justify-center ${userAvatar.type === 'image' && userAvatar.url ? 'hidden' : 'flex'}`}
                        style={{ display: userAvatar.type === 'image' && userAvatar.url ? 'none' : 'flex' }}
                      >
                        <span>{userAvatar.content || userAvatar.name?.[0] || '?'}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className={`flex-1 max-w-[75%] ${m.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 shadow-lg transition-all duration-200 ${
                      m.role === 'user'
                        ? 'rounded-br-md text-white'
                        : m.clientInactive
                        ? 'bg-red-50 border-2 border-red-300 text-red-700 rounded-tl-md font-medium'
                        : m.error
                        ? 'bg-red-50 border border-red-200 text-red-800 rounded-tl-md'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-md'
                    }`}
                    style={m.role === 'user' ? { 
                      background: themeStyles.userMessageBg,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    } : m.clientInactive ? {
                      boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
                    } : {
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    {m.role === 'assistant' ? (
                      <>
                        <p 
                          className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                          dangerouslySetInnerHTML={{ __html: parseMarkdownBold(m.content) }}
                        />
                        {m.proposal_sent && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center space-x-2 text-xs text-green-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="font-medium">Proposal sent to {m.proposal_email}</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <p className={`text-xs text-gray-400 mt-2 px-1 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {formatTime(m.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-end space-x-3 animate-slide-up mb-6">
                <div className="flex-shrink-0 mb-1">
                  {branding?.logo_url ? (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white ring-opacity-20 overflow-hidden relative">
                      <img 
                        src={branding.logo_url} 
                        alt="Bot Avatar" 
                        className="w-full h-full object-cover absolute inset-0"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div 
                        className="w-full h-full flex items-center justify-center text-white font-semibold text-sm absolute inset-0"
                        style={{ 
                          background: themeStyles.avatarGradient,
                          display: 'none'
                        }}
                      >
                        {branding?.name?.[0] || 'A'}
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-white font-semibold text-sm ring-2 ring-white ring-opacity-20"
                      style={{ background: themeStyles.avatarGradient }}
                    >
                      {branding?.name?.[0] || 'A'}
                    </div>
                  )}
                </div>
                <div className="typing-indicator-bubble bg-white border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3 shadow-lg" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 rounded-full animate-bounce typing-dot" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full animate-bounce typing-dot" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full animate-bounce typing-dot" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className={`flex-shrink-0 border-t border-gray-100 bg-gradient-to-r from-white to-gray-50 ${!isDomainAuthorized ? 'blur-sm opacity-50' : ''}`}>
        <div className="p-4">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center bg-white dark:bg-gray-900 rounded-2xl px-4 py-3 shadow-lg hover:shadow-xl transition-all duration-300 focus-within:shadow-xl">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isTyping || !isDomainAuthorized}
                className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none placeholder:text-gray-400 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 border-0 outline-none"
                aria-label="Type your message"
                maxLength={2000}
              />
              
              {currentMessage.length > 1800 && (
                <div className="text-xs font-medium mr-3 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700" 
                     style={{ color: currentMessage.length > 1950 ? '#EF4444' : '#6B7280' }}>
                  {currentMessage.length}/2000
                </div>
              )}
              
              <button
                type="submit"
                disabled={!currentMessage.trim() || isTyping || !isDomainAuthorized}
                className={`relative p-3 rounded-full text-white transition-all duration-300 transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100 group ${currentMessage.trim() ? 'opacity-100 scale-100' : 'opacity-100 scale-100'}`}
                style={{ 
                  background: themeStyles.sendButtonBg,
                  boxShadow: 'none'
                }}
                aria-label={isTyping ? 'Sending...' : 'Send message'}
              >
                {isTyping ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <div className="relative">
                    <svg
                      className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    {/* Subtle glow effect */}
                    <div className="absolute inset-0 rounded-full bg-white opacity-20 blur-sm group-hover:opacity-30 transition-opacity duration-200"></div>
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Powered By Footer */}
        {branding?.show_powered_by === true && (
          <div className="px-4 pb-3">
            <div className="text-center py-2">
              <p className="text-xs text-gray-400">
                Powered by{' '}
                <a
                  href={window.location.origin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline transition-colors duration-200"
                  style={{ color: themeStyles.linkColor }}
                >
                  SaaS Chatbot
                </a>
              </p>
            </div>
          </div>
        )} 

        {/* Quote Modal */}
        {showQuoteModal && (
          <div 
            className="absolute inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              minHeight: '100%'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseQuoteModal();
              }
            }}
          >
            <div 
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md my-auto overflow-hidden relative max-h-[95vh] flex flex-col"
              style={{
                animation: 'fadeIn 0.3s ease-out',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Icon Button */}
              <button
                onClick={handleCloseQuoteModal}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-full transition-all duration-200 hover:bg-gray-100 focus:outline-none z-10"
                style={{
                  color: 'var(--widget-primary-color, #3B82F6)',
                }}
                aria-label="Close modal"
              >
                <svg 
                  className="w-4 h-4 sm:w-5 sm:h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{
                    strokeWidth: 2.5
                  }}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </button>

              {/* Progress Steps */}
              <div className="flex items-center justify-center p-3 sm:p-4 md:p-6 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center gap-y-2">
                  {/* Step 1 */}
                  <div className="flex items-center">
                    <div 
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm transition-all ${
                        quoteStep >= 1 ? 'text-white' : 'text-gray-400 bg-gray-100'
                      }`}
                      style={quoteStep >= 1 ? {
                        background: themeStyles.headerGradient
                      } : {}}
                    >
                      {quoteStep > 1 ? (
                        <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        '1'
                      )}
                    </div>
                    <span className={`ml-1 sm:ml-2 text-xs sm:text-sm font-medium ${quoteStep >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                      <span className="hidden sm:inline">Company </span>Info
                    </span>
                  </div>

                  {/* Connector */}
                  <div className={`w-6 sm:w-8 md:w-12 h-0.5 mx-1 sm:mx-2 transition-all ${quoteStep >= 2 ? 'bg-gray-400' : 'bg-gray-200'}`} />

                  {/* Step 2 */}
                  <div className="flex items-center">
                    <div 
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm transition-all ${
                        quoteStep >= 2 ? 'text-white' : 'text-gray-400 bg-gray-100'
                      }`}
                      style={quoteStep >= 2 ? {
                        background: themeStyles.headerGradient
                      } : {}}
                    >
                      2
                    </div>
                    <span className={`ml-1 sm:ml-2 text-xs sm:text-sm font-medium ${quoteStep >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
                      Confirmation
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="p-4 sm:p-5 md:p-6 overflow-y-auto flex-1">
                {quoteStep === 1 ? (
                  <>
                    {/* Company Description */}
                    <div className="mb-4 sm:mb-6">
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-4">{branding?.name || 'Our Company'}</h2>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-3 sm:mb-4">
                        {branding?.description || 'We are a leading company dedicated to providing exceptional services and solutions to our clients. Our team is committed to excellence and innovation in everything we do.'}
                      </p>
                    </div>

                    {/* Email Input Field */}
                    <div className="mb-4 sm:mb-6">
                      <label htmlFor="quote-email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        Your Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="quote-email"
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none transition-all duration-200"
                        style={{
                          borderColor: userEmail && !isValidEmail(userEmail) ? '#ef4444' : '#d1d5db',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--widget-primary-color, #3B82F6)';
                          e.target.style.boxShadow = '0 0 0 3px rgba(var(--widget-primary-rgb, 59, 130, 246), 0.1)';
                        }}
                        onBlur={(e) => {
                          if (userEmail && !isValidEmail(userEmail)) {
                            e.target.style.borderColor = '#ef4444';
                          } else {
                            e.target.style.borderColor = '#d1d5db';
                          }
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      {userEmail && !isValidEmail(userEmail) && (
                        <p className="mt-1 text-xs sm:text-sm text-red-600">Please enter a valid email address</p>
                      )}
                    </div>

                    {/* Send Proposal Button */}
                    <button
                      onClick={handleSendProposal}
                      disabled={isSendingProposal || !userEmail || !isValidEmail(userEmail)}
                      className="w-full py-2.5 sm:py-3 px-4 rounded-lg text-sm sm:text-base font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                      style={{
                        background: themeStyles.headerGradient,
                        boxShadow: '0 4px 15px rgba(var(--widget-primary-rgb, 59, 130, 246), 0.3)',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      {isSendingProposal ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </span>
                      ) : (
                        'Send Proposal'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Success Confirmation */}
                    <div className="text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full flex items-center justify-center" style={{
                        background: `linear-gradient(135deg, rgba(var(--widget-primary-rgb, 59, 130, 246), 0.1), rgba(var(--widget-primary-rgb, 59, 130, 246), 0.2))`
                      }}>
                        <svg className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: 'var(--widget-primary-color, #3B82F6)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Proposal Sent!</h2>
                      <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 px-2">
                        Thank you for your interest. We've received your request and will send you a detailed proposal via email shortly.
                      </p>
                      <button
                        onClick={handleCloseQuoteModal}
                        className="w-full py-2.5 sm:py-3 px-4 rounded-lg text-sm sm:text-base font-medium text-white transition-all duration-200 touch-manipulation"
                        style={{
                          background: themeStyles.headerGradient,
                          boxShadow: '0 4px 15px rgba(var(--widget-primary-rgb, 59, 130, 246), 0.3)',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
      </div>

      {/* CSS STYLES */}
      <style>{`
        html, body {
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          position: relative !important;
          z-index: 1 !important;
        }
        
        .widget-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          height: 100vh !important;
          max-height: 100vh !important;
          min-height: 100vh !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: rgba(255, 255, 255, 0.95);
          z-index: 999999 !important;
          position: relative;
          rounded-none !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        
        /* Ensure header stays fixed during resizes */
        .widget-container > div[class*="sticky"] {
          position: sticky !important;
          top: 0 !important;
          z-index: 20 !important;
          isolation: isolate;
          transform: translateZ(0);
          will-change: transform;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .messages-container {
          scroll-behavior: smooth;
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #f1f5f9 100%) !important;
          background-color: #f8fafc !important;
          flex: 1 1 0% !important;
          min-height: 0 !important;
          max-height: 100% !important;
          color: #1f2937 !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }
        
        /* Ensure no white background override */
        .messages-container * {
          background-color: transparent !important;
        }
        /* Ensure typing bubble stays visible despite the global override */
        .typing-indicator-bubble {
          background-color: #ffffff !important;
          border-color: rgba(0,0,0,0.06) !important;
        }
        /* Force dot visibility inside typing bubble - dynamic to theme color */
        .typing-indicator-bubble {
          border-color: rgba(var(--widget-primary-rgb, 59, 130, 246), 0.15) !important;
        }
        .typing-indicator-bubble .typing-dot {
          background-color: rgba(var(--widget-primary-rgb, 59, 130, 246), 1) !important;
          box-shadow:
            0 0 0 3px rgba(var(--widget-primary-rgb, 59, 130, 246), 0.12),
            0 0 8px rgba(var(--widget-primary-rgb, 59, 130, 246), 0.35);
        }

        .messages-container::-webkit-scrollbar {
          width: 6px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.3);
          border-radius: 10px;
        }

        .messages-container::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.5);
        }

        .widget-container button:not(:disabled):hover {
          transform: translateY(-1px);
        }

        .widget-container button:not(:disabled):active {
          transform: translateY(0);
        }

        .widget-container input:focus {
          outline: none;
          
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-8px);
          }
        }

        .animate-bounce {
          animation: bounce 1s ease-in-out infinite;
        }
        
        /* Ensure loaders stay below chat interface */
        [class*="loader"], [class*="spinner"], [id*="loader"], [id*="spinner"] {
          z-index: 1 !important;
        }
      `}</style>
      </div>
    </>
  );
};

const EmbedWidget = () => {
  return <ChatInterface />;
};

export { EmbedWidget };
export default EmbedWidget;
