# 📋 Complete Setup Guide for Jodex AI Assistant

This guide provides detailed step-by-step instructions for setting up the Jodex AI Assistant example application.

## 🔧 Prerequisites

### Required Software
- **Node.js** 18.0 or higher
- **npm** (comes with Node.js) or **yarn**
- **Git** for cloning the repository
- **Modern web browser** (Chrome, Firefox, Safari, or Edge)

### Optional for Voice Features
- **LiveKit server** (cloud or self-hosted)
- **HTTPS** (required for microphone access in production)

---

## 🚀 Step 1: Project Setup

### 1.1 Clone the Repository
```bash
git clone <repository-url>
cd jodex-ai-assistant
cd examples/nextjs-app
```

### 1.2 Install Dependencies
```bash
# Using npm (recommended)
npm install

# Or using yarn
yarn install
```

### 1.3 Verify Installation
Check that all dependencies are installed:
```bash
ls node_modules
```

---

## 🔑 Step 2: API Key Setup

### 2.1 OpenAI API Key (Required)

#### Creating an OpenAI Account
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Click **"Sign up"** and create an account
3. Verify your email address

#### Setting Up Billing
1. Navigate to [Billing](https://platform.openai.com/account/billing)
2. Add a payment method (credit card or bank account)
3. **Important**: OpenAI requires billing for API access, even for free tier usage

#### Creating API Keys
1. Go to [API Keys](https://platform.openai.com/api-keys)
2. Click **"Create new secret key"**
3. Give your key a descriptive name (e.g., "Jodex AI Assistant")
4. Copy the key immediately (it won't be shown again)

#### Key Format
Your API key should look like:
```
sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2.2 LiveKit Setup (Optional - for Voice Features)

#### Option A: LiveKit Cloud (Recommended for Testing)
1. Visit [LiveKit Cloud](https://cloud.livekit.io/)
2. Click **"Sign up"** and create an account
3. Create a new project
4. Copy your credentials:
   - **API Key**: `APIxxxxxxxxxx`
   - **Secret**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **WebSocket URL**: `wss://your-project-xxxx.livekit.cloud`

#### Option B: Self-Hosted LiveKit Server
1. Install Docker: [Get Docker](https://docs.docker.com/get-docker/)
2. Run LiveKit server:
   ```bash
   docker run --rm -p 7880:7880 \
     -p 7881:7881 \
     -p 7882:7882/udp \
     livekit/livekit-server \
     --dev
   ```
3. Your WebSocket URL will be: `wss://localhost:7880`

---

## ⚙️ Step 3: Environment Configuration

### 3.1 Create Environment File
```bash
# Copy the template to create your local environment file
cp .env.example .env.local
```

### 3.2 Configure Environment Variables

Edit `.env.local` with your actual API keys:

```env
# ===================================================================
# OPENAI CONFIGURATION (Required)
# ===================================================================

# Client-side OpenAI API key
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_OPENAI_KEY_HERE

# Server-side OpenAI API key (can be the same as above)
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_OPENAI_KEY_HERE

# ===================================================================
# LIVEKIT CONFIGURATION (Optional - for voice features)
# ===================================================================

# Your LiveKit WebSocket URL
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project-xxx.livekit.cloud

# LiveKit API credentials
LIVEKIT_API_KEY=APIYOUR_LIVEKIT_API_KEY_HERE
LIVEKIT_API_SECRET=YOUR_LIVEKIT_SECRET_KEY_HERE

# ===================================================================
# APPLICATION SETTINGS
# ===================================================================

# Debug mode (set to "true" for development debugging)
NEXT_PUBLIC_DEBUG=false
```

### 3.3 Verify Configuration
Check that your `.env.local` file:
- ✅ Contains actual API keys (not placeholders)
- ✅ Has no trailing spaces
- ✅ Keys are properly formatted
- ✅ File is saved in the correct directory

---

## 🧪 Step 4: Testing the Setup

### 4.1 Start Development Server
```bash
# Using npm
npm run dev

# Using yarn
yarn dev
```

### 4.2 Verify Application Loads
1. Open [http://localhost:3000](http://localhost:3000)
2. Check for the Jodex AI chat bubble (bottom-right corner)
3. Verify the dashboard loads with sample agricultural data

### 4.3 Test Basic Chat Functionality
1. Click the chat bubble to open the AI assistant
2. Try a simple message: "Hello, what can you help me with?"
3. You should see a response from the AI

### 4.4 Test Data Integration
Try these agricultural-specific questions:
- "Show me all farmers"
- "What's the weather forecast?"
- "Analyze the harvest data"
- "Tell me about common cacao diseases"

### 4.5 Test Voice Features (If Configured)
1. Click the microphone button
2. Grant microphone permissions when prompted
3. Speak clearly: "What farmers have the highest production?"
4. Watch for real-time transcription
5. Wait for AI response (text and voice)

---

## 🐛 Step 5: Troubleshooting Common Issues

### Issue: "Invalid API Key" Error
**Symptoms**: OpenAI API errors about invalid keys

**Solutions**:
1. Verify your API key is correct and starts with "sk-proj-"
2. Check that billing is enabled on your OpenAI account
3. Ensure the key is properly set in `.env.local`
4. Restart the development server after changing environment variables

### Issue: Voice Features Not Working
**Symptoms**: Microphone button is disabled or shows errors

**Solutions**:
1. Verify LiveKit server URL is correct and accessible
2. Check you're using HTTPS (required for microphone access)
3. Ensure browser supports WebRTC (Chrome, Firefox, Safari 14+, Edge 80+)
4. Check LiveKit API key and secret are correct

### Issue: "Environment Variable Not Found"
**Symptoms**: Application shows errors about missing environment variables

**Solutions**:
1. Ensure `.env.local` exists in the project root
2. Check file permissions on `.env.local`
3. Verify variable names match exactly (case-sensitive)
4. Restart development server after changes

### Issue: Build Errors
**Symptoms**: TypeScript or build compilation errors

**Solutions**:
1. Ensure all dependencies are installed: `npm install`
2. Check Node.js version: `node --version` (should be 18+)
3. Clear Next.js cache: `rm -rf .next`
4. Reinstall dependencies: `rm -rf node_modules && npm install`

### Issue: Mobile/Touch Problems
**Symptoms**: Poor mobile experience, touch targets too small

**Solutions**:
1. Test on actual mobile devices (not just emulation)
2. Check that touch targets are at least 44×44px
3. Verify responsive design works properly
4. Test with different mobile browsers

---

## 🔒 Step 6: Security Best Practices

### 6.1 Never Commit API Keys
Your `.gitignore` should include:
```
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### 6.2 Use Different Keys for Development/Production
- Create separate API keys for development and production
- Use rate limiting and usage quotas
- Regularly rotate your API keys

### 6.3 Environment Variable Security
- Never hardcode API keys in source code
- Use server-side API routes when possible
- Implement proper rate limiting in your API routes

---

## 📱 Step 7: Mobile Testing

### 7.1 Testing on Actual Devices
1. Connect your mobile device to the same WiFi network
2. Find your computer's local IP address: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Access: `http://YOUR_COMPUTER_IP:3000`

### 7.2 Mobile Browser Testing
Test on:
- **iOS**: Safari 14+
- **Android**: Chrome 80+
- **Tablets**: iPad, Android tablets

### 7.3 Responsive Testing
1. Use browser dev tools mobile emulation
2. Test different screen sizes
3. Verify touch interactions work
4. Check keyboard navigation

---

## 🚀 Step 8: Production Deployment

### 8.1 Build the Application
```bash
npm run build
```

### 8.2 Environment Variables for Production
Set these in your hosting platform:
- `NEXT_PUBLIC_OPENAI_API_KEY`
- `NEXT_PUBLIC_LIVEKIT_URL`
- `OPENAI_API_KEY`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

### 8.3 Deployment Options
- **Vercel**: Connect repository and auto-deploy
- **Netlify**: Static hosting with serverless functions
- **AWS**: S3 + Lambda + API Gateway
- **Docker**: Containerize the application

---

## ✅ Success Checklist

Before proceeding, verify:

- [ ] Node.js 18+ is installed
- [ ] Dependencies are installed: `npm install`
- [ ] `.env.local` exists with actual API keys
- [ ] Development server starts: `npm run dev`
- [ ] Application loads at http://localhost:3000
- [ ] Basic chat functionality works
- [ ] Agricultural data is displayed
- [ ] Voice features work (if configured)
- [ ] Mobile testing completed
- [ ] Security best practices followed

---

## 🆘 Need Help?

If you encounter issues:

1. **Check the console** for detailed error messages
2. **Enable debug mode**: Set `NEXT_PUBLIC_DEBUG=true`
3. **Review logs** in the terminal
4. **Test components** individually (API routes, environment, etc.)
5. **Check browser compatibility** for advanced features

### Additional Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [LiveKit Documentation](https://docs.livekit.io/)
- [Main Project README](../../README.md)

Happy coding with Jodex AI Assistant! 🎉