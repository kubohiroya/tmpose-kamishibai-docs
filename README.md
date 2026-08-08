# TMPose紙芝居ドキュメント

このリポジトリは、[TMPose紙芝居](https://github.com/kubohiroya/tmpose-kamishibai)の
一般文書、紙芝居DSL作成者向け文書、開発者向け文書、体験会資料を管理し、
独立したGitHub Pagesとして公開するためのリポジトリです。

文書sourceは`tmpose-kamishibai` PR #238のmerge commit
`8166edb3a8b7ed360685bdcd6534c000054105bd`から履歴付きで移設しています。
同commitで`docs/design/`、`docs/development/`に残っていた開発者向け3文書も、
読者別ディレクトリへ追加移設しています。文書の表示順は`docs/config.mjs`で管理し、
ファイル名には旧来の番号接頭辞を付けません。

## 公開サイトの役割

- `tmpose-kamishibai`: アプリ本体と、アプリ・文書・サンプルへ移動する公開入口
- `tmpose-kamishibai-docs`: 全文書のHTMLとVivliostyle Viewer、体験会資料のPDF
- `tmpose-kamishibai-samples`: サンプル台本と実行可能な作品

公開入口は `https://kubohiroya.github.io/tmpose-kamishibai/` に固定します。
このリポジトリのPagesは `https://kubohiroya.github.io/tmpose-kamishibai-docs/` を予定しています。

ドキュメントサイトの公開rootは版選択バナーだけを表示します。ワークショップ、サンプル、
ダウンロードへの共通導線はAppBarと公式トップで提供し、版固有の文書一覧は混在させず、
次の専用topで提供します。

- `/3.2/`: TXT台本、3.2.xアプリ、既存作品・教材を保守するための文書
- `/4.0/`: YAML project、Source Graph、preview／build toolchainで新しく制作するための文書
- `/workshops/`: 体験会資料を開催時期とDSL系列ごとに一覧表示する独立した入口

各版固有文書の通常HTML、`document.html`、`publication.json`、local assetは、
`/3.2/`または`/4.0/`以下へ生成します。以前のversion番号なしURLには自動転送を置かず、
対応する新URLと版選択rootを案内するページを残します。以前のVivliostyle Viewer URLが参照する
`publication.json`も、同じ移転案内を表示するWeb Publicationとして維持します。

## 文書の分類

移設元の`docs/general/`をそのまま再現せず、読者と用途により次のように分割します。

| ディレクトリ              | 対象読者                                |
| ------------------------- | --------------------------------------- |
| `docs/user-guides/`       | 一般利用者、保護者、教員、体験参加者    |
| `docs/tutorials/`         | DSL 4.0を順番に遊ぶ人・作る人           |
| `docs/dsl-author-guides/` | 紙芝居DSLで作品を作成・移行する人       |
| `docs/developer-guides/`  | アプリ、SB3、機能拡張を保守・開発する人 |
| `docs/workshops/`         | 体験会の参加者、スタッフ、運営者        |

具体的なファイル対応、依存境界、実施記録は[MIGRATION.md](MIGRATION.md)を参照してください。
`docs/tutorials/`はDSL 4.0リリース前のdraftであり、現時点では公開文書一覧とAppBarへ登録しません。

本文の用語、コード表記、固有概念の初出説明、図表の使い分けは
[TMPose紙芝居ドキュメント表記ガイド](WRITING-STYLE.md)に従います。
DSL 4.0の固定実装、正式リリース、公開画面、文書状態の区別は
[DSL 4.0 文書・公開状態の表記基準](DSL4-PUBLICATION-STATUS.md)で管理します。

## 開発

Node.js 24.0.0以降とpnpm 11を使用します。

```bash
pnpm install
pnpm check
```

`pnpm build`は、各文書のWeb Publicationを`dist/`へ生成します。PDFを生成するのは
`docs/workshops/`配下の体験会資料だけで、公開用PDFを`dist/`、確認用PDFを
`output/pdf/`へ出力します。2回目以降は入力と生成物の更新時刻を比較し、変更された
出版物だけを再生成します。全出版物を作り直す場合は`pnpm build:full`を使用します。
移設元の固定情報と機能拡張一覧は
[`sources/tmpose-kamishibai.json`](sources/tmpose-kamishibai.json)で管理します。

### DSLリファレンスの保守と出版

DSL 3系とDSL 4.0では、リファレンスの正本と保守方法を分けます。

公開サイトではDSL 3.2とDSL 4.0を並列の正式サポート対象として扱い、版ごとの専用セクションと
専用ページを提供します。既存のTXT台本と3.2.xを保守する場合は3.2、新しいYAML project、
Source Graph、preview／build toolchainで制作する場合は4.0を選びます。

- DSL 3系（現行実装が受理する宣言は3.1／3.2）: 過去リリースから引き継いだ手書きMarkdown
  [`docs/dsl-author-guides/command-reference.md`](docs/dsl-author-guides/command-reference.md)を、
  このリポジトリで引き続き保守します。
- DSL 4.0: 上流JSON Schemaの固定snapshot、source lock、日本語Annotationから
  [`docs/dsl-author-guides/dsl-4.0-schema-reference.md`](docs/dsl-author-guides/dsl-4.0-schema-reference.md)を
  決定的に生成します。

どちらのMarkdownも`pnpm build`で同じVivliostyle Web Publication工程へ入力し、通常のHTML版
（各公開ディレクトリの`document.html`）とVivliostyle Viewer版（`publication.json`）を同時に
用意します。DSL 3系をJSON Schemaへ置き換えたり、DSL 4.0と同じ生成方式へ擬似的に統一したりは
しません。

「TMPose紙芝居 アプリ・教材・ツールチェインガイド」も3.2版と4.0版を別のMarkdownとして保守し、
それぞれに通常HTML版とVivliostyle Viewer版を用意します。3.2版は`/3.2/`、4.0版は`/4.0/`以下の
独立した開発者向けpublicationとして提供し、以前のversion番号なしURLには移転案内を残します。

### DSL 4.0 Schemaリファレンスの生成

DSL 4.0のリファレンスは、上流JSON Schemaの固定snapshot、source lock、日本語Annotationから
決定的に生成します。現在は、規範JSON Schema、表層仕様、適合実装・testを含むDSL 4.0完成commitを
同一revisionとして固定します。Schemaはruntime実装から生成しません。通常のbuildはnetworkへ接続せず、
固定snapshotだけを読みます。Schema外でcompose前に処理するSource Graph／`include`の作者向け契約は、
固定した表層仕様と適合実装・testを根拠に台本作成ガイドで管理します。

```bash
pnpm docs:dsl4:check
pnpm docs:dsl4:generate
pnpm docs:dsl4:sync -- --repository ../tmpose-kamishibai --commit <commit>
```

上流を更新するときだけ`docs:dsl4:sync`を明示的に実行します。このコマンドは指定commitから
`schema/dsl-4.schema.json`を取得し、SHA-256とsource URLをlock fileへ記録してからリファレンスを
再生成します。生成Markdownは直接編集せず、日本語の説明、掲載順、例は
[`sources/dsl4/annotations.ja.json`](sources/dsl4/annotations.ja.json)で変更します。

準備は[Issue #1](https://github.com/kubohiroya/tmpose-kamishibai-docs/issues/1)、
本文移設は[Issue #3](https://github.com/kubohiroya/tmpose-kamishibai-docs/issues/3)、
残存文書と生成機構の移設は[Issue #5](https://github.com/kubohiroya/tmpose-kamishibai-docs/issues/5)で管理します。

## ライセンス

- 一般・DSL作成者・開発者向け文書、共有画像とその生成物: CC BY-SA 4.0
- 体験会資料とその生成物: Copyright © 2026 Hiroya Kubo. All rights reserved.
- 明示的に列挙したbuild script、site shell、設定、テスト: MPL-2.0

このリポジトリ全体に適用される単一のライセンスはありません。ファイルごとの正確な
適用範囲は[LICENSES.md](LICENSES.md)を参照してください。
