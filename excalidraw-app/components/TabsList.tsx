import React, { useEffect, useState } from "react";
import { getTabsService, type Tab } from "../data/tabsService";
import "./TabsList.scss";

interface TabsListProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TabsList: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTabs();
  }, []);

  const loadTabs = async () => {
    setLoading(true);
    const tabsService = getTabsService();
    const allTabs = await tabsService.getAllTabs();
    setTabs(allTabs);
    setLoading(false);
  };

  const handleNewTab = async () => {
    const name = prompt("Enter name for new tab:", "Untitled");
    if (!name) return;

    setLoading(true);
    const tabsService = getTabsService();
    const newTab = await tabsService.createTab(name, [], {});
    if (newTab) {
      window.location.href = `/tab/${newTab._id}`;
    } else {
      alert("Failed to create tab");
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, tabId: string, tabName: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.confirm(`Are you sure you want to delete "${tabName}"?`)) {
      setLoading(true);
      const tabsService = getTabsService();
      const success = await tabsService.deleteTab(tabId);

      if (success) {
        // If we deleted the current tab, redirect to home
        if (window.location.pathname.includes(tabId)) {
          window.location.href = "/";
        } else {
          await loadTabs();
        }
      } else {
        alert("Failed to delete tab");
        setLoading(false);
      }
    }
  };

  return (
    <div className="tabs-list">
      <div className="tabs-list__header">
        <h3>Your Tabs</h3>
        <button className="tabs-list__new-btn" onClick={handleNewTab}>
          + New Tab
        </button>
      </div>

      <div className="tabs-list__body">
        {loading ? (
          <p>Loading...</p>
        ) : tabs.length === 0 ? (
          <p>No saved tabs</p>
        ) : (
          <div className="tabs-list__items">
            {tabs.map((tab) => (
              <div
                key={tab._id}
                className={`tabs-list__item-wrapper ${window.location.pathname.includes(tab._id) ? "active" : ""
                  }`}
              >
                <a
                  href={`/tab/${tab._id}`}
                  className="tabs-list__item"
                >
                  <div className="tabs-list__item-content">
                    <div className="tabs-list__item-name">
                      {tab.name || (tab._id === "singleton" ? "Main Canvas" : "Untitled")}
                    </div>
                    <div className="tabs-list__item-date">
                      {new Date(tab.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </a>
                <button
                  className="tabs-list__delete-btn"
                  onClick={(e) => handleDelete(e, tab._id, tab.name || "Untitled")}
                  title="Delete tab"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabsList;
