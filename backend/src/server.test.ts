/**
 * Integration test for DBAdapter and MongoDB sync.
 *
 * Run with: npm test
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Mock types since we can't import the actual DBAdapter in test
interface SavePayload {
  dataState: {
    elements: any[];
    appState: any;
    libraryItems?: any[];
  };
  timestamp: number;
  clientId: string;
}

describe("DBAdapter Integration", () => {
  const endpoint = "http://localhost:5000";

  beforeAll(() => {
    // Note: Backend should be running before tests
    // eslint-disable-next-line no-console
    console.log(`Testing against backend: ${endpoint}`);
  });

  afterAll(() => {
    // Cleanup
  });

  it("should have backend health check endpoint", async () => {
    const response = await fetch(`${endpoint}/health`);
    expect(response.ok).toBe(true);
    const data = (await response.json()) as any;
    expect(data.status).toBe("ok");
  });

  it("should save canvas state to MongoDB", async () => {
    const payload: SavePayload = {
      clientId: "test_client_123",
      dataState: {
        elements: [
          {
            id: "elem1",
            type: "rectangle",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
          } as any,
        ],
        appState: {
          viewBackgroundColor: "#ffffff",
        },
        libraryItems: [],
      },
      timestamp: Date.now(),
    };

    const response = await fetch(`${endpoint}/api/canvas`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(response.ok).toBe(true);
    const result = (await response.json()) as any;
    expect(result.success).toBe(true);
    expect(result.serverTimestamp).toBeDefined();
  });

  it("should load canvas state from MongoDB", async () => {
    const response = await fetch(`${endpoint}/api/canvas`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    expect(response.ok).toBe(true);
    const data = (await response.json()) as any;
    expect(data.elements).toBeDefined();
    expect(data.appState).toBeDefined();
    expect(data.serverTimestamp).toBeDefined();
  });

  it("should save files to MongoDB", async () => {
    const payload = {
      clientId: "test_client_123",
      files: [
        {
          id: "file_1",
          dataURL:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          mimeType: "image/png",
          created: Date.now(),
          lastRetrieved: Date.now(),
          version: 1,
        },
      ],
      timestamp: Date.now(),
    };

    const response = await fetch(`${endpoint}/api/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(response.ok).toBe(true);
    const result = (await response.json()) as any;
    expect(result.success).toBe(true);
    expect(Array.isArray(result.savedFiles)).toBe(true);
  });

  it("should load files from MongoDB", async () => {
    const response = await fetch(`${endpoint}/api/files?ids=file_1`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    expect(response.ok).toBe(true);
    const result = (await response.json()) as any;
    expect(Array.isArray(result.files)).toBe(true);
    expect(Array.isArray(result.erroredFiles)).toBe(true);
  });
});
