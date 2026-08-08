export const documentCollections = [
  {
    id: 'user-guides',
    version: '3.2',
    title: '一般向けドキュメント',
    documents: [
      {
        sourceFilename: 'executive-summary-adult.md',
        title: '紙芝居アプリ 3.2 概要説明書 大人向け',
        audience: '保護者・教員・運営者',
        description:
          'TMPose紙芝居3.2の価値、仕組み、利用場面、教育的な意義を簡潔にまとめています。',
      },
      {
        sourceFilename: 'executive-summary-adult-4.0.md',
        version: '4.0',
        title: '紙芝居アプリ 4.0 概要説明書 大人向け',
        audience: '保護者・教員・教材作成者・運営者',
        description:
          'TMPose紙芝居4.0の価値、YAMLプロジェクト、Source Graph、プレビュー・ビルド、カメラ・ポーズ入力、教育利用を説明します。',
      },
      {
        sourceFilename: 'executive-summary-kids.md',
        title: '紙芝居アプリ 3.2 概要説明書 子供向け',
        audience: '子供・初めての方',
        description: 'TMPose紙芝居3.2でできることや安全な使い方を、やさしい言葉で紹介します。',
        addFurigana: true,
      },
      {
        sourceFilename: 'executive-summary-kids-4.0.md',
        version: '4.0',
        title: '紙芝居アプリ 4.0 概要説明書 子供向け',
        audience: '子供・初めての方',
        description:
          'TMPose紙芝居4.0で「見る・動く・作る」方法と、カメラ、個人情報、まわりの安全、困ったときの行動をやさしい言葉で説明します。',
        addFurigana: true,
      },
      {
        sourceFilename: 'user-guide.md',
        title: '紙芝居アプリ 3.2 操作説明書',
        audience: 'アプリを使う方',
        description:
          'TMPose紙芝居3.2の台本読み込み、再生、ポーズ認識、本番前の確認方法を説明します。',
      },
    ],
  },
  {
    id: 'dsl-3.2-guides',
    version: '3.2',
    title: '紙芝居DSL 3.2 公式ドキュメント',
    documents: [
      {
        sourceFilename: 'dsl-manual.md',
        sourceDirectory: 'dsl-author-guides',
        outputDirectory: 'dsl-author-guides',
        title: '紙芝居DSL 3.2 ファイル作成マニュアル',
        audience: 'DSL 3.2の作品を作る方',
        description:
          '3.1／3.2宣言の互換性、3.2台本の設計、旧Text Assetの互換期間、SVG Textへの移行を含む作成・テスト手順を説明します。',
      },
      {
        sourceFilename: 'command-reference.md',
        sourceDirectory: 'dsl-author-guides',
        outputDirectory: 'dsl-author-guides',
        title: '紙芝居DSL 3.2 コマンドリファレンス',
        audience: 'DSL 3.2の台本文法を調べる方',
        description:
          '過去リリースから引き継いだ手書きMarkdownで、3.2.xが受理する3.1／3.2宣言、コマンド、アクション、Text Asset互換仕様、注意事項を保守しています。',
      },
      {
        sourceFilename: 'history.md',
        sourceDirectory: 'dsl-author-guides',
        outputDirectory: 'dsl-author-guides',
        title: '紙芝居DSL 2.0から3.2への変更履歴',
        audience: '2.0から移行する方',
        description:
          '2.0から3.1の累積差分と、3.2.xの宣言互換性、旧Text Asset互換期間、SVG Textへの段階移行をまとめています。',
      },
    ],
  },
  {
    id: 'dsl-4.0-guides',
    version: '4.0',
    title: '紙芝居DSL 4.0 公式ドキュメント',
    documents: [
      {
        sourceFilename: 'dsl-4.0-author-guide.md',
        sourceDirectory: 'dsl-author-guides',
        outputDirectory: 'dsl-author-guides',
        title: '紙芝居DSL 4.0 台本作成ガイド',
        audience: 'DSL 4.0の作品を作る方',
        description:
          '完成したDSL 4.0について、Source Graph、プロジェクト配置、変更の自動反映、カメラプレビュー、発話、透明度、分岐、診断を説明します。',
      },
      {
        sourceFilename: 'dsl-4.0-schema-reference.md',
        sourceDirectory: 'dsl-author-guides',
        outputDirectory: 'dsl-author-guides',
        title: '紙芝居DSL 4.0 Schemaリファレンス',
        audience: 'DSL 4.0のSchemaを確認する方',
        description:
          '完成コミットの規範JSON Schemaから、カメラプレビュー、発話、思考、moveToのeasing、setTransparencyを含む型と制約を生成しています。',
      },
      {
        sourceFilename: 'dsl-3.2-to-4.0-conversion-guide.md',
        sourceDirectory: 'dsl-author-guides',
        outputDirectory: 'dsl-author-guides',
        title: '紙芝居DSL 3.2から4.0への変換ガイド',
        audience: 'DSL 3.1／3.2の既存作品を4.0へ移行する方',
        description:
          'convert-dsl4の実行方法、pose model置換、診断、変換できない入力、検証とrollbackを説明します。',
      },
    ],
  },
  {
    id: 'developer-guides',
    version: '3.2',
    title: '開発者向けドキュメント',
    documents: [
      {
        sourceFilename: 'application-materials-guide.md',
        outputDirectory: 'user-guides',
        title: 'TMPose紙芝居 3.2 アプリ・教材・ツールチェインガイド',
        audience: 'DSL 3.2のアプリ、教材、ツールチェインを把握する方',
        description:
          'DSL 3.2系列のアプリ、浦島太郎、体験会教材、台本、sb3-toolchainを図解付き・全8ページで紹介します。',
      },
      {
        sourceFilename: 'application-materials-guide-4.0.md',
        version: '4.0',
        title: 'TMPose紙芝居 4.0 アプリ・教材・ツールチェインガイド',
        audience: 'DSL 4.0のアプリ、教材、ツールチェインを把握する方',
        description:
          'DSL 4.0系列のプロジェクト、Source Graph、体験教材の構成、YAML台本、プレビュー、ビルドを図解付き・全8ページで紹介します。',
      },
      {
        sourceFilename: 'developer-guide.md',
        title: '紙芝居アプリ 3.2 ソフトウェアメンテナンスガイド',
        audience: 'TMPose紙芝居3.2を保守するソフトウェア開発者',
        description:
          'TMPose紙芝居3.2の成果物とビルダー、アプリ本体、SB3、ドキュメントの変更、検証、公開手順を案内します。',
      },
      {
        sourceFilename: 'developer-guide-4.0.md',
        version: '4.0',
        title: '紙芝居アプリ 4.0 ソフトウェアメンテナンスガイド',
        audience: 'TMPose紙芝居4.0のソースフロントエンド、ランタイム、アダプターを保守する開発者',
        description:
          'DSL 4.0の固定スキーマ、Source Graphのトランザクション、プレビュー／ビルドのアダプター、自己完結SB3、検証表、リリースとロールバックを案内します。',
      },
      {
        sourceFilename: 'internal-specification.md',
        title: '紙芝居アプリ 3.2 内部仕様書',
        audience: 'TMPose紙芝居3.2の実装を調査・変更する方',
        description:
          'TMPose紙芝居3.2の汎用アプリSB3におけるtarget、変数、block、message、呼出し関係、状態遷移を記録します。',
      },
      {
        sourceFilename: 'internal-specification-4.0.md',
        version: '4.0',
        title: '紙芝居アプリ 4.0 内部仕様書',
        audience: 'TMPose紙芝居4.0の実装を調査・変更する方',
        description:
          'TMPose紙芝居4.0のソースフロントエンド、Source Graph、StoryDocument、ランタイム、プラットフォームアダプター、トランザクション、状態遷移を記録します。',
      },
      {
        sourceFilename: 'extension-guide.md',
        title: 'TMPose紙芝居 3.2 機能拡張ガイド',
        audience: 'TMPose紙芝居3.2の依存機能を調査・変更する方',
        description:
          'TMPose紙芝居3.2が利用する16個の依存機能拡張を1拡張2ページで図解し、sb3-toolchainによるbundle構成も説明する全34ページのガイドです。',
      },
      {
        sourceFilename: 'extension-guide-4.0.md',
        version: '4.0',
        title: 'TMPose紙芝居 4.0 機能拡張・プラットフォーム統合ガイド',
        audience: 'TMPose紙芝居4.0のcapability、adapter、外部統合を調査・変更する方',
        description:
          'DSL 4.0 Standard Runtimeのsource composition、platform adapter、browser／CLI／Production SB3の能力差、権限、fallback、bundle境界を説明します。',
      },
      {
        sourceFilename: 'dsl-3.1-diagnostics-design.md',
        title: 'DSL 3.1 台本診断・安全停止 設計レビュー',
        audience: '台本診断と安全停止を保守する方',
        description:
          'DSL 3.1の限定preflight、診断データモデル、機能拡張との境界、安全停止の設計判断を記録します。',
      },
      {
        sourceFilename: 'dsl-4.0-diagnostics-design.md',
        version: '4.0',
        title: 'DSL 4.0 台本診断・安全停止 設計レビュー',
        audience: 'DSL 4.0の診断、transaction、安全停止を実装・レビューする方',
        description:
          'DSL 4.0の解析、スキーマ、意味検証、include、アセットのトランザクション、ランタイム、プラットフォーム診断と、不正な候補、副作用禁止、後片付け、表示画面を記録します。',
      },
      {
        sourceFilename: 'dependency-audit.md',
        title: 'TMPose紙芝居 3.2 依存関係監査記録',
        audience: 'TMPose紙芝居3.2の依存更新とsecurity overrideを保守する方',
        description:
          'TMPose紙芝居3.2について2026年8月に実施した依存更新、脆弱性監査、overrideの理由と解除条件を記録します。',
      },
      {
        sourceFilename: 'release-smoke.md',
        title: 'DSL 3.1 release smoke',
        audience: 'リリース候補をブラウザで検証する方',
        description:
          'Scratch VMテストでは確認できないEditor、カメラ、TMPose、Packagerのrelease smoke手順をまとめます。',
      },
    ],
  },
];

