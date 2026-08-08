# 紙芝居DSL 4.0 台本作成ガイド

Copyright © 2026 Hiroya Kubo. この文書は[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)で提供します。

対象: DSL 4.0の台本作者、教材作成者、授業設計者、開発者\
対象仕様: `kamishibai: '4.0'`\
文書状態: 固定実装基準を説明する台本作成ガイド（正式リリースの操作資料ではない）\
調査基準: tmpose-kamishibai `7945781`、2026年8月8日

> **配布状態との区別:** 2026年8月8日時点で、GitHub Releasesの最新正式リリースは`v3.2.3`で、
> `v4.0.0`は未公開です。このガイドの記述例は固定実装を基準にしており、公開アプリ、配布物、
> フィーチャーフラグでDSL 4.0が利用可能だとは保証しません。

このガイドと[紙芝居DSL 4.0 Schemaリファレンス](dsl-4.0-schema-reference.md)は、上記の完成commitを
調査基準としています。field、型、必須性、既定値、action引数はSchemaリファレンスで確認し、
Source Graph、preview、build、runtimeの利用可否は対象releaseの機能一覧とfeature flagで確認してください。

この固定commitでは、規範JSON Schema、表層仕様、適合実装・testを同一revisionとして固定しています。
Schemaはruntime実装から生成するものではありません。

この文書は、固定したDSL 4.0表層仕様と作者向けツールチェインを、台本作者が読める形で説明します。

## このガイドの読み進め方

初めて台本を書く場合は、次の順序で進めてください。Schemaリファレンスは最初から通読せず、手順の途中で
fieldやactionの詳細が必要になったときに参照します。

| 段階 | 本書で読む範囲                            | 到達点                         |
| ---- | ----------------------------------------- | ------------------------------ |
| 1    | DSL 4.0の記法、最小台本                   | 一つのsceneを読める            |
| 2    | Project配置、YAML規則、名前、asset、Actor | sourceと素材の対応を作れる     |
| 3    | 表紙、入力、style、scene、action          | 短い作品を書ける               |
| 4    | stableId、Web Preview、総合サンプル       | 変更を安全に確認できる         |
| 5    | 診断、チェックリスト                      | validateして配布前確認ができる |

<figure class="concept-flow"><figcaption>台本を段階的に完成させる順序</figcaption><div class="concept-flow__track"><span>最小台本</span><b aria-hidden="true">→</b><span>projectとasset</span><b aria-hidden="true">→</b><span>sceneとaction</span><b aria-hidden="true">→</b><span>validate</span><b aria-hidden="true">→</b><span>preview</span><b aria-hidden="true">→</b><span>build</span></div><p class="concept-flow__note"><strong>診断が出た場合:</strong> sceneとactionへ戻り、source位置を確認してから再度validateします。</p></figure>

すでに3系作品がある方は、先に
[3系作品の変換ガイド](dsl-3.2-to-4.0-conversion-guide.md)で別fileへ変換し、
生成されたYAMLを本書の「最小台本」「Projectのfileを配置する」「診断と安全停止」と照合してください。
実装状況を調査する必要がなければ、次の「実装完成範囲」は確認だけに留め、最小台本へ進めます。

## DSL 4.0の記法

DSL 4.0は制限付きYAML 1.2で記述します。引数には名前が付き、背景、位置、時間などの意味を
台本から読み取れます。一つのaction itemには命令を一つだけ書きます。

```yaml
- Hero.show:
    skin: HeroHappy
    x: 0
    y: -60
    scale: 30
```

標準のsource suffixは`.k4.yml`、version宣言は`kamishibai: '4.0'`です。sceneは`scenes` mapping、
actionは1キーのYAML mapping、複数引数は`x`、`y`、`seconds`などの名前付きfieldで表します。

## 実装完成範囲

2026年8月8日の調査基準では、次の実装がtmpose-kamishibaiの`main`へ入っています。

- 制限付きYAMLの解析、JSON Schema検証、参照関係の意味検証
- 行・列とStory Pathを保持するSource Map、`K4-*`診断
- 検証後の台本をimmutableな`StoryDocument`へ正規化するsource frontend
- action実行、分岐、シーン遷移、停止を扱うpure runtime controller
- control profileの解決、キー入力adapter、時系列history reducer、runtime navigation control
- camera previewのstory既定、scene固有の非stickyな左右反転指定、任意の操作UI
- `Actor.say`／`Actor.think`の入力待ち、文字送り、開始音／文字音、名前付き`speechStyles`
- `Actor.moveTo`の`linear`、`easeIn`、`easeOut`、`easeInOut`
- `Actor.setTransparency`の即時指定、foreground／backgroundの線形変化
- 複数sourceを決定的にcomposeするSource Graph、宣言元相対asset解決、自己完結SB3 packaging
- Web／CLI previewのtransactional reload、Source Map、packaging後のsource origin復元
- navigation入力と作品内input actionを一つのsemantic consumerへ限定する入力arbitration

builder、TurboWarp runtime surface、browser／CLI previewを含むend-to-end実装は完成しています。
ただし、完成した機能の一部は起動時固定・既定OFFのfeature flagで段階導入されます。実装完成は、
すべての公開releaseで自動的に有効になることを意味しません。

### 実装根拠を確認する場合

