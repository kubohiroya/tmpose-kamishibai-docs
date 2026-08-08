# TMPose紙芝居 4.0 アプリ・教材・ツールチェインガイド

Copyright © 2026 Hiroya Kubo. この文書は[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)で提供します。

<p class="application-guide-kicker">DSL 4.0のプロジェクト、物語、教材、YAML台本、プレビュー・ビルドを8ページでつなぐ</p>

この文書は、教材やワークショップを設計する方、制作環境を整える方、プレビュー・ビルドの役割を確認する方の
ための詳細ガイドです。初めて4.0の全体像を知るための概要説明書ではありません。最初に読む場合は
[紙芝居アプリ 4.0 概要説明書 大人向け](../user-guides/executive-summary-adult-4.0.md)で、できること、
人・AI・プログラムの役割、制作のサイクルを確認してください。

教材設計やツールチェインの具体化が必要になったら、この文書を1ページ目から8ページ目まで順に読み、
「作品の材料」「検証」「実行」「配布」の関係をプロジェクトへ対応させます。台本を書く方は台本作成ガイドを、
実装を調べる方はソフトウェアメンテナンスガイドを併用します。

<p class="application-page-label">1 / 8　DSL 4.0アプリ概要</p>

TMPose紙芝居4.0は、YAMLで記述した物語とプロジェクト内の画像・音声・ポーズモデルを読み込み、
カメラ映像、Actor、SVGテキスト、音、入力、分岐を一つの舞台で実行する参加型AI紙芝居です。
DSL 4.0のソースフロントエンド、ランタイム、ブラウザー／CLIプレビュー、自己完結SB3のビルドを正式な一系列として扱います。

<div class="application-value-grid"><section><strong>見る</strong><span>背景、Actor、発話、音、画面切り替えで物語を伝える</span></section><section><strong>動く</strong><span>ポーズ、キー、タッチを意味のある一つの入力として処理する</span></section><section><strong>作る</strong><span>YAMLとローカル素材をプロジェクトとして編集し、即座に検証する</span></section></div>

<figure class="application-flow"><figcaption>DSL 4.0の実行境界</figcaption><div><span>プロジェクトのソース</span><b>→</b><span>解析・スキーマ・意味検証</span><b>→</b><span>StoryDocument</span><b>→</b><span>ランタイム・プラットフォーム</span></div></figure>

<p class="application-callout"><strong>正式サポートの単位:</strong> DSL 4.0の台本、スキーマ、プレビュー、ビルドを一つの契約として文書化します。利用するリリースで必要なフィーチャーフラグと配布画面が有効かは、上映前に確認します。</p>

<p class="application-source">出典: <a href="../dsl-author-guides/dsl-4.0-author-guide.md">紙芝居DSL 4.0 台本作成ガイド</a>、<a href="../dsl-author-guides/dsl-4.0-schema-reference.md">紙芝居DSL 4.0 Schemaリファレンス</a></p>

## Projectから四つの利用形態へ届ける {#application-4-delivery .application-sheet .unnumbered}

<p class="application-page-label">2 / 8　プロジェクトと成果物</p>

作品の正本は、起点のYAML、必要に応じて取り込むYAML、ローカル素材、`project.source.json`を含む
プロジェクトディレクトリです。同じ検証済みの世代（generation）からプレビューと配布成果物を作ります。

<div class="application-columns"><section><p class="application-subhead">プロジェクトのソース</p><ul><li><code>story.k4.yml</code>を起点のソースにする</li><li><code>include</code>でシーンやアセット宣言を分割できる</li><li>素材のパスは宣言したソースからの相対パス</li><li>プロジェクトルート外へのパス脱出とシンボリックリンクを拒否する</li></ul></section><section><p class="application-subhead">四つの利用形態</p><dl><dt>Web Preview</dt><dd>プロジェクトを読み取り専用で選択し、変更を一括して再読み込みする</dd><dt>CLI検証</dt><dd>読みやすい形式またはJSON形式の診断を出力する</dd><dt>CLIビルド</dt><dd>ローカルのソースと素材を自己完結SB3へ格納する</dd><dt>公開アプリ</dt><dd>検証済みStoryDocumentをプラットフォームアダプターで実行する</dd></dl></section></div>

<pre class="application-code"><code>tutorial-story/
├── project.source.json
├── story.k4.yml
├── ocean.svg
├── opening.mp3
├── rescue-pose/
│   ├── model.json
│   ├── metadata.json
│   └── weights.bin
└── chapters/
    ├── rescue.k4.yml
    └── rescue-background.svg</code></pre>

<p class="application-callout"><strong>再現性の要点:</strong> プレビューとビルドは、ソースと素材を一つの世代として安定取得します。途中保存や片側だけ新しい状態では、実行中の正常な世代を置き換えません。</p>

