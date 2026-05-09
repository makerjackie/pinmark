import React, { useState } from "react";
import { useBookmarks } from "../../src/hooks/useBookmarks";
import Header from "../../src/components/Header";
import FolderTree from "../../src/components/FolderTree";
import BookmarkList from "../../src/components/BookmarkList";
import ToolBar from "../../src/components/ToolBar";
import GridView from "../../src/components/GridView";
import ContextMenu from "../../src/components/ContextMenu";
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

  const handleContextMenuAction = (action: string) => {
    if (!contextMenu) return;
    if (action === "delete-folder" && contextMenu.node) {
      deleteFolder(contextMenu.node.id);
    }
    if (action === "delete-bookmark" && contextMenu.node) {
      chrome.bookmarks.remove(contextMenu.node.id);
    }
    setContextMenu(null);
  };

  React.useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const currentBookmarks = selectedFolder
    ? filteredBookmarks.filter((n) => n.parentId === selectedFolder)
    : [];

  const currentFolderTitle =
    selectedFolder && flatFolders.find((f) => f.id === selectedFolder)?.title;

  return (
    <div className={`app view-${viewMode}`}>
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        bookmarkCount={bookmarkCount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {viewMode === "grid" ? (
        <div className="grid-layout">
          <GridView
            tree={tree}
            searchQuery={searchQuery}
            onMove={moveBookmark}
            onContextMenu={handleBookmarkContextMenu}
          />
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
    </div>
  );
}
