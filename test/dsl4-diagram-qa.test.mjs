import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const theme = read('docs/general-theme.css');
const writingStyle = read('WRITING-STYLE.md');
const qaRecord = read('DSL4-DIAGRAM-QA.md');
const dsl4Index = read('site/4.0/index.html');
const diagramDocuments = [
  'docs/user-guides/executive-summary-adult-4.0.md',
  'docs/dsl-author-guides/dsl-4.0-author-guide.md',
  'docs/dsl-author-guides/dsl-3.2-to-4.0-conversion-guide.md',
  'docs/developer-guides/internal-specification-4.0.md',
  'docs/developer-guides/extension-guide-4.0.md',
  'docs/developer-guides/dsl-4.0-diagnostics-design.md',
].map(read);

test('keeps concept-flow nodes and arrows in one ordered vertical flow at every width', () => {
  assert.match(theme, /\.concept-flow__track\s*\{[\s\S]*?flex-wrap: nowrap/u);
  assert.match(theme, /\.concept-flow__track\s*\{[\s\S]*?flex-direction: column/u);
  assert.match(
    theme,
    /\.concept-flow__track b\s*\{[\s\S]*?align-self: center[\s\S]*?rotate\(90deg\)/u,
  );
  assert.doesNotMatch(theme, /@media screen and \(max-width: 720px\)[\s\S]*?\.concept-flow/u);
});

test('keeps each concept figure together in print with readable compact labels', () => {
  assert.match(theme, /@media print[\s\S]*?\.concept-flow\s*\{[\s\S]*?break-inside: avoid-page/u);
  assert.match(
    theme,
    /@media print[\s\S]*?\.concept-flow__track span\s*\{[\s\S]*?font-size: 7\.2pt/u,
  );
});

test('provides captions, ordered labels, hidden arrows, and prose notes', () => {
  for (const source of diagramDocuments) {
    const figure = source.match(/<figure class="concept-flow">[\s\S]*?<\/figure>/u)?.[0];
    assert.ok(figure);
    assert.match(figure, /<figcaption>[^<]+<\/figcaption>/u);
    assert.ok((figure.match(/<span>/gu) ?? []).length >= 3);
    assert.ok((figure.match(/<b aria-hidden="true">→<\/b>/gu) ?? []).length >= 2);
    assert.match(figure, /concept-flow__note/u);
    assert.doesNotMatch(source, /```mermaid/u);
  }
});

test('documents the renderer policy and source fragment destination', () => {
  assert.match(writingStyle, /短い直線的な流れは、HTMLの`concept-flow`を使う/u);
  assert.match(writingStyle, /分岐、循環、複数経路を示す必要がある場合はMermaidを検討/u);
  assert.match(
    dsl4Index,
    /href="user-guides\/executive-summary-adult-4\.0\/document\.html#制作のサイクル"/u,
  );
  assert.match(diagramDocuments[0], /^## 制作のサイクル$/mu);
  assert.match(qaRecord, /Vivliostyle CLI 11\.1\.0/u);
  assert.match(qaRecord, /viewport: 320×568px、1280×800px/u);
  assert.match(qaRecord, /文字と矢印の重なり、図自体の横overflowはなかった/u);
  assert.match(qaRecord, /raw Mermaidコードは公開しません/u);
});
