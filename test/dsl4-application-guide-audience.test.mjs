import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {documentationConfig} from '../docs/config.mjs';

const read = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const guide = read('docs/developer-guides/application-materials-guide-4.0.md');
const dsl4Index = read('site/4.0/index.html');
const expectedAudience = '教材・ワークショップ設計者、制作環境担当者、プレビュー／ビルド確認者';

test('keeps the application guide audience aligned across source, config, and site', () => {
  const publication = documentationConfig.documents.find(
    ({sourceFilename}) => sourceFilename === 'application-materials-guide-4.0.md',
  );

  assert.equal(publication?.audience, expectedAudience);
  assert.match(guide, new RegExp(`対象: ${expectedAudience}`, 'u'));
  assert.match(dsl4Index, /教材・ワークショップ設計者、制作環境担当者、プレビュー／ビルド確認者/u);
});

test('positions the guide as optional detail with purpose-specific routes', () => {
  assert.match(guide, /新規作品を作る全員の必須手順書でもありません/u);
  assert.match(guide, /新規作者が制作の仕組みを確認する/u);
  assert.match(guide, /教材・ワークショップを設計する/u);
  assert.match(guide, /制作環境と配布手順を整える/u);
  assert.match(guide, /実装を調査・保守する/u);
  assert.match(guide, /開発者向けドキュメント/u);
  assert.match(guide, /教材設計者にソフトウェア実装の知識を前提とするものではありません/u);
  assert.match(guide, /作品を作る: \[紙芝居DSL 4\.0 台本作成ガイド\]/u);
  assert.match(
    guide,
    /実装を理解・保守する: \[紙芝居アプリ 4\.0 ソフトウェアメンテナンスガイド\]/u,
  );

  const beginnerPath = dsl4Index.match(/<h3>初めて4\.0を知る<\/h3>[\s\S]*?<\/article>/u)?.[0];
  assert.ok(beginnerPath);
  assert.doesNotMatch(beginnerPath, /application-materials-guide-4\.0/u);
});
