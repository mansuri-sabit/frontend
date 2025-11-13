// src/features/embed/components/EmbedPreview.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Select } from '../../../components/ui/Select';
import { Switch } from '../../../components/ui/Switch';
import { Input } from '../../../components/ui/Input';
import { EmbedUtils } from '../embed-utils';

const EmbedPreview = ({ clientId, branding }) => {
  const [config, setConfig] = useState({
    position: 'bottom-right',
    width: '350px',
    height: '500px',
    theme: 'light',           // light | dark | auto
    autoOpen: false,
    greetingDelay: 3000,
    // advanced
    secret: '',               // optional: embed secret from backend
    domain: window.location.origin, // where your app hosts /embed-snippet.js + /embed/chatframe
  });

  const [previewMode, setPreviewMode] = useState('desktop');
  const [embedCode, setEmbedCode] = useState('');
  const [errors, setErrors] = useState([]);
  const iframeRef = useRef(null);

  // keep derived preview url in sync
  const previewUrl = useMemo(
    () => EmbedUtils.generatePreviewUrl(clientId, {
      theme: config.theme,
      secret: config.secret || undefined,
      domain: config.domain || window.location.origin,
    }),
    [clientId, config.theme, config.secret, config.domain]
  );

  // regenerate snippet whenever config changes
  useEffect(() => {
    const v = EmbedUtils.validateConfig({ clientId, ...config });
    setErrors(v.errors);
    setEmbedCode(EmbedUtils.generateEmbedCode(clientId, config));
  }, [clientId, config]);

  const positionOptions = [
    { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'bottom-left',  label: 'Bottom Left'  },
    { value: 'top-right',    label: 'Top Right'    },
    { value: 'top-left',     label: 'Top Left'     },
  ];
  const themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark',  label: 'Dark'  },
    { value: 'auto',  label: 'Auto'  },
  ];
  const previewModes = [
    { value: 'desktop', label: 'Desktop', width: '1200px', height: '800px'  },
    { value: 'tablet',  label: 'Tablet',  width: '768px',  height: '1024px' },
    { value: 'mobile',  label: 'Mobile',  width: '375px',  height: '667px'  },
  ];
  const currentMode = previewModes.find(m => m.value === previewMode);

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const copyEmbedCode = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      // if you have a toast system, trigger it here
      // toast.success('Embed code copied');
      alert('Embed code copied to clipboard.');
    } catch {
      alert('Unable to copy. Please select and copy the snippet manually.');
    }
  };

  const testEmbed = async () => {
    const v = EmbedUtils.validateConfig({ clientId, ...config });
    if (!v.isValid) {
      setErrors(v.errors);
      alert('Please fix the configuration errors before testing.');
      return;
    }
    const result = await EmbedUtils.testEmbed(clientId, {
      theme: config.theme,
      secret: config.secret || undefined,
      domain: config.domain || window.location.origin,
    });
    alert(result.success ? 'Embed test successful!' : `Embed test failed: ${result.error}`);
  };

  const pageViewportHeight = `calc(${currentMode.height} - 32px)`; // minus mock browser bar

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Widget Configuration</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.length > 0 && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              <ul className="list-disc list-inside">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Position"
              value={config.position}
              onChange={(value) => handleConfigChange('position', value)}
              options={positionOptions}
            />

            <Select
              label="Theme"
              value={config.theme}
              onChange={(value) => handleConfigChange('theme', value)}
              options={themeOptions}
            />

            <Input
              label="Width"
              value={config.width}
              onChange={(e) => handleConfigChange('width', e.target.value)}
              placeholder="350px"
            />

            <Input
              label="Height"
              value={config.height}
              onChange={(e) => handleConfigChange('height', e.target.value)}
              placeholder="500px"
            />

            <Switch
              label="Auto Open"
              description="Automatically open widget after page load"
              checked={config.autoOpen}
              onChange={(checked) => handleConfigChange('autoOpen', checked)}
            />

            <Input
              label="Greeting Delay (ms)"
              type="number"
              value={config.greetingDelay}
              onChange={(e) => handleConfigChange('greetingDelay', parseInt(e.target.value || '0', 10))}
              disabled={!config.autoOpen}
              min="0"
              max="10000"
              step="500"
            />

            {/* Advanced: domain + secret (optional) */}
            <Input
              label="Embed Domain"
              value={config.domain}
              onChange={(e) => handleConfigChange('domain', e.target.value)}
              placeholder={window.location.origin}
            />
            <Input
              label="Embed Secret (optional)"
              value={config.secret}
              onChange={(e) => handleConfigChange('secret', e.target.value)}
              placeholder="Copy from Admin → Clients → Embed snippet"
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Preview</h3>
            <div className="flex items-center space-x-2">
              <Select value={previewMode} onChange={setPreviewMode} options={previewModes} />
              <Button onClick={testEmbed} variant="outline" size="sm">Test</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-4 rounded-lg overflow-hidden">
            <div
              className="bg-white shadow-lg mx-auto relative overflow-hidden"
              style={{
                width: currentMode.width,
                height: currentMode.height,
                maxWidth: '100%',
                borderRadius: previewMode === 'mobile' ? '20px' : '8px',
              }}
            >
              {/* Mock browser chrome */}
              <div className="h-8 bg-gray-200 flex items-center px-3 space-x-2">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-red-400 rounded-full" />
                  <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                </div>
                <div className="flex-1 bg-white rounded px-2 py-1 text-xs text-gray-500">
                  https://example.com
                </div>
              </div>

              {/* Page and widget */}
              <div className="bg-white relative" style={{ height: pageViewportHeight }}>
                {/* Mock content */}
                <div className="p-6 space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-32 bg-gray-100 rounded" />
                </div>

                {/* Chatframe preview */}
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  className="absolute"
                  style={{
                    width: config.width,
                    height: config.height,
                    maxWidth: '90%',
                    maxHeight: '90%',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    ...(config.position.includes('right') ? { right: '20px' } : { left: '20px' }),
                    ...(config.position.includes('bottom') ? { bottom: '20px' } : { top: '20px' }),
                  }}
                  title="Chat Widget Preview"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embed code */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Embed Code</h3>
            <Button onClick={copyEmbedCode} variant="outline" size="sm">Copy Code</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
              <code>{embedCode}</code>
            </pre>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Paste just before the closing &lt;/body&gt; tag on your site.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export { EmbedPreview };
export default EmbedPreview;
