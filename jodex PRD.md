# **Product Requirements Document (PRD)**

## **Jodex AI Assistant**
**Package Name:** `jodex-ai-assistant`  
**Repository:** `github.com/[your-username]/jodex-ai-assistant`  
**Version:** 1.0.0  
**Distribution:** Git URL (Hackathon)

---

## **1. PRODUCT OVERVIEW**

### **1.1 Product Vision**
Jodex is an installable, voice-enabled AI assistant component for agricultural supply chain management, specifically designed for cacao farming operations. It provides conversational AI capabilities with real-time data analysis, weather-based alerts, and predictive forecasting.

### **1.2 Target Users**
- **Primary:** MSME cacao processors (e.g., Cacao de Davao)
- **Secondary:** Smallholder cacao farmers
- **Tertiary:** Agricultural cooperatives and extension services

### **1.3 Key Value Proposition**
Drop-in AI component that turns static dashboards into intelligent, conversational interfaces with voice interaction and proactive alerting capabilities.

---

## **2. PRODUCT GOALS & SUCCESS METRICS**

### **2.1 Goals**
1. **Accessibility:** Enable any Next.js app to add AI assistance in <10 minutes
2. **Intelligence:** Provide actionable insights from agricultural datasets
3. **Proactivity:** Alert users before problems occur (disease outbreaks, supply gaps)
4. **Multimodal:** Support both text chat and voice interaction
5. **Customizability:** Allow full prompt/dataset customization

### **2.2 Success Metrics**
- **Developer Experience:** Installation to first chat < 10 minutes
- **User Engagement:** Average session length > 3 minutes
- **Action Completion:** >70% of AI-suggested actions taken
- **Voice Adoption:** >40% of users try voice mode
- **Alert Effectiveness:** >80% of critical alerts acknowledged

---

## **3. FEATURES & REQUIREMENTS**

### **3.1 Core Features**

#### **Feature 1: Conversational AI Interface**
**Priority:** P0 (Must Have)

**Description:**  
Text-based chat interface with Claude AI integration for natural language queries about supply, weather, farmers, and production.

**Requirements:**
- FR-1.1: Chat input field with send button and Enter key support
- FR-1.2: Message history display (user + AI messages)
- FR-1.3: Streaming response support (show AI typing)
- FR-1.4: Message timestamps
- FR-1.5: Auto-scroll to latest message
- FR-1.6: Message persistence (session storage)

**Acceptance Criteria:**
- User can type message and receive AI response within 3 seconds
- Chat history shows last 50 messages
- Interface responsive on mobile (320px min width)

---

#### **Feature 2: Voice Interaction (LiveKit)**
**Priority:** P0 (Must Have)

**Description:**  
Voice-to-text and text-to-voice capabilities using LiveKit for hands-free operation.

**Requirements:**
- FR-2.1: Push-to-talk button for voice input
- FR-2.2: Real-time speech-to-text transcription
- FR-2.3: Text-to-speech for AI responses
- FR-2.4: Visual feedback during listening/speaking
- FR-2.5: Automatic voice activity detection
- FR-2.6: Noise cancellation (LiveKit feature)

**Acceptance Criteria:**
- Voice input accurately transcribed (>90% accuracy)
- AI response spoken within 2 seconds of completion
- Clear visual indicator of microphone state
- Works in noisy environments (farm settings)

---

#### **Feature 3: Custom Prompt System**
**Priority:** P0 (Must Have)

**Description:**  
Developers can inject custom system prompts to define AI personality and capabilities.

**Requirements:**
- FR-3.1: `systemPrompt` prop accepts string or file
- FR-3.2: Support for multi-line formatted prompts
- FR-3.3: Prompt validation and error handling
- FR-3.4: Default Jodex prompt included
- FR-3.5: Prompt hot-reloading in dev mode

**Acceptance Criteria:**
- Custom prompt applied to all AI conversations
- AI behavior matches prompt instructions
- Invalid prompts show clear error messages

---

#### **Feature 4: Dataset Integration**
**Priority:** P0 (Must Have)

**Description:**  
Inject structured data (farmers, weather, diseases) for AI to analyze and reference.

**Requirements:**
- FR-4.1: `datasets` prop accepts JSON objects
- FR-4.2: Support for CSV import (auto-parse)
- FR-4.3: Dynamic dataset updates without page reload
- FR-4.4: Dataset size limit: 5MB per dataset
- FR-4.5: Automatic data summarization for large datasets

