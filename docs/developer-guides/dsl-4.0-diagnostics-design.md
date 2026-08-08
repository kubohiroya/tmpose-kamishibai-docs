# DSL 4.0 台本診断・安全停止 設計レビュー

Copyright © 2026 Hiroya Kubo. この文書は[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)で提供します。

この文書は、DSL 4.0のYAML読込からproduction実行まで、失敗をどこで分類し、どの状態をcommitせず、
どのresourceを停止・解放するかを実装からレビューできるようにまとめたものです。対象となる完成実装は
`kubohiroya/tmpose-kamishibai`のcommit
[`79457815f5c89b181b1a879a079a4d6a72d405ed`](https://github.com/kubohiroya/tmpose-kamishibai/commit/79457815f5c89b181b1a879a079a4d6a72d405ed)
です。本文のpath、関数、code、event、testはこのcommitで確認しています。

対象アプリ: tmpose-kamishibai 4.0.x

受理するDSL宣言: `kamishibai: '4.0'`

## 読む前に

本書は4.0文書群のうち、正常経路を理解した後に読む失敗経路の詳細資料です。先に
[内部仕様書](internal-specification-4.0.md)で`StoryDocument`、generation、commit、rollbackを確認し、
[機能拡張・プラットフォーム統合ガイド](extension-guide-4.0.md)でportとadapterの所有関係を確認してください。

読む順序は「レビュー結論 → commit gate → diagnostic形式 → 段階別の失敗 → cleanup・表示」です。
特定の診断codeだけを調べる場合でも、先にcommit gateの表で、その失敗が起きる段階と維持すべき状態を
確認します。

## 文書の位置付け

既存の[DSL 3.1 台本診断・安全停止 設計レビュー](dsl-3.1-diagnostics-design.md)は、Scratch parserの前へ
JavaScriptの限定preflightを追加し、最初のfatal error一件を表示する3.1専用の履歴文書です。本書はその設計を
更新・置換しません。4.0ではYAML source frontendがparse、Schema、semantic validation、
`StoryDocument`生成までを正本として担当し、複数診断、immutable generation、platform portを使用します。

次の3.1契約は4.0へ持ち込みません。

- `key=value`を物理行ごとにscanする`dsl31Contract`
- Scratch parserとJavaScript preflightの二重検証
- `fatal`固定、`K31-*` code、`phase`、`messageKey`、`source.text`
- `featureDetailedScriptErrors`と`runtime.stopAll()`中心の停止順序
- `prompt` spriteへ直接適用する3.1専用SVG presenter

4.0の正本は`src/dsl4/source-frontend.js`、`diagnostic-sequence-policy.js`、`StoryDocument`、
runtime controller、platform adapter、preview transactionです。

## レビュー結論

固定commitの失敗境界は、次の原則で整合しています。

1. parse、Schema、semantic errorが一件でもあれば、部分的な`StoryDocument`を返さない。
2. `error` diagnosticを含むcandidateはstage可能とせず、runtimeやassetへ副作用を起こさない。
3. previewのinvalid sourceはcurrent runtimeを停止せず、candidateと診断だけを置き換える。
4. asset candidateはprepareとactivateを分離し、acknowledgement後まで旧generationを解放しない。
5. runtime failureは現在actionをabortし、stale completionをgeneration guardで無効化する。
6. platform environmentは部分生成、startup拒否、通常disposeのすべてで所有resourceの解放を試みる。
7. author surfaceへ渡す情報と、内部`Error.cause`／`AggregateError`を分離する。
8. Browser／CLI Previewだけがlive reload UIを持ち、production SB3へpreview状態を保存しない。

一方、固定commitには二種類の診断契約があります。source frontend、runtime、CLI／editor projectionで使う
canonical diagnostic v1と、asset transaction、navigation、reload状態が内部表示へ渡すlifecycle diagnosticです。
後者へcanonical diagnosticに存在しないfieldを補って同一形式だと扱ってはいけません。

次図は、candidateをcurrent generationへ切り替えるまでの安全判断を単純化したものです。

<figure class="concept-flow"><figcaption>candidateを公開するまでのcommit gate</figcaption><div class="concept-flow__track"><span>candidate source・asset</span><b aria-hidden="true">→</b><span>validate</span><b aria-hidden="true">→</b><span>prepare・quiesce</span><b aria-hidden="true">→</b><span>activate</span><b aria-hidden="true">→</b><span>commit</span><b aria-hidden="true">→</b><span>旧generationをdispose</span></div><p class="concept-flow__note"><strong>validate失敗:</strong> 診断を表示してcurrentを維持。<strong>activate失敗:</strong> candidateをrollback・releaseしてcurrentを維持。<strong>runtime失敗:</strong> actionをabortして安全停止。</p></figure>

## 失敗経路とcommit gate

主要な呼出し方向と、失敗時に公開してはならない状態を次に示します。

| 段階                   | 主要path・関数                                                      | 成功時に初めて公開するもの                     | 失敗時に維持・破棄するもの                                | 確認test                                                  |
| ---------------------- | ------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| 単一source検証         | `source-frontend.js`、`createDsl4SourceFrontend()`                  | immutable `StoryDocument`                      | `StoryDocument`を返さずcanonical diagnosticsだけを返す    | `dsl4-schema.test.mjs`、`dsl4-source-limits.test.mjs`     |
| Source Graph discovery | `source-graph.js`、`createDsl4SourceGraph()`                        | acyclicで有限なimmutable graph                 | asset、runtimeを作らずgraph構成を中止                     | `dsl4-source-graph.test.mjs`                              |
| 複数source compose     | `source-graph-frontend.js`、`createDsl4SourceGraphFrontend()`       | origin付き`StoryDocument`                      | fragment単位の位置を保った診断だけを返す                  | `dsl4-source-graph-frontend.test.mjs`                     |
| source live reload     | `live-reload-session.js`、`createDsl4LiveReloadSession()`           | authorが選んだrestart位置のnext session        | invalid candidateを捨て、current sessionを継続            | `dsl4-live-reload-session.test.mjs`                       |
| asset live reload      | `asset-reload-transaction.js`、`createDsl4AssetReloadTransaction()` | activate・adapter accept済みgeneration         | candidateをrollback／releaseし、旧active generationを継続 | `dsl4-asset-reload-transaction.test.mjs`                  |
| runtime execution      | `runtime-controller.js`、`createDsl4RuntimeController()`            | `action.commit`、`scene.transition`            | actionをabortし`failed`へ移り、stale completionを無視     | `dsl4-runtime-controller.test.mjs`                        |
| TurboWarp composition  | `platform/turbowarp-runtime-host.js`                                | 完全なport、asset lifecycle、input composition | 部分生成resourceを全てcleanupし、hostを公開しない         | `dsl4-turbowarp-runtime-host.test.mjs`                    |
| production SB3 build   | `builder/dsl4-build-output.js`、`installBundleTransactionally()`    | 再検証済みcandidate SB3                        | 既存出力を維持し、candidate directoryを削除               | `dsl4-build-cli.test.mjs`、`dsl4-one-shot-build.test.mjs` |

## Canonical diagnostic v1

### 厳密なenvelope

`normalizeDsl4DiagnosticSequence()`が受理するdiagnosticは、次のfieldだけを持ちます。

```json
{
  "version": 1,
  "code": "K4-REF-001",
  "severity": "error",
  "message": "Unknown reference: MissingBackground",
  "sourceId": "chapters/opening.k4.yml",
  "range": {
    "start": {"line": 12, "column": 7, "offset": 180},
    "end": {"line": 12, "column": 24, "offset": 197}
  },
  "storyPath": "/scenes/opening/actions/2",
  "path": "$.scenes.opening[2]",
  "related": []
}
```

`storyPath`だけが任意です。他のfieldは必須で、未知field、accessor、custom prototype、sparse array、NULを拒否します。
codeは`K4-`で始まる安定識別子、severityは`error`または`warning`です。固定commitのsource frontendは
失敗を`error`で生成しますが、sequence policyは将来のwarningを受理し、warningだけなら`canStage: true`、
errorが一件でもあれば`canStage: false`とします。

診断はsource offset、code、messageの順で決定的にsortします。既定の100件を超えた場合は、最後のslotを
`K4-DIAGNOSTICS-TRUNCATED`へ置き換え、省略されたerrorの有無をseverityへ反映します。

### file、行、列、pathの意味

| 情報                     | 保持場所          | 契約                                                                             |
| ------------------------ | ----------------- | -------------------------------------------------------------------------------- |
| logical file             | `sourceId`        | `main`またはproject-relativeなincluded source。端末の絶対pathではない            |
| 行・列                   | `range.start/end` | line／columnは1-origin、offsetはcanonical source内の0-origin                     |
| Schema上の位置           | `path`            | AJVの`instancePath`を使う場合はJSON Pointer形式。rootは`$`                       |
| semantic上の位置         | `path`            | `$.assets...`等のJSONPath風表現。`path`全体をRFC 6901 JSON Pointerだと仮定しない |
| scene／action上の位置    | `storyPath`       | `/scenes/<scene>/actions/<index>`形式。segmentは`~0`、`~1`でescapeする           |
| declaration元            | `sourceOrigins`   | included sourceの`sourceId`とrangeへruntime diagnosticを戻す                     |
| 同じ問題に関係する別位置 | `related[]`       | message、sourceId、range、任意storyPath、pathを持つ有限配列                      |

Schema errorでは`schemaErrorSegments()`がAJVのJSON Pointerをnode探索用segmentへ変換し、
`storyPathFromSourceSegments()`がscene／action位置を作ります。semantic errorでは
`validateDsl4Semantics()`のJSONPath風`issue.path`を`jsonPathSegments()`でsource nodeへ戻します。
この違いをUIやeditor統合で一つのpath dialectへ無断変換しません。

### stableId、scene、action、causeの境界

`stableId`、`sceneId`、`actionIndex`、`actionPath`、`cause`はcanonical diagnosticのfieldではありません。

- actionの`stableId`は`StoryDocument.scenes[].actions[]`に保持され、reload plannerが移動後のactionを照合するために
  `storyPath`より先に使用します。診断位置は現在の`storyPath`とsource originで表し、`stableId`を追加fieldにしません。
- scene／action contextは`storyPath`から解決します。runtime snapshotは別契約として`sceneId`、`actionIndex`、
  `actionPath`を持ちます。
- `Error.cause`と`AggregateError.errors`は内部調査・cleanup集約用です。canonical envelopeへcause chain、stack、
  dependencyの生messageをコピーしません。
- duplicate declaration等で別位置を示す場合は、causeではなく有限な`related[]`を使用します。

`diagnostic-sequence-policy.js`は未知fieldを値の読取り前に拒否します。そのため`absolutePath`、`sourceText`、
`runtimeValues`、`sessionToken`、`cause`をdiagnosticへ混入させてもexportやwireへ通りません。

## 段階別の失敗分類

### Source read、canonicalize、YAML parse

| 分類                 | 主なcode                                                                         | 発生場所・処理                                                    |
| -------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| file不在・読込不能   | `K4-SOURCE-MISSING`、`K4-SOURCE-READ-001`                                        | bounded loader。runtimeやassetを作らない                          |
| UTF-8・byte上限      | `K4-SOURCE-UTF8-001`、`K4-SOURCE-TOO-LARGE`、`K4-SOURCE-LIMIT-BYTES-001`         | parse前またはcanonicalize直後に拒否                               |
| YAML構文・document数 | `K4-YAML-001`、`K4-YAML-002`                                                     | strict YAML 1.2。一つのdocumentだけを受理                         |
| alias等の制限        | `K4-YAML-003`〜`K4-YAML-006`                                                     | alias／anchor、merge key、custom tag、危険なmapping keyを拒否     |
| YAML resource上限    | `K4-YAML-LIMIT-NODES-001`、`K4-YAML-LIMIT-DEPTH-001`、`K4-YAML-LIMIT-SCALAR-001` | attacker-controlled treeを反復走査し、node、depth、scalar長を制限 |

`parseRestrictedYaml()`はsource objectやScratch状態を変更しません。YAML errorがあればSchemaへ進まず、
失敗結果に`storyDocument`を載せません。

### Schema、semantic、expression

| 分類                  | 主なcode                                                                                             | 判定境界                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| version・構造・型     | `K4-VERSION-001`、`K4-SCHEMA-001`、`K4-SCHEMA-UNKNOWN-KEY`、`K4-ID-INVALID`、`K4-KEY-UNSUPPORTED`    | AJV 2020で規範Schemaを検証                                                                 |
| 参照・asset kind      | `K4-REF-001`、`K4-REF-002`、`K4-REF-003`、`K4-ASSET-001`                                             | `validateDsl4Semantics()`                                                                  |
| branch・pose・command | `K4-BRANCH-001`、`K4-POSE-MODEL-001`、`K4-COMMAND-UNSUPPORTED`                                       | Schemaで表せない作品全体の関係                                                             |
| stable ID重複         | `K4-STABLE-ID-001`                                                                                   | 全sceneのactionを横断して一意性を検証                                                      |
| 式構文・内部解放      | `K4-EXPRESSION-SYNTAX-001`、`K4-EXPRESSION-INTERNAL-001`                                             | `validateConditionSyntax()`を使い、`finally`で`releaseAll()`                               |
| runtime式variable     | `K4-EXPRESSION-VARIABLE-UNKNOWN`、`K4-EXPRESSION-VARIABLE-001`                                       | `mapDsl4RuntimeExpressionError()`がdependencyの値・変数名・生messageを落として一度だけ変換 |
| 作品数上限            | `K4-SCENE-LIMIT-001`、`K4-ACTION-LIMIT-SCENE-001`、`K4-ACTION-LIMIT-TOTAL-001`、`K4-ASSET-LIMIT-001` | `StoryDocument`生成前                                                                      |

Schema、semantic、expression、resource diagnosticを正規化した後、errorが残る場合は
`createStoryDocument()`を呼びません。検証中のRuntime Expression compositionも必ずreleaseします。

### IncludeとSource Graph

| 分類                   | 主なcode                                                                      | 安全側の処理                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| path・suffix・root脱出 | `K4-SOURCE-PATH-001`、`K4-INCLUDE-PATH-001`                                   | POSIX relative logical pathだけを受理。symlinkのrealpathもproject root内か確認 |
| 読込・UTF-8・YAML      | `K4-INCLUDE-READ-001`、`K4-SOURCE-UTF8-001`、`K4-INCLUDE-YAML-001`            | 該当sourceIdとrangeを保持し、composeへ進まない                                 |
| cycle・有限上限        | `K4-INCLUDE-CYCLE`、`K4-INCLUDE-LIMIT-001`                                    | graph全体がacyclicだと確定するまで宣言・assetをcommitしない                    |
| 重複宣言               | `K4-DECLARATION-DUPLICATE`                                                    | root優先・後勝ちを行わず両位置を診断                                           |
| fragment規約           | `K4-INCLUDE-ROOT-ONLY`、`K4-INCLUDE-SOURCE-001`、`K4-INCLUDE-COMPOSITION-001` | `kamishibai`等のroot限定fieldや不正fragmentを宣言元で拒否                      |

`createDsl4SourceGraph()`はsource topologyだけを作り、asset byteやruntimeを読みません。
`createDsl4SourceGraphFrontend()`は各sourceへrestricted YAML policyを適用し、compose成功後だけ単一source frontendへ
渡します。included sourceのsemantic errorは`sourceOrigins`により宣言元のlogical fileとrangeへ投影されます。

### Asset snapshotとtransaction

build時のlocal asset loaderはmissing、path、symlink、file kind、件数、size、integrity、stable readを
`K4-ASSET-MISSING`、`K4-ASSET-PATH-001`、`K4-ASSET-SYMLINK-001`、`K4-ASSET-COUNT-001`、
`K4-ASSET-SIZE-001`、`K4-ASSET-UNSTABLE-001`等で拒否します。asset snapshotが完成する前にbase SB3へ
書き込みません。

asset live reloadのdiagnosticはcanonical source diagnosticではなく、
`{formatVersion: 1, code, severity: 'error', message}`というtransaction状態です。

| code                             | 意味                                          | current generation                                                |
| -------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| `K4-ASSET-PREPARE-001`           | prepareまたはactivate失敗                     | candidateをrollback／release／discardし、旧activeを維持           |
| `K4-ASSET-ROLLBACK-001`          | activate失敗後のrollbackまたはreleaseも不完全 | 旧activeを維持するが、cleanup失敗を`AggregateError`で呼出元へ返す |
| `K4-ASSET-RELEASE-001`           | ack後に旧generationを解放できない             | 新generationのcommitを取消さず、pending releaseをdisposeで再試行  |
| `K4-ASSET-FULL-REBUILD-REQUIRED` | capability不足または構造変更                  | live reloadせず旧activeを維持し、preview buildを要求              |
| `K4-ASSET-STALE-001`             | revisionまたはproviderがstale                 | candidate操作を拒否                                               |

`commit()`は`preview.asset.commit-started`、activate、adapter `accept()`、
`preview.asset.committed` acknowledgementの順です。旧generationを解放するのはack後です。
activate失敗時は`preview.asset.commit-failed`をpublishし、旧active revisionが変わらないことをtestで固定します。

### Runtime、navigation、platform

runtime errorは現在actionまたは式の`storyPath`を`sourceOriginForStoryPath()`へ渡し、canonical v1に近い
`runtimeDiagnostic()`を作ります。

| 分類                  | 主なcode                                                                                          | 停止・cleanup                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| port不足・action失敗  | `K4-RUNTIME-PORT-001`、`K4-RUNTIME-ACTION-001`                                                    | `fail()`でactionをabortし、assetを`runtime-failed`としてrelease        |
| scene・branch・入力値 | `K4-RUNTIME-SCENE-001`、`K4-RUNTIME-BRANCH-001`、`K4-RUNTIME-BRANCH-002`、`K4-RUNTIME-RESULT-001` | `runtime.fail`を発行し`failed`へ移る                                   |
| quiesce               | `K4-RELOAD-QUIESCE-TIMEOUT`、`K4-RELOAD-QUIESCE-FAILED`                                           | current actionを安全境界へ移せなければcurrent runtimeをfail-closed停止 |
| host capability       | `K4-HOST-PORT-MISSING`、`K4-HOST-PORT-COLLISION`、`K4-HOST-CONDITION-MISSING`                     | 不完全なruntime environmentを公開せず部分resourceをcleanup             |
| adapter               | `K4-ASSET-ADAPTER-*`、`K4-MEDIA-PORT-*`、`K4-ACTOR-PORT-*`、`K4-POSE-PORT-*`、`K4-SVG-TEXT-*`     | adapterの所有resourceをenvironment disposeで解放                       |

navigation creation diagnosticには`details`、quiesce diagnosticには`storyPath`とorigin、asset transactionには
`formatVersion`があり、strict canonical envelopeとは異なります。これらをCLI JSONやtelemetryへ出す場合は、
surface adapterが安全な`path`とmessageを決めてcanonical envelopeへ明示変換する必要があります。固定commitには
任意のlifecycle diagnosticを自動的にcanonical化するfallbackはありません。

## 副作用禁止とinvalid candidate

### source frontend

source frontendはpure境界です。filesystem、network、Scratch VM、DOM、asset registryを参照しません。
検証失敗時に禁止される副作用は次です。

- `StoryDocument`、runtime session、actor clone、renderer skinの生成
- asset fetch、asset登録、cache変更
- input listener、camera、timer、broadcastの開始
- preview candidate、SB3出力、source manifestのcommit

式のsyntax検証で一時的なcompositionを作る場合も、`finally`で`releaseAll()`を呼びます。

### source live reload

`createDsl4LiveReloadSession.stage()`へ`ok: false`を渡すと、pending candidateをclearし、診断を更新して
`invalid`へ移ります。current sessionが存在する場合は停止・disposeせず、そのscene、action、variables、
source integrityを維持します。invalid sourceからreplacement sessionを生成しないことを
`keeps the current immutable execution when a changed source is invalid` testが固定しています。

valid candidateはcurrent sessionの`quiesce()`が成功するまで`pending`になりません。stale choice、disabled choice、
後から来たinvalid sourceはcandidateをcommitしません。`defer()`と`discardCandidate()`はcurrent runtimeを
`resumeQuiesce()`してcandidateだけを捨てます。

source sessionのcommitには重要な境界があります。next sessionを先に生成した後、currentをstop／disposeしてから
nextをstartします。next startが失敗した時点ではprevious sessionは停止済みのため、自動rollbackで復活させず
sessionを`failed`にします。`discardCandidate()`もfailed runtimeをactiveへ戻しません。

### production build

`buildDsl4RuntimeComponent()`はmemory内でsource、asset、artifact、SB3を組み立て、loaderで再検証します。
`buildDsl4RuntimeComponentFile()`はcandidate directoryへ書き、byte一致とruntime componentを再検証した後だけ
`installBundleTransactionally()`で出力を置き換えます。install途中で失敗した場合はbackupから既存fileを戻し、
自動復元まで失敗した場合だけrollback directoryを残して明示的な確認を要求します。

## Abort、cleanup、安全停止

### runtime failure

`runtime-controller.js`の`fail()`は次の順で安全停止します。

1. Structured Data統合が有効なら`endStructuredStory('runtime-failed')`を試す。
2. statusを`failed`へ変更する。
3. 現在の`AbortController`を`runtime-failed`でabortする。
4. actionまたはmapped expression errorからcode、storyPath、source pathを決める。
5. `runtimeDiagnostic()`を作り、asset lifecycleを`runtime-failed`でreleaseする。
6. `runtime.fail` eventを発行し、進行中のquiesceをrejectする。

Action Contextの`generation`と`AbortSignal`は両方検査します。取消済みactionのPromiseが後からresolveしても、
`setVariable()`、scene遷移、`action.commit`を実行できません。`stop()`、restart、navigation、quiesceもgenerationを
更新してstale completionを無効化します。

### platform environment

`createDsl4TurboWarpRuntimeEnvironment()`はactor、pose feedback、camera controls、host port、Runtime Expression、
Structured Data、input arbitration、asset session等をcomposeします。途中で失敗した場合も、生成済みの各ownerへ
cleanupを試み、元のcreation errorとcleanup errorを`AggregateError`へまとめます。

正常disposeではruntime／navigationを停止し、pending inputとrun settlementを待ち、cache lease heartbeatを止め、
platform resourceを解放します。observerや`onEvent`、`onError`がthrowしても実行状態を変更しません。

cleanup失敗を無視して成功扱いにはしません。ただし複数ownerの解放を一件目で打ち切らず、全ownerへ試行してから
集約します。

## Browser、CLI、Productionの表示surface

| surface                | source／diagnostic生成者                                            | 利用者へ出すsurface                                                                               | invalid時の実行状態                                             |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Browser Web Preview    | browser source adapter + production frontend                        | development shell、reload overlay、fallback status。code、severity、安全なmessage、logical位置    | current generationを維持し、invalid candidateをcommitしない     |
| CLI Preview            | Node watcher + production frontend                                  | terminal statusとbrowser側共通overlay。version付きgeneration wireで診断を送る                     | browser-owned current runtimeを維持。構造変更はfull rebuild要求 |
| `validate-dsl4`        | production frontend                                                 | prettyは`displayName:line:column: severity [code] message`、JSONは診断envelope                    | runtimeを作らず終了status 1。option／内部契約は2                |
| `build-dsl4`           | frontend、asset loader、artifact loader、output verifier            | `Dsl4BuildError`のstage／codeとcanonical diagnostics                                              | 既存SB3を維持しcandidateを削除                                  |
| Production SB3 runtime | packaged component loader + runtime controller + Standard app shell | startup resultのdiagnostics、runtime snapshotの`diagnostic`。development reload overlayは含めない | runtime failureは`failed`。watch／live reloadは行わない         |

`createDsl4DiagnosticUiProjection()`はcanonical sourceを一時的に使って該当行excerptを作りますが、結果へ全文を保持しません。
messageとexcerptを有限長へ切り、`renderDsl4DiagnosticFallbackSvg()`はXML escapeします。
`formatDsl4DiagnosticClipboard()`はdisplay name、行、列、severity、code、messageだけを出します。

CLI Previewの`preview.source.generation` wireはvalid時にimmutable `StoryDocument`、source ID、byte数、SRIを送り、
invalid時にbounded canonical diagnosticsだけを送ります。raw／canonical YAML、display file名、絶対path、tokenを
送らず、未知fieldを拒否します。

Production SB3にはdirectory handle、watcher、session token、candidate、reload preference、overlay stateを保存しません。
固定commitの汎用fallback SVG helperが存在しても、production Standard app shellが全runtime diagnosticを自動表示する
契約までは固定されていません。production統合はstartup resultまたはruntime snapshotを明示的に扱い、
development overlayの存在を前提にしません。

## 機密情報とlocal path

author-facing diagnosticへ含めてよいのは、stableなcode、安全なmessage、logical `sourceId`、source range、
path／storyPath、有限なrelated locationです。次を含めません。

- canonical source全文、不要な原文excerpt
- runtime variableの名前・値、式本文、Adapter ExceptionRef
- OSのabsolute path、file／directory handle、symlink実体path
- preview bearer token、session token、cache credential
- stack trace、`Error.cause`、内部object、platform resource handle

`redactDsl4DiagnosticTelemetry()`はmessageも落とし、version、code、severity、sourceId、range、任意storyPath、pathだけを
返します。`serializeDsl4DiagnosticExport()`はcanonical messageを含むため、利用者が明示的にexportするsurfaceに限定し、
producer側で安全なmessageだけを生成します。

Runtime Expression境界はdependencyの式、variable名、runtime値、生messageをコピーしません。一方、固定commitの
generic `runtime-controller.fail()`は任意のplatform `Error.message`を自動redactせず`runtimeDiagnostic()`へ使用します。
したがってplatform adapterは絶対path、token、入力値をerror messageへ埋め込まず、stableで利用者へ公開可能なmessageと
`K4-*` codeをthrowすることが必須のレビュー条件です。新しいadapterではsecretを含むthrowとsurface出力の
negative testを追加します。

Source Graphとexternal source loaderはfilesystem accessにabsolute pathを内部使用しますが、返すdescriptor、
`sourceId`、wireにはproject-relative pathまたはbasenameだけを載せます。内部Errorのcause chainはlog／debug境界に留め、
CLIの通常出力やbrowser DOMへ直接文字列化しません。

## Feature flagとrollback

この文書追加でflagの既定値は変更しません。固定commitのDSL 4.0 flagは
`src/dsl4/feature-flags.js`で全て既定OFFです。

| flag                            | 診断・停止との関係                           | OFF時の安全動作                            |
| ------------------------------- | -------------------------------------------- | ------------------------------------------ |
| `dsl4Runtime`                   | packaged component検証とruntimeを有効化      | dependency、adapter、runtimeを初期化しない |
| `dsl4SourceIncludes`            | Source Graphとorigin投影を有効化             | 単一source frontendへ戻る                  |
| `dsl4AppShell`                  | Standard shellを有効化                       | shell DOMを作らない                        |
| `dsl4WebPreviewAdapter`         | read-only Browser Preview sourceを有効化     | directory picker、browser watchを作らない  |
| `dsl4WebPreviewAssetLiveReload` | transactional asset reloadを有効化           | source-only reloadまたはfull rebuildへ戻る |
| `dsl4PreviewReloadOverlay`      | development candidate／diagnostic UIを有効化 | overlayを作らず、core diagnostic契約は維持 |

rollbackは該当flagをOFFにし、processまたはsessionを再起動して起動時snapshotを取り直します。production問題は
直前の検証済みSB3とdependency pinへ戻します。文書だけをrollbackする場合は、本書、4.0 publication、
`site/4.0/index.html`のカード、対応testだけをrevertし、3.1履歴文書と既存URLを維持します。

## 実装レビューの確認表

| 変更箇所                   | 必ず確認するtest                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| diagnostic envelope・順序  | `test/dsl4-diagnostic-sequence-policy.test.mjs`、`test/dsl4-expression-diagnostic-boundaries.test.mjs`                              |
| YAML・Schema・semantic     | `test/dsl4-schema.test.mjs`、`test/dsl4-source-limits.test.mjs`、`test/dsl4-validate-cli.test.mjs`                                  |
| include・origin・path      | `test/dsl4-source-graph.test.mjs`、`test/dsl4-source-graph-frontend.test.mjs`、`test/dsl4-source-include-build.test.mjs`            |
| invalid source・reload     | `test/dsl4-live-reload-session.test.mjs`、`test/dsl4-live-reload-quiesce.test.mjs`                                                  |
| asset transaction          | `test/dsl4-asset-reload-transaction.test.mjs`、`test/dsl4-browser-asset-reload-pipeline.test.mjs`                                   |
| runtime fail・abort        | `test/dsl4-runtime-controller.test.mjs`、`test/dsl4-runtime-startup.test.mjs`、`test/dsl4-runtime-asset-lifecycle.test.mjs`         |
| platform partial cleanup   | `test/dsl4-turbowarp-runtime-host.test.mjs`、`test/dsl4-platform-asset-session.test.mjs`                                            |
| Browser／CLI diagnostic    | `test/dsl4-web-preview-shell.test.mjs`、`test/dsl4-local-preview-cli.test.mjs`、`test/dsl4-preview-source-generation-wire.test.mjs` |
| production candidate／出力 | `test/dsl4-build-cli.test.mjs`、`test/dsl4-one-shot-build.test.mjs`、`test/dsl4-packaged-runtime-component.test.mjs`                |

新しいcodeは既存codeの意味を再利用せず、検出段階と安全動作をtest名へ対応させます。新しいdiagnostic fieldが必要な場合は、
producerだけへ追加せず`diagnostic-sequence-policy.js`、projection、wire、CLI JSON、telemetry、version migrationを
一つの変更として設計します。

## 固定実装への参照

- [source frontend](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/src/dsl4/source-frontend.js)と[diagnostic sequence policy](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/src/dsl4/diagnostic-sequence-policy.js)
- [diagnostic projection](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/src/dsl4/diagnostic-projection.js)と[expression diagnostics](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/src/dsl4/expression-diagnostics.js)
- [Source Graph](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/src/dsl4/source-graph.js)と[graph frontend](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/src/dsl4/source-graph-frontend.js)
- [live reload session](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/src/dsl4/live-reload-session.js)と[asset reload transaction](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/src/dsl4/asset-reload-transaction.js)
- [runtime controller](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/src/dsl4/runtime-controller.js)と[runtime startup](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/src/dsl4/runtime-startup.js)
- [TurboWarp runtime host](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/src/dsl4/platform/turbowarp-runtime-host.js)と[preview session](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/src/dsl4/platform/turbowarp-preview-session.js)
- [preview generation wire](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/src/dsl4/preview-source-generation-wire.js)
- [production build](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/src/builder/dsl4-build.js)と[atomic output](https://github.com/kubohiroya/tmpose-kamishibai/blob/79457815f5c89b181b1a879a079a4d6a72d405ed/src/builder/atomic-output.js)
