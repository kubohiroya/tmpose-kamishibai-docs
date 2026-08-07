# 紙芝居を作る

Copyright © 2026 Hiroya Kubo. この文書は[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)で提供します。

文書状態: DSL 4.0リリース前draft。正式CLIと公開starterは未確定です。\
対象: 初めて紙芝居DSL 4.0を書く人\
対象仕様: `kamishibai: '4.0'`\
想定時間: 60〜90分

このチュートリアルでは、「紙芝居を遊ぶ」で使用した最小作品のstarterを変更し、preview、診断修正、
検証、buildを経て自己完結SB3を作ります。通常の台本作者はTurboWarpのコード領域を開かず、Scratch
ブロックを追加しません。

## 完了するとできること

- DSL 4.0 projectの台本とアセットを見分けられる
- YAMLのセリフを変更し、新しいasset、アクター、sceneを追加できる
- development previewへ変更を反映できる
- 診断が示すsource位置から台本を修正できる
- 検証済みの台本とアセットから自己完結SB3を生成できる

## 初版で扱わないこと

- Teachable Machineでのポーズモデル作成
- DSL 3.1／3.2台本の変換
- 複雑な分岐、custom action、Action Context
- Web公開やGitHub Pagesへのdeploy
- runtime、標準template、機能拡張の開発
- 宣言済みassetのfile内容差し替え、削除／rename／kind／path変更
- base SB3やTurboWarp project構造のlive reload

これらは基本チュートリアルの完了後に、作成ガイド、Schemaリファレンス、開発者向け資料で扱います。

## 1. 完成作品を確認する

最初に[紙芝居を遊ぶ](play.md)を行い、作成する作品の開始、ポーズ認識、終了を確認します。完成状態を
先に知ることで、以後の変更が画面のどこへ反映されたか比較できます。

production相当の完成画面は「遊ぶ」の画像を再利用し、同じ状態を重複撮影しません。新しい画像が
必要になった場合だけ`C-13`として取得します。

<!-- screenshot:C-13 -->

## 2. Starterを開く

正式リリース時に、固定versionのstarter取得先、展開方法、必要なtoolchainを記載します。starterは
少なくとも次の構造を持つものとします。

```text
tutorial-story/
├── project.source.json
├── story.kamishibai.yaml
├── beach.svg
├── turtle.svg
├── opening.mp3
└── rescue-pose/
    ├── model.json
    ├── metadata.json
    └── weights.bin
```

作者が最初に編集する正本はroot直下の`story.kamishibai.yaml`です。`project.source.json`の`path`を
省略するとこの既定名を使用します。別名もroot直下の`.kamishibai.yaml` basenameだけを指定でき、
`stories/`等のdirectoryへ台本を置く構成は使用しません。

画像と音声はroot直下へ置けます。`assets/`、`images/`、`sounds/`、`pose-models/`等は作品が大きい場合に
任意で使う整理用directoryであり、starterの必須階層ではありません。YAMLの`file`はproject root基準です。
pose modelはbundleを構成する複数fileだけをmodel単位のdirectoryへまとめます。

<!-- screenshot:C-01 -->

## 3. Web PreviewでProjectを開く

対応browserでHTTPSのWeb Previewを開き、「プロジェクトを開く」を押します。この操作はuser gestureから
read-onlyのdirectory pickerを開きます。

<!-- screenshot:C-02 -->

pickerでは`story.kamishibai.yaml`そのものではなく、`project.source.json`とYAMLを含む`tutorial-story/`
directoryを選択します。Web Previewは選択したroot外を読まず、handleをsession中だけ保持します。

<!-- screenshot:C-03 -->

`project.source.json`を検証し、最初のsourceが正常ならreload選択dialogを挟まず先頭から開始します。
watch状態になり、外部editorの保存を待っていることを確認します。

<!-- screenshot:C-04 -->

最初のsourceが不正または見つからない場合はruntimeを開始せず、preview shellが診断を表示して変更を
待ちます。この状態は後の診断stepで扱います。

## 4. セリフを変更する

台本の基本構造を確認します。次の例は構造説明用であり、正式starterのsourceをrelease時に正本として
同期します。

```yaml
kamishibai: '4.0'

assets:
  Beach: backdrop
  TurtleIdle: costume:Turtle

actors:
  Turtle: TurtleIdle

scenes:
  opening:
    - stage: Beach
    - Turtle.say:
        text: 助けて！
        seconds: 2
```

最初の変更では`text`だけを書き換えます。保存後のsourceが正常なら、previewは変更前の実行を安全な
位置で止め、reload status buttonへ最終reload時刻を表示します。buttonを開いた第1段階では、先頭、
現在のscene、現在のactionから再開位置を選びます。actionから安全に再開できない場合は、scene、先頭の
順でfallbackし、選択した位置と実際の再開位置を区別して示します。

第2段階では、今回だけreload、reloadして次回設定も保存、reloadせず次回設定だけ保存、cancelの適用範囲を
選びます。第1段階の選択だけではreloadせず、cancel、close、Escapeでも再開設定を変更しません。

