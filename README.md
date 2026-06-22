# Sound Gen — AudioGen vs MusicGen

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colab_audiogen_musicgen.ipynb)

Meta AudioCraft の **AudioGen**（環境音）と **MusicGen**（音楽）で同じプロンプトを30秒生成して聴き比べる Colab ノートブック。

## 使い方

1. `colab_audiogen_musicgen.ipynb` を Google Colab で開く
2. Runtime > Run all
3. 生成された WAV を聴いて比較・ダウンロード

## モデル

| モデル | 対象 | パラメータ |
|--------|------|-----------|
| `facebook/audiogen-medium` | 環境音（効果音など） | 1.5B |
| `facebook/musicgen-medium` | 音楽（BGM・曲） | 1.5B |

## 要件

- GPU T4 以上（VRAM ~16GB 推奨）
