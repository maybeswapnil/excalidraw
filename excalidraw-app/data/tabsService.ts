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
    const endpoint = "https://darling-sincerely-crab.ngrok-free.app";
    // Convert ws:// to http:// or wss:// to https://
    this.baseUrl = endpoint
      .replace(/^wss?:\/\//, (match: string) => (match === "wss://" ? "https://" : "http://"))
      .replace(/\/$/, ""); // Remove trailing slash
  }

  /**
   * Fetch all tabs
   */
  async getAllTabs(): Promise<Tab[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tabs`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
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
      const response = await fetch(`${this.baseUrl}/api/tabs/${id}`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
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
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
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
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
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
        headers: { "ngrok-skip-browser-warning": "true" },
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
