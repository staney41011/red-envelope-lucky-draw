# GitHub Pages 網站版本

## 立即開啟

- 網站首頁：https://staney41011.github.io/red-envelope-lucky-draw/
- 操作控制台：https://staney41011.github.io/red-envelope-lucky-draw/control/
- 投影顯示：https://staney41011.github.io/red-envelope-lucky-draw/projection/

本網站使用 GitHub Pages 靜態 HTML + JavaScript，可直接在瀏覽器使用，不需要 Node.js 伺服器。程式和頁面均存放在 main 分支。

## 本機模式（重要）

- **抽獎資料保存在開啟網頁的瀏覽器**（localStorage）。同一個瀏覽器的控制台、投影分頁會自動同步。
- **不同電腦、手機或瀏覽器不會互相同步**。若要手機控制、電腦投影，必須另接 Firebase / Supabase 等雲端資料庫；單靠 GitHub Pages 不可能安全可靠地提供這項功能。
- 重新整理同一個瀏覽器不會清空紀錄；但是清除網站資料、無痕視窗關閉或換瀏覽器會遺失記錄，請定期匯出 JSON。
- 本機模式沒有後端驗證，因此重置和刪除只有確認視窗、沒有實際管理密碼保護。

## 參加者與舊紀錄

候選人從 16 人變成 15 人，退休的石淑華已移除。編輯 data/initial.json 即可更新候選名單及獎區設定。

原站有 65 筆歷史紀錄，但其備份含有個人和獎金資料，**不會上傳公開 GitHub**。先在舊網站下載 /api/backup 的 JSON，再在新網站操作台點「匯入原網站備份 JSON」以載入；原來的得獎紀錄依原姓名保留，退休者不會再出現在未來的候選名單。匯入會覆蓋當前瀏覽器資料，請先匯出新網站備份。

## 靜態版程式路徑

- index.html：首頁
- control/index.html：控制台
- projection/index.html：投影幕頁
- site/storage.js：本機儲存、抽獎與匯入匯出
- site/control.js、site/projection.js：互動
- site/static.css、public/original.css、public/app.css：畫面
- data/initial.json：名單與四個獎區

GitHub Pages 設定：Deploy from branch → main → /(root)。

## 伺服器版本

原本的 Node.js server.js、public/client.js 與 public/projection.js 仍保留，方便未來接後端使用。但這些程式不會被 GitHub Pages 執行，與目前靜態版的瀏覽器資料互不相通。
