/**
 * Database Adapter for syncing local state to MongoDB via WebSocket.
 * Provides interface for push/pull of canvas state, elements, appState via WebSocket connection.
 */

import type { AppState } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement, FileId } from "@excalidraw/element/types";
import { io, Socket } from "socket.io-client";

export interface DataState {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  libraryItems?: any[];
}

export interface SavePayload {
  dataState: DataState;
  timestamp: number;
  clientId: string;
}

export interface RemoteDataState {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  libraryItems?: any[];
  serverTimestamp: number;
}

export interface DBAdapterConfig {
  endpoint: string;
  enabled: boolean;
}

class DBAdapterImpl {
  private config: DBAdapterConfig;
  private serverVersion: number = -1;
  private socket: Socket | null = null;
  private updateCallback: ((data: RemoteDataState) => void) | null = null;
  private tabId: string = "singleton";

  constructor(config: DBAdapterConfig) {
    this.config = config;
  }

  setTabId(tabId: string) {
    this.tabId = tabId;
    console.log("DBAdapter: Switched to tab:", tabId);
  }

  getTabId() {
    return this.tabId;
  }

  /**
   * Connect to WebSocket server
   */
  private async connect(): Promise<Socket> {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    return new Promise((resolve, reject) => {
      try {
        // Ensure we don't have duplicate slashes or missing protocol
        let url = this.config.endpoint;
        console.log("DBAdapter connecting to:", url);
        
        if (!url.startsWith("http") && !url.startsWith("ws")) {
            url = `http://${url}`;
        }

        this.socket = io(url, {
            transports: ["websocket", "polling"],
        });

        this.socket.on("connect", () => {
          resolve(this.socket!);
        });

        this.socket.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
          reject(error);
        });

        this.socket.on("canvas:update", (message: any) => {
            if (message.type === "canvas:update" && message.data) {
                // Only process updates for the current tab
                if (message.data.tabId === this.tabId) {
                    if (this.updateCallback) {
                        this.updateCallback(message.data);
                    }
                }
            }
        });

        this.socket.on("disconnect", () => {
            // Optional: handle disconnect
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  async saveDataState(payload: SavePayload): Promise<boolean> {
    if (!this.config.enabled) {
      return true;
    }

    try {
      const socket = await this.connect();
      const messageId = `msg_${Date.now()}`;

      const response: any = await socket.timeout(5000).emitWithAck("canvas:save", {
            type: "canvas:save",
            messageId,
            data: {
              tabId: this.tabId,
              dataState: payload.dataState,
              timestamp: payload.timestamp,
            },
      });

      if (response && response.success) {
        this.serverVersion = payload.timestamp || Date.now();
        return true;
      }
      return false;

    } catch (error) {
      console.error("DBAdapter.saveDataState error:", error);
      return false;
    }
  }

  async loadDataState(): Promise<RemoteDataState | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const socket = await this.connect();
      const messageId = `msg_${Date.now()}`;

      const response: any = await new Promise((resolve, reject) => {
          socket.emit("canvas:load", {
              type: "canvas:load",
              messageId,
              data: { tabId: this.tabId }
          }, (response: any) => {
              resolve(response);
          });
          // Fallback timeout handled by socket.io if we used timeout(), but here we use callback
      });

      if (response && response.type === "canvas:data") {
          const data = response.data;
           // eslint-disable-next-line no-console
          console.log("DBAdapter.loadDataState received elements:", data?.elements?.length || 0);

          this.serverVersion = data?.serverTimestamp || Date.now();

          // Ensure appState has required properties
          if (data?.appState && !data.appState.collaborators) {
            data.appState.collaborators = new Map();
          }

          return data || null;
      }
      return null;

    } catch (error) {
      console.error("DBAdapter.loadDataState error:", error);
      return null;
    }
  }

  async saveFiles(fileData: { addedFiles: Map<FileId, any> }): Promise<{
    savedFiles: Map<FileId, any>;
    erroredFiles: Map<FileId, any>;
  }> {
    if (!this.config.enabled) {
      return { savedFiles: fileData.addedFiles, erroredFiles: new Map() };
    }

    try {
      const socket = await this.connect();
      const messageId = `msg_${Date.now()}`;

      const files = Array.from(fileData.addedFiles.entries()).map(
        ([fileId, file]) => ({
          id: fileId,
          ...file,
        }),
      );

      const response: any = await new Promise((resolve) => {
          socket.emit("files:save", {
            type: "files:save",
            messageId,
            data: {
              files,
              timestamp: Date.now(),
            },
          }, (res: any) => resolve(res));
      });

      const savedFiles = new Map<FileId, any>();
      const erroredFiles = new Map<FileId, any>();

      if (response && response.success) {
          response.savedFiles?.forEach((fileId: FileId) => {
            const file = fileData.addedFiles.get(fileId);
            if (file) {
              savedFiles.set(fileId, file);
            }
          });

          response.erroredFiles?.forEach((fileId: FileId) => {
            const file = fileData.addedFiles.get(fileId);
            if (file) {
              erroredFiles.set(fileId, file);
            }
          });
      } else {
          // If failed, mark all as errored
          fileData.addedFiles.forEach((file, id) => erroredFiles.set(id, file));
      }

      return { savedFiles, erroredFiles };
    } catch (error) {
      console.error("DBAdapter.saveFiles error:", error);
      return { savedFiles: new Map(), erroredFiles: fileData.addedFiles };
    }
  }

  async getFiles(ids: FileId[]): Promise<{
    loadedFiles: any[];
    erroredFiles: Map<FileId, true>;
  }> {
    if (!this.config.enabled || !ids.length) {
      return { loadedFiles: [], erroredFiles: new Map() };
    }

    try {
      const socket = await this.connect();
      const messageId = `msg_${Date.now()}`;

      const response: any = await new Promise((resolve) => {
          socket.emit("files:load", {
            type: "files:load",
            messageId,
            data: { ids },
          }, (res: any) => resolve(res));
      });

      const erroredFiles = new Map<FileId, true>(
        response?.erroredFiles || [],
      );

      return {
        loadedFiles: response?.files || [],
        erroredFiles,
      };
    } catch (error) {
      console.error("DBAdapter.getFiles error:", error);
      const erroredFiles = new Map<FileId, true>();
      ids.forEach((id) => erroredFiles.set(id, true));
      return { loadedFiles: [], erroredFiles };
    }
  }

  getServerVersion(): number {
    return this.serverVersion;
  }

  setServerVersion(version: number) {
    this.serverVersion = version;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Register callback for receiving remote canvas updates
   */
  onRemoteUpdate(callback: (data: RemoteDataState) => void): void {
    this.updateCallback = callback;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Singleton instance
let dbAdapterInstance: DBAdapterImpl | null = null;

export const initDBAdapter = (config: DBAdapterConfig) => {
  dbAdapterInstance = new DBAdapterImpl(config);
  return dbAdapterInstance;
};

export const getDBAdapter = (): DBAdapterImpl | null => {
  if (!dbAdapterInstance) {
    const endpoint = "https://darling-sincerely-crab.ngrok-free.app";
    const enabled = true;

    if (enabled && endpoint) {
      dbAdapterInstance = new DBAdapterImpl({ endpoint, enabled: true });
    } else {
      dbAdapterInstance = new DBAdapterImpl({ endpoint: "", enabled: false });
    }
  }
  return dbAdapterInstance;
};

// Export for use in components
export default getDBAdapter;
