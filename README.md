# GitLab 活跃事件导出助手

一个用于一键导出你在 GitLab 上活跃事件（Issue、Merge Request、Note、Milestone、Push 等）的 Chrome 插件，支持导出为 CSV/Markdown 文件，包含事件链接，界面现代美观。

## 功能简介

- 一键导出任意时间范围内的 GitLab 活跃事件
- 支持按事件类型、行为、时间筛选
- 支持导出为 CSV 或 Markdown，文件名自动带时间戳
- 导出内容包含可直接跳转的 GitLab 网页链接
- 支持“最近N天”自定义输入和快捷按钮
- 在个人活跃页右上角自动插入“导出活跃事件”按钮，点击弹出 Material 风格弹窗
- 支持 GitLab 实例地址和 Token 配置（仅需一次）
- 兼容 GitLab.com 和自建 GitLab

---

## 安装方法

1. 克隆或下载本项目源码到本地
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角“开发者模式”
4. 点击“加载已解压的扩展程序”，选择本项目根目录
5. 访问你的 GitLab 个人活跃页（如 `https://your.gitlab.com/users/xxx/activity`），即可看到“导出活跃事件”按钮

---

## 使用方法

1. **首次使用：**
   - 点击“导出活跃事件”按钮，弹出导出弹窗
   - 首次需在“设置”中填写 GitLab 实例地址和个人 Access Token（需有 API 权限）
   - 保存后即可正常导出

2. **导出操作：**
   - 选择时间范围（或用“最近N天”输入/按钮）
   - 选择事件类型（默认全部）
   - 选择事件行为（默认 opened）
   - 选择导出格式（CSV/Markdown）
   - 点击“一键导出”，即可下载包含事件链接的文件

3. **配置管理：**
   - 点击扩展图标可进入设置页面，随时修改 Token 或实例地址

---

## 配置说明

- **GitLab 实例地址**：如 `https://gitlab.com` 或你的自建地址
- **Token**：建议使用个人 Access Token，需有 `api` 权限
- 配置保存在浏览器本地（chrome.storage.sync），仅当前浏览器可见

---

## 常见问题

### 1. 按钮有时消失/闪烁？
- GitLab 页面为 SPA 或有局部刷新，插件已自动监听并修复按钮丢失问题
- 如遇特殊页面结构未适配，请反馈页面 HTML 片段

### 2. 导出链接 404？
- 插件已自动将 project_id 转为 path_with_namespace，导出链接与 Web UI 完全一致
- 如仍有 404，请确认你的 Token 权限和项目可访问性

### 3. 导出文件名如何生成？
- 格式为 `git_event_yyyyMMdd-hhmmss.csv` 或 `.md`，如需自定义可修改 `contentScript.js` 中 `getExportFilename` 函数

### 4. 支持哪些事件类型？
- 支持 Issue、MergeRequest、Note、Milestone、Project、Snippet、PushEvent 等
- 行为支持 opened、closed、merged、commented、pushed 等

### 5. 支持哪些 GitLab 版本？
- 兼容官方 GitLab.com 及大多数自建 GitLab（v12+）

---

## 贡献与反馈

- 欢迎提交 issue 或 PR，完善更多事件类型、导出格式或 UI 体验
- 如遇到问题，请附上浏览器版本、GitLab 版本、页面 HTML 片段和详细描述

---

## License

MIT 