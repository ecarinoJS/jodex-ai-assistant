import { Action, JodexAIProps } from '../types';

/**
 * Action Queue Manager
 */
export class ActionManager {
  private queue: Action[] = [];
  private isProcessing = false;
  private onActionCallback?: (action: Action) => void;

  constructor(onAction?: (action: Action) => void) {
    this.onActionCallback = onAction;
  }

  /**
   * Add an action to the queue
   */
  addAction(action: Action): void {
    this.queue.push(action);
    this.processQueue();
  }

  /**
   * Process the action queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const action = this.queue.shift();
      if (action) {
        await this.executeAction(action);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: Action): Promise<void> {
    try {
      if (this.onActionCallback) {
        // Call the parent application's action handler
        this.onActionCallback(action);
      }

      // You can add built-in action handlers here
      switch (action.type) {
        case 'show_supply_forecast':
          this.handleSupplyForecast(action);
          break;
        case 'show_farmer_list':
          this.handleFarmerList(action);
          break;
        case 'show_weather_alerts':
          this.handleWeatherAlerts(action);
          break;
        case 'show_disease_map':
          this.handleDiseaseMap(action);
          break;
        case 'show_inventory':
          this.handleInventory(action);
          break;
        case 'open_farmer_profile':
          this.handleFarmerProfile(action);
          break;
        case 'send_notification':
          this.handleNotification(action);
          break;
        default:
          // Custom actions are just passed through to the parent app
          break;
      }
    } catch (error) {
      console.error('Failed to execute action:', action, error);
    }
  }

  /**
   * Built-in handlers for common actions
   */
  private handleSupplyForecast(action: Action): void {
    console.log('Showing supply forecast:', action.data);
    // Built-in logic for supply forecasts
  }

  private handleFarmerList(action: Action): void {
    console.log('Showing farmer list:', action.data);
    // Built-in logic for farmer lists
  }

  private handleWeatherAlerts(action: Action): void {
    console.log('Showing weather alerts:', action.data);
    // Built-in logic for weather alerts
  }

  private handleDiseaseMap(action: Action): void {
    console.log('Showing disease map:', action.data);
    // Built-in logic for disease mapping
  }

  private handleInventory(action: Action): void {
    console.log('Showing inventory:', action.data);
    // Built-in logic for inventory display
  }

  private handleFarmerProfile(action: Action): void {
    console.log('Opening farmer profile:', action.data);
    // Built-in logic for farmer profiles
  }

  private handleNotification(action: Action): void {
    console.log('Sending notification:', action.data);
    // Built-in logic for notifications

    // Try to send a browser notification if permissions are granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(action.data.title || 'Jodex Alert', {
        body: action.data.message || action.data,
        icon: '/favicon.ico',
        tag: 'jodex-notification',
      });
    }
  }

  /**
   * Clear all pending actions
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Get the current queue status
   */
  getQueueStatus(): { pending: number; isProcessing: boolean } {
    return {
      pending: this.queue.length,
      isProcessing: this.isProcessing,
    };
  }
}

/**
 * Validate action structure
 */
export function validateAction(action: any): action is Action {
  return (
    action &&
    typeof action === 'object' &&
    typeof action.type === 'string' &&
    typeof action.data === 'object' &&
    typeof action.priority === 'string' &&
    typeof action.timestamp === 'string' &&
    ['critical', 'high', 'medium', 'low'].includes(action.priority)
  );
}

/**
 * Create a new action with default values
 */
export function createAction(
  type: Action['type'],
  data: any,
  priority: Action['priority'] = 'medium'
): Action {
  return {
    type,
    data,
    priority,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Action type constants for easy reference
 */
export const ACTION_TYPES = {
  SHOW_SUPPLY_FORECAST: 'show_supply_forecast',
  SHOW_FARMER_LIST: 'show_farmer_list',
  SHOW_WEATHER_ALERTS: 'show_weather_alerts',
  SHOW_DISEASE_MAP: 'show_disease_map',
  SHOW_INVENTORY: 'show_inventory',
  OPEN_FARMER_PROFILE: 'open_farmer_profile',
  SEND_NOTIFICATION: 'send_notification',
  CUSTOM: 'custom',
} as const;