**Data Schemas:**
```typescript
datasets: {
  farmers: Farmer[],      // farmer profiles
  harvests: Harvest[],    // historical harvest data
  weather: Weather[],     // weather forecasts
  diseases: Disease[],    // disease/pest database
  inventory: Inventory    // current stock levels
}
```

**Acceptance Criteria:**
- AI can query and analyze provided datasets
- Dataset changes reflect in AI responses immediately
- Large datasets don't cause performance degradation

---

#### **Feature 5: Action Triggering System**
**Priority:** P0 (Must Have)

**Description:**  
AI can trigger UI actions (show graphs, open pages, display alerts) via callback system.

**Requirements:**
- FR-5.1: `onAction` callback with action type and data
- FR-5.2: Predefined action types (show_forecast, show_farmers, etc.)
- FR-5.3: Custom action support
- FR-5.4: Action queue for multiple simultaneous actions
- FR-5.5: Action cancellation support

**Action Types:**
```typescript
type Action = 
  | 'show_supply_forecast'
  | 'show_farmer_list'
  | 'show_weather_alerts'
  | 'show_disease_map'
  | 'show_inventory'
  | 'open_farmer_profile'
  | 'send_notification'
  | 'custom';
```

**Acceptance Criteria:**
- Actions trigger within 100ms of AI response
- Parent app receives action with complete data payload
- Multiple actions can be queued and executed in order

---

#### **Feature 6: Proactive Alert System**
**Priority:** P1 (Should Have)

**Description:**  
AI monitors data and weather to send proactive alerts before problems occur.

**Requirements:**
- FR-6.1: Background monitoring of weather + datasets
- FR-6.2: Alert rules engine (configurable thresholds)
- FR-6.3: Priority levels (critical, high, medium, low)
- FR-6.4: Alert history and acknowledgment tracking
- FR-6.5: Snooze/dismiss functionality
- FR-6.6: Push notification support (optional)

**Alert Triggers:**
- Disease outbreak conditions (weather-based)
- Supply shortage predictions
- Inventory reorder points
- Farmer performance declines
- Optimal action windows (harvest, fertilize)

**Acceptance Criteria:**
- Critical alerts displayed within 1 minute of trigger
- Users can acknowledge or dismiss alerts
- Alert history accessible for 30 days

---

#### **Feature 7: UI Customization**
**Priority:** P1 (Should Have)

**Description:**  
Developers can customize appearance, positioning, and behavior.

**Requirements:**
- FR-7.1: Theme support (light/dark/custom)
- FR-7.2: Position options (bottom-right, sidebar, fullscreen)
- FR-7.3: Custom logo and branding
- FR-7.4: Color scheme customization
- FR-7.5: Size/dimension controls
- FR-7.6: Collapse/expand animations

**Acceptance Criteria:**
- Component matches parent app's design system
- All positions work on mobile and desktop
- Smooth animations (60fps)

---

#### **Feature 8: Mobile PWA Support**
**Priority:** P1 (Should Have)

**Description:**  
Full functionality on mobile devices with PWA installation support.

**Requirements:**
- FR-8.1: Responsive design (320px to 4K)
- FR-8.2: Touch-optimized controls
- FR-8.3: Offline mode (basic chat with cached data)
- FR-8.4: Service worker integration
- FR-8.5: App manifest support
- FR-8.6: Push notification permissions

**Acceptance Criteria:**
- Component usable with one hand on mobile
- Voice works on iOS and Android
- Installable as PWA on home screen

---

### **3.2 Non-Functional Requirements**

#### **NFR-1: Performance**
- Initial load time: <2 seconds
- Chat response time: <3 seconds (95th percentile)
- Voice latency: <500ms
- Memory usage: <50MB
- Bundle size: <100KB (gzipped)

#### **NFR-2: Security**
- API keys stored in environment variables only
- No data sent to third parties (except Claude API)
- HTTPS required for voice features
- Input sanitization (prevent injection)
- Rate limiting (10 requests/minute per user)

#### **NFR-3: Reliability**
- 99% uptime (Claude API dependent)
- Graceful degradation (voice → text fallback)
- Error recovery (automatic retry with exponential backoff)
- Offline data caching
- Connection loss handling

