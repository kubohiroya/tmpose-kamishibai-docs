import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import Ajv2020 from 'ajv/dist/2020.js';
import {parse} from 'yaml';

import sourceSnapshot from '../sources/tmpose-kamishibai.json' with {type: 'json'};

const extensionGuide = readFileSync(
  new URL('../docs/developer-guides/extension-guide.md', import.meta.url),
  'utf8',
);
const extensionGuide4 = readFileSync(
  new URL('../docs/developer-guides/extension-guide-4.0.md', import.meta.url),
  'utf8',
);
const applicationGuide = readFileSync(
  new URL('../docs/developer-guides/application-materials-guide.md', import.meta.url),
  'utf8',
);
const applicationGuide4 = readFileSync(
  new URL('../docs/developer-guides/application-materials-guide-4.0.md', import.meta.url),
  'utf8',
);
const commandReference = readFileSync(
  new URL('../docs/dsl-author-guides/command-reference.md', import.meta.url),
  'utf8',
);
const dslManual = readFileSync(
  new URL('../docs/dsl-author-guides/dsl-manual.md', import.meta.url),
  'utf8',
);
const dsl4AuthorGuide = readFileSync(
  new URL('../docs/dsl-author-guides/dsl-4.0-author-guide.md', import.meta.url),
  'utf8',
);
const dsl4ConversionGuide = readFileSync(
  new URL('../docs/dsl-author-guides/dsl-3.2-to-4.0-conversion-guide.md', import.meta.url),
  'utf8',
);
const dsl4SchemaReference = readFileSync(
  new URL('../docs/dsl-author-guides/dsl-4.0-schema-reference.md', import.meta.url),
  'utf8',
);
const dsl4Schema = JSON.parse(
  readFileSync(new URL('../sources/dsl4/dsl-4.schema.json', import.meta.url), 'utf8'),
);
const developerGuide4 = readFileSync(
  new URL('../docs/developer-guides/developer-guide-4.0.md', import.meta.url),
  'utf8',
);
const internalSpecification = readFileSync(
  new URL('../docs/developer-guides/internal-specification.md', import.meta.url),
  'utf8',
);
const internalSpecification4 = readFileSync(
  new URL('../docs/developer-guides/internal-specification-4.0.md', import.meta.url),
  'utf8',
);
const diagnosticsDesign31 = readFileSync(
  new URL('../docs/developer-guides/dsl-3.1-diagnostics-design.md', import.meta.url),
  'utf8',
);
const diagnosticsDesign4 = readFileSync(
  new URL('../docs/developer-guides/dsl-4.0-diagnostics-design.md', import.meta.url),
  'utf8',
);
const theme = readFileSync(new URL('../docs/general-theme.css', import.meta.url), 'utf8');

