# Next.js Integration Guide

This guide provides step-by-step instructions for integrating the Jodex AI Assistant into your Next.js application with all the security and compatibility improvements.

## 🚀 Quick Start

### 1. Install the Package

```bash
npm install jodex-ai-assistant
```

### 2. Set Up API Routes

Create secure API routes to handle OpenAI requests:

#### a) Create Chat API Route
```typescript
// pages/api/openai/chat.ts
import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, model = 'gpt-4-turbo-preview', temperature = 0.7 } = req.body;

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
    });

    res.status(200).json({
      content: completion.choices[0]?.message?.content || '',
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

#### b) Create Streaming Chat API Route
```typescript
// pages/api/openai/chat/stream.ts
import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  try {
    const { messages, model = 'gpt-4-turbo-preview', temperature = 0.7 } = req.body;

    const stream = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
  } finally {
    res.end();
  }
}
```

### 3. Environment Variables

Add these to your `.env.local`:

```env
# OpenAI API Key (server-side only)
OPENAI_API_KEY=your_openai_api_key_here

# Optional: LiveKit for voice features
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com
```

### 4. Integrate Component

```tsx
// app/layout.tsx or pages/_app.tsx
import { JodexAI } from 'jodex-ai-assistant';
import 'jodex-ai-assistant/dist/index.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const handleAction = (action: any) => {
    switch (action.type) {
      case 'show_supply_forecast':
        // Navigate to forecast page or show modal
        break;
      case 'send_notification':
        // Show notification to user
        break;
    }
  };

  return (
    <html>
      <body>
        {children}

        <JodexAI
          apiUrl="/api/openai/chat"
          position="bottom-right"
          voiceEnabled={true}
          onAction={handleAction}
          datasets={{
            farmers: farmerData,
            harvests: harvestData,
            weather: weatherData,
          }}
        />
      </body>
    </html>
  );
}
```

## 🔒 Security Improvements

### API Proxy (Recommended)
The component now uses a secure API proxy instead of exposing API keys:

```tsx
// ✅ Secure - uses API proxy
<JodexAI apiUrl="/api/openai/chat" />

// ❌ Insecure - exposes API key
<JodexAI apiKey="sk-..." />
```

### Rate Limiting
The included API routes implement rate limiting to prevent abuse:

```typescript
// Built-in rate limiting (10 requests per minute)
// Customizable by modifying the RATE_LIMIT constant
```

## 🌐 Browser Compatibility

### Automatic Detection
The component automatically detects browser capabilities:

```tsx
// Features are automatically enabled/disabled based on browser support
// - Voice features disabled in unsupported browsers
// - Fallbacks provided for mobile devices
// - Graceful degradation for older browsers
```

### Supported Browsers
- **Desktop**: Chrome 80+, Firefox 75+, Safari 14+, Edge 80+
- **Mobile**: iOS Safari 14+, Chrome Mobile 80+, Samsung Internet 13+

## 📱 Mobile Optimization

### Touch-Friendly Interface
- Minimum touch targets: 44×44px
- Optimized scrolling with momentum
- Safe area support for notched devices
- Responsive positioning on mobile

### Mobile-Specific Features
```css
/* Touch device optimizations */
@media (hover: none) and (pointer: coarse) {
  /* Larger touch targets */
  /* Removed hover effects */
  /* Improved accessibility */
}
```

## ♿ Accessibility Features

### ARIA Support
- Voice button with proper ARIA labels
- Screen reader announcements
- Keyboard navigation support
- Focus management

### Keyboard Shortcuts
- **Enter/Space**: Activate voice button
- **Escape**: Stop recording
- **Tab**: Navigate through interface

## 🔧 Advanced Configuration

### Custom Error Handling
```tsx
<JodexAI
  apiUrl="/api/openai/chat"
  onError={(error) => {
    // Custom error handling
    console.error('Jodex Error:', error);
    // Send to error reporting service
  }}
/>
```

### Theme Customization
```tsx
<JodexAI
  apiUrl="/api/openai/chat"
  theme={{
    mode: 'dark',
    primaryColor: '#22c55e',
    customCSS: `
      .jodex-chat-container {
        border-radius: 16px;
      }
    `
  }}
/>
```

### Voice Configuration
```tsx
<JodexAI
  apiUrl="/api/openai/chat"
  voiceEnabled={true}
  voiceSettings={{
    language: 'en-US',
    autoPlay: true,
    rate: 1.0,
    pitch: 1.0,
  }}
/>
```

## 🚀 Performance Optimizations

### Dynamic Loading
- Heavy dependencies loaded only when needed
- Voice features loaded conditionally
- Bundle size optimization with code splitting

### Memory Management
- Automatic cleanup on component unmount
- Proper event listener disposal
- Animation frame cleanup

## 🛠️ Troubleshooting

### Common Issues

1. **Voice Features Not Working**
   - Check browser compatibility
   - Ensure HTTPS is served
   - Verify microphone permissions

2. **API Key Errors**
   - Use API proxy instead of client-side keys
   - Verify environment variables
   - Check API route configuration

3. **CSS Conflicts**
   - All styles are scoped to `.jodex-container`
   - Import CSS file: `import 'jodex-ai-assistant/dist/index.css'`

4. **Mobile Issues**
   - Test on actual devices
   - Check viewport configuration
   - Verify touch target sizes

### Debug Mode
```tsx
<JodexAI
  apiUrl="/api/openai/chat"
  debugMode={process.env.NODE_ENV === 'development'}
/>
```

## 📦 Production Deployment

### Build Optimization
```json
{
  "scripts": {
    "build": "next build",
    "analyze": "ANALYZE=true next build"
  }
}
```

### Environment Setup
```bash
# Production environment variables
OPENAI_API_KEY=your_production_openai_key
NEXT_PUBLIC_LIVEKIT_URL=your_production_livekit_url
```

### Security Headers
```javascript
// next.config.js
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.openai.com;
`;

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

## 🔄 Migration from Previous Versions

### Breaking Changes
1. **API Key Security**: Direct API key usage is deprecated
2. **CSS Scoping**: All styles are now scoped
3. **SSR Support**: Improved server-side rendering compatibility

### Migration Steps
1. Update API routes
2. Replace `apiKey` prop with `apiUrl`
3. Update CSS imports
4. Test browser compatibility

## 📚 Additional Resources

- [API Documentation](./docs/api.md)
- [Component Examples](./examples/)
- [Troubleshooting Guide](./docs/troubleshooting.md)
- [Accessibility Guide](./docs/accessibility.md)

## 🤝 Support

For issues and support:
- GitHub Issues: [Report Bug](https://github.com/your-org/jodex-ai-assistant/issues)
- Documentation: [View Docs](https://jodex-ai-docs.com)
- Community: [Discord Server](https://discord.gg/jodex-ai)