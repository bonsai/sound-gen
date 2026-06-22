# 親子対話：Transformer

父「また新しい子が出た。Transformerは知ってるけど、音声AIとの関係を教えてくれ」

娘「**Transformerは現在の音声AIの共通基盤**。料理で言うと、**全ての調理器具を統合した『最新鋭のシステムキッチン』**——鍋も包丁もオーブンも、全部このシステムキッチンの中で動いてる」

父：「確かに。VAPもCLAPもFull-DuplexもTransformerって書いてあったな」

娘：「音声AIでのTransformerの使われ方は大きく3つ。(1) **エンコーダーとして**——入力音声を特徴ベクトルに変換（HuBERT, wav2vec 2.0）。(2) **デコーダーとして**——自己回帰的に音声トークンを生成（AudioGen, MusicGen）。(3) **エンコーダー＋デコーダー**——VAPやCLAPのような双方向モデル」

父：「元々は自然言語処理（NLP）の技術だよな。それが音声にも広がった理由は？」

娘：「**Attention機構の汎用性**。音声もテキストも画像も、『系列の中の関係性を捉える』という点では同じ。Transformerは**距離に関係なく依存関係をモデル化**できるから、音声のような長い系列でも全局を見渡せる」

父：「でもSSMの記事では、TransformerはO(n²)で長い系列に弱いって言ってた」

娘：「そこがトレードオフ。**短〜中程度の系列（〜30秒程度の音声）ならTransformerが最強**。それ以上長くなるとSSM/Mambaに軍配が上がる。だから最近は**TransformerとSSMを組み合わせたハイブリッド**（例：Jamba, Samba）も出てる」

父：「つまり…Transformerは『万能だけど重い』。だから用途に応じて軽量な代替（SSMなど）と使い分ける時代になった」

娘：「そういうこと😊 でも**Attentionのアイデア自体は今後も生き続ける**——『全体を見渡す』という基本概念は、どんなアーキテクチャになっても残るよ」
---

🔗 [▶ この記事の内容をColabで動かす](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_transformer.ipynb)
