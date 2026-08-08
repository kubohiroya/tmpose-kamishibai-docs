# 紙芝居アプリ 4.0 概要説明書 大人向け

Copyright © 2026 Hiroya Kubo. この文書は[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)で提供します。

対象: 保護者、教員、教材作成者、ワークショップ運営者、導入を検討する方\
対象仕様: `kamishibai: '4.0'`\
文書状態: DSL 4.0実装完成版の大人向け概要説明書\
調査基準: tmpose-kamishibai `7945781`、2026年8月8日

> **配布状態との区別:** DSL 4.0の実装は完成していますが、公開アプリ、配布artifact、
> feature flagで必要な機能が有効かは、利用するreleaseごとに確認してください。

## 概要

TMPose紙芝居4.0は、物語を見るだけでなく、参加者の操作や身体の動きを物語の進行へ結び付けられる
参加型デジタル紙芝居です。背景、登場人物、セリフ、音、画面効果、条件分岐、キー・タッチ・ポーズ入力を、
YAMLで書いた台本と画像・音声・ポーズモデルから構成します。

作者は作品ごとのproject directoryを正本として管理します。台本を検証してpreviewし、上演に使う
自己完結SB3をbuildするまで、同じDSL 4.0の契約を使用します。標準的な作品を作るために、作者が
TurboWarpのブロックを作品ごとに組み替えることは想定していません。

この文書は、DSL 4.0で何ができるか、作品がどのように実行されるか、教育活動へどう取り入れられるかを
説明する概要です。fieldやactionの詳細は、末尾の台本作成ガイドとSchemaリファレンスで確認してください。

## このアプリの価値

### 物語と素材を一つのprojectとして扱える

作品の正本には、entry YAML、画像、音声、ポーズモデル、`project.source.json`を含めます。規模が大きい
作品では、台本を複数のYAMLへ分割できます。素材と、それを物語のどこで使うかがproject内で対応するため、
共同制作でも変更対象と結果を確認しやすくなります。

### 身体参加を物語上の出来事にできる

参加者が指定されたポーズを取る、キーを押す、画面へ触れるといった行為を、シーンの進行や分岐へ
つなげられます。参加者の動きは単なる操作ではなく、「登場人物を助ける」「扉を開ける」など、物語上の
意味を持つ出来事として設計できます。

### 制作中の失敗を上映中の作品から分離できる

source frontendは、YAMLの構文、Schema、参照関係を検証し、成功した台本だけをimmutableな
`StoryDocument`へ正規化します。preview中に書きかけの台本や不完全な素材を検出しても、直前の正常な
generationを置き換えません。作者はsource位置付きの診断を読み、現在の正常な作品を保ったまま修正できます。

### 制作と配布で同じ契約を使える

Web Preview、CLIの検証・preview・build、公開アプリは、同じDSL 4.0 frontendと診断modelを共有します。
制作時だけ通る独自形式へ書き換えるのではなく、検証済みのsourceとlocal assetから配布成果物を作れます。

## ProjectとYAML台本

小さな作品は、次のようなdirectoryから始められます。

```text
tutorial-story/
├── project.source.json
├── story.k4.yml
├── beach.svg
├── opening.mp3
└── rescue-pose/
    ├── model.json
    ├── metadata.json
    └── weights.bin
```

`project.source.json`はentry sourceを一つに決めます。新規projectでは、UTF-8の`story.k4.yml`を
entryにする構成を推奨します。YAMLでは、asset、Actor、表紙、表示style、変数、操作、分岐、scene、actionを
名前付きの構造として記述します。

```yaml
kamishibai: '4.0'

assets:
  Beach: backdrop
  HeroIdle: costume:Hero

actors:
  Hero: HeroIdle

scenes:
  opening:
    - stage: Beach
    - Hero.say:
        text: こんにちは！
        seconds: 2
```

一つのactionには命令を一つだけ書きます。意味の異なる複数の引数には、`text`や`seconds`のような名前を
付けます。未知のkey、型の違い、存在しないassetやsceneの参照は、実行を始める前に診断されます。

## Source Graphで物語を分割する

