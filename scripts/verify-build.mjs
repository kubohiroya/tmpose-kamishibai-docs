import {access, readFile, readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {documentationConfig, staffDocumentConfig, workshopDocumentConfig} from '../docs/config.mjs';
import sourceSnapshot from '../sources/tmpose-kamishibai.json' with {type: 'json'};
import {referencedLocalAssets} from './build-freshness.mjs';
import {legacyPublicationEntries} from './legacy-version-notices.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const distRoot = path.join(projectRoot, 'dist');
const pdfRoot = path.join(projectRoot, 'output/pdf');
const documentFontPath = path.join(projectRoot, 'docs/fonts/NotoSansJP-VF.ttf');
const publishedFontPath = path.join(distRoot, 'assets/fonts/NotoSansJP-VF.ttf');
const faviconPath = path.join(distRoot, 'favicon.png');
const documentIndexCssPath = path.join(distRoot, 'document-index.css');
const siteShellCssPath = path.join(distRoot, 'site-shell.css');
const siteShellScriptPath = path.join(distRoot, 'site-shell.js');
const require = createRequire(import.meta.url);
const vivliostyleRequire = createRequire(require.resolve('@vivliostyle/cli/package.json'));
const {PDFDocument} = vivliostyleRequire('pdf-lib');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function attributeValues(html, tagName, attributeName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*\\b${attributeName}="([^"]+)"`, 'gu');
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

async function pdfPageCount(pdfPath) {
  const document = await PDFDocument.load(await readFile(pdfPath));
  return document.getPageCount();
}

async function findFiles(directory, predicate) {
  const entries = await readdir(directory, {withFileTypes: true});
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return findFiles(entryPath, predicate);
      return entry.isFile() && predicate(entryPath) ? [entryPath] : [];
    }),
  );
  return nested.flat();
}

async function findHtmlFiles(directory) {
  return findFiles(directory, (filePath) => filePath.endsWith('.html'));
}

function jsonAssetReferences(value) {
  if (typeof value === 'string') {
    const reference = value.split(/[?#]/u, 1)[0];
    if (
      reference !== '' &&
      !reference.startsWith('/') &&
      !/^[a-z][a-z0-9+.-]*:/iu.test(reference) &&
      /\.(?:png|jpe?g|svg|gif|webp|apng|ttf|otf|woff2?)$/iu.test(reference)
    ) {
      return [reference];
    }
    return [];
  }
  if (Array.isArray(value)) return value.flatMap(jsonAssetReferences);
  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap(jsonAssetReferences);
  }
  return [];
}

async function verifyPublicationAssetReferences(publicationDirectory) {
  const textFiles = await findFiles(publicationDirectory, (filePath) =>
    ['.html', '.css', '.json'].includes(path.extname(filePath).toLowerCase()),
  );
  for (const textFile of textFiles) {
    const source = await readFile(textFile, 'utf8');
    const references = textFile.endsWith('.json')
      ? jsonAssetReferences(JSON.parse(source))
      : referencedLocalAssets(source, textFile).map((assetPath) =>
          path.relative(path.dirname(textFile), assetPath),
        );
    for (const reference of references) {
      const assetPath = path.resolve(path.dirname(textFile), decodeURIComponent(reference));
      const relativeToDist = path.relative(distRoot, assetPath);
      assert(
        relativeToDist !== '..' && !relativeToDist.startsWith(`..${path.sep}`),
        `${path.relative(distRoot, textFile)} references an asset outside dist/: ${reference}`,
      );
      await access(assetPath);
    }
  }
}

async function verifyLocalImages(htmlPath, html) {
  const imageSources = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/giu)].map(
    ([, source]) => source,
  );
  for (const source of imageSources) {
    if (/^(?:data:|https?:)/iu.test(source)) continue;
    await access(path.resolve(path.dirname(htmlPath), decodeURIComponent(source)));
  }
  return imageSources.length;
}

