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

## 記事一覧（Colabリンク）

- [親子対話：Attention](articles/親子対話：Attention.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_attention.ipynb)
- [親子対話：CAVLS](articles/親子対話：CAVLS.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_cavls.ipynb)
- [親子対話：CLAP](articles/親子対話：CLAP.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_clap.ipynb)
- [親子対話：ConsistencyModel](articles/親子対話：ConsistencyModel.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_consistency_model.ipynb)
- [親子対話：DAC](articles/親子対話：DAC.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_dac.ipynb)
- [親子対話：Decoder](articles/親子対話：Decoder.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_decoder.ipynb)
- [親子対話：DiT](articles/親子対話：DiT.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_dit.ipynb)
- [親子対話：Encoder](articles/親子対話：Encoder.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_encoder.ipynb)
- [親子対話：Full-Duplex](articles/親子対話：Full-Duplex.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_full_duplex.ipynb)
- [親子対話：LEAF](articles/親子対話：LEAF.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_leaf.ipynb)
- [親子対話：MeanFlow](articles/親子対話：MeanFlow.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_meanflow.ipynb)
- [親子対話：MOS](articles/親子対話：MOS.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_mos.ipynb)
- [親子対話：Moshi_KAME](articles/親子対話：Moshi_KAME.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_moshi_kame.ipynb)
- [親子対話：NeuralSVB](articles/親子対話：NeuralSVB.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_neural_svb.ipynb)
- [親子対話：Prosody](articles/親子対話：Prosody.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_prosody.ipynb)
- [親子対話：S2S生成](articles/親子対話：S2S生成.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_s2s_gen.ipynb)
- [親子対話：S3R](articles/親子対話：S3R.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_s3r.ipynb)
- [親子対話：SpeechLM](articles/親子対話：SpeechLM.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_speechlm.ipynb)
- [親子対話：SSM](articles/親子対話：SSM.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_ssm.ipynb)
- [親子対話：SUPERB](articles/親子対話：SUPERB.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_superb.ipynb)
- [親子対話：SVC](articles/親子対話：SVC.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_svc.ipynb)
- [親子対話：SVS](articles/親子対話：SVS.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_svs.ipynb)
- [親子対話：Transformer](articles/親子対話：Transformer.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_transformer.ipynb)
- [親子対話：TTS](articles/親子対話：TTS.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_tts.ipynb)
- [親子対話：VAD](articles/親子対話：VAD.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_vad.ipynb)
- [親子対話：VAP](articles/親子対話：VAP.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_vap.ipynb)
- [親子対話：VBR_CBR](articles/親子対話：VBR_CBR.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_vbr_cbr.ipynb)
- [親子対話：VoiceBox](articles/親子対話：VoiceBox.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_voicebox.ipynb)
- [親子対話：VRVQ](articles/親子対話：VRVQ.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_vrvq.ipynb)
- [親子対話：Warmup](articles/親子対話：Warmup.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_warmup.ipynb)
- [親子対話：ニューラルオーディオ](articles/親子対話：ニューラルオーディオ.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_neural_audio.ipynb)
- [親子対話：フローマッチング](articles/親子対話：フローマッチング.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_flow_matching.ipynb)
- [親子対話：メルスペクトログラム](articles/親子対話：メルスペクトログラム.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_melspectrogram.ipynb)
- [親子対話：声クローン](articles/親子対話：声クローン.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_voice_clone.ipynb)
- [親子対話：環境音生成](articles/親子対話：環境音生成.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_sound_gen.ipynb)
- [親子対話：環境音生成2](articles/親子対話：環境音生成2.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_sound_gen_2.ipynb)
- [親子対話：環境音生成3](articles/親子対話：環境音生成3.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_sound_gen_3.ipynb)
- [親子対話：画像生成と音声生成の双幅的展開](articles/親子対話：画像生成と音声生成の双幅的展開.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_image_audio_evolution.ipynb)
- [親子対話：過剰平滑化](articles/親子対話：過剰平滑化.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_over_smoothing.ipynb)
- [親子対話：離散トークン](articles/親子対話：離散トークン.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_discrete_tokens.ipynb)
- [親子対話：音声コーデック](articles/親子対話：音声コーデック.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_audio_codec.ipynb)
- [親子対話：音声トークン](articles/親子対話：音声トークン.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_audio_tokens.ipynb)
- [親子対話：音源分離](articles/親子対話：音源分離.md) — [▶ Colab](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_source_separation.ipynb)

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