`include`を有効にすると、entry sourceから到達する複数のYAMLを一つのSource Graphとしてcomposeできます。
章や場面ごとにsourceを分けても、最終的には一つの`StoryDocument`として検証・実行されます。

Source Graphは、後から読んだ定義で暗黙に上書きしません。重複ID、単一設定の重複、循環する`include`、
project外へ出るpathをエラーにします。source件数、byte数、include depthにも有限の上限を設けます。
included sourceで宣言したlocal assetは、そのsourceのdirectoryを基準に解決されます。

previewとbuildは、到達するsourceと参照されたlocal assetを一つのgenerationとして安定取得します。
台本だけ、または素材だけが新しい途中状態を部分的に実行しないことが、共同編集や授業中の試行錯誤を
安全に行うための重要な境界です。

## 制作・確認・配布の方法

| 利用形態 | 役割 |
|---|---|
| Web Preview | 対応browserでproject directoryをread-onlyで選択し、外部editorで保存した変更を検証してlive reloadする |
| CLI validate | `validate-dsl4`で台本を副作用なしに検証し、人向けまたはtool向けの診断を出力する |
| CLI preview | `preview-dsl4 --watch`でlocal projectを監視し、browser上の実runtimeへ正常なgenerationを渡す |
| CLI build | `build-dsl4`でsourceとlocal assetを再検証し、自己完結SB3をatomicに出力する |
| 公開アプリ | 検証済み`StoryDocument`をruntimeとplatform adapterで実行する |

Web PreviewとCLI previewは、制作中の確認に使うsurfaceです。YAMLやassetを保存すると、正常なcandidateだけが
reload対象になります。作品の先頭、現在のscene、または条件を満たす現在のactionから再開できます。
watch用のbridge、認証token、reload dialogの状態はproduction成果物へ含めません。

buildはdisk上のcandidateをもう一度検証してから出力先を置き換えます。local sourceとassetを含む
自己完結SB3は、TurboWarp Editorでの確認やWeb player／Packagerへの入力に利用できます。buildが失敗した場合は、
既存の正常な出力を保持します。

## 物語が実行される仕組み

DSL 4.0の処理は、次の責務に分かれています。

```text
YAML project・Source Graph
        ↓ 安定取得
YAML parse・Schema検証・意味検証
        ↓ 正規化
immutable StoryDocument
        ↓
runtime controller
        ↓
TurboWarp、camera、音声、TMPose等のplatform adapter
```

runtime controllerはsceneとactionの順序、分岐、入力、停止を管理します。背景の切り替え、Actorの表示や移動、
セリフ、音、画面効果、ポーズ認識など、環境へ依存する処理はplatform adapterを介して実行します。この分離により、
物語の意味とbrowserやTurboWarp固有の操作を混在させずに検証できます。

入力も一つの時系列として扱います。同じキーやタッチが、作品内の選択と運営者用navigationの双方へ同時に
消費されないよう、その時点で意味を持つ一つのconsumerへ渡します。

## Cameraとポーズ認識

ポーズ認識を使うsceneでは、projectに登録した`poseModel`をTMPose adapterが読み込み、camera映像から得た
分類結果を物語のactionへ渡します。成功したポーズに応じてコスチュームや音を変え、次のsceneへ進められます。

camera previewには、左右反転の既定値とsceneごとの指定を持てます。必要に応じて、参加者や会場に合わせて
previewの左右反転を切り替えるbuttonや、使用するcameraを選ぶmenuも構成できます。端末固有のdevice IDは
台本や`StoryDocument`へ保存せず、実行session内で扱います。

ポーズ認識を利用するときは、次を運用計画に含めます。

- cameraを使う目的と映る範囲を参加者・保護者へ事前に説明する
- browserのcamera許可、設置位置、照明、背景、参加人数を本番環境で確認する
- 左右反転後の見え方と、camera選択menuの操作をリハーサルする
- 認識しにくい場合にキーやタッチで進める代替手段を用意する
- 終了・停止時にcamera、model、音、listener等のresourceを解放できることを確認する

cameraを使わない作品も作れます。身体参加が活動目的に合わない場合や、camera利用への同意を得られない場合は、
キー・タッチ入力や時間進行を選びます。