async function verifyLocalFragments() {
  const htmlFiles = await findHtmlFiles(distRoot);
  const htmlCache = new Map();

  for (const htmlFile of htmlFiles) {
    const html = await readFile(htmlFile, 'utf8');
    htmlCache.set(htmlFile, html);

    for (const href of attributeValues(html, 'a', 'href')) {
      if (!href.includes('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(href)) continue;

      const destination = new URL(href, pathToFileURL(htmlFile));
      const fragment = decodeURIComponent(destination.hash.slice(1));
      if (fragment === '') continue;

      let targetPath = fileURLToPath(destination);
      if (targetPath.endsWith(path.sep)) targetPath = path.join(targetPath, 'index.html');
      const relativeTarget = path.relative(distRoot, targetPath);
      assert(
        relativeTarget !== '..' && !relativeTarget.startsWith(`..${path.sep}`),
        `${path.relative(distRoot, htmlFile)} links outside dist/: ${href}`,
      );

      const targetHtml = htmlCache.get(targetPath) ?? (await readFile(targetPath, 'utf8'));
      htmlCache.set(targetPath, targetHtml);
      const ids = new Set([...targetHtml.matchAll(/\bid="([^"]+)"/gu)].map((match) => match[1]));
      assert(
        ids.has(fragment),
        `${path.relative(distRoot, htmlFile)} links to missing fragment ${href}`,
      );
    }
  }
}

async function verifySiteAppBars() {
  const htmlFiles = await findHtmlFiles(distRoot);
  const favicon = await readFile(faviconPath);
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert(favicon.subarray(0, 8).equals(pngSignature), 'The documentation favicon is not a PNG.');

  for (const htmlFile of htmlFiles) {
    const html = await readFile(htmlFile, 'utf8');
    const relativeCss = path
      .relative(path.dirname(htmlFile), siteShellCssPath)
      .split(path.sep)
      .join('/');
    const relativeScript = path
      .relative(path.dirname(htmlFile), siteShellScriptPath)
      .split(path.sep)
      .join('/');
    const relativeFavicon = path
      .relative(path.dirname(htmlFile), faviconPath)
      .split(path.sep)
      .join('/');

    assert(
      (html.match(/<header class="site-header">/gu) ?? []).length === 1,
      `${path.relative(distRoot, htmlFile)} must contain one AppBar.`,
    );
    assert(
      (html.match(/<footer class="site-footer" data-site-footer-version="1">/gu) ?? []).length ===
        1,
      `${path.relative(distRoot, htmlFile)} must contain one site footer.`,
    );
    const footer = html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/u)?.[0] ?? '';
    assert(footer.includes('© 2026 Hiroya Kubo'), 'The site footer is missing its copyright.');
    assert(
      footer.includes('各文書・作品・素材には個別の利用条件が適用されます。'),
      'The site footer is missing its individual-rights notice.',
    );
    assert(
      footer.includes('href="https://kubohiroya.github.io/tmpose-kamishibai-docs/licenses/"'),
      'The site footer is missing its rights page.',
    );
    assert(!footer.includes('github.com'), 'The site footer must not duplicate the GitHub link.');
    assert(
      /<a\b(?=[^>]*class="site-nav__link")(?=[^>]*href="https:\/\/kubohiroya\.github\.io\/tmpose-kamishibai-samples\/")[^>]*>\s*作品\s*<\/a\s*>/u.test(
        html,
      ),
      `${path.relative(distRoot, htmlFile)} must label the works-library link as 作品.`,
    );
    for (const destination of [
      'https://kubohiroya.github.io/tmpose-kamishibai/',
      'https://kubohiroya.github.io/tmpose-kamishibai-docs/',
      'https://kubohiroya.github.io/tmpose-kamishibai-docs/workshops/',
      'https://kubohiroya.github.io/tmpose-kamishibai-samples/',
      'https://kubohiroya.github.io/tmpose-kamishibai/downloads/',
      'https://github.com/kubohiroya/tmpose-kamishibai-docs',
    ]) {
      assert(
        html.includes(`href="${destination}"`),
        `${path.relative(distRoot, htmlFile)} is missing ${destination}.`,
      );
    }
    assert(
      attributeValues(html, 'link', 'href').filter((href) => href === relativeCss).length === 1,
      `${path.relative(distRoot, htmlFile)} must load site-shell.css once.`,
    );
    assert(
      attributeValues(html, 'script', 'src').filter((src) => src === relativeScript).length === 1,
      `${path.relative(distRoot, htmlFile)} must load site-shell.js once.`,
    );
    assert(
      attributeValues(html, 'link', 'href').includes(relativeFavicon),
      `${path.relative(distRoot, htmlFile)} is missing its favicon link.`,
    );
    await Promise.all([
      access(path.resolve(path.dirname(htmlFile), relativeCss)),
      access(path.resolve(path.dirname(htmlFile), relativeScript)),
      access(path.resolve(path.dirname(htmlFile), relativeFavicon)),
    ]);
  }

  return htmlFiles.length;
}

async function verifyDocument(document) {
  const basename = document.sourceFilename.replace(/\.md$/u, '');
  const publicationDirectory = path.join(distRoot, document.outputDirectory, basename);
  const articlePath = path.join(
    publicationDirectory,
    documentationConfig.standaloneArticleHtmlFilename,
  );
  const manifestPath = path.join(publicationDirectory, 'publication.json');
  const [article] = await Promise.all([readFile(articlePath, 'utf8'), access(manifestPath)]);

  assert(
    !/href="(?!https?:)[^"]+\.md(?:#[^"]*)?"/iu.test(article),
    `${basename} has a local .md link.`,
  );
  assert(article.includes(document.title), `${basename} does not contain its configured title.`);
  await verifyLocalImages(articlePath, article);
  await verifyPublicationAssetReferences(publicationDirectory);
}

async function verifyIndex() {
  const [index, dsl32Index, dsl40Index, workshopIndex, licensesIndex] = await Promise.all([
    readFile(path.join(distRoot, 'index.html'), 'utf8'),
    readFile(path.join(distRoot, '3.2/index.html'), 'utf8'),
    readFile(path.join(distRoot, '4.0/index.html'), 'utf8'),
    readFile(path.join(distRoot, 'workshops/index.html'), 'utf8'),
    readFile(path.join(distRoot, 'licenses/index.html'), 'utf8'),
  ]);
  assert(
    licensesIndex.includes('<h1>ライセンス・権利表示</h1>'),
    'The public rights page is missing.',
  );
  const normalizedLicensesIndex = licensesIndex.replace(/\s+/gu, ' ');
  assert(
    normalizedLicensesIndex.includes('Creative Commons Attribution-ShareAlike 4.0 International'),
    'The rights page is missing the CC BY-SA 4.0 document terms.',
  );
  assert(
    normalizedLicensesIndex.includes('All rights reserved.'),
    'The rights page is missing the workshop terms.',
  );
  assert(
    licensesIndex.includes('Urashima-walk-1') &&
      licensesIndex.includes('Mozilla Public License 2.0'),
    'The rights page is missing the site-icon provenance.',
  );
  assert(
    !index.includes('/tmpose-kamishibai/docs/'),
    'The index still links to the old Pages path.',
  );
  assert(!index.includes('general/'), 'The index still uses the old general directory.');
  assert(
    !index.includes('common-content'),
    'The duplicate common-content section is still present.',
  );
  assert(index.includes('href="3.2/"'), 'The DSL 3.2 banner destination is missing.');
  assert(index.includes('href="4.0/"'), 'The DSL 4.0 banner destination is missing.');
  assert(
    index.indexOf('version-banner--40') < index.indexOf('version-banner--32'),
    'The DSL version banners are not ordered newest first.',
  );
  assert(!index.includes('publication.json'), 'The root must not list version-specific documents.');

  for (const document of documentationConfig.documents) {
    const basename = document.sourceFilename.replace(/\.md$/u, '');
    const versionIndex = document.version === '3.2' ? dsl32Index : dsl40Index;
    const otherVersionIndex = document.version === '3.2' ? dsl40Index : dsl32Index;
    assert(
      versionIndex.includes(`href="${document.legacyOutputDirectory}/${basename}/"`),
      `${basename} HTML link is missing from its DSL ${document.version} top.`,
    );
    assert(
      !versionIndex.includes(`href="${document.legacyOutputDirectory}/${basename}.pdf"`),
      `${basename} PDF link must not be published.`,
    );
    assert(
      versionIndex.includes(
        `tmpose-kamishibai-docs/${document.outputDirectory}/${basename}/publication.json`,
      ),
      `${basename} Viewer link is missing.`,
    );
    assert(
      !otherVersionIndex.includes(`href="${document.legacyOutputDirectory}/${basename}/"`),
      `${basename} appears on the other version top.`,
    );
    assert(!index.includes(`${basename}/`), `${basename} appears on the root selector.`);
  }

  assert(workshopIndex.includes('DSL 4.0系'), 'The DSL 4.0 workshop group is missing.');
  assert(
    workshopIndex.includes('現在公開中の資料はありません'),
    'The unpublished DSL 4.0 workshop state is missing.',
  );
  assert(workshopIndex.includes('DSL 3.2系'), 'The DSL 3.2 workshop group is missing.');
  assert(workshopIndex.includes('datetime="2026-08-01"'), 'The workshop date is missing.');
  assert(
    workshopIndex.includes('href="https://www.chibanippo.co.jp/articles/1648690"'),
    'The Chiba Nippo coverage link is missing.',
  );
  assert(
    workshopIndex.includes('ＡＩプログラミング体験会　千葉商大で親子学ぶ　市川'),
    'The Chiba Nippo coverage title is missing.',
  );
  assert(
    workshopIndex.includes('千葉日報オンライン（有料記事）'),
    'The paid article label is missing.',
  );
  assert(
    workshopIndex.includes('datetime="2026-08-02"'),
    'The coverage publication date is missing.',
  );
  const normalizedWorkshopIndex = workshopIndex.replace(/\s+/gu, ' ');
  const cucEventPosition = normalizedWorkshopIndex.indexOf(
    '[実施済み] 親子AIプログラミング体験会(千葉商科大学イベント)',
  );
  const participantMaterialPosition =
    normalizedWorkshopIndex.indexOf('「親子AIプログラミング体験会」参加者向け資料');
  assert(cucEventPosition >= 0, 'The completed CUC event entry is missing.');
  assert(
    participantMaterialPosition > cucEventPosition,
    'The participant material must follow the completed CUC event entry.',
  );
  assert(
    workshopIndex.includes('href="https://www.cuc.ac.jp/event/2026/ai_programming0801.html"'),
    'The CUC event link is missing.',
  );
  for (const destination of [
    '2026-08-01/',
    '2026-08-01/staff/',
    '2026-08-01/tmpose-kamishibai-20260801.pdf',
    '2026-08-01/staff/tmpose-kamishibai-staff-20260801.pdf',
  ]) {
    assert(workshopIndex.includes(`href="${destination}"`), `${destination} is missing.`);
  }

  for (const [indexPath, cssHref] of [
    ['index.html', 'document-index.css'],
    ['3.2/index.html', '../document-index.css'],
    ['4.0/index.html', '../document-index.css'],
    ['workshops/index.html', '../document-index.css'],
  ]) {
    const source = await readFile(path.join(distRoot, indexPath), 'utf8');
    assert(source.includes(`href="${cssHref}"`), `${indexPath} is missing document-index.css.`);
    await access(documentIndexCssPath);
  }
}

async function verifyVersionedPublications() {
  for (const [outputDirectory, basename, title] of [
    ['3.2/dsl-author-guides', 'command-reference', '紙芝居DSL 3.2 コマンドリファレンス'],
    ['4.0/dsl-author-guides', 'dsl-4.0-schema-reference', '紙芝居DSL 4.0 Schemaリファレンス'],
    [
      '3.2/user-guides',
      'application-materials-guide',
      'TMPose紙芝居 3.2 アプリ・教材・ツールチェインガイド',
    ],
    [
      '4.0/developer-guides',
      'application-materials-guide-4.0',
      'TMPose紙芝居 4.0 アプリ・教材・ツールチェインガイド',
    ],
    ['4.0/developer-guides', 'internal-specification-4.0', '紙芝居アプリ 4.0 内部仕様書'],
    [
      '4.0/developer-guides',
      'dsl-4.0-diagnostics-design',
      'DSL 4.0 台本診断・安全停止 設計レビュー',
    ],
  ]) {
    const publicationDirectory = path.join(distRoot, outputDirectory, basename);
    const [article, publicationSource] = await Promise.all([
      readFile(path.join(publicationDirectory, 'document.html'), 'utf8'),
      readFile(path.join(publicationDirectory, 'publication.json'), 'utf8'),
    ]);
    const publication = JSON.parse(publicationSource);
    assert(article.includes(title), `${basename} HTML does not contain its title.`);
    assert(publication.name === title, `${basename} publication title differs.`);
    assert(
      publication.readingOrder?.some(({url}) => url === 'document.html'),
      `${basename} publication does not expose document.html to Vivliostyle Viewer.`,
    );
  }
}

async function verifyLegacyNotices() {
  const entries = legacyPublicationEntries();
  assert(entries.length === documentationConfig.documents.length, 'Legacy notice count differs.');

  for (const entry of entries) {
    const directory = path.join(distRoot, entry.legacyDirectory);
    const [index, document, publicationSource] = await Promise.all([
      readFile(path.join(directory, 'index.html'), 'utf8'),
      readFile(path.join(directory, 'document.html'), 'utf8'),
      readFile(path.join(directory, 'publication.json'), 'utf8'),
    ]);
    const targetUrl = `https://kubohiroya.github.io/tmpose-kamishibai-docs/${entry.targetDirectory}/`;
    for (const notice of [index, document]) {
      assert(notice.includes(targetUrl), `${entry.legacyDirectory} omits its new URL.`);
      assert(
        notice.includes('旧URLから自動転送は行いません'),
        `${entry.legacyDirectory} omits its notice.`,
      );
      assert(!/http-equiv=["']refresh/iu.test(notice), `${entry.legacyDirectory} auto-redirects.`);
      assert(
        !/location\.(?:assign|replace)|location\.href/iu.test(notice),
        `${entry.legacyDirectory} redirects with JavaScript.`,
      );
    }
    const publication = JSON.parse(publicationSource);
    assert(
      publication.readingOrder?.some(({url}) => url === 'document.html'),
      `${entry.legacyDirectory} Viewer manifest does not display its notice.`,
    );
  }
}

async function verifyWorkshop() {
  const workshopDirectory = path.join(distRoot, workshopDocumentConfig.outputDirectory);
  const workshopPdf = path.join(workshopDirectory, workshopDocumentConfig.pdfFilename);
  const workshopOutputPdf = path.join(
    pdfRoot,
    workshopDocumentConfig.outputDirectory,
    workshopDocumentConfig.pdfFilename,
  );
  const staffDirectory = path.join(distRoot, staffDocumentConfig.outputDirectory);
  const staffPdf = path.join(staffDirectory, staffDocumentConfig.pdfFilename);
  const staffOutputPdf = path.join(
    pdfRoot,
    staffDocumentConfig.outputDirectory,
    staffDocumentConfig.pdfFilename,
  );
  await Promise.all([
    access(path.join(workshopDirectory, workshopDocumentConfig.coverHtmlFilename)),
    access(path.join(workshopDirectory, workshopDocumentConfig.tocHtmlFilename)),
    access(path.join(workshopDirectory, 'publication.json')),
    access(path.join(staffDirectory, staffDocumentConfig.htmlFilename)),
  ]);
  const [workshopPublished, workshopOutput, staffPublished, staffOutput] = await Promise.all([
    readFile(workshopPdf),
    readFile(workshopOutputPdf),
    readFile(staffPdf),
    readFile(staffOutputPdf),
  ]);
  assert(workshopPublished.equals(workshopOutput), 'The workshop PDF copies differ.');
  assert(staffPublished.equals(staffOutput), 'The staff PDF copies differ.');
  assert((await pdfPageCount(workshopOutputPdf)) > 0, 'The workshop PDF has no pages.');
  assert((await pdfPageCount(staffOutputPdf)) > 0, 'The staff PDF has no pages.');

  const expectedPdfPaths = [
    path.join(workshopDocumentConfig.outputDirectory, workshopDocumentConfig.pdfFilename),
    path.join(staffDocumentConfig.outputDirectory, staffDocumentConfig.pdfFilename),
  ].sort();
  for (const [directory, label] of [
    [distRoot, 'dist'],
    [pdfRoot, 'output/pdf'],
  ]) {
    const actualPdfPaths = (await findFiles(directory, (filePath) => filePath.endsWith('.pdf')))
      .map((filePath) => path.relative(directory, filePath))
      .sort();
    assert(
      JSON.stringify(actualPdfPaths) === JSON.stringify(expectedPdfPaths),
      `${label} must contain only workshop PDFs; found ${actualPdfPaths.join(', ')}.`,
    );
  }
  await verifyPublicationAssetReferences(workshopDirectory);
  await verifyPublicationAssetReferences(staffDirectory);
}

export async function verifyBuild() {
  await verifyIndex();
  await verifyVersionedPublications();
  await verifyLegacyNotices();
  const [documentFont, publishedFont] = await Promise.all([
    readFile(documentFontPath),
    readFile(publishedFontPath),
  ]);
  assert(publishedFont.equals(documentFont), 'The shared site font differs from its source.');
  for (const document of documentationConfig.documents) {
    await verifyDocument(document);
  }
  await verifyLocalFragments();
  await verifyWorkshop();
  const appBarHtmlCount = await verifySiteAppBars();

  const buildInfo = JSON.parse(await readFile(path.join(distRoot, 'build-info.json'), 'utf8'));
  assert(
    buildInfo.source.commit === sourceSnapshot.commit,
    'Build metadata source commit differs.',
  );
  assert(
    buildInfo.documentCount === documentationConfig.documents.length + 2,
    'Build document count differs.',
  );
  assert(
    buildInfo.legacyNoticeCount === documentationConfig.documents.length,
    'Build legacy notice count differs.',
  );
  const htmlFiles = await findHtmlFiles(distRoot);
  assert(htmlFiles.length > 0, 'The generated site has no HTML files.');
  console.log(
    `Verified ${documentationConfig.documents.length + 2} publications, ` +
      `${htmlFiles.length} HTML files/AppBars, and 2 workshop PDFs.`,
  );
  assert(appBarHtmlCount === htmlFiles.length, 'The AppBar verification skipped HTML files.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await verifyBuild();
}
