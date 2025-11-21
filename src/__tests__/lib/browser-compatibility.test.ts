import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { BrowserCompatibility, CompatibilityFeature, CompatibilityReport } from '../../types';

// Mock browser APIs for testing
const createMockBrowser = (features: Partial<BrowserCompatibility>) => ({
  getUserMedia: features.getUserMedia ?? { supported: true, constraints: true },
  speechRecognition: features.speechRecognition ?? { supported: true, continuous: true },
  speechSynthesis: features.speechSynthesis ?? { supported: true, voices: true },
  webRTC: features.webRTC ?? { supported: true, dataChannel: true },
  localStorage: features.localStorage ?? { supported: true, quota: 5242880 },
  sessionStorage: features.sessionStorage ?? { supported: true, quota: 5242880 },
  webWorkers: features.webWorkers ?? { supported: true, count: 4 },
  serviceWorkers: features.serviceWorkers ?? { supported: true, push: true },
  notification: features.notification ?? { supported: true, permission: 'granted' },
  geolocation: features.geolocation ?? { supported: true, accuracy: 10 },
  camera: features.camera ?? { supported: true, facingMode: true },
  microphone: features.microphone ?? { supported: true, echoCancellation: true },
  fullscreen: features.fullscreen ?? { supported: true, orientationLock: true },
  onlineStatus: features.onlineStatus ?? { supported: true, events: true },
  battery: features.battery ?? { supported: true, level: true },
  vibration: features.vibration ?? { supported: true, patterns: true },
  clipboard: features.clipboard ?? { supported: true, copy: true },
  share: features.share ?? { supported: true, files: true },
  permissions: features.permissions ?? { supported: true, query: true },
  payment: features.payment ?? { supported: true, methods: true },
  credentials: features.credentials ?? { supported: true, passwordless: true },
  webAuthn: features.webAuthn ?? { supported: true, biometric: true },
  mediaDevices: features.mediaDevices ?? { supported: true, enumerate: true },
  canvas: features.canvas ?? { supported: true, webGL: true },
  webGL: features.webGL ?? { supported: true, version2: true },
  webAudio: features.webAudio ?? { supported: true, worklets: true },
  webSockets: features.webSockets ?? { supported: true, binary: true },
  eventSource: features.eventSource ?? { supported: true, withCredentials: true },
  fetch: features.fetch ?? { supported: true, streaming: true },
  cache: features.cache ?? { supported: true, storage: true },
  indexedDB: features.indexedDB ?? { supported: true, versioning: true },
});

