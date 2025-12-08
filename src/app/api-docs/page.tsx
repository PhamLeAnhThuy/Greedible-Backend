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
        requestInterceptor: (request: any) => {
          return request;
        },
        responseInterceptor: (response: any) => {
          return response;
        },
        onComplete: () => {
          setIsLoading(false);
          // Force Swagger UI to show all examples by expanding response sections
          const expandAllResponses = () => {
            // First, expand all operation blocks
            const operationBlocks = document.querySelectorAll('.opblock');
            operationBlocks.forEach((block: any) => {
              const summary = block.querySelector('.opblock-summary, .opblock-summary-control');
              if (summary) {
                const isExpanded = block.classList.contains('is-open');
                if (!isExpanded) {
                  try {
                    summary.click();
                  } catch (e) {
                    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
                    summary.dispatchEvent(event);
                  }
                }
              }
            });
            
            // Then expand all response sections
            setTimeout(() => {
              const responseContainers = document.querySelectorAll('.response, .response-container');
              responseContainers.forEach((container: any) => {
                // Find response headers and click to expand
                const headers = container.querySelectorAll('.response-header, .response-col_status, [class*="response-header"]');
                headers.forEach((header: any) => {
                  const clickable = header.querySelector('span, button, a, div[role="button"]') || header;
                  if (clickable) {
                    try {
                      clickable.click();
                    } catch (e) {
                      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
                      clickable.dispatchEvent(event);
                    }
                  }
                });
                
                // Force content-type selectors to show examples
                const contentTypeSelectors = container.querySelectorAll('.response-content-type, .content-type, [class*="content-type"]');
                contentTypeSelectors.forEach((selector: any) => {
                  try {
                    selector.click();
                  } catch (e) {
                    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
                    selector.dispatchEvent(event);
                  }
                });
                
                // Force example sections to be visible with CSS
                const exampleSections = container.querySelectorAll('.example, .examples, [class*="example"], pre.highlight-code');
                exampleSections.forEach((section: any) => {
                  if (section) {
                    section.style.display = 'block';
                    section.style.visibility = 'visible';
                    section.style.opacity = '1';
                    // Remove any hidden classes
                    section.classList.remove('hidden', 'hide');
                    section.classList.add('show', 'visible');
                  }
                });
              });
              
              // Also look for example tabs/buttons and click them
              const exampleButtons = document.querySelectorAll('[class*="example"], .examples-select, button[aria-label*="example" i]');
              exampleButtons.forEach((btn: any) => {
                try {
                  btn.click();
                } catch (e) {
                  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
                  btn.dispatchEvent(event);
                }
              });
            }, 300);
          };
          
          // Try multiple times with increasing delays to ensure Swagger UI has fully rendered
          setTimeout(expandAllResponses, 500);
          setTimeout(expandAllResponses, 1500);
          setTimeout(expandAllResponses, 3000);
          setTimeout(expandAllResponses, 5000);
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
        /* Ensure example sections are visible */
        .swagger-ui .example,
        .swagger-ui .examples,
        .swagger-ui [class*="example"] {
          display: block !important;
          visibility: visible !important;
        }
        /* Expand response sections by default */
        .swagger-ui .response {
          margin-top: 10px;
        }
        .swagger-ui .response-content-type {
          display: block !important;
        }
        /* Ensure response body examples are shown */
        .swagger-ui .response-col_description .example,
        .swagger-ui .response-col_description .examples {
          display: block !important;
          margin-top: 10px;
        }
        /* Make sure example code blocks are visible */
        .swagger-ui .example pre,
        .swagger-ui .examples pre {
          display: block !important;
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