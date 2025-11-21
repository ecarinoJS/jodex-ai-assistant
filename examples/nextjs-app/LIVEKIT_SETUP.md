# 🎤 LiveKit Setup Guide for Jodex AI Assistant

This guide covers setting up LiveKit for voice features in the Jodex AI Assistant. LiveKit enables real-time voice communication with WebRTC.

## 🌟 Why LiveKit?

LiveKit provides:
- ✅ Real-time audio/video streaming
- ✅ WebRTC-based communication
- ✅ Scalable infrastructure
- ✅ End-to-end encryption
- ✅ Cross-platform support

## 🚀 Quick Setup Options

### Option 1: LiveKit Cloud (Recommended for Testing)
**Best for**: Development, testing, small projects
- Free tier available
- No server maintenance
- Quick setup
- [Get Started](https://cloud.livekit.io/)

### Option 2: Self-Hosted Server
**Best for**: Production, custom requirements, cost control
- Full control over infrastructure
- No third-party dependencies
- Custom configuration
- Requires server management

---

## ☁️ Option 1: LiveKit Cloud Setup

### Step 1: Create LiveKit Cloud Account
1. Visit [LiveKit Cloud](https://cloud.livekit.io/)
2. Click **"Sign up"**
3. Verify your email address
4. Complete the registration process

### Step 2: Create a New Project
1. In your LiveKit Cloud dashboard, click **"New Project"**
2. Enter a project name (e.g., "Jodex AI Assistant")
3. Choose a region closest to your users
4. Click **"Create Project"**

### Step 3: Get Your Credentials
After creating your project, you'll see:
- **WebSocket URL**: `wss://your-project-xxx.livekit.cloud`
- **API Key**: `APIxxxxxxxxxxxxxxxxxx`
- **Secret**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**Save these credentials securely!**

### Step 4: Configure Environment Variables
Add these to your `.env.local` file:

```env
# LiveKit Cloud Configuration
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project-xxx.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 5: Test the Setup
1. Start your application: `npm run dev`
2. Open the Jodex AI Assistant
3. Click the microphone button
4. Grant microphone permissions
5. Try voice input

---

## 🏠 Option 2: Self-Hosted LiveKit Server

### Prerequisites
- **Docker** (recommended) or **Go** 1.19+
- **Server** with public IP address
- **Domain name** (recommended for HTTPS)
- **HTTPS certificate** (required for production)

### Option 2A: Docker Setup (Recommended)

#### Step 1: Create Docker Compose File
Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  livekit:
    image: livekit/livekit-server:latest
    restart: unless-stopped
    network_mode: host
    ports:
      - "7880:7880"   # HTTP port
      - "7881:7881"   # WebSocket port
      - "7882:7882/udp" # WebRTC UDP port
      - "7883:7883/udp" # WebRTC UDP port
    volumes:
      - ./livekit.yaml:/livekit.yaml
    environment:
      - LIVEKIT_KEYS=your-api-key:your-secret-key
```

#### Step 2: Create LiveKit Configuration
Create `livekit.yaml`:

```yaml
# LiveKit Server Configuration
port: 7880
rtc:
  udp_port: 7882
  tcp_port: 7883
  use_external_ip: true

redis:
  address: localhost:6379
  db: 0
  username: ""
  password: ""

keys:
  - key_id: your-api-key
    api_key: your-api-key
    api_secret: your-secret-key

room:
  auto_create_subrooms: true
  empty_timeout: 300s

webhook:
  url: ""
  api_key: ""
```

#### Step 3: Start LiveKit Server
```bash
# Start with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f livekit
```

#### Step 4: Configure Environment Variables
Update your `.env.local`:

```env
# Self-hosted LiveKit
NEXT_PUBLIC_LIVEKIT_URL=wss://your-server-domain.com:7881
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-secret-key
```

### Option 2B: Manual Installation

#### Step 1: Install LiveKit Server
```bash
# Download LiveKit
curl -s https://get.livekit.io/install.sh | bash

# Or download binary directly
wget https://github.com/livekit/livekit/releases/latest/download/livekit-server-darwin-amd64
chmod +x livekit-server-darwin-amd64
```

#### Step 2: Generate Configuration
```bash
# Generate default config
./livekit-server-darwin-amd64 generate-config --keys

# This will create livekit.yaml with random keys
```

#### Step 3: Start the Server
```bash
# Start with configuration file
./livekit-server-darwin-amd64 --config livekit.yaml
```

#### Step 4: Configure for Production
Update `livekit.yaml` for production:

```yaml
# Production configuration
port: 7880
rtc:
  udp_port: 7882
  tcp_port: 7883
  use_external_ip: true
  external_ip: YOUR_PUBLIC_IP

# Use Redis for scalability
redis:
  address: redis-server:6379
  db: 0

# Your generated keys from step 2
keys:
  - key_id: APIxxxxxxxxx
    api_key: APIxxxxxxxxx
    api_secret: YOUR_SECRET_KEY_HERE

# HTTPS configuration (recommended)
http_port: 7880
http_port_insecure: 7881

# Logging
log_level: info
log_level_pretty: info
```

---

## 🔒 Security Configuration

### TLS/HTTPS Setup (Required for Production)

#### Using Let's Encrypt (Recommended)
```bash
# Install certbot
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com

# Convert for LiveKit
sudo openssl pkcs12 -export \
  -out /etc/letsencrypt/live/your-domain.com/livekit.p12 \
  -inkey /etc/letsencrypt/live/your-domain.com/privkey.pem \
  -in /etc/letsencrypt/live/your-domain.com/cert.pem \
  -certfile /etc/letsencrypt/live/your-domain.com/chain.pem
```

#### Update Configuration
Add to `livekit.yaml`:

```yaml
# TLS Configuration
key_file: /path/to/private.key
cert_file: /path/to/certificate.crt
```

### API Key Security
1. **Use strong, unique API keys**
2. **Rotate keys regularly**
3. **Use different keys for development/production**
4. **Store keys securely** (environment variables, secret managers)

### Firewall Configuration
Allow these ports:
- `7880` - HTTP API
- `7881` - WebSocket (insecure)
- `7882/udp` - WebRTC UDP
- `7883/udp` - WebRTC UDP

```bash
# Example Ubuntu/Debian firewall rules
sudo ufw allow 7880/tcp
sudo ufw allow 7881/tcp
sudo ufw allow 7882/udp
sudo ufw allow 7883/udp
```

---

## 🧪 Testing Your LiveKit Setup

### 1. Test WebSocket Connection
```bash
# Test WebSocket connection
wscat -c wss://your-livekit-server.com:7881

# You should see: {"type":"hello","server":{"id":"...","version":"..."}}
```

### 2. Test API Connection
```bash
# Test API endpoint
curl -X POST http://your-livekit-server.com:7880/twilioAPI/video/rooms \
  -H "Authorization: Bearer YOUR_API_KEY:YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"name":"test-room"}'
```

### 3. Test with Jodex AI Assistant
1. Start your Next.js app: `npm run dev`
2. Click the microphone button
3. Check browser console for LiveKit connection logs
4. Verify voice recording works

### 4. Monitor LiveKit Dashboard
If using LiveKit Cloud:
- Check real-time metrics
- Monitor room usage
- Review connection logs
- Track bandwidth usage

---

## 🔧 Advanced Configuration

### Custom Room Settings
```javascript
// In your Jodex AI component
const voiceConnection = new VoiceConnection({
  url: 'wss://your-livekit-server.com',
  roomName: 'jodex-ai-room-' + Date.now(),
  participantName: 'User-' + Math.random().toString(36).substr(2, 9),
});
```

### Room Permissions
```yaml
# In livekit.yaml
room:
  auto_create_subrooms: true
  enabled_codecs:
    - audio
    - video
    - data
  max_participants: 10
  empty_timeout: 300s
```

### Redis Configuration (for scaling)
```yaml
# In livekit.yaml
redis:
  address: redis-cluster.example.com:6379
  db: 1
  username: livekit
  password: your-redis-password
  use_tls: true
```

---

## 📱 Mobile Considerations

### iOS Safari
- Requires user interaction to start audio
- May need manual microphone permission
- Works best with HTTPS

### Android Chrome
- Generally works well with HTTPS
- May require recent Chrome version
- Microphone permissions needed

### Progressive Web App (PWA)
- Add to home screen for better experience
- Test on actual devices, not just emulation
- Consider manifest configuration for permissions

---

## 🚨 Troubleshooting

### Common Issues

**"WebSocket connection failed"**
- Check firewall settings
- Verify server is running
- Confirm correct port (7881 for WebSocket)
- Check for HTTPS issues

**"Microphone not working"**
- Ensure HTTPS is enabled
- Check browser permissions
- Verify WebRTC support
- Test with different browsers

**"No voice transcription"**
- Check LiveKit room connection
- Verify audio track publishing
- Check server logs for errors
- Test with different microphones

**"High latency"**
- Check server location
- Verify network connectivity
- Consider WebRTC ICE configuration
- Monitor bandwidth usage

### Debug Mode
Enable LiveKit debugging:

```javascript
// In browser console
localStorage.setItem('lk-debug', 'true');

// Or in your code
localStorage.setItem('lk-debug', 'true');
```

### Log Analysis
Check LiveKit server logs:

```bash
# Docker logs
docker logs livekit-server

# Or if running binary
tail -f /var/log/livekit.log
```

---

## 📈 Scaling Considerations

### Multiple Servers
- Use Redis for session sharing
- Load balance with nginx or HAProxy
- Consider geographic distribution

### Performance Optimization
- Enable UDP for WebRTC
- Use CDN for static assets
- Monitor bandwidth usage
- Implement connection pooling

### Monitoring
- Track room usage
- Monitor participant connections
- Set up alerts for errors
- Log performance metrics

---

## 🔄 Maintenance

### Regular Tasks
- Rotate API keys monthly
- Update LiveKit server regularly
- Monitor disk space and bandwidth
- Review security logs
- Backup configuration

### Updates
```bash
# Update LiveKit Docker image
docker-compose pull livekit/livekit-server:latest
docker-compose up -d

# Update binary installation
curl -s https://get.livekit.io/install.sh | bash
```

---

## ✅ Setup Verification

After completing setup, verify:

- [ ] LiveKit server is running and accessible
- [ ] WebSocket connection works (`wss://server:7881`)
- [ ] API endpoints respond correctly
- [ ] Jodex AI Assistant connects to LiveKit
- [ ] Microphone permission is granted
- [ ] Voice recording and playback work
- [ ] Multiple browsers can connect simultaneously
- [ ] Security measures are in place (HTTPS, API keys)

Your Jodex AI Assistant is now ready with full voice capabilities! 🎉

---

## 📚 Additional Resources

- [LiveKit Documentation](https://docs.livekit.io/)
- [WebRTC Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Next.js Integration](../README.md)
- [Main Project Documentation](../../README.md)