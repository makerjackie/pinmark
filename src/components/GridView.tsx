import React, { useState, useEffect, useRef, useMemo } from "react";
import type { BookmarkNode } from "../lib/types";

interface Props {
  tree: BookmarkNode[];
  searchQuery: string;
  onMove: (id: string, destinationFolderId: string) => void;
  onDeleteSelected: (ids: string[]) => void;
  onDeleteFolder?: (folderId: string, folderTitle: string) => void;
  onContextMenu: (e: React.MouseEvent, node: BookmarkNode) => void;
}

interface FolderSection {
  folder: BookmarkNode;
  bookmarks: BookmarkNode[];
  breadcrumb: string[]; // ancestor titles, e.g. ["书签栏", "工作"]
}

type SortMode = "folder" | "time";

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
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return "本周";
  if (months < 1) return `${days} 天前`;
  if (years === 0) return `${months} 个月前`;
  if (years === 1) return "去年";
  if (years === 2) return "前年";
  return `${years} 年前`;
}

export default function GridView({
  tree,
  searchQuery,
  onMove,
  onDeleteSelected,
  onDeleteFolder,
  onContextMenu,
}: Props) {
  const [sections, setSections] = useState<FolderSection[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("folder");
  const dragData = useRef<string[] | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [folderMenu, setFolderMenu] = useState<{ x: number; y: number; node: BookmarkNode } | null>(null);
  const [deadLinks, setDeadLinks] = useState<Set<string>>(new Set());
  const [checkingLinks, setCheckingLinks] = useState(false);

  // Build sections: each folder with bookmarks or sub-folders = one column
  useEffect(() => {
    const result: FolderSection[] = [];
    const walk = (nodes: BookmarkNode[], ancestors: BookmarkNode[] = []) => {
      for (const node of nodes) {
        if (!node.children) continue;
        const directBms = node.children.filter((c) => !!c.url);
        const hasSubFolders = node.children.some((c) => !!c.children);
        if (directBms.length > 0 || hasSubFolders) {
          result.push({
            folder: node,
            bookmarks: directBms,
            breadcrumb: ancestors.map((a) => a.title),
          });
        }
        walk(node.children, [...ancestors, node]);
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

  useEffect(() => {
    if (!folderMenu) return;
    const close = () => setFolderMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [folderMenu]);

  // Dead link detection
  useEffect(() => {
    const allBookmarks: BookmarkNode[] = [];
    for (const s of sections) {
      for (const b of s.bookmarks) allBookmarks.push(b);
    }
    if (allBookmarks.length === 0) return;

    setCheckingLinks(true);
    const dead = new Set<string>();
    let completed = 0;
    const controller = new AbortController();

    for (const bm of allBookmarks) {
      if (!bm.url) continue;
      fetch(bm.url, { method: "HEAD", mode: "no-cors", signal: controller.signal })
        .then((res) => {
          // no-cors mode returns opaque response → status is always 0
          // If we get here, the request didn't throw → link is reachable
        })
        .catch(() => {
          dead.add(bm.id);
        })
        .finally(() => {
          completed++;
          if (completed >= allBookmarks.length) {
            setDeadLinks(dead);
            setCheckingLinks(false);
          }
        });
    }

    // If all finish synchronously (or fail fast), ensure state updates
    setTimeout(() => {
      if (completed < allBookmarks.length) return;
      setDeadLinks(dead);
      setCheckingLinks(false);
    }, 100);

    return () => controller.abort();
  }, [sections]);

  // Listen for keyboard events from App
  useEffect(() => {
    const onSelectAll = () => selectAll();
    const onDelete = () => handleDeleteSelected();
    window.addEventListener("grid-select-all", onSelectAll);
    window.addEventListener("grid-delete-selected", onDelete);
    return () => {
      window.removeEventListener("grid-select-all", onSelectAll);
      window.removeEventListener("grid-delete-selected", onDelete);
    };
  }, [sections, sortMode, selectedIds]);

  // Time-sorted — oldest first
  const timeSortedBookmarks = useMemo(() => {
    const all: BookmarkNode[] = [];
    for (const s of sections) {
      for (const b of s.bookmarks) all.push(b);
    }
    all.sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return all.filter(
        (b) => b.title.toLowerCase().includes(q) || (b.url || "").toLowerCase().includes(q)
      );
    }
    return all;
  }, [sections, searchQuery]);

  const timeGroups = useMemo(() => {
    const map = new Map<string, BookmarkNode[]>();
    for (const b of timeSortedBookmarks) {
      const bucket = timeBucket(b.dateAdded || 0);
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket)!.push(b);
    }
    return Array.from(map.entries())
      .map(([label, bookmarks]) => ({
        label,
        bookmarks,
        sortKey: Math.min(...bookmarks.map((b) => b.dateAdded || 0)),
      }))
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [timeSortedBookmarks]);

  // Filter sections by search
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
    for (const id of selectedIds) onMove(id, destFolderId);
    clearSelection();
    setShowFolderPicker(false);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    const ids = selectedIds.has(id) && selectedIds.size > 1
      ? [...selectedIds]
      : [id];
    dragData.current = ids;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify(ids));
  };

  const handleSectionDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOverFolder(null);
    if (dragData.current) {
      for (const id of dragData.current) {
        onMove(id, folderId);
      }
      dragData.current = null;
    }
  };

  // All folders flat list for move picker
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

  const handleFolderRightClick = (e: React.MouseEvent, node: BookmarkNode) => {
    e.preventDefault();
    e.stopPropagation();
    if (node.id === "0" || node.id === "1") return;
    setFolderMenu({ x: e.clientX, y: e.clientY, node });
  };

  const handleFolderMenuAction = (action: string) => {
    if (action === "delete-folder" && folderMenu) {
      if (onDeleteFolder) {
        onDeleteFolder(folderMenu.node.id, folderMenu.node.title);
      } else {
        chrome.bookmarks.removeTree(folderMenu.node.id).then(() => window.location.reload());
      }
    }
    setFolderMenu(null);
  };

  const hasItems = sortMode === "folder" ? filteredSections.length > 0 : timeGroups.length > 0;

  const showBrokenInfo = !checkingLinks && deadLinks.size > 0;

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

      {showBrokenInfo && (
        <div className="grid-section grid-section-warning" style={{ padding: "8px 16px", gridColumn: "1 / -1" }}>
          ⚠️ 发现 {deadLinks.size} 个可能失效的链接（显示为 <span className="grid-card-broken">🔴</span>）
        </div>
      )}

      {/* Folder mode — each folder = one column */}
      {sortMode === "folder" &&
        filteredSections.map((section) => (
          <div
            key={section.folder.id}
            data-folder-id={section.folder.id}
            className={`grid-section ${dragOverFolder === section.folder.id ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverFolder(section.folder.id); }}
            onDragLeave={() => setDragOverFolder(null)}
            onDrop={(e) => handleSectionDrop(e, section.folder.id)}
          >
            <div
              className="grid-section-header"
              onClick={() => toggleSection(section.folder.id)}
              onContextMenu={(e) => handleFolderRightClick(e, section.folder)}
            >
              <span className="grid-section-toggle">
                {collapsedSections.has(section.folder.id) ? "▶" : "▼"}
              </span>
              <span className="grid-section-icon">📁</span>
              <div className="grid-section-title-wrap">
                <h2 className="grid-section-title">{section.folder.title}</h2>
                {section.breadcrumb.length > 0 && (
                  <span className="grid-section-breadcrumb">
                    {section.breadcrumb.join(" › ")}
                  </span>
                )}
              </div>
              <span className="grid-section-count">{section.bookmarks.length}</span>
            </div>
            {!collapsedSections.has(section.folder.id) && (
              <div className="grid-section-body">
                {section.bookmarks.map((bm) => (
                  <BookmarkCard
                    key={bm.id}
                    bm={bm}
                    isSelected={selectedIds.has(bm.id)}
                    isBroken={deadLinks.has(bm.id)}
                    onDragStart={handleDragStart}
                    onClick={handleCardClick}
                    onContextMenu={onContextMenu}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

      {/* Time mode */}
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
                  isBroken={deadLinks.has(bm.id)}
                  timeLabel={relativeTime(bm.dateAdded || 0)}
                  onDragStart={handleDragStart}
                  onClick={handleCardClick}
                  onContextMenu={onContextMenu}
                />
              ))}
            </div>
          </div>
        ))}

      {/* Folder right-click menu */}
      {folderMenu && (
        <div
          className="context-menu"
          style={{ left: folderMenu.x, top: folderMenu.y, position: "fixed" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={() => handleFolderMenuAction("delete-folder")}>
            删除文件夹
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bookmark Card ───

function BookmarkCard({
  bm,
  isSelected,
  isBroken,
  timeLabel,
  onDragStart,
  onClick,
  onContextMenu,
}: {
  bm: BookmarkNode;
  isSelected: boolean;
  isBroken?: boolean;
  timeLabel?: string;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: (e: React.MouseEvent, bm: BookmarkNode) => void;
  onContextMenu: (e: React.MouseEvent, node: BookmarkNode) => void;
}) {
  return (
    <div
      className={`grid-card ${isSelected ? "selected" : ""}`}
      draggable
      onDragStart={(e) => onDragStart(e, bm.id)}
      onClick={(e) => onClick(e, bm)}
      onContextMenu={(e) => onContextMenu(e, bm)}
      title={`${bm.title}\n${bm.url}${timeLabel ? `\n收藏: ${timeLabel}` : ""}${isBroken ? "\n⚠️ 链接可能已失效" : ""}`}
    >
      <span className="grid-card-check">{isSelected ? "◉" : "○"}</span>
      <img
        className="grid-card-favicon"
        src={bm.url ? `https://www.google.com/s2/favicons?domain=${new URL(bm.url).hostname}&sz=32` : ""}
        alt=""
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <span className="grid-card-title">{bm.title || "无标题"}</span>
      {isBroken && <span className="grid-card-broken">🔴</span>}
      {timeLabel && <span className="grid-card-time">{timeLabel}</span>}
    </div>
  );
}
