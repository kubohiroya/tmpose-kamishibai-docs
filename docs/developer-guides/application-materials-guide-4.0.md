# TMPose紙芝居 4.0 アプリ・教材・ツールチェインガイド

Copyright © 2026 Hiroya Kubo. この文書は[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)で提供します。

<p class="application-guide-kicker">DSL 4.0のproject、物語、教材、YAML台本、preview・buildを8ページでつなぐ</p>

<p class="application-page-label">1 / 8　DSL 4.0アプリ概要</p>

TMPose紙芝居4.0は、YAMLで記述した物語とproject内の画像・音声・ポーズmodelを読み込み、
camera映像、Actor、SVG Text、音、入力、分岐を一つのstageで実行する参加型AI紙芝居です。
DSL 4.0のsource frontend、runtime、browser／CLI preview、自己完結SB3 buildを正式な一系列として扱います。

<div class="application-value-grid"><section><strong>見る</strong><span>背景、Actor、speech、音、transitionで物語を伝える</span></section><section><strong>動く</strong><span>pose、key、touchを意味のある一つの入力として処理する</span></section><section><strong>作る</strong><span>YAMLとlocal assetをprojectとして編集し、即座に検証する</span></section></div>

<figure class="application-flow"><figcaption>DSL 4.0の実行境界</figcaption><div><span>project source</span><b>→</b><span>parse・Schema・意味検証</span><b>→</b><span>StoryDocument</span><b>→</b><span>runtime・platform</span></div></figure>

<p class="application-callout"><strong>正式サポートの単位:</strong> DSL 4.0の台本、Schema、preview、buildを一つの契約として文書化します。利用するreleaseで必要なfeature flagと配布surfaceが有効かは、上映前に確認します。</p>

<p class="application-source">出典: <a href="../dsl-author-guides/dsl-4.0-author-guide.md">紙芝居DSL 4.0 台本作成ガイド</a>、<a href="../dsl-author-guides/dsl-4.0-schema-reference.md">紙芝居DSL 4.0 Schemaリファレンス</a></p>

## Projectから四つの利用形態へ届ける {#application-4-delivery .application-sheet .unnumbered}

<p class="application-page-label">2 / 8　projectと成果物</p>

作品の正本は、entry YAML、必要に応じたincluded YAML、local asset、`project.source.json`を含む
project directoryです。同じ検証済みgenerationからpreviewと配布成果物を作ります。

<div class="application-columns"><section><p class="application-subhead">project source</p><ul><li><code>story.k4.yml</code>をentry sourceにする</li><li><code>include</code>でsceneやasset宣言を分割できる</li><li>asset pathは宣言したsourceからの相対path</li><li>project root外へのpath escapeとsymlinkを拒否する</li></ul></section><section><p class="application-subhead">四つの利用形態</p><dl><dt>Web Preview</dt><dd>projectをread-onlyで選択し、変更をtransactional reloadする</dd><dt>CLI validate</dt><dd>prettyまたはJSON診断を出力する</dd><dt>CLI build</dt><dd>local sourceとassetを自己完結SB3へ格納する</dd><dt>公開app</dt><dd>検証済みStoryDocumentをplatform adapterで実行する</dd></dl></section></div>

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

<p class="application-callout"><strong>再現性の要点:</strong> previewとbuildは、sourceとassetを一つのgenerationとして安定取得します。途中保存や片側だけ新しい状態では、実行中の正常なgenerationを置き換えません。</p>

## Source Graphで大きな物語を分割する {#application-4-source-graph .application-sheet .unnumbered}

<p class="application-page-label">3 / 8　Source Graph</p>

`include`を有効にすると、entry sourceから到達する複数のYAMLを一つのSource Graphとしてcomposeできます。
root優先や後勝ちは行わず、重複ID、重複する単一設定、cycleを診断してから参照を解決します。

<div class="application-columns"><section><p class="application-subhead">entry source</p><pre><code>include:
  - chapters/rescue.k4.yml

kamishibai: '4.0'
assets:
Ocean:
kind: backdrop
file: ocean.svg
scenes:
opening: - goto: rescue</code></pre></section><section><p class="application-subhead">included source</p><pre><code>assets:
RescueBackground:
kind: backdrop
file: rescue-background.svg
scenes:
rescue: - stage: RescueBackground</code></pre></section></div>

<figure class="application-flow"><figcaption>composeと参照解決</figcaption><div><span>entry</span><b>＋</b><span>include graph</span><b>→</b><span>重複・cycle検査</span><b>→</b><span>一つのStoryDocument</span></div></figure>

<p class="application-callout"><strong>有限な入力:</strong> 一sourceのbyte数、source件数、graph合計byte数、include depth、compose後byte数に上限を設け、無制限に読み込みません。</p>

## 参加者の入力をsceneの出来事へ変換する {#application-4-interaction .application-sheet .unnumbered}

<p class="application-page-label">4 / 8　sceneと入力</p>

sceneにはstage操作、Actor action、音、時間、分岐、key・touch・pose入力を順に記述します。
navigationと作品内input actionは同じ入力を競合して消費せず、その時点で意味を持つ一つのconsumerへ渡します。

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

<div class="application-storyline"><span>sceneを表示</span><b>→</b><span>Actorが話す</span><b>→</b><span>入力を待つ</span><b>→</b><span>次のsceneへ進む</span></div>

<p class="application-source">出典: <a href="../dsl-author-guides/dsl-4.0-author-guide.md#シーンを書く">シーンを書く</a>、<a href="../dsl-author-guides/dsl-4.0-schema-reference.md#global-action">Global action</a></p>

## 教材で人・AI・programの役割を分ける {#application-4-learning .application-sheet .unnumbered}

