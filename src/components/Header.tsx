import React from "react";

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  bookmarkCount: number;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export default function Header({
  searchQuery,
  onSearchChange,
  bookmarkCount,
  viewMode,
  onViewModeChange,
}: Props) {
  return (
    <header className="header">
      <h1 className="header-title">🔖 Pinmark</h1>
      <span className="header-count">共 {bookmarkCount} 个书签</span>
      <div className="header-search">
        <input
          type="text"
          placeholder="搜索书签..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
      </div>
      <div className="view-toggle">
        <button
          className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
          onClick={() => onViewModeChange("grid")}
          title="导航模式"
        >
          🗂 导航
        </button>
        <button
          className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
          onClick={() => onViewModeChange("list")}
          title="列表模式"
        >
          📋 列表
        </button>
      </div>
    </header>
  );
}
