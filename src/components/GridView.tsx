import React, { useState, useEffect, useRef, useMemo } from "react";
import type { BookmarkNode } from "../lib/types";

interface Props {
  tree: BookmarkNode[];
  searchQuery: string;
  onMove: (id: string, destinationFolderId: string) => void;
  onDeleteSelected: (ids: string[]) => void;
  onContextMenu: (e: React.MouseEvent, node: BookmarkNode) => void;
}

interface FolderSection {
  folder: BookmarkNode;
  bookmarks: BookmarkNode[];
}

type SortMode = "folder" | "time";

// relative time helper
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;
  return `${Math.floor(days / 365)} 年前`;
}

function timeBucket(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return "本周";
  if (days < 30) return "本月";
  if (days < 365) return "今年";
  return "更早";
}

export default function GridView({
  tree,
  searchQuery,
  onMove,
  onDeleteSelected,
  onContextMenu,
}: Props) {
  const [sections, setSections] = useState<FolderSection[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("folder");
  const dragBookmark = useRef<{ id: string; parentId?: string } | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Build folder sections
  useEffect(() => {
    const result: FolderSection[] = [];
    const walk = (nodes: BookmarkNode[]) => {
      for (const node of nodes) {
        if (node.children) {
          const bookmarks = node.children.filter((c) => !!c.url);
          if (bookmarks.length > 0 || node.children.some((c) => c.children)) {
            result.push({ folder: node, bookmarks });
          }
          for (const child of node.children) {
            if (child.children) walk([child]);
          }
        }
      }
    };
    walk(tree);
    result.sort((a, b) => {
      if (a.folder.id === "1") return -1;
      if (b.folder.id === "1") return 1;
      return a.folder.title.localeCompare(b.folder.title);
    });
    setSections(result);
  }, [tree]);

  // close folder picker on outside click
  useEffect(() => {
    if (!showFolderPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowFolderPicker(false);
      }
    };
    setTimeout(() => document.addEventListener("click", handler), 0);
    return () => document.removeEventListener("click", handler);
  }, [showFolderPicker]);

  // Flatten all bookmarks sorted by time
  const timeSortedBookmarks = useMemo(() => {
    const all: BookmarkNode[] = [];
    for (const s of sections) {
      for (const b of s.bookmarks) all.push(b);
    }
    all.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return all.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.url || "").toLowerCase().includes(q)
      );
    }
    return all;
  }, [sections, searchQuery]);

  // Group time-sorted bookmarks by time bucket
  const timeGroups = useMemo(() => {
    const groups: { label: string; bookmarks: BookmarkNode[] }[] = [];
    const map = new Map<string, BookmarkNode[]>();
    for (const b of timeSortedBookmarks) {
      const bucket = timeBucket(b.dateAdded || 0);
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket)!.push(b);
    }
    const order = ["今天", "昨天", "本周", "本月", "今年", "更早"];
    for (const label of order) {
      if (map.has(label)) groups.push({ label, bookmarks: map.get(label)! });
    }
    return groups;
  }, [timeSortedBookmarks]);

  // filtered sections for folder mode
  const filteredSections = searchQuery
    ? sections
        .map((s) => ({
          ...s,
          bookmarks: s.bookmarks.filter(
            (b) =>
              b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (b.url || "").toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((s) => s.bookmarks.length > 0)
    : sections;

  const totalSelected = selectedIds.size;

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCardClick = (e: React.MouseEvent, bm: BookmarkNode) => {
    if ((e.target as HTMLElement).closest(".grid-card-check")) {
      toggleSelect(bm.id);
      return;
    }
    if (totalSelected > 0) {
      toggleSelect(bm.id);
      return;
    }
    if (bm.url) chrome.tabs.create({ url: bm.url });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set<string>();
    const items = sortMode === "folder" ? filteredSections : timeGroups;
    for (const s of items) {
      for (const b of s.bookmarks) all.add(b.id);
    }
    setSelectedIds(all);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleDeleteSelected = () => {
    if (totalSelected === 0) return;
    onDeleteSelected([...selectedIds]);
    clearSelection();
  };

  const handleMoveSelected = (destFolderId: string) => {
    for (const id of selectedIds) {
      onMove(id, destFolderId);
    }
    clearSelection();
    setShowFolderPicker(false);
  };

  const handleDragStart = (e: React.DragEvent, bm: BookmarkNode) => {
    dragBookmark.current = { id: bm.id, parentId: bm.parentId };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", bm.id);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOverFolder(folderId);
  };

  const handleDragLeave = () => setDragOverFolder(null);

  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOverFolder(null);
    if (dragBookmark.current) {
      onMove(dragBookmark.current.id, folderId);
      dragBookmark.current = null;
    }
  };

  // collect all folders for move picker
  const folderList = useMemo(() => {
    const folders: { id: string; title: string }[] = [];
    const walk = (nodes: BookmarkNode[]) => {
      for (const n of nodes) {
        if (n.children && n.id !== "0") {
          folders.push({ id: n.id, title: n.title });
          walk(n.children);
        }
      }
    };
    walk(tree);
    return folders;
  }, [tree]);

  const hasItems = sortMode === "folder" ? filteredSections.length > 0 : timeGroups.length > 0;

  if (!hasItems) {
    return (
      <div className="grid-view-empty">
        <p>{searchQuery ? "没有匹配的书签" : "暂无书签"}</p>
      </div>
    );
  }

  return (
    <div className="grid-view">
      {/* Sort toggle */}
      <div className="grid-sort-bar">
        <button
          className={`sort-btn ${sortMode === "folder" ? "active" : ""}`}
          onClick={() => { setSortMode("folder"); clearSelection(); }}
        >
          📁 按文件夹
        </button>
        <button
          className={`sort-btn ${sortMode === "time" ? "active" : ""}`}
          onClick={() => { setSortMode("time"); clearSelection(); }}
        >
          🕐 按收藏时间
        </button>
      </div>

      {/* Batch toolbar */}
      {totalSelected > 0 && (
        <div className="grid-batch-bar">
          <span className="grid-batch-info">已选择 {totalSelected} 项</span>
          <button className="batch-btn" onClick={selectAll}>☐ 全选</button>
          <button className="batch-btn batch-btn-danger" onClick={handleDeleteSelected}>🗑 删除选中</button>
          <div className="batch-move-wrap" ref={pickerRef}>
            <button className="batch-btn" onClick={() => setShowFolderPicker(!showFolderPicker)}>
              📂 移动到...
            </button>
            {showFolderPicker && (
              <div className="batch-folder-picker">
                {folderList.map((f) => (
                  <div key={f.id} className="batch-folder-item" onClick={() => handleMoveSelected(f.id)}>
                    📁 {f.title}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="batch-btn batch-btn-cancel" onClick={clearSelection}>✕ 取消</button>
        </div>
      )}

      {/* Content: folder mode */}
      {sortMode === "folder" &&
        filteredSections.map((section) => (
          <div
            key={section.folder.id}
            className={`grid-section ${dragOverFolder === section.folder.id ? "drag-over" : ""}`}
            onDragOver={(e) => handleDragOver(e, section.folder.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, section.folder.id)}
          >
            <div className="grid-section-header" onClick={() => toggleSection(section.folder.id)}>
              <span className="grid-section-toggle">
                {collapsedSections.has(section.folder.id) ? "▶" : "▼"}
              </span>
              <span className="grid-section-icon">📁</span>
              <h2 className="grid-section-title">{section.folder.title}</h2>
              <span className="grid-section-count">{section.bookmarks.length}</span>
            </div>
            {!collapsedSections.has(section.folder.id) && (
              <div className="grid-section-body">
                {section.bookmarks.map((bm) => (
                  <BookmarkCard
                    key={bm.id}
                    bm={bm}
                    isSelected={selectedIds.has(bm.id)}
                    onDragStart={handleDragStart}
                    onClick={handleCardClick}
                    onContextMenu={onContextMenu}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

      {/* Content: time mode */}
      {sortMode === "time" &&
        timeGroups.map((group) => (
          <div key={group.label} className="grid-section">
            <div className="grid-section-header">
              <span className="grid-section-icon">🕐</span>
              <h2 className="grid-section-title">{group.label}</h2>
              <span className="grid-section-count">{group.bookmarks.length}</span>
            </div>
            <div className="grid-section-body">
              {group.bookmarks.map((bm) => (
                <BookmarkCard
                  key={bm.id}
                  bm={bm}
                  isSelected={selectedIds.has(bm.id)}
                  timeLabel={relativeTime(bm.dateAdded || 0)}
                  onDragStart={handleDragStart}
                  onClick={handleCardClick}
                  onContextMenu={onContextMenu}
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

// Individual bookmark card
function BookmarkCard({
  bm,
  isSelected,
  timeLabel,
  onDragStart,
  onClick,
  onContextMenu,
}: {
  bm: BookmarkNode;
  isSelected: boolean;
  timeLabel?: string;
  onDragStart: (e: React.DragEvent, bm: BookmarkNode) => void;
  onClick: (e: React.MouseEvent, bm: BookmarkNode) => void;
  onContextMenu: (e: React.MouseEvent, node: BookmarkNode) => void;
}) {
  return (
    <div
      className={`grid-card ${isSelected ? "selected" : ""}`}
      draggable
      onDragStart={(e) => onDragStart(e, bm)}
      onClick={(e) => onClick(e, bm)}
      onContextMenu={(e) => onContextMenu(e, bm)}
      title={`${bm.title}\n${bm.url}${timeLabel ? `\n收藏: ${timeLabel}` : ""}`}
    >
      <span className="grid-card-check">
        {isSelected ? "◉" : "○"}
      </span>
      <img
        className="grid-card-favicon"
        src={bm.url ? `https://www.google.com/s2/favicons?domain=${new URL(bm.url).hostname}&sz=32` : ""}
        alt=""
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <span className="grid-card-title">{bm.title || "无标题"}</span>
      {timeLabel && <span className="grid-card-time">{timeLabel}</span>}
    </div>
  );
}
