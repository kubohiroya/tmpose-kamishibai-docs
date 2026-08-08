# 紙芝居DSL 3.2から4.0への変換ガイド

Copyright © 2026 Hiroya Kubo. この文書は[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)で提供します。

対象: DSL 3.1／3.2の既存台本をDSL 4.0へ移行する方\
対象コマンド: `tmpose-kamishibai convert-dsl4`\
文書状態: 固定実装基準を説明する変換ガイド（正式リリースの操作資料ではない）\
調査基準: tmpose-kamishibai `82dc812`、2026年8月8日

> **配布状態との区別:** 2026年8月8日時点で`v4.0.0`は正式リリースされていません。
> `convert-dsl4`を含むpackage releaseを使用し、利用中のpackageで`pnpm exec tmpose-kamishibai --help`を
> 実行して、コマンド一覧に`convert-dsl4`があることを確認してください。

`convert-dsl4`は、行形式のDSL 3.2台本を、DSL 4.0のYAML台本へ明示的に変換するone-shot
commandです。DSL 3.1は3.2互換grammarとして読み込み、warningを出します。

変換元は変更しません。変換に成功した場合だけ出力をatomicに作成または置換し、error時は途中までの
YAMLを残さず既存出力を維持します。まず元作品とは別の出力名を指定し、warningと実行結果を確認してください。

## このガイドの位置づけ

このガイドは、DSL 3.1／3.2の文法を説明し直す資料でも、4.0の全fieldを説明する資料でもありません。
既存TXT台本を安全にYAMLへ変換し、4.0作者向けの作業へ引き渡すところまでを扱います。

<figure class="concept-flow"><figcaption>既存作品を4.0の制作経路へ引き渡す</figcaption><div class="concept-flow__track"><span>3.1／3.2 TXT<br>元fileを保持</span><b aria-hidden="true">→</b><span>convert-dsl4<br>別fileへ変換</span><b aria-hidden="true">→</b><span>4.0 YAML<br>warningを確認</span><b aria-hidden="true">→</b><span>台本作成ガイドで構造確認</span><b aria-hidden="true">→</b><span>validate・preview・build</span></div><p class="concept-flow__note"><strong>変換または検証に失敗した場合:</strong> 元fileを変更せず、診断に対応する入力または生成YAMLを修正します。</p></figure>

変換前は本書の「自動変換を停止する入力」まで確認し、変換後は
[紙芝居DSL 4.0 台本作成ガイド](dsl-4.0-author-guide.md)の最小台本、project配置、診断の順に読みます。
型や必須性を調べるときだけSchemaリファレンスを使用します。

## 基本コマンド

packageを導入したprojectのdirectoryで実行します。

```bash
pnpm exec tmpose-kamishibai convert-dsl4 \
  --input source.txt \
  --output story.k4.yml \
  --pose-models pose-models.json
```

ポーズ認識を使わない台本では`--pose-models`を省略できます。

```bash
pnpm exec tmpose-kamishibai convert-dsl4 \
  --input source.txt \
  --output story.k4.yml
```

| option               | 必須 | 内容                                                               |
| -------------------- | ---- | ------------------------------------------------------------------ |
| `--input FILE`       | 必須 | UTF-8のDSL 3.1／3.2台本。BOM、CRLF、CRは読み込み時に正規化します。 |
| `--output FILE`      | 必須 | 生成するDSL 4.0 YAML。入力と同じpathは指定できません。             |
| `--pose-models FILE` | 任意 | `TMPoseURL`とlocal pose model assetの対応を記述したJSON fileです。 |

相対pathはcommandを実行したdirectoryから解決されます。新しいDSL 4.0 sourceには短い`.k4.yml` suffixを
推奨しますが、互換suffixの`.k4.yaml`、`.kamishibai.yml`、`.kamishibai.yaml`も使用できます。

## ポーズモデルを置き換える

