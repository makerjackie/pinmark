import React, { useState, useRef, useCallback } from "react";
import { useBookmarks } from "../../src/hooks/useBookmarks";
import Header from "../../src/components/Header";
import FolderTree from "../../src/components/FolderTree";
import BookmarkList from "../../src/components/BookmarkList";
import ToolBar from "../../src/components/ToolBar";
import GridView from "../../src/components/GridView";
import ContextMenu from "../../src/components/ContextMenu";
import Toast from "../../src/components/Toast";
import type { BookmarkNode, ContextMenuState } from "../../src/lib/types";

export default function App() {
  const {
    tree,
    flatFolders,
    selectedFolder,
    selectFolder,
    selectedBookmarkIds,
    toggleBookmark,
    toggleSelectAll,
    deleteSelected,
    moveBookmark,
    deleteFolder,
    createFolder,
    searchQuery,
    setSearchQuery,
    filteredBookmarks,
    bookmarkCount,
    emptyFolders,
    duplicateBookmarks,
  } = useBookmarks();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("pinmark-dark") === "true");
  const [toast, setToast] = useState<{ message: string; onUndo?: () => void } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // Store deleted items for undo
  const deletedItems = useRef<{ id: string; parentId?: string; index?: number; title?: string; url?: string }[]>([]);

  // Dark mode effect
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("pinmark-dark", String(darkMode));
  }, [darkMode]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if typing in search
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape") {
        setContextMenu(null);
        return;
      }

      // ⌘F / Ctrl+F → focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      // ⌘A / Ctrl+A → select all (only in grid mode)
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        if (viewMode === "grid") {
          e.preventDefault();
          // Trigger select all via the grid view
          window.dispatchEvent(new CustomEvent("grid-select-all"));
        }
        return;
      }

      // Delete / Backspace → delete selected
      if (e.key === "Delete" || e.key === "Backspace") {
        if (viewMode === "grid") {
          window.dispatchEvent(new CustomEvent("grid-delete-selected"));
        } else if (selectedBookmarkIds.size > 0) {
          deleteSelected();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [viewMode, selectedBookmarkIds, deleteSelected]);

  // Toast auto-dismiss
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message: string, onUndo?: () => void) => {
    setToast({ message, onUndo });
  };

  // Save folder tree structure for undo
  const saveFolderTree = useCallback((node: chrome.bookmarks.BookmarkTreeNode): any => ({
    parentId: node.parentId,
    title: node.title,
    url: node.url,
    index: node.index,
    children: node.children?.map((c) => saveFolderTree(c)),
  }), []);

  // Delete a folder with undo support
  const handleDeleteFolderWithUndo = useCallback(async (folderId: string, folderTitle: string) => {
    try {
      const [node] = await chrome.bookmarks.getSubTree(folderId);
      const saved = saveFolderTree(node);
      await chrome.bookmarks.removeTree(folderId);
      showToast(
        `已删除文件夹「${folderTitle}」及其所有书签`,
        async () => {
          // Restore recursively
          const restore = async (data: any, parentId?: string) => {
            const created = await chrome.bookmarks.create({
              parentId: parentId || saved.parentId || "1",
              title: data.title,
              url: data.url,
              index: data.index,
            });
            if (data.children) {
              for (const child of data.children) {
                await restore(child, created.id);
              }
            }
          };
          for (const child of saved.children || []) {
            await restore(child);
          }
          window.location.reload();
        }
      );
      window.location.reload();
    } catch {
      showToast(`删除文件夹失败`);
    }
  }, [saveFolderTree]);

  // Wrap delete to support undo
  const deleteWithUndo = useCallback(
    async (ids: string[]) => {
      const saved: { id: string; node: chrome.bookmarks.BookmarkTreeNode }[] = [];
      for (const id of ids) {
        try {
          const [node] = await chrome.bookmarks.get(id);
          saved.push({ id, node });
          await chrome.bookmarks.remove(id);
        } catch {
          try {
            const [node] = await chrome.bookmarks.getSubTree(id);
            saved.push({ id, node: node[0] });
            await chrome.bookmarks.removeTree(id);
          } catch {
            // skip
          }
        }
      }
      showToast(
        `已删除 ${saved.length} 个书签`,
        () => {
          // Undo: re-create each
          Promise.all(
            saved.map(({ node }) =>
              chrome.bookmarks.create({
                parentId: node.parentId || "1",
                title: node.title,
                url: node.url,
                index: node.index,
              })
            )
          ).then(() => window.location.reload());
        }
      );
      window.location.reload();
    },
    []
  );

  const handleFolderContextMenu = (e: React.MouseEvent, node: BookmarkNode) => {
    e.preventDefault();
    e.stopPropagation();
    if (node.id === "0" || node.id === "1") return;
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: "folder",
      node,
    });
  };

  const handleBookmarkContextMenu = (e: React.MouseEvent, node: BookmarkNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: "bookmark",
      node,
    });
  };

  const handleContextMenuAction = async (action: string) => {
    if (!contextMenu) return;
    const node = contextMenu.node!;

    if (action === "delete-folder") {
      await handleDeleteFolderWithUndo(node.id, node.title);
    }
    if (action === "delete-bookmark") {
      await chrome.bookmarks.remove(node.id);
      showToast(`已删除「${node.title}」`);
      window.location.reload();
    }
    if (action === "open-all") {
      // Open all bookmarks in the folder
      const urls: string[] = [];
      const collect = (nodes: BookmarkNode[]) => {
        for (const n of nodes) {
          if (n.url) urls.push(n.url);
          if (n.children) collect(n.children);
        }
      };
      collect(node.children || []);
      for (const url of urls) {
        chrome.tabs.create({ url });
      }
      showToast(`已打开 ${urls.length} 个书签`);
    }
    setContextMenu(null);
  };

  React.useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const handleGridFolderSelect = (id: string) => {
    selectFolder(id);
    const el = document.querySelector(`[data-folder-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleGridDropBookmarks = async (ids: string[], destinationFolderId: string) => {
    for (const id of ids) {
      await moveBookmark(id, destinationFolderId);
    }
  };

  const currentBookmarks = selectedFolder
    ? filteredBookmarks.filter((n) => n.parentId === selectedFolder)
    : [];

  const currentFolderTitle =
    selectedFolder && flatFolders.find((f) => f.id === selectedFolder)?.title;

  return (
    <div className={`app view-${viewMode}${darkMode ? " dark" : ""}`}>
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        bookmarkCount={bookmarkCount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        darkMode={darkMode}
        onDarkModeChange={setDarkMode}
        searchRef={searchRef}
      />

      {viewMode === "grid" ? (
        <div className="main-layout">
          <aside className="folder-panel">
            <FolderTree
              tree={tree}
              selectedFolder={selectedFolder}
              onSelect={handleGridFolderSelect}
              onContextMenu={handleFolderContextMenu}
              onDropBookmarks={handleGridDropBookmarks}
            />
            <button
              className="btn-new-folder"
              onClick={() => createFolder(selectedFolder || "1")}
            >
              + 新建文件夹
            </button>
          </aside>
          <main className="grid-layout">
            <GridView
              tree={tree}
              searchQuery={searchQuery}
              onMove={moveBookmark}
              onDeleteSelected={deleteWithUndo}
              onDeleteFolder={handleDeleteFolderWithUndo}
              onContextMenu={handleBookmarkContextMenu}
            />
          </main>
        </div>
      ) : (
        <div className="main-layout">
          <aside className="folder-panel">
            <FolderTree
              tree={tree}
              selectedFolder={selectedFolder}
              onSelect={selectFolder}
              onContextMenu={handleFolderContextMenu}
            />
            <button
              className="btn-new-folder"
              onClick={() => createFolder(selectedFolder || "1")}
            >
              + 新建文件夹
            </button>
          </aside>
          <main className="bookmark-panel">
            {selectedFolder ? (
              <>
                <ToolBar
                  folderTitle={currentFolderTitle || ""}
                  bookmarkCount={currentBookmarks.length}
                  selectedCount={selectedBookmarkIds.size}
                  allSelected={
                    currentBookmarks.length > 0 &&
                    currentBookmarks.every((b) => selectedBookmarkIds.has(b.id))
                  }
                  onToggleSelectAll={() =>
                    toggleSelectAll(
                      currentBookmarks.map((b) => b.id),
                      currentBookmarks.every((b) => selectedBookmarkIds.has(b.id))
                    )
                  }
                  onDeleteSelected={deleteSelected}
                  emptyFolders={emptyFolders}
                  duplicateBookmarks={duplicateBookmarks}
                />
                <BookmarkList
                  bookmarks={currentBookmarks}
                  selectedIds={selectedBookmarkIds}
                  onToggle={toggleBookmark}
                  onMove={moveBookmark}
                  onContextMenu={handleBookmarkContextMenu}
                />
              </>
            ) : (
              <div className="empty-state">
                <p>请从左侧选择一个文件夹</p>
              </div>
            )}
          </main>
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          onAction={handleContextMenuAction}
        />
      )}

      {toast && <Toast message={toast.message} onUndo={toast.onUndo} onClose={() => setToast(null)} />}
    </div>
  );
}