仕様の正本は、tmpose-kamishibaiリポジトリの
[紙芝居DSL 4.0 表層仕様](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/docs/design/dsl-4-surface.md)と
[JSON Schema](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/schema/dsl-4.schema.json)です。
camera preview操作UIは[Issue #388](https://github.com/kubohiroya/tmpose-kamishibai/issues/388)、advanced speechと
`speechStyles`は[Issue #396](https://github.com/kubohiroya/tmpose-kamishibai/issues/396)、
`Actor.moveTo.easing`は[Issue #398](https://github.com/kubohiroya/tmpose-kamishibai/issues/398)、
`Actor.setTransparency`は[Issue #406](https://github.com/kubohiroya/tmpose-kamishibai/issues/406)、
Source Graphと`include`は[Issue #417](https://github.com/kubohiroya/tmpose-kamishibai/issues/417)から
上記commitまでにmergeされています。project directory選択とYAML live reloadは
[Issue #390](https://github.com/kubohiroya/tmpose-kamishibai/issues/390)、local assetの追加・内容更新のlive reloadは
[Issue #391](https://github.com/kubohiroya/tmpose-kamishibai/issues/391)で実装されています。

## 最小台本

ファイルをUTF-8で保存します。新規projectでは短い`.k4.yml`を推奨します。

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
    - wait: 1
```

この台本は、次の内容を表します。

1. `Beach`をプロジェクト内の背景として登録する
2. `HeroIdle`を`Hero`用のコスチュームとして登録する
3. `Hero`アクターの初期コスチュームを`HeroIdle`にする
4. 最初の`opening`シーンで背景を変更する
5. `Hero`が2秒間話し、1秒待つ

`kamishibai`と`scenes`だけがトップレベルの必須項目です。`scenes`には一つ以上のシーンが必要です。
通常実行は、`scenes`へ最初に書いたシーンから始まり、明示的な遷移がなければ記述順に次のシーンへ
進みます。

## Projectのfileを配置する

一般作者向けの最小構成では、YAML、画像、音声をproject root直下へ置けます。pose modelだけは複数fileを
一つのbundleとして扱うため、model単位のdirectoryにまとめます。

```text
tutorial-story/
├── project.source.json
├── story.k4.yml
├── ocean.svg
├── hero-happy.svg
├── opening.mp3
├── rescue-pose/
│   ├── model.json
│   ├── metadata.json
│   └── weights.bin
└── chapters/
    ├── rescue.k4.yml
    └── rescue-background.svg
```

`assets/`、`images/`、`sounds/`、`pose-models/`等の分類directoryは必須ではありません。作品が大きく
なった場合に任意で使用できます。単一sourceまたはrootの`story.k4.yml`で宣言した`file: ocean.svg`は
project rootの`ocean.svg`を示します。included sourceで宣言したassetは、そのsourceのdirectoryを基準に
解決します。

Web Previewで選択するのはYAML fileではなく`tutorial-story/`に当たるproject root directoryです。
Web Previewはroot直下の`project.source.json`を読み、次の規則でYAMLを一つに決定します。

- 新規projectはroot直下の`story.k4.yml`を`path`へ明示する
- `path`省略時は後方互換の既定値`story.kamishibai.yaml`を使用する
- 別名を指定する場合も、root直下の正式suffixを持つbasenameだけを使用する
- `stories/main.k4.yml`のようにdirectoryを含むentry pathは使用しない
- directory内のDSL sourceを走査して推測しない
- manifestが不正な場合は既定値へfallbackせず、診断を表示する

新規projectの`project.source.json`は次のようにentry sourceを明示します。

```json
{
  "formatVersion": 1,
  "mode": "external",
  "sourceId": "main",
  "path": "story.k4.yml"
}
```

正式に受理するsuffixは`.k4.yml`、`.k4.yaml`、`.kamishibai.yml`、`.kamishibai.yaml`です。短い
`.k4.yml`を新規sourceの推奨表記とし、長いsuffixは既存projectとの互換性のため維持します。
`build-dsl4`は`--source-manifest`でこのmanifestを指定し、`validate-dsl4 --input`は検証するYAMLを
直接指定します。

## 台本を複数sourceへ分割する

`dsl4SourceIncludes`を起動時に明示ONにすると、entry sourceの`include`から到達する複数sourceを
一つのSource Graphとしてcomposeできます。`include`は一件の文字列またはlistで指定します。

```yaml
# story.k4.yml
include:
  - chapters/rescue.k4.yml

kamishibai: '4.0'
assets:
  Ocean:
    kind: backdrop
    file: ocean.svg
scenes:
  opening:
    - goto: rescue
```

```yaml
# chapters/rescue.k4.yml
assets:
  RescueBackground:
    kind: backdrop
    file: rescue-background.svg
scenes:
  rescue:
    - stage: RescueBackground
```

`chapters/rescue.k4.yml`の`file: rescue-background.svg`は、宣言元を基準に
`chapters/rescue-background.svg`へ解決されます。絶対path、URL、backslash、project root外へのescapeと
root外symlinkは、sourceまたはassetのbyte列を読む前に拒否されます。

Source Graphには次の規則があります。

- `kamishibai`はentry sourceだけに書き、included sourceへ重ねて宣言しない
- 同じnamespaceの同じIDは、内容が同じでも複数sourceへ宣言しない
- `cover`、`loading`、`poseRecognition`、`controls`などの単一設定はgraph全体で一度だけ宣言する
- root優先、include順による後勝ち、shadowingはなく、全宣言を確定してから参照を解決する
- include cycleは経路付き`K4-INCLUDE-CYCLE`で停止する
- 一つのsource、source件数、graph合計byte数、compose後byte数、include depthに有限上限を設ける

`include`はSchema検証の前に処理するSource Graph directiveで、compose後の台本から取り除かれます。
全sourceと参照するlocal assetを二回安定取得し、同じgeneration identityになった場合だけpreviewへstageします。
途中保存、sourceだけ新しい状態、assetだけ新しい状態は実行中のgenerationを置き換えません。build成果物は
composed source、宣言元の論理source ID／range、local assetを保持する自己完結SB3で、端末の絶対pathや
browser file handleを保存しません。

CLI previewでSource Graphを使う場合は`--enable-source-includes`を指定し、`--max-source-bytes`、
`--max-source-files`、`--max-total-source-bytes`、`--max-include-depth`とasset上限を有限値で指定します。
feature flagがOFFの場合は単一source経路を維持します。

## ファイル全体の構造

compose後の台本で使用できるトップレベルキーは次のものだけです。表にないキーは警告ではなくエラーに
なります。`include`は前節のSource Graph処理だけが受理し、JSON Schemaのトップレベルfieldではありません。

| キー              | 必須 | 役割                                              |
| ----------------- | ---- | ------------------------------------------------- |
| `kamishibai`      | 必須 | 文字列`'4.0'`を指定する                           |
| `assets`          | 任意 | 背景、音、costume、ポーズモデル、UI画像を登録する |
| `actors`          | 任意 | アクターと初期コスチュームを対応付ける            |
| `cover`           | 任意 | 表紙の背景とBGMを指定する                         |
| `textStyles`      | 任意 | SVG Textの名前付きスタイルを定義する              |
| `speechStyles`    | 任意 | say／thinkの名前付き文字送りstyleを定義する       |
| `variables`       | 任意 | 物語で使う変数の初期値を定義する                  |
| `loading`         | 任意 | 読み込み中の背景とコスチューム列を指定する        |
| `poseRecognition` | 任意 | ポーズ認識、preview表示、任意の操作UIを設定する   |
| `controls`        | 任意 | 実行環境ごとの操作キーを定義する                  |
| `branches`        | 任意 | 順序付きの条件分岐を登録する                      |
| `scenes`          | 必須 | 一つ以上のシーンとアクションを記述する            |

推奨する並び順は表の順番です。YAML mappingの字下げには空白を使用し、タブは使いません。

## YAMLを書くときの規則

### バージョンは文字列で書く

```yaml
kamishibai: '4.0'
```

引用符のない`4.0`はYAMLの数値として解釈されるため、DSL 4.0として受理されません。

### アクションはlistとして並べる

各アクションは`-`で始め、一つのアクションmappingにはキーを一つだけ書きます。

```yaml
scenes:
  opening:
    - stage: Beach
    - wait: 1
```

次のように二つの命令を一つの項目へまとめることはできません。

```yaml
# エラー
- stage: Beach
  wait: 1
```

### 単一引数だけ短く書ける

意味が一つに決まるアクションにはscalarの短形式があります。

```yaml
- stage: Beach
- bgm: OpeningSound
- wait: 1
- goto: ending
- Hero.setSkin: HeroHappy
```

位置と時間のように意味の異なる値が複数ある場合は、名前付きmappingを使用します。

```yaml
- Hero.moveTo:
    x: 40
    y: -57
    seconds: 1.5
```

`[40, -57, 1.5]`のような位置引数listは受理されません。

### 長い文字列はblock scalarで書ける

```yaml
- Caption.setText:
    text: |-
      海へ出発！
      1か2を押してください
    style: title
```

`|-`の次の行から字下げした範囲が文字列になります。

### YAMLの一部機能は使用できない

DSL 4.0では、安全で決定的に解析するため、次の機能を禁止します。

- duplicate key
- anchorとalias
- merge key
- custom tag
- 一つのファイル内の複数YAML文書

コメントには`#`を使用できます。色の`#112233`、条件式、記号を含む文字列など、YAMLの解釈が
紛らわしい値は引用符で囲んでください。

## 名前の規則

アセット、アクター、スタイル、変数、分岐、シーン、`stableId`の識別子には、Unicodeの文字、数字、
`_`、`-`を使用できます。先頭は文字または`_`にします。

```yaml
assets:
  Beach_1: backdrop
  主人公-通常: costume:主人公
```

次の名前は使用できません。

```yaml
# 先頭が数字
1stScene: []

# 空白を含む
opening scene: []

# actor actionの区切りとして予約された`.`を含む
main.hero: []
```

日本語名はUnicode NFCで保存します。大文字と小文字は別の識別子として扱われます。

## アセットを登録する

### 短形式

すでにSB3へ埋め込まれているアセットを、アセットIDと同じ名前で参照する場合に使用します。

```yaml
assets:
  Beach: backdrop
  HeroIdle: costume:Hero
  OpeningSound: sound
```

| 書式              | 意味                           |
| ----------------- | ------------------------------ |
| `backdrop`        | ステージの同名背景             |
| `costume:ActorID` | 指定アクターの同名コスチューム |
| `sound`           | ステージの同名音               |

### 名前付き形式

埋め込み済みアセットの実名がアセットIDと異なる場合は`name`を使います。builder入力のローカルfileを
使用する場合は`file`を使います。`name`と`file`はどちらか一方だけを指定します。

```yaml
assets:
  Ocean:
    kind: backdrop
    file: ocean.svg
    loading: lazy

  HeroHappy:
    kind: costume
    target: Hero
    name: happy

  OpeningSound:
    kind: sound
    name: Opening Theme
    loading: eager

  救助Pose:
    kind: poseModel
    file: rescue-pose
    loading: lazy

  CameraMenuButton:
    kind: image
    file: select-camera.svg
    loading: eager
```

`kind`に指定できる値は`backdrop`、`costume`、`sound`、`poseModel`、`image`です。`costume`には
`target`が必須です。`poseModel`と`image`には`name`を使用できません。`image`はapp shellが表示する
camera preview control icon用であり、Scratch spriteやcostumeを追加する機能ではありません。

`file`は宣言を書いたsourceのdirectoryを基準に解決する、安全なPOSIX相対pathです。root直下のentry
sourceではproject root基準になります。次の値は使用できません。

- `/ocean.svg`のような絶対path
- `C:\ocean.svg`のようなWindows絶対pathやバックスラッシュ
- `./ocean.svg`、`../ocean.svg`のような`.`または`..` segment
- `https://example.com/ocean.svg`のようなURI

基準仕様では、builderがfileのbyte列を成果物へ埋め込み、実行環境からのネットワーク取得を不要にします。
Source Graphでは正規化後pathとsymlink実体の両方がproject root内であることをbyte列の読込前に確認します。

### eagerとlazy

名前付きアセットには`loading: eager`または`loading: lazy`を指定できます。省略時と短形式は
`eager`です。

- `eager`: 実行開始時に準備する
- `lazy`: 必要なシーンへの遷移が決まってから先読みし、シーン開始までに準備する

`lazy`でもアセット自体は配布成果物へ埋め込みます。scene開始時に準備が終わっていない場合は
Loading表示で待ち、準備に失敗した場合はそのsceneのアクションを開始せず診断を表示する設計です。
camera preview controlから参照する`image`はpreview開始時に必要なため、`loading: eager`だけを使用します。
`lazy`のcontrol画像参照は意味検証でエラーになります。

## アクターを登録する

`actors`では、アクターIDと初期コスチュームを対応付けます。

```yaml
assets:
  HeroIdle: costume:Hero
  HeroHappy: costume:Hero
  TurtleIdle: costume:Turtle

actors:
  Hero: HeroIdle
  Turtle: TurtleIdle
```

初期コスチュームは`costume`アセットであり、その`target`がアクターIDと一致している必要があります。
アクションでは`Hero.show`、`Turtle.say`のように、アクターIDと命令を`.`でつなぎます。

## 表紙、Loading、ポーズ認識とcamera previewを設定する

### 表紙

```yaml
cover:
  backdrop: Beach
  bgm: OpeningSound
```

`backdrop`は必須で、背景アセットを指定します。`bgm`は任意で、音アセットを指定します。

### Loading表示

```yaml
assets:
  LoadingBackground: backdrop
  Loading1: costume:Loading
  Loading2: costume:Loading

loading:
  backdrop: LoadingBackground
  costumes: [Loading1, Loading2]
```

`loading`を記述する場合は、背景と一つ以上のコスチュームが必要です。`costumes`は同じ意味の値の集合なので
YAML listで指定します。

### ポーズ認識音

```yaml
poseRecognition:
  idleSound: ClockTicking
  chargeSound: Success
```

`poseRecognition`を記述する場合は、認識待機中の`idleSound`と、認識成立時の`chargeSound`を
どちらも指定します。参照先は音アセットでなければなりません。

### camera previewの表示と操作UI

story全体の左右反転既定と、必要な操作UIを`poseRecognition.preview`へ記述します。

```yaml
assets:
  ShowMirroredButton:
    kind: image
    file: ui/show-mirrored.svg
    loading: eager
  ShowUnmirroredButton:
    kind: image
    file: ui/show-unmirrored.svg
    loading: eager
  CameraMenuButton:
    kind: image
    file: ui/select-camera.svg
    loading: eager

poseRecognition:
  idleSound: ClockTicking
  chargeSound: Success
  preview:
    mirroring: mirrored
    controls:
      mirroring:
        position: top-center
        opacity: 0.8
        assets:
          showMirrored: ShowMirroredButton
          showUnmirrored: ShowUnmirroredButton
      cameraMenu:
        position: bottom-center
        opacity: 0.8
        buttonAsset: CameraMenuButton
```

`mirroring`は`mirrored`または`unmirrored`で、省略時は従来表示と同じ`mirrored`です。これはpreview
canvasの見た目だけを変更し、認識へ渡すframe、pose confidence、sequence／selection判定を変更しません。

`controls`には左右反転buttonとcamera選択menuの一方または両方を記述します。配置は
`top-center`、`bottom-center`、`left-center`、`right-center`と四隅の8 anchor、`opacity`は0〜1です。
同じanchorでは左右反転button、camera menuの順に並びます。controlを省略した場合はUIを生成せず、
暗黙の標準iconも補いません。buttonには台本画像とは別にlocale対応の名前、focus表示、keyboard操作を
app shellが提供します。

camera menuは開くたびに利用可能な入力を列挙します。`default`、`front`、`back`と検出済みcameraを
選べますが、端末固有の物理device IDは台本、StoryDocument、`variables`へ保存しません。opaqueなIDと
UIの選択状態はapp shellがsession内だけで保持し、camera切替失敗時は以前のcameraと表示へ戻します。
起動時固定・既定OFFの`dsl4CameraPreviewControls`がOFFならcontrol画像、DOM、listener、上流camera APIへ
接続しません。

## SVG Textを設定する

DSL 4.0の標準テキスト表現はSVG Textです。最初に`textStyles`で名前付きスタイルを定義します。

```yaml
textStyles:
  title:
    background: '#112233'
    color: '#ffffff'
    font: Noto Sans JP
    size: 150
    align: center
    direction: up
```

| 項目         | 値                            |
| ------------ | ----------------------------- |
| `background` | 背景色を表す文字列            |
| `color`      | 文字色を表す文字列            |
| `font`       | 空でないフォント名            |
| `size`       | 0より大きい数値               |
| `align`      | `left`、`center`、`right`     |
| `direction`  | `up`、`down`、`left`、`right` |

アクター自身へテキストを表示するときは`setText`を使います。

```yaml
- Caption.setText:
    text: おしまい
    style: title
```

行形式のText Asset commandは4.0 core schemaにありません。`textStyles`と`Actor.setText`を使用してください。

## Speech styleを設定する

`Actor.say`と`Actor.think`で同じ文字送り演出を再利用するときは、トップレベルの`speechStyles`へ
名前付きstyleを定義します。

```yaml
speechStyles:
  novel:
    characterIntervalSeconds: 0.05
    characterSound: Typewriter
    noSoundCharacters: '「」'
    restCharacters: '、。…'
    restCharacterIntervalSeconds: 0.5
```

`characterIntervalSeconds`は必須で、Unicode grapheme cluster一つを表示してから次を表示するまでの秒数です。
`characterSound`は逐次表示した各文字で鳴らすsound asset、`noSoundCharacters`は文字音を鳴らさない文字、
`restCharacters`は無音にしたうえで表示後の間隔を`restCharacterIntervalSeconds`へ置き換える文字です。
`noSoundCharacters`を使う場合は`characterSound`、`restCharacters`を使う場合は
`restCharacterIntervalSeconds`も指定します。

styleには本文、完了条件、吹き出し開始時の音声を含めません。`text`、`seconds`、`waitFor`、
`startSound`はセリフごとにactionへ記述します。

## 変数と条件分岐を設定する

### 変数

```yaml
variables:
  score: 1
  takeSeaRoute: false
  playerName: ななし
```

初期値に使用できる型はstring、number、booleanだけです。list、mapping、`null`、式を初期値には
使用できません。実行中に値を変更する処理はruntimeまたは登録済みactionが担当し、宣言時の型と異なる値へ
暗黙変換しません。

`variables`は物語の意味を持つ値だけに使います。cameraの物理device ID、preview buttonの選択状態、
DOM node、listener、Object URLはapp shell所有の一時状態であり、story変数やScratch変数へ写さないでください。

### 分岐

分岐は上から順に条件を評価し、最初に真になった移動先を選びます。最後の規則は必ず`else`にします。

```yaml
branches:
  rescueResult:
    - if: 'score == 1'
      goto: seaRoute
    - if: takeSeaRoute
      goto: seaRoute
    - else: ending
```

条件式は文字列として記述します。`if`と`goto`は同じmappingへ書き、`else`は分岐内に一つだけ、末尾へ
置きます。すべての移動先シーンが定義済みでなければなりません。

シーンから分岐を実行します。

```yaml
- branch: rescueResult
```

条件式の評価器と利用できる演算は、利用するreleaseのDSL 4.0機能一覧で確認してください。

## 操作キーを設定する

`controls`では、development用とproduction用など、実行環境ごとに完全なkeymapを定義できます。

```yaml
controls:
  keymaps:
    development:
      Space: navigation.nextAction
      ArrowLeft: history.previousAction
      ArrowUp: history.previousScene
      ArrowDown: history.nextScene
    production:
      Space: navigation.nextAction
```

builderは`controlProfile`を明示的に一つ選び、選択されたprofileのkeymapだけを有効にする設計です。
profile間の継承、merge、fallbackはありません。

使用できるnavigation commandは次の4つです。

| command                  | 動作                                 |
| ------------------------ | ------------------------------------ |
| `navigation.nextAction`  | 通常実行として次のアクションへ進む   |
| `history.previousAction` | 実行履歴上の前のアクションへ移動する |
| `history.previousScene`  | 前に訪問したシーンの先頭へ移動する   |
| `history.nextScene`      | 次に訪問したシーンの先頭へ移動する   |

キー名には`KeyboardEvent.code`を使用します。`Space`、`Enter`、方向キー、`Digit0`〜`Digit9`、
`KeyA`〜`KeyZ`、`Numpad0`〜`Numpad9`、`F1`〜`F12`などがschemaで列挙されています。
`Shift+Space`のようなmodifierとの組み合わせは使用できません。

選択profileに`history.*`が一つでもある場合だけ、時系列historyを有効にします。history移動で実行位置は
変わりますが、物語の変数や表示状態を完全に巻き戻す機能ではありません。同じ物理キーを`controls`と
作品内の`keyInputToChangeScene`へ重ねて割り当てないでください。

## シーンを書く

### 短形式

シーン固有の設定が不要なら、アクション列を直接書きます。

```yaml
scenes:
  opening:
    - stage: Beach
    - wait: 1
```

### 長形式

ポーズモデルなどのシーン固有設定がある場合は、`actions`を持つmappingにします。

```yaml
scenes:
  rescue:
    poseModel: 救助Pose
    posePreview:
      mirroring: unmirrored
    actions:
      - stage: Ocean
      - Hero.pose:
          steps:
            - pose: help
              skin: HeroHelp
              sound: Success
```

長形式では`actions`が必須です。`poseModel`、`posePreview`とアクションを同じ階層へ混在させず、
アクションは必ず`actions`のlistへ入れます。`posePreview.mirroring`はそのsceneだけの上書きです。次に入る
sceneへ指定がなければstory既定へ戻り、前sceneの値を持ち越しません。短形式と長形式は、検証後に同じ
内部の`SceneNode`へ正規化されます。

## Global action

Global actionはアクター名を付けずに記述します。

| action                    | 短形式または主な引数          | 役割                       |
| ------------------------- | ----------------------------- | -------------------------- |
| `stage`                   | 背景ID                        | 背景を変更する             |
| `bgm`                     | 音ID                          | BGMの再生を依頼する        |
| `sound`                   | 音ID                          | 効果音の再生を依頼する     |
| `wait`                    | 0以上の秒数                   | 指定時間待つ               |
| `transition`              | `effect`、`seconds`           | 見た目の遷移効果を実行する |
| `goto`                    | シーンID                      | 指定シーンへ移動する       |
| `branch`                  | 分岐ID                        | 条件分岐を評価して移動する |
| `keyInputToChangeScene`   | キーからシーンへのmapping     | キー入力を待って移動する   |
| `touchInputToChangeScene` | アクターからシーンへのmapping | タッチ入力を待って移動する |

### 背景、音、待機

```yaml
- stage: Beach
- bgm: OpeningSound
- sound: Success
- wait: 1.5
```

`wait`は0以上です。背景と音のIDは、使用箇所に合う`kind`のアセットを参照します。

### 画面効果

```yaml
- transition:
    effect: fadeOut
    seconds: 0.5
```

`transition`は見た目の効果だけを実行し、シーンを移動しません。移動が必要なら、次に`goto`または
`branch`を書きます。`effect`は識別子であり、実際に利用できる効果名はTurboWarp接続側の実装契約で
確定します。

### シーン移動

```yaml
- goto: ending
- branch: rescueResult
```

参照するシーンまたは分岐は、同じ台本内で定義済みでなければなりません。

### キー入力による移動

```yaml
- keyInputToChangeScene:
    Digit1: rescue
    Digit2: ending
```

`stableId`を付ける場合は、経路を`routes`の下へ移します。

```yaml
- keyInputToChangeScene:
    stableId: routeSelection
    routes:
      Digit1: rescue
      Digit2: ending
```

### タッチ入力による移動

```yaml
- touchInputToChangeScene:
    Hero: rescue
    Caption: ending
```

左側には登録済みアクター、右側には登録済みシーンを指定します。

## Actor action

Actor actionは`ActorID.command`をキーにします。

| action                     | 必須引数                                 | 役割                                       |
| -------------------------- | ---------------------------------------- | ------------------------------------------ |
| `Actor.show`               | `skin`、`x`、`y`、`scale`                | コスチューム、位置、倍率を指定して表示する |
| `Actor.setTransparency`    | 0〜100または`from`、`to`、`seconds`      | 幽霊効果を即時設定または線形に変化させる   |
| `Actor.moveTo`             | `x`、`y`、`seconds`                      | 任意のeasingで指定位置へ移動する           |
| `Actor.say`／`Actor.think` | `text`と、`seconds`／`waitFor`の一方以上 | セリフまたは思考を表示する                 |
| `Actor.setSkin`            | コスチュームID                           | コスチュームを変更する                     |
| `Actor.setText`            | `text`、`style`                          | SVG Textを更新する                         |
| `Actor.pose`               | `steps`                                  | ポーズを順に認識してcostumeと音を適用する  |

### 表示する

```yaml
- Hero.show:
    skin: HeroHappy
    x: 0
    y: -60
    scale: 30
```

`scale`は0より大きい数値です。`skin`は、そのアクターを`target`とするコスチュームアセットを
指定します。

### 透明度を変える

即時設定では0〜100の数値を直接指定できます。

```yaml
- Hero.setTransparency: 50
```

`0`は完全不透明、`50`はScratch／TurboWarpの「幽霊の効果を50にする」、`100`は完全透明です。
値の反転や換算は行いません。`stableId`を付ける場合は名前付きの`transparency`形式を使います。

```yaml
- Hero.setTransparency:
    stableId: heroHalfTransparent
    transparency: 50
```

`from`、`to`、`seconds`を指定すると、透明度を線形に変化させます。

```yaml
- Hero.setTransparency:
    from: 0
    to: 50
    seconds: 1
    background: true
```

`background`を省略するか`false`にすると完了まで待ち、`true`では`from`を同期適用した直後に
次actionへ進みます。途中でskip、停止、再開始、破棄された場合や、同じactorへ次の透明度変化を始める場合は、
先の変化を`to`へ確定してtimerを回収します。

### 移動する

```yaml
- Hero.moveTo:
    x: 40
    y: -57
    seconds: 1.5
    easing: easeInOut
```

`seconds`は0以上です。`easing`は`linear`、`easeIn`、`easeOut`、`easeInOut`から選び、省略時は
`linear`です。XとYへ同じ補間率を使い、0秒、完了、skip時は指定した終点へ確定します。

### セリフと思考を表示する

```yaml
- Hero.say:
    text: 助けに行こう
    seconds: 8
    waitFor: advance
    style: novel
    startSound: HeroGreetingVoice
- Hero.think:
    text: どうしよう……
    waitFor: advance
    characterIntervalSeconds: 0.1
    characterSound: Typewriter
```

`seconds`だけなら表示開始から指定秒数後、`waitFor: advance`だけならprimary pointer／tapまたは有効な
任意キーの入力後に完了します。両方を指定すると、入力とtimeoutのうち先に成立した方で完了します。
speech開始に使った同じ入力、interactive UI、IME composition、modifier shortcut、key repeatは
advanceとして再利用しません。

`style`には`speechStyles`のIDを指定します。styleを指定したactionでは、
`characterIntervalSeconds`、`characterSound`、`noSoundCharacters`、`restCharacters`、
`restCharacterIntervalSeconds`をinline指定できません。styleを使わない既存のinline形式は引き続き使えます。

`startSound`は吹き出し表示開始時に1回再生し、speech完了、入力、timeout、cancelで停止します。
文字送り途中に入力またはtimeoutした場合は、残り全文を文字音と文字別休止なしで即時表示して完了します。
`Actor.say`と`Actor.think`は同じlifecycleを使い、吹き出しの種類だけが異なります。

### コスチュームを変える

```yaml
- Hero.setSkin: HeroHelp
```

`stableId`を付ける場合は名前付き形式を使用します。

```yaml
- Hero.setSkin:
    stableId: heroRescueSkin
    skin: HeroHelp
```

### SVG Textを更新する

```yaml
- Caption.setText:
    text: おしまい
    style: title
```

### ポーズを認識する

```yaml
- Hero.pose:
    steps:
      - pose: help
        skin: HeroHelp
        sound: Success
      - pose: jump
        skin: HeroHappy
        sound: Success
```

`steps`は一つ以上必要です。各項目は、順に認識する`pose`、認識後に表示する`skin`、再生する`sound`を
一組として持ちます。シーン側の長形式で`poseModel`も指定してください。

## stableIdを付ける

`stableId`は、台本のlive reloadで変更前後の同じアクションを特定するための任意IDです。通常の台本で
すべてのアクションへ付ける必要はありません。付ける場合は文書全体で一意にします。

```yaml
- wait:
    stableId: waitBeforeEnding
    seconds: 1
```

`stableId`は名前付きmappingにだけ指定できます。`wait: 1`のようなscalar短形式へ追加することは
できません。

## Web Previewで変更をlive reloadする

Issue #390のWeb Previewでは、対応browserで「プロジェクトを開く」を押し、project rootをread-onlyで
選択します。Web Previewに組込みeditorはなく、YAMLとassetは任意の外部editorで変更します。選択した
directory handleはsession中だけ保持し、YAML、manifest、SB3、user設定へ保存しません。

最初の正常なYAMLはreload選択を挟まず先頭から開始します。その後に`story.k4.yml`を保存すると、
Web Previewはpollingで変更を検出し、書込み途中ではない安定したsnapshotをparse／validateします。正常な
candidateだけが次の再開位置の選択へ進みます。

1. 先頭から
2. 現在のsceneから
3. 現在のactionから

現在のactionから再開できるかは、actionが一意でreplay-safeかなどの条件で決まります。`stableId`は
変更前後の同じactionを特定しやすくしますが、すべてのactionへ付ける必要はありません。YAMLが不正、
missing、unstableの場合は現在実行中のimmutable snapshotを置き換えず、診断を表示して次の保存を待ちます。
pageがbackgroundの場合はbrowserのtimer制限により検出が遅れることがあります。

### Local assetの追加と内容更新

Issue #391の候補仕様では、`backdrop`、`costume`、`sound`、`poseModel`について次をlive reload対象に
します。

- 既存asset ID、kind、pathを維持したままfile内容だけを更新する
- 新しい一意なasset IDとlocal file／pose model bundleを追加し、同じcandidate YAMLから参照する

新しいfileを先に置いても、YAMLを先に保存してもかまいません。両方が揃ってstableになり、source、
asset graph、file内容、参照関係の検証がすべて成功した場合だけ、一つのimmutable candidateとして
transactionalにcommitします。途中のfile、pose model bundleの一部、検証に失敗したassetだけを部分反映
しません。未参照fileは無視し、project root全体を再帰走査せず、activeまたはcandidate YAMLが宣言した
exact pathだけを読みます。

次の変更は同じlive reloadへ混ぜず、full rebuildの対象です。

- 既存asset IDの削除／rename
- 既存assetのkind／path変更
- 既存pose modelのbundle構成変更
- base SB3、app shell、extension、builder設定、control profileの変更

### TurboWarp Editor内のproject asset

`HeroHappy: costume:Hero`のような短形式や、`name`を使うassetはlocal fileではなく、base SB3内の
project assetを参照します。同一TurboWarp Editor／同一VMで既存costumeを編集した場合は、同じrenderer
skinの更新として実行中表示へ即時反映されることがあります。これはWeb Previewのtransactional asset
candidateではなく、reload dialog、safe boundary、rollbackの対象にもなりません。

costumeの削除後の同名追加、import、renameによる自動再bindは保証しません。別Editor／別VMで保存した
base SB3も実行中VMへ自動反映されず、full rebuildが必要です。YAML保存と同時期にproject costumeを編集しても、
両者を一つのtransactionへ束ねるatomicityは保証しません。

production用にbuildした自己完結SB3には、directory handle、poll timer、candidate、reload dialog状態を
含めません。watchとlive reloadはdevelopment previewだけの機能です。

## 総合サンプル

次の例は、アセット、表紙、SVG Text、speech style、変数、keymap、分岐、入力、ポーズ認識を一つの台本へ
まとめたものです。利用するreleaseでDSL 4.0と必要なfeature flagを有効にして実行します。

```yaml
kamishibai: '4.0'

assets:
  Beach: backdrop
  Ocean:
    kind: backdrop
    file: ocean.svg
    loading: lazy
  HeroIdle: costume:Hero
  HeroHappy: costume:Hero
  HeroHelp: costume:Hero
  CaptionIdle: costume:Caption
  OpeningSound: sound
  ClockTicking: sound
  Success: sound
  Typewriter: sound
  HeroGreetingVoice: sound
  HeroThinkingVoice: sound
  ShowMirroredButton:
    kind: image
    file: show-mirrored.svg
    loading: eager
  ShowUnmirroredButton:
    kind: image
    file: show-unmirrored.svg
    loading: eager
  CameraMenuButton:
    kind: image
    file: select-camera.svg
    loading: eager
  救助Pose:
    kind: poseModel
    file: rescue-pose
    loading: lazy

actors:
  Hero: HeroIdle
  Caption: CaptionIdle

cover:
  backdrop: Beach
  bgm: OpeningSound

textStyles:
  title:
    background: '#112233'
    color: '#ffffff'
    font: Noto Sans JP
    size: 150
    align: center
    direction: up

speechStyles:
  novel:
    characterIntervalSeconds: 0.05
    characterSound: Typewriter
    noSoundCharacters: '「」'
    restCharacters: '、。…'
    restCharacterIntervalSeconds: 0.5

variables:
  score: 1
  takeSeaRoute: false

poseRecognition:
  idleSound: ClockTicking
  chargeSound: Success
  preview:
    mirroring: mirrored
    controls:
      mirroring:
        position: top-center
        opacity: 0.8
        assets:
          showMirrored: ShowMirroredButton
          showUnmirrored: ShowUnmirroredButton
      cameraMenu:
        position: bottom-center
        opacity: 0.8
        buttonAsset: CameraMenuButton

controls:
  keymaps:
    development:
      Space: navigation.nextAction
      ArrowLeft: history.previousAction
      ArrowUp: history.previousScene
      ArrowDown: history.nextScene
    production:
      Space: navigation.nextAction

branches:
  rescueResult:
    - if: 'score == 1'
      goto: seaRoute
    - if: takeSeaRoute
      goto: seaRoute
    - else: ending

scenes:
  opening:
    - stage: Beach
    - bgm: OpeningSound
    - Caption.setText:
        stableId: openingTitle
        text: |-
          海へ出発！
          1か2を押してください
        style: title
    - Hero.show:
        skin: HeroHappy
        x: 0
        y: -60
        scale: 30
    - Hero.setTransparency:
        from: 100
        to: 0
        seconds: 0.5
    - Hero.say:
        text: 助けに行こう
        seconds: 8
        waitFor: advance
        style: novel
        startSound: HeroGreetingVoice
    - keyInputToChangeScene:
        Digit1: rescue
        Digit2: ending

  rescue:
    poseModel: 救助Pose
    posePreview:
      mirroring: unmirrored
    actions:
      - stage: Ocean
      - Hero.setSkin: HeroHelp
      - Hero.pose:
          steps:
            - pose: help
              skin: HeroHelp
              sound: Success
            - pose: jump
              skin: HeroHappy
              sound: Success
      - branch: rescueResult

  seaRoute:
    - Hero.moveTo:
        x: 40
        y: -57
        seconds: 1.5
        easing: easeInOut
    - Hero.think:
        text: 海路で帰ろう……
        waitFor: advance
        startSound: HeroThinkingVoice
    - transition:
        effect: fadeOut
        seconds: 0.5
    - goto: ending

  ending:
    - stage: Beach
    - Caption.setText:
        text: おしまい
        style: title
```

## 診断と安全停止

DSL 4.0のsource frontendは、YAMLを読み込んだあと、構造と参照関係の検証が成功するまでアセット準備や
アクション実行を始めません。診断にはcode、severity、source ID、行・列、Story Pathが含まれます。

| code                          | 主な意味                                      |
| ----------------------------- | --------------------------------------------- |
| `K4-YAML-*`                   | YAML構文または禁止機能の使用                  |
| `K4-VERSION-001`              | `kamishibai`が文字列`'4.0'`ではない           |
| `K4-SCHEMA-001`               | 型、必須field、構造がschemaと一致しない       |
| `K4-SCHEMA-UNKNOWN-KEY`       | schemaにないキーを使用した                    |
| `K4-ID-INVALID` / `K4-ID-001` | 識別子の文字規則またはUnicode NFC違反         |
| `K4-REF-001`                  | 参照先が未定義                                |
| `K4-REF-002`                  | 参照先アセットの`kind`が用途と一致しない      |
| `K4-REF-003`                  | コスチュームの`target`がアクターと一致しない  |
| `K4-ASSET-001`                | `file`が安全なローカル相対pathではない        |
| `K4-BRANCH-001`               | 分岐の末尾が`else`ではない                    |
| `K4-STABLE-ID-001`            | `stableId`が文書内で重複している              |
| `K4-KEY-UNSUPPORTED`          | 対応外のキーやmodifierを指定した              |
| `K4-KEY-001`                  | navigation keymapと作品内キー入力が衝突した   |
| `K4-INCLUDE-CYCLE`            | include graphに循環がある                     |
| `K4-INCLUDE-LIMIT-001`        | source件数、合計byte数、include深度の上限超過 |
| `K4-SOURCE-SIZE-001`          | source一件のbyte数が上限を超えた              |
| `K4-DECLARATION-DUPLICATE`    | Source Graph内で同じ宣言が重複した            |

runtime接続後は、action、scene、branch、port、戻り値などの実行時エラーにも`K4-RUNTIME-*`診断を
使用します。入力byte数、YAML node数、nesting深度、scalar長、シーン数、アクション数、アセット数、
診断数には安全上の有限上限があります。Source Graphの各上限はpreview／buildのCLI引数とhost設定で明示し、
一件のsourceとgraph合計／compose後sourceを別の責務として検証します。

## 作成時のチェックリスト

- [ ] ファイルをUTF-8で保存し、新規sourceでは`.k4.yml`を使用した
- [ ] 先頭が`kamishibai: '4.0'`になっている
- [ ] トップレベルとactionに未知のキーがない
- [ ] インデントに空白を使い、一つのaction itemへ命令を一つだけ書いた
- [ ] IDが文字または`_`で始まり、Unicode NFCになっている
- [ ] 背景、音、コスチューム、ポーズモデルの`kind`が参照箇所と一致している
- [ ] コスチュームの`target`が使用するアクターと一致している
- [ ] `file`が宣言元sourceからproject内へ解決できる安全な相対pathになっている
- [ ] `include`にcycle、root外path、同じnamespaceの重複宣言がない
- [ ] すべてのシーン、分岐、スタイル、アセット参照が定義済みである
- [ ] 各分岐の最後に一つだけ`else`がある
- [ ] `stableId`が文書全体で重複していない
- [ ] navigation用キーと作品内の遷移キーが衝突していない
- [ ] YAML以外の行形式commandを混在させていない
- [ ] 利用するreleaseでDSL 4.0と必要なfeature flagが有効であることを確認した

## 関連資料

- [紙芝居DSL 4.0 Schemaリファレンス](dsl-4.0-schema-reference.md): 固定Schemaに基づくfield、型、制約、action一覧
- [DSL 4.0表層仕様](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/docs/design/dsl-4-surface.md): 4.0の規範的な作者向け構文
- [DSL 4.0 JSON Schema](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/schema/dsl-4.schema.json): 機械可読な構造仕様
- [DSL 4.0 Source Graph Preview](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/docs/design/dsl-4-source-include-preview.md): include、transaction、有限上限、rollback
- [DSL 4.0総合fixture](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/test/fixtures/dsl4/valid/comprehensive.kamishibai.yaml): schemaと意味検証を通る総合例