#### **NFR-4: Compatibility**
- Next.js: 14.0.0+
- React: 18.0.0+
- Node: 18.0.0+
- Browsers: Chrome 90+, Safari 14+, Firefox 88+
- Mobile: iOS 14+, Android 10+

---

## **4. TECHNICAL ARCHITECTURE**

### **4.1 Tech Stack**

**Frontend:**
- React 18 (component library)
- TypeScript (type safety)
- Tailwind CSS (styling)
- Framer Motion (animations)

**AI Integration:**
- OpenAI GPT-4 API
- OpenAI SDK for JavaScript
- Streaming responses

**Voice:**
- LiveKit Client SDK
- Web Audio API
- Speech Recognition API (fallback)

**Build Tools:**
- tsup (bundling)
- pnpm (package management)
- ESLint + Prettier (code quality)

**Testing:**
- Vitest (unit tests)
- Playwright (E2E tests)

### **4.2 Component Architecture**

```
jodex-ai-assistant/
├── src/
│   ├── index.tsx                 # Main export
│   ├── JodexAI.tsx              # Root component
│   ├── components/
│   │   ├── ChatInterface.tsx    # Text chat UI
│   │   ├── VoiceInterface.tsx   # Voice controls
│   │   ├── MessageList.tsx      # Chat history
│   │   ├── InputBox.tsx         # Message input
│   │   ├── AlertPanel.tsx       # Proactive alerts
│   │   └── ActionTrigger.tsx    # Action handler
│   ├── hooks/
│   │   ├── useAIChat.ts         # Chat logic
│   │   ├── useVoice.ts          # Voice logic
│   │   ├── useDatasets.ts       # Data management
│   │   └── useAlerts.ts         # Alert monitoring
│   ├── lib/
│   │   ├── openai.ts            # OpenAI API client
│   │   ├── livekit.ts           # LiveKit setup
│   │   ├── actions.ts           # Action system
│   │   └── storage.ts           # Local storage
│   ├── types/
│   │   ├── index.ts             # TypeScript types
│   │   └── datasets.ts          # Data schemas
│   └── styles/
│       └── index.css            # Component styles
├── examples/
│   └── nextjs-app/              # Demo app
├── tests/
│   ├── unit/
│   └── e2e/
├── docs/
│   ├── README.md
│   ├── API.md
│   └── EXAMPLES.md
├── package.json
├── tsconfig.json
└── README.md
```

### **4.3 Data Flow**

```
User Input (Text/Voice)
    ↓
Input Processing
    ↓
Prompt Construction (System + Datasets + User Message)
    ↓
OpenAI API Call
    ↓
Response Parsing (Message + Actions)
    ↓
    ├→ Display Message in Chat
    ├→ Speak Response (if voice mode)
    └→ Trigger Actions (onAction callback)
         ↓
    Parent App Handles Actions
```

---

## **5. API SPECIFICATION**

### **5.1 Component Props**

```typescript
interface JodexAIProps {
  // Required
  apiKey: string;                    // OpenAI API key
  livekitUrl: string;                // LiveKit server URL
  livekitToken: string;              // LiveKit access token
  
  // Customization
  systemPrompt?: string;             // AI personality/instructions
  instructions?: string;             // Additional context
  datasets?: {                       // Structured data
    farmers?: Farmer[];
    harvests?: Harvest[];
    weather?: Weather[];
    diseases?: Disease[];
    inventory?: Inventory;
    [key: string]: any;              // Custom datasets
  };
  
  // UI Configuration
  theme?: 'light' | 'dark' | Theme;  // Visual theme
  position?: 'bottom-right' | 'sidebar' | 'fullscreen' | 'custom';
  logo?: string;                     // Logo image URL
  collapsed?: boolean;               // Initial collapsed state
  voiceEnabled?: boolean;            // Enable voice features
  
  // Callbacks
  onAction?: (action: Action, data: any) => void;
  onMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
  onReady?: () => void;
  
  // Advanced
  streaming?: boolean;               // Stream AI responses
  maxMessages?: number;              // Chat history limit
  retryAttempts?: number;            // API retry count
  rateLimitPerMinute?: number;       // Rate limiting
}
```

### **5.2 Dataset Schemas**

