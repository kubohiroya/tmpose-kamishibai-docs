import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {documentationConfig} from '../docs/config.mjs';

const dsl4Summary = readFileSync(
  new URL('../docs/user-guides/executive-summary-adult-4.0.md', import.meta.url),
  'utf8',
);
const dsl32Summary = readFileSync(
  new URL('../docs/user-guides/executive-summary-adult.md', import.meta.url),
  'utf8',
);
const dsl40Index = readFileSync(new URL('../site/4.0/index.html', import.meta.url), 'utf8');

test('publishes the adult overview as an independent DSL 4.0 document', () => {
  const dsl4Document = documentationConfig.documents.find(
    ({sourceFilename}) => sourceFilename === 'executive-summary-adult-4.0.md',
  );
  const dsl32Document = documentationConfig.documents.find(
    ({sourceFilename}) => sourceFilename === 'executive-summary-adult.md',
  );

  assert.equal(dsl4Document?.version, '4.0');
  assert.equal(dsl4Document?.outputDirectory, '4.0/user-guides');
  assert.equal(dsl4Document?.legacyOutputDirectory, 'user-guides');
  assert.equal(dsl32Document?.version, '3.2');
  assert.equal(dsl32Document?.outputDirectory, '3.2/user-guides');
  assert.match(dsl32Summary, /^# 紙芝居アプリ 3\.2 概要説明書 大人向け$/mu);
  assert.match(dsl4Summary, /^# 紙芝居アプリ 4\.0 概要説明書 大人向け$/mu);
  assert.match(dsl4Summary, /対象仕様: `kamishibai: '4\.0'`/u);
  assert.match(dsl40Index, /href="user-guides\/executive-summary-adult-4\.0\/"/u);
  assert.match(dsl40Index, /4\.0\/user-guides\/executive-summary-adult-4\.0\/publication\.json/u);
});

test('grounds the adult overview in completed DSL 4.0 surfaces', () => {
  for (const expected of [
    '79457815f5c89b181b1a879a079a4d6a72d405ed',
    'project.source.json',
    'Source Graph',
    'StoryDocument',
    'Web Preview',
    'validate-dsl4',
    'preview-dsl4',
    'build-dsl4',
    '自己完結SB3',
    'カメラプレビュー',
    'poseModel',
    '教育・ワークショップでの利用',
  ]) {
    assert.match(dsl4Summary, new RegExp(expected, 'u'));
  }
});

test('does not mix DSL 3.x syntax or delivery contracts into the DSL 4.0 source', () => {
  for (const forbidden of [
    /DSL 3\.[12]/u,
    /kamishibai=3\.[12]/u,
    /\.txt\b/iu,
    /(?:^|`)action=/mu,
    /sceneLabel/u,
    /外部TXT/u,
    /汎用SB3/u,
    /編集用SB3/u,
    /再生用SB3/u,
    /移行(?:手順|方法|説明)/u,
  ]) {
    assert.doesNotMatch(dsl4Summary, forbidden);
  }
});