DSL 3.1／3.2の`TMPoseURL`だけでは、取得するbyte列とcontent typeを固定できません。ポーズ認識を使う
台本では、URLとproject内のlocal `poseModel` assetをJSONで対応付けます。keyは台本に書かれた
`TMPoseURL`との完全一致です。

```json
{
  "https://example.com/models/rescue/": {
    "id": "RescuePose",
    "file": "rescue-pose",
    "loading": "lazy"
  }
}
```

- `id`はDSL 4.0のasset IDです。Unicode NFCの有効な識別子を指定します。
- `file`はproject root基準の安全なPOSIX相対pathです。絶対path、URI、backslash、`.`／`..` segmentは
  使用できません。
- `loading`は`eager`または`lazy`です。省略できます。
- converterはURLを取得せず、指定したlocal pathだけを生成YAMLへ記録します。

sceneで`Actor:pose`を使っているのに、対応する`TMPoseURL`または完全一致の置換がない場合はerrorです。
3.1／3.2の`Actor:pose`は候補から1件を選ぶactionではありません。converterはpose名の順にすべて成立させる
`Actor.pose.steps`へ変換します。pose数より少ないskin／soundは省略し、余分な要素はwarning付きで除外します。

Async Inputで候補から1件を選ぶ処理は、3.1／3.2テキストDSLのactionではなくSB3のblock graph側の
機能です。converterはこの処理を推測せず、`poseInputToChangeScene`を生成しません。

headerの`poseRecog`は`sequence.confidenceThreshold`へ変換します。旧runtimeは0.1秒ごとに100を目標として
`confidence × poseCharge`を加えるため、`poseCharge`は
`sequence.fullConfidenceHoldSeconds = 10 / poseCharge`へ変換します。`poseIdle=0`は変換できますが、
非zero値は旧runtimeだけがconfidenceを乗算するためerrorです。

## リモートアセットの扱い

DSL 4.0自体は、`delivery: remote`と`source.url`、`integrity`、`contentType`、`size`をすべて明示する
検証付きリモートアセットに対応します。一方、converterは3.1／3.2のremote／cache assetや
`TMPoseURL`を自動でリモートアセットへ変換しません。旧台本だけではDSL 4.0が必須とするSHA-256、MIME
type、byte sizeを確定できず、network取得やcache lookupを変換処理へ持ち込まないためです。

リモート配信が必要な場合は、次のどちらかで移行します。

