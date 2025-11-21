import type { ComponentType } from 'react';
import { lazy } from 'react';

/**
 * Dynamic import utilities for lazy loading heavy dependencies
 */

// Direct import for framer-motion to avoid DTS issues
export const importMotion = async (): Promise<any> => {
  const motionModule = await import('framer-motion');
  return motionModule.motion;
};

// Dynamic import for livekit-client
export const importLiveKit = async () => {
  const livekitModule = await import('livekit-client');
  return {
    connect: livekitModule.default?.connect || livekitModule.connect,
    RoomEvent: livekitModule.default?.RoomEvent || livekitModule.RoomEvent,
    DataPacket_Kind: livekitModule.default?.DataPacket_Kind || livekitModule.DataPacket_Kind,
    ParticipantPermission: livekitModule.default?.ParticipantPermission || livekitModule.ParticipantPermission,
    ConnectionQuality: livekitModule.default?.ConnectionQuality || livekitModule.ConnectionQuality,
    Track: livekitModule.default?.Track || livekitModule.Track,
  };
};

// Dynamic import for zustand
export const importZustand = async () => {
  const zustandModule = await import('zustand');
  return zustandModule.create;
};

// Dynamic import for openai (when not using API proxy)
export const importOpenAI = async () => {
  const openaiModule = await import('openai');
  return openaiModule.default;
};

/**
 * Lazy loading wrapper for components that use heavy dependencies
 */
export interface LazyComponentOptions {
  fallback?: ComponentType;
  loadingDelay?: number;
}

export const createLazyComponent = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
) => {
  const { fallback, loadingDelay = 200 } = options;

  return lazy(() => {
    return new Promise<{ default: T }>((resolve) => {
      if (loadingDelay > 0) {
        setTimeout(() => {
          importFunc().then(resolve);
        }, loadingDelay);
      } else {
        importFunc().then(resolve);
      }
    });
  });
};

/**
 * Preload critical dependencies for better performance
 */
export const preloadDependencies = async () => {
  const preloadPromises: Promise<void>[] = [];

  // Preload motion
  preloadPromises.push(
    import('framer-motion').then(() => {
      // Motion loaded
    })
  );

  // Preload zustand
  preloadPromises.push(
    import('zustand').then(() => {
      // Zustand loaded
    })
  );

  try {
    await Promise.all(preloadPromises);
  } catch (error) {
    console.warn('Failed to preload some dependencies:', error);
  }
};

/**
 * Check if dependency is available
 */
export const isDependencyAvailable = async (importFunc: () => Promise<any>): Promise<boolean> => {
  try {
    await importFunc();
    return true;
  } catch {
    return false;
  }
};

/**
 * Load voice dependencies conditionally
 */
export const loadVoiceDependencies = async () => {
  const voiceDependencies = {
    motion: false,
    livekit: false,
  };

  try {
    // Check browser support first
    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      // Load motion for voice UI
      await import('framer-motion');
      voiceDependencies.motion = true;

      // Load livekit only if WebRTC is supported
      if (
        window.RTCPeerConnection ||
        (window as any).webkitRTCPeerConnection ||
        (window as any).mozRTCPeerConnection
      ) {
        await import('livekit-client');
        voiceDependencies.livekit = true;
      }
    }
  } catch (error) {
    console.warn('Failed to load voice dependencies:', error);
  }

  return voiceDependencies;
};