export const documentationConfig = {
  title: 'TMPose紙芝居 ドキュメント',
  author: 'Hiroya Kubo',
  tocSectionDepth: 3,
  standaloneArticleHtmlFilename: 'document.html',
  standaloneTocHtmlFilename: 'index.html',
  collections: documentCollections,
  documents: documentCollections.flatMap((collection) =>
    collection.documents.map((document) => {
      const version = document.version ?? collection.version;
      const legacyOutputDirectory = document.outputDirectory ?? collection.id;
      return {
        ...document,
        version,
        collectionId: collection.id,
        sourceDirectory: document.sourceDirectory ?? collection.id,
        legacyOutputDirectory,
        outputDirectory: `${version}/${legacyOutputDirectory}`,
      };
    }),
  ),
};

export const workshopDocumentConfig = {
  versionFamily: '3.2系',
  title: 'AIを使って「紙芝居の物語に参加する仕組み」を作ろう！',
  author: 'Hiroya Kubo',
  sourceDirectory: 'workshops/2026-08-01',
  legacyOutputDirectory: 'workshops/2026-08-01',
  outputDirectory: 'workshops/2026-08-01',
  learnedThroughGrade: 3,
  coverFilename: 'tmpose-kamishibai-cover-20260801.md',
  coverHtmlFilename: 'index.html',
  sourceFilename: 'tmpose-kamishibai-20260801.md',
  tocHtmlFilename: 'toc.html',
  pdfFilename: 'tmpose-kamishibai-20260801.pdf',
  tocSectionDepth: 3,
  rubyOverrides: [
    '久保裕也:裕也:ひろや',
    '竜宮城:りゅうぐうじょう',
    '玉手箱:たまてばこ',
    '浦島太郎:うらしまたろう',
    '未習漢字:みしゅうかんじ',
  ],
};

export const staffDocumentConfig = {
  versionFamily: '3.2系',
  title: '親子AIプログラミング体験会スタッフ向け資料2026年8月1日版',
  author: 'Hiroya Kubo',
  sourceDirectory: 'workshops/2026-08-01',
  legacyOutputDirectory: 'workshops/2026-08-01/staff',
  outputDirectory: 'workshops/2026-08-01/staff',
  sourceFilename: 'tmpose-kamishibai-staff-20260801.md',
  htmlFilename: 'index.html',
  pdfFilename: 'tmpose-kamishibai-staff-20260801.pdf',
};

export function findDocument(sourceFilename) {
  return documentationConfig.documents.find(
    (document) => document.sourceFilename === sourceFilename,
  );
}

export function resolveLearnedThroughGrade(value = process.env.RUBYGANA_GRADE) {
  const grade =
    value === undefined || value === ''
      ? workshopDocumentConfig.learnedThroughGrade
      : Number(value);

  if (!Number.isInteger(grade) || grade < 1 || grade > 6) {
    throw new RangeError('RUBYGANA_GRADE must be an integer from 1 through 6.');
  }

  return grade;
}
