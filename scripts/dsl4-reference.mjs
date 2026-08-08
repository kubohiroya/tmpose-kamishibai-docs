import Ajv2020 from 'ajv/dist/2020.js';
import {parse} from 'yaml';

const requiredSectionIds = ['top-level', 'asset-types', 'settings', 'shared-types', 'scenes'];
const actionSectionIds = ['global-actions', 'actor-actions'];
const expectedStaticSectionPointers = {
  'asset-types': [
    '#/$defs/asset',
    '#/$defs/compactAsset',
    '#/$defs/namedBackdrop',
    '#/$defs/namedSound',
    '#/$defs/namedCostume',
    '#/$defs/namedPoseModel',
    '#/$defs/namedImage',
  ],
  settings: [
    '#/$defs/actors',
    '#/$defs/cover',
    '#/$defs/textStyle',
    '#/$defs/speechStyle',
    '#/$defs/speechStyles',
    '#/$defs/variables',
    '#/$defs/loadingScreen',
    '#/$defs/poseRecognition',
    '#/$defs/poseSequenceRecognition',
    '#/$defs/poseSelectionRecognition',
    '#/$defs/poseFeedback',
    '#/$defs/poseNavigation',
    '#/$defs/posePreview',
    '#/$defs/scenePosePreview',
    '#/$defs/posePreviewControlPosition',
    '#/$defs/posePreviewMirroringControl',
    '#/$defs/posePreviewCameraMenuControl',
    '#/$defs/posePreviewControls',
    '#/$defs/controls',
    '#/$defs/branchRules',
  ],
  'shared-types': [
    '#/$defs/id',
    '#/$defs/filePath',
    '#/$defs/loadingPolicy',
    '#/$defs/retentionPolicy',
    '#/$defs/deliveryPolicy',
    '#/$defs/remoteAssetSource',
    '#/$defs/remotePoseModelSource',
    '#/$defs/keyCode',
    '#/$defs/navigationCommand',
    '#/$defs/variableValue',
  ],
  scenes: ['#/$defs/actions', '#/$defs/longScene', '#/$defs/scene', '#/$defs/scenes'],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function decodePointerSegment(segment) {
  return segment.replaceAll('~1', '/').replaceAll('~0', '~');
}

export function resolveJsonPointer(document, pointer) {
  assert(pointer.startsWith('#/'), `JSON Pointer must start with #/: ${pointer}`);
  return pointer
    .slice(2)
    .split('/')
    .map(decodePointerSegment)
    .reduce((value, segment) => {
      assert(
        value !== null && typeof value === 'object' && segment in value,
        `JSON Pointer does not exist in the Schema: ${pointer}`,
      );
      return value[segment];
    }, document);
}

function localReferencePointer(reference) {
  assert(reference.startsWith('#/'), `Only local Schema references are supported: ${reference}`);
  return reference;
}

function dereference(schemaNode, schema) {
  return schemaNode?.$ref
    ? resolveJsonPointer(schema, localReferencePointer(schemaNode.$ref))
    : schemaNode;
}

function referenceName(reference) {
  return decodePointerSegment(reference.split('/').at(-1));
}

function code(value) {
  return `\`${String(value).replaceAll('`', '\\`')}\``;
}

function tableText(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

function schemaType(schemaNode, schema, seen = new Set()) {
  if (schemaNode === true) return '任意の値';
  if (schemaNode === false) return '使用不可';
  if (schemaNode?.$ref) {
    if (seen.has(schemaNode.$ref)) return code(referenceName(schemaNode.$ref));
    const nextSeen = new Set(seen).add(schemaNode.$ref);
    return `${schemaType(dereference(schemaNode, schema), schema, nextSeen)}（${code(referenceName(schemaNode.$ref))}）`;
  }
  if (schemaNode?.const !== undefined) return `固定値 ${code(schemaNode.const)}`;
  if (Array.isArray(schemaNode?.enum)) return schemaNode.enum.map(code).join(' / ');
  if (Array.isArray(schemaNode?.oneOf)) {
    return schemaNode.oneOf.map((choice) => schemaType(choice, schema, seen)).join(' または ');
  }
  if (schemaNode?.type === 'array') {
    return `${schemaType(schemaNode.items, schema, seen)}の配列`;
  }
  if (schemaNode?.type === 'object') {
    if (schemaNode.patternProperties || typeof schemaNode.additionalProperties === 'object') {
      return 'mapping';
    }
    return 'object';
  }
  if (schemaNode?.properties || schemaNode?.patternProperties) return 'object';
  return (
    {
      boolean: '真偽値',
      integer: '整数',
      number: '数値',
      string: '文字列',
    }[schemaNode?.type] ?? 'Schemaで定義された値'
  );
}

function schemaConstraints(schemaNode) {
  if (schemaNode === true || schemaNode === false || !schemaNode) return '—';
  const constraints = [];
  if (schemaNode.default !== undefined) constraints.push(`既定値 ${code(schemaNode.default)}`);
  if (schemaNode.minLength !== undefined) constraints.push(`${schemaNode.minLength}文字以上`);
  if (schemaNode.minimum !== undefined) constraints.push(`${schemaNode.minimum}以上`);
  if (schemaNode.maximum !== undefined) constraints.push(`${schemaNode.maximum}以下`);
  if (schemaNode.exclusiveMinimum !== undefined) {
    constraints.push(`${schemaNode.exclusiveMinimum}より大きい`);
  }
  if (schemaNode.minItems !== undefined) constraints.push(`${schemaNode.minItems}項目以上`);
  if (schemaNode.minProperties !== undefined) {
    constraints.push(`${schemaNode.minProperties} field以上`);
  }
  if (schemaNode.maxProperties !== undefined) {
    constraints.push(`${schemaNode.maxProperties} field以下`);
  }
  if (schemaNode.pattern !== undefined) constraints.push(`pattern ${code(schemaNode.pattern)}`);
  if (schemaNode.additionalProperties === false) constraints.push('未知field不可');
  return constraints.length === 0 ? '—' : constraints.join('、');
}

function schemaRows(schemaNode, schema) {
  const resolved = dereference(schemaNode, schema);
  if (resolved?.type === 'object') {
    const required = new Set(resolved.required ?? []);
    const rows = Object.entries(resolved.properties ?? {}).map(([name, property]) => ({
      name: code(name),
      required: required.has(name) ? '必須' : '任意',
      type: schemaType(property, schema),
      constraints: schemaConstraints(dereference(property, schema)),
    }));
    for (const [pattern, property] of Object.entries(resolved.patternProperties ?? {})) {
      rows.push({
        name: `key pattern ${code(pattern)}`,
        required: resolved.minProperties === undefined ? '任意' : `${resolved.minProperties}件以上`,
        type: schemaType(property, schema),
        constraints: schemaConstraints(dereference(property, schema)),
      });
    }
    if (typeof resolved.additionalProperties === 'object') {
      rows.push({
        name: '任意のID key',
        required: resolved.minProperties === undefined ? '任意' : `${resolved.minProperties}件以上`,
        type: schemaType(resolved.additionalProperties, schema),
        constraints: schemaConstraints(dereference(resolved.additionalProperties, schema)),
      });
    }
    return rows;
  }
  if (Array.isArray(resolved?.oneOf)) {
    return resolved.oneOf.map((choice, index) => ({
      name: `形式${index + 1}`,
      required: 'いずれか一つ',
      type: schemaType(choice, schema),
      constraints: schemaConstraints(dereference(choice, schema)),
    }));
  }
  if (resolved?.type === 'array') {
    return [
      {
        name: '各項目',
        required: resolved.minItems === undefined ? '任意件数' : `${resolved.minItems}件以上`,
        type: schemaType(resolved.items, schema),
        constraints: schemaConstraints(dereference(resolved.items, schema)),
      },
    ];
  }
  return [
    {
      name: '値',
      required: '必須',
      type: schemaType(resolved, schema),
      constraints: schemaConstraints(resolved),
    },
  ];
}

function renderSchemaTable(schemaNode, schema) {
  const rows = schemaRows(schemaNode, schema);
  return [
    '| field／形式 | 必須性 | 型 | 既定値・制約 |',
    '| --- | --- | --- | --- |',
    ...rows.map(
      (row) =>
        `| ${tableText(row.name)} | ${tableText(row.required)} | ${tableText(row.type)} | ${tableText(row.constraints)} |`,
    ),
  ].join('\n');
}

function renderReferencedArgumentTable(schemaNode, schema) {
  const resolved = dereference(schemaNode, schema);
  const references = [
    ...Object.values(resolved?.properties ?? {}),
    ...Object.values(resolved?.patternProperties ?? {}),
  ].filter((value) => value?.$ref);
  if (references.length !== 1) return '';
  const target = dereference(references[0], schema);
  if (!target || (!target.properties && !target.oneOf && target.type !== 'array')) return '';
  return `\n\n引数の詳細:\n\n${renderSchemaTable(target, schema)}`;
}

function allEntries(annotations) {
  return annotations.sections.flatMap((section) =>
    section.entries.map((entry) => ({...entry, sectionId: section.id})),
  );
}

function actionPointers(schema) {
  const references = schema.$defs.action.oneOf.map(({$ref: reference}) => reference);
  const global = [];
  const actor = [];
  for (const reference of references) {
    const definition = resolveJsonPointer(schema, reference);
    (definition.patternProperties ? actor : global).push(reference);
  }
  return {global, actor};
}

function assertExactPointers(actualEntries, expectedPointers, label) {
  const actual = actualEntries.map(({pointer}) => pointer).sort();
  const expected = [...expectedPointers].sort();
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} annotations differ from the Schema.\nexpected: ${expected.join(', ')}\nactual: ${actual.join(', ')}`,
  );
}

export function validateReferenceInputs({schema, annotations}) {
  assert(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'Unexpected Schema');
  assert(annotations?.license === 'CC-BY-SA-4.0', 'Annotation license must be CC-BY-SA-4.0');
  assert(Array.isArray(annotations.sections), 'Annotation sections must be an array');

  const sectionIds = annotations.sections.map(({id}) => id);
  assert(new Set(sectionIds).size === sectionIds.length, 'Annotation section IDs must be unique');
  for (const sectionId of [...requiredSectionIds, ...actionSectionIds]) {
    assert(sectionIds.includes(sectionId), `Annotation section is missing: ${sectionId}`);
  }

  const pointers = new Set();
  for (const section of annotations.sections) {
    assert(section.title && section.description, `Section metadata is incomplete: ${section.id}`);
    assert(
      Array.isArray(section.entries) && section.entries.length > 0,
      `Section is empty: ${section.id}`,
    );
    const orders = new Set();
    for (const entry of section.entries) {
      assert(Number.isInteger(entry.order) && entry.order > 0, `Invalid order: ${entry.pointer}`);
      assert(!orders.has(entry.order), `Duplicate order ${entry.order} in section ${section.id}`);
      orders.add(entry.order);
      assert(!pointers.has(entry.pointer), `Duplicate annotation pointer: ${entry.pointer}`);
      pointers.add(entry.pointer);
      resolveJsonPointer(schema, entry.pointer);
      assert(entry.title && entry.summary, `Annotation text is missing: ${entry.pointer}`);
      assert(
        typeof entry.example === 'string' && entry.example.trim(),
        `Example is missing: ${entry.pointer}`,
      );
    }
  }

  const section = (id) => annotations.sections.find((candidate) => candidate.id === id);
  assertExactPointers(
    section('top-level').entries,
    Object.keys(schema.properties).map((name) => `#/properties/${name}`),
    'Top-level field',
  );
  const actions = actionPointers(schema);
  assertExactPointers(section('global-actions').entries, actions.global, 'Global action');
  assertExactPointers(section('actor-actions').entries, actions.actor, 'Actor action');
  for (const [sectionId, expectedPointers] of Object.entries(expectedStaticSectionPointers)) {
    assertExactPointers(section(sectionId).entries, expectedPointers, `${sectionId} section`);
  }

  const AjvConstructor = /** @type {any} */ (Ajv2020);
  const ajv = new AjvConstructor({allErrors: true, strict: true});
  ajv.addSchema(schema);
  for (const entry of allEntries(annotations)) {
    let example;
    try {
      example = parse(entry.example, {uniqueKeys: true});
    } catch (error) {
      throw new Error(`Invalid YAML example for ${entry.pointer}: ${error.message}`, {
        cause: error,
      });
    }
    const validate = ajv.compile({$ref: `${schema.$id}${entry.pointer}`});
    assert(
      validate(example),
      `Example does not match ${entry.pointer}: ${ajv.errorsText(validate.errors, {separator: '\n'})}`,
    );
  }

  return {
    actionCount: actions.global.length + actions.actor.length,
    annotationCount: pointers.size,
    topLevelFieldCount: Object.keys(schema.properties).length,
  };
}