test('keeps the completed DSL 4.0 guide separate from the production 3.2 manual', () => {
  assert.match(dslManual, /対象アプリ: tmpose-kamishibai 3\.2\.x/u);
  assert.match(dsl4AuthorGuide, /固定実装基準を説明する台本作成ガイド/u);
  assert.match(dsl4AuthorGuide, /v4\.0\.0`は未公開/u);
  assert.match(dsl4AuthorGuide, /Schemaはruntime実装から生成するものではありません/u);
  assert.match(dsl4AuthorGuide, /kamishibai: '4\.0'/u);
  assert.match(dsl4AuthorGuide, /\.kamishibai\.yaml/u);
  assert.match(dsl4AuthorGuide, /K4-SCHEMA-UNKNOWN-KEY/u);
  assert.match(dsl4AuthorGuide, /紙芝居DSL 4\.0 Schemaリファレンス/u);
  assert.match(dsl4AuthorGuide, /camera previewの表示と操作UI/u);
  assert.match(dsl4AuthorGuide, /path.*省略時は後方互換の既定値`story\.kamishibai\.yaml`/u);
  assert.match(dsl4AuthorGuide, /Web Previewで選択するのはYAML fileではなく/u);
  assert.match(dsl4AuthorGuide, /Local assetの追加と内容更新/u);
  assert.match(dsl4AuthorGuide, /一つのtransactionへ束ねるatomicityは保証しません/u);
  assert.match(dsl4AuthorGuide, /Actor\.say`と`Actor\.think/u);
  assert.match(dsl4AuthorGuide, /`seconds`だけなら表示開始から指定秒数後/u);
  assert.match(dsl4AuthorGuide, /Unicode grapheme cluster/u);
  assert.match(dsl4AuthorGuide, /`easing`は`linear`、`easeIn`、`easeOut`、`easeInOut`/u);
  assert.match(dsl4AuthorGuide, /`Actor\.setTransparency`の即時指定/u);
  assert.match(dsl4AuthorGuide, /`0`は完全不透明/u);
  assert.match(dsl4AuthorGuide, /台本を複数sourceへ分割する/u);
  assert.match(dsl4AuthorGuide, /同じnamespaceの同じID/u);
  assert.match(dsl4AuthorGuide, /`K4-INCLUDE-CYCLE`/u);
  assert.match(dsl4AuthorGuide, /`--max-total-source-bytes`/u);
  assert.match(dsl4AuthorGuide, /宣言元を基準に/u);
  assert.doesNotMatch(dsl4AuthorGuide, /file: assets\/ocean\.svg/u);
  assert.doesNotMatch(dsl4AuthorGuide, /file: pose-models\/rescue/u);
  assert.match(
    dsl4AuthorGuide,
    /端末固有の物理device IDは台本、StoryDocument、`variables`へ保存しません/u,
  );
  assert.match(dsl4AuthorGuide, /前sceneの値を持ち越しません/u);
  assert.match(dsl4SchemaReference, /固定実装基準を説明するSchemaリファレンス/u);
  assert.match(dsl4SchemaReference, /v4\.0\.0`は正式リリースされていません/u);
  assert.match(dsl4SchemaReference, /権威関係と配布状態/u);
  assert.match(dsl4SchemaReference, /Schemaはruntime実装から生成しません/u);
  assert.match(dsl4SchemaReference, /Schema固定commit: \[`7945781`\]/u);
  assert.match(dsl4SchemaReference, /トップレベル12 field、action 19種類、Annotation 71項目/u);
  assert.doesNotMatch(dslManual, /kamishibai: '4\.0'/u);
  assert.doesNotMatch(dsl4AuthorGuide, /DSL 3\.[12]|kamishibai=3\.[12]/u);
  assert.doesNotMatch(dsl4SchemaReference, /DSL 3\.[12]|kamishibai=3\.[12]/u);
});

