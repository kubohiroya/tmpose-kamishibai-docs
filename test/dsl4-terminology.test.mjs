import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const writingStyle = read('WRITING-STYLE.md');
const adultOverview = read('docs/user-guides/executive-summary-adult-4.0.md');
const applicationGuide = read('docs/developer-guides/application-materials-guide-4.0.md');
const dsl4Index = read('site/4.0/index.html');

test('documents the Japanese prose policy without translating code identifiers', () => {
  assert.match(writingStyle, /本文の説明は日本語を基本/u);
  assert.match(writingStyle, /コード上の名前は翻訳しない/u);
  assert.match(writingStyle, /Source Graph/u);
  assert.match(writingStyle, /StoryDocument/u);
  assert.match(writingStyle, /世代（generation）/u);
  assert.match(writingStyle, /候補（candidate）/u);
});

test('uses consistent Japanese terms in the first-read DSL 4.0 surfaces', () => {
  for (const source of [adultOverview, applicationGuide, dsl4Index]) {
    for (const mixedPhrase of [
      /YAML project/u,
      /project directory/u,
      /preview・build/u,
      /camera映像/u,
      /人・AI・program/u,
      /制作cycle/u,
    ]) {
      assert.doesNotMatch(source, mixedPhrase);
    }
  }

  assert.match(adultOverview, /プロジェクトから上演まで/u);
  assert.match(adultOverview, /カメラプレビュー/u);
  assert.match(applicationGuide, /プレビュー・ビルド/u);
  assert.match(dsl4Index, /YAMLプロジェクト/u);
});

test('retains exact commands, files, and schema identifiers', () => {
  for (const expected of [
    'project.source.json',
    'validate-dsl4',
    'preview-dsl4',
    'build-dsl4',
    'StoryDocument',
  ]) {
    assert.match(adultOverview, new RegExp(expected, 'u'));
  }

  assert.match(applicationGuide, /--project-root/u);
  assert.match(applicationGuide, /--source-manifest/u);
});
