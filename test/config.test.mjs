import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  documentationConfig,
  documentCollections,
  staffDocumentConfig,
  workshopDocumentConfig,
} from '../docs/config.mjs';
import sourceSnapshot from '../sources/tmpose-kamishibai.json' with {type: 'json'};

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

const expectedCollections = {
  'user-guides': [
    'executive-summary-adult.md',
    'executive-summary-adult-4.0.md',
    'executive-summary-kids.md',
    'executive-summary-kids-4.0.md',
    'user-guide.md',
  ],
  'dsl-3.2-guides': ['dsl-manual.md', 'command-reference.md', 'history.md'],
  'dsl-4.0-guides': [
    'dsl-4.0-author-guide.md',
    'dsl-4.0-schema-reference.md',
    'dsl-3.2-to-4.0-conversion-guide.md',
  ],
  'developer-guides': [
    'application-materials-guide.md',
    'application-materials-guide-4.0.md',
    'developer-guide.md',
    'developer-guide-4.0.md',
    'internal-specification.md',
    'internal-specification-4.0.md',
    'extension-guide.md',
    'extension-guide-4.0.md',
    'dsl-3.1-diagnostics-design.md',
    'dsl-4.0-diagnostics-design.md',
    'dependency-audit.md',
    'release-smoke.md',
  ],
};

const threeSeriesSourceFilenames = [
  'executive-summary-adult.md',
  'executive-summary-kids.md',
  'user-guide.md',
  'dsl-manual.md',
  'command-reference.md',
  'history.md',
  'application-materials-guide.md',
  'developer-guide.md',
  'internal-specification.md',
  'extension-guide.md',
  'dsl-3.1-diagnostics-design.md',
  'dependency-audit.md',
  'release-smoke.md',
];

test('organizes every migrated document into one reader-oriented collection', () => {
  assert.deepEqual(
    Object.fromEntries(
      documentCollections.map(({id, documents}) => [
        id,
        documents.map(({sourceFilename}) => sourceFilename),
      ]),
    ),
    expectedCollections,
  );
  assert.equal(
    documentationConfig.documents.length,
    Object.values(expectedCollections).flat().length,
  );
  assert(!existsSync(path.join(projectRoot, 'docs/general')));

  for (const document of documentationConfig.documents) {
    const sourcePath = path.join(
      projectRoot,
      'docs',
      document.sourceDirectory,
      document.sourceFilename,
    );
    const source = readFileSync(sourcePath, 'utf8');
    assert.match(
      source,
      new RegExp(`^# ${document.title.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}$`, 'mu'),
    );
  }
});

test('pins the merged 3.2.0 source contract', () => {
  assert.equal(sourceSnapshot.pullRequest, 252);
  assert.equal(sourceSnapshot.commit, 'd1624c9ce9464bf696b4bb97851dce9154a09ee6');
  assert.equal(sourceSnapshot.dslVersion, '3.2');
  assert.equal(sourceSnapshot.extensions.length, 16);
});

test('keeps the developer guide source classification and records its legacy URL', () => {
  const document = documentationConfig.documents.find(
    ({sourceFilename}) => sourceFilename === 'application-materials-guide.md',
  );
  assert.equal(document?.collectionId, 'developer-guides');
  assert.equal(document?.sourceDirectory, 'developer-guides');
  assert.equal(document?.legacyOutputDirectory, 'user-guides');
  assert.equal(document?.outputDirectory, '3.2/user-guides');
});

test('publishes the 3.2 and 4.0 internal specifications at separate stable URLs', () => {
  const legacy = documentationConfig.documents.find(
    ({sourceFilename}) => sourceFilename === 'internal-specification.md',
  );
  const dsl4 = documentationConfig.documents.find(
    ({sourceFilename}) => sourceFilename === 'internal-specification-4.0.md',
  );

  assert.deepEqual(
    {
      version: legacy?.version,
      legacyOutputDirectory: legacy?.legacyOutputDirectory,
      outputDirectory: legacy?.outputDirectory,
    },
    {
      version: '3.2',
      legacyOutputDirectory: 'developer-guides',
      outputDirectory: '3.2/developer-guides',
    },
  );
  assert.deepEqual(
    {
      version: dsl4?.version,
      legacyOutputDirectory: dsl4?.legacyOutputDirectory,
      outputDirectory: dsl4?.outputDirectory,
    },
    {
      version: '4.0',
      legacyOutputDirectory: 'developer-guides',
      outputDirectory: '4.0/developer-guides',
    },
  );
});

