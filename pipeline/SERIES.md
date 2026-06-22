# 📚 Qiita シリーズインデックス

> `series.json` で一元管理。全シリーズの投稿状況を一覧。

---

## シリーズ一覧

| # | シリーズ | 記事数 | 状態 | 投稿済み | タグ |
|---|---------|-------|------|---------|------|
| 1 | [post-qiita：CLI投稿ツールの作り方](./articles/qiita-post/manifest.json) | 8 | ✅ 公開済み | 8/8 | `Qiita` `Node.js` `CLI` |
| 2 | [GodotでPWAを作れるぞ](./articles/godot-pwa/manifest.json) | 8 | ⬜ 未投稿 | 0/8 | `Godot` `PWA` `ゲーム開発` |
| 3 | [音声AIを料理で理解する](./articles/speech-ai/manifest.json) | 43 | 📅 投稿予定 | 0/43 | `音声AI` `親子対話` `深層学習` |

---

## 投稿状態の意味

| 状態 | 意味 |
|------|------|
| ✅ 公開済み | Qiitaに全記事公開完了 |
| 📅 投稿予定 | スケジュール登録済み・順次投稿中 |
| ⬜ 未投稿 | まだ投稿していない |
| 🔵 構想中 | これから書く |

---

## 運用コマンド

```powershell
# シリーズ一覧
type series.json

# 特定シリーズの状態確認
node scripts/schedule.mjs list

# 投稿予定に追加
node scripts/schedule.mjs add "親子対話：Attention"

# 次の1件を下書き投稿
node scripts\publish-scheduled.mjs

# 日次実行
powershell -File scripts/post-daily.ps1
```

---

## 今後のシリーズ候補

_series.json の `pending_series` に追記_
