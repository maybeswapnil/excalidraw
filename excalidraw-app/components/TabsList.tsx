import React, { useEffect, useState, useRef } from "react";
import { getTabsService, Tab } from "../data/tabsService";
import "./TabsList.scss";
import { t } from "@excalidraw/excalidraw/i18n";
import clsx from "clsx";
import { useEditorInterface } from "@excalidraw/excalidraw";
import { deburr } from "@excalidraw/excalidraw/deburr";

export const TabsList: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [newTabName, setNewTabName] = useState("");

  const editorInterface = useEditorInterface();
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const handleNewTabClick = () => {
    setIsCreating(true);
    setNewTabName("");
  };

  const handleCreateTab = async () => {
    if (!newTabName.trim()) return;

    setLoading(true);
    const tabsService = getTabsService();
    const newTab = await tabsService.createTab(newTabName.trim(), [], {});

    if (newTab) {
      window.location.href = `/tab/${newTab._id}`;
    } else {
      alert("Failed to create tab");
      setLoading(false);
      setIsCreating(false);
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewTabName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateTab();
    } else if (e.key === "Escape") {
      handleCancelCreate();
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

  // Filter and Sort Tabs
  const filteredTabs = tabs.filter((tab) => {
    const searchQuery = deburr(searchInputValue.trim().toLowerCase());
    if (!searchQuery) return true;
    const name = (tab.name || "Untitled").toLowerCase();
    return deburr(name).includes(searchQuery);
  }).sort((a, b) => {
    const currentTabIdMatch = window.location.pathname.match(/^\/tab\/([a-zA-Z0-9_-]+)$/i);
    const currentTabId = currentTabIdMatch ? currentTabIdMatch[1] : "singleton";

    // 1. Selected tab always comes first
    if (a._id === currentTabId) return -1;
    if (b._id === currentTabId) return 1;

    // 2. Alphabetical sort by name
    const nameA = (a.name || "Untitled").toLowerCase();
    const nameB = (b.name || "Untitled").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="tabs-list-container">
      <div className="tabs-list-header">
        <div className={clsx("tabs-list-search", {
          hideCancelButton: editorInterface.formFactor !== "phone",
        })}>
          <input
            ref={searchInputRef}
            type="search"
            className="tabs-list-search-input"
            placeholder="Search tabs..."
            value={searchInputValue}
            onChange={(e) => setSearchInputValue(e.target.value)}
          />
        </div>
      </div>

      <div className="tabs-list-body">
        <div className="tabs-list-section-header">
          Your Tabs
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filteredTabs.length === 0 && !isCreating ? (
          <p className="tabs-list-empty">No tabs found</p>
        ) : (
          <div className="tabs-list-items">
            {!isCreating && (
              <div className="tabs-list-item tabs-list-item--add">
                <button
                  className="tabs-list-item-link"
                  onClick={handleNewTabClick}
                >
                  <div className="tabs-list-item-name">
                    + New Tab
                  </div>
                </button>
              </div>
            )}

            {isCreating && (
              <div className="tabs-list__create-form">
                <input
                  type="text"
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter tab name..."
                  autoFocus
                  className="tabs-list__create-input"
                />
                <div className="tabs-list__create-actions">
                  <button
                    className="tabs-list__create-confirm"
                    onClick={handleCreateTab}
                    disabled={!newTabName.trim()}
                  >
                    Create
                  </button>
                  <button
                    className="tabs-list__create-cancel"
                    onClick={handleCancelCreate}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {filteredTabs.map((tab) => {
              const isActive = window.location.pathname.includes(tab._id);
              return (
                <div
                  key={tab._id}
                  className={`tabs-list-item ${isActive ? "active" : ""}`}
                >
                  <a
                    href={`/tab/${tab._id}`}
                    className="tabs-list-item-link"
                  >
                    <div className="tabs-list-item-name">
                      {tab.name || (tab._id === "singleton" ? "Main Canvas" : "Untitled")}
                    </div>
                    <div className="tabs-list-item-date">
                      {new Date(tab.updatedAt).toLocaleDateString()}
                    </div>
                  </a>
                  <button
                    className="tabs-list-delete-btn"
                    onClick={(e) => handleDelete(e, tab._id, tab.name || "Untitled")}
                    title="Delete tab"
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabsList;
