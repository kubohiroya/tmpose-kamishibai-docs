import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {documentationConfig} from '../docs/config.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const tutorialRoot = path.join(projectRoot, 'docs/tutorials');
const navigationContract = JSON.parse(
  readFileSync(path.join(tutorialRoot, 'navigation-contract.json'), 'utf8'),
);
const screenshotManifest = JSON.parse(
  readFileSync(path.join(tutorialRoot, 'screenshots.json'), 'utf8'),
);
const tutorialSources = Object.fromEntries(
  ['README.md', 'play.md', 'create.md'].map((filename) => [
    filename,
    readFileSync(path.join(tutorialRoot, filename), 'utf8'),
  ]),
);

function screenshotMarkers(source) {
  return [...source.matchAll(/<!-- screenshot:([PC]-\d{2}) -->/gu)].map((match) => match[1]);
}

test('keeps pre-release tutorial drafts outside the public document collections', () => {
  assert.equal(navigationContract.status, 'planned-after-dsl4-release');
  assert.equal(screenshotManifest.status, 'blocked-until-dsl4-release');
  assert(
    documentationConfig.documents.every((document) => document.sourceDirectory !== 'tutorials'),
  );

  const publicIndex = readFileSync(path.join(projectRoot, 'site/index.html'), 'utf8');
  const appBarSource = readFileSync(path.join(projectRoot, 'scripts/site-appbar.mjs'), 'utf8');
  for (const source of [publicIndex, appBarSource]) {
    const normalized = source.replace(/\s+/gu, ' ');
    assert(!normalized.includes('>チュートリアル</a>'));
    assert(!normalized.includes('href="tutorials/"'));
  }
});

test('defines the planned five-item AppBar and current-section rules', () => {
  assert.equal(navigationContract.formatVersion, 1);
  assert.deepEqual(
    navigationContract.items.map(({id, label}) => [id, label]),
    [
      ['home', 'トップ'],
      ['tutorials', 'チュートリアル'],
      ['documents', 'ドキュメント'],
      ['samples', 'サンプル'],
      ['downloads', 'ダウンロード'],
    ],
  );
  assert.equal(
    navigationContract.items.find(({id}) => id === 'tutorials').href,
    'https://kubohiroya.github.io/tmpose-kamishibai-docs/tutorials/',
  );

  const itemIds = new Set(navigationContract.items.map(({id}) => id));
  for (const rule of navigationContract.currentSectionRules) assert(itemIds.has(rule.current));
  const tutorialRuleIndex = navigationContract.currentSectionRules.findIndex(
    ({current}) => current === 'tutorials',
  );
  const documentRuleIndex = navigationContract.currentSectionRules.findIndex(
    ({current}) => current === 'documents',
  );
  assert(tutorialRuleIndex >= 0 && tutorialRuleIndex < documentRuleIndex);

  assert.deepEqual(navigationContract.changeLocations.map(({repository}) => repository).sort(), [
    'kubohiroya/tmpose-kamishibai',
    'kubohiroya/tmpose-kamishibai-docs',
    'kubohiroya/tmpose-kamishibai-samples',
  ]);
  for (const location of navigationContract.changeLocations) assert(location.paths.length > 0);
});