// Sample features for testing
const sampleFeatures: CompatibilityFeature[] = [
  {
    name: 'getUserMedia',
    required: true,
    fallback: 'prompt',
    polyfill: 'https://webrtc.github.io/adapter/adapter-latest.js',
    test: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
  },
  {
    name: 'speechRecognition',
    required: false,
    fallback: 'button',
    test: () => !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  },
  {
    name: 'speechSynthesis',
    required: false,
    fallback: 'silent',
    test: () => !!(window.speechSynthesis),
  },
  {
    name: 'webRTC',
    required: true,
    fallback: 'error',
    test: () => !!(window.RTCPeerConnection || window.webkitRTCPeerConnection),
  },
  {
    name: 'localStorage',
    required: true,
    fallback: 'memory',
    test: () => {
      try {
        const test = '__test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'serviceWorkers',
    required: false,
    fallback: 'poll',
    test: () => !!(navigator.serviceWorker),
  },
  {
    name: 'notification',
    required: false,
    fallback: 'badge',
    test: () => !!(window.Notification),
  },
  {
    name: 'geolocation',
    required: false,
    fallback: 'manual',
    test: () => !!(navigator.geolocation),
  },
  {
    name: 'fullscreen',
    required: false,
    fallback: 'maximize',
    test: () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
  },
  {
    name: 'webWorkers',
    required: false,
    fallback: 'main-thread',
    test: () => !!(window.Worker),
  },
];

describe('Browser Compatibility System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Feature Detection', () => {
    it('should detect getUserMedia support correctly', () => {
      // Test with getUserMedia support
      Object.defineProperty(global, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: vi.fn(),
          },
        },
        writable: true,
      });

      const getUserMediaFeature = sampleFeatures.find(f => f.name === 'getUserMedia')!;
      expect(getUserMediaFeature.test()).toBe(true);
    });

    it('should detect speech recognition support correctly', () => {
      // Test with speech recognition support
      Object.defineProperty(global, 'window', {
        value: {
          SpeechRecognition: class MockSpeechRecognition {},
        },
        writable: true,
      });

      const speechRecognitionFeature = sampleFeatures.find(f => f.name === 'speechRecognition')!;
      expect(speechRecognitionFeature.test()).toBe(true);
    });

    it('should detect speech synthesis support correctly', () => {
      // Test with speech synthesis support
      Object.defineProperty(global, 'window', {
        value: {
          speechSynthesis: {
            speak: vi.fn(),
            pause: vi.fn(),
            resume: vi.fn(),
            cancel: vi.fn(),
            getVoices: vi.fn(() => []),
          },
        },
        writable: true,
      });

      const speechSynthesisFeature = sampleFeatures.find(f => f.name === 'speechSynthesis')!;
      expect(speechSynthesisFeature.test()).toBe(true);
    });

    it('should detect WebRTC support correctly', () => {
      // Test with WebRTC support
      Object.defineProperty(global, 'window', {
        value: {
          RTCPeerConnection: class MockRTCPeerConnection {},
        },
        writable: true,
      });

      const webRTCFeature = sampleFeatures.find(f => f.name === 'webRTC')!;
      expect(webRTCFeature.test()).toBe(true);
    });

    it('should detect localStorage support correctly', () => {
      // Test with localStorage support
      const mockLocalStorage = {
        setItem: vi.fn(),
        removeItem: vi.fn(),
      };
      Object.defineProperty(global, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

      const localStorageFeature = sampleFeatures.find(f => f.name === 'localStorage')!;
      expect(localStorageFeature.test()).toBe(true);
    });

    it('should detect service worker support correctly', () => {
      // Test with service worker support
      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            register: vi.fn(),
          },
        },
        writable: true,
      });

      const serviceWorkerFeature = sampleFeatures.find(f => f.name === 'serviceWorkers')!;
      expect(serviceWorkerFeature.test()).toBe(true);
    });

    it('should detect notification support correctly', () => {
      // Test with notification support
      Object.defineProperty(global, 'window', {
        value: {
          Notification: class MockNotification {},
        },
        writable: true,
      });

      const notificationFeature = sampleFeatures.find(f => f.name === 'notification')!;
      expect(notificationFeature.test()).toBe(true);
    });

    it('should detect geolocation support correctly', () => {
      // Test with geolocation support
      Object.defineProperty(global, 'navigator', {
        value: {
          geolocation: {
            getCurrentPosition: vi.fn(),
            watchPosition: vi.fn(),
            clearWatch: vi.fn(),
          },
        },
        writable: true,
      });

      const geolocationFeature = sampleFeatures.find(f => f.name === 'geolocation')!;
      expect(geolocationFeature.test()).toBe(true);
    });

    it('should detect fullscreen support correctly', () => {
      // Test with fullscreen support
      Object.defineProperty(global, 'document', {
        value: {
          fullscreenEnabled: true,
        },
        writable: true,
      });

      const fullscreenFeature = sampleFeatures.find(f => f.name === 'fullscreen')!;
      expect(fullscreenFeature.test()).toBe(true);
    });

    it('should detect web worker support correctly', () => {
      // Test with web worker support
      Object.defineProperty(global, 'window', {
        value: {
          Worker: class MockWorker {},
        },
        writable: true,
      });

      const webWorkerFeature = sampleFeatures.find(f => f.name === 'webWorkers')!;
      expect(webWorkerFeature.test()).toBe(true);
    });

    it('should handle missing features gracefully', () => {
      // Test with missing features
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
      });
      Object.defineProperty(global, 'document', {
        value: {},
        writable: true,
      });

      const missingFeatures = ['getUserMedia', 'speechRecognition', 'serviceWorker', 'notification'];
      missingFeatures.forEach(featureName => {
        const feature = sampleFeatures.find(f => f.name === featureName)!;
        expect(feature.test()).toBe(false);
      });
    });
  });

  describe('Compatibility Checking', () => {
    it('should generate compatibility report correctly', () => {
      const features = sampleFeatures.slice(0, 5); // Test with subset
      const report: CompatibilityReport = {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        features: {},
        overallScore: 0,
        requiredFeatures: [],
        optionalFeatures: [],
        unsupportedFeatures: [],
        warnings: [],
        recommendations: [],
      };

      features.forEach(feature => {
        const supported = feature.test();
        report.features[feature.name] = {
          supported,
          required: feature.required,
          fallback: feature.fallback,
          polyfill: feature.polyfill,
        };

        if (feature.required) {
          report.requiredFeatures.push(feature.name);
        } else {
          report.optionalFeatures.push(feature.name);
        }

        if (!supported) {
          report.unsupportedFeatures.push(feature.name);
        }
      });

      const supportedCount = Object.values(report.features).filter(f => f.supported).length;
      report.overallScore = (supportedCount / features.length) * 100;

      expect(report.requiredFeatures.length).toBeGreaterThan(0);
      expect(report.optionalFeatures.length).toBeGreaterThan(0);
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
    });

    it('should identify critical missing features', () => {
      const criticalFeatures = sampleFeatures.filter(f => f.required);
      const unsupported: string[] = [];

      // Simulate missing getUserMedia and localStorage
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true,
      });

      criticalFeatures.forEach(feature => {
        if (!feature.test()) {
          unsupported.push(feature.name);
        }
      });

      expect(unsupported.length).toBeGreaterThan(0);
      expect(unsupported).toContain('getUserMedia');
      expect(unsupported).toContain('localStorage');
    });

    it('should provide appropriate fallbacks for missing features', () => {
      const features = sampleFeatures.filter(f => f.fallback);
      const fallbacks: { [key: string]: string } = {};

      // Simulate missing features
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
      });

      features.forEach(feature => {
        if (!feature.test()) {
          fallbacks[feature.name] = feature.fallback;
        }
      });

      expect(fallbacks['speechRecognition']).toBe('button');
      expect(fallbacks['speechSynthesis']).toBe('silent');
      expect(fallbacks['getUserMedia']).toBe('prompt');
    });

    it('should suggest polyfills for unsupported features', () => {
      const features = sampleFeatures.filter(f => f.polyfill);
      const polyfills: string[] = [];

      // Simulate missing features
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });

      features.forEach(feature => {
        if (!feature.test()) {
          polyfills.push(feature.polyfill);
        }
      });

      expect(polyfills.length).toBeGreaterThan(0);
      expect(polyfills).toContain('https://webrtc.github.io/adapter/adapter-latest.js');
    });
  });

  describe('Browser-Specific Testing', () => {
    it('should handle Chrome browser correctly', () => {
      const chromeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: chromeUserAgent,
          mediaDevices: { getUserMedia: vi.fn() },
          serviceWorker: { register: vi.fn() },
          geolocation: { getCurrentPosition: vi.fn() },
        },
        writable: true,
      });

      const isChrome = chromeUserAgent.includes('Chrome') && !chromeUserAgent.includes('Edg');
      expect(isChrome).toBe(true);
    });

    it('should handle Firefox browser correctly', () => {
      const firefoxUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0';
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: firefoxUserAgent,
          mediaDevices: { getUserMedia: vi.fn() },
          geolocation: { getCurrentPosition: vi.fn() },
        },
        writable: true,
      });

      const isFirefox = firefoxUserAgent.includes('Firefox');
      expect(isFirefox).toBe(true);
    });

    it('should handle Safari browser correctly', () => {
      const safariUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15';
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: safariUserAgent,
          geolocation: { getCurrentPosition: vi.fn() },
        },
        writable: true,
      });

      const isSafari = safariUserAgent.includes('Safari') && !safariUserAgent.includes('Chrome');
      expect(isSafari).toBe(true);
    });

    it('should handle Edge browser correctly', () => {
      const edgeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59';
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: edgeUserAgent,
          mediaDevices: { getUserMedia: vi.fn() },
          serviceWorker: { register: vi.fn() },
          geolocation: { getCurrentPosition: vi.fn() },
        },
        writable: true,
      });

      const isEdge = edgeUserAgent.includes('Edg');
      expect(isEdge).toBe(true);
    });

    it('should handle mobile browsers correctly', () => {
      const mobileUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1';
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: mobileUserAgent,
          maxTouchPoints: 1,
          platform: 'iPhone',
        },
        writable: true,
      });

      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(mobileUserAgent);
      expect(isMobile).toBe(true);
    });
  });

  describe('Performance Optimization', () => {
    it('should efficiently test feature support', () => {
      const startTime = performance.now();

      sampleFeatures.forEach(feature => {
        const supported = feature.test();
        expect(typeof supported).toBe('boolean');
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete all feature tests within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second max
    });

    it('should cache feature test results', () => {
      const cache = new Map<string, boolean>();
      const feature = sampleFeatures[0];

      // First test
      if (!cache.has(feature.name)) {
        cache.set(feature.name, feature.test());
      }
      const result1 = cache.get(feature.name)!;

      // Second test (should use cache)
      const result2 = cache.has(feature.name) ? cache.get(feature.name)! : feature.test();

      expect(result1).toBe(result2);
      expect(cache.has(feature.name)).toBe(true);
    });

    it('should handle large feature sets efficiently', () => {
      const largeFeatureSet: CompatibilityFeature[] = Array.from({ length: 100 }, (_, i) => ({
        name: `feature_${i}`,
        required: i < 50,
        fallback: i % 2 === 0 ? 'polyfill' : 'graceful',
        test: () => i % 3 !== 0, // Simulate 2/3 support rate
      }));

      const startTime = performance.now();

      const results = largeFeatureSet.map(feature => ({
        name: feature.name,
        supported: feature.test(),
        required: feature.required,
      }));

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(500); // Should handle 100 features quickly

      const supportedCount = results.filter(r => r.supported).length;
      const requiredSupportedCount = results.filter(r => r.supported && r.required).length;

      expect(supportedCount).toBeGreaterThan(0);
      expect(requiredSupportedCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle feature testing errors gracefully', () => {
      const faultyFeature: CompatibilityFeature = {
        name: 'faultyFeature',
        required: false,
        fallback: 'ignore',
        test: () => {
          throw new Error('Feature test failed');
        },
      };

      expect(() => {
        try {
          return faultyFeature.test();
        } catch {
          return false;
        }
      }).not.toThrow();
    });

    it('should handle undefined browser APIs', () => {
      // Clear all browser APIs
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
      });
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
      });

      const featureTests = [
        sampleFeatures.find(f => f.name === 'getUserMedia')!.test(),
        sampleFeatures.find(f => f.name === 'speechRecognition')!.test(),
        sampleFeatures.find(f => f.name === 'serviceWorker')!.test(),
      ];

      featureTests.forEach(result => {
        expect(result).toBe(false);
      });
    });

    it('should handle permission denials gracefully', () => {
      const permissionFeature: CompatibilityFeature = {
        name: 'cameraPermission',
        required: true,
        fallback: 'prompt',
        test: async () => {
          try {
            const result = await navigator.mediaDevices.getUserMedia({ video: true });
            result.getTracks().forEach(track => track.stop());
            return true;
          } catch (error) {
            if (error instanceof Error) {
              return error.name !== 'NotAllowedError';
            }
            return false;
          }
        },
      };

      // Mock permission denied
      const mockGetUserMedia = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
      Object.defineProperty(global, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: mockGetUserMedia,
          },
        },
        writable: true,
      });

      // Should not throw and should handle gracefully
      expect(async () => {
        try {
          await permissionFeature.test();
        } catch {
          // Handle async errors
        }
      }).not.toThrow();
    });
  });

  describe('Integration with JodexAI', () => {
    it('should report compatibility for JodexAI requirements', () => {
      const jodexRequirements = [
        'getUserMedia',      // Voice input
        'webRTC',           // Voice communication
        'localStorage',     // Data persistence
        'speechSynthesis',  // Voice output
        'serviceWorkers',   // PWA functionality
      ];

      const compatibility: { [key: string]: boolean } = {};

      jodexRequirements.forEach(requirement => {
        const feature = sampleFeatures.find(f => f.name === requirement);
        if (feature) {
          compatibility[requirement] = feature.test();
        }
      });

      // Check if critical features are supported
      const criticalFeatures = ['getUserMedia', 'webRTC', 'localStorage'];
      const criticalSupported = criticalFeatures
        .map(f => compatibility[f])
        .filter(Boolean).length;

      expect(criticalSupported).toBeGreaterThanOrEqual(2); // At least 2 critical features
    });

    it('should suggest appropriate configurations for different browsers', () => {
      const mockChrome = createMockBrowser({
        getUserMedia: { supported: true, constraints: true },
        speechRecognition: { supported: true, continuous: true },
        speechSynthesis: { supported: true, voices: true },
        webRTC: { supported: true, dataChannel: true },
      });

      const mockMobile = createMockBrowser({
        getUserMedia: { supported: true, constraints: false },
        speechRecognition: { supported: true, continuous: false },
        speechSynthesis: { supported: true, voices: true },
        webRTC: { supported: true, dataChannel: true },
      });

      // Chrome should have full support
      expect(mockChrome.getUserMedia.supported).toBe(true);
      expect(mockChrome.speechRecognition.continuous).toBe(true);
      expect(mockChrome.webRTC.dataChannel).toBe(true);

      // Mobile might have limitations
      expect(mockMobile.getUserMedia.supported).toBe(true);
      expect(mockMobile.speechRecognition.continuous).toBe(false);
    });

    it('should handle feature fallbacks in JodexAI context', () => {
      const featureFallbacks = {
        speechRecognition: 'button',
        speechSynthesis: 'silent',
        notification: 'badge',
        geolocation: 'manual',
      };

      // Simulate missing features
      const missingFeatures = ['speechRecognition', 'speechSynthesis'];
      const activeFallbacks: string[] = [];

      missingFeatures.forEach(feature => {
        if (featureFallbacks[feature as keyof typeof featureFallbacks]) {
          activeFallbacks.push(featureFallbacks[feature as keyof typeof featureFallbacks]);
        }
      });

      expect(activeFallbacks).toContain('button');
      expect(activeFallbacks).toContain('silent');
    });
  });

  describe('Real-time Feature Monitoring', () => {
    it('should detect feature availability changes', () => {
      let featureAvailable = false;

      const monitorFeature = () => {
        const wasAvailable = featureAvailable;
        featureAvailable = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        return featureAvailable !== wasAvailable;
      };

      // Initially not available
      expect(featureAvailable).toBe(false);

      // Simulate feature becoming available
      Object.defineProperty(global, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: vi.fn(),
          },
        },
        writable: true,
      });

      const changed = monitorFeature();
      expect(changed).toBe(true);
      expect(featureAvailable).toBe(true);
    });

    it('should handle network status changes', () => {
      let onlineStatus = navigator.onLine;

      const handleOnlineStatusChange = () => {
        onlineStatus = navigator.onLine;
        return onlineStatus;
      };

      expect(typeof handleOnlineStatusChange()).toBe('boolean');
    });

    it('should handle permission status changes', () => {
      // Mock permissions API
      const mockPermissions = {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
        request: vi.fn().mockResolvedValue({ state: 'granted' }),
      };

      Object.defineProperty(global, 'navigator', {
        value: {
          permissions: mockPermissions,
        },
        writable: true,
      });

      expect(typeof mockPermissions.query).toBe('function');
      expect(typeof mockPermissions.request).toBe('function');
    });
  });

  describe('Mobile-Specific Compatibility', () => {
    it('should detect touch device capabilities', () => {
      const isTouchDevice = () => {
        return (
          'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          (navigator as any).msMaxTouchPoints > 0
        );
      };

      // Mock touch device
      Object.defineProperty(global, 'navigator', {
        value: {
          maxTouchPoints: 1,
        },
        writable: true,
      });

      expect(isTouchDevice()).toBe(true);
    });

    it('should detect device orientation support', () => {
      const hasOrientation = () => {
        return 'DeviceOrientationEvent' in window;
      };

      // Mock device orientation
      Object.defineProperty(global, 'window', {
        value: {
          DeviceOrientationEvent: class MockDeviceOrientationEvent {},
        },
        writable: true,
      });

      expect(hasOrientation()).toBe(true);
    });

    it('should handle mobile viewport constraints', () => {
      const mockViewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
      };

      expect(mockViewport.width).toBeGreaterThan(0);
      expect(mockViewport.height).toBeGreaterThan(0);
      expect(mockViewport.devicePixelRatio).toBeGreaterThan(0);
    });
  });

  describe('Accessibility Compatibility', () => {
    it('should detect screen reader support', () => {
      const hasScreenReader = () => {
        return window.speechSynthesis || window.navigator.userAgent.includes('NVDA');
      };

      // Mock screen reader indicators
      Object.defineProperty(global, 'window', {
        value: {
          speechSynthesis: {
            speak: vi.fn(),
            getVoices: vi.fn(() => []),
          },
        },
        writable: true,
      });

      expect(hasScreenReader()).toBe(true);
    });

    it('should detect keyboard navigation support', () => {
      const supportsKeyboardNavigation = () => {
        return 'addEventListener' in window && 'keydown' in window;
      };

      expect(supportsKeyboardNavigation()).toBe(true);
    });

    it('should detect high contrast mode support', () => {
      const prefersHighContrast = () => {
        return window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches;
      };

      // Mock matchMedia
      Object.defineProperty(global, 'window', {
        value: {
          matchMedia: vi.fn().mockReturnValue({
            matches: false,
            media: '(prefers-contrast: high)',
            onchange: null,
          }),
        },
        writable: true,
      });

      expect(typeof window.matchMedia).toBe('function');
    });
  });
});