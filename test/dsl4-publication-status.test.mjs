import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {documentationConfig, dsl4PublicationStatus} from '../docs/config.mjs';

const read = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const statusPolicy = read('DSL4-PUBLICATION-STATUS.md');
const dsl4Index = read('site/4.0/index.html');
const dsl4Documents = documentationConfig.documents
  .filter((document) => document.version === '4.0')
  .map((document) => read(`docs/${document.sourceDirectory}/${document.sourceFilename}`));

test('records the verified implementation and release state in config', () => {
  assert.deepEqual(dsl4PublicationStatus, {
    verifiedOn: '2026-08-08',
    implementationCommit: '79457815f5c89b181b1a879a079a4d6a72d405ed',
    latestPublishedRelease: 'v3.2.3',
    officialDsl4Release: null,
  });
});

test('distinguishes implementation, release, public surfaces, and document state', () => {
  for (const term of ['実装基準', 'リリース候補', '正式リリース', '公開画面', '文書状態']) {
    assert.match(statusPolicy, new RegExp(term, 'u'));
  }

  assert.match(statusPolicy, /v4\.0\.0.*正式リリースは未公開/u);
  assert.match(statusPolicy, /#41/u);
  assert.match(statusPolicy, /#42/u);
  assert.match(statusPolicy, /#47/u);
});

test('shows the same release boundary on the 4.0 top and every 4.0 document', () => {
  assert.match(dsl4Index, /固定実装の文書と、正式リリースは別です/u);
  assert.match(dsl4Index, /最新正式リリースは <code>v3\.2\.3<\/code>/u);
  assert.match(dsl4Index, /<code>v4\.0\.0<\/code>\s*はまだ正式リリースされていません/u);
  assert.match(
    dsl4Index,
    /公開プレイヤー、サンプル、ダウンロード、CLIが利用可能だとは保証しません/u,
  );

  assert.equal(dsl4Documents.length, 10);
  for (const source of dsl4Documents) {
    assert.match(source, /固定.{0,12}実装|実装基準/u);
    assert.match(source, /2026年8月8日時点/u);
    assert.match(source, /正式リリース/u);
    assert.match(source, /保証しません|確認してください|保守作業を含みます|公開元のリリース情報/u);
  }
});

test('does not describe the DSL 4.0 release as already published', () => {
  for (const source of [statusPolicy, dsl4Index, ...dsl4Documents]) {
    assert.doesNotMatch(source, /v4\.0\.0.{0,20}(?:公開済み|正式リリース済み)/u);
  }
});
