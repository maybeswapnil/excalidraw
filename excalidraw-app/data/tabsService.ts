/**
 * Tabs Service - Manage drawing tabs in MongoDB
 */

export interface Tab {
  _id: string;
  name: string;
  elements: any[];
  appState: any;
  createdAt: Date;
  updatedAt: Date;
}

class TabsServiceImpl {
  private baseUrl: string;

  constructor() {
    // Get backend URL from environment or default to localhost
    const endpoint = import.meta.env.VITE_REMOTE_SYNC_ENDPOINT || "ws://localhost:5000";
    // Convert ws:// to http:// or wss:// to https://
    this.baseUrl = endpoint
      .replace(/^wss?:\/\//, (match) => (match === "wss://" ? "https://" : "http://"))
      .replace(/\/$/, ""); // Remove trailing slash
  }

  /**
   * Fetch all tabs
   */
  async getAllTabs(): Promise<Tab[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tabs`);
      if (!response.ok) throw new Error("Failed to fetch tabs");
      const data = await response.json();
      return data.tabs || [];
    } catch (error) {
      console.error("Error fetching tabs:", error);
      return [];
    }
  }

  /**
   * Get a specific tab
   */
  async getTab(id: string): Promise<Tab | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tabs/${id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch tab");
      }
      const data = await response.json();
      return data.tab || null;
    } catch (error) {
      console.error("Error fetching tab:", error);
      return null;
    }
  }

  /**
   * Create a new tab
   */
  async createTab(name: string, elements: any[], appState: any): Promise<Tab | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tabs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, elements, appState }),
      });
      if (!response.ok) throw new Error("Failed to create tab");
      const data = await response.json();
      return data.tab || null;
    } catch (error) {
      console.error("Error creating tab:", error);
      return null;
    }
  }

  /**
   * Update a tab
   */
  async updateTab(id: string, updates: Partial<Tab>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tabs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update tab");
      return true;
    } catch (error) {
      console.error("Error updating tab:", error);
      return false;
    }
  }

  /**
   * Delete a tab
   */
  async deleteTab(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tabs/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete tab");
      return true;
    } catch (error) {
      console.error("Error deleting tab:", error);
      return false;
    }
  }

  /**
   * Save current drawing as a tab
   */
  async saveAsTab(name: string, elements: any[], appState: any): Promise<Tab | null> {
    return this.createTab(name, elements, appState);
  }

  /**
   * Load a tab
   */
  async loadTab(id: string): Promise<{ elements: any[]; appState: any } | null> {
    const tab = await this.getTab(id);
    if (!tab) return null;
    return {
      elements: tab.elements,
      appState: tab.appState,
    };
  }
}

// Singleton instance
let tabsServiceInstance: TabsServiceImpl | null = null;

export const getTabsService = (): TabsServiceImpl => {
  if (!tabsServiceInstance) {
    tabsServiceInstance = new TabsServiceImpl();
  }
  return tabsServiceInstance;
};

export default getTabsService;
