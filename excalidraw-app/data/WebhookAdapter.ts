/**
 * Webhook Adapter for receiving real-time updates from MongoDB via webhooks
 * This adapter:
 * 1. Registers the client's webhook endpoint with the server
 * 2. Listens for incoming webhook events
 * 3. Updates local state when other clients make changes
 */

import type { AppState } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/element/types";

export interface DataState {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  libraryItems?: any[];
}

class WebhookAdapterImpl {
  private serverUrl: string;
  private clientId: string;
  private webhookId: string | null = null;
  private webhookCallbacks: Map<string, (data: any) => void> = new Map();
  private localPort: number = 3002; // Port for receiving webhooks from server

  constructor(serverUrl: string, clientId: string) {
    this.serverUrl = serverUrl;
    this.clientId = clientId;

    // eslint-disable-next-line no-console
    console.log(
      `🔌 WebhookAdapter initialized for client: ${clientId} → ${serverUrl}`,
    );
  }

  /**
   * Register this client to receive webhook updates from the server
   */
  async register(webhookUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/webhooks/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: this.clientId,
          webhookUrl,
          events: ["canvas:update", "files:update", "*"],
        }),
      });

      if (!response.ok) {
        console.error(`Failed to register webhook: ${response.status}`);
        return false;
      }

      const data = await response.json();
      this.webhookId = data.webhookId;

      // eslint-disable-next-line no-console
      console.log(
        `✅ Webhook registered: ${this.webhookId} listening on ${webhookUrl}`,
      );
      return true;
    } catch (error) {
      console.error("Failed to register webhook:", error);
      return false;
    }
  }

  /**
   * Unregister this client from receiving webhooks
   */
  async unregister(): Promise<boolean> {
    if (!this.webhookId) {
      return false;
    }

    try {
      const response = await fetch(`${this.serverUrl}/webhooks/unregister`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookId: this.webhookId }),
      });

      if (response.ok) {
        // eslint-disable-next-line no-console
        console.log(`❌ Webhook unregistered: ${this.webhookId}`);
        this.webhookId = null;
        return true;
      }
    } catch (error) {
      console.error("Failed to unregister webhook:", error);
    }

    return false;
  }

  /**
   * Subscribe to a specific webhook event
   */
  subscribe(event: string, callback: (data: any) => void): () => void {
    this.webhookCallbacks.set(event, callback);

    // Return unsubscribe function
    return () => {
      this.webhookCallbacks.delete(event);
    };
  }

  /**
   * Handle incoming webhook event from server
   */
  handleWebhookEvent(event: string, data: any): void {
    // eslint-disable-next-line no-console
    console.log(`🔔 Webhook event received: ${event}`, data);

    // Call registered callback for this event
    const callback = this.webhookCallbacks.get(event);
    if (callback) {
      callback(data);
    }

    // Also call wildcard callback if registered
    const wildcardCallback = this.webhookCallbacks.get("*");
    if (wildcardCallback) {
      wildcardCallback({ event, ...data });
    }
  }

  /**
   * Get the local port for receiving webhooks
   */
  getWebhookPort(): number {
    return this.localPort;
  }

  /**
   * Get the webhook URL for registration with server
   */
  getWebhookUrl(): string {
    // This should be the publicly accessible URL for this client
    // For now, we'll use localhost, but in production this would be a real URL
    return `http://localhost:${this.localPort}/webhook`;
  }

  isRegistered(): boolean {
    return this.webhookId !== null;
  }
}

let webhookAdapterInstance: WebhookAdapterImpl | null = null;

/**
 * Get or create the webhook adapter singleton
 * Reads configuration from environment variables or memory
 */
export const getWebhookAdapter = (): WebhookAdapterImpl | null => {
  if (!webhookAdapterInstance) {
    const serverUrl = import.meta.env.VITE_REMOTE_SYNC_ENDPOINT || "";
    const enabled = import.meta.env.VITE_ENABLE_REMOTE_SYNC === "true";
    const clientId =
      localStorage.getItem("__excalidraw_client_id") ||
      `client_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // eslint-disable-next-line no-console
    console.log(
      "🔧 WebhookAdapter Init:",
      "enabled=",
      enabled,
      "endpoint=",
      serverUrl,
      "clientId=",
      clientId,
    );

    if (enabled && serverUrl) {
      // eslint-disable-next-line no-console
      console.log("✅ WebhookAdapter ENABLED");
      webhookAdapterInstance = new WebhookAdapterImpl(serverUrl, clientId);
    } else {
      // eslint-disable-next-line no-console
      console.log("❌ WebhookAdapter DISABLED");
      return null;
    }
  }

  return webhookAdapterInstance;
};

export default getWebhookAdapter;
