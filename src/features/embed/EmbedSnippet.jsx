// src/features/client/components/EmbedSnippet.jsx
import React, { useState, useEffect } from 'react';
import { useBrandingStore } from '../../../store/brandingStore';
import { useAuthStore } from '../../../store/authStore';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Switch } from '../../../components/ui/Switch';
import toast from '@/lib/toast';

const toPosObject = (pos) => {
  // converts "bottom-right" → {"bottom":"20px","right":"20px"}
  if (!pos || typeof pos !== 'string') return { bottom: '20px', right: '20px' };
  const [v1, v2] = pos.split('-');
  return { [v1]: '20px', [v2]: '20px' };
};

const EmbedSnippet = ({ onClose, onCopy, className = '' }) => {
  const { user } = useAuthStore();
  const { branding, previewBranding } = useBrandingStore();

  const [embedConfig, setEmbedConfig] = useState({
    baseUrl: window.location.origin,
    clientId: user?.client_id || user?.clientId || 'your-client-id',
    theme: 'auto', // 'light' | 'dark' | 'auto'  (used by /embed-snippet.js)
    position: 'bottom-right',
    autoOpen: false,
    greetingDelay: 3000,
    maxWidth: 350,   // used as iframe width for iFrame snippet and data-width for loader
    maxHeight: 500,  // used as iframe height for iFrame snippet and data-height for loader
    zIndex: 9999,    // iFrame snippet only (loader uses its own very high z-index)
  });

  const [activeTab, setActiveTab] = useState('html');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [embedCode, setEmbedCode] = useState('');
  const [previewMode, setPreviewMode] = useState('desktop');

  useEffect(() => {
    generateSnippet();
    // regenerate when switching tabs too
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedConfig, previewBranding, branding, activeTab]);

  const generateSnippet = () => {
    const currentBranding = previewBranding || branding;

    switch (activeTab) {
      case 'react':
        setEmbedCode(generateReactSnippet(currentBranding));
        break;
      case 'vanilla':
        setEmbedCode(generateVanillaJSSnippet(currentBranding));
        break;
      case 'wordpress':
        setEmbedCode(generateWordPressSnippet(currentBranding));
        break;
      case 'iframe':
        setEmbedCode(generateIframeSnippet(currentBranding));
        break;
      case 'html':
      default:
        setEmbedCode(generateHTMLSnippet(currentBranding));
    }
  };

  // ==== SNIPPET GENERATORS (aligned to public/embed-snippet.js) ====

  const generateHTMLSnippet = () => {
    return `<!-- SaaS Chatbot Widget -->
<div id="saas-chatbot-widget"></div>
<script src='${embedConfig.baseUrl}/embed-snippet.js' 
        data-client-id='${embedConfig.clientId}'>
</script>`;
  };

  const generateReactSnippet = () => {
    return `// React example — place this anywhere in your app
import { useEffect } from 'react';

export default function ChatbotLoader(){
  useEffect(() => {
    const s = document.createElement('script');
    s.src = '${embedConfig.baseUrl}/embed-snippet.js';
    s.async = true;
    s.setAttribute('data-client-id', '${embedConfig.clientId}');
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, []);

  // optional placeholder element
  return <div id="saas-chatbot-widget" />;
}`;
  };

  const generateVanillaJSSnippet = () => {
    return `// Vanilla JS
(function(){
  var s = document.createElement('script');
  s.src = '${embedConfig.baseUrl}/embed-snippet.js';
  s.async = true;
  s.setAttribute('data-client-id', '${embedConfig.clientId}');
  document.head.appendChild(s);
})();`;
  };

  const generateWordPressSnippet = () => {
    return `<?php
// Add this to your theme's functions.php or a small plugin
add_action('wp_footer', function () {
  ?>
  <div id="saas-chatbot-widget"></div>
  <script src='${embedConfig.baseUrl}/embed-snippet.js' 
          data-client-id='${embedConfig.clientId}'>
  </script>
  <?php
});`;
  };

  const generateIframeSnippet = () => {
    // direct iframe (no loader). Good for strict CSP environments.
    const query = new URLSearchParams({
      preview: 'false',
      theme: embedConfig.theme,
    }).toString();

    return `<!-- SaaS Chatbot iFrame Embed -->
<iframe
  id="saas-chatbot-iframe"
  src="${embedConfig.baseUrl}/embed/${embedConfig.clientId}?${query}"
  width="${embedConfig.maxWidth}"
  height="${embedConfig.maxHeight}"
  frameborder="0"
  scrolling="no"
  style="
    position: fixed;
    ${embedConfig.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
    ${embedConfig.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
    z-index: ${embedConfig.zIndex};
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
  };

  // ==== helpers ====
  const adjustColorBrightness = (hex, percent) => {
    const num = parseInt(String(hex || '#3B82F6').replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      toast.success('Embed code copied to clipboard!');
      onCopy?.(embedCode, activeTab);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = embedCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast.success('Embed code copied to clipboard!');
    }
  };

  const handleDownload = () => {
    const ext = { html: 'html', react: 'jsx', vanilla: 'js', wordpress: 'php', iframe: 'html' }[
      activeTab
    ] || 'txt';
    const filename = `saas-chatbot-${activeTab}.${ext}`;
    const blob = new Blob([embedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const tabOptions = [
    { value: 'html', label: 'HTML/JavaScript', icon: '🌐' },
    { value: 'react', label: 'React', icon: '⚛️' },
    { value: 'vanilla', label: 'Vanilla JS', icon: '📝' },
    { value: 'wordpress', label: 'WordPress', icon: '🔌' },
    { value: 'iframe', label: 'iFrame', icon: '🖼️' },
  ];

  const positionOptions = [
    { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'top-left', label: 'Top Left' },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Widget Embed Code</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Copy and paste this code into your website to embed the chat widget.
          </p>
        </div>

        {onClose && (
          <Button onClick={onClose} variant="outline" size="sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </Button>
        )}
      </div>

      {/* Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Configuration</h3>
            <div className="flex items-center space-x-2">
              <Switch label="Advanced Options" checked={showAdvanced} onChange={setShowAdvanced} size="sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Base URL"
              value={embedConfig.baseUrl}
              onChange={(e) => setEmbedConfig({ ...embedConfig, baseUrl: e.target.value })}
              placeholder="https://your-domain.com"
            />

            <Input
              label="Client ID"
              value={embedConfig.clientId}
              onChange={(e) => setEmbedConfig({ ...embedConfig, clientId: e.target.value })}
              placeholder="your-client-id"
            />

            <Select
              label="Widget Position"
              value={embedConfig.position}
              onChange={(value) => setEmbedConfig({ ...embedConfig, position: value })}
              options={positionOptions}
            />

            <Select
              label="Theme"
              value={embedConfig.theme}
              onChange={(value) => setEmbedConfig({ ...embedConfig, theme: value })}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />

            {showAdvanced && (
              <>
                <Input
                  label="Width (px)"
                  type="number"
                  value={embedConfig.maxWidth}
                  onChange={(e) => setEmbedConfig({ ...embedConfig, maxWidth: parseInt(e.target.value || '0', 10) })}
                  min="200"
                  max="800"
                />

                <Input
                  label="Height (px)"
                  type="number"
                  value={embedConfig.maxHeight}
                  onChange={(e) => setEmbedConfig({ ...embedConfig, maxHeight: parseInt(e.target.value || '0', 10) })}
                  min="300"
                  max="1000"
                />

                <Input
                  label="Z-Index (iFrame only)"
                  type="number"
                  value={embedConfig.zIndex}
                  onChange={(e) => setEmbedConfig({ ...embedConfig, zIndex: parseInt(e.target.value || '0', 10) })}
                  min="1000"
                  max="2147483647"
                />

                <Input
                  label="Greeting Delay (ms)"
                  type="number"
                  value={embedConfig.greetingDelay}
                  onChange={(e) =>
                    setEmbedConfig({ ...embedConfig, greetingDelay: parseInt(e.target.value || '0', 10) })
                  }
                  min="0"
                  max="10000"
                  step="500"
                />

                <div className="space-y-2">
                  <Switch
                    label="Auto Open"
                    checked={embedConfig.autoOpen}
                    onChange={(checked) => setEmbedConfig({ ...embedConfig, autoOpen: checked })}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {tabOptions.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.value
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Code */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {tabOptions.find((t) => t.value === activeTab)?.label} Code
              </h3>
              <Badge variant="info" size="sm">{embedCode.split('\n').length} lines</Badge>
            </div>

            <div className="flex items-center space-x-2">
              <Button onClick={handleDownload} variant="outline" size="sm">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
              </Button>

              <Button onClick={handleCopy} variant="primary" size="sm">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Code
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{embedCode}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Preview header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Preview</h3>
        <div className="flex space-x-2">
          {['desktop', 'tablet', 'mobile'].map((mode) => (
            <button
              key={mode}
              onClick={() => setPreviewMode(mode)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                previewMode === mode ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Live Preview (uses your /embed/:clientId?preview=true) */}
      <Card>
        <CardContent className="p-6">
          <div
            className={`mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden ${
              previewMode === 'mobile' ? 'max-w-sm' : previewMode === 'tablet' ? 'max-w-md' : 'max-w-4xl'
            }`}
          >
            <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={`${embedConfig.baseUrl}/embed/${embedConfig.clientId}?preview=true&theme=${encodeURIComponent(
                  embedConfig.theme
                )}`}
                className="absolute top-0 left-0 w-full h-full border-0"
                title="Widget Preview"
                loading="lazy"
                allow="clipboard-write"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert variant="info" title="Integration Notes">
        <div className="space-y-2 text-sm">
          <p>• Place the embed code just before the closing &lt;/body&gt; tag for best performance.</p>
          <p>• The loader script (<code>embed-snippet.js</code>) injects the iframe and button automatically.</p>
          <p>• Use the iFrame option if your site has a very strict CSP that blocks inline script attributes.</p>
          <p>• The widget automatically uses your current branding (logo, welcome text, color).</p>
        </div>
      </Alert>
    </div>
  );
};

export { EmbedSnippet };
export default EmbedSnippet;