## 教育・ワークショップでの利用

### 物語を構造へ分解する

学習者は、物語をscene、登場人物、action、条件、入力、結果へ分解します。「何が起きたら、誰がどう動き、
次にどこへ進むか」をYAMLの名前付きfieldで表す過程は、物語理解とプログラミング的思考を結び付けます。

### 役割を分担して共同制作する

物語を考える人、画像や音を作る人、ポーズを設計・学習する人、YAMLを編集する人、previewで検証する人に
役割を分けられます。Source Graphを使えば、章や場面を分担しながら、一つの作品として重複や参照漏れを
検査できます。

### AIの役割と限界を観察する

画像生成やポーズ分類を取り入れる活動では、人が物語と評価基準を決め、AIの出力を確認し、programが
検証済みのactionを実行するという役割の違いを扱えます。認識が照明、姿勢、服装、背景などに影響されることを
観察し、代替操作や再試行を設計することも学習になります。

### 発表を共同体験にする

代表者がcameraの前でポーズを取り、ほかの参加者が次の展開を予想したり応援したりすることで、作品発表を
共同体験にできます。国語、情報、総合学習、演劇的表現、地域紹介、外国語活動などを横断した教材にできます。

## 導入時の確認事項

| 項目 | 確認内容 |
|---|---|
| release | DSL 4.0 runtimeと必要なfeature flag、preview／build surfaceが有効か |
| project | entry source、local asset、pose model、manifestが同じproject内で再現できるか |
| 検証 | Schema・参照診断がなく、同じgenerationをvalidateとpreviewで確認したか |
| camera | 利用目的の説明、同意、browser許可、設置、照明、映り込み対策ができているか |
| 入力 | pose、key、touch、運営者navigationが意図せず競合しないか |
| 代替手段 | cameraや認識を使えない参加者も物語へ参加できるか |
| 配布 | build後の自己完結SB3を本番と同じ環境でsmoke testしたか |
| 終了 | 停止時にcamera、音、model、画面表示を片付けられるか |

制作中は、正常なgenerationが保持されるからといって診断を放置せず、配布前にすべての必須検証を通します。
通常のremote poseModelを利用する場合は、TMPose directory URLと上映環境のnetwork条件を確認します。
remoteのまま内容を固定する場合はintegrity、Content-Type、sizeをすべて指定します。offline運用や確実な
内容固定が必要な場合はlocal modelを成果物へ含めます。

## 仕様と公開状態

この説明は、tmpose-kamishibai
[`79457815f5c89b181b1a879a079a4d6a72d405ed`](https://github.com/kubohiroya/tmpose-kamishibai/commit/79457815f5c89b181b1a879a079a4d6a72d405ed)
で固定されたDSL 4.0実装、表層仕様、JSON Schema、testを調査基準にしています。

実装完成と、特定releaseでの公開・既定有効化は別です。導入時には対象releaseの配布物と機能一覧を確認し、
起動時固定・既定OFFの機能を含め、必要なsurfaceだけを明示的に有効にします。問題がある場合は該当する
feature flagをOFFにし、正常と確認済みの成果物へ戻せるようにします。

## 関連ドキュメント

- [紙芝居DSL 4.0 台本作成ガイド](../dsl-author-guides/dsl-4.0-author-guide.md): project配置、YAML記法、Source Graph、preview、buildの作者向け手順
- [紙芝居DSL 4.0 Schemaリファレンス](../dsl-author-guides/dsl-4.0-schema-reference.md): field、型、必須性、既定値、action引数の機械可読仕様に基づく説明
- [TMPose紙芝居 4.0 アプリ・教材・ツールチェインガイド](../developer-guides/application-materials-guide-4.0.md): projectから教材・preview・buildまでを8ページで結ぶ図解
- [DSL 4.0表層仕様](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/docs/design/dsl-4-surface.md): 作者向け構文の規範仕様
- [DSL 4.0 Source Graph Preview](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/docs/design/dsl-4-source-include-preview.md): 複数source、transaction、有限上限、rollbackの設計