## Source Graphで大きな物語を分割する {#application-4-source-graph .application-sheet .unnumbered}

<p class="application-page-label">3 / 8　Source Graph</p>

`include`を有効にすると、起点のソースから到達する複数のYAMLを一つのSource Graphとして合成できます。
Source Graphとは、起点のYAMLから`include`で到達する複数ソースの関係全体です。起点優先や後勝ちは行わず、
重複ID、重複する単一設定、循環を診断してから参照を解決します。

<div class="application-columns"><section><p class="application-subhead">起点のソース</p><pre><code>include:
  - chapters/rescue.k4.yml

kamishibai: '4.0'
assets:
Ocean:
kind: backdrop
file: ocean.svg
scenes:
opening: - goto: rescue</code></pre></section><section><p class="application-subhead">取り込まれるソース</p><pre><code>assets:
RescueBackground:
kind: backdrop
file: rescue-background.svg
scenes:
rescue: - stage: RescueBackground</code></pre></section></div>

<figure class="application-flow"><figcaption>合成と参照解決</figcaption><div><span>起点</span><b>＋</b><span>取り込み関係</span><b>→</b><span>重複・循環検査</span><b>→</b><span>一つのStoryDocument</span></div></figure>

<p class="application-callout"><strong>有限な入力:</strong> 一つのソースのバイト数、ソース件数、グラフ合計バイト数、`include`の深さ、合成後のバイト数に上限を設け、無制限に読み込みません。</p>

## 参加者の入力をシーンの出来事へ変換する {#application-4-interaction .application-sheet .unnumbered}

<p class="application-page-label">4 / 8　シーンと入力</p>

シーンには舞台操作、Actorのアクション、音、時間、分岐、キー・タッチ・ポーズ入力を順に記述します。
ナビゲーションと作品内の入力アクションは同じ入力を競合して消費せず、その時点で意味を持つ一つの受け手へ渡します。

<pre class="application-code"><code>kamishibai: '4.0'

assets:
  Beach: backdrop
  HeroIdle: costume:Hero

actors:
  Hero: HeroIdle

scenes:
  opening:
    - stage: Beach
    - Hero.show:
        skin: HeroIdle
        x: 0
        y: -60
        scale: 30
    - Hero.say:
        text: 助けに行こう
        waitFor: advance
    - keyInputToChangeScene:
        Enter: rescue</code></pre>

<div class="application-storyline"><span>シーンを表示</span><b>→</b><span>Actorが話す</span><b>→</b><span>入力を待つ</span><b>→</b><span>次のシーンへ進む</span></div>

<p class="application-source">出典: <a href="../dsl-author-guides/dsl-4.0-author-guide.md#シーンを書く">シーンを書く</a>、<a href="../dsl-author-guides/dsl-4.0-schema-reference.md#global-action">Global action</a></p>

## 教材で人・AI・プログラムの役割を分ける {#application-4-learning .application-sheet .unnumbered}

<p class="application-page-label">5 / 8　DSL 4.0教材設計</p>

DSL 4.0の教材では、物語と演出を決める人、画像やポーズモデルを作るAI、検証済みアクションを順に実行する
プログラムの役割を分けて扱います。YAMLと素材がプロジェクト内で対応するため、変更した対象と結果を追跡できます。

<figure class="application-workshop-overview"><img src="../images/image10.png" alt="参加型AI紙芝居を構成する画像生成AI、ポーズ認識AI、プログラムの役割を7段階で説明する教材図"><figcaption>考える、作る、認識する、結果を物語へ渡すという学習の流れ。</figcaption></figure>

<div class="application-value-grid"><section><strong>人</strong><span>物語、シーン、使うポーズ、安全な操作方法を決める</span></section><section><strong>AI</strong><span>画像を生成し、カメラ映像のポーズを分類する</span></section><section><strong>プログラム</strong><span>スキーマと意味を検証し、宣言されたアクションだけを実行する</span></section></div>

<p class="application-callout"><strong>教材の境界:</strong> AIの出力をそのまま上映せず、プロジェクトへ保存したソースと素材をレビューし、検証とプレビューを通した世代を使用します。</p>

## 編集・検証・プレビューを一周する {#application-4-cycle .application-sheet .unnumbered}

<p class="application-page-label">6 / 8　制作のサイクル</p>

作者はYAMLと素材を外部エディターで編集し、スキーマ診断、参照診断、プレビューの順に確認します。
変更が失敗した場合、プレビューは直前の正常な世代を保ち、ソース位置付きの診断を表示します。

<div class="application-cycle"><span>物語とポーズを設計</span><b>→</b><span>ソース・素材を編集</span><b>→</b><span>検証</span><b>→</b><span>Web Preview</span><b>→</b><span>上演して改善</span></div>

