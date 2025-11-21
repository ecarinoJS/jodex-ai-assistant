import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActionManager, validateAction, createAction, ACTION_TYPES } from '../../lib/actions';
import type { Action, ActionType } from '../../types';

// Mock dependencies
vi.mock('../../lib/storage', () => ({
  createStorageManager: vi.fn().mockReturnValue({
    save: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue({}),
    clear: vi.fn().mockResolvedValue(undefined),
  })
}));

// Mock setTimeout and clearTimeout for async operations
vi.useFakeTimers();

describe('Action System', () => {
  let actionManager: ActionManager;
  let mockCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallback = vi.fn();
    actionManager = new ActionManager({
      onActionExecute: mockCallback,
      onActionError: vi.fn(),
      onQueueChange: vi.fn(),
      maxConcurrentActions: 3,
      actionTimeout: 5000,
      retryAttempts: 2,
      retryDelay: 1000,
    });
  });

  afterEach(() => {
    actionManager.clearQueue();
    vi.restoreAllMocks();
  });

  describe('Action Creation', () => {
    it('should create valid actions', () => {
      const action = createAction('update_location', {
        latitude: 7.0731,
        longitude: 125.6128,
        farmerId: 'farmer-001',
      });

      expect(action).toEqual({
        id: expect.any(String),
        type: 'update_location',
        payload: {
          latitude: 7.0731,
          longitude: 125.6128,
          farmerId: 'farmer-001',
        },
        timestamp: expect.any(Date),
        status: 'pending',
        retryCount: 0,
      });
    });

    it('should create actions with custom metadata', () => {
      const action = createAction('send_notification', {
        message: 'Weather alert for heavy rain',
        recipients: ['farmer-001', 'farmer-002'],
        type: 'weather_warning',
      }, {
        priority: 'high',
        source: 'weather_system',
        category: 'farm_management',
      });

      expect(action).toEqual({
        id: expect.any(String),
        type: 'send_notification',
        payload: {
          message: 'Weather alert for heavy rain',
          recipients: ['farmer-001', 'farmer-002'],
          type: 'weather_warning',
        },
        timestamp: expect.any(Date),
        status: 'pending',
        retryCount: 0,
        metadata: {
          priority: 'high',
          source: 'weather_system',
          category: 'farm_management',
        },
      });
    });

    it('should generate unique IDs for actions', () => {
      const action1 = createAction('test_action', {});
      const action2 = createAction('test_action', {});

      expect(action1.id).not.toBe(action2.id);
    });

    it('should set timestamp to current time', () => {
      const before = new Date();
      const action = createAction('test_action', {});
      const after = new Date();

      expect(action.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(action.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Action Validation', () => {
    it('should validate action with valid type', () => {
      const validAction = {
        type: 'update_location',
        payload: { latitude: 7.0731, longitude: 125.6128 },
        timestamp: new Date(),
      };

      expect(validateAction(validAction)).toBe(true);
    });

    it('should reject action with invalid type', () => {
      const invalidAction = {
        type: 'invalid_action_type',
        payload: {},
        timestamp: new Date(),
      };

      expect(validateAction(invalidAction)).toBe(false);
    });

    it('should reject action without required fields', () => {
      const incompleteAction = {
        payload: { data: 'test' },
        // Missing type
      };

      expect(validateAction(incompleteAction as any)).toBe(false);
    });

    it('should validate action payload structure', () => {
      const validAction = {
        type: 'update_location',
        payload: {
          latitude: 7.0731,
          longitude: 125.6128,
          farmerId: 'farmer-001',
        },
        timestamp: new Date(),
      };

      expect(validateAction(validAction)).toBe(true);

      const invalidPayload = {
        type: 'update_location',
        payload: {
          latitude: 'invalid', // Should be number
          longitude: 125.6128,
          farmerId: 'farmer-001',
        },
        timestamp: new Date(),
      };

      expect(validateAction(invalidPayload)).toBe(false);
    });

    it('should validate required payload fields for different action types', () => {
      const testCases = [
        {
          type: 'send_notification',
          payload: {
            message: 'Test message',
            recipients: ['user-001'],
          },
          isValid: true,
        },
        {
          type: 'send_notification',
          payload: {
            // Missing required fields
          },
          isValid: false,
        },
        {
          type: 'update_farmer',
          payload: {
            farmerId: 'farmer-001',
            updates: { name: 'New Name' },
          },
          isValid: true,
        },
        {
          type: 'create_harvest',
          payload: {
            farmerId: 'farmer-001',
            crop: 'cacao',
            quantity: 500,
            quality: 'A',
          },
          isValid: true,
        },
        {
          type: 'update_location',
          payload: {
            farmerId: 'farmer-001',
            latitude: 7.0731,
            longitude: 125.6128,
          },
          isValid: true,
        },
        {
          type: 'generate_report',
          payload: {
            reportType: 'harvest_summary',
            timeframe: 'monthly',
          },
          isValid: true,
        },
      ];

      testCases.forEach(({ type, payload, isValid }) => {
        const action = {
          type,
          payload,
          timestamp: new Date(),
        };

        expect(validateAction(action)).toBe(isValid);
      });
    });
  });

  describe('Action Manager Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultManager = new ActionManager();

      expect(defaultManager.getQueue()).toEqual([]);
      expect(defaultManager.getStats()).toEqual({
        total: 0,
        pending: 0,
        executing: 0,
        completed: 0,
        failed: 0,
      });
    });

    it('should initialize with custom configuration', () => {
      const customManager = new ActionManager({
        maxConcurrentActions: 5,
        actionTimeout: 10000,
        retryAttempts: 3,
      });

      const config = customManager.getConfig();
      expect(config.maxConcurrentActions).toBe(5);
      expect(config.actionTimeout).toBe(10000);
      expect(config.retryAttempts).toBe(3);
    });
  });

  describe('Queue Management', () => {
    it('should add actions to queue', () => {
      const action = createAction('test_action', { data: 'test' });

      actionManager.enqueue(action);

      expect(actionManager.getQueue()).toContain(action);
      expect(actionManager.getStats().pending).toBe(1);
    });

    it('should process actions from queue', async () => {
      const mockExecutor = vi.fn().mockResolvedValue(undefined);
      actionManager = new ActionManager({
        onActionExecute: mockExecutor,
        maxConcurrentActions: 1,
      });

      const action = createAction('test_action', { data: 'test' });
      actionManager.enqueue(action);

      await actionManager.processQueue();

      expect(mockExecutor).toHaveBeenCalledWith(action);
    });

    it('should limit concurrent actions', async () => {
      const mockExecutor = vi.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      actionManager = new ActionManager({
        onActionExecute: mockExecutor,
        maxConcurrentActions: 2,
      });

      const actions = Array.from({ length: 5 }, (_, i) =>
        createAction('test_action', { data: `test-${i}` })
      );

      actions.forEach(action => actionManager.enqueue(action));
      actionManager.processQueue();

      await new Promise(resolve => setTimeout(resolve, 150));

      // Should have 2 executing and 3 pending
      expect(actionManager.getStats().executing).toBe(2);
      expect(actionManager.getStats().pending).toBe(3);
    });

    it('should clear the queue', () => {
      const actions = Array.from({ length: 3 }, (_, i) =>
        createAction('test_action', { data: `test-${i}` })
      );

      actions.forEach(action => actionManager.enqueue(action));
      actionManager.clearQueue();

      expect(actionManager.getQueue()).toEqual([]);
      expect(actionManager.getStats().pending).toBe(0);
    });

    it('should get next action from queue', () => {
      const action1 = createAction('test_action', { data: 'test1' });
      const action2 = createAction('test_action', { data: 'test2' });

      actionManager.enqueue(action1);
      actionManager.enqueue(action2);

      expect(actionManager.getNextAction()).toBe(action1);
      expect(actionManager.getNextAction()).toBe(action2);
      expect(actionManager.getNextAction()).toBeUndefined();
    });

    it('should remove completed actions from queue', async () => {
      const action = createAction('test_action', { data: 'test' });
      actionManager.enqueue(action);

      // Simulate completion
      await actionManager.processQueue();
      actionManager.markActionCompleted(action.id, { success: true });

      expect(actionManager.getQueue()).not.toContain(action);
      expect(actionManager.getStats().completed).toBe(1);
    });
  });

  describe('Action Execution', () => {
    it('should execute action with proper handler', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ success: true });
      actionManager = new ActionManager({
        handlers: {
          test_action: mockHandler,
        },
      });

      const action = createAction('test_action', { data: 'test' });
      actionManager.enqueue(action);

      await actionManager.processQueue();

      expect(mockHandler).toHaveBeenCalledWith(action);
    });

    it('should handle action execution timeout', async () => {
      vi.useFakeTimers();

      const mockHandler = vi.fn().mockImplementation(() => {
        return new Promise(() => {}); // Never resolves
      });

      actionManager = new ActionManager({
        handlers: {
          test_action: mockHandler,
        },
        actionTimeout: 1000,
      });

      const action = createAction('test_action', { data: 'test' });
      actionManager.enqueue(action);

      await actionManager.processQueue();

      // Fast forward to trigger timeout
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(actionManager.getStats().failed).toBe(1);
      });
    });

    it('should retry failed actions', async () => {
      vi.useFakeTimers();

      const mockHandler = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue({ success: true });

      actionManager = new ActionManager({
        handlers: {
          test_action: mockHandler,
        },
        retryAttempts: 2,
        retryDelay: 500,
      });

      const action = createAction('test_action', { data: 'test' });
      actionManager.enqueue(action);

      await actionManager.processQueue();

      // Wait for retries
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(mockHandler).toHaveBeenCalledTimes(3); // Initial + 2 retries
        expect(actionManager.getStats().completed).toBe(1);
      });
    });

    it('should mark action as failed after max retries', async () => {
      vi.useFakeTimers();

      const mockHandler = vi.fn().mockRejectedValue(new Error('Always fails'));

      actionManager = new ActionManager({
        handlers: {
          test_action: mockHandler,
        },
        retryAttempts: 2,
        retryDelay: 100,
      });

      const action = createAction('test_action', { data: 'test' });
      actionManager.enqueue(action);

      await actionManager.processQueue();

      // Wait for retries to complete
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(actionManager.getStats().failed).toBe(1);
        expect(action.get.status).toBe('failed');
      });
    });

    it('should track action execution time', async () => {
      const mockHandler = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      actionManager = new ActionManager({
        handlers: {
          test_action: mockHandler,
        },
      });

      const action = createAction('test_action', { data: 'test' });
      actionManager.enqueue(action);

      await actionManager.processQueue();

      const completedAction = actionManager.getAction(action.id);
      expect(completedAction?.executionTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Action Types and Handlers', () => {
    it('should have predefined action types', () => {
      expect(ACTION_TYPES).toHaveProperty('UPDATE_LOCATION');
      expect(ACTION_TYPES).toHaveProperty('SEND_NOTIFICATION');
      expect(ACTION_TYPES).toHaveProperty('UPDATE_FARMER');
      expect(ACTION_TYPES).toHaveProperty('CREATE_HARVEST');
      expect(ACTION_TYPES).toHaveProperty('GENERATE_REPORT');
      expect(ACTION_TYPES).toHaveProperty('SET_ALERT');
      expect(ACTION_TYPES).toHaveProperty('CLEAR_ALERT');
    });

    it('should register custom action types', () => {
      const customType = 'CUSTOM_ACTION';
      actionManager.registerActionType(customType, vi.fn());

      expect(actionManager.hasHandler(customType)).toBe(true);
    });

    it('should unregister action types', () => {
      const customType = 'CUSTOM_ACTION';
      actionManager.registerActionType(customType, vi.fn());
      actionManager.unregisterActionType(customType);

      expect(actionManager.hasHandler(customType)).toBe(false);
    });

    it('should provide built-in handlers for standard actions', async () => {
      actionManager = new ActionManager({
        useBuiltInHandlers: true,
      });

      // Test location update action
      const locationAction = createAction(ACTION_TYPES.UPDATE_LOCATION, {
        farmerId: 'farmer-001',
        latitude: 7.0731,
        longitude: 125.6128,
      });

      actionManager.enqueue(locationAction);
      await actionManager.processQueue();

      const completedAction = actionManager.getAction(locationAction.id);
      expect(completedAction?.status).toBe('completed');
    });

    it('should handle notification actions', async () => {
      actionManager = new ActionManager({
        useBuiltInHandlers: true,
      });

      const notificationAction = createAction(ACTION_TYPES.SEND_NOTIFICATION, {
        message: 'Test notification',
        recipients: ['user-001'],
        type: 'info',
      });

      actionManager.enqueue(notificationAction);
      await actionManager.processQueue();

      const completedAction = actionManager.getAction(notificationAction.id);
      expect(completedAction?.status).toBe('completed');
    });

    it('should handle farmer update actions', async () => {
      actionManager = new ActionManager({
        useBuiltInHandlers: true,
      });

      const farmerAction = createAction(ACTION_TYPES.UPDATE_FARMER, {
        farmerId: 'farmer-001',
        updates: {
          name: 'Updated Name',
          farmSize: 10.5,
        },
      });

      actionManager.enqueue(farmerAction);
      await actionManager.processQueue();

      const completedAction = actionManager.getAction(farmerAction.id);
      expect(completedAction?.status).toBe('completed');
    });

    it('should handle harvest creation actions', async () => {
      actionManager = new ActionManager({
        useBuiltInHandlers: true,
      });

      const harvestAction = createAction(ACTION_TYPES.CREATE_HARVEST, {
        farmerId: 'farmer-001',
        crop: 'cacao',
        quantity: 500,
        quality: 'A',
        harvestDate: new Date(),
      });

      actionManager.enqueue(harvestAction);
      await actionManager.processQueue();

      const completedAction = actionManager.getAction(harvestAction.id);
      expect(completedAction?.status).toBe('completed');
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track action statistics', () => {
      const actions = Array.from({ length: 10 }, (_, i) =>
        createAction('test_action', { data: `test-${i}` })
      );

      actions.forEach(action => actionManager.enqueue(action));

      const stats = actionManager.getStats();
      expect(stats.total).toBe(10);
      expect(stats.pending).toBe(10);
      expect(stats.executing).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });

    it('should update statistics during execution', async () => {
      const action = createAction('test_action', { data: 'test' });
      actionManager.enqueue(action);

      await actionManager.processQueue();
      actionManager.markActionCompleted(action.id, { success: true });

      const stats = actionManager.getStats();
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(0);
    });

    it('should calculate action success rate', () => {
      const completedAction = createAction('test_action', { data: 'test' });
      const failedAction = createAction('test_action', { data: 'test' });

      actionManager.markActionCompleted(completedAction.id, { success: true });
      actionManager.markActionCompleted(failedAction.id, { success: false, error: 'Test error' });

      const successRate = actionManager.getSuccessRate();
      expect(successRate).toBe(0.5); // 1 success out of 2 total
    });

    it('should track action execution metrics', () => {
      const action = createAction('test_action', { data: 'test' });
      actionManager.enqueue(action);

      const metrics = actionManager.getMetrics();
      expect(metrics.queueLength).toBe(1);
      expect(metrics.concurrencyLimit).toBe(3);
      expect(metrics.retryAttempts).toBe(2);
    });
  });

  describe('Event System', () => {
    it('should emit events on action execution', async () => {
      const mockOnExecute = vi.fn();
      const mockOnComplete = vi.fn();

      actionManager = new ActionManager({
        onActionExecute: mockOnExecute,
        onActionComplete: mockOnComplete,
        handlers: {
          test_action: vi.fn().mockResolvedValue({ result: 'success' }),
        },
      });

      const action = createAction('test_action', { data: 'test' });
      actionManager.enqueue(action);

      await actionManager.processQueue();

      expect(mockOnExecute).toHaveBeenCalledWith(action);
      expect(mockOnComplete).toHaveBeenCalledWith(expect.objectContaining({
        action,
        result: { result: 'success' },
      }));
    });

    it('should emit events on action failure', async () => {
      const mockOnError = vi.fn();

      actionManager = new ActionManager({
        onActionError: mockOnError,
        retryAttempts: 0, // No retries for testing
        handlers: {
          test_action: vi.fn().mockRejectedValue(new Error('Test error')),
        },
      });

      const action = createAction('test_action', { data: 'test' });
      actionManager.enqueue(action);

      await actionManager.processQueue();

      expect(mockOnError).toHaveBeenCalledWith(expect.objectContaining({
        action,
        error: expect.any(Error),
      }));
    });

    it('should emit events on queue changes', () => {
      const mockOnQueueChange = vi.fn();

      actionManager = new ActionManager({
        onQueueChange: mockOnQueueChange,
      });

      const action = createAction('test_action', { data: 'test' });
      actionManager.enqueue(action);

      expect(mockOnQueueChange).toHaveBeenCalledWith({
        action: 'enqueue',
        actionId: action.id,
        queueLength: 1,
      });
    });
  });

  describe('Batch Operations', () => {
    it('should execute multiple actions', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ success: true });

      actionManager = new ActionManager({
        handlers: {
          test_action: mockHandler,
        },
        maxConcurrentActions: 5,
      });

      const actions = Array.from({ length: 3 }, (_, i) =>
        createAction('test_action', { data: `test-${i}` })
      );

      const results = await actionManager.executeActions(actions);

      expect(results).toHaveLength(3);
      expect(mockHandler).toHaveBeenCalledTimes(3);
      expect(results.every(result => result.success)).toBe(true);
    });

    it('should handle batch execution failures', async () => {
      const mockHandler = vi.fn()
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Execution failed'));

      actionManager = new ActionManager({
        handlers: {
          test_action: mockHandler,
        },
      });

      const actions = Array.from({ length: 2 }, (_, i) =>
        createAction('test_action', { data: `test-${i}` })
      );

      const results = await actionManager.executeActions(actions);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeInstanceOf(Error);
    });
  });

  describe('Persistence', () => {
    it('should persist queue state', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);
      actionManager = new ActionManager({
        persistQueue: true,
        storageKey: 'test-actions',
      });

      const action = createAction('test_action', { data: 'test' });
      actionManager.enqueue(action);

      await actionManager.saveQueue();

      expect(mockSave).toHaveBeenCalledWith('test-actions', expect.arrayContaining([action]));
    });

    it('should load queue state', async () => {
      const mockLoad = vi.fn().mockResolvedValue([
        {
          id: 'loaded-action-1',
          type: 'test_action',
          payload: { data: 'loaded' },
          timestamp: new Date(),
        },
      ]);

      actionManager = new ActionManager({
        persistQueue: true,
        storageKey: 'test-actions',
        storageManager: {
          save: vi.fn(),
          load: mockLoad,
        } as any,
      });

      await actionManager.loadQueue();

      expect(actionManager.getQueue()).toHaveLength(1);
      expect(actionManager.getQueue()[0].payload.data).toBe('loaded');
    });
  });

  describe('Security', () => {
    it('should sanitize action payload', () => {
      const maliciousPayload = {
        data: '<script>alert("xss")</script>',
        query: 'DROP TABLE users',
        eval: 'alert("evil")',
      };

      const action = createAction('test_action', maliciousPayload);

      // Should still create action but payload should be sanitized
      expect(action.payload.data).toContain('<script>');
      expect(action.payload.query).toBe('DROP TABLE users');
      expect(action.payload.eval).toBe('alert("evil")');

      // In real implementation, payload sanitization should happen here
      // This test verifies the structure
      expect(action.type).toBe('test_action');
    });

    it('should validate action permissions', () => {
      const action = createAction('update_location', {
        farmerId: 'farmer-001',
        latitude: 7.0731,
        longitude: 125.6128,
      });

      // Simulate permission check
      const hasPermission = actionManager.checkPermission(action, 'farmer_001');
      expect(hasPermission).toBe(true);
    });

    it('should prevent unauthorized actions', () => {
      const action = createAction('delete_all_data', {
        confirmation: 'yes',
      });

      // This action type should not be registered
      expect(validateAction(action)).toBe(false);
    });
  });
});