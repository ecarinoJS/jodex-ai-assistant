# Jodex AI Assistant

Voice-enabled AI assistant component for agricultural supply chain management, specifically designed for cacao farming operations.

![Version](https://img.shields.io/pnpm/v/jodex-ai-assistant)
![License](https://img.shields.io/pnpm/l/jodex-ai-assistant)
![TypeScript](https://img.shields.io/badge/TypeScript-blue)

## ✨ Features

- 🗣️ **Voice & Text Chat**: Natural language interaction with voice-to-text and text-to-speech
- 🤖 **OpenAI Integration**: Powered by GPT-4 for intelligent agricultural insights
- 📊 **Dataset Integration**: Inject structured data for AI analysis (farmers, weather, harvest, disease data)
- 🎯 **Action System**: AI can trigger UI actions and callbacks to parent applications
- 🚨 **Proactive Alerts**: Weather-based disease risk and supply shortage alerts
- 🎨 **Customizable UI**: Multiple themes, positions, and styling options
- 📱 **Mobile-First**: Responsive design with PWA support
- 🔧 **Drop-in Component**: Install in any Next.js app in under 10 minutes

## 🚀 Quick Start

### Installation

```bash
pnpm install jodex-ai-assistant
```

### Basic Usage

```tsx
import { JodexAI } from 'jodex-ai-assistant';
import 'jodex-ai-assistant/dist/styles.css';

export default function Dashboard() {
  const handleAction = (action) => {
    console.log('AI Action:', action);

    switch(action.type) {
      case 'show_supply_forecast':
        // Navigate to forecast page or show modal
        break;
      case 'show_farmer_list':
        // Display farmer list
        break;
    }
  };

  return (
    <div>
      <YourDashboard />

      <JodexAI
        apiKey={process.env.NEXT_PUBLIC_OPENAI_API_KEY}
        livekitUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        livekitToken={process.env.NEXT_PUBLIC_LIVEKIT_TOKEN}
        datasets={{
          farmers: farmerData,
          harvests: harvestData,
          weather: weatherData
        }}
        onAction={handleAction}
        theme="dark"
        position="bottom-right"
        voiceEnabled={true}
      />
    </div>
  );
}
```

## 📋 Environment Variables

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com
NEXT_PUBLIC_LIVEKIT_TOKEN=your_livekit_token
```

## 🎯 Configuration

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `apiKey` | `string` | OpenAI API key |
| `livekitUrl` | `string` | LiveKit server URL for voice features |
| `livekitToken` | `string` | LiveKit access token |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `systemPrompt` | `string` | Default prompt | Custom AI personality and instructions |
| `datasets` | `Datasets` | `{}` | Structured agricultural data |
| `theme` | `Theme \| ThemeMode` | `'system'` | Visual theme configuration |
| `position` | `PositionType` | `'bottom-right'` | Chat widget positioning |
| `voiceEnabled` | `boolean` | `true` | Enable voice features |
| `onAction` | `function` | `undefined` | Action callback handler |
| `onMessage` | `function` | `undefined` | Message callback handler |
| `onError` | `function` | `undefined` | Error callback handler |

## 📊 Dataset Integration

### Farmer Data

```typescript
const farmers = [
  {
    farmer_id: 'F001',
    name: 'Maria Santos',
    location: 'Davao City',
    farm_size_ha: 5.2,
    trees_count: 1300,
    annual_production_kg: 3640,
    // ... more fields
  }
];
```

### Weather Data

```typescript
const weather = [
  {
    date: '2024-02-01',
    temperature_min: 24,
    temperature_max: 32,
    humidity: 78,
    rainfall_mm: 12,
    forecast: {
      next_7_days: [...]
    }
  }
];
```

### Harvest Data

```typescript
const harvests = [
  {
    farmer_id: 'F001',
    harvest_date: '2024-01-15',
    beans_kg: 320,
    quality_grade: 'A',
    price_per_kg: 180,
    total_value: 57600
  }
];
```

## 🎨 UI Customization

### Themes

```tsx
// Built-in themes
<JodexAI theme="light" />
<JodexAI theme="dark" />
<JodexAI theme="system" />

// Custom theme
<JodexAI theme={{
  mode: 'dark',
  primaryColor: '#22c55e',
  backgroundColor: '#0f172a',
  customCSS: `
    .jodex-chat-container {
      border-radius: 16px;
    }
  `
}} />
```

### Positioning

```tsx
<JodexAI position="bottom-right" />
<JodexAI position="bottom-left" />
<JodexAI position="sidebar" />
<JodexAI position="fullscreen" />
```

## 🔧 Action System

The AI can trigger actions in your application:

```typescript
const handleAction = (action) => {
  switch(action.type) {
    case 'show_supply_forecast':
      showSupplyModal(action.data);
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

### Built-in Action Types

- `show_supply_forecast` - Display supply predictions
- `show_farmer_list` - Show farmer directory
- `show_weather_alerts` - Display weather-based alerts
- `show_disease_map` - Show disease risk information
- `show_inventory` - Display current inventory
- `open_farmer_profile` - Show specific farmer details
- `send_notification` - Send notification message
- `custom` - Custom actions

## 🎤 Voice Features

### LiveKit Setup

1. Set up a LiveKit server
2. Generate access tokens
3. Configure the component

```tsx
<JodexAI
  voiceEnabled={true}
  voiceSettings={{
    language: 'en-US',
    autoPlay: true,
    rate: 1.0,
    pitch: 1.0
  }}
  onVoiceStart={() => console.log('Recording started')}
  onVoiceEnd={() => console.log('Recording ended')}
/>
```

## 🔍 Examples

### Custom System Prompt

```tsx
const customPrompt = `
You are Jodex, the AI assistant for CacaoSense.
Your role is to help cacao farmers and processors.

When users ask about supply, analyze the harvest data.
When users ask about weather, check for disease risks.
Always be proactive and suggest preventive actions.
`;

<JodexAI systemPrompt={customPrompt} />
```

### Advanced Configuration

```tsx
<JodexAI
  apiKey={process.env.NEXT_PUBLIC_OPENAI_API_KEY}
  model="gpt-4-turbo-preview"
  temperature={0.7}
  maxTokens={2000}
  streaming={true}
  retryAttempts={3}
  rateLimitPerMinute={10}
  enableAlerts={true}
  debugMode={process.env.NODE_ENV === 'development'}
/>
```

## 🏗️ Architecture

```
jodex-ai-assistant/
├── src/
│   ├── JodexAI.tsx              # Main component
│   ├── components/
│   │   ├── ChatInterface.tsx    # Chat UI
│   │   ├── VoiceInterface.tsx   # Voice controls
│   │   └── AlertPanel.tsx       # Alert system
│   ├── lib/
│   │   ├── openai.ts            # OpenAI client
│   │   ├── livekit.ts           # Voice client
│   │   ├── actions.ts           # Action system
│   │   └── storage.ts           # Local storage
│   ├── types/                   # TypeScript definitions
│   └── styles/                  # CSS styles
└── examples/
    └── nextjs-app/              # Demo application
```

## 🧪 Development

```bash
# Clone the repository
git clone https://github.com/[username]/jodex-ai-assistant.git
cd jodex-ai-assistant

# Install dependencies
pnpm install

# Start development
pnpm run dev

# Build the package
pnpm run build

# Run tests
pnpm test

# Run demo app
cd examples/nextjs-app
pnpm install
pnpm run dev
```

## 📚 API Reference

### Types

```typescript
interface JodexAIProps {
  // Required
  apiKey: string;
  livekitUrl: string;
  livekitToken: string;

  // AI Configuration
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;

  // Data Integration
  datasets?: Datasets;

  // UI Configuration
  theme?: Theme | ThemeMode;
  position?: PositionType;
  voiceEnabled?: boolean;

  // Callbacks
  onAction?: (action: Action) => void;
  onMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
}
```

### Datasets

```typescript
interface Datasets {
  farmers?: Farmer[];
  harvests?: Harvest[];
  weather?: Weather[];
  diseases?: Disease[];
  inventory?: Inventory;
  [key: string]: any; // Custom datasets
}
```

## 🔧 Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure your OpenAI API key is valid and has sufficient credits
2. **Voice Not Working**: Check LiveKit server URL and token validity
3. **Styles Not Loading**: Import the CSS file: `import 'jodex-ai-assistant/dist/styles.css'`
4. **TypeScript Errors**: Ensure you're using TypeScript 4.5+ and React 18+

### Debug Mode

Enable debug mode to see detailed logging:

```tsx
<JodexAI debugMode={true} />
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/[username]/jodex-ai-assistant/issues)
- **Discussions**: [Community support and Q&A](https://github.com/[username]/jodex-ai-assistant/discussions)
- **Email**: support@jodex-ai.com

## 🌟 Acknowledgments

- Built with [OpenAI](https://openai.com/) for intelligent conversations
- Voice features powered by [LiveKit](https://livekit.io/)
- UI components with [Tailwind CSS](https://tailwindcss.com/)
- Animations by [Framer Motion](https://framer.com/motion/)

---

**Jodex AI Assistant** - Making agricultural supply chains smarter, one conversation at a time. 🚜🤖
