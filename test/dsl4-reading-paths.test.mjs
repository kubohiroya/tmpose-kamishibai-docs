import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const dsl4Index = read('site/4.0/index.html');
const adultOverview = read('docs/user-guides/executive-summary-adult-4.0.md');
const childOverview = read('docs/user-guides/executive-summary-kids-4.0.md');
const applicationGuide = read('docs/developer-guides/application-materials-guide-4.0.md');
const authorGuide = read('docs/dsl-author-guides/dsl-4.0-author-guide.md');
const conversionGuide = read('docs/dsl-author-guides/dsl-3.2-to-4.0-conversion-guide.md');
const schemaReference = read('docs/dsl-author-guides/dsl-4.0-schema-reference.md');
const developerGuide = read('docs/developer-guides/developer-guide-4.0.md');
const internalSpecification = read('docs/developer-guides/internal-specification-4.0.md');
const extensionGuide = read('docs/developer-guides/extension-guide-4.0.md');
const diagnosticsDesign = read('docs/developer-guides/dsl-4.0-diagnostics-design.md');

test('offers purpose-specific progressive reading paths on the DSL 4.0 top page', () => {
  assert.match(dsl4Index, /目的に合う順番で読む/u);
  for (const pathTitle of [
    '初めて4.0を知る',
    '新しい作品を作る',
    '3.1／3.2作品を移行する',
    '実装を理解・保守する',
  ]) {
    assert.match(dsl4Index, new RegExp(pathTitle, 'u'));
  }
  assert.match(dsl4Index, /Schemaリファレンスは通読用ではなく/u);

  const beginnerPath = dsl4Index.match(/<h3>初めて4\.0を知る<\/h3>[\s\S]*?<\/article>/u)?.[0];
  assert.ok(beginnerPath);
  assert.match(beginnerPath, /executive-summary-adult-4\.0/u);
  assert.match(beginnerPath, /executive-summary-kids-4\.0/u);
  assert.doesNotMatch(beginnerPath, /application-materials-guide-4\.0/u);

  const authorCard = dsl4Index.indexOf('> 紙芝居DSL 4.0 台本作成ガイド</h3>');
  const schemaCard = dsl4Index.indexOf('> 紙芝居DSL 4.0 Schemaリファレンス</h3>');
  const conversionCard = dsl4Index.indexOf('> 紙芝居DSL 3.2から4.0への変換ガイド</h3>');
  assert.ok(authorCard >= 0);
  assert.ok(schemaCard > authorCard);
  assert.ok(conversionCard > schemaCard);
});

test('connects overview, authoring, reference, and implementation documents without prerequisite jumps', () => {
  assert.match(adultOverview, /## 4\.0を理解するための全体像/u);
  assert.match(adultOverview, /## 人・AI・プログラムの役割/u);
  assert.match(adultOverview, /## 制作のサイクル/u);
  assert.match(adultOverview, /この文書を読み終えた時点で、4\.0の概要把握は完了/u);
  assert.match(adultOverview, /アプリ・教材・ツールチェインガイド/u);
  assert.doesNotMatch(childOverview, /アプリ・教材・ツールチェインガイド/u);
  assert.match(applicationGuide, /初めて4\.0の全体像を知るための概要説明書ではありません/u);
  assert.match(applicationGuide, /ソフトウェアメンテナンスガイド/u);

  assert.match(authorGuide, /## このガイドの読み進め方/u);
  assert.match(authorGuide, /Schemaリファレンスは最初から通読せず/u);
  assert.match(conversionGuide, /## このガイドの位置づけ/u);
  assert.match(conversionGuide, /既存TXT台本を安全にYAMLへ変換/u);
  assert.match(schemaReference, /このリファレンスは先頭から通読する手順書ではありません/u);

  assert.match(developerGuide, /## このガイドの読み進め方/u);
  assert.match(internalSpecification, /## 読む前に/u);
  assert.match(extensionGuide, /## 読む前に/u);
  assert.match(diagnosticsDesign, /## 読む前に/u);
  assert.match(internalSpecification, /アプリ・教材・ツールチェインガイド/u);
  assert.match(extensionGuide, /内部仕様書/u);
  assert.match(diagnosticsDesign, /機能拡張・プラットフォーム統合ガイド/u);
});

test('uses focused rendered diagrams for relationships that span multiple stages or owners', () => {
  const documentsWithDiagrams = [
    adultOverview,
    authorGuide,
    conversionGuide,
    internalSpecification,
    extensionGuide,
    diagnosticsDesign,
  ];

  for (const source of documentsWithDiagrams) {
    assert.equal((source.match(/<figure class="concept-flow">/gu) ?? []).length, 1);
    assert.match(source, /<figcaption>.+<\/figcaption>/u);
    assert.match(source, /concept-flow__track/u);
  }

  assert.match(adultOverview, /project<br>YAML・画像・音・pose model/u);
  assert.match(authorGuide, /最小台本[\s\S]*projectとasset[\s\S]*sceneとaction/u);
  assert.match(conversionGuide, /3\.1／3\.2 TXT[\s\S]*convert-dsl4[\s\S]*4\.0 YAML/u);
  assert.match(internalSpecification, /Source Graph[\s\S]*StoryDocument[\s\S]*Runtime controller/u);
  assert.match(extensionGuide, /Port contract[\s\S]*Platform composition/u);
  assert.match(diagnosticsDesign, /validate[\s\S]*commit[\s\S]*安全停止/u);
});
