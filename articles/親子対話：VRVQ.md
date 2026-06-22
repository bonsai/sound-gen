# 親子対話：VRVQ

父「VBRに似てるけど、VRVQ？」

娘「**Variable Bitrate Residual Vector Quantization**——SonyがICASSP 2025で発表。料理で言うと、**『食材の量に応じて使うザルの枚数を変える』**——RVQの階層数をフレームごとに動的に変える VBR 方式」

父：「普通のRVQは何が問題なんだ？」

娘：「普通のRVQは **CBR（Constant BitRate）** で、すべてのフレームに同じ数のコードブック（RVQ層）を使う。でも無音のフレームに8層も使うのは明らかな無駄。逆に複雑な音にはもっと層があってもいい」

父：「そこでVRVQは？」

娘：「**Importance Map（重要度マップ）** を導入。フレームごとに「どのくらいのビットが必要か」を推定し、**重要なフレームには多めのRVQ層、単純なフレームには少なめのRVQ層** を割り当てる。ただし、この「何層使うか」のマスキング操作は微分不可能なので、**Straight-Through Estimator** で勾配を近似する工夫もしてる」

父：「結果はどうなんだ？」

娘：「同じビットレートなら **CBR-RVQよりVRVQの方が高品質**。Sonyの実験では、既存のSOTAコーデック（DAC/EnCodec）にVRVQを適用するとさらに改善した。つまり **VRVQは特定のモデルではなく、どんなRVQコーデックにも載せられるプラグイン的技術** ってこと」

父：「VBRとVFR（CAVLS）とVRVQはどう違うんだ？」

娘：「良い質問😊 **VBR（CBRの対義語）** はビットレートを可変にする概念そのもの。**VRVQ** はその実装手段——『RVQの層数を変える』。**CAVLS/VFR** はフレームレート（時間解像度）を変える別アプローチ。同じ目標（無駄削減）への **二つの異なるルート**——ビットレートを削るか、フレーム数を削るか」

父：「Sonyのコードは公開されてるのか？」

娘：「はい！**SonyResearch/VRVQ** でMITライセンス公開中。**音声AIの効率化は2025年のメイントピック** の一つ。VBR + VFR の両方を組み合わせれば、さらに効率的なコーデックが作れる——**次のフロンティアはその融合** だよ🔥」
---

🔗 [▶ この記事の内容をColabで動かす](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/poc_%E8%A6%AA%E5%AD%90%E5%AF%BE%E8%A9%B1_VRVQ.ipynb)