```typescript
// Farmer Profile
interface Farmer {
  farmer_id: string;
  name: string;
  location: string;
  contact: string;
  farm_size_ha: number;
  trees_count: number;
  trees_per_ha: number;
  farming_experience_years: number;
  cooperative?: string;
  avg_yield_per_tree_kg: number;
  annual_production_kg: number;
  primary_buyer: string;
  has_fermentation_facility: boolean;
  preferred_contact: 'SMS' | 'WhatsApp' | 'Phone Call';
  reliability_score?: number;
}

// Harvest Record
interface Harvest {
  farmer_id: string;
  harvest_date: string;
  beans_kg: number;
  quality_grade: 'A' | 'B' | 'C';
  price_per_kg: number;
  total_value: number;
  notes?: string;
}

// Weather Data
interface Weather {
  date: string;
  temperature_min: number;
  temperature_max: number;
  humidity: number;
  rainfall_mm: number;
  forecast?: {
    next_7_days: WeatherForecast[];
  };
}

// Disease/Pest Entry
interface Disease {
  id: string;
  name: string;
  scientific_name: string;
  type: 'fungal_disease' | 'insect_pest';
  severity: 'critical' | 'high' | 'medium' | 'low';
  parts_affected: string[];
  symptoms: string[];
  seasonal_pattern: {
    peak_months: string[];
    low_months: string[];
    weather_trigger: string;
  };
  prevention_measures: PreventionMeasure[];
}

// Inventory Status
interface Inventory {
  current_stock_kg: number;
  daily_usage_rate: number;
  safety_stock_kg: number;
  reorder_point_kg: number;
  last_updated: string;
}
```

### **5.3 Action Types**

```typescript
type Action = {
  type: 'show_supply_forecast'
    | 'show_farmer_list'
    | 'show_weather_alerts'
    | 'show_disease_map'
    | 'show_inventory'
    | 'open_farmer_profile'
    | 'send_notification'
    | 'custom';
  data: any;
  priority: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
};
```

---

## **6. INSTALLATION & USAGE**

### **6.1 Installation**

```bash
# Install via Git URL
npm install git+https://github.com/[username]/jodex-ai-assistant.git

# Or clone and install locally
git clone https://github.com/[username]/jodex-ai-assistant.git
cd jodex-ai-assistant
npm install
npm run build
npm link
```

### **6.2 Basic Usage**

```tsx
import { JodexAI } from 'jodex-ai-assistant';
import 'jodex-ai-assistant/dist/styles.css';

export default function Dashboard() {
  const handleAction = (action, data) => {
    console.log('AI Action:', action, data);

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

### **6.3 Custom Prompt Example**

```typescript
const customPrompt = `
You are Jodex, the AI assistant for CacaoSense.
Your role is to help cacao farmers and processors.

When users ask about supply, analyze the harvest data.
When users ask about weather, check for disease risks.
Always be proactive and suggest preventive actions.
`;

<JodexAI
  systemPrompt={customPrompt}
  // ... other props
