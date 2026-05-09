import React from "react";

interface Props {
  x: number;
  y: number;
  type: "folder" | "bookmark";
  onAction: (action: string) => void;
}

export default function ContextMenu({ x, y, type, onAction }: Props) {
  return (
    <div
      className="context-menu"
      style={{ left: x, top: y, position: "fixed" }}
      onClick={(e) => e.stopPropagation()}
    >
      {type === "folder" && (
        <>
          <div className="context-menu-item" onClick={() => onAction("open-all")}>
            打开全部
          </div>
          <div className="context-menu-sep" />
          <div className="context-menu-item" onClick={() => onAction("delete-folder")}>
            删除文件夹
          </div>
        </>
      )}
      {type === "bookmark" && (
        <>
          <div className="context-menu-item" onClick={() => onAction("delete-bookmark")}>
            删除书签
          </div>
        </>
      )}
    </div>
  );
}
