'use client';

import React, { useEffect, useState } from 'react';

declare global {
  interface Window {
    SwaggerUIBundle: any;
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

    // Load Swagger UI JS
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui.min.js';
    script.async = true;
    script.onload = () => {
      // Initialize Swagger UI
      (window.SwaggerUIBundle as any)({
        url: '/api/swagger',
        dom_id: '#swagger-ui',
        presets: [
          (window.SwaggerUIBundle as any).presets.apis,
          (window.SwaggerUIBundle as any).SwaggerUIStandalonePreset
        ],
        layout: 'BaseLayout',
        deepLinking: true,
        onComplete: () => {
          setIsLoading(false);
        }
      });
    };
    document.body.appendChild(script);

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
