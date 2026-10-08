# 紅包汽球抽起來 🎈

由公開 ChatGPT Sites 網站 **red-envelope-lucky-draw.staney-chou.chatgpt.site** 可見介面與樣式、雲端備份的格式，重建成可在 GitHub 維護的 Node.js 專案。

> 本庫是**功能重建版**，不是 ChatGPT Sites 原始碼匯出。原站服務端程式無法透過公開網址取得；因此這份專案自行實作了開獎 API、持久化與跨裝置同步。

## 啟動

需要 Node.js 20 以上。無第三方套件，不需要 npm install。

```bash
# macOS / Linux
ADMIN_PASSWORD='your-strong-password' npm start
```

Windows PowerShell：

```powershell
$env:ADMIN_PASSWORD = '請改成專用強密碼'
npm start
```

開啟：

- `http://localhost:3000/`：裝置選擇
- `http://localhost:3000/control`：主持人控制台
- `http://localhost:3000/projection`：現場投影畫面

兩個頁面每秒同步伺服器狀態，**必須連到同一台部署中的 Node 伺服器**。直接開啟 HTML、或只有部署 GitHub Pages，沒有伺服器便無法完成抽獎。

## 候選名單

編輯 `data/initial.json` 內的 `names` 陣列。

**石淑華已退休，因此已從 16 位候選者中移除，目前 15 位**。歷史紀錄不因人員退休而刪除。啟動時會以 `initial.json` 名單為準，不會把退休同事重新加入候選名單。

## 抽獎與紀錄

- 四個獎區、依各獎項的剩餘個數加權抽獎。
- 姓名 → 獎區 → 商品／手收／獎金 → 加入佇列 → 逐筆開獎。
- 控制台與投影頁透過伺服器同步；中獎結果動態播放。
- 抽獎紀錄可匯出 JSON；重置／刪除紀錄須提供 `ADMIN_PASSWORD`。
- 資料持續寫在 `data/state.json`（或 `STATE_FILE` 所指定的位置）。
- 請將正式部署的 `STATE_FILE` 放到**持久化儲存磁碟**，不要使用無狀態的暫存路徑。

## 搬移原網站的 65 筆歷史紀錄

為保護參加者的個人資料、商品紀錄與獎金明細，**原始備份不會上傳公開 GitHub 儲存庫**。

1. 從原網站下載 `https://red-envelope-lucky-draw.staney-chou.chatgpt.site/api/backup`，存為本機備份檔。
2. 在新程式**首次啟動前**執行：

```bash
node scripts/import-backup.js "/path/to/original-backup.json"
```

3. 再執行 `npm start`，即可保留原本 65 筆歷史資料與獎金庫存，候選名單仍為 15 人。

也可以用 `POST /api/restore` 上傳備份，需設定管理密碼；此功能只適合在 HTTPS 且受保護的部署環境操作。

## 部署提醒

GitHub 是程式碼倉庫，**GitHub Pages 不支援 Node.js 的 API、持久化 JSON 和操作／投影同步**。需要可持續運行 Node 的部署環境，例如自架 VM、Render（配置持久磁碟）、Railway 或同類服務。

- Node 執行入口：`node server.js`
- 監聽埠：`PORT`（預設 3000）
- 環境變數：`ADMIN_PASSWORD`、可選的 `STATE_FILE`
- 不要把 `.env`、管理密碼、`data/state.json` 或原始備份提交到 GitHub。

## 來源保真聲明

已保留原網站目前公開的 CSS 作為主要視覺基礎；動畫細節與後端行為為基於公開網站的重建實作，可能與 Sites 原程式存在差異。原 Sites 網站仍可繼續使用，遷移不會修改或刪除原服務上的資料。
