import React, { useState } from "react";
import { getTabsService } from "../data/tabsService";
import type { OrderedExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";

interface SaveTabDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (tabId: string) => void;
  elements: readonly OrderedExcalidrawElement[];
  appState: AppState;
}

export const SaveTabDialog: React.FC<SaveTabDialogProps> = ({
  isOpen,
  onClose,
  onSaved,
  elements,
  appState,
}) => {
  const [tabName, setTabName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!tabName.trim()) {
      alert("Please enter a tab name");
      return;
    }

    setSaving(true);
    const tabsService = getTabsService();
    const newTab = await (tabsService as any).createTab(
      tabName.trim(),
      Array.from(elements),
      appState
    );

    setSaving(false);

    if (newTab) {
      setTabName("");
      onClose();
      if (onSaved) {
        onSaved(newTab._id);
      }
      // Redirect to the new tab
      window.location.href = `/tab/${newTab._id}`;
    } else {
      alert("Failed to save tab");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !saving) {
      handleSave();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="save-tab-dialog__overlay" onClick={onClose}>
      <div
        className="save-tab-dialog__content"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Save Drawing as Tab</h2>
        <input
          type="text"
          placeholder="Enter tab name"
          value={tabName}
          onChange={(e) => setTabName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
          autoFocus
          className="save-tab-dialog__input"
        />
        <div className="save-tab-dialog__buttons">
          <button
            onClick={onClose}
            disabled={saving}
            className="save-tab-dialog__btn-cancel"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !tabName.trim()}
            className="save-tab-dialog__btn-save"
          >
            {saving ? "Saving..." : "Save Tab"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveTabDialog;
