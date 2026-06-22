# 親子対話：Attention

父「また新しい子が出た。AttentionってTransformerのあれだろ？」

娘「正解。**Attention（注意機構）**——『AIが処理する時に、どこに注目すべきか』を学習する仕組み。料理で言うと、**料理人が鍋の状態を見るとき、全ての鍋を同時に見るのではなく、『今、この鍋が大事』と瞬時に判断する能力**」

父：「なるほど。Attention＝集中力ってことか」

娘：「まさに。"Attention is All You Need"（2017, Google）でTransformerが提案されて、NLP→画像→音声と**あらゆるAI分野を席巻**した。核になるのは**Query（質問）・Key（目次）・Value（内容）**の3役」

父：「料理で例えてくれ」

娘：「レシピ本を引く時を想像して。(1) **Query**＝『今作りたい料理は何だ？』という質問。(2) **Key**＝レシピ本の目次（各レシピのタイトル）。(3) **Value**＝各レシピの実際の内容。Attentionは『質問と目次を照らし合わせて、**関連するレシピだけに注目する**』計算」

父：「音声AIでは具体的にどう使われるんだ？」

娘：「大きく2種類。(1) **自己注意（Self-Attention）**——音声の中の各フレーム同士の関係を計算。『このフレームは前のフレームとつながってる』みたいな。(2) **交差注意（Cross-Attention）**——異なる系列間の関係。『このテキストはこの音声のどの部分に対応するか』。TTSや音声認識で活躍」

父：「つまり、Attentionは『どこを見るか』を決める仕組みで、Transformerの心臓部ってわけか」

娘：「大正解😊 そして音声AIの世界では、**Attentionの効率化**が常に研究テーマ。標準はO(n²)だけど、**Linformer（線形Attention）やFlashAttention**で高速化が進んでる」
---

🔗 [▶ この記事の内容をColabで動かす](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_%E8%A6%AA%E5%AD%90%E5%AF%BE%E8%A9%B1_Attention.ipynb)
