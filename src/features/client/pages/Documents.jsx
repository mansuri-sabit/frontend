// src/features/client/pages/Documents.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Progress } from '../../../components/ui/Progress';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/Tabs';
import toast from '@/lib/toast';

const PAGE_SIZE = 10;

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function formatEta(seconds) {
  if (!seconds || seconds === Infinity) return '';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function getCleanFilename(filename) {
  if (!filename) return 'Unknown Document';
  
  // Extract just the filename without path
  const baseName = filename.split('/').pop().split('\\').pop();
  
  // Remove timestamp and hash prefix (format: YYYYMMDD_HHMMSS_hash_originalname.pdf)
  const timestampHashPattern = /^\d{8}_\d{6}_[a-f0-9]+_/;
  let cleaned = baseName.replace(timestampHashPattern, '');
  
  // Extract filename without extension
  const extension = cleaned.split('.').pop();
  const nameWithoutExt = cleaned.replace(/\.[^/.]+$/, '');
  
  // Truncate to only 4 characters from the beginning + extension
  const truncated = nameWithoutExt.substring(0, 4);
  
  return `${truncated}.${extension || 'pdf'}`;
}

// Clean AI conversational prefixes from extracted text
function cleanExtractedText(text) {
  if (!text || typeof text !== 'string') return text;
  
  const prefixes = [
    /^okay[,.]?\s+i\s+have\s+extracted\s+all\s+the\s+text\s+content\s+from\s+the\s+pdf\s+document[^.]*\./i,
    /^okay[,.]?\s+i\s+have\s+extracted[^.]*\./i,
    /^i\s+have\s+extracted\s+all\s+the\s+text\s+content[^.]*\./i,
    /^i\s+have\s+extracted[^.]*\./i,
    /^here\s+(is|'s)\s+the\s+extracted\s+text[^.]*\./i,
    /^the\s+extracted\s+text\s+(from\s+the\s+pdf|is\s+provided)[^.]*\./i,
    /^extracted\s+text[:\s]*/i,
    /^text\s+extracted[:\s]*/i,
    /^content\s+extracted[:\s]*/i,
    /maintaining\s+the\s+original\s+formatting[^.]*\./i,
    /the\s+extracted\s+text\s+is\s+provided\s+in\s+the\s+previous\s+responses[^.]*\./i,
    /(?:with\s+each\s+page'?s?\s+content\s+separated|divided\s+by\s+page)[^.]*\./i,
    /^below\s+is\s+the\s+extracted\s+text[^.]*\./i,
  ];
  
  let cleaned = text.trim();
  
  // Remove conversational prefixes
  for (const prefix of prefixes) {
    cleaned = cleaned.replace(prefix, '').trim();
  }
  
  // Remove common transition phrases
  const transitions = [
    /^[:.]\s*/,
    /^[.,]\s+the\s+/i,
    /^[.,]\s+here\s+/i,
    /^[.,]\s+below\s+/i,
    /^[.,]\s+following\s+/i,
    /^[.,]\s+maintaining\s+/i,
    /^[.,]\s+with\s+/i,
    /^[.,]\s+each\s+/i,
  ];
  
  for (const trans of transitions) {
    cleaned = cleaned.replace(trans, '').trim();
  }
  
  // If cleaned text is too short (likely only had conversational content), return original
  if (cleaned.length < 50 && text.length > 100) {
    // Try to find actual content after conversational prefix
    const contentMatch = text.match(/(?:\.|:)\s*(.+)/s);
    if (contentMatch && contentMatch[1] && contentMatch[1].length > 50) {
      return contentMatch[1].trim();
    }
    // If we can't find content, return original (user should see what's there)
    return text;
  }
  
  return cleaned || text;
}

const Documents = () => {

  // Upload queue
  const [queue, setQueue] = useState([]); // {id, file, progress, status, speed, eta, error}
  const xhrRefs = useRef({}); // for abort/cancel if you want later

  // History (server)
  const [history, setHistory] = useState([]); // [{ id, filename, metadata:{size,pages,processing_time}, uploaded_at }]
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // UI state
  const [dragActive, setDragActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Delete functionality state
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: 'single', // 'single' or 'bulk'
    document: null,
    documents: [],
    isDeleting: false,
  });
  const isDeletingRef = useRef(false); // Prevent duplicate delete calls

  // Document viewer state
  const [viewModal, setViewModal] = useState({
    isOpen: false,
    document: null,
    content: null,
    isLoading: false,
  });

  // Crawl viewer state
  const [crawlViewModal, setCrawlViewModal] = useState({
    isOpen: false,
    crawl: null,
    isLoading: false,
  });

  // Crawling state
  const [crawlMode, setCrawlMode] = useState('single'); // 'single' or 'bulk'
  const [crawlUrl, setCrawlUrl] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [bulkCrawlLoading, setBulkCrawlLoading] = useState(false);
  const [crawls, setCrawls] = useState([]);
  const [crawlPage, setCrawlPage] = useState(1);
  const [crawlTotal, setCrawlTotal] = useState(0);
  const [loadingCrawls, setLoadingCrawls] = useState(true);
  const [activeCrawls, setActiveCrawls] = useState(new Set());

  useEffect(() => {
    fetchHistory(1);
    fetchCrawls(1);
    // cleanup on unmount (cancel ongoing uploads)
    return () => {
      Object.values(xhrRefs.current).forEach((xhr) => {
        try { xhr.abort(); } catch {}
      });
    };
  }, []);

  async function fetchHistory(p = 1) {
    setLoadingHistory(true);
    try {
      // backend: GET /client/pdfs?page=&limit=
      const res = await apiClient.get('/client/pdfs', {
        params: { page: p, limit: PAGE_SIZE },
      });
      // shape from backend:
      // { pdfs, total, page, limit, total_pages }
      const pdfs = res?.pdfs || res?.data?.pdfs || [];
      const totalCount = res?.total ?? res?.data?.total ?? 0;

      setHistory(pdfs);
      setTotal(totalCount);
      setPage(p);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load documents');
    } finally {
      setLoadingHistory(false);
    }
  }

  // ========== DELETE FUNCTIONALITY ==========

  const handleDeleteSingle = (doc) => {
    setDeleteModal({
      isOpen: true,
      type: 'single',
      document: doc,
      documents: [],
      isDeleting: false,
    });
  };

  const handleDeleteBulk = () => {
    if (selectedDocs.size === 0) {
      toast.error('No documents selected');
      return;
    }
    
    const selectedDocuments = filteredHistory.filter(doc => 
      selectedDocs.has(doc._id || doc.id)
    );
    
    setDeleteModal({
      isOpen: true,
      type: 'bulk',
      document: null,
      documents: selectedDocuments,
      isDeleting: false,
    });
  };

  const confirmDelete = async () => {
    // Prevent duplicate calls
    if (isDeletingRef.current) {
      console.log('Delete already in progress, ignoring duplicate call');
      return;
    }
    
    isDeletingRef.current = true;
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    
    try {
      if (deleteModal.type === 'single') {
        const docId = deleteModal.document._id || deleteModal.document.id;
        const filename = deleteModal.document.filename;
        
        await apiClient.deleteUpload(docId);
        
        // Remove from history
        setHistory(prev => prev.filter(doc => 
          (doc._id || doc.id) !== docId
        ));
        
        toast.success(`"${filename}" deleted successfully`);
      } else {
        // Bulk delete
        const pdfIds = Array.from(selectedDocs);
        const count = pdfIds.length;
        const response = await apiClient.bulkDeleteUploads(pdfIds);
        
        // Remove deleted docs from history
        setHistory(prev => prev.filter(doc => 
          !selectedDocs.has(doc._id || doc.id)
        ));
        
        toast.success(`${response.deleted_count || count} documents deleted successfully`);
        setSelectedDocs(new Set());
      }
      
      // Update total count
      setTotal(prev => prev - (deleteModal.type === 'single' ? 1 : selectedDocs.size));
      
      setDeleteModal({ 
        isOpen: false, 
        type: 'single', 
        document: null, 
        documents: [], 
        isDeleting: false 
      });
      
    } catch (error) {
      console.error('Delete failed:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Delete operation failed';
      toast.error(`Failed to delete ${deleteModal.type === 'single' ? 'document' : 'documents'}: ${errorMessage}`);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    } finally {
      isDeletingRef.current = false;
    }
  };

  const toggleSelection = (docId) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  // Document viewer handlers
  const handleViewDocument = async (doc) => {
    const docId = doc._id || doc.id;
    
    // Open modal with loading state
    setViewModal({
      isOpen: true,
      document: doc,
      content: null,
      isLoading: true,
    });
    
    try {
      // First, try to find document with chunks from history (fast path)
      const docWithChunks = history.find(d => (d._id || d.id) === docId);
      
      // If chunks are available in history, use them
      if (docWithChunks?.content_chunks && Array.isArray(docWithChunks.content_chunks) && docWithChunks.content_chunks.length > 0) {
        // Clean chunks before displaying
        const cleanedChunks = docWithChunks.content_chunks.map(chunk => ({
          ...chunk,
          text: cleanExtractedText(chunk.text),
        }));
        
        setViewModal({
          isOpen: true,
          document: {
            ...docWithChunks,
            content_chunks: cleanedChunks,
          },
          content: null, // Will be displayed as chunks in UI
          isLoading: false,
        });
        return;
      }
      
      // If chunks not in history or document is completed, fetch full document from backend
      if (doc.status === 'completed' || !docWithChunks?.content_chunks || docWithChunks.content_chunks.length === 0) {
        try {
          const fullDoc = await apiClient.getUpload(docId);
          
          // Check if we got chunks
          if (fullDoc?.content_chunks && Array.isArray(fullDoc.content_chunks) && fullDoc.content_chunks.length > 0) {
            // Clean chunks before displaying
            const cleanedChunks = fullDoc.content_chunks.map(chunk => ({
              ...chunk,
              text: cleanExtractedText(chunk.text),
            }));
            
            setViewModal({
              isOpen: true,
              document: {
                ...fullDoc,
                _id: fullDoc.id || fullDoc._id,
                content_chunks: cleanedChunks,
              },
              content: null, // Will be displayed as chunks in UI
              isLoading: false,
            });
            return;
          }
        } catch (fetchError) {
          console.error('Failed to fetch full document:', fetchError);
          // Fall through to show metadata
        }
      }
      
      // If no chunks found, show metadata
      const displayDoc = docWithChunks || doc;
      let content = `Document: ${displayDoc.filename || displayDoc.original_name}\n\n`;
      content += `Status: ${displayDoc.status}\n`;
      content += `Size: ${formatBytes(displayDoc.metadata?.size || 0)}\n`;
      content += `Pages: ${displayDoc.metadata?.pages || 0}\n`;
      content += `Uploaded: ${new Date(displayDoc.uploaded_at || displayDoc.uploadedAt).toLocaleString()}\n\n`;
      
      if (displayDoc.status !== 'completed') {
        content += 'Document is still processing. Content will be available once processing completes.';
      } else {
        content += 'Content extraction completed, but chunks are not available. The document may need to be re-processed.';
      }
      
      setViewModal({
        isOpen: true,
        document: displayDoc,
        content: content,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to load document content');
      setViewModal({
        isOpen: true,
        document: doc,
        content: 'Error loading document content. Please try again.',
        isLoading: false,
      });
    }
  };

  const closeViewModal = () => {
    setViewModal({
      isOpen: false,
      document: null,
      content: null,
      isLoading: false,
    });
  };

  const selectAll = () => {
    if (selectedDocs.size === filteredHistory.length && filteredHistory.length > 0) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredHistory.map(doc => doc._id || doc.id)));
    }
  };

  // ========== EXISTING UPLOAD FUNCTIONALITY ==========

  // Drag & drop handlers
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
    if (files.length === 0) return;
    files.forEach(queueUpload);
  };

  const handleFileSelect = (e) => {
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'];
    const allFiles = Array.from(e.target.files || []);
    console.log('📁 Selected files:', allFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    const files = allFiles.filter((f) => {
      const fileName = f.name.toLowerCase();
      const lastDotIndex = fileName.lastIndexOf('.');
      const fileExtension = lastDotIndex >= 0 ? fileName.substring(lastDotIndex) : '';
      const isAllowedByExtension = fileExtension && allowedExtensions.includes(fileExtension);
      const isAllowedByType = f.type && allowedTypes.includes(f.type);
      const isAllowed = isAllowedByExtension || isAllowedByType;
      
      if (!isAllowed) {
        console.warn('❌ File rejected:', f.name, 'Extension:', fileExtension, 'Type:', f.type);
      } else {
        console.log('✅ File accepted:', f.name, 'Extension:', fileExtension, 'Type:', f.type);
      }
      
      return isAllowed;
    });
    
    if (files.length === 0 && allFiles.length > 0) {
      toast.error('No supported files selected. Supported: PDF, DOCX, DOC, TXT');
      return;
    }
    
    if (files.length === 0) return;
    files.forEach(queueUpload);
    e.target.value = '';
  };

  // Queue + start upload
  function queueUpload(file) {
    const id = crypto.randomUUID();
    console.log('📤 Queue upload:', file.name, id);
    const item = {
      id,
      file,
      progress: 0,
      status: 'queued', // queued | uploading | completed | failed
      speed: 0,
      eta: 0,
      error: '',
      startedAt: 0,
      loaded: 0,
    };
    setQueue((q) => [...q, item]);
    startUpload(id, file);
  }

  async function startUpload(id, file) {
    // Enhanced size guard (100MB limit) with clear error messages
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setQueue((q) => q.map((u) => (u.id === id ? { ...u, status: 'failed', error: `File exceeds 100MB limit (${formatBytes(file.size)})` } : u)));
      toast.error(`"${file.name}" exceeds the 100MB file size limit`);
      return;
    }

    // Validate file type more strictly
    // Check by extension first (more reliable than MIME type)
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'];
    const fileName = file.name.toLowerCase();
    const lastDotIndex = fileName.lastIndexOf('.');
    const fileExtension = lastDotIndex >= 0 ? fileName.substring(lastDotIndex) : '';
    const isAllowedByExtension = fileExtension && allowedExtensions.includes(fileExtension);
    const isAllowedByType = file.type && allowedTypes.includes(file.type);
    const isAllowed = isAllowedByExtension || isAllowedByType;
    
    if (!isAllowed) {
      setQueue((q) => q.map((u) => (u.id === id ? { ...u, status: 'failed', error: 'Only PDF, DOCX, DOC, and TXT files are allowed' } : u)));
      toast.error(`"${file.name}" is not a supported file type. Supported: PDF, DOCX, DOC, TXT`);
      return;
    }

    setQueue((q) => q.map((u) => (u.id === id ? { ...u, status: 'uploading', startedAt: Date.now(), loaded: 0, retryCount: 0 } : u)));

    // use uploadPDF function with robust error handling and retry mechanism
    // pass onUploadProgress for live progress with enhanced metrics
    try {
      const uploadOptions = {
        maxRetries: 3,
        retryDelay: 1000,
        retryCondition: (error) => {
          // Retry on network errors, timeouts, and server errors
          const isNetworkError = !error.response;
          const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
          const isServerError = error.response?.status >= 500;
          
          return isNetworkError || isTimeout || isServerError;
        }
      };

      const result = await apiClient.uploadPDF(file, (percentage, progressEvent, extra) => {
        if (!progressEvent.total) return;
        
        setQueue((q) => {
          return q.map((u) => {
            if (u.id !== id) return u;
            
            const now = Date.now();
            const dt = (now - (u.lastTick || now)) / 1000;
            const dBytes = progressEvent.loaded - (u.loaded || 0);
            const speed = dt > 0 ? dBytes / dt : u.speed || 0; // B/s
            
            const remaining = Math.max(progressEvent.total - progressEvent.loaded, 0);
            const eta = speed > 0 ? remaining / speed : Infinity;
            
            return {
              ...u,
              progress: percentage,
              loaded: progressEvent.loaded,
              lastTick: now,
              speed,
              eta,
              retryCount: extra?.retryCount || 0,
            };
          });
        });
      }, uploadOptions);

      const xhr = result;

      // Upload successful - check actual backend status
      const uploadResult = result;
      const backendStatus = uploadResult?.pdf?.status || uploadResult?.status || 'uploading';
      const backendProgress = uploadResult?.pdf?.progress || uploadResult?.progress || 100;
      const pdfId = uploadResult?.pdf?.id || uploadResult?.id;
      
      console.log('Upload response:', { uploadResult, backendStatus, backendProgress, pdfId });
      
      // Update queue with backend status
      setQueue((q) => q.map((u) => (u.id === id ? { 
        ...u, 
        progress: Math.min(backendProgress, 100), 
        status: backendStatus, 
        eta: 0,
        pdfId: pdfId, // Store PDF ID for status polling
        retryCount: 0, // Reset retry count on success
      } : u)));
      
      // Start polling for all non-completed statuses - polling logic will show appropriate toasts
      if (backendStatus === 'completed') {
        fetchHistory(1);
        // Auto-remove from queue after 3 seconds
        setTimeout(() => {
          setQueue((q) => q.filter(upload => upload.id !== id));
        }, 3000);
      } else if (pdfId) {
        startStatusPolling(id, pdfId);
      } else {
        console.warn('No PDF ID available for status polling');
        // Update queue to show as completed if no polling possible
        setTimeout(() => {
          setQueue((q) => q.map((u) => 
            u.id === id ? { ...u, status: 'completed', progress: 100 } : u
          ));
        }, 2000);
      }
      
      // Refresh history to show the new file
      fetchHistory(1);
    } catch (err) {
      console.error('Upload error:', err);
      
      // Enhanced error handling with specific messages
      let errorMessage = 'Upload failed';
      let retryAvailable = false;
      
      if (err.response) {
        const errorCode = err.response.data?.error_code;
        const errorDetail = err.response.data?.message || err.message;
        
        if (errorCode === 'file_too_large') {
          errorMessage = `File too large: ${errorDetail}`;
        } else if (errorCode === 'invalid_file' || errorCode === 'parse_error') {
          errorMessage = `Invalid or corrupted PDF: ${errorDetail}`;
        } else if (errorCode === 'ai_quota_exceeded') {
          errorMessage = `Processing service quota exceeded: ${errorDetail}`;
        } else if (errorCode === 'network_error' || errorCode === 'timeout') {
          errorMessage = `Network error: Upload timed out or connection failed`;
          retryAvailable = true;
        } else {
          errorMessage = errorDetail || err.message;
        }
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Upload timed out. Please check your connection and try again.';
        retryAvailable = true;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setQueue((q) => q.map((u) => (u.id === id ? { ...u, status: 'failed', error: errorMessage } : u)));
      
      // Show error toast with retry suggestion if applicable
      if (retryAvailable) {
        toast.error(`Upload failed: ${errorMessage}. Click retry to try again.`, {
          duration: 5000,
          icon: '⚠️',
        });
      } else {
        toast.error(`Failed to upload "${file.name}": ${errorMessage}`, {
          duration: 5000,
        });
      }
    }
  }

  function clearCompleted() {
    setQueue((q) => q.filter((u) => u.status !== 'completed' && u.status !== 'failed'));
  }

  // Status polling for processing PDFs
  const statusPollingRefs = useRef({});
  const uploadStatusRef = useRef({}); // Track previous status to prevent duplicate toasts
  const shownToastsRef = useRef({}); // Track which uploads have shown toasts to prevent duplicates

  function startStatusPolling(queueId, pdfId) {
    if (!pdfId) return;
    
    // Clear any existing polling for this upload
    if (statusPollingRefs.current[queueId]) {
      clearInterval(statusPollingRefs.current[queueId]);
    }

    const pollStatus = async () => {
      try {
        const response = await apiClient.get(`/client/pdfs/${pdfId}/status`);
        const { status, progress } = response;
        
        console.log('Status poll result:', { queueId, pdfId, status, progress });
        
        setQueue((q) => {
          const currentUpload = q.find(u => u.id === queueId);
          if (!currentUpload) {
            console.log('Upload not found in queue, stopping poll');
            clearInterval(statusPollingRefs.current[queueId]);
            delete statusPollingRefs.current[queueId];
            delete uploadStatusRef.current[queueId];
            return q;
          }
          
          const previousStatus = uploadStatusRef.current[queueId];
          const isFirstPoll = !previousStatus;
          const toastKey = `${queueId}-${status}`;
          const alreadyShown = shownToastsRef.current[toastKey];
          
          console.log('🔍 Poll:', { queueId, previousStatus, currentStatus: status, isFirstPoll, toastKey, alreadyShown, allShownKeys: Object.keys(shownToastsRef.current) });
          
          // Show toast on first poll or status changes (excluding duplicates)
          if ((isFirstPoll || previousStatus !== status) && !alreadyShown) {
            console.log('📢 Showing toast:', status, 'for file:', currentUpload.file.name);
            
            // Mark this toast as shown
            shownToastsRef.current[toastKey] = true;
            console.log('✅ Marked as shown:', toastKey, 'all keys:', Object.keys(shownToastsRef.current));
            
            if (status === 'pending') {
              toast.success(`Uploaded "${currentUpload.file.name}" - queued for processing`);
            } else if (status === 'processing') {
              toast.success(`"${currentUpload.file.name}" - processing in background`);
            } else if (status === 'completed') {
              toast.success(`"${currentUpload.file.name}" processing completed`);
              fetchHistory(1);
              setTimeout(() => {
                setQueue((q) => q.filter(upload => upload.id !== queueId));
              }, 3000);
            } else if (status === 'failed') {
              toast.error(`"${currentUpload.file.name}" processing failed`);
            }
          } else {
            console.log('⏭️ Skipping toast (duplicate)');
          }
          
          // Update status ref AFTER showing toasts
          uploadStatusRef.current[queueId] = status;
          
          const updatedQueue = q.map((u) => {
            if (u.id === queueId) {
              const updatedUpload = { ...u, status, progress: Math.min(progress || 0, 100) };
              return updatedUpload;
            }
            return u;
          });
          
          // If completed or failed, stop polling
          if (status === 'completed' || status === 'failed') {
            console.log('Stopping poll - status:', status);
            clearInterval(statusPollingRefs.current[queueId]);
            delete statusPollingRefs.current[queueId];
            delete uploadStatusRef.current[queueId];
            // Clean up shown toasts for this upload
            Object.keys(shownToastsRef.current).forEach(key => {
              if (key.startsWith(`${queueId}-`)) {
                delete shownToastsRef.current[key];
              }
            });
          }
          
          return updatedQueue;
        });
      } catch (error) {
        console.error('Status polling error:', error);
        // Stop polling on error
        clearInterval(statusPollingRefs.current[queueId]);
        delete statusPollingRefs.current[queueId];
        delete uploadStatusRef.current[queueId];
        // Clean up shown toasts for this upload
        Object.keys(shownToastsRef.current).forEach(key => {
          if (key.startsWith(`${queueId}-`)) {
            delete shownToastsRef.current[key];
          }
        });
      }
    };

    // Poll every 2 seconds (starts immediately, then continues on interval)
    // Use setTimeout for first poll to avoid duplicate execution
    pollStatus();
    statusPollingRefs.current[queueId] = setInterval(pollStatus, 2000);
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      Object.values(statusPollingRefs.current).forEach(clearInterval);
    };
  }, []);

  // Derived UI
  const filteredHistory = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    if (!s) return history;
    return history.filter((h) => (h.filename || '').toLowerCase().includes(s));
  }, [history, searchTerm]);

  const stats = useMemo(() => {
    const uploading = queue.filter((u) => u.status === 'uploading').length;
    const completedToday = history.filter((h) => {
      const d = new Date(h.uploaded_at || h.uploadedAt || h.created_at || h.createdAt);
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }).length;
    const totalSize = (history || []).reduce((sum, h) => sum + (h?.metadata?.size || 0), 0);
    return {
      historicalTotal: total,
      uploading,
      completedToday,
      totalSize,
    };
  }, [queue, history, total]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ========== CRAWLING FUNCTIONS ==========
  async function fetchCrawls(p = 1) {
    setLoadingCrawls(true);
    try {
      const res = await apiClient.get('/client/crawls', {
        params: { page: p, limit: PAGE_SIZE },
      });
      const crawlList = res?.crawls || res?.data?.crawls || [];
      const totalCount = res?.total ?? res?.data?.total ?? 0;
      setCrawls(crawlList);
      setCrawlTotal(totalCount);
      setCrawlPage(p);

      // Check for active crawls and start polling
      const active = crawlList.filter(c => c.status === 'pending' || c.status === 'crawling');
      if (active.length > 0) {
        active.forEach(crawl => {
          if (!activeCrawls.has(crawl.id || crawl._id)) {
            setActiveCrawls(prev => new Set([...prev, crawl.id || crawl._id]));
            startCrawlPolling(crawl.id || crawl._id);
          }
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load crawls');
    } finally {
      setLoadingCrawls(false);
    }
  }

  async function startCrawl() {
    if (!crawlUrl.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    try {
      const url = new URL(crawlUrl.trim());
    } catch (e) {
      toast.error('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    setCrawlLoading(true);
    try {
      const res = await apiClient.post('/client/crawl/start', {
        url: crawlUrl.trim(),
        max_pages: 1, // Only crawl single page
        follow_links: false, // Don't follow links - only crawl the given URL
        render_js: true,
        render_timeout_ms: 25000,
        wait_selector: 'body',
      });

      toast.success('Crawl job started successfully');
      setCrawlUrl('');
      fetchCrawls(1);

      // Start polling for this crawl
      const crawlId = res.id;
      setActiveCrawls(prev => new Set([...prev, crawlId]));
      startCrawlPolling(crawlId);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to start crawl');
    } finally {
      setCrawlLoading(false);
    }
  }

  async function startBulkCrawl() {
    if (!bulkUrls.trim()) {
      toast.error('Please enter at least one URL');
      return;
    }

    // Parse URLs from textarea (split by newlines, commas, or spaces)
    const urlLines = bulkUrls
      .split(/\n|,|;/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (urlLines.length === 0) {
      toast.error('Please enter at least one valid URL');
      return;
    }

    // Validate URLs
    const validURLs = [];
    const invalidURLs = [];
    for (const urlStr of urlLines) {
      try {
        new URL(urlStr);
        validURLs.push(urlStr);
      } catch (e) {
        invalidURLs.push(urlStr);
      }
    }

    if (validURLs.length === 0) {
      toast.error('No valid URLs found. Please check your URLs.');
      return;
    }

    if (invalidURLs.length > 0) {
      toast.info(`${invalidURLs.length} invalid URL(s) will be skipped: ${invalidURLs.slice(0, 3).join(', ')}${invalidURLs.length > 3 ? '...' : ''}`);
    }

    if (validURLs.length > 100) {
      toast.error('Maximum 100 URLs allowed per bulk crawl');
      return;
    }

    setBulkCrawlLoading(true);
    try {
      const res = await apiClient.post('/client/crawl/bulk', {
        urls: validURLs,
        max_pages: 50,
        follow_links: true,
      });

      toast.success(`Bulk crawl started: ${res.jobs_created || res.jobs?.length || validURLs.length} job(s) created`);
      setBulkUrls('');
      fetchCrawls(1);

      // Start polling for all created jobs
      const jobs = res.jobs || [];
      jobs.forEach(job => {
        if (job.id) {
          setActiveCrawls(prev => new Set([...prev, job.id]));
          startCrawlPolling(job.id);
        }
      });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to start bulk crawl');
    } finally {
      setBulkCrawlLoading(false);
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setBulkUrls(text);
        toast.success('URLs loaded from file');
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  }

  const crawlPollingRefs = useRef({});
  function startCrawlPolling(crawlId) {
    if (crawlPollingRefs.current[crawlId]) {
      return; // Already polling
    }

    const pollCrawl = async () => {
      try {
        const res = await apiClient.get(`/client/crawls/${crawlId}/status`);
        const { status } = res;

        if (status === 'completed' || status === 'failed') {
          clearInterval(crawlPollingRefs.current[crawlId]);
          delete crawlPollingRefs.current[crawlId];
          setActiveCrawls(prev => {
            const next = new Set(prev);
            next.delete(crawlId);
            return next;
          });
          fetchCrawls(crawlPage); // Refresh list
        }
      } catch (err) {
        console.error('Crawl polling error:', err);
        clearInterval(crawlPollingRefs.current[crawlId]);
        delete crawlPollingRefs.current[crawlId];
      }
    };

    crawlPollingRefs.current[crawlId] = setInterval(pollCrawl, 3000);
    pollCrawl(); // Initial poll
  }

  async function handleDeleteCrawl(crawlId) {
    if (!confirm('Are you sure you want to delete this crawl job?')) {
      return;
    }

    try {
      await apiClient.delete(`/client/crawls/${crawlId}`);
      toast.success('Crawl job deleted successfully');
      fetchCrawls(crawlPage);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete crawl job');
    }
  }

  async function handleViewCrawl(crawlId) {
    setCrawlViewModal({
      isOpen: true,
      crawl: null,
      isLoading: true,
    });

    try {
      const res = await apiClient.get(`/client/crawls/${crawlId}`);
      setCrawlViewModal({
        isOpen: true,
        crawl: res,
        isLoading: false,
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load crawl details');
      setCrawlViewModal({
        isOpen: false,
        crawl: null,
        isLoading: false,
      });
    }
  }

  const closeCrawlViewModal = () => {
    setCrawlViewModal({
      isOpen: false,
      crawl: null,
      isLoading: false,
    });
  };

  useEffect(() => {
    return () => {
      Object.values(crawlPollingRefs.current).forEach(clearInterval);
    };
  }, []);

  const statusBadge = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'uploading':
        return 'info';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Upload and manage documents (PDF, DOCX, DOC, TXT) for your chatbot&apos;s knowledge base.
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {selectedDocs.size > 0 && (
            <Button 
              variant="outline" 
              onClick={handleDeleteBulk}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Selected ({selectedDocs.size})
            </Button>
          )}
          
          {queue.some((q) => q.status === 'completed' || q.status === 'failed') && (
            <Button variant="outline" onClick={clearCompleted}>
              Clear Completed
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.historicalTotal}</div>
            <div className="text-sm text-gray-500">Total Uploads</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.uploading}</div>
            <div className="text-sm text-gray-500">Currently Uploading</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.completedToday}</div>
            <div className="text-sm text-gray-500">Completed Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">{formatBytes(stats.totalSize)}</div>
            <div className="text-sm text-gray-500">Total Size</div>
          </CardContent>
        </Card>
      </div>

      {/* Upload area */}
   {/* Upload area */}
<Card>
  <CardHeader>
    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Upload Documents</h3>
  </CardHeader>
  <CardContent>
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragActive
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>

      <div className="space-y-2">
        <p className="text-lg font-medium text-gray-900 dark:text-white">
          {dragActive ? 'Drop files here' : 'Upload Documents'}
        </p>
                      <p className="text-gray-500">Drag & drop files here, or click to browse</p>
                      <p className="text-sm text-gray-400">Supports PDF, DOCX, DOC, and TXT files up to 100MB with automatic retry</p>
      </div>

      <div className="mt-6">
        {/* Hidden file input */}
        <input
          id="file-upload"
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {/* Clickable label that triggers the file input */}
        <label htmlFor="file-upload" className="inline-block">
          <Button 
            type="button"
            variant="primary" 
            className="cursor-pointer"
            onClick={() => document.getElementById('file-upload').click()}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Browse Files
          </Button>
        </label>
      </div>
    </div>
  </CardContent>
</Card>


      {/* Active uploads */}
      {queue.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Current Uploads</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {queue.map((u) => (
                <div key={u.id} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.file.name}</p>
                    <p className="text-sm text-gray-500">{formatBytes(u.file.size)}</p>

                    <div className="mt-2">
                      <Progress value={u.progress} className="h-2" showLabel />
                      {(u.status === 'uploading' || u.status === 'queued') && (
                        <p className="text-xs text-gray-500 mt-1">
                          {u.speed ? `${formatBytes(u.speed)}/s` : ''} {u.eta ? `• ${formatEta(u.eta)} remaining` : ''}
                        </p>
                      )}
                      {u.status === 'failed' && u.error && (
                        <p className="text-xs text-red-500 mt-1">{u.error}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge variant={statusBadge(u.status)}>{u.status}</Badge>
                    {u.status === 'failed' && (
                      <Button
                        onClick={() => {
                          toast.info(`Retrying upload for "${u.file.name}"...`);
                          startUpload(u.id, u.file);
                        }}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        title={`Retry upload (attempt ${(u.retryCount || 0) + 1})`}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retry
                      </Button>
                    )}
                    {(u.status === 'uploading' || u.status === 'queued') && u.retryCount > 0 && (
                      <Badge variant="warning" size="sm">
                        Retry {u.retryCount}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crawling Section */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Web Crawling</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Crawl websites and extract content for your chatbot&apos;s knowledge base.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Crawl Mode Tabs */}
          <Tabs value={crawlMode} onValueChange={setCrawlMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Single Page
              </TabsTrigger>
              <TabsTrigger value="bulk">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Bulk URLs
              </TabsTrigger>
            </TabsList>

            {/* Single Page Crawling */}
            <TabsContent value="single" className="mt-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enter a single URL to crawl
                  </label>
                  <div className="flex items-start space-x-3">
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={crawlUrl}
                      onChange={(e) => setCrawlUrl(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !crawlLoading) {
                          startCrawl();
                        }
                      }}
                      className="flex-1"
                      leftIcon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      }
                    />
                    <Button
                      onClick={startCrawl}
                      disabled={crawlLoading || !crawlUrl.trim()}
                      loading={crawlLoading}
                      variant="primary"
                      className="min-w-[140px]"
                    >
                      Start Crawl
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Crawl a single webpage and extract its content.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Bulk URL Crawling */}
            <TabsContent value="bulk" className="mt-4">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enter multiple URLs (one per line, comma, or semicolon separated)
                    </label>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".txt,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <span className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        Upload .txt/.csv
                      </span>
                    </label>
                  </div>
                  <textarea
                    value={bulkUrls}
                    onChange={(e) => setBulkUrls(e.target.value)}
                    placeholder="https://example.com/page1
https://example.com/page2
https://another-site.com

(Or paste comma/semicolon separated URLs)"
                    className="w-full min-h-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y font-mono text-sm"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {bulkUrls.split(/\n|,|;/).filter(l => l.trim()).length} URL(s) detected
                      {bulkUrls.split(/\n|,|;/).filter(l => l.trim()).length > 100 && (
                        <span className="text-red-600 dark:text-red-400 ml-1">(Max 100 allowed)</span>
                      )}
                    </p>
                    <Button
                      onClick={startBulkCrawl}
                      disabled={bulkCrawlLoading || !bulkUrls.trim() || bulkUrls.split(/\n|,|;/).filter(l => l.trim()).length > 100}
                      loading={bulkCrawlLoading}
                    >
                      Start Bulk Crawl
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Crawl History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white">Crawl History</h4>
            </div>
            {loadingCrawls ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : crawls.length > 0 ? (
              <div className="space-y-3">
                {crawls.map((crawl) => {
                  const crawlId = crawl.id || crawl._id;
                  const isActive = activeCrawls.has(crawlId);
                  return (
                    <div
                      key={crawlId}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <a
                            href={crawl.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate"
                          >
                            {crawl.url}
                          </a>
                          {isActive && (
                            <Badge variant="info" size="sm">
                              {crawl.status}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>{crawl.pages_crawled || 0} pages crawled</span>
                          <span>•</span>
                          <span>{new Date(crawl.created_at || crawl.createdAt).toLocaleString()}</span>
                          {crawl.status === 'completed' && (
                            <>
                              <span>•</span>
                              <span className="text-green-600 dark:text-green-400">Completed</span>
                            </>
                          )}
                          {crawl.status === 'failed' && crawl.error && (
                            <>
                              <span>•</span>
                              <span className="text-red-600 dark:text-red-400">Error: {crawl.error}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={statusBadge(crawl.status)}>{crawl.status}</Badge>
                        {crawl.status === 'completed' && (crawl.crawled_pages?.length > 0 || crawl.content) && (
                          <Button
                            onClick={() => handleViewCrawl(crawlId)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:scale-105 transition-transform duration-200"
                            title="View crawled content"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDeleteCrawl(crawlId)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          title="Delete crawl job"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {Math.ceil(crawlTotal / PAGE_SIZE) > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">
                      Page {crawlPage} of {Math.ceil(crawlTotal / PAGE_SIZE)} • {crawlTotal} total
                    </p>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={crawlPage <= 1}
                        onClick={() => fetchCrawls(crawlPage - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={crawlPage >= Math.ceil(crawlTotal / PAGE_SIZE)}
                        onClick={() => fetchCrawls(crawlPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <p>No crawl jobs yet. Start crawling a website to extract content.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Document History</h3>
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
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
          ) : filteredHistory.length > 0 ? (
            <>
              {/* Table with horizontal overflow for long filenames */}
              <div className="shadow ring-1 ring-black ring-opacity-5 rounded-lg overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[50px]">
                        <input
                          type="checkbox"
                          checked={selectedDocs.size === filteredHistory.length && filteredHistory.length > 0}
                          onChange={selectAll}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </TableHead>
                      <TableHead className="min-w-[300px]">Document</TableHead>
                      <TableHead className="min-w-[100px]">Size</TableHead>
                      <TableHead className="min-w-[80px]">Pages</TableHead>
                      <TableHead className="min-w-[180px]">Uploaded</TableHead>
                      <TableHead className="min-w-[120px]">Status</TableHead>
                      <TableHead className="min-w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((doc) => {
                      const docId = doc._id || doc.id;
                      return (
                        <TableRow key={docId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <TableCell className="min-w-[50px]">
                            <input
                              type="checkbox"
                              checked={selectedDocs.has(docId)}
                              onChange={() => toggleSelection(docId)}
                              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                            />
                          </TableCell>
                          <TableCell className="min-w-[300px]">
                            <div className="flex items-center space-x-3">
                              <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <div className="min-w-0 flex-1">
                                <p 
                                  className="font-medium text-gray-900 dark:text-white truncate" 
                                  title={doc.filename}
                                >
                                  {getCleanFilename(doc.filename)}
                                </p>
                                <p className="text-sm text-gray-500">Document</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[100px]">{formatBytes(doc?.metadata?.size)}</TableCell>
                          <TableCell className="min-w-[80px]">{doc?.metadata?.pages ?? '-'}</TableCell>
                          <TableCell className="min-w-[180px]">
                            {new Date(doc.uploaded_at || doc.uploadedAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Badge variant="success">completed</Badge>
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <div className="flex items-center space-x-2">
                              <Button
                                onClick={() => handleDeleteSingle(doc)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-50 hover:scale-105 transition-transform duration-200"
                                title="Delete document"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </Button>
                              <Button
                                onClick={() => handleViewDocument(doc)}
                                variant="outline"
                                size="sm"
                                className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:scale-105 transition-transform duration-200"
                                title="View document content"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages} • {total} total
                  {selectedDocs.size > 0 && ` • ${selectedDocs.size} selected`}
                </p>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchHistory(page - 1)}>
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => fetchHistory(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No documents found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No documents match your search.' : 'Upload your first document (PDF, DOCX, DOC, or TXT) to get started.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => !deleteModal.isDeleting && setDeleteModal({ 
          isOpen: false, 
          type: 'single', 
          document: null, 
          documents: [], 
          isDeleting: false 
        })}
        title={deleteModal.type === 'single' ? 'Delete Document' : 'Delete Multiple Documents'}
      >
        <div className="py-2">
          {/* Warning Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          
          {/* Confirmation Text */}
          <div className="text-center mb-6">
            {deleteModal.type === 'single' ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Document
                </h3>
                <p className="text-gray-700 dark:text-gray-300 text-base">
                  Are you sure you want to delete <span className="font-medium text-gray-900 dark:text-white">"{getCleanFilename(deleteModal.document?.filename)}"</span>?
                </p>
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    ⚠️ This action cannot be undone. The document will be permanently removed from your knowledge base.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Multiple Documents
                </h3>
                <p className="text-gray-700 dark:text-gray-300 text-base">
                  Are you sure you want to delete <span className="font-bold text-red-600 dark:text-red-400">{deleteModal.documents.length}</span> selected documents?
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700">
                  <ul className="text-sm text-left space-y-2">
                    {deleteModal.documents.slice(0, 5).map((doc) => (
                      <li key={doc._id || doc.id} className="flex items-start space-x-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span className="text-gray-700 dark:text-gray-300">{getCleanFilename(doc.filename)}</span>
                      </li>
                    ))}
                    {deleteModal.documents.length > 5 && (
                      <li className="flex items-start space-x-2 text-gray-500 dark:text-gray-400 italic">
                        <span>...</span>
                        <span>and {deleteModal.documents.length - 5} more</span>
                      </li>
                    )}
                  </ul>
                </div>
                
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    ⚠️ This action cannot be undone. All selected documents will be permanently removed.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={() => setDeleteModal({ 
                isOpen: false, 
                type: 'single', 
                document: null, 
                documents: [], 
                isDeleting: false 
              })}
              variant="outline"
              disabled={deleteModal.isDeleting}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              variant="danger"
              loading={deleteModal.isDeleting}
              disabled={deleteModal.isDeleting}
              className="px-6"
            >
              {deleteModal.isDeleting ? 'Deleting...' : deleteModal.type === 'single' 
                ? 'Delete Document' 
                : `Delete ${deleteModal.documents.length} Documents`
              }
            </Button>
          </div>
        </div>
      </Modal>

      {/* Document Viewer Modal */}
      <Modal
        isOpen={viewModal.isOpen}
        onClose={closeViewModal}
        title="Document Viewer"
        size="xl"
      >
        {viewModal.document && (
          <div className="space-y-4">
            {/* Document Info Header */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {viewModal.document.filename || 'Document'}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                      <span>{formatBytes(viewModal.document.metadata?.size || 0)}</span>
                    </div>
                    {viewModal.document.metadata?.pages && (
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{viewModal.document.metadata.pages} pages</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{new Date(viewModal.document.uploaded_at || viewModal.document.uploadedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="success">Completed</Badge>
              </div>
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              {viewModal.isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="flex flex-col items-center space-y-3">
                    <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading document content...</p>
                  </div>
                </div>
              ) : (viewModal.document?.content_chunks && Array.isArray(viewModal.document.content_chunks) && viewModal.document.content_chunks.length > 0) ? (
                // Display chunks with page indicators
                <div className="max-h-[60vh] overflow-y-auto">
                  <div className="p-6 space-y-4">
                    {viewModal.document.content_chunks
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((chunk, index) => (
                        <div key={chunk.chunk_id || index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            {chunk.page ? (
                              <Badge variant="info" size="sm">
                                Page {chunk.page}
                              </Badge>
                            ) : (
                              <Badge variant="default" size="sm">
                                Chunk {index + 1}
                              </Badge>
                            )}
                            {chunk.method && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {chunk.method}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                            {cleanExtractedText(chunk.text)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              ) : viewModal.content ? (
                // Fallback to plain text content
                <div className="max-h-[60vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                      <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-sans leading-relaxed">
                        {viewModal.content}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-12 text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>No content available for this document.</p>
                    {viewModal.document?.status === 'completed' && (
                      <p className="text-xs text-gray-400 mt-2">Content may be processing or failed to extract.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={closeViewModal}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Crawl Viewer Modal */}
      <Modal
        isOpen={crawlViewModal.isOpen}
        onClose={closeCrawlViewModal}
        title="Crawl Content Viewer"
        size="xl"
      >
        {crawlViewModal.isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center space-y-3">
              <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading crawl content...</p>
            </div>
          </div>
        ) : crawlViewModal.crawl ? (
          <div className="space-y-4">
            {/* Crawl Info Header */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {crawlViewModal.crawl.url || 'Crawl Job'}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{crawlViewModal.crawl.pages_crawled || 0} pages crawled</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{new Date(crawlViewModal.crawl.created_at || crawlViewModal.crawl.createdAt).toLocaleString()}</span>
                    </div>
                    {crawlViewModal.crawl.completed_at && (
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Completed {new Date(crawlViewModal.crawl.completed_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant="success">{crawlViewModal.crawl.status}</Badge>
              </div>
            </div>

            {/* Crawled Pages Content */}
            {crawlViewModal.crawl.crawled_pages && crawlViewModal.crawl.crawled_pages.length > 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="max-h-[60vh] overflow-y-auto">
                  <div className="p-6 space-y-4">
                    {crawlViewModal.crawl.crawled_pages.map((page, index) => (
                      <div key={page.url || index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
                            >
                              {page.url}
                            </a>
                            {page.title && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                {page.title}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {page.status_code && (
                              <Badge variant={page.status_code === 200 ? "success" : "danger"} size="sm">
                                {page.status_code}
                              </Badge>
                            )}
                            {page.word_count > 0 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {page.word_count} words
                              </span>
                            )}
                          </div>
                        </div>
                        {page.content && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
                              {page.content.substring(0, 5000)}{page.content.length > 5000 ? '...' : ''}
                            </p>
                            {page.content.length > 5000 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Showing first 5000 characters of {page.content.length.toLocaleString()} total
                              </p>
                            )}
                          </div>
                        )}
                        {page.crawled_at && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            Crawled: {new Date(page.crawled_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : crawlViewModal.crawl.content ? (
              // Fallback to main content if no pages array
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="max-h-[60vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                      <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-sans leading-relaxed">
                        {crawlViewModal.crawl.content}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-12 text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No content available for this crawl.</p>
                  {crawlViewModal.crawl.status !== 'completed' && (
                    <p className="text-xs text-gray-400 mt-2">Content may still be processing.</p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={closeCrawlViewModal}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No crawl data available
          </div>
        )}
      </Modal>
    </div>
  );
};

export { Documents };
export default Documents;