test('publishes the 3.2 and 4.0 extension guides at separate stable URLs', () => {
  const legacy = documentationConfig.documents.find(
    ({sourceFilename}) => sourceFilename === 'extension-guide.md',
  );
  const dsl4 = documentationConfig.documents.find(
    ({sourceFilename}) => sourceFilename === 'extension-guide-4.0.md',
  );

  assert.deepEqual(
    {
      version: legacy?.version,
      legacyOutputDirectory: legacy?.legacyOutputDirectory,
      outputDirectory: legacy?.outputDirectory,
    },
    {
      version: '3.2',
      legacyOutputDirectory: 'developer-guides',
      outputDirectory: '3.2/developer-guides',
    },
  );
  assert.deepEqual(
    {
      version: dsl4?.version,
      legacyOutputDirectory: dsl4?.legacyOutputDirectory,
      outputDirectory: dsl4?.outputDirectory,
    },
    {
      version: '4.0',
      legacyOutputDirectory: 'developer-guides',
      outputDirectory: '4.0/developer-guides',
    },
  );
});

test('publishes the DSL 3.1 and 4.0 diagnostics reviews at separate stable URLs', () => {
  const dsl31 = documentationConfig.documents.find(
    ({sourceFilename}) => sourceFilename === 'dsl-3.1-diagnostics-design.md',
  );
  const dsl4 = documentationConfig.documents.find(
    ({sourceFilename}) => sourceFilename === 'dsl-4.0-diagnostics-design.md',
  );

  assert.deepEqual(
    {
      version: dsl31?.version,
      legacyOutputDirectory: dsl31?.legacyOutputDirectory,
      outputDirectory: dsl31?.outputDirectory,
    },
    {
      version: '3.2',
      legacyOutputDirectory: 'developer-guides',
      outputDirectory: '3.2/developer-guides',
    },
  );
  assert.deepEqual(
    {
      version: dsl4?.version,
      legacyOutputDirectory: dsl4?.legacyOutputDirectory,
      outputDirectory: dsl4?.outputDirectory,
    },
    {
      version: '4.0',
      legacyOutputDirectory: 'developer-guides',
      outputDirectory: '4.0/developer-guides',
    },
  );
});

test('publishes DSL 3.2 and 4.0 as parallel dedicated collections', () => {
  const dsl32 = documentCollections.find(({id}) => id === 'dsl-3.2-guides');
  const dsl40 = documentCollections.find(({id}) => id === 'dsl-4.0-guides');
  assert.ok(dsl32?.documents.every(({title}) => !title.includes('4.0')));
  assert.ok(dsl40?.documents.every(({title}) => title.includes('4.0')));
  assert.equal(dsl32?.documents[0].title, '紙芝居DSL 3.2 ファイル作成マニュアル');
  assert.equal(dsl40?.documents[0].title, '紙芝居DSL 4.0 台本作成ガイド');
});

test('places every version-specific document below an explicit version root', () => {
  for (const document of documentationConfig.documents) {
    assert.match(document.outputDirectory, /^(?:3\.2|4\.0)\//u);
    assert.ok(['3.2', '4.0'].includes(document.version));
    assert.doesNotMatch(document.legacyOutputDirectory, /^(?:3\.2|4\.0)\//u);
  }
  assert.equal(workshopDocumentConfig.versionFamily, '3.2系');
  assert.equal(staffDocumentConfig.versionFamily, '3.2系');
  assert.equal(workshopDocumentConfig.outputDirectory, 'workshops/2026-08-01');
  assert.equal(staffDocumentConfig.outputDirectory, 'workshops/2026-08-01/staff');
});

test('marks every 3-series publication in its public title', () => {
  for (const sourceFilename of threeSeriesSourceFilenames) {
    const document = documentationConfig.documents.find(
      (candidate) => candidate.sourceFilename === sourceFilename,
    );
    assert.ok(document, `${sourceFilename} must be published`);
    assert.match(document.title, /3\.[12]|2\.0から3\.2/u, `${sourceFilename} needs a 3.x title`);
  }
});
