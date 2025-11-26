import "@excalidraw/excalidraw/global";
import "@excalidraw/excalidraw/css";

declare global {
  interface Window {
    __EXCALIDRAW_SHA__: string | undefined;
    EXCALIDRAW_CONFIG?: {
      VITE_REMOTE_SYNC_ENDPOINT?: string;
      VITE_ENABLE_REMOTE_SYNC?: string;
    };
  }
}

export {};
