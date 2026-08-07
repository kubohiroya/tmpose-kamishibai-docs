# DSL 4.0 チュートリアル準備

Copyright © 2026 Hiroya Kubo. この文書は[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)で提供します。

文書状態: DSL 4.0リリース前draft\
関連Issue: [準備 #31](https://github.com/kubohiroya/tmpose-kamishibai-docs/issues/31) / [実装追従 #34](https://github.com/kubohiroya/tmpose-kamishibai-docs/issues/34)

このディレクトリは、DSL 4.0の正式リリース後に公開するチュートリアルの本文骨格、
スクリーンショット台帳、サイト共通AppBar契約を保持します。リリース前に確定できない
画面名、コマンド、サンプルURLを現行仕様として断定せず、正式リリース時に固定された
成果物から補完します。

このdraftは`docs/config.mjs`へ登録せず、公開サイトのAppBarからリンクしません。

## 公開時の情報設計

| URL                  | 役割                           | source draft                           |
| -------------------- | ------------------------------ | -------------------------------------- |
| `/tutorials/`        | 二つのチュートリアルを選ぶ入口 | この文書を基に公開用landing pageを作成 |
| `/tutorials/play/`   | 紙芝居を遊ぶ                   | [play.md](play.md)                     |
| `/tutorials/create/` | 紙芝居を作る                   | [create.md](create.md)                 |

初版のチュートリアルはWeb操作を正本とし、PDFを公開しません。詳細な仕様、全field、全action、
移行、開発者向け手順は既存ドキュメントへリンクし、チュートリアルへ重複掲載しません。

## 読者と完了条件

| チュートリアル | 対象                     | 想定時間 | 完了条件                                                                     |
| -------------- | ------------------------ | -------: | ---------------------------------------------------------------------------- |
| 紙芝居を遊ぶ   | 初めて紙芝居を再生する人 | 10〜15分 | サンプルを開き、ポーズ認識を経て最後まで再生できる                           |
| 紙芝居を作る   | 初めてDSL 4.0を書く人    | 60〜90分 | starterを変更し、preview、診断修正、検証、buildを経て自己完結SB3を再生できる |

通常の台本作者はScratchブロックを追加しません。「作る」は外部YAML正本とアセットを編集し、
標準templateのblock graphを変更しないゼロブロック作者フローを前提にします。

## チュートリアル用作品

「遊ぶ」と「作る」は、同じ最小作品を利用します。正式なsource、asset、生成設定、Web版、SB3、
ライセンスは`tmpose-kamishibai-samples`で管理し、この文書リポジトリへ複製しません。

最小作品は次の条件を満たすものとします。

- 3シーン程度で最後まで短時間に再生できる
- 背景1〜2件、アクター1件、セリフ、待機、画面遷移を含む
- 同梱済みポーズモデルによるポーズ認識を1件含む
- project source、配布SB3、Web版を同じ固定入力から生成できる
- assetと生成物のversion、integrity、licenseを固定できる
- 初めての人が変更する範囲と、配布側が用意する範囲を分離できる
- root直下の`story.kamishibai.yaml`、画像、音声と、model単位のpose bundle directoryで構成できる

浦島太郎全編を直接教材にせず、「カメを助ける」程度の独立した小さな作品を想定します。
Teachable Machineでのモデル作成は初版の対象外とし、検証済みモデルをstarterへ同梱します。

## スクリーンショット

[screenshots.json](screenshots.json)を画像台帳の正本とします。各画像にはID、対応step、用途、
想定caption、alt text案、file名、依存するrelease gateを記録します。

YAML、command、terminal出力は画像化せず、コピー可能なcode blockで掲載します。画像は画面操作、
正常状態、失敗状態を示すために使用します。

### 実装追跡

2026-08-07時点では、上流のWeb Preview live reload、transactional asset live reload、共通reload
overlay、pose feedback、camera controlが
[`e1696f6`](https://github.com/kubohiroya/tmpose-kamishibai/commit/e1696f64f414baa3b80c1be2fdad32164efe1bec)
までに実装されています。`screenshots.json`の`progressStatus`は、この上流実装の有無と残作業を
`implemented`、`partial`、`blocked`で区別します。`implemented`でも、公開version、starter、最終UI、
撮影環境が揃うまでは`ready: false`を維持します。

reload overlayは上流の
[撮影引き継ぎ契約](https://github.com/kubohiroya/tmpose-kamishibai/blob/e1696f64f414baa3b80c1be2fdad32164efe1bec/docs/design/dsl-4-preview-reload-overlay.md#tutorial-screenshot-handoff)と
[fixture](https://github.com/kubohiroya/tmpose-kamishibai/blob/e1696f64f414baa3b80c1be2fdad32164efe1bec/test/fixtures/dsl4/preview-reload-overlay-screenshot.json)
を正本にします。1280 × 720 CSS px、DPR 1、`ja-JP`、reduced motionで、同じfixtureをWeb Previewと
CLI browser previewに使用します。local source pathは画像へ表示しません。

想定する保存先は次のとおりです。

```text
docs/images/tutorials/dsl4/play/
docs/images/tutorials/dsl4/create/
```

## AppBar

[navigation-contract.json](navigation-contract.json)を5項目AppBarの計画上の正本とします。

```text
トップ → チュートリアル → ドキュメント → サンプル → ダウンロード
```

`/tutorials/`と配下では「チュートリアル」、それ以外のドキュメントサイトでは
「ドキュメント」だけを現在地にします。AppBarは3リポジトリに分散しているため、公開時は
契約に列挙した変更箇所を小粒PRで同期します。

本Issueでは既存4項目AppBarを変更しません。リンク先、本文、サンプルが完成してから公開導線を
追加します。

## Capture gate

画像取得前に、[screenshots.json](screenshots.json)の全gateを確認します。少なくとも次を固定します。

- DSL 4.0の公開versionと対象commit
- Standard Web playerとapp shellの配置、状態、文言
- チュートリアル用サンプルURLとstarter artifact
- Web Previewのdirectory選択、YAML／additive asset live reload、診断UI
- 2段階reload dialogの再開位置、適用範囲、8方向anchorと衝突回避
- pose feedback presenter
- camera preview、mirroring、camera選択UIの採用範囲
- `validate`と`build`の正式CLI
- viewport、device pixel ratio、browser version
- cameraへ映る人物の同意、背景、個人情報除去方針

## リリース後の引き継ぎ

1. `tmpose-kamishibai-samples`で最小作品とstarterを公開する
2. DSL 4.0の公開versionとcapture条件を台帳へ記録する
3. 台帳の順に画像を取得し、alt textとcaptionを実画面へ合わせる
4. draft中のrelease gate注記を正式なUI名、コマンド、URLへ置き換える
5. 入口、遊ぶ、作るのHTMLを公開し、最初から最後まで追試する
6. 3リポジトリのAppBarとトップページカードを更新する

## 関連資料

- [紙芝居DSL 4.0 台本作成ガイド](../dsl-author-guides/dsl-4.0-author-guide.md)
- [DSL 4.0 Schemaリファレンス準備 Issue #29](https://github.com/kubohiroya/tmpose-kamishibai-docs/issues/29)
- [source channelとゼロブロック作者フロー #258](https://github.com/kubohiroya/tmpose-kamishibai/issues/258)
- [capability・Bundle・release境界 #266](https://github.com/kubohiroya/tmpose-kamishibai/issues/266)
- [poseModel asset lifecycle #327](https://github.com/kubohiroya/tmpose-kamishibai/issues/327)
- [Web PreviewとYAML live reload #390](https://github.com/kubohiroya/tmpose-kamishibai/issues/390)
- [local assetの追加・内容更新live reload #391](https://github.com/kubohiroya/tmpose-kamishibai/issues/391)
- [共通reload overlay #394](https://github.com/kubohiroya/tmpose-kamishibai/issues/394)
- [pose認識進捗表示 #383](https://github.com/kubohiroya/tmpose-kamishibai/issues/383)
- [camera preview操作UI #388](https://github.com/kubohiroya/tmpose-kamishibai/issues/388)
