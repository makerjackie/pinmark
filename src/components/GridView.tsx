import React, { useState, useEffect, useRef } from "react";
import type { BookmarkNode } from "../lib/types";

interface Props {
  tree: BookmarkNode[];
  searchQuery: string;
  onMove: (id: string, destinationFolderId: string) => void;
  onContextMenu: (e: React.MouseEvent, node: BookmarkNode) => void;
}

interface FolderSection {
  folder: BookmarkNode;
  bookmarks: BookmarkNode[];
}

export default function GridView({ tree, searchQuery, onMove, onContextMenu }: Props) {
  const [sections, setSections] = useState<FolderSection[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const dragBookmark = useRef<{ id: string; parentId?: string } | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  useEffect(() => {
    const result: FolderSection[] = [];
    const walk = (nodes: BookmarkNode[], parent: BookmarkNode) => {
      for (const node of nodes) {
        if (node.children) {
          const bookmarks = node.children.filter((c) => !!c.url);
          if (bookmarks.length > 0 || node.children.some((c) => c.children)) {
            result.push({ folder: node, bookmarks });
          }
          // recurse into subfolders to collect their sections too
          for (const child of node.children) {
            if (child.children) {
              walk([child], child);
            }
          }
        }
      }
    };
    walk(tree, { id: "0", title: "root" } as BookmarkNode);

    // sort: bookmark bar first, then alphabetically
    result.sort((a, b) => {
      if (a.folder.id === "1") return -1;
      if (b.folder.id === "1") return 1;
      return a.folder.title.localeCompare(b.folder.title);
    });

    setSections(result);
  }, [tree]);

  // filter by search
  const filtered = searchQuery
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

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  const handleDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOverFolder(null);
    if (dragBookmark.current) {
      onMove(dragBookmark.current.id, folderId);
      dragBookmark.current = null;
    }
  };

  const openBookmark = (url: string) => {
    chrome.tabs.create({ url });
  };

  if (filtered.length === 0) {
    return (
      <div className="grid-view-empty">
        <p>{searchQuery ? "没有匹配的书签" : "暂无书签"}</p>
      </div>
    );
  }

  return (
    <div className="grid-view">
      {filtered.map((section) => (
        <div
          key={section.folder.id}
          className={`grid-section ${dragOverFolder === section.folder.id ? "drag-over" : ""}`}
          onDragOver={(e) => handleDragOver(e, section.folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, section.folder.id)}
        >
          <div
            className="grid-section-header"
            onClick={() => toggleSection(section.folder.id)}
          >
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
                <div
                  key={bm.id}
                  className="grid-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, bm)}
                  onDoubleClick={() => bm.url && openBookmark(bm.url)}
                  onContextMenu={(e) => onContextMenu(e, bm)}
                  title={`${bm.title}\n${bm.url}`}
                >
                  <img
                    className="grid-card-favicon"
                    src={
                      bm.url
                        ? `https://www.google.com/s2/favicons?domain=${new URL(bm.url).hostname}&sz=32`
                        : ""
                    }
                    alt=""
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="grid-card-title">{bm.title || "无标题"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
