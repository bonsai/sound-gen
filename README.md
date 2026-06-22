# bonsai/sound-gen

音声AI × Qiita記事 のための統合パイプライン。

## 構成

| Path | 内容 |
|------|------|
| `articles/` | 親子対話シリーズ 元記事 (43篇) |
| `pipeline/` | Qiita投稿パイプライン (schedule/publish) |
| `seed/` | ネタ生成 (既存記事→次のテーマ) |
| `qiita.sqlite` | 全記事・シード管理DB |

## 3シリーズ

| シリーズ | 記事数 | 状態 |
|---------|-------|------|
| 音声AIを料理で理解する | 43 | 📅 投稿予定 |
| GodotでPWAを作れるぞ | 8 | ⬜ 未投稿 |
| post-qiita CLIツール解説 | 8 | ✅ 公開済み |

## ワークフロー

```bash
# 既存記事から次のネタを生成
node seed/generate.mjs

# スケジュール登録
node pipeline/schedule.mjs add 親子対話：Attention

# 投稿
node pipeline/publish-scheduled.mjs

# DB確認
sqlite3 qiita.sqlite "SELECT title, status FROM articles"
```