test('maps every planned screenshot to a draft marker and a release gate', () => {
  assert.equal(screenshotManifest.formatVersion, 2);
  assert.equal(screenshotManifest.targetDslVersion, '4.0');
  assert.equal(
    screenshotManifest.implementationBaseline.commit,
    'e1696f64f414baa3b80c1be2fdad32164efe1bec',
  );
  assert.deepEqual(screenshotManifest.capturePolicy.viewport, {width: 1280, height: 720});
  assert.equal(screenshotManifest.capturePolicy.deviceScaleFactor, 1);
  assert.equal(screenshotManifest.capturePolicy.locale, 'ja-JP');
  assert.equal(screenshotManifest.capturePolicy.reducedMotion, true);
  assert.equal(screenshotManifest.capturePolicy.sourcePathsVisible, false);

  const expectedIds = [
    ...Array.from({length: 8}, (_, index) => `P-${String(index + 1).padStart(2, '0')}`),
    ...Array.from({length: 13}, (_, index) => `C-${String(index + 1).padStart(2, '0')}`),
  ];
  const captureIds = screenshotManifest.captures.map(({id}) => id);
  assert.deepEqual(captureIds.sort(), expectedIds.sort());
  assert.equal(new Set(captureIds).size, captureIds.length);

  const markers = [
    ...screenshotMarkers(tutorialSources['play.md']),
    ...screenshotMarkers(tutorialSources['create.md']),
  ];
  assert.deepEqual(markers.sort(), expectedIds.sort());
  assert.equal(new Set(markers).size, markers.length);

  const createCaptureSteps = Object.fromEntries(
    screenshotManifest.captures
      .filter(({tutorial}) => tutorial === 'create')
      .map(({id, step}) => [id, step]),
  );
  assert.deepEqual(createCaptureSteps, {
    'C-01': 2,
    'C-02': 3,
    'C-03': 3,
    'C-04': 3,
    'C-05': 4,
    'C-06': 4,
    'C-07': 5,
    'C-08': 5,
    'C-09': 5,
    'C-10': 6,
    'C-11': 7,
    'C-12': 9,
    'C-13': 1,
  });

  const gateIds = new Set(screenshotManifest.gates.map(({id}) => id));
  assert(screenshotManifest.gates.every(({ready}) => ready === false));
  assert.deepEqual(
    Object.fromEntries(
      screenshotManifest.gates.map(({id, progressStatus}) => [id, progressStatus]),
    ),
    {
      'dsl4-release': 'blocked',
      'tutorial-sample': 'blocked',
      'app-shell': 'partial',
      'preview-flow': 'implemented',
      'pose-feedback': 'implemented',
      'camera-controls': 'implemented',
      'cli-contract': 'partial',
      'capture-environment': 'partial',
    },
  );
  for (const gate of screenshotManifest.gates) {
    assert(['blocked', 'partial', 'implemented'].includes(gate.progressStatus));
    assert(gate.remaining.length > 0);
    if (gate.progressStatus !== 'blocked') assert(gate.evidence.length > 0);
  }
  assert(
    screenshotManifest.gates
      .find(({id}) => id === 'preview-flow')
      .dependencies.includes('https://github.com/kubohiroya/tmpose-kamishibai/issues/394'),
  );

  for (const capture of screenshotManifest.captures) {
    assert(['play', 'create'].includes(capture.tutorial));
    assert(capture.gates.length > 0);
    assert(capture.gates.every((gate) => gateIds.has(gate)));
    assert.equal(capture.status, 'blocked');
    const imageEntries = capture.frames ?? [capture];
    for (const imageEntry of imageEntries) {
      assert(imageEntry.captionDraft.length > 0);
      assert(imageEntry.altDraft.length > 0);
      assert(
        imageEntry.filename.startsWith(
          `docs/images/tutorials/dsl4/${capture.tutorial}/tutorial-${capture.tutorial}-`,
        ),
      );
      assert(imageEntry.filename.endsWith('.png'));
    }
  }

  const fixtureFrames = screenshotManifest.captures.flatMap((capture) =>
    capture.frames
      ? capture.frames.map(({sourceFixtureFrame}) => sourceFixtureFrame)
      : [capture.sourceFixtureFrame].filter(Boolean),
  );
  assert.deepEqual(fixtureFrames.sort(), [
    'camera-control-collision',
    'diagnostic-last-known-good',
    'dialog-position-selector',
    'dialog-scope-selector',
    'reloaded-action',
    'watching-top-right',
  ]);

  const reloadDialogCapture = screenshotManifest.captures.find(({id}) => id === 'C-05');
  assert.equal(reloadDialogCapture.frames.length, 2);
  assert.match(reloadDialogCapture.description, /2段階/u);

  const previewControlCapture = screenshotManifest.captures.find(({id}) => id === 'C-10');
  assert.equal(previewControlCapture.reuseOf, undefined);
  assert.equal(previewControlCapture.sourceFixtureFrame, 'camera-control-collision');
  assert(previewControlCapture.gates.includes('camera-controls'));
  assert.match(previewControlCapture.description, /重ならない/u);

  const optionalCaptures = screenshotManifest.captures.filter(({required}) => !required);
  assert(optionalCaptures.every(({conditional}) => conditional.length > 0));
});

test('keeps the source drafts reviewable before screenshots exist', () => {
  assert.match(tutorialSources['README.md'], /DSL 4\.0リリース前draft/u);
  assert.match(tutorialSources['README.md'], /\/tutorials\/play\//u);
  assert.match(tutorialSources['README.md'], /\/tutorials\/create\//u);
  assert.match(tutorialSources['play.md'], /## 完了チェック/u);
  assert.match(tutorialSources['create.md'], /Scratch\s*ブロックを追加しません/u);
  assert.match(tutorialSources['create.md'], /```yaml[\s\S]*kamishibai: '4\.0'/u);
  assert.match(tutorialSources['create.md'], /project root directoryを選択/u);
  assert.match(tutorialSources['create.md'], /file: new-beach\.svg/u);
  assert.match(tutorialSources['create.md'], /第1段階/u);
  assert.match(tutorialSources['create.md'], /第2段階/u);
  assert.match(tutorialSources['create.md'], /外周8方向/u);
  assert.match(tutorialSources['create.md'], /reload status buttonがcontrolと重ならない/u);
  assert.doesNotMatch(tutorialSources['create.md'], /├── assets\/[\s\S]*└── pose-models\//u);
});