同じUIでstatus buttonの優先表示位置を、上下左右の中央を含む外周8方向から選べます。camera control等と
重なる場合は最も近い空き位置へ移動し、衝突がなくなると優先位置へ戻ります。

<!-- screenshot:C-05 -->

初回は先頭からの再開を選び、変更したセリフが表示されることを確認します。

<!-- screenshot:C-06 -->

## 5. Asset、アクター、Sceneを追加する

次に、addition kitの新しい背景とcostumeをproject rootへcopyし、そのasset IDを使用するsceneを追加します。
fileを先に置いても、YAMLを先に保存してもかまいません。Web Previewは両方が揃ってstableになるまで現在の
作品を継続します。一度に複数の概念を加えず、次の順に確認します。

1. `new-beach.svg`をproject rootへcopyする
2. addition kitのcostume fileもproject rootへcopyする

<!-- screenshot:C-07 -->

3. `assets`へ新しい背景IDと`file: new-beach.svg`を追加する
4. 新しいcostume ID、`target`、fileを追加する
5. `actors`へアクターと初期costumeの対応を追加する
6. `scenes`で新しい背景とアクターを参照する
7. セリフまたは待機を追加して保存する

追加file、YAML entry、参照のすべてが正常な場合だけtransactionalに反映します。途中のfileや不正な
candidateを部分適用せず、未参照fileは無視します。宣言済みassetの内容差し替え、削除、rename、kind／path
変更はこの基本チュートリアルに混ぜません。アセットfile、ID、actionの正確な例は正式starterから引用し、
文書と配布物の内容を二重管理しません。

sourceと追加assetが一candidateとして検証されると、追加asset ID、kind、影響sceneと再開位置をdialogで
確認できます。

<!-- screenshot:C-08 -->

先頭から再開し、新しい背景、アクター、sceneが表示されることを確認します。

<!-- screenshot:C-09 -->

## 6. ポーズSceneを追加する

starterへ同梱された検証済みpose modelをsceneから参照し、ポーズ成立後に次のsceneへ進む構成を追加します。
ポーズactionの最終形、feedback mode、navigation policy、camera controlはrelease時のSchemaから引用します。

このstepではモデルの学習、remote URLからの取得、Scratch変数やblockによる認識状態の変更は扱いません。

productionの認識状態は「遊ぶ」の`P-05`を参照します。ここではWeb Preview固有の`C-10`を取得し、
pose feedbackとcamera controlが表示された状態でも、reload status buttonがcontrolと重ならないことを
確認します。撮影fixtureでは右上を優先位置とし、右上のcamera controlを避けて上中央へ解決される状態を
使用します。

<!-- screenshot:C-10 -->

## 7. 診断を読んで修正する

未定義のアセット参照など、安全に再現できる誤りをstarterの作業copyへ一件だけ加えます。previewまたは
検証commandが示す次の情報を確認します。

- 診断codeとseverity
- source表示名
- 行と列
- Story Pathまたはfield位置
- 説明と修正候補

<!-- screenshot:C-11 -->

該当箇所を修正して保存し、同じ診断が消え、正常なsnapshotだけが実行へ採用されることを確認します。
元のstarterは変更せず、作業copyだけでエラーを再現します。

## 8. 検証してSB3をBuildする

正式リリース時に、one-shot validationとproduction buildのcommandを掲載します。commandは画像にせず、
コピー可能なcode blockとし、少なくとも次を明示します。

- 入力YAMLまたはsource manifest
- project root
- canonical base template
- control profile
- source／assetの有限上限
- 出力SB3

buildは台本と必要なローカルアセットを埋め込んだ自己完結SB3を生成します。失敗時に既存出力を壊さず、
成功時だけ出力が置き換わることを正式toolchainの契約へ合わせて説明します。

## 9. 完成したSB3を再生する

build済みSB3を通常のTurboWarp editorで開きます。production artifactにはdevelopment previewのwatch、
reload candidate、session token、dialog状態を保存しません。

<!-- screenshot:C-12 -->

タイトルから開始し、「遊ぶ」と同じ順序で最後まで再生します。台本sourceを変更しただけの標準作品では、
作者がScratchブロックを追加していないことも確認します。

## 完了チェック

- [ ] starterの編集対象を見分けられた
- [ ] Web PreviewでYAMLではなくproject root directoryを選択した
- [ ] YAMLのセリフを変更し、previewへ反映できた
- [ ] 新しいasset file、YAML entry、アクター、sceneを一candidateとして反映できた
- [ ] 同梱済みpose modelを使うsceneを確認できた
- [ ] 診断のsource位置から誤りを修正できた
- [ ] 台本を検証し、自己完結SB3を生成できた
- [ ] build済みSB3を最後まで再生できた
- [ ] Scratchブロックを追加しなかった

## 次に読む

- [紙芝居DSL 4.0 台本作成ガイド](../dsl-author-guides/dsl-4.0-author-guide.md)
- [DSL 4.0 Schemaリファレンス準備 Issue #29](https://github.com/kubohiroya/tmpose-kamishibai-docs/issues/29)
- DSL 3.1／3.2からの移行、custom action、公開手順は、それぞれの正式ガイド完成後にリンクを追加する
