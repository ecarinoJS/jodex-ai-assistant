# Jodex AI Assistant - Next.js Example Application

This is a complete Next.js application demonstrating the Jodex AI Assistant integration for agricultural supply chain management.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key (for AI functionality)
- LiveKit server (optional, for voice features)

### Setup Instructions

1. **Clone and Install**
   ```bash
   cd examples/nextjs-app
   npm install
   ```

2. **Configure Environment**
   ```bash
   # Copy the environment template
   cp .env.example .env.local

   # Edit .env.local with your API keys
   # See "Configuration" section below
   ```

3. **Run the Application**
   ```bash
   npm run dev
   ```

4. **Open in Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## ⚙️ Configuration

### Environment Variables

You need to configure the following environment variables in `.env.local`:

#### **Required for Basic Functionality**
```env
# OpenAI API Key
NEXT_PUBLIC_OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_API_KEY=sk-your-openai-api-key-here
```

#### **Optional for Voice Features**
```env
# LiveKit Configuration (for real-time voice)
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-livekit-api-key-here
LIVEKIT_API_SECRET=your-livekit-secret-key-here
```

#### **Debug Mode**
```env
# Enable debug mode (development only)
NEXT_PUBLIC_DEBUG=false
```

### Getting API Keys

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account and add billing information
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Create a new API key
5. Copy the key to your `.env.local` file