function renderEntry(entry, schema) {
  const schemaNode = resolveJsonPointer(schema, entry.pointer);
  const notes = (entry.notes ?? []).map((note) => `- ${note}`).join('\n');
  return [
    `### ${entry.title}`,
    '',
    entry.summary,
    '',
    `Schema位置: ${code(entry.pointer)}`,
    '',
    renderSchemaTable(schemaNode, schema) + renderReferencedArgumentTable(schemaNode, schema),
    ...(notes ? ['', notes] : []),
    '',
    entry.exampleContext ?? 'Schemaで検証できる値の例:',
    '',
    '```yaml',
    entry.example.trimEnd(),
    '```',
  ].join('\n');
}

export function renderReferenceDocument({schema, annotations, lock}) {
  const counts = validateReferenceInputs({schema, annotations});
  const sections = annotations.sections
    .map((section) => {
      const entries = [...section.entries]
        .sort((left, right) => left.order - right.order)
        .map((entry) => renderEntry(entry, schema))
        .join('\n\n');
      return `## ${section.title}\n\n${section.description}\n\n${entries}`;
    })
    .join('\n\n');
  const candidateSnapshot = lock.sourceKind === 'working-tree-candidate';
  const sourceCommit = candidateSnapshot ? lock.baseCommit : lock.commit;
  const sourceCommitDate = candidateSnapshot ? lock.baseCommitDate : lock.commitDate;
  const sourceCommitUrl = `https://github.com/${lock.repository}/commit/${sourceCommit}`;
  const snapshotLabel = candidateSnapshot
    ? `Schema candidate: [\`${sourceCommit.slice(0, 7)}\`をbaseにした規範Schema候補](${lock.candidateIssueUrl})`
    : `Schema固定commit: [\`${sourceCommit.slice(0, 7)}\`](${sourceCommitUrl})`;
  const snapshotDescription = candidateSnapshot
    ? `[Issue #${lock.candidateIssue}](${lock.candidateIssueUrl})の作業ツリーから固定したDSL 4.0規範JSON Schema候補snapshot`
    : `固定snapshotの[DSL 4.0 JSON Schema](${lock.schemaUrl})`;
  const updateCommand = candidateSnapshot
    ? `pnpm docs:dsl4:sync -- --repository ../tmpose-kamishibai-camera-preview-controls --commit <base-commit> --working-tree --issue ${lock.candidateIssue}`
    : 'pnpm docs:dsl4:sync -- --repository ../tmpose-kamishibai --commit <commit>';

  return `<!-- Generated by scripts/generate-dsl4-reference.mjs. Edit sources/dsl4/annotations.ja.json or sync the pinned Schema instead of editing this file. -->
# 紙芝居DSL 4.0 Schemaリファレンス

Copyright © 2026 Hiroya Kubo. この文書は[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)で提供します。

対象: DSL 4.0台本の作成、構造・制約の確認を行う方\\
対象仕様: \`kamishibai: '4.0'\`\\
文書状態: **DSL 4.0実装完成版**\\
${snapshotLabel}\\
Schema SHA-256: \`${lock.schemaSha256}\`

> **権威関係と配布状態:** 同一の上流完成commitに含まれる規範JSON Schema、表層仕様、
> 適合実装・testを固定しています。Schemaはruntime実装から生成しません。公開アプリ、配布artifact、
> feature flagがDSL 4.0を有効にしているかは利用するreleaseごとに確認してください。

## このリファレンスについて

この文書は、${snapshotDescription}とCC BY-SA 4.0の日本語Annotationから
決定的に生成しています。型、必須性、既定値、数値範囲、列挙値、patternはSchemaから取得し、説明、掲載順、
注意事項、例はAnnotationで管理します。Schemaと生成物が異なる場合はSchemaを優先します。

${candidateSnapshot ? `> **候補snapshot:** このSchemaには、上流\`${sourceCommit.slice(0, 7)}\`へまだcommitされていないcamera preview操作UI候補を含みます。公開された上流仕様は[Issue #${lock.candidateIssue}](${lock.candidateIssueUrl})で確認でき、対応実装のmergeまでは候補fieldとして扱ってください。` : ''}

