# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jodex AI Assistant is a voice-enabled AI assistant component designed for agricultural supply chain management, specifically for cacao farming operations. It's built as a React component library with TypeScript, integrating OpenAI for AI capabilities and LiveKit for voice features.

## Development Commands

```bash
# Install dependencies
npm install

# Start development with watch mode
npm run dev

# Build the package (JS + CSS)
npm run build
npm run build:js    # Build JavaScript only
npm run build:css   # Build CSS only

# Run tests
npm test            # Run all tests
npm run test:ui     # Run tests with UI

# Linting and type checking
npm run lint        # Check for lint issues
npm run lint:fix    # Fix lint issues automatically
npm run type-check  # TypeScript type checking without emit
```

## Architecture Overview

### Component Structure
- **Main Component**: `src/JodexAI.tsx` - The primary React component that orchestrates all functionality
- **State Management**: Uses Zustand for component state with a centralized store
- **UI Components**: Modular components in `src/components/` for ChatInterface, VoiceInterface, and AlertPanel

### Core Libraries
- **OpenAI Integration**: `src/lib/openai.ts` - Handles chat completions and streaming
- **LiveKit Voice**: `src/lib/livekit.ts` - Manages real-time voice communication
- **Action System**: `src/lib/actions.ts` - Processes AI-triggered actions
- **Storage**: `src/lib/storage.ts` - Local storage for messages and settings

### Key Features
- Voice & text chat with streaming responses
- Agricultural dataset integration (farmers, harvest, weather data)
- Action system for AI to trigger UI callbacks
- Real-time alerts with configurable rules
- Multiple positioning modes and theme support
- PWA-compatible with mobile-first design

### Testing Setup
- **Test Runner**: Vitest with jsdom environment
- **Test Utils**: React Testing Library for component testing
- **Coverage**: v8 provider with text, json, and html reporters
- **Security Tests**: Dedicated security test suite in `src/__tests__/security/`

### Build System
- **Bundler**: tsup for dual CJS/ESM builds with TypeScript declarations
- **CSS Processing**: PostCSS with Tailwind CSS
- **Path Aliases**: `@/*` points to `src/*`, `@lib`, `@components`, `@types` configured

### Dataset Integration
The component accepts structured agricultural data through the `datasets` prop:
- Farmer data with location, farm size, production metrics
- Weather data with forecasts and disease risk indicators
- Harvest data with quality grades and pricing
- Custom datasets can be added via the flexible Datasets interface

### Voice Implementation
Two voice integration modes:
1. **Server-side token generation** (recommended): Secure token endpoint
2. **Legacy direct token**: Pass LiveKit token directly (less secure)

The VoiceConnection class handles WebRTC connections, transcription, and audio playback.

## Development Notes

- TypeScript strict mode enabled with comprehensive type definitions
- Component supports React 18+ with peer dependencies
- CSS is built separately and must be imported by consuming applications
- All external dependencies (React, OpenAI, LiveKit) are marked as external in builds
- Error boundaries and comprehensive error handling throughout