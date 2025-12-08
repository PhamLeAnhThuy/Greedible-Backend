'use client';

import React, { useEffect, useState } from 'react';

declare global {
  interface Window {
    SwaggerUIBundle: any;
    SwaggerUIStandalonePreset: any;
  }
}

// Dynamically load Swagger UI from CDN
export default function SwaggerPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load Swagger UI CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui.min.css';
    document.head.appendChild(link);

    // Load Swagger UI bundle and standalone preset JS from CDN
    let bundleLoaded = false;
    let presetLoaded = false;

    const tryInit = () => {
      if (!bundleLoaded || !presetLoaded) return;
      const Bundle = (window as any).SwaggerUIBundle;
      const Preset = (window as any).SwaggerUIStandalonePreset;
      if (!Bundle) {
        console.error('Swagger UI bundle not available on window');
        return;
      }

      const ui = Bundle({
        url: '/api/swagger',
        dom_id: '#swagger-ui',
        presets: [Bundle.presets.apis, Preset],
        layout: 'BaseLayout',
        deepLinking: true,
        displayRequestDuration: true,
        tryItOutEnabled: true,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        persistAuthorization: true,
        onComplete: () => {
          setIsLoading(false);
          // Force Swagger UI to render examples
          setTimeout(() => {
            // Expand all response sections
            const responseHeaders = document.querySelectorAll('.response-header');
            responseHeaders.forEach((header: any) => {
              const clickable = header.querySelector('span');
              if (clickable && clickable.click) {
                clickable.click();
              }
            });
            
            // Expand example sections
            const exampleTabs = document.querySelectorAll('.examples-select');
            exampleTabs.forEach((tab: any) => {
              if (tab && tab.click) {
                tab.click();
              }
            });
            
            // Also try clicking on response content type buttons to show examples
            const contentTypeButtons = document.querySelectorAll('.response-content-type');
            contentTypeButtons.forEach((btn: any) => {
              if (btn && btn.click) {
                btn.click();
              }
            });
          }, 2000);
        }
      });
    };

    const scriptBundle = document.createElement('script');
    scriptBundle.src = 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui-bundle.min.js';
    scriptBundle.async = true;
    scriptBundle.onload = () => {
      bundleLoaded = true;
      tryInit();
    };
    scriptBundle.onerror = () => console.error('Failed to load swagger-ui-bundle');

    const scriptPreset = document.createElement('script');
    scriptPreset.src = 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui-standalone-preset.min.js';
    scriptPreset.async = true;
    scriptPreset.onload = () => {
      presetLoaded = true;
      tryInit();
    };
    scriptPreset.onerror = () => console.error('Failed to load swagger-ui-standalone-preset');

    document.body.appendChild(scriptBundle);
    document.body.appendChild(scriptPreset);

    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <>
      <style>{`
        body {
          margin: 0;
          padding: 0;
          background: #fafafa;
        }
        .swagger-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
          margin-bottom: 20px;
        }
        .swagger-header h1 {
          margin: 0;
          font-size: 2.5em;
          font-weight: 600;
        }
        .swagger-header p {
          margin: 10px 0 0 0;
          font-size: 1.1em;
          opacity: 0.9;
        }
        #swagger-ui {
          padding: 20px;
        }
      `}</style>
      <div className="swagger-header">
        <h1>Greedible API Documentation</h1>
        <p>Complete API reference for the Greedible Backend</p>
      </div>
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', color: '#666' }}>
          Loading API Documentation...
        </div>
      )}
      <div id="swagger-ui"></div>
    </>
  );
}