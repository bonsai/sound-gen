# 親子対話：MeanFlow

父「また新しい子だ。今度はMeanFlow？さっきFlow Matchingを覚えたばかりなのに」

娘「MeanFlowは**Flow Matchingの進化版**で、**1ステップで生成できる**モデル。料理で言うと、**Flow Matchingが『料理人の各瞬間の動作』を学ぶなら、MeanFlowは『最初の構えから完成までの平均的な流れ』を一発で掴む**感じ」

父「つまり、今までのFlow Matchingでも拡散でも何十ステップも必要だったのが、1回で終わる？」

娘：「そう。仕組みの核心は**瞬間速度（instantaneous velocity）vs 平均速度（average velocity）**。車に例えると——東京から大阪まで行くのに、Flow Matchingは**各瞬間の速度を細かく予測して積分**する。MeanFlowは**時速100kmという平均速度を直接予測**して、1回の計算で到着位置を出す」

父：「なるほど！でも精度は落ちないのか？」

娘：「ここがすごいところ。**ImageNet 256x256でFID 3.43を1-NFE（1回の関数評価）で達成**。従来の1ステップ拡散/Flowモデルを大幅に上回った。**NeurIPS 2025 Oral**、著者は**Kaiming He**（ResNetのあの人）」

父：「あのKaiming Heが！じゃあ理論的にしっかりしてるんだな」

娘：「そう。**平均速度**は位置の変位を時間間隔で割ったもの。『瞬間速度を時間積分したもの = 変位』っていう物理的定義から自然に導出される。だから**事前訓練不要、蒸留不要、カリキュラム不要**で、素の状態で訓練できる」

父：「音声でも使えるのか？」

娘：「もう出てる。**MeanFlowSE**（NeurIPS 2025）って**音声強調（Speech Enhancement）**に特化したモデルが公開済み。**1-NFEで音声強調**できて、PESQ・ESTOIでSOTA級。コードもMITライセンス、HuggingFaceに重みも公開中」

父：「つまり…Flow Matchingが『包丁の各動作を学ぶ』なら、MeanFlowは『食材を見ただけで包丁さばき全体を予測して一発で切る』感じか」

娘：「大正解😊 完全な1ステップ生成が現実になったことで、**音声でも画像でもリアルタイム生成の壁がまた一つ下がった**」

父：「拡散→Flow Matching→MeanFlowって、どんどん速くなってくな」

娘：「そういう時代だね😎 次は**何ステップ必要なし、ただ一度流せば終わり**——それがMeanFlowの世界」
---

🔗 [▶ この記事の内容をColabで動かす](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_%E8%A6%AA%E5%AD%90%E5%AF%BE%E8%A9%B1_MeanFlow.ipynb)