1. 作業用の3.2台本とpose model置換をlocal assetへ向けて変換し、生成YAMLを確認する。
2. 生成YAMLの対象assetを、[Schemaリファレンスのremote asset source](dsl-4.0-schema-reference.md#remote-asset-source)に
   従って検証情報付きの`delivery: remote`へ手動で変更する。

元の3.2台本は保存し、変更後のYAMLを必ず`validate-dsl4`とpreviewで確認してください。

## 変換される内容

converterは、次の構造をDSL 4.0に対応する形へ変換します。

- backdrop、costume、sound、actor
- cover、runtime variable、Loading表示、ポーズ認識音
- SVG Text style、branch、scene
- DSL 4.0 coreに対応するglobal actionとactor action

次のように意味を決める必要がある変換は、元ファイルの行・列と安定した診断codeを含むwarningを
標準エラー出力へ表示します。

- DSL 3.1を3.2互換grammarとして解釈した場合
- runtime variableのscalar型を推論した場合
- costumeをlogical actorへ付け替えた場合
- 旧DSLに秒数指定がないtransitionを0秒として明示した場合

対応表と各診断の分類は、実装リポジトリの
[DSL 3.1／3.2からDSL 4.0への移行仕様](https://github.com/kubohiroya/tmpose-kamishibai/blob/82dc812ce42a11e1e1c398bed6d56d8baa660b12/docs/design/dsl-4-migration.md)を
参照してください。

## 自動変換を停止する入力

意味を保てない入力ではerrorを返し、YAMLを部分出力しません。主な例は次のとおりです。

- 旧Text Asset、検証情報を確定できないremote／cache asset
- 秒数なしの永続`say`／`think`、style付き`say`／`think`、`hide`など同じ意味を保証できないaction
- 4.0で必須のcharge soundがないpose recognition設定
- local model置換がない`TMPoseURL`、空のpose名
- 要素数が異なるbranch／key／touch inputのparallel list、最後の無条件遷移がないbranch
- scene内の`setRuntimeVariable`、1以外の`startSceneIndex`
- 非zeroの`poseIdle`、独自action、不正なarity、曖昧なcolon区切り

旧Text Assetは、[DSL 4.0移行仕様の手動移行例](https://github.com/kubohiroya/tmpose-kamishibai/blob/82dc812ce42a11e1e1c398bed6d56d8baa660b12/docs/design/dsl-4-migration.md#5-%E6%97%A7text-asset%E3%81%8B%E3%82%89svg-text%E3%81%B8%E3%81%AE%E6%89%8B%E5%8B%95%E7%A7%BB%E8%A1%8C)に
従ってSVG Text actorへ移します。custom Scratch blockやSB3のblock graphは入力台本から推測せず、
converterもblockを生成・変更しません。

## 診断と終了status

正常時は生成先を標準出力へ表示します。warningとerrorは標準エラー出力へ
`source:line:column: severity [code] message`形式で表示します。

```text
Converted /project/story.k4.yml
```

```text
/project/source.txt:2:1: warning [K4-CONVERT-VARIABLE-TYPE] ...
```

| status | 意味                                                    |
| ------ | ------------------------------------------------------- |
| `0`    | 変換成功。warningがある場合も生成YAMLを出力します。     |
| `1`    | 変換error。新規出力を作らず、既存出力を変更しません。   |
| `2`    | option不足、未知optionなどcommandの使用方法が不正です。 |

## 変換後に確認する

生成YAMLをproductionと同じfrontendで検証します。`--max-source-bytes`には作品で許容する有限上限を
指定してください。

```bash
pnpm exec tmpose-kamishibai validate-dsl4 \
  --input story.k4.yml \
  --max-source-bytes 1048576 \
  --format pretty
```

次に[紙芝居DSL 4.0 台本作成ガイド](dsl-4.0-author-guide.md)に従ってprojectを配置し、previewで
scene遷移、表示、音、ポーズ認識、作品固有blockとの関係を確認します。問題があれば生成YAMLと4.0成果物だけを
破棄し、元台本を3.2 runtimeで継続できます。

## JavaScript API

副作用なしで文字列を変換する場合は、package exportを使用します。

```js
import {convertDsl32ToDsl4} from '@kubohiroya/tmpose-kamishibai/converter';

const result = convertDsl32ToDsl4(sourceText, {
  sourceId: 'source.txt',
  poseModels,
});

if (result.ok) {
  console.log(result.yaml);
} else {
  console.error(result.diagnostics);
}
```

`convertDsl32ToDsl4`はfile I/Oを行わず、`ok`、正規化した`source`、変換後の`document`／`yaml`、
`diagnostics`を返します。fileをatomicに変換するAPIが必要な場合は、同じexportの
`convertDsl32File({inputPath, outputPath, poseModelMapPath})`を使用します。

## 関連資料

- [紙芝居DSL 4.0 台本作成ガイド](dsl-4.0-author-guide.md): 変換後のproject配置、preview、build、実行確認
- [紙芝居DSL 4.0 Schemaリファレンス](dsl-4.0-schema-reference.md): field、型、remote assetを含む制約
- [DSL 3.1／3.2からDSL 4.0への移行仕様](https://github.com/kubohiroya/tmpose-kamishibai/blob/82dc812ce42a11e1e1c398bed6d56d8baa660b12/docs/design/dsl-4-migration.md): 対応表、診断分類、rollback境界
- [`convert-dsl4`実装Issue #276](https://github.com/kubohiroya/tmpose-kamishibai/issues/276): CLIとpure APIの受け入れ条件
