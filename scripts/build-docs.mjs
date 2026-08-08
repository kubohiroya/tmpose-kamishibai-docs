import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {copyFile, cp, mkdir, readFile, readdir, rename, rm, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {
  documentationConfig,
  resolveLearnedThroughGrade,
  staffDocumentConfig,
  workshopDocumentConfig,
} from '../docs/config.mjs';
import sourceSnapshot from '../sources/tmpose-kamishibai.json' with {type: 'json'};
import {collectSourceInputs, isBuildCurrent} from './build-freshness.mjs';
import {writeLegacyVersionNotices} from './legacy-version-notices.mjs';
import {organizePublicationAssets} from './publication-assets.mjs';
import {installSiteAppBars} from './site-appbar.mjs';

const require = createRequire(import.meta.url);
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const docsRoot = path.join(projectRoot, 'docs');
const distRoot = path.join(projectRoot, 'dist');
const pdfRoot = path.join(projectRoot, 'output/pdf');
const vivliostyleBin = path.join(
  path.dirname(require.resolve('@vivliostyle/cli/package.json')),
  'dist/cli.js',
);
const rubyganaBin = path.join(
  path.dirname(require.resolve('rubygana/package.json')),
  'bin/rubygana.js',
);
const rubyganaPackage = require('rubygana/package.json');
const rubyganaGradeData = require('rubygana/lib/学年別漢字.js').metadata;
const commonPublicationInputs = [
  fileURLToPath(import.meta.url),
  path.join(projectRoot, 'scripts/build-freshness.mjs'),
  path.join(projectRoot, 'scripts/publication-assets.mjs'),
  path.join(projectRoot, 'scripts/site-appbar.mjs'),
  path.join(projectRoot, 'docs/config.mjs'),
  path.join(projectRoot, 'docs/theme.css'),
  path.join(projectRoot, 'docs/fonts'),
  path.join(projectRoot, 'sources/tmpose-kamishibai.json'),
  path.join(projectRoot, 'package.json'),
  path.join(projectRoot, 'pnpm-lock.yaml'),
];

/** @returns {Promise<void>} */
function runNode(script, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: projectRoot,
      stdio: 'inherit',
      ...options,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${path.basename(script)} exited with ${signal ?? code}.`));
    });
  });
}

/** @returns {Promise<void>} */
function runRubygana(input, output, grade) {
  return new Promise((resolve, reject) => {
    const rubyArguments = workshopDocumentConfig.rubyOverrides.flatMap((override) => [
      '--ruby',
      override,
    ]);
    const child = spawn(
      process.execPath,
      [rubyganaBin, '--html', '--grade', String(grade), '--use-rp', ...rubyArguments, input],
      {
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'inherit'],
      },
    );
    const chunks = [];

    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stdout.on('error', reject);
    child.on('error', reject);
    child.on('exit', async (code, signal) => {
      if (code !== 0) {
        reject(new Error(`rubygana exited with ${signal ?? code}.`));
        return;
      }

      try {
        await writeFile(output, Buffer.concat(chunks));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function applyRubygana(htmlFile, grade) {
  const rubyOutput = `${htmlFile}.rubygana`;
  await runRubygana(htmlFile, rubyOutput, grade);
  await rename(rubyOutput, htmlFile);
}

function browserArguments() {
  if (process.env.VIVLIOSTYLE_CHROME_PATH) {
    return ['--executable-browser', process.env.VIVLIOSTYLE_CHROME_PATH];
  }

  const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (process.platform === 'darwin' && existsSync(macChrome)) {
    return ['--executable-browser', macChrome];
  }

  return [];
}

async function buildWebPublication(configPath, outputDirectory, environment = process.env) {
  await rm(outputDirectory, {recursive: true, force: true});
  await runNode(
    vivliostyleBin,
    ['build', '--config', configPath, '--output', outputDirectory, '--format', 'webpub'],
    {
      cwd: path.dirname(configPath),
      env: environment,
    },
  );
}

async function buildPdf(inputPath, outputPath) {
  await mkdir(path.dirname(outputPath), {recursive: true});
  await runNode(
    vivliostyleBin,
    [
      'build',
      path.basename(inputPath),
      '--size',
      'A4',
      '--output',
      outputPath,
      ...browserArguments(),
    ],
    {cwd: path.dirname(inputPath)},
  );
}

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return findHtmlFiles(entryPath);
      return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
    }),
  );
  return nested.flat();
}

function normalizeWorkshopImagePaths(source) {
  return source
    .replace(/(<img\b[^>]*\bsrc=")\.\.\/\.\.\/images\//giu, '$1images/')
    .replace(/(<img\b[^>]*\bsrc=")\.\//giu, `$1${workshopDocumentConfig.sourceDirectory}/`);
}

const documentsBySourcePath = new Map(
  documentationConfig.documents.map((document) => [
    path.resolve(docsRoot, document.sourceDirectory, document.sourceFilename),
    document,
  ]),
);

function rewriteMarkdownLinks(source, document, htmlPath) {
  const documentSourcePath = path.join(docsRoot, document.sourceDirectory, document.sourceFilename);

  return source.replace(/href="([^"#?]+\.md)(#[^"]*)?"/giu, (match, markdownHref, hash = '') => {
    if (/^[a-z][a-z0-9+.-]*:/iu.test(markdownHref)) return match;
    const targetSourcePath = path.resolve(path.dirname(documentSourcePath), markdownHref);
    const targetDocument = documentsBySourcePath.get(targetSourcePath);
    if (targetDocument !== undefined) {
      const targetDirectory = path.join(
        distRoot,
        targetDocument.outputDirectory,
        targetDocument.sourceFilename.replace(/\.md$/u, ''),
      );
      const relativeTarget = path
        .relative(path.dirname(htmlPath), targetDirectory)
        .split(path.sep)
        .join('/');
      const targetPage = hash === '' ? `${relativeTarget}/` : `${relativeTarget}/document.html`;
      return `href="${targetPage}${hash}"`;
    }

    const repositoryPath = path.relative(projectRoot, targetSourcePath).split(path.sep).join('/');
    return `href="https://github.com/kubohiroya/tmpose-kamishibai-docs/blob/main/${repositoryPath}${hash}"`;
  });
}

async function prepareDocumentHtml(htmlPath, document, grade) {
  const source = await readFile(htmlPath, 'utf8');
  const withImages = source.replace(/(<img\b[^>]*\bsrc=")(?:\.\.\/)+images\//giu, '$1images/');
  const withLinks = rewriteMarkdownLinks(withImages, document, htmlPath);
  const withGrade =
    document.addFurigana === true
      ? withLinks.replace(/<html(\s|>)/iu, `<html data-rubygana-grade="${grade}"$1`)
      : withLinks;
  await writeFile(htmlPath, withGrade);
  if (document.addFurigana === true) await applyRubygana(htmlPath, grade);
}

async function prepareWorkshopHtml(htmlPath, grade) {
  const source = await readFile(htmlPath, 'utf8');
  const isTableOfContents = /<nav\b[^>]*\bid="toc"[^>]*>/iu.test(source);
  const section =
    path.basename(htmlPath) === workshopDocumentConfig.coverHtmlFilename
      ? 'cover'
      : isTableOfContents
        ? 'toc'
        : 'body';
  const note = `<p class="furigana-build-note">このドキュメントは、小学${grade}年生までに学ぶ漢字を学習済みとして想定して、それ以後に学ぶ漢字についての、ふりがなを付けています。</p>`;
  const withoutGeneratedTitle = isTableOfContents
    ? source.replace(/(<body\b[^>]*>)\s*<h1\b[^>]*>[\s\S]*?<\/h1>/iu, '$1')
    : source;
  const withTocLabels = withoutGeneratedTitle.replace(
    /<nav\b[^>]*\bid="toc"[^>]*>[\s\S]*?<\/nav>/iu,
    (tableOfContents) =>
      tableOfContents.replace(
        /(<a\b[^>]*>)([\s\S]*?)(<\/a>)/giu,
        '$1<span class="toc-label">$2</span>$3',
      ),
  );
  const withImages = normalizeWorkshopImagePaths(withTocLabels);
  const withGrade = withImages.replace(/<html(\s|>)/iu, `<html data-rubygana-grade="${grade}"$1`);
  const withSection = withGrade.replace(
    /<body(\s|>)/iu,
    `<body data-publication-section="${section}"$1`,
  );
  const withNote =
    section === 'cover'
      ? withSection.replace(/(<h1\b[^>]*>[\s\S]*?<\/h1>)/iu, `$1\n${note}`)
      : withSection;
  await writeFile(htmlPath, withNote);
}

function buildInfo(details = {}) {
  return {
    htmlAndPdfGenerator: 'Vivliostyle CLI 11.1.0',
    source: sourceSnapshot,
    ...details,
  };
}

async function writeBuildInfo(directory, details) {
  await writeFile(path.join(directory, 'build-info.json'), `${JSON.stringify(details, null, 2)}\n`);
}

async function shouldBuildPublication({
  force,
  inputs,
  markerPath,
  outputs,
  expectedBuildInfo = {},
  label,
}) {
  if (!force && (await isBuildCurrent({inputs, markerPath, outputs, expectedBuildInfo}))) {
    console.log(`Skipped ${label}; outputs are newer than its inputs.`);
    return false;
  }

  console.log(`Building ${label}${force ? ' (--force)' : ''}.`);
  return true;
}

async function buildDocuments(grade, force) {
  const configPath = path.join(projectRoot, 'docs/vivliostyle.general.config.mjs');
  let builtCount = 0;

  for (const document of documentationConfig.documents) {
    const basename = document.sourceFilename.replace(/\.md$/u, '');
    const pdfFilename = document.sourceFilename.replace(/\.md$/u, '.pdf');
    const publicationDirectory = path.join(distRoot, document.outputDirectory, basename);
    const articlePath = path.join(
      publicationDirectory,
      documentationConfig.standaloneArticleHtmlFilename,
    );
    const manifestPath = path.join(publicationDirectory, 'publication.json');
    const obsoletePdfPaths = [
      path.join(pdfRoot, document.outputDirectory, pdfFilename),
      path.join(distRoot, document.outputDirectory, pdfFilename),
      path.join(pdfRoot, document.legacyOutputDirectory, pdfFilename),
      path.join(distRoot, document.legacyOutputDirectory, pdfFilename),
    ];
    const sourcePath = path.join(docsRoot, document.sourceDirectory, document.sourceFilename);
    const inputs = [
      ...commonPublicationInputs,
      configPath,
      path.join(docsRoot, 'general-theme.css'),
      ...(await collectSourceInputs([sourcePath])),
    ];
    const expectedBuildInfo = document.addFurigana === true ? {learnedThroughGrade: grade} : {};
    await Promise.all(obsoletePdfPaths.map((pdfPath) => rm(pdfPath, {force: true})));
    if (
      !(await shouldBuildPublication({
        force,
        inputs,
        markerPath: path.join(publicationDirectory, 'build-info.json'),
        outputs: [articlePath, manifestPath],
        expectedBuildInfo,
        label: document.sourceFilename,
      }))
    ) {
      continue;
    }

    await buildWebPublication(configPath, publicationDirectory, {
      ...process.env,
      DOCUMENT_SOURCE: document.sourceFilename,
    });

    await prepareDocumentHtml(articlePath, document, grade);
    await writeBuildInfo(
      publicationDirectory,
      buildInfo({
        publicationKind: 'standalone-document',
        sourceDirectory: document.sourceDirectory,
        sourceFilename: document.sourceFilename,
        rubyApplied: document.addFurigana === true,
        ...(document.addFurigana === true ? {learnedThroughGrade: grade} : {}),
      }),
    );
    builtCount += 1;
  }

  return builtCount;
}

async function buildWorkshop(grade, force) {
  const configPath = path.join(projectRoot, 'docs/vivliostyle.workshop.config.mjs');
  const tempDirectory = path.join(projectRoot, 'tmp/vivliostyle/workshop');
  const outputDirectory = path.join(distRoot, workshopDocumentConfig.outputDirectory);
  const pdfPath = path.join(
    pdfRoot,
    workshopDocumentConfig.outputDirectory,
    workshopDocumentConfig.pdfFilename,
  );
  const publishedPdfPath = path.join(outputDirectory, workshopDocumentConfig.pdfFilename);
  const sourcePaths = [
    workshopDocumentConfig.coverFilename,
    workshopDocumentConfig.sourceFilename,
  ].map((filename) => path.join(docsRoot, workshopDocumentConfig.sourceDirectory, filename));
  const inputs = [
    ...commonPublicationInputs,
    configPath,
    path.join(docsRoot, 'document-theme.css'),
    ...(await collectSourceInputs(sourcePaths)),
  ];
  if (
    !(await shouldBuildPublication({
      force,
      inputs,
      markerPath: path.join(outputDirectory, 'build-info.json'),
      outputs: [
        path.join(outputDirectory, 'publication.json'),
        path.join(outputDirectory, workshopDocumentConfig.coverHtmlFilename),
        path.join(outputDirectory, workshopDocumentConfig.tocHtmlFilename),
        path.join(
          outputDirectory,
          workshopDocumentConfig.sourceFilename.replace(/\.md$/u, '.html'),
        ),
        pdfPath,
        publishedPdfPath,
      ],
      expectedBuildInfo: {learnedThroughGrade: grade},
      label: workshopDocumentConfig.sourceFilename,
    }))
  ) {
    return 0;
  }

  await buildWebPublication(configPath, tempDirectory);
  for (const htmlPath of await findHtmlFiles(tempDirectory)) {
    await prepareWorkshopHtml(htmlPath, grade);
    await applyRubygana(htmlPath, grade);
  }
  await cp(tempDirectory, outputDirectory, {recursive: true});
  await buildPdf(path.join(outputDirectory, 'publication.json'), pdfPath);
  await copyFile(pdfPath, publishedPdfPath);
  await writeBuildInfo(
    outputDirectory,
    buildInfo({
      publicationKind: 'workshop-documentation',
      rubyApplied: true,
      learnedThroughGrade: grade,
      rubyGenerator: `${rubyganaPackage.name} ${rubyganaPackage.version}`,
      kanjiDataset: rubyganaGradeData,
    }),
  );
  return 1;
}

async function buildStaff(force) {
  const configPath = path.join(projectRoot, 'docs/vivliostyle.staff.config.mjs');
  const tempDirectory = path.join(projectRoot, 'tmp/vivliostyle/staff');
  const outputDirectory = path.join(distRoot, staffDocumentConfig.outputDirectory);
  const htmlPath = path.join(outputDirectory, staffDocumentConfig.htmlFilename);
  const pdfPath = path.join(
    pdfRoot,
    staffDocumentConfig.outputDirectory,
    staffDocumentConfig.pdfFilename,
  );
  const publishedPdfPath = path.join(outputDirectory, staffDocumentConfig.pdfFilename);
  const sourcePath = path.join(
    docsRoot,
    staffDocumentConfig.sourceDirectory,
    staffDocumentConfig.sourceFilename,
  );
  const inputs = [
    ...commonPublicationInputs,
    configPath,
    path.join(docsRoot, 'staff-theme.css'),
    ...(await collectSourceInputs([sourcePath])),
  ];
  if (
    !(await shouldBuildPublication({
      force,
      inputs,
      markerPath: path.join(outputDirectory, 'build-info.json'),
      outputs: [htmlPath, pdfPath, publishedPdfPath],
      label: staffDocumentConfig.sourceFilename,
    }))
  ) {
    return 0;
  }

  await buildWebPublication(configPath, tempDirectory);
  await rm(outputDirectory, {recursive: true, force: true});
  await cp(tempDirectory, outputDirectory, {recursive: true});
  await writeFile(htmlPath, normalizeWorkshopImagePaths(await readFile(htmlPath, 'utf8')));
  await buildPdf(htmlPath, pdfPath);
  await copyFile(pdfPath, publishedPdfPath);
  await writeBuildInfo(
    outputDirectory,
    buildInfo({
      publicationKind: 'workshop-staff-documentation',
      rubyApplied: false,
    }),
  );
  return 1;
}

function publicationImagePlans() {
  const documentPlans = documentationConfig.documents.map((document) => ({
    outputDirectory: path.join(
      document.outputDirectory,
      document.sourceFilename.replace(/\.md$/u, ''),
    ),
    sourcePaths: [
      path.join(document.sourceDirectory, document.sourceFilename),
      'theme.css',
      'general-theme.css',
    ],
  }));
  return [
    ...documentPlans,
    {
      outputDirectory: workshopDocumentConfig.outputDirectory,
      sourcePaths: [
        path.join(workshopDocumentConfig.sourceDirectory, workshopDocumentConfig.coverFilename),
        path.join(workshopDocumentConfig.sourceDirectory, workshopDocumentConfig.sourceFilename),
        'theme.css',
        'document-theme.css',
      ],
      additionalAssetPaths: ['images/image01.png'],
    },
    {
      outputDirectory: staffDocumentConfig.outputDirectory,
      sourcePaths: [
        path.join(staffDocumentConfig.sourceDirectory, staffDocumentConfig.sourceFilename),
        'theme.css',
        'staff-theme.css',
      ],
    },
  ];
}

export async function buildDocs({force = false} = {}) {
  const grade = resolveLearnedThroughGrade();
  if (force) {
    await Promise.all([
      rm(distRoot, {recursive: true, force: true}),
      rm(pdfRoot, {recursive: true, force: true}),
    ]);
  }
  await mkdir(distRoot, {recursive: true});
  await Promise.all([
    mkdir(path.join(distRoot, '3.2'), {recursive: true}),
    mkdir(path.join(distRoot, '4.0'), {recursive: true}),
    mkdir(path.join(distRoot, 'workshops'), {recursive: true}),
    mkdir(path.join(distRoot, 'licenses'), {recursive: true}),
  ]);
  await writeFile(path.join(distRoot, '.nojekyll'), '');
  await Promise.all([
    copyFile(path.join(projectRoot, 'site/index.html'), path.join(distRoot, 'index.html')),
    copyFile(path.join(projectRoot, 'site/3.2/index.html'), path.join(distRoot, '3.2/index.html')),
    copyFile(path.join(projectRoot, 'site/4.0/index.html'), path.join(distRoot, '4.0/index.html')),
    copyFile(
      path.join(projectRoot, 'site/workshops/index.html'),
      path.join(distRoot, 'workshops/index.html'),
    ),
    copyFile(
      path.join(projectRoot, 'site/licenses/index.html'),
      path.join(distRoot, 'licenses/index.html'),
    ),
    copyFile(path.join(projectRoot, 'site/favicon.png'), path.join(distRoot, 'favicon.png')),
    copyFile(
      path.join(projectRoot, 'site/document-index.css'),
      path.join(distRoot, 'document-index.css'),
    ),
    copyFile(path.join(projectRoot, 'site/site-shell.css'), path.join(distRoot, 'site-shell.css')),
    copyFile(path.join(projectRoot, 'site/site-shell.js'), path.join(distRoot, 'site-shell.js')),
  ]);
  const builtCount =
    (await buildDocuments(grade, force)) +
    (await buildWorkshop(grade, force)) +
    (await buildStaff(force));
  const assetResult = await organizePublicationAssets({
    sourceRoot: docsRoot,
    outputRoot: distRoot,
    publications: publicationImagePlans(),
  });
  console.log(
    `Organized ${assetResult.referencedAssetCount} referenced image/font assets: ` +
      `${assetResult.sharedAssetCount} shared and ` +
      `${assetResult.publicationSpecificAssetCount} publication-specific; ` +
      `saved ${assetResult.sharedAssetSavings} bytes versus per-publication copies.`,
  );
  const legacyNotices = await writeLegacyVersionNotices(distRoot);
  console.log(`Generated ${legacyNotices.length} legacy URL notice publication(s).`);
  const appBarResult = await installSiteAppBars(distRoot, distRoot);
  console.log(
    `Installed the shared AppBar in ${appBarResult.installedCount} of ` +
      `${appBarResult.htmlCount} documentation HTML file(s).`,
  );
  await writeBuildInfo(
    distRoot,
    buildInfo({
      publicationKind: 'documentation-site',
      documentCount: documentationConfig.documents.length + 2,
      legacyNoticeCount: legacyNotices.length,
    }),
  );
  const publicationCount = documentationConfig.documents.length + 2;
  console.log(
    `Built ${builtCount} and skipped ${publicationCount - builtCount} of ` +
      `${publicationCount} publications in dist/.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argumentsAfterScript = process.argv.slice(2);
  const unknownArguments = argumentsAfterScript.filter((argument) => argument !== '--force');
  if (unknownArguments.length > 0) {
    throw new Error(`Unknown build argument(s): ${unknownArguments.join(', ')}`);
  }
  await buildDocs({force: argumentsAfterScript.includes('--force')});
}
