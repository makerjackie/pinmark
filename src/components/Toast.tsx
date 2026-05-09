import React from "react";

interface Props {
  message: string;
  onUndo?: () => void;
  onClose: () => void;
}

export default function Toast({ message, onUndo, onClose }: Props) {
  return (
    <div className="toast" onClick={(e) => e.stopPropagation()}>
      <span className="toast-message">{message}</span>
      {onUndo && (
        <button className="toast-undo" onClick={onUndo}>
          撤销
        </button>
      )}
      <button className="toast-close" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}
