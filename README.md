# 🔖 Pinmark

<a href="https://pinmark.01mvp.com">
  <img src="https://img.shields.io/badge/website-pinmark.01mvp.com-blue" alt="Website">
</a>
<img src="https://img.shields.io/badge/version-1.0.0-green" alt="Version">
<img src="https://img.shields.io/badge/license-MIT-green" alt="License">

> **Pinmark** — A minimal yet powerful bookmark manager for Chrome.
>
> Organize, browse, search, and clean up your bookmarks with an intuitive interface.
>
> **Pinmark** — 简洁强大的 Chrome 书签管理器。
>
> 通过直观的界面，轻松整理、浏览、搜索和管理你的书签。

---

## 📸 Screenshots

| Grid View | List View | Dark Mode |
|:---------:|:---------:|:---------:|
| *(screenshot needed)* | *(screenshot needed)* | *(screenshot needed)* |

---

## ✨ Features / 功能特性

| English | 中文 |
|---------|------|
| Grid & List view — multi-column card navigation or classic sidebar + list | 导航模式 / 列表模式 — 多列卡片导航或传统侧边栏列表 |
| Drag & drop bookmarks and folders (with batch support) | 拖拽整理书签和文件夹（支持多选批量） |
| Batch select + drag / delete / move | 多选批量拖拽、删除、移动 |
| Full-text search (⌘F) | 全文搜索 (⌘F) |
| Sort by folder or by creation time | 按文件夹或收藏时间排序 |
| Dark mode (persists preference) | 深色模式（自动记忆偏好） |
| Open all bookmarks in a folder (right-click) | 一键打开文件夹内全部书签（右键菜单） |
| Undo delete with toast notification | 撤销删除（Toast 通知） |
| Duplicate bookmark detection | 重复书签检测 |
| Empty folder detection | 空文件夹检测 |
| Keyboard shortcuts: ⌘F, ⌘A, Delete, Esc | 键盘快捷键：⌘F、⌘A、Delete、Esc |
| Create folders & subfolders | 新建文件夹和子文件夹 |

---

## 🚀 Installation / 安装方法

### Chrome Web Store *(coming soon / 即将上架)*

The extension has been submitted for Chrome Web Store review. Stay tuned!

已提交 Chrome 商店审核，敬请期待！

### Manual / 手动安装

1. **Download** the latest ZIP from the [releases page](https://github.com/makerjackie/pinmark/releases) or [pinmark.01mvp.com](https://pinmark.01mvp.com)
2. **Extract** the ZIP to a local folder
3. Open Chrome and go to `chrome://extensions`
4. Enable **Developer mode** (top-right corner)
5. Click **Load unpacked** and select the extracted folder
6. Click the Pinmark icon in the toolbar to open

---

## 🛠️ Development / 开发

```bash
# Install dependencies
npm install

# Development mode (hot reload)
npm run dev

# Type checking
npm run check

# Production build
npm run build

# Build + create ZIP for distribution
npm run build:website
```

Built with [WXT](https://wxt.dev) + React 19 + TypeScript + Vite.

---

## 🎬 Demo / 演示视频

- **Bilibili**: *(coming soon / 即将上线)*

---

## 📦 Chrome Web Store Submission

All store listing materials are in the [`docs/`](docs/) directory:

- [`docs/store-listing.md`](docs/store-listing.md) — Store descriptions, screenshots guide, checklist
- [`docs/promotional-copy.md`](docs/promotional-copy.md) — Copy for Bilibili, Xiaohongshu, and demo video script

---

## 🗺️ Roadmap

- [x] Grid navigation mode
- [x] List mode with folder tree
- [x] Drag & drop (bookmarks & folders, batch support)
- [x] Batch operations (select, delete, move)
- [x] Full-text search
- [x] Dark mode
- [x] Undo delete
- [x] Open all bookmarks
- [x] Time-sorted view
- [x] Duplicate & empty folder detection
- [x] Chrome Web Store submission
- [ ] i18n / 国际化 (_locales)
- [ ] Bookmark import/export
- [ ] Right-click to add bookmark to specific folder

---

## 📄 License

MIT © [makerjackie](https://github.com/makerjackie)
