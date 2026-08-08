# TMPose紙芝居 4.0 機能拡張・プラットフォーム統合ガイド

Copyright © 2026 Hiroya Kubo. この文書は[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)で提供します。

文書状態: 固定実装基準を説明する統合ガイド（正式リリース済みの意味ではない）\
調査基準: tmpose-kamishibai `7945781`、2026年8月8日

> **配布状態との区別:** 2026年8月8日時点で`v4.0.0`は正式リリースされていません。
> 本書の統合境界は固定実装を説明し、公開プレイヤーや配布物で利用できることを保証しません。

このガイドは、TMPose紙芝居4.0のruntime capability、platform adapter、外部packageとの統合境界を
保守する開発者向けの資料です。実装基準は`kubohiroya/tmpose-kamishibai`のcommit
[`79457815f5c89b181b1a879a079a4d6a72d405ed`](https://github.com/kubohiroya/tmpose-kamishibai/tree/79457815f5c89b181b1a879a079a4d6a72d405ed)
です。本書のpath、関数、package version、診断code、test名はこのcommitで確認しています。

YAMLの記述方法は[紙芝居DSL 4.0 台本作成ガイド](../dsl-author-guides/dsl-4.0-author-guide.md)、
runtime coreまで含む内部構造は[紙芝居アプリ 4.0 内部仕様書](internal-specification-4.0.md)、
変更・release手順は[紙芝居アプリ 4.0 ソフトウェアメンテナンスガイド](developer-guide-4.0.md)を
参照してください。

## 読む前に

このガイドは、[内部仕様書](internal-specification-4.0.md)でruntime、port、adapterの役割を確認した後に読む
詳細資料です。先にすべてのpackage名を覚える必要はありません。まず「Standard Runtimeの構成契約」で
共通境界をつかみ、その後は変更対象に対応する「統合1〜9」だけを読み、最後に共通規則・flag・検証matrixを
確認してください。

本書の次に[台本診断・安全停止 設計レビュー](dsl-4.0-diagnostics-design.md)を読むと、ここで説明する
adapterやasset transactionが失敗したとき、どの状態を公開せず何をcleanupするかを追跡できます。

## 3.2ガイドとは独立した文書である

既存の[3.2 機能拡張ガイド](extension-guide.md)は、DSL 3.2の配布SB3が利用する16個の
TurboWarp extensionと`extensionBundles`を説明する文書です。その文書と公開URLは変更しません。

4.0 Standard Runtimeは、その一覧、extension ID、block例、1拡張2ページの誌面構成を引き継ぎません。
外部packageの公開`./composition`をJavaScript sourceから呼び、first-party sourceと合わせて一つの
runtimeへ構成します。したがって本書は「追加するextensionの一覧」ではなく、「runtime coreから見える
capabilityとplatform境界」を記録します。各providerが単体で公開するextension IDはStandard Runtimeの
登録契約ではなく、本書では互換IDとして扱いません。

## 図版、source、licenseの境界

本書では画像、editor capture、外部図版を新規使用しません。4.0 Standardには利用者が選ぶ複数の
extension paletteがなく、画面captureでは責務境界や失敗条件を検証できないためです。代わりに、固定commitの
実装path、export関数、契約fixture、testを表で対応させます。

本書の文章は上記のCC BY-SA 4.0です。参照する本体sourceと外部capability packageはMPL-2.0、
support packageの`fflate`はMIT、`yaml`はISCです。正確な著作権表示、package repository、lockfile
integrityは固定commitの`LICENSES.md`、`package.json`、`pnpm-lock.yaml`が正本です。本書へsource code、
package成果物、第三者の画像は転載していません。

## Standard Runtimeの構成契約

4.0ではruntime coreが外部packageを直接知るのではなく、portとcompositionを境界にします。同じ構成を
Browser Preview、CLI接続先browser、Production SB3へ届けますが、source取得やlive reloadの能力はsurfaceごとに
異なります。

<figure class="concept-flow"><figcaption>runtime coreと外部capabilityの境界</figcaption><div class="concept-flow__track"><span>Runtime controller</span><b aria-hidden="true">→</b><span>Port contract</span><b aria-hidden="true">→</b><span>Platform composition</span><b aria-hidden="true">→</b><span>Asset Manager・TMPose・SVG Text・Async Input・Expression</span><b aria-hidden="true">→</b><span>Browser／CLI／Production surface</span></div><p class="concept-flow__note">外部packageはportの外側に置き、runtime coreへbrowserやTurboWarp固有objectを持ち込みません。</p></figure>

### 登録とbundleの単位

`scripts/sb3/dsl4-runtime-extension-entry.js`は、Standard 4.0で
`kubohiroyakamishibairuntime4`を一度だけ`Scratch.extensions.register()`します。実行には
`Scratch.extensions.unsandboxed`が必要です。paletteに表示されるblockはなく、version、status、last error、
内部text値を扱う4 opcodeも`hideFromPalette`です。

5つの外部capabilityは正確なpackage versionとlockfile integrityを固定し、`./composition` exportを
直接importします。Structured Dataは本体repository内のfirst-party sourceです。

| capability         | providerと固定version                            | Standardでの主な責務                          |
| ------------------ | ------------------------------------------------ | --------------------------------------------- |
| Asset Manager      | `@kubohiroya/turbowarp-asset-manager@0.7.0`      | asset byte、skin、sound、検証済みremote cache |
| Async Input        | `@kubohiroya/turbowarp-async-input@0.3.0`        | scene遷移・skip用の候補選択                   |
| Runtime Expression | `@kubohiroya/turbowarp-runtime-expression@0.3.0` | branch式の検証と評価                          |
| SVG Text           | `@kubohiroya/turbowarp-svg-text@0.3.0`           | text actor、speech bubbleの描画               |
| TMPose             | `@kubohiroya/turbowarp-tmpose@1.6.1`             | pose modelと認識lifecycle                     |
| Structured Data    | `src/dsl4/structured-data.js`、format version 1  | view、object store、iterator、JSONPath        |

Standard 4.0のbundle種別は`source-composition`です。3.2の`extensionBundles`、unbundle用
recovery capsule、保存opcode互換性ではなく、正確なpackage pin、lockfile、composition export、integration
testで互換性を検証します。`test/fixtures/dsl4/capability-bundle-release-contract.json`と
`test/dsl4-capability-bundle-release-contract.test.mjs`がこの関係を機械的に検査します。

### surfaceごとの能力差

| 境界           | Browser Web Preview                                             | CLI Preview                                                | Production SB3                                   |
| -------------- | --------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| source読込     | read-only directory pickerと安定二重読込                        | Node processがproject root内を読込                         | SB3へ埋め込んだ固定component                     |
| runtime所有者  | browser上のTurboWarp VM                                         | browser client。Node hostはruntimeを実行しない             | editor、web player、packager上のTurboWarp VM     |
| transport      | directory handle内で完結                                        | loopback、exact origin、single-use token、project-root制限 | preview transportを含めない                      |
| camera・DOM    | browserとTMPose composition                                     | 接続したbrowser側                                          | 実行surfaceのbrowser側                           |
| live reload    | source、任意でasset                                             | source watcherからbrowserへcandidateを通知                 | 含めない                                         |
| remote         | remote previewとremote extension codeは禁止                     | remote bindは禁止                                          | remote extension codeは禁止                      |
| 一時状態の保存 | 選択handle、permission、preview diagnosticはprojectへ保存しない | token、接続、watcher stateはSB3へ保存しない                | preview field、directory handle、tokenを含めない |

`src/dsl4/platform/standard-app-shell.js`の`createDsl4StandardAppShell()`は`webPlayer`、
`regularEditor`、`packager`、`developmentPreview`を同じcomposition rootへ接続します。一方、
`src/dsl4/browser-preview-source-adapter.js`や`src/builder/dsl4-local-preview-host.js`は開発時だけの
adapterです。production artifactへ混ぜません。

## 統合1: Runtime host、actor、media、speech

### 責務と入出力

`src/dsl4/platform/turbowarp-runtime-host.js`の`createDsl4TurboWarpRuntimeEnvironment()`が
runtime coreへ渡すportを構成し、`createDsl4TurboWarpRuntimeHost()`がstartup、start、stop、disposeを
所有します。runtime coreはTurboWarp VM、renderer、audio engineを直接参照しません。

| port・関数                           | 入力                                                       | 出力・副作用                                      |
| ------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------- |
| `createDsl4ActorActionPort()`        | actor ID、skin、座標、scale、透明度、speech、`AbortSignal` | actor表示、移動、透明度遷移、say／think operation |
| `createDsl4MediaActionPort()`        | backdrop／sound／target／skin ID、`AbortSignal`            | stage skin、BGM、効果音、actor skinの更新         |
| `createDsl4TurboWarpActorPlatform()` | VM runtime、renderer、actor lookup                         | actorごとのplatform handleとrelease               |
| runtime hostのwait port              | 有限な待機秒、`AbortSignal`                                | cancellableな完了                                 |

actorとmedia portはasset IDをprivate Asset Manager compositionで解決し、画像・音声のMIME kindも検査します。
`show`、`setTransparency`、`moveTo`、`say`は常に構成され、`think`は
`dsl4SpeechAdvanceTypewriter`がONのときだけportへ追加されます。advanced speechは`waitFor: advance`、
typewriter、character soundを同じcancellable operationに束ねます。

### 失敗、権限、fallback、bundle

- actor payloadや時間、透明度、easingが不正なら`K4-ACTOR-PORT-001`、asset不一致は`002`、target不在は
  `003`、presentation operation不正は`004`で停止します。
- media payload不正は`K4-MEDIA-PORT-001`、asset不一致は`002`、actor不在は`003`です。BGMや効果音の
  cancellationは再生停止まで実行します。
- hostで同名methodが重複すれば`K4-HOST-PORT-COLLISION`、storyが要求するcommandがなければ
  `K4-HOST-PORT-MISSING`または`K4-HOST-PORT-UNSUPPORTED`です。commandを黙ってskipしません。
- browserではStandard Runtime全体がunsandboxedを必要とします。actor・media portが追加のpermission
  promptを出すことはありません。CLI hostはこれらを実行せず、接続したbrowser runtimeが所有します。
- actor、media、speechはStandard source compositionに含まれます。remote extensionへfallbackしません。
- `dsl4Runtime`と`dsl4AppShell`は既定OFFです。advanced speechだけを戻すときは
  `dsl4SpeechAdvanceTypewriter`をOFFにし、基本`Actor.say`までの経路を保ちます。host自体を戻すときは
  app shell、runtimeの順でOFFにします。

確認testは`test/dsl4-turbowarp-runtime-host.test.mjs`、`test/dsl4-actor-action-port.test.mjs`、
`test/dsl4-media-action-port.test.mjs`です。

## 統合2: Asset Manager、storage、remote asset

### 責務と入出力

`src/dsl4/platform/platform-asset-session.js`の`createDsl4PlatformAssetSession()`が、一つのruntime
sessionについてAsset Manager、TMPose、Async Input、asset adapter、cache leaseをまとめて所有します。
`src/dsl4/platform/asset-manager-adapter.js`の`createDsl4AssetManagerAdapter()`は検証済みasset宣言と
byteを受け、image object URL、skin、soundとして利用できるsession-owned resourceを返します。

| delivery・storage  | 入力契約                                                           | 出力と所有権                                 |
| ------------------ | ------------------------------------------------------------------ | -------------------------------------------- |
| embedded           | build時に検証済みのSB3内byte                                       | 自己完結resource。session終了時にrelease     |
| binary bundle      | 検証済みentry、content type、asset ID                              | private backing storeからmaterialize         |
| remote             | HTTPS URL、SHA-256 integrity、宣言media type、size、注入済みloader | 再検証済みbyteとverified cache entry         |
| browser object URL | image byteとMIME                                                   | adapter所有URL。release時にrevoke            |
| verified cache     | integrityを含むcache identity、lease                               | stats、list、prune、clear、delete、heartbeat |

remote assetは`loadRemoteAsset`関数を明示注入したsessionだけで有効です。loaderが返した結果もAsset Managerの
`resolveVerifiedRemoteBinary`でURL、integrity、size、content typeを再検証します。未検証byteを採用する
fallbackやHTTPへのdowngradeはありません。offlineを保証する作品はembeddedを使います。

### 失敗、権限、fallback、bundle

- asset ID、source、signalの不正は`K4-ASSET-ADAPTER-001`、未登録・MIME不一致は`002`、登録失敗は
  `003`、release失敗は`004`、所有権違反は`005`、object URL生成などhost失敗は`006`です。
- cache identityがないremote／binary sourceはhostで`K4-HOST-CACHE-IDENTITY-001`としてfail closedにします。
- browser object URLはborrowed URLとして外へ渡し、adapterだけがrevokeします。project YAML、
  `StoryDocument.variables`、production SB3へcache leaseや端末storage keyを保存しません。
- remote fetchにはbrowserのnetwork policyが適用されますが、Standard Runtimeが一般的なnetwork permission
  dialogを提供するわけではありません。CLI previewのNode hostはremote assetの信頼判定を代行しません。
- Asset Manager compositionとembedded asset lifecycleはStandardに含まれます。remote loaderとpreviewの
  cache stateは注入境界で、productionへの必須依存ではありません。
- remote asset用の独立feature flagはありません。「loaderを注入しない」が既定の無効状態です。
  rollbackはloader注入を外し、作品をembedded assetへ戻します。asset live reloadだけを戻す場合は
  `dsl4WebPreviewAssetLiveReload`をOFFにし、source reloadまたはone-shot buildを使います。

確認testは`test/dsl4-platform-asset-session.test.mjs`、`test/dsl4-asset-manager-adapter.test.mjs`、
`test/dsl4-embedded-asset-lifecycle.test.mjs`、`test/dsl4-remote-asset-lifecycle.test.mjs`です。

## 統合3: TMPose、pose入力、camera

### 責務と入出力

`src/dsl4/platform/tmpose-model-adapter.js`の`createDsl4TMPosePlatform()`は
`@kubohiroya/turbowarp-tmpose/composition`と`createDsl4TMPoseModelAdapter()`を組み合わせます。
adapterは検証済みmodel filesとlabel mappingを受け、session-owned model resourceを返します。

`src/dsl4/platform/pose-action-port.js`の`createDsl4PoseActionPort()`は、`waitForPose`と
`poseInputToChangeScene`をTMPose認識session、Async Input候補選択、`AbortSignal`へ接続します。入力は
pose model ID、候補pose、confidence／hold policy、feedback設定です。出力は認識完了または選択された
scene遷移候補であり、生のcamera frameやmodel objectをruntime coreへ返しません。

`src/dsl4/platform/camera-preview-controls.js`の`createDsl4CameraPreviewControls()`はmirroring buttonと
camera menuをDOMへ構成します。device一覧・選択はTMPose側のcamera portへ委譲し、このUI moduleは
`getUserMedia()`を直接呼びません。物理device ID、permission状態、選択menuはprojectへ永続化しません。

### 失敗、権限、fallback、bundle

- model source不正は`K4-TMPOSE-ADAPTER-001`／`002`、登録失敗は`003`、release失敗は`004`、別sessionの
  resourceは`005`です。
- pose payload、policy、feedback不正は`K4-POSE-PORT-001`、model・label不足は`002`、未知poseは`003`、
  abortは`004`、release後は`005`、同時Actor pose sequenceは`006`、不正confidenceは`007`、Async Inputが
  未知候補を返せば`008`です。
- camera permissionとdevice labelの公開はbrowserとTMPose compositionが所有します。拒否時に別cameraを
  無断選択したり、録画・frameをstorageへ保存したりしません。CLI hostにはcamera権限がなく、browser側で
  実行します。
- production entrypointは`globalThis.tmPose`がない場合に限定fallbackを注入します。poseを使わないstoryの
  surfaceは起動できますが、pose modelの`loadFromFiles()`は
  `This story requires the Teachable Machine Pose runtime.`で明示失敗します。疑似認識へfallbackしません。
- TMPose compositionとpose portはStandard bundleに含まれます。camera menu、mirroring、pose feedback UIは
  surface機能で、`dsl4CameraPreviewControls`、`dsl4PosePreviewMirroring`、
  `dsl4PoseFeedbackModes`がすべて既定OFFです。
- UIだけをrollbackするときは上記flagをOFFにします。pose capability自体を戻す場合はpackage pinとlockfile、
  release sourceを直前の検証済み組合せへ戻し、pose storyは機能縮退させず停止させます。

確認testは`test/dsl4-tmpose-model-adapter.test.mjs`、`test/dsl4-pose-action-port.test.mjs`、
`test/dsl4-camera-preview-controls.test.mjs`、`test/dsl4-turbowarp-runtime-host.test.mjs`です。

## 統合4: SVG Text

`src/dsl4/platform/svg-text-action-port.js`の`createDsl4SvgTextPlatform()`は
`@kubohiroya/turbowarp-svg-text/composition`をblock登録なしで利用します。入力はtext actor ID、文字列、
定義済みstyle、`AbortSignal`です。出力はactor skinとして表示できるSVG text resourceで、
`defineStyle()`、`setText()`、`releaseTarget()`、`releaseAll()`のownershipをplatform内に閉じます。

- payload不正は`K4-SVG-TEXT-001`、style不正・未定義は`002`、target不在は`003`、ownership違反は`005`、
  release後は`006`です。失敗時にplain textや別styleへ黙って置換しません。
- standalone factoryは`enabled`省略時にOFFで、runtimeやDOMを読みません。Standard runtime hostは
  capabilityを明示的に`enabled: true`で構成します。追加のbrowser permissionはありません。
- composition packageはStandard bundleに含まれ、providerの単体extension登録やremote codeを使いません。
- SVG Text専用のglobal feature flagはありません。統合変更のrollbackはpackage pinとhost compositionを
  直前の検証済み状態へ戻します。storyが`setText`やspeech styleを要求するときは代替描画へfallbackせず、
  port不在または描画失敗として診断します。

確認testは`test/dsl4-svg-text-action-port.test.mjs`です。

## 統合5: Async Inputと入力調停

`src/dsl4/platform/platform-asset-session.js`は
`@kubohiroya/turbowarp-async-input/composition`をsessionごとに作成します。
`src/dsl4/platform/async-input-action-port.js`の`createDsl4AsyncInputActionPort()`は、key sourceと
actor touch sourceが提供された場合だけ、それぞれの入力を候補選択へ接続します。pose候補はpose portから
同じcompositionへ入り、`src/dsl4/input-arbitration.js`が競合するforeground入力の所有権を調停します。

入力は一意な候補、入力source、Action Contextの`AbortSignal`です。出力は選択された候補またはcancelで、
生のDOM eventやScratch eventをruntime coreへ漏らしません。不正なpayload、signal、source、composition
結果は`K4-ASYNC-INPUT-PORT-001`です。port未構成時はhostのmissing／unsupported診断となり、先頭候補を
自動選択するfallbackはありません。

key・touchはbrowser runtimeが所有し、CLI hostはkeyboardやDOMを直接読みません。追加permissionは不要です。
Async Input compositionはStandard bundleに含まれますが、利用可能な入力sourceはsurface注入に依存します。
専用feature flagはなく、rollbackはsource注入を外すかpackage pinを戻します。作品側は利用可能な別入力を
明示してから切り替え、実行中候補の意味を変更しません。

確認testは`test/dsl4-async-input-action-port.test.mjs`と`test/dsl4-input-arbitration.test.mjs`です。

## 統合6: Runtime Expression

`src/dsl4/platform/turbowarp-runtime-host.js`は
`@kubohiroya/turbowarp-runtime-expression/composition`の`evaluateCondition()`と`releaseAll()`を
runtimeへ渡します。production source frontendも同じcompositionを使い、branch式をparse・検証します。

入力はSchema・意味検証済みのbranch式、immutableなvariable snapshot、有限評価limitです。出力はbooleanの
分岐結果または構造化診断です。独自`eval`、`Function`、parse失敗を`false`とみなすfallbackはありません。
compositionが契約を満たさない場合はhost作成時、条件評価functionがなければ
`K4-HOST-CONDITION-MISSING`で停止します。

式評価にbrowser permissionは不要で、Browser Preview、CLIで検証したcandidate、Production SB3が同じ
package pinを使います。compositionはStandard bundleに含まれ、remote evaluatorへ問い合わせません。
専用feature flagはありません。rollbackはpackageとlockfileを直前の検証済みpinへ戻し、source frontend、
runtime host、expression diagnostic testを同時に確認します。

確認testは`test/dsl4-expression-diagnostic-boundaries.test.mjs`、
`test/dsl4-turbowarp-runtime-host.test.mjs`、`test/dsl4-extension-pins.test.mjs`です。

## 統合7: Structured Dataとcustom action境界

Structured Dataは外部extensionではありません。`src/dsl4/structured-data.js`の
`createDsl4StructuredDataComposition()`が`StoryDocument` view、object store、collection、iterator、
JSONPathを有限limit付きで構成し、`src/dsl4/structured-data-adapter.js`の
`createDsl4StructuredDataAdapter()`がrealm固有のopaque handleへ投影します。

入力はdeep-frozen story data、JSONPath、scope、有限操作limitです。出力はprimitiveまたは同じrealmでのみ
解決できるopaque handleです。raw object、別realm handle、prototype、内部store参照をcustom actionへ
渡しません。scope終了時は子handle、iterator、viewをreleaseし、realm破棄時は全参照を破棄します。

不正JSONPath、limit超過、stale／foreign handle、release後の参照は構造化failureになります。JSON文字列への
暗黙変換やglobal storeへのfallbackはありません。browser storageやnetwork permissionは使わず、runtime
memoryだけを所有します。first-party sourceとしてStandard compositionに含まれますが、runtime統合は
`structuredDataIntegrationEnabled`が既定OFFです。

custom action自体は`src/dsl4/action-context-turbowarp.js`の`dsl4CustomActionsEnabled`が既定OFFで、
Standardの必須extension登録ではありません。rollbackはまずcustom action flag、次にStructured Data統合flagを
OFFにし、core story executionを維持します。

確認testは`test/dsl4-structured-data.test.mjs`、`test/dsl4-structured-data-adapter.test.mjs`、
`test/dsl4-runtime-structured-data-integration.test.mjs`です。

## 統合8: Browser Web Preview

`src/dsl4/browser-preview-source-adapter.js`の`inspectDsl4BrowserPreviewSupport()`はsecureなtop-level
contextと`showDirectoryPicker`を検出し、`createDsl4BrowserPreviewSourceAdapter()`が選択directoryを
read-onlyで監視します。入力は`FileSystemDirectoryHandle`、`project.source.json`、entry／include YAML、
有限byte・poll limitです。出力は安定したsource generation、`StoryDocument`、または診断です。

adapterは`showDirectoryPicker({mode: 'read'})`と`queryPermission({mode: 'read'})`だけを使い、write権限を
要求しません。manifestとsourceを二度読み、integrityが一致したgenerationだけを公開します。pageがhiddenに
なるとpollを抑制し、permission revoke、page hide、disposeではlistenerとtimerを解放します。

代表診断はunsupported、insecure context、picker cancel、permission denied／revoked、background throttled、
manifest missing／read／JSON、source path／missing／size／UTF-8、
`K4-PREVIEW-SOURCE-UNSTABLE`です。失敗したgenerationをcurrentへcommitしません。

`src/builder/dsl4-web-preview-shell.js`は利用できない場合に、local uploadやremote previewへ切り替えず、
`tmpose-kamishibai preview-dsl4 --watch`と`tmpose-kamishibai validate-dsl4`を明示します。
`dsl4WebPreviewAdapter`は既定OFFでruntimeとapp shellを必要とし、asset live reloadはさらに
`dsl4WebPreviewAssetLiveReload`を必要とします。rollbackはasset live reload、Web Preview adapterの順に
OFFにし、CLI previewまたはone-shot buildへ戻します。

Browser adapterとdirectory handleはdevelopment surfaceだけで、Production SB3に保存しません。
確認testは`test/dsl4-browser-preview-source-adapter.test.mjs`と
`test/dsl4-web-preview-shell.test.mjs`です。

## 統合9: CLI Preview transport

`src/builder/dsl4-local-preview-command.js`と`src/builder/dsl4-local-preview-host.js`はNode側でproject
sourceを監視します。`src/builder/dsl4-preview-transport-policy.js`の
`createDsl4PreviewTransportPolicy()`は次を強制します。

- bind addressはliteral `127.0.0.1`または`::1`
- browser requestのoriginは起動時に固定したexact origin
- remote addressはloopback
- tokenは32 byteの暗号学的乱数から作るbase64url、5分以内、single-use
- 読めるpathは正規化済みの非root project directoryとmanifest到達範囲だけ
- 同時active connectionとtoken record数は有限

CLIの入力はproject root、manifest、watch event、browser requestです。出力は検証済みcandidate通知と
diagnosticであり、Node host自身はTurboWarp runtime、camera、DOMを実行しません。OS processのread権限を使い、
browserのdirectory picker permissionは使いません。読込権限がなければ診断で停止し、上位directoryやremote
hostへfallbackしません。

origin、remote、token、expiry、reuse、path、disconnect違反は`K4-PREVIEW-TRANSPORT-*`でfail closedです。
transport、token、watch stateはdevelopment専用でProduction SB3へ保存されません。preview surfaceは既定OFFの
runtime／app-shell flagから明示起動します。rollbackはhostを停止してtokenと接続を破棄し、
`validate-dsl4`と`build-dsl4`のone-shot経路へ戻します。

確認testは`test/dsl4-preview-transport-policy.test.mjs`、`test/dsl4-local-preview-host.test.mjs`、
`test/dsl4-local-preview-cli.test.mjs`です。

## 診断、reload、fallbackの共通規則

`src/dsl4/runtime-controller.js`は`runtime.start`、`scene.transition`、`action.start`、`action.commit`、
`runtime.fail`を順序付きeventとして公開します。adapterはerrorを握りつぶさず、runtimeがsource originと
組み合わせられるstable codeまたはcauseを返します。live reloadはcandidateを検証・prepareしてから
quiesce／commitし、失敗時はcurrent generationを維持します。

`dsl4PreviewReloadOverlay`は既定OFFです。OFFでも診断そのものは失われず、overlay UIだけを構成しません。
`dsl4SourceIncludes`も既定OFFで、OFF時は単一sourceへ戻ります。includeの一部だけを無視して同名宣言を
後勝ちにするfallbackはありません。

共通rollback順は次のとおりです。

1. 問題のある既定OFF surface flagをOFFにする。
2. 外部capabilityの正確なpackage versionと`pnpm-lock.yaml`を直前の組合せへ戻す。
3. versioned release sourceとdownload catalogのchecksum／source commitを戻す。
4. `pnpm verify:full`と`pnpm sb3:dsl4-release:check`を再実行する。
5. 検証済みsiteとartifactを再公開する。

## feature flag一覧

`src/dsl4/feature-flags.js`の`dsl4DefaultFeatureFlags`では次のflagがすべて`false`です。
`resolveDsl4FeatureFlags()`は起動時に未知key、boolean型、依存関係を検査し、deep-frozen snapshotを返します。
実行中に一部だけ変更しません。

| flag                               | 有効化する境界                          | 依存・OFF時のfallback              |
| ---------------------------------- | --------------------------------------- | ---------------------------------- |
| `dsl4Runtime`                      | DSL 4.0 runtime                         | coreを起動しない                   |
| `dsl4SourceIncludes`               | Source Graph include                    | 単一source                         |
| `dsl4AppShell`                     | Standard app shell                      | shell／runtime hostを作らない      |
| `dsl4WebPreviewAdapter`            | read-only Browser Web Preview           | CLI previewまたはone-shot          |
| `dsl4WebPreviewAssetLiveReload`    | Browser asset reload                    | source reloadまたはfull rebuild    |
| `dsl4PreviewReloadOverlay`         | preview diagnostic overlay              | 診断dataのみ                       |
| `dsl4PoseFeedbackModes`            | pose feedback表示mode                   | feedback UIなし                    |
| `dsl4PosePreviewMirroring`         | camera preview mirroring                | mirroring UIなし                   |
| `dsl4CameraPreviewControls`        | camera選択UI                            | camera menuなし                    |
| `dsl4SpeechAdvanceTypewriter`      | think、advance待ち、typewriter          | 基本speech                         |
| `structuredDataIntegrationEnabled` | runtimeのStructured Data Action Context | Structured Data handleを注入しない |

app shellはruntime、source includeはruntime、Web Preview adapterはruntimeとapp shell、asset live reloadは
さらにWeb Preview adapter、reload overlayはruntimeとapp shell、advanced speechはruntimeを必要とします。
flag値を文書だけで変更したり、既定ONへ読み替えたりしません。

## 変更時の検証matrix

| 変更対象                        | 最低限の直接test                                                 | bundle・surface確認                                      |
| ------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| package pin・composition import | `dsl4-extension-pins`、`dsl4-capability-bundle-release-contract` | `dsl4-downloadable-release`、`dsl4-artifact-fingerprint` |
| actor・media・speech            | `dsl4-actor-action-port`、`dsl4-media-action-port`               | `dsl4-turbowarp-runtime-host`                            |
| asset・cache                    | `dsl4-asset-manager-adapter`、`dsl4-platform-asset-session`      | embedded／remote asset lifecycle                         |
| TMPose・camera                  | `dsl4-tmpose-model-adapter`、`dsl4-pose-action-port`             | camera controls、runtime host                            |
| SVG Text                        | `dsl4-svg-text-action-port`                                      | runtime host                                             |
| Async Input                     | `dsl4-async-input-action-port`、`dsl4-input-arbitration`         | pose action port                                         |
| Runtime Expression              | expression diagnostic boundaries                                 | source frontend、runtime host                            |
| Structured Data                 | structured data、adapter、runtime integration                    | app-shell contract                                       |
| Browser Preview                 | browser preview source adapter、web preview shell                | preview production exclusion                             |
| CLI Preview transport           | preview transport policy、local preview host／CLI                | preview protocol、production exclusion                   |

最終的には本体repositoryで次を実行します。

```bash
pnpm verify:full
pnpm sb3:dsl4-release:check
```

Standard artifactについて、登録数が1、remote extension codeが0、preview fieldが0、固定package pinと
lockfile integrityが一致することまで確認してから公開します。
