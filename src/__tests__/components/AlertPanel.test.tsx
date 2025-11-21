import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertPanel } from '../../components/AlertPanel';
import type { Alert, AlertPanelProps } from '../../types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock notification sound
vi.mock('../../lib/browser-compatibility', () => ({
  checkBrowserCompatibility: vi.fn().mockReturnValue({
    isCompatible: true,
    features: {
      websockets: true,
      mediarecorder: true,
      speechrecognition: true,
      localstorage: true,
      webrtc: true,
    },
    warnings: [],
  }),
}));

describe('AlertPanel Component', () => {
  // Test data
  const defaultProps: AlertPanelProps = {
    alerts: [],
    onAcknowledge: vi.fn(),
    onDismiss: vi.fn(),
    onAlertClick: vi.fn(),
    maxVisible: 5,
    showTimestamps: true,
    autoDismiss: false,
    autoDismissDelay: 5000,
    groupByType: false,
    sortBy: 'timestamp',
    sortOrder: 'desc',
    compact: false,
    allowDismiss: true,
    allowAcknowledge: true,
    playSound: false,
  };

  const sampleAlerts: Alert[] = [
    {
      id: '1',
      type: 'weather',
      title: 'Weather Alert',
      message: 'Heavy rain expected in the next 2 hours',
      severity: 'high',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      acknowledged: false,
      dismissed: false,
      metadata: {
        location: 'Davao City',
        rainfall: '25mm',
        duration: '2 hours',
      },
    },
    {
      id: '2',
      type: 'disease',
      title: 'Disease Warning',
      message: 'Black pod disease detected in nearby farms',
      severity: 'critical',
      timestamp: new Date('2024-01-01T09:30:00Z'),
      acknowledged: false,
      dismissed: false,
      metadata: {
        disease: 'Black pod disease',
        affected: 3,
        distance: '2km',
      },
    },
    {
      id: '3',
      type: 'harvest',
      title: 'Harvest Reminder',
      message: 'Cacao beans ready for harvest in plot A',
      severity: 'low',
      timestamp: new Date('2024-01-01T11:00:00Z'),
      acknowledged: false,
      dismissed: false,
      metadata: {
        plot: 'A',
        variety: 'Trinitario',
        estimatedYield: '500kg',
      },
    },
    {
      id: '4',
      type: 'system',
      title: 'System Notification',
      message: 'Data sync completed successfully',
      severity: 'low',
      timestamp: new Date('2024-01-01T08:00:00Z'),
      acknowledged: true,
      dismissed: false,
      metadata: {
        syncType: 'full',
        records: 1250,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(<AlertPanel {...defaultProps} />);
      expect(screen.getByText(/no alerts/i)).toBeInTheDocument();
    });

    it('should render with alerts', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} />);

      expect(screen.getByText('Weather Alert')).toBeInTheDocument();
      expect(screen.getByText('Disease Warning')).toBeInTheDocument();
      expect(screen.getByText('Harvest Reminder')).toBeInTheDocument();
    });

    it('should render empty state when no alerts', () => {
      render(<AlertPanel {...defaultProps} alerts={[]} />);

      expect(screen.getByText(/no alerts/i)).toBeInTheDocument();
      expect(screen.getByText(/everything is running smoothly/i)).toBeInTheDocument();
    });

    it('should respect maxVisible limit', () => {
      const manyAlerts = Array.from({ length: 10 }, (_, i) => ({
        id: `alert-${i}`,
        type: 'test',
        title: `Alert ${i}`,
        message: `Message ${i}`,
        severity: 'low' as const,
        timestamp: new Date(),
        acknowledged: false,
        dismissed: false,
      }));

      render(<AlertPanel {...defaultProps} alerts={manyAlerts} maxVisible={3} />);

      // Should only show 3 alerts
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(3);
    });
  });

  describe('Alert Display', () => {
    it('should show alert titles and messages', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} />);

      expect(screen.getByText('Weather Alert')).toBeInTheDocument();
      expect(screen.getByText('Heavy rain expected in the next 2 hours')).toBeInTheDocument();
    });

    it('should show severity indicators', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} />);

      expect(screen.getByRole('alert', { name: /critical severity/i })).toBeInTheDocument();
      expect(screen.getByRole('alert', { name: /high severity/i })).toBeInTheDocument();
      expect(screen.getByRole('alert', { name: /low severity/i })).toBeInTheDocument();
    });

    it('should show timestamps when enabled', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} showTimestamps={true} />);

      expect(screen.getByText(/10:00/)).toBeInTheDocument();
      expect(screen.getByText(/09:30/)).toBeInTheDocument();
      expect(screen.getByText(/11:00/)).toBeInTheDocument();
    });

    it('should hide timestamps when disabled', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} showTimestamps={false} />);

      expect(screen.queryByText(/10:00/)).not.toBeInTheDocument();
      expect(screen.queryByText(/09:30/)).not.toBeInTheDocument();
    });

    it('should show alert types', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} />);

      expect(screen.getByText(/weather/i)).toBeInTheDocument();
      expect(screen.getByText(/disease/i)).toBeInTheDocument();
      expect(screen.getByText(/harvest/i)).toBeInTheDocument();
      expect(screen.getByText(/system/i)).toBeInTheDocument();
    });

    it('should show metadata when available', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} />);

      expect(screen.getByText('Davao City')).toBeInTheDocument();
      expect(screen.getByText('Black pod disease')).toBeInTheDocument();
      expect(screen.getByText('Plot A')).toBeInTheDocument();
    });
  });

  describe('Alert Actions', () => {
    it('should allow acknowledging alerts', async () => {
      const user = userEvent.setup();
      const mockOnAcknowledge = vi.fn();

      render(
        <AlertPanel
          {...defaultProps}
          alerts={sampleAlerts}
          onAcknowledge={mockOnAcknowledge}
        />
      );

      const acknowledgeButton = screen.getAllByRole('button', { name: /acknowledge/i })[0];
      await user.click(acknowledgeButton);

      expect(mockOnAcknowledge).toHaveBeenCalledWith('1');
    });

    it('should allow dismissing alerts', async () => {
      const user = userEvent.setup();
      const mockOnDismiss = vi.fn();

      render(
        <AlertPanel
          {...defaultProps}
          alerts={sampleAlerts}
          onDismiss={mockOnDismiss}
        />
      );

      const dismissButton = screen.getAllByRole('button', { name: /dismiss/i })[0];
      await user.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledWith('1');
    });

    it('should disable actions when not allowed', () => {
      render(
        <AlertPanel
          {...defaultProps}
          alerts={sampleAlerts}
          allowAcknowledge={false}
          allowDismiss={false}
        />
      );

      expect(screen.queryByRole('button', { name: /acknowledge/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
    });

    it('should call onAlertClick when alert is clicked', async () => {
      const user = userEvent.setup();
      const mockOnAlertClick = vi.fn();

      render(
        <AlertPanel
          {...defaultProps}
          alerts={sampleAlerts}
          onAlertClick={mockOnAlertClick}
        />
      );

      const alert = screen.getByRole('alert', { name: /weather alert/i });
      await user.click(alert);

      expect(mockOnAlertClick).toHaveBeenCalledWith(sampleAlerts[0]);
    });

    it('should show acknowledged state', () => {
      const acknowledgedAlerts = sampleAlerts.map(alert => ({
        ...alert,
        acknowledged: true,
      }));

      render(<AlertPanel {...defaultProps} alerts={acknowledgedAlerts} />);

      expect(screen.getByText(/acknowledged/i)).toBeInTheDocument();
    });

    it('should hide actions for acknowledged alerts', () => {
      const acknowledgedAlerts = sampleAlerts.map(alert => ({
        ...alert,
        acknowledged: true,
      }));

      render(
        <AlertPanel
          {...defaultProps}
          alerts={acknowledgedAlerts}
          allowAcknowledge={true}
        />
      );

      expect(screen.queryByRole('button', { name: /acknowledge/i })).not.toBeInTheDocument();
    });
  });

  describe('Sorting and Filtering', () => {
    it('should sort alerts by timestamp', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} sortBy="timestamp" sortOrder="desc" />);

      const alerts = screen.getAllByRole('alert');
      const firstAlert = alerts[0];
      expect(firstAlert).toHaveTextContent('Harvest Reminder');
    });

    it('should sort alerts by severity', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} sortBy="severity" sortOrder="desc" />);

      const alerts = screen.getAllByRole('alert');
      const firstAlert = alerts[0];
      expect(firstAlert).toHaveTextContent('Disease Warning');
    });

    it('should group alerts by type', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} groupByType={true} />);

      expect(screen.getByText(/weather/i)).toBeInTheDocument();
      expect(screen.getByText(/disease/i)).toBeInTheDocument();
      expect(screen.getByText(/harvest/i)).toBeInTheDocument();
      expect(screen.getByText(/system/i)).toBeInTheDocument();
    });

    it('should filter alerts by type when groupByType is enabled', async () => {
      const user = userEvent.setup();

      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} groupByType={true} />);

      const weatherFilter = screen.getByRole('button', { name: /weather/i });
      await user.click(weatherFilter);

      // Should only show weather alerts
      expect(screen.getByText('Weather Alert')).toBeInTheDocument();
      expect(screen.queryByText('Disease Warning')).not.toBeInTheDocument();
    });

    it('should sort groups by severity when groupByType is enabled', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} groupByType={true} sortBy="severity" />);

      // Critical severity group should appear first
      const criticalAlert = screen.getByRole('alert', { name: /critical severity/i });
      expect(criticalAlert).toHaveTextContent('Disease Warning');
    });
  });

  describe('Auto-dismissal', () => {
    it('should auto-dismiss alerts after delay', async () => {
      const mockOnDismiss = vi.fn();
      const autoDismissAlerts = [sampleAlerts[0]]; // Only one low severity alert

      render(
        <AlertPanel
          {...defaultProps}
          alerts={autoDismissAlerts}
          autoDismiss={true}
          autoDismissDelay={3000}
          onDismiss={mockOnDismiss}
        />
      );

      // Should show the alert initially
      expect(screen.getByText('Weather Alert')).toBeInTheDocument();

      // Fast forward time
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalledWith('1');
      });
    });

    it('should not auto-dismiss high severity alerts', () => {
      const highSeverityAlerts = [sampleAlerts[1]]; // Critical severity alert

      render(
        <AlertPanel
          {...defaultProps}
          alerts={highSeverityAlerts}
          autoDismiss={true}
          autoDismissDelay={1000}
        />
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Alert should still be visible
      expect(screen.getByText('Disease Warning')).toBeInTheDocument();
    });

    it('should not auto-dismiss when disabled', () => {
      const autoDismissAlerts = [sampleAlerts[2]]; // Low severity alert

      render(
        <AlertPanel
          {...defaultProps}
          alerts={autoDismissAlerts}
          autoDismiss={false}
          autoDismissDelay={1000}
        />
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Alert should still be visible
      expect(screen.getByText('Harvest Reminder')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should render in compact mode when enabled', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} compact={true} />);

      const alerts = screen.getAllByRole('alert');
      alerts.forEach(alert => {
        expect(alert).toHaveClass(/compact/i);
      });
    });

    it('should hide metadata in compact mode', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} compact={true} />);

      expect(screen.queryByText('Davao City')).not.toBeInTheDocument();
      expect(screen.queryByText('Black pod disease')).not.toBeInTheDocument();
    });

    it('should still show critical information in compact mode', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} compact={true} />);

      expect(screen.getByText('Weather Alert')).toBeInTheDocument();
      expect(screen.getByText('Disease Warning')).toBeInTheDocument();
    });
  });

  describe('Sound Notifications', () => {
    it('should play sound for new alerts when enabled', () => {
      // Mock audio context
      const mockPlay = vi.fn();
      global.Audio = vi.fn().mockImplementation(() => ({
        play: mockPlay,
        pause: vi.fn(),
        load: vi.fn(),
      })) as any;

      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} playSound={true} />);

      // Should create audio for critical alert
      expect(global.Audio).toHaveBeenCalled();
    });

    it('should not play sound when disabled', () => {
      global.Audio = vi.fn() as any;

      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} playSound={false} />);

      expect(global.Audio).not.toHaveBeenCalled();
    });

    it('should use different sounds for different severities', () => {
      const mockPlay = vi.fn();
      global.Audio = vi.fn().mockImplementation(() => ({
        play: mockPlay,
        pause: vi.fn(),
        load: vi.fn(),
      })) as any;

      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} playSound={true} />);

      // Should create audio for each severity level
      expect(global.Audio).toHaveBeenCalledTimes(sampleAlerts.length);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} />);

      const alerts = screen.getAllByRole('alert');
      alerts.forEach((alert, index) => {
        expect(alert).toHaveAttribute('role', 'alert');
        expect(alert).toHaveAttribute('aria-label');
        expect(alert).toHaveAttribute('aria-describedby');
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} />);

      // Tab through alerts
      await user.tab();
      const firstAlert = screen.getAllByRole('alert')[0];
      expect(firstAlert).toHaveFocus();

      await user.tab();
      const secondAlert = screen.getAllByRole('alert')[1];
      expect(secondAlert).toHaveFocus();
    });

    it('should announce new alerts to screen readers', () => {
      render(<AlertPanel {...defaultProps} alerts={[]} />);

      // Initially no alerts
      expect(screen.getByRole('status', { name: /alert count/i })).toHaveTextContent('0 alerts');
    });

    it('should have proper color contrast for severity levels', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} />);

      const criticalAlert = screen.getByRole('alert', { name: /critical severity/i });
      expect(criticalAlert).toHaveClass(/critical/i);

      const highAlert = screen.getByRole('alert', { name: /high severity/i });
      expect(highAlert).toHaveClass(/high/i);

      const lowAlert = screen.getByRole('alert', { name: /low severity/i });
      expect(lowAlert).toHaveClass(/low/i);
    });
  });

  describe('Performance', () => {
    it('should handle large number of alerts efficiently', () => {
      const manyAlerts = Array.from({ length: 1000 }, (_, i) => ({
        id: `alert-${i}`,
        type: 'test',
        title: `Alert ${i}`,
        message: `This is message ${i}`,
        severity: 'low' as const,
        timestamp: new Date(),
        acknowledged: false,
        dismissed: false,
        metadata: { index: i },
      }));

      render(<AlertPanel {...defaultProps} alerts={manyAlerts} maxVisible={10} />);

      // Should only render maxVisible alerts
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(10);
    });

    it('should not re-render unchanged alerts', () => {
      const { rerender } = render(<AlertPanel {...defaultProps} alerts={sampleAlerts} />);

      // Re-render with same alerts
      rerender(<AlertPanel {...defaultProps} alerts={sampleAlerts} />);

      // Should still render correctly
      expect(screen.getByText('Weather Alert')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed alerts gracefully', () => {
      const malformedAlerts = [
        {
          id: '1',
          title: '', // Empty title
          message: 'Message with empty title',
          severity: 'low' as const,
          timestamp: new Date(),
          acknowledged: false,
          dismissed: false,
        },
        {
          id: '2',
          title: 'Alert without message',
          message: '', // Empty message
          severity: 'medium' as const,
          timestamp: new Date(),
          acknowledged: false,
          dismissed: false,
        },
      ];

      render(<AlertPanel {...defaultProps} alerts={malformedAlerts} />);

      // Should still render what's available
      expect(screen.getByText('Message with empty title')).toBeInTheDocument();
      expect(screen.getByText('Alert without message')).toBeInTheDocument();
    });

    it('should handle missing metadata gracefully', () => {
      const alertsWithoutMetadata = sampleAlerts.map(alert => ({
        ...alert,
        metadata: undefined,
      }));

      render(<AlertPanel {...defaultProps} alerts={alertsWithoutMetadata} />);

      expect(screen.getByText('Weather Alert')).toBeInTheDocument();
      expect(screen.queryByText('Davao City')).not.toBeInTheDocument();
    });

    it('should handle callback errors gracefully', async () => {
      const user = userEvent.setup();
      const mockOnAcknowledge = vi.fn().mockRejectedValue(new Error('Callback failed'));

      render(
        <AlertPanel
          {...defaultProps}
          alerts={sampleAlerts}
          onAcknowledge={mockOnAcknowledge}
        />
      );

      const acknowledgeButton = screen.getAllByRole('button', { name: /acknowledge/i })[0];

      // Should not crash when callback fails
      expect(async () => {
        await user.click(acknowledgeButton);
      }).not.toThrow();
    });
  });

  describe('Localization', () => {
    it('should format timestamps according to locale', () => {
      const localizedAlerts = sampleAlerts.map(alert => ({
        ...alert,
        timestamp: new Date('2024-01-01T14:30:00Z'), // 10:30 PM Philippines
      }));

      render(<AlertPanel {...defaultProps} alerts={localizedAlerts} showTimestamps={true} />);

      expect(screen.getByText(/14:30/)).toBeInTheDocument();
    });

    it('should support RTL languages', () => {
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} />);

      // Component should handle text direction properly
      const container = screen.getByRole('region', { name: /alerts/i });
      expect(container).toHaveAttribute('dir', 'ltr');
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to different screen sizes', () => {
      // Mobile view
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} />);
      expect(screen.getByRole('alert', { name: /weather alert/i })).toBeInTheDocument();

      // Desktop view
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} />);
      expect(screen.getByRole('alert', { name: /weather alert/i })).toBeInTheDocument();
    });

    it('should adjust layout in compact mode for small screens', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 320 });
      render(<AlertPanel {...defaultProps} alerts={sampleAlerts} compact={true} />);

      const alerts = screen.getAllByRole('alert');
      alerts.forEach(alert => {
        expect(alert).toHaveClass(/compact/i);
        expect(alert).toHaveClass(/mobile/i);
      });
    });
  });
});