<div class="application-columns"><section><p class="application-subhead">作者が確認するもの</p><ul><li>YAML 1.2として解析できる</li><li>スキーマの型、必須フィールド、未知のキーが正しい</li><li>アセット、Actor、シーン、分岐の参照先が存在する</li><li>カメラ、音、入力の終了処理が成立する</li></ul></section><section><p class="application-subhead">プレビューが守るもの</p><ul><li>書き込み途中のソースを実行対象にしない</li><li>ローカル素材をハッシュと世代で識別する</li><li>失敗時に正常な実行状態を破壊しない</li><li>物語上の位置とソースの行・列を診断へ戻す</li></ul></section></div>

<p class="application-source">出典: <a href="../dsl-author-guides/dsl-4.0-author-guide.md#web-previewで変更をlive-reloadする">Web Previewで変更をlive reloadする</a></p>

## 紙芝居DSL 4.0が物語を構造化する {#dsl-40 .application-sheet .unnumbered}

<p class="application-page-label">7 / 8　DSL 4.0説明</p>

紙芝居DSL 4.0は、YAMLのマッピングとリストでアセット、Actor、スタイル、変数、入力設定、分岐、シーン、アクションを
構造化します。型と局所制約はJSON Schema、参照関係と実行上の制約は意味検証器が検査します。

<div class="application-columns"><section><p class="application-subhead">トップレベル</p><ul><li><code>kamishibai</code>: 固定値<code>'4.0'</code></li><li><code>assets</code>: backdrop、costume、sound、poseModel、image</li><li><code>actors</code>: Actorと初期skin</li><li><code>textStyles</code>／<code>speechStyles</code>: 表示と発話</li><li><code>controls</code>／<code>branches</code>: 入力と分岐</li><li><code>scenes</code>: 実行するシーンとアクション</li></ul></section><section><p class="application-subhead">実行手順</p><ol><li>Source Graphを安定取得する</li><li>YAMLを制限付きで解析する</li><li>JSON Schemaで構造を検証する</li><li>参照と意味制約を検証する</li><li>変更不能なStoryDocumentへ正規化する</li><li>ランタイムがアクションを順に実行する</li></ol></section></div>

<p class="application-callout"><strong>安全な失敗:</strong> 未知のキー、型違反、重複ID、存在しない参照、危険なパスは実行前に診断し、カメラや音声を開始しません。</p>

<p class="application-source">出典: <a href="../dsl-author-guides/dsl-4.0-schema-reference.md">紙芝居DSL 4.0 Schemaリファレンス</a></p>

## 検証・プレビュー・ビルドを同じ契約で実行する {#application-4-toolchain .application-sheet .unnumbered}

<p class="application-page-label">8 / 8　DSL 4.0ツールチェイン</p>

`tmpose-kamishibai`のCLIは配布環境と同じ正規化器、スキーマ、意味検証器、診断モデルを
使います。ビルドはディスク上の候補を再検証し、ソースとローカル素材を含む自己完結SB3を一括して出力します。

<pre class="application-code"><code>tmpose-kamishibai validate-dsl4 \
  --input story.k4.yml \
  --format pretty

tmpose-kamishibai build-dsl4 \
  --base base.sb3 \
  --project-root tutorial-story \
  --source-manifest project.source.json \
  --output dist/story.sb3 \
  --control-profile production \
  --channel bundled</code></pre>

<div class="application-columns"><section><p class="application-subhead">検証</p><ul><li>読みやすい形式の診断は作者が読む</li><li>JSON診断はエディターやCIが利用する</li><li>同じ入力から同じStoryDocumentを得る</li><li>上限値をCLI引数で明示する</li></ul></section><section><p class="application-subhead">ビルド</p><ul><li>プロジェクトルートとマニフェストを明示する</li><li>ローカルのソースと素材をまとめる</li><li>リモート素材は完全性情報付きで扱う</li><li>完成した候補だけを出力先へ置換する</li></ul></section></div>

<p class="application-callout"><strong>配布前確認:</strong> 検証、Web Preview、ビルド後の自己完結成果物のスモークテストを、同じプロジェクトの世代に対して行います。</p>

詳細な台本作成手順は[紙芝居DSL 4.0 台本作成ガイド](../dsl-author-guides/dsl-4.0-author-guide.md)、
フィールドとアクションの型は[紙芝居DSL 4.0 Schemaリファレンス](../dsl-author-guides/dsl-4.0-schema-reference.md)を参照してください。
実装を理解・保守する場合は、続けて
[紙芝居アプリ 4.0 ソフトウェアメンテナンスガイド](developer-guide-4.0.md)へ進みます。
