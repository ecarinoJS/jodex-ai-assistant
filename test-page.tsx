import React, { useState, useEffect } from 'react';
import { JodexAI } from '../src/JodexAI';
import { JodexAIProps, Message, Action, Alert, VoiceState } from '../src/types';

/**
 * Test page component for Jodex AI Assistant
 * Provides a comprehensive testing interface with security monitoring
 */
export const TestPage: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastError, setLastError] = useState<string>('');
  const [tokenInfo, setTokenInfo] = useState<{ issued?: string; expires?: string }>({});
  const [securityEvents, setSecurityEvents] = useState<Array<{ timestamp: Date; event: string; level: 'info' | 'warning' | 'error' }>>([]);

  // Test configuration - using environment variables with fallbacks
  const testConfig: Partial<JodexAIProps> = {
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || 'test-api-key',
    livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880',
    livekitToken: process.env.NEXT_PUBLIC_LIVEKIT_TOKEN, // undefined to test server-side token generation
    voiceEnabled: true,
    debugMode: true,
    position: 'fullscreen',
    title: 'Jodex AI Assistant - Test Environment',
    systemPrompt: `You are Jodex, an AI assistant for agricultural supply chain management.
This is a TEST environment. Help users test your functionality safely.`,
    instructions: 'Provide clear, concise responses for testing purposes.',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 1000,
    streaming: true,
    enableAlerts: true,
    voiceSettings: {
      enabled: true,
      autoPlay: true,
      language: 'en-US',
      rate: 1.0,
      pitch: 1.0,
    },
  };

  const addSecurityEvent = (event: string, level: 'info' | 'warning' | 'error' = 'info') => {
    setSecurityEvents(prev => [...prev.slice(-9), { timestamp: new Date(), event, level }]);
  };

  const handleReady = () => {
    setConnectionStatus('connected');
    addSecurityEvent('Jodex AI Assistant initialized successfully', 'info');
  };

  const handleError = (error: Error) => {
    setConnectionStatus('error');
    setLastError(error.message);
    addSecurityEvent(`Error: ${error.message}`, 'error');
  };

  const handleMessage = (message: Message) => {
    addSecurityEvent(`Message ${message.role}: ${message.content.substring(0, 50)}...`, 'info');
  };

  const handleAction = (action: Action) => {
    addSecurityEvent(`Action triggered: ${action.type} (${action.priority})`, 'warning');
  };

  const handleAlert = (alert: Alert) => {
    addSecurityEvent(`Alert: ${alert.title} - ${alert.message} (${alert.priority})`, 'warning');
  };

  const handleVoiceStart = () => {
    addSecurityEvent('Voice recording started', 'info');
  };

  const handleVoiceEnd = () => {
    addSecurityEvent('Voice recording ended', 'info');
  };

  // Test functions
  const testTokenRefresh = async () => {
    try {
      addSecurityEvent('Testing token refresh...', 'info');
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: 'test-room',
          participantName: 'Test User',
          participantIdentity: 'test-user-' + Date.now(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTokenInfo({
          issued: new Date().toISOString(),
          expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        });
        addSecurityEvent('Token generation test successful', 'info');
      } else {
        throw new Error('Token generation failed');
      }
    } catch (error) {
      addSecurityEvent(`Token refresh test failed: ${error}`, 'error');
    }
  };

  const testRateLimit = async () => {
    addSecurityEvent('Testing rate limiting...', 'warning');
    const promises = Array.from({ length: 15 }, (_, i) =>
      fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: `test-room-${i}`,
          participantName: `Test User ${i}`,
        }),
      })
    );

    try {
      const results = await Promise.allSettled(promises);
      const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
      addSecurityEvent(`Rate limit test: ${failures.length}/${promises.length} requests failed`, failures.length > 0 ? 'warning' : 'info');
    } catch (error) {
      addSecurityEvent(`Rate limit test error: ${error}`, 'error');
    }
  };

  const clearSecurityEvents = () => {
    setSecurityEvents([]);
    addSecurityEvent('Security events cleared', 'info');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Jodex AI Assistant - Test Environment
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Secure LiveKit Integration Testing
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500' :
                  connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
                <span className="text-sm font-medium capitalize">{connectionStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-screen pt-16">
        {/* Main Content */}
        <div className="flex-1 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border h-full">
            <JodexAI
              {...testConfig}
              onReady={handleReady}
              onError={handleError}
              onMessage={handleMessage}
              onAction={handleAction}
              onAlert={handleAlert}
              onVoiceStart={handleVoiceStart}
              onVoiceEnd={handleVoiceEnd}
            />
          </div>
        </div>

        {/* Security Panel */}
        <div className="w-80 p-4 space-y-4 overflow-y-auto">
          {/* Connection Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Connection Info</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">LiveKit URL:</span>
                <p className="text-gray-600 dark:text-gray-400 break-all">{testConfig.livekitUrl}</p>
              </div>
              <div>
                <span className="font-medium">Token Mode:</span>
                <p className="text-gray-600 dark:text-gray-400">
                  {testConfig.livekitToken ? 'Provided Token' : 'Server-Side Generation'}
                </p>
              </div>
              {tokenInfo.issued && (
                <div>
                  <span className="font-medium">Token Info:</span>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">
                    Issued: {new Date(tokenInfo.issued).toLocaleString()}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">
                    Expires: {new Date(tokenInfo.expires).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Test Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Security Tests</h3>
            <div className="space-y-2">
              <button
                onClick={testTokenRefresh}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Test Token Generation
              </button>
              <button
                onClick={testRateLimit}
                className="w-full px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
              >
                Test Rate Limiting
              </button>
              <button
                onClick={clearSecurityEvents}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              >
                Clear Events
              </button>
            </div>
          </div>

          {/* Security Events */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Security Events</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {securityEvents.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No security events yet</p>
              ) : (
                securityEvents.map((event, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded text-xs ${
                      event.level === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                      event.level === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                      'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}
                  >
                    <div className="font-medium">{event.event}</div>
                    <div className="text-xs opacity-75">
                      {event.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Error Display */}
          {lastError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-red-800">Last Error</h3>
              <p className="text-red-700 text-sm">{lastError}</p>
            </div>
          )}

          {/* Test Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-blue-800">Test Instructions</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Test voice recording by clicking the microphone</li>
              <li>• Send messages to test AI responses</li>
              <li>• Monitor security events panel</li>
              <li>• Test token generation and rate limiting</li>
              <li>• Check browser console for debug info</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;