<p class="application-page-label">5 / 8　DSL 4.0教材設計</p>

DSL 4.0の教材では、物語と演出を決める人、画像やpose modelを作るAI、検証済みactionを順に実行する
programの役割を分けて扱います。YAMLとassetがproject内で対応するため、変更した対象と結果を追跡できます。

<figure class="application-workshop-overview"><img src="../images/image10.png" alt="参加型AI紙芝居を構成する画像生成AI、ポーズ認識AI、プログラムの役割を7段階で説明する教材図"><figcaption>考える、作る、認識する、結果を物語へ渡すという学習の流れ。</figcaption></figure>

<div class="application-value-grid"><section><strong>人</strong><span>物語、scene、使うpose、安全な操作方法を決める</span></section><section><strong>AI</strong><span>画像を生成し、camera映像のposeを分類する</span></section><section><strong>program</strong><span>Schemaと意味を検証し、宣言されたactionだけを実行する</span></section></div>

<p class="application-callout"><strong>教材の境界:</strong> AIの出力をそのまま上映せず、projectへ保存したsourceとassetをreviewし、validateとpreviewを通したgenerationを使用します。</p>

## 編集・検証・previewを一周する {#application-4-cycle .application-sheet .unnumbered}

<p class="application-page-label">6 / 8　制作cycle</p>

作者はYAMLとassetを外部editorで編集し、Schema診断、参照診断、previewの順に確認します。
変更が失敗した場合、previewは直前の正常なgenerationを保ち、source位置付きの診断を表示します。

<div class="application-cycle"><span>物語とposeを設計</span><b>→</b><span>source・assetを編集</span><b>→</b><span>validate</span><b>→</b><span>Web Preview</span><b>→</b><span>上演して改善</span></div>

<div class="application-columns"><section><p class="application-subhead">作者が確認するもの</p><ul><li>YAML 1.2としてparseできる</li><li>Schemaの型、必須field、未知keyが正しい</li><li>asset、Actor、scene、branchの参照先が存在する</li><li>camera、音、入力の終了処理が成立する</li></ul></section><section><p class="application-subhead">previewが守るもの</p><ul><li>書込み途中のsourceをstageしない</li><li>local assetをhashとgenerationで識別する</li><li>失敗時に正常な実行状態を破壊しない</li><li>Story Pathとsource行・列を診断へ戻す</li></ul></section></div>

<p class="application-source">出典: <a href="../dsl-author-guides/dsl-4.0-author-guide.md#web-previewで変更をlive-reloadする">Web Previewで変更をlive reloadする</a></p>

## 紙芝居DSL 4.0が物語を構造化する {#dsl-40 .application-sheet .unnumbered}

<p class="application-page-label">7 / 8　DSL 4.0説明</p>

紙芝居DSL 4.0は、YAML mappingとlistでasset、Actor、style、変数、入力設定、branch、scene、actionを
構造化します。型と局所制約はJSON Schema、参照関係と実行上の制約はsemantic validatorが検査します。

<div class="application-columns"><section><p class="application-subhead">トップレベル</p><ul><li><code>kamishibai</code>: 固定値<code>'4.0'</code></li><li><code>assets</code>: backdrop、costume、sound、poseModel、image</li><li><code>actors</code>: Actorと初期skin</li><li><code>textStyles</code>／<code>speechStyles</code>: 表示と発話</li><li><code>controls</code>／<code>branches</code>: 入力と分岐</li><li><code>scenes</code>: 実行するsceneとaction</li></ul></section><section><p class="application-subhead">実行pipeline</p><ol><li>Source Graphを安定取得する</li><li>YAMLを制限付きでparseする</li><li>JSON Schemaで構造を検証する</li><li>参照と意味制約を検証する</li><li>immutable StoryDocumentへ正規化する</li><li>runtimeがactionを順に実行する</li></ol></section></div>

<p class="application-callout"><strong>安全な失敗:</strong> 未知key、型違反、重複ID、存在しない参照、危険なpathは実行前に診断し、cameraや音声を開始しません。</p>

<p class="application-source">出典: <a href="../dsl-author-guides/dsl-4.0-schema-reference.md">紙芝居DSL 4.0 Schemaリファレンス</a></p>

## validate・preview・buildを同じ契約で実行する {#application-4-toolchain .application-sheet .unnumbered}

<p class="application-page-label">8 / 8　DSL 4.0 toolchain</p>

`tmpose-kamishibai`のCLIはproductionと同じcanonicalizer、Schema、semantic validator、diagnostic modelを
使います。buildはdisk上のcandidateを再検証し、sourceとlocal assetを含む自己完結SB3をtransactionalに出力します。

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

<div class="application-columns"><section><p class="application-subhead">検証</p><ul><li>pretty診断は作者が読む</li><li>JSON診断はeditorやCIが利用する</li><li>同じ入力から同じStoryDocumentを得る</li><li>上限値をCLI引数で明示する</li></ul></section><section><p class="application-subhead">build</p><ul><li>project rootとmanifestを明示する</li><li>local sourceとassetをbundleする</li><li>通常のremote poseまたは検証付きremoteを明示する</li><li>完成candidateだけを出力先へ置換する</li></ul></section></div>

<p class="application-callout"><strong>配布前確認:</strong> validate、Web Preview、build後のself-contained artifact smokeを同じproject generationに対して行います。</p>

詳細な台本作成手順は[紙芝居DSL 4.0 台本作成ガイド](../dsl-author-guides/dsl-4.0-author-guide.md)、
fieldとactionの型は[紙芝居DSL 4.0 Schemaリファレンス](../dsl-author-guides/dsl-4.0-schema-reference.md)を参照してください。