test('grounds the DSL 4.0 internal specification in the completed implementation', () => {
  assert.match(internalSpecification4, /79457815f5c89b181b1a879a079a4d6a72d405ed/u);
  for (const boundary of [
    'createDsl4SourceFrontend',
    'createDsl4SourceGraph',
    'createDsl4SourceGraphFrontend',
    'createStoryDocument',
    'createDsl4RuntimeController',
    'createDsl4ActionInvocationAdapter',
    'createDsl4TurboWarpRuntimeEnvironment',
    'createDsl4LiveReloadSession',
    'createDsl4AssetReloadTransaction',
  ]) {
    assert.match(internalSpecification4, new RegExp(`\\b${boundary}\\b`, 'u'), boundary);
  }
  for (const event of [
    'runtime.start',
    'scene.transition',
    'action.start',
    'action.commit',
    'runtime.fail',
    'preview.asset.committed',
  ]) {
    assert.match(internalSpecification4, new RegExp(event.replaceAll('.', '\\.'), 'u'), event);
  }
  for (const flag of [
    'dsl4Runtime',
    'dsl4SourceIncludes',
    'dsl4AppShell',
    'dsl4WebPreviewAdapter',
    'dsl4WebPreviewAssetLiveReload',
    'dsl4CustomActionsEnabled',
  ]) {
    assert.match(internalSpecification4, new RegExp(`\\b${flag}\\b`, 'u'), flag);
  }
  assert.match(
    internalSpecification4,
    /Browser Web Preview[\s\S]*CLI Preview[\s\S]*Production SB3/u,
  );
  assert.match(internalSpecification4, /test\/dsl4-architecture\.test\.mjs/u);
  assert.doesNotMatch(internalSpecification4, /kamishibai=3\.[12]|actionTarget|broadcast message/u);
  assert.match(internalSpecification, /^# 紙芝居アプリ 3\.2 内部仕様書$/mu);
});

test('documents DSL 4.0 capabilities and platform integrations from the completed implementation', () => {
  assert.match(extensionGuide4, /79457815f5c89b181b1a879a079a4d6a72d405ed/u);
  assert.match(extensionGuide4, /3\.2 機能拡張ガイド/u);
  assert.match(extensionGuide4, /その文書と公開URLは変更しません/u);
  assert.match(extensionGuide4, /kubohiroyakamishibairuntime4/u);
  assert.match(extensionGuide4, /一度だけ`Scratch\.extensions\.register\(\)`/u);
  assert.match(extensionGuide4, /source-composition/u);

  for (const dependency of [
    '@kubohiroya/turbowarp-asset-manager@0.7.0',
    '@kubohiroya/turbowarp-async-input@0.3.0',
    '@kubohiroya/turbowarp-runtime-expression@0.3.0',
    '@kubohiroya/turbowarp-svg-text@0.3.0',
    '@kubohiroya/turbowarp-tmpose@1.6.1',
  ]) {
    assert.match(
      extensionGuide4,
      new RegExp(dependency.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'),
    );
  }

  for (const boundary of [
    'createDsl4TurboWarpRuntimeEnvironment',
    'createDsl4ActorActionPort',
    'createDsl4MediaActionPort',
    'createDsl4PlatformAssetSession',
    'createDsl4AssetManagerAdapter',
    'createDsl4TMPosePlatform',
    'createDsl4PoseActionPort',
    'createDsl4CameraPreviewControls',
    'createDsl4SvgTextPlatform',
    'createDsl4AsyncInputActionPort',
    'createDsl4StructuredDataComposition',
    'createDsl4BrowserPreviewSourceAdapter',
    'createDsl4PreviewTransportPolicy',
  ]) {
    assert.match(extensionGuide4, new RegExp(`\\b${boundary}\\b`, 'u'), boundary);
  }

  assert.match(extensionGuide4, /Browser Web Preview[\s\S]*CLI Preview[\s\S]*Production SB3/u);
  assert.match(extensionGuide4, /責務と入出力/u);
  assert.match(extensionGuide4, /失敗、権限、fallback、bundle/u);
  assert.match(extensionGuide4, /Scratch\.extensions\.unsandboxed/u);
  assert.match(extensionGuide4, /remote extension codeは禁止/u);
  assert.match(extensionGuide4, /すべて`false`/u);
  assert.match(extensionGuide4, /共通rollback順/u);
  assert.match(extensionGuide4, /画像、editor capture、外部図版を新規使用しません/u);
  assert.match(extensionGuide4, /CC BY-SA 4\.0/u);
  assert.match(extensionGuide4, /MPL-2\.0/u);
  assert.doesNotMatch(extensionGuide4, /\.\.\/images\/|<img|!\[/u);
  assert.doesNotMatch(extensionGuide4, /1拡張2ページで図解|全34ページ/u);
});

test('reviews DSL 4.0 diagnostics and safe stopping from the completed implementation', () => {
  assert.match(diagnosticsDesign4, /79457815f5c89b181b1a879a079a4d6a72d405ed/u);
  for (const boundary of [
    'createDsl4SourceFrontend',
    'normalizeDsl4DiagnosticSequence',
    'createDsl4SourceGraph',
    'createDsl4SourceGraphFrontend',
    'createDsl4LiveReloadSession',
    'createDsl4AssetReloadTransaction',
    'createDsl4RuntimeController',
    'createDsl4TurboWarpRuntimeEnvironment',
    'installBundleTransactionally',
  ]) {
    assert.match(diagnosticsDesign4, new RegExp(`\\b${boundary}\\b`, 'u'), boundary);
  }
  for (const code of [
    'K4-YAML-001',
    'K4-SCHEMA-001',
    'K4-REF-001',
    'K4-INCLUDE-CYCLE',
    'K4-ASSET-PREPARE-001',
    'K4-ASSET-ROLLBACK-001',
    'K4-RUNTIME-ACTION-001',
    'K4-RELOAD-QUIESCE-TIMEOUT',
    'K4-HOST-PORT-MISSING',
  ]) {
    assert.match(diagnosticsDesign4, new RegExp(`\\b${code}\\b`, 'u'), code);
  }
  assert.match(diagnosticsDesign4, /sourceId[\s\S]*range[\s\S]*storyPath[\s\S]*related/u);
  assert.match(diagnosticsDesign4, /AJVの`instancePath`[\s\S]*JSON Pointer/u);
  assert.match(
    diagnosticsDesign4,
    /`stableId`、`sceneId`、`actionIndex`[\s\S]*canonical diagnosticのfieldではありません/u,
  );
  assert.match(diagnosticsDesign4, /`Error\.cause`と`AggregateError\.errors`は内部調査/u);
  assert.match(diagnosticsDesign4, /invalid candidateを捨て、current sessionを継続/u);
  assert.match(diagnosticsDesign4, /next startが失敗[\s\S]*自動rollbackで復活させず/u);
  assert.match(
    diagnosticsDesign4,
    /generic `runtime-controller\.fail\(\)`は任意のplatform `Error\.message`を自動redactせず/u,
  );
  assert.match(
    diagnosticsDesign4,
    /Browser Web Preview[\s\S]*CLI Preview[\s\S]*Production SB3 runtime/u,
  );
  assert.match(diagnosticsDesign4, /test\/dsl4-diagnostic-sequence-policy\.test\.mjs/u);
  assert.match(diagnosticsDesign4, /test\/dsl4-preview-source-generation-wire\.test\.mjs/u);

  const currentDsl4Contract = diagnosticsDesign4.slice(
    diagnosticsDesign4.indexOf('## レビュー結論'),
  );
  assert.doesNotMatch(
    currentDsl4Contract,
    /K31-|dsl31Contract|featureDetailedScriptErrors|runtime\.stopAll\(\)/u,
  );
  assert.match(diagnosticsDesign31, /^# DSL 3\.1 台本診断・安全停止 設計レビュー$/mu);
});

test('documents the DSL 3.2 to 4.0 converter as a dedicated migration guide', () => {
  assert.match(dsl4ConversionGuide, /tmpose-kamishibai convert-dsl4/u);
  assert.match(dsl4ConversionGuide, /--input source\.txt/u);
  assert.match(dsl4ConversionGuide, /--output story\.k4\.yml/u);
  assert.match(dsl4ConversionGuide, /--pose-models pose-models\.json/u);
  assert.match(dsl4ConversionGuide, /入力と同じpathは指定できません/u);
  assert.match(dsl4ConversionGuide, /URLとproject内のlocal `poseModel` asset/u);
  assert.match(dsl4ConversionGuide, /poseInputToChangeScene`を生成しません/u);
  assert.match(dsl4ConversionGuide, /fullConfidenceHoldSeconds = 10 \/ poseCharge/u);
  assert.match(dsl4ConversionGuide, /`delivery: remote`/u);
  assert.match(dsl4ConversionGuide, /`integrity`、`contentType`、`size`/u);
  assert.match(dsl4ConversionGuide, /error時は途中までの\nYAMLを残さず既存出力を維持/u);
  assert.match(dsl4ConversionGuide, /convertDsl32ToDsl4/u);
  assert.match(dsl4ConversionGuide, /convertDsl32File/u);
});

test('keeps the DSL 3.x reference hand-authored', () => {
  assert.match(commandReference, /過去リリースから引き継いだ手書きMarkdownを正本/u);
  assert.match(commandReference, /DSL 3\.2専用リファレンス/u);
  assert.match(commandReference, /HTML版とVivliostyle Viewer版/u);
  assert.doesNotMatch(commandReference, /DSL 4\.0/u);
});

test('publishes a DSL 4.0-only software maintenance contract from the completed implementation', () => {
  assert.match(developerGuide4, /79457815f5c89b181b1a879a079a4d6a72d405ed/u);
  assert.match(developerGuide4, /sources\/dsl4\/source-lock\.json/u);
  assert.match(developerGuide4, /schema\/dsl-4\.schema\.json/u);
  assert.match(developerGuide4, /src\/dsl4\/source-graph-frontend\.js/u);
  assert.match(developerGuide4, /src\/dsl4\/live-reload-session\.js/u);
  assert.match(developerGuide4, /src\/dsl4\/browser-preview-source-adapter\.js/u);
  assert.match(developerGuide4, /src\/builder\/dsl4-local-preview-host\.js/u);
  assert.match(developerGuide4, /src\/builder\/dsl4-build-output\.js/u);
  assert.match(developerGuide4, /pnpm exec tmpose-kamishibai validate-dsl4/u);
  assert.match(developerGuide4, /pnpm exec tmpose-kamishibai preview-dsl4/u);
  assert.match(developerGuide4, /pnpm exec tmpose-kamishibai build-dsl4/u);
  assert.match(developerGuide4, /--enable-source-includes/u);
  assert.match(developerGuide4, /--max-total-source-bytes/u);
  assert.match(developerGuide4, /deep-frozen StoryDocument/u);
  assert.match(developerGuide4, /remote extension codeと\nremote previewは常に禁止/u);
  assert.match(developerGuide4, /release-sources\/4\.0\.0-dev\/app/u);
  assert.match(developerGuide4, /kamishibai-4\.0\.sb3/u);
  assert.match(developerGuide4, /pnpm verify:full/u);
  assert.match(developerGuide4, /pnpm sb3:dsl4-release:check/u);
  assert.match(developerGuide4, /npmへ公開済みのversionは上書きせず/u);
  assert.doesNotMatch(
    developerGuide4,
    /build-sb3|source\.txt|assets\.lock\.json|kamishibai=3\.[12]|TXT parser/u,
  );
});

test('keeps the DSL 4.0 complete example valid against the pinned Schema', () => {
  const completeExampleSection = dsl4AuthorGuide.slice(dsl4AuthorGuide.indexOf('## 総合サンプル'));
  const source = completeExampleSection.match(/```yaml\n([\s\S]*?)\n```/u)?.[1];
  assert.ok(source, 'The DSL 4.0 complete example must exist.');
  const AjvConstructor = /** @type {any} */ (Ajv2020);
  const validate = new AjvConstructor({allErrors: true, strict: false}).compile(dsl4Schema);
  assert.equal(validate(parse(source)), true, JSON.stringify(validate.errors));
});

test('documents named SVG Text styles for say and think actions', () => {
  for (const guide of [commandReference, dslManual]) {
    assert.match(guide, /action=Hero:say:こんにちは:5\.0:baloonStyle/u);
    assert.match(guide, /action=Hero:think:考え中:5\.0:baloonStyle/u);
    assert.match(guide, /action=ACTOR:say\|think:TEXT:SECONDS:STYLE/u);
    assert.match(guide, /default/u);
  }
  assert.match(internalSpecification, /actionParam3/u);
  assert.match(internalSpecification, /sayWithStyle/u);
  assert.match(internalSpecification, /thinkWithStyle/u);
  assert.match(extensionGuide, /sayWithStyle/u);
  assert.match(extensionGuide, /thinkWithStyle/u);
});

test('keeps the extension guide as an index, bundle explanation, and sixteen two-page entries', () => {
  const sheetIds = [
    ...extensionGuide.matchAll(/^## .+ \{#([^ ]+) \.extension-sheet(?: [^}]+)?\}$/gmu),
  ];
  const leftSheets = extensionGuide.match(/\.extension-sheet-left\}/gu) ?? [];
  const rightSheets = extensionGuide.match(/\.extension-sheet-right\}/gu) ?? [];
  const rightHeadings = [
    ...extensionGuide.matchAll(/^## (.+) \{#[^ ]+ \.extension-sheet \.extension-sheet-right\}$/gmu),
  ].map(([, heading]) => heading);
  assert.equal(sheetIds.length, 33);
  assert.equal(leftSheets.length, 16);
  assert.equal(rightSheets.length, 16);
  assert.equal(rightHeadings.length, 16);
  assert.ok(rightHeadings.every((heading) => heading.includes('で') && !heading.includes(' — ')));
  assert.equal((extensionGuide.match(/<a href="#extension-[^"]+">/gu) ?? []).length, 16);
  assert.equal((extensionGuide.match(/extension-gallery-[^"]+\.svg/gu) ?? []).length, 7);
  const editorCaptures = [
    ...extensionGuide.matchAll(/\.\.\/images\/(extension-editor-[^"]+\.png)/gu),
  ].map(([, filename]) => filename);
  assert.equal(editorCaptures.length, 16);
  assert.equal(new Set(editorCaptures).size, 16);
  const editorCaptureDimensions = editorCaptures.map((filename) => {
    const png = readFileSync(new URL(`../docs/images/${filename}`, import.meta.url));
    return [png.readUInt32BE(16), png.readUInt32BE(20)];
  });
  assert.ok(editorCaptureDimensions.every(([width, height]) => width <= 1400 && height <= 600));
  assert.ok(editorCaptureDimensions.every(([width, height]) => width * height >= 50_000));
  assert.ok(editorCaptureDimensions.filter(([width]) => width >= 800).length >= 7);
  assert.ok(
    new Set(editorCaptureDimensions.map(([width, height]) => `${width}x${height}`)).size >= 10,
  );
  assert.doesNotMatch(extensionGuide, /class="tw-/u);
  assert.equal((extensionGuide.match(/class="extension-kamishibai-why"/gu) ?? []).length, 16);
  assert.equal((extensionGuide.match(/機能拡張そのもの 1 \/ 2/gu) ?? []).length, 16);
  assert.equal((extensionGuide.match(/TMPose 紙芝居での利用例 2 \/ 2/gu) ?? []).length, 16);
  assert.match(extensionGuide, /^## TMPose — 学習済みモデルでカメラ映像のポーズを認識する /mu);
  assert.doesNotMatch(extensionGuide, /cameraをpose名へ変える/u);
  assert.match(extensionGuide, /^## Web Link — HTTPS URLを検証し、新しいタブで開く /mu);
  assert.match(
    extensionGuide,
    /^## Web Linkで利用者がボタンやメニューを操作したとき、設定済みのHTTPSページを開く /mu,
  );
  assert.doesNotMatch(extensionGuide, /公式URLだけを開く|title buttonからだけ開く/u);
  assert.match(theme, /content: ['"]TMPose 紙芝居での利用例['"];/u);
  assert.doesNotMatch(`${extensionGuide}\n${theme}`, /TMPose紙芝居での利用/u);
  assert.match(
    extensionGuide,
    /このアプリの体験会を実施する場合を想定すると、参加者が書いたTXT台本をその場ですぐ試してもらいたい一方、どのような技量・経験を持った参加者が集まるかがわからず時間的制約もある状況では、台本ごとにWebへ公開したりアプリを作り直したりはできません。/u,
  );
  const galleryFigures = [
    ...extensionGuide.matchAll(/<figure class="extension-gallery-banner">([\s\S]*?)<\/figure>/gu),
  ];
  assert.equal(galleryFigures.length, 7);
  for (const [, galleryFigure] of galleryFigures) {
    assert.doesNotMatch(galleryFigure, /<figcaption>/u);
  }
  assert.match(theme, /h2\.extension-sheet-left:first-child::before/u);
  assert.match(theme, /h2\.extension-sheet-right:first-child::before/u);
  for (const extensionId of sourceSnapshot.extensions) {
    assert.match(extensionGuide, new RegExp(`<code>${extensionId}</code>`, 'u'));
  }
  assert.match(extensionGuide, /\{#extension-bundle \.extension-sheet \.extension-bundle-sheet\}/u);
  assert.match(extensionGuide, /<code>tmposebundle<\/code>/u);
  assert.match(extensionGuide, /4 components → 1 ID/u);
  assert.match(extensionGuide, /<strong>16<\/strong>[\s\S]*<strong>13<\/strong>/u);
  assert.match(extensionGuide, /class="extension-dependency-map"/u);
  assert.equal((extensionGuide.match(/class="extension-dependency-row"/gu) ?? []).length, 4);
  const bundleSection = extensionGuide.slice(
    extensionGuide.indexOf('## 4拡張を1つのIDへまとめる'),
    extensionGuide.indexOf('## Consoles —'),
  );
  for (const extensionId of [
    'kubohiroyaassetmanager',
    'text',
    'kubohiroyakamishibairuntime',
    'kubohiroyasvgtext',
  ]) {
    assert.match(bundleSection, new RegExp(`<code>${extensionId}</code>`, 'u'));
  }
  assert.ok(
    extensionGuide.indexOf('#extension-consoles') <
      extensionGuide.indexOf('#extension-asset-manager'),
  );
  assert.ok(
    extensionGuide.indexOf('#extension-asset-manager') <
      extensionGuide.indexOf('#extension-kamishibai-runtime'),
  );
  const animatedTextExample = extensionGuide.slice(
    extensionGuide.indexOf('{#extension-animated-text-example '),
    extensionGuide.indexOf('{#extension-translate '),
  );
  assert.match(animatedTextExample, /接続済みscriptにAnimated Text blockはありません/u);
  assert.match(animatedTextExample, /text_setFont/u);
  assert.match(animatedTextExample, /text_setText/u);
  assert.match(animatedTextExample, /Asset ManagerからAnimated Text opcodeを取得する処理/u);
  assert.doesNotMatch(extensionGuide, /さぁ行こう/u);
  assert.doesNotMatch(extensionGuide, /ポーズをとろう！/u);
  assert.match(
    extensionGuide,
    /^## SVG Text — 名前付きスタイルで相対サイズの吹き出しとSVG文字を描画する /mu,
  );
  assert.match(extensionGuide, /@kubohiroya\/turbowarp-svg-text\/v\/0\.1\.0/u);
  assert.match(theme, /@page extension-guide\s*\{[\s\S]*size:\s*A4;/u);
});

test('keeps both versioned application guides in the requested eight-page allocation', () => {
  for (const guide of [applicationGuide, applicationGuide4]) {
    assert.deepEqual(
      [...guide.matchAll(/<p class="application-page-label">([1-8]) \/ 8/gmu)].map(([, number]) =>
        Number(number),
      ),
      [1, 2, 3, 4, 5, 6, 7, 8],
    );
    assert.doesNotMatch(
      guide,
      /<code>[^<]*\\n[^<]*<\/code>/gu,
      'DSL examples must use actual line breaks instead of escaped newline text.',
    );
  }
  assert.match(applicationGuide, /ポーズをとろう！/u);
  assert.match(applicationGuide, /kamishibai=3\.2/u);
  assert.doesNotMatch(applicationGuide, /kamishibai: '4\.0'/u);
  assert.match(applicationGuide, /b3f4b9aa3ed3ede363700be815fe522f6a47df0b/u);
  assert.match(applicationGuide4, /kamishibai: '4\.0'/u);
  assert.match(applicationGuide4, /Source Graph/u);
  assert.match(applicationGuide4, /build-dsl4/u);
  assert.doesNotMatch(applicationGuide4, /kamishibai=3\.2/u);
  assert.match(theme, /@page application-guide\s*\{[\s\S]*size:\s*A4;/u);
});
