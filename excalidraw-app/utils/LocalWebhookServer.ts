/**
 * Webhook Event Manager - handles receiving and processing webhook events
 * Simulates a local webhook server for development
 */

export interface WebhookHandler {
  (event: string, data: any): void;
}

class WebhookEventManager {
  private handlers: Map<string, WebhookHandler[]> = new Map();
  private allHandlers: WebhookHandler[] = [];

  /**
   * Register a handler to receive webhook events
   */
  on(eventPattern: string | "*", handler: WebhookHandler): () => void {
    if (eventPattern === "*") {
      this.allHandlers.push(handler);
      // Return unsubscribe function
      return () => {
        const index = this.allHandlers.indexOf(handler);
        if (index > -1) {
          this.allHandlers.splice(index, 1);
        }
      };
    }

    if (!this.handlers.has(eventPattern)) {
      this.handlers.set(eventPattern, []);
    }

    const eventHandlers = this.handlers.get(eventPattern)!;
    eventHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = eventHandlers.indexOf(handler);
      if (index > -1) {
        eventHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Emit a webhook event to all registered handlers
   */
  emit(event: string, data: any): void {
    // eslint-disable-next-line no-console
    console.log(`🔔 [Webhook Event] ${event}`, data);

    // Call specific handlers
    const eventHandlers = this.handlers.get(event) || [];
    for (const handler of eventHandlers) {
      try {
        handler(event, data);
      } catch (error) {
        console.error(`Error in webhook handler for ${event}:`, error);
      }
    }

    // Call wildcard handlers
    for (const handler of this.allHandlers) {
      try {
        handler(event, data);
      } catch (error) {
        console.error(`Error in wildcard webhook handler:`, error);
      }
    }
  }

  /**
   * Process an incoming webhook payload
   * This would be called by a local webhook server or HTTP handler
   */
  async processWebhook(payload: {
    event: string;
    clientId: string;
    data: any;
    timestamp: number;
  }): Promise<{ success: boolean }> {
    try {
      this.emit(payload.event, payload.data);
      return { success: true };
    } catch (error) {
      console.error("Error processing webhook:", error);
      return { success: false };
    }
  }
}

export default WebhookEventManager;
