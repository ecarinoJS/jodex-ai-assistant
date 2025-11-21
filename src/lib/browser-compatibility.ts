/**
 * Browser compatibility utilities for Jodex AI Assistant
 */

export interface BrowserCompatibility {
  supported: boolean;
  features: {
    webAudio: boolean;
    mediaDevices: boolean;
    getUserMedia: boolean;
    webkitSpeechRecognition: boolean;
    speechRecognition: boolean;
    webRTC: boolean;
  };
  browser: {
    name: string;
    version: string;
    isMobile: boolean;
  };
  issues: string[];
}

/**
 * Check browser compatibility for voice features
 */
export function checkBrowserCompatibility(): BrowserCompatibility {
  // Default to unsupported until checks pass
  const compatibility: BrowserCompatibility = {
    supported: false,
    features: {
      webAudio: false,
      mediaDevices: false,
      getUserMedia: false,
      webkitSpeechRecognition: false,
      speechRecognition: false,
      webRTC: false,
    },
    browser: {
      name: 'unknown',
      version: 'unknown',
      isMobile: false,
    },
    issues: [],
  };

  try {
    // Check for basic window object
    if (typeof window === 'undefined') {
      compatibility.issues.push('Not running in a browser environment');
      return compatibility;
    }

    // Browser detection
    const userAgent = navigator.userAgent;
    let browserName = 'unknown';
    let browserVersion = 'unknown';

    // Chrome
    if (/Chrome/.test(userAgent) && !/Chromium|Edge|Edg|Opera|OPR\//.test(userAgent)) {
      browserName = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    }
    // Safari
    else if (/Safari/.test(userAgent) && !/Chrome|Chromium|Edge|Edg|Opera|OPR\//.test(userAgent)) {
      browserName = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    }
    // Firefox
    else if (/Firefox/.test(userAgent)) {
      browserName = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    }
    // Edge
    else if (/Edge|Edg/.test(userAgent)) {
      browserName = 'Edge';
      const match = userAgent.match(/(?:Edge|Edg)\/(\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    }

    // Mobile detection
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    compatibility.browser = {
      name: browserName,
      version: browserVersion,
      isMobile,
    };

    // Check for Web Audio API
    compatibility.features.webAudio = !!(window.AudioContext || (window as any).webkitAudioContext);
    if (!compatibility.features.webAudio) {
      compatibility.issues.push('Web Audio API not supported');
    }

    // Check for MediaDevices
    compatibility.features.mediaDevices = !!(navigator.mediaDevices);
    if (!compatibility.features.mediaDevices) {
      compatibility.issues.push('MediaDevices API not supported');
    }

    // Check for getUserMedia
    compatibility.features.getUserMedia = !!(navigator.mediaDevices?.getUserMedia) ||
      !!(navigator as any).getUserMedia ||
      !!(navigator as any).webkitGetUserMedia ||
      !!(navigator as any).mozGetUserMedia;
    if (!compatibility.features.getUserMedia) {
      compatibility.issues.push('getUserMedia not supported');
    }

    // Check for Speech Recognition
    compatibility.features.speechRecognition = !!(window as any).SpeechRecognition;
    compatibility.features.webkitSpeechRecognition = !!(window as any).webkitSpeechRecognition;

    if (!compatibility.features.speechRecognition && !compatibility.features.webkitSpeechRecognition) {
      compatibility.issues.push('Speech Recognition not supported');
    }

    // Check for WebRTC
    compatibility.features.webRTC = !!(
      window.RTCPeerConnection ||
      (window as any).webkitRTCPeerConnection ||
      (window as any).mozRTCPeerConnection ||
      (window as any).RTCPeerConnection
    );
    if (!compatibility.features.webRTC) {
      compatibility.issues.push('WebRTC not supported');
    }

    // Browser-specific checks
    if (browserName === 'Safari' && parseInt(browserVersion) < 14) {
      compatibility.issues.push('Safari version 14+ required for full voice support');
    }

    if (browserName === 'Chrome' && parseInt(browserVersion) < 80) {
      compatibility.issues.push('Chrome version 80+ required for full voice support');
    }

    if (browserName === 'Firefox' && parseInt(browserVersion) < 75) {
      compatibility.issues.push('Firefox version 75+ required for full voice support');
    }

    // Check if core features are available
    const hasCoreFeatures = compatibility.features.mediaDevices &&
                           compatibility.features.getUserMedia &&
                           (compatibility.features.speechRecognition || compatibility.features.webkitSpeechRecognition);

    // Consider supported if core features work and no major issues
    const majorIssues = compatibility.issues.filter(issue =>
      issue.includes('not supported') || issue.includes('required')
    ).length;

    compatibility.supported = hasCoreFeatures && majorIssues === 0;

  } catch (error) {
    compatibility.issues.push(`Error checking compatibility: ${error}`);
  }

  return compatibility;
}

/**
 * Get browser-specific workarounds and fixes
 */
export function getBrowserWorkarounds(browserName: string): string[] {
  const workarounds: string[] = [];

  switch (browserName) {
    case 'Safari':
      workarounds.push('Safari requires user interaction before accessing microphone');
      workarounds.push('Consider using HTTPS for microphone access in Safari');
      break;
    case 'Chrome':
      workarounds.push('Chrome may require HTTPS for microphone access');
      break;
    case 'Firefox':
      workarounds.push('Firefox may have stricter microphone permissions');
      break;
    case 'Edge':
      workarounds.push('Edge should work well with voice features');
      break;
  }

  return workarounds;
}

/**
 * Check if HTTPS is required for microphone access
 */
export function requiresHTTPS(): boolean {
  const userAgent = navigator.userAgent;

  // Most browsers require HTTPS for getUserMedia
  if (/Chrome|Firefox|Edge|Edg/.test(userAgent)) {
    return location.protocol !== 'https:' && location.hostname !== 'localhost';
  }

  return false;
}

/**
 * Get user-friendly error message for unsupported features
 */
export function getUnsupportedFeatureMessage(compatibility: BrowserCompatibility): string[] {
  const messages: string[] = [];

  if (!compatibility.features.getUserMedia) {
    messages.push('Your browser doesn\'t support microphone access. Voice features won\'t be available.');
  }

  if (!compatibility.features.speechRecognition && !compatibility.features.webkitSpeechRecognition) {
    messages.push('Your browser doesn\'t support speech recognition. Voice-to-text won\'t work.');
  }

  if (!compatibility.features.webAudio) {
    messages.push('Your browser doesn\'t support Web Audio. Audio playback may be limited.');
  }

  if (!compatibility.features.webRTC) {
    messages.push('Your browser doesn\'t support WebRTC. Real-time communication features won\'t work.');
  }

  if (compatibility.browser.isMobile) {
    messages.push('Mobile browsers may have limited voice functionality. Consider using a desktop browser for the best experience.');
  }

  return messages;
}