#### LiveKit Credentials (Optional)
1. Visit [LiveKit Cloud](https://cloud.livekit.io/)
2. Create a free account
3. Create a new project
4. Copy the API key, secret, and WebSocket URL to your `.env.local` file

**Alternative**: Self-host LiveKit server using [LiveKit Server](https://github.com/livekit/livekit)

## 🌟 Features

This example demonstrates:

### **AI Chat Features**
- ✅ Agricultural data analysis (farmers, harvest, weather)
- ✅ Supply chain insights and recommendations
- ✅ Action system for UI integration
- ✅ Streaming responses for better UX

### **Voice Features** *(requires LiveKit)*
- ✅ Real-time voice input and recording
- ✅ Speech-to-text transcription
- ✅ Text-to-speech AI responses
- ✅ Volume monitoring and visual feedback
- ✅ Browser compatibility detection

### **UI Features**
- ✅ Responsive design (mobile & desktop)
- ✅ Multiple positioning options
- ✅ Theme support (light/dark/system)
- ✅ Accessibility (ARIA labels, keyboard navigation)
- ✅ Error handling and graceful degradation

### **Data Integration**
- ✅ Sample agricultural datasets included
- ✅ Farmers data with production metrics
- ✅ Weather data with forecasts
- ✅ Harvest records and quality information
- ✅ Disease database and prevention measures

## 🧪 Testing Guide

### Basic Chat Testing
1. Start the app: `npm run dev`
2. Open the AI assistant (bottom-right chat bubble)
3. Try these sample questions:
   - "Show me the farmers with highest production"
   - "What's the weather forecast for this week?"
   - "Analyze the harvest data and predict supply"

### Voice Testing
1. Ensure LiveKit is configured
2. Click the microphone button
3. Grant microphone permissions when prompted
4. Speak clearly and watch the transcript
5. Wait for AI response (text and voice)

### Mobile Testing
1. Use browser's mobile emulation or actual device
2. Test touch interactions
3. Verify responsive layout
4. Test keyboard navigation

### Error Testing
1. Test without API keys (should show graceful errors)
2. Test network disconnection handling
3. Test browser compatibility (Chrome, Firefox, Safari)

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with JodexAI integration
│   ├── page.tsx            # Main dashboard page
│   ├── globals.css         # Global styles
│   └── api/
│       ├── openai/
│       │   ├── chat.ts     # OpenAI chat API route
│       │   └── chat/
│       │       └── stream.ts # Streaming chat API
│       └── livekit/
│           └── token/
│               └── route.ts   # LiveKit token generation
├── components/
│   ├── DashboardHeader.tsx # Dashboard header component
│   ├── MetricsGrid.tsx     # Agricultural metrics display
│   ├── SupplyChart.tsx     # Supply visualization
│   ├── FarmerTable.tsx     # Farmers data table
│   └── WeatherAlerts.tsx   # Weather alerts component
├── lib/
│   ├── data.ts             # Sample agricultural data
│   └── utils.ts            # Utility functions
└── types/
    └── index.ts            # TypeScript definitions
```

## 🔧 Customization

### Modifying AI Behavior

The Jodex AI Assistant is configured in `src/app/layout.tsx`:

```tsx
<JodexAI
  apiUrl="/api/openai/chat"
  position="bottom-right"
  voiceEnabled={true}
  theme="system"
  datasets={{
    farmers: farmerData,
    harvests: harvestData,
    weather: weatherData,
    diseases: diseaseData,
  }}
  onAction={handleAction}
  systemPrompt="Custom system prompt here..."
/>
```

### Adding Custom Data

Update `src/lib/data.ts` to include your agricultural data:

```typescript
export const farmerData = [
  {
    farmer_id: 'F001',
    name: 'Your Farmer Name',
    location: 'Your Location',
    farm_size_ha: 10.5,
    trees_count: 2600,
    annual_production_kg: 7280,
    // ... more fields
  },
  // Add more farmers
];
```

### Custom Actions

Handle AI-triggered actions in the `onAction` callback:

```typescript
const handleAction = (action) => {
  switch(action.type) {
    case 'show_supply_forecast':
      showSupplyForecastModal(action.data);
      break;
    case 'open_farmer_profile':
      navigateToFarmer(action.data.farmer_id);
      break;
    case 'send_notification':
      showNotification(action.data.title, action.data.message);
      break;
  }
};
```

## 🐛 Troubleshooting

### Common Issues

**"API Key Invalid" Error**
- Verify your OpenAI API key is correct
- Check that billing is enabled on your OpenAI account
- Ensure the key starts with "sk-"

**Voice Features Not Working**
- Verify LiveKit server URL is correct
- Check that you're using HTTPS (required for microphone access)
- Ensure browser supports WebRTC
- Check microphone permissions

**Connection Errors**
- Verify API routes are working: test `/api/openai/chat`
- Check environment variables are properly set
- Restart the development server after changing env files

**Mobile Issues**
- Test on actual mobile devices
- Check touch targets are large enough (44px minimum)
- Verify responsive layout works correctly

### Debug Mode

Enable debug mode for detailed logging:

```env
NEXT_PUBLIC_DEBUG=true
```

This will show:
- Detailed error messages
- API request/response logs
- Browser compatibility information
- Voice feature status

## 📱 Browser Support

### **Fully Supported**
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 14+
- ✅ Edge 80+

### **Limited Support**
- ⚠️ Mobile browsers (voice features may be limited)
- ⚠️ Older browsers (no WebRTC support)

## 🚀 Deployment

### Vercel Deployment
1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically

### Manual Deployment
1. Build the application: `npm run build`
2. Set environment variables on your server
3. Start the production server: `npm start`

### Environment Variables for Production
- `NEXT_PUBLIC_OPENAI_API_KEY`
- `NEXT_PUBLIC_LIVEKIT_URL`
- `OPENAI_API_KEY`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

## 📚 Additional Resources

- [Jodex AI Assistant Documentation](../../README.md)
- [Next.js Integration Guide](../../NEXTJS_INTEGRATION_GUIDE.md)
- [LiveKit Documentation](https://docs.livekit.io/)
- [OpenAI API Documentation](https://platform.openai.com/docs)

## 🤝 Contributing

Found an issue or have a suggestion? Please:
1. Check existing issues in the repository
2. Create a new issue with detailed description
3. Include steps to reproduce any bugs

## 📄 License

This example is part of the Jodex AI Assistant project. See the main project for license information.