/>
```

---

## **7. DEVELOPMENT ROADMAP**

### **7.1 Phase 1: MVP (Hackathon - 3 Days)**
**Goal:** Working demo with core features

**Day 1:**
- [ ] Project setup and boilerplate
- [ ] Basic chat interface (text only)
- [ ] Claude API integration
- [ ] Dataset injection system
- [ ] Simple action triggering

**Day 2:**
- [ ] LiveKit voice integration
- [ ] UI styling and animations
- [ ] Alert system basics
- [ ] Example Next.js app
- [ ] Basic testing

**Day 3:**
- [ ] Bug fixes and polish
- [ ] Documentation (README, API docs)
- [ ] Demo preparation
- [ ] Git repository setup
- [ ] Installation testing

### **7.2 Phase 2: Post-Hackathon (1-2 Weeks)**
- [ ] Comprehensive testing suite
- [ ] Performance optimizations
- [ ] Error handling improvements
- [ ] Offline mode implementation
- [ ] PWA features
- [ ] NPM package publishing

### **7.3 Phase 3: Production Ready (1 Month)**
- [ ] Advanced alert rules engine
- [ ] Multi-language support
- [ ] Analytics integration
- [ ] A/B testing framework
- [ ] Enterprise features (SSO, audit logs)
- [ ] Scaling optimizations

---

## **8. TESTING STRATEGY**

### **8.1 Unit Tests**
- Component rendering
- Hook logic
- Data processing functions
- API client methods
- Action triggering system

### **8.2 Integration Tests**
- Chat flow (user input → AI response)
- Voice flow (speech → text → AI → speech)
- Dataset updates
- Action callbacks
- Alert triggering

### **8.3 E2E Tests**
- Complete user journeys
- Voice interaction scenarios
- Multi-device testing
- Error scenarios
- Performance benchmarks

### **8.4 Manual Testing Checklist**
- [ ] Chat works on desktop
- [ ] Chat works on mobile
- [ ] Voice works in quiet environment
- [ ] Voice works in noisy environment
- [ ] Alerts display correctly
- [ ] Actions trigger parent app changes
- [ ] Custom prompts work
- [ ] Dataset updates reflect in AI
- [ ] Theme customization works
- [ ] All positions work (bottom-right, sidebar, etc.)

---

## **9. DOCUMENTATION REQUIREMENTS**

### **9.1 README.md**
- Project overview
- Quick start guide
- Installation instructions
- Basic usage examples
- Configuration options
- Contributing guidelines

### **9.2 API.md**
- Complete props reference
- Dataset schemas
- Action types
- Callback signatures
- TypeScript types
- Error codes

### **9.3 EXAMPLES.md**
- Basic implementation
- Custom prompt examples
- Advanced use cases
- Integration patterns
- Troubleshooting

### **9.4 CHANGELOG.md**
- Version history
- Breaking changes
- New features
- Bug fixes
- Migration guides

---

## **10. SUCCESS CRITERIA**

### **10.1 Hackathon Demo Success**
- [ ] Component installs in <5 minutes
- [ ] Chat responds to queries in <3 seconds
- [ ] Voice works reliably in demo
- [ ] AI provides accurate supply forecasts
- [ ] Actions trigger dashboard changes
- [ ] Proactive alerts display
- [ ] Judges understand the value proposition
- [ ] Demo runs without crashes

### **10.2 Post-Hackathon Success**
- [ ] 10+ GitHub stars
- [ ] 5+ developers test the package
- [ ] Positive feedback on ease of use
- [ ] At least 1 production deployment
- [ ] Clear documentation
- [ ] Active issue resolution

---

## **11. RISK MITIGATION**

### **11.1 Technical Risks**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| OpenAI API downtime | High | Low | Implement retry logic, cache responses |
| LiveKit connection issues | High | Medium | Fallback to text-only mode |
| Large dataset performance | Medium | High | Dataset size limits, pagination |
| Mobile compatibility | Medium | Medium | Extensive mobile testing |
| Bundle size too large | Low | Medium | Code splitting, tree shaking |

### **11.2 Project Risks**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Time constraints (3 days) | High | High | Clear MVP scope, cut non-essential features |
| API key exposure | High | Medium | Environment variable validation |
| Poor documentation | Medium | Medium | Documentation-driven development |
| Complex installation | High | Low | Automated setup scripts |

---

## **12. SUPPORT & MAINTENANCE**

### **12.1 Support Channels**
- GitHub Issues (bug reports, feature requests)
- GitHub Discussions (Q&A, community support)
- Email: support@cacaosense.com
- Discord community (post-hackathon)

### **12.2 Maintenance Plan**
- **Weekly:** Issue triage and response
- **Bi-weekly:** Dependency updates
- **Monthly:** Performance review and optimization
- **Quarterly:** Major feature releases

---

## **13. APPENDICES**

### **13.1 Glossary**
- **MSME:** Micro, Small, and Medium Enterprises
- **CPB:** Cacao Pod Borer
- **BPR:** Black Pod Rot
- **VSD:** Vascular Streak Dieback
- **NDVI:** Normalized Difference Vegetation Index
- **PWA:** Progressive Web App

### **13.2 References**
- OpenAI API Documentation: https://platform.openai.com/docs
- LiveKit Documentation: https://docs.livekit.io
- Next.js Documentation: https://nextjs.org/docs
- Cacao Disease Research: [Academic sources]

### **13.3 Contributors**
- Product Owner: [Your Name]
- Lead Developer: [Your Name]
- AI Integration: [Your Name]
- Voice Features: [Your Name]
- Documentation: [Your Name]

---

**Document Version:** 1.0.0  
**Last Updated:** November 19, 2024  
**Status:** Draft → Review → Approved → In Development