- 上流repository: [\`${lock.repository}\`](https://github.com/${lock.repository})
- Schema path: \`${lock.schemaPath}\`
- ${candidateSnapshot ? 'base commit日時' : '上流commit日時'}: \`${sourceCommitDate}\`
- 掲載範囲: トップレベル${counts.topLevelFieldCount} field、action ${counts.actionCount}種類、Annotation ${counts.annotationCount}項目
- 更新方法: \`${updateCommand}\`
- 差分確認: \`pnpm docs:dsl4:check\`

表中の「必須」は、そのobjectまたは形式を選んだ場合の必須性です。\`stableId\`などの任意fieldは、
再読み込みや診断位置の安定化に必要かを作品ごとに判断してください。例は各Schema断片を機械検証しており、
アセットやシーン間の参照整合性は、source frontendまたはpreview／buildでも別途確認する必要があります。

${sections}

## 台本作成での使い方

1. projectに4.0用の\`.k4.yml\`を作る
2. 利用するpreview／build／公開アプリがDSL 4.0を有効にしていることを確認する
3. 本リファレンスでfield、型、必須性、core actionの引数を確認する
4. Schema検証、参照検証、previewを通してから4.0の成果物をbuildする

作例とprojectの構成は[紙芝居DSL 4.0 台本作成ガイド](dsl-4.0-author-guide.md)を参照してください。
`;
}
