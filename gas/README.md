# GAS版 ライセンス管理Webアプリ

スプレッドシート1枚を裏に持ち、**セレクトボックスで編集しながら費用をライブ表示**する
GAS（Google Apps Script）Webアプリ。clasp でローカル開発＋git管理する構成。

人事項目（部・グループ・氏名）は `Organization` シートで一元管理し、`licenses` は
「誰に・どのツール・どのプラン」だけを持つ。画面表示時に github-id をキーに join する。

## 特徴

- 先頭の **All** タブは**権限に関わらず全社メンバーを閲覧**（編集不可）。各部タブで自部を編集。
  最後の**費用サマリー**タブは金額のみ権限で絞る（管理者＝全社／部長＝自部）
- **部タブは `Organization` の「部」から動的生成**。部の増減はシート編集だけで反映
- **Allタブの緑ボタン**で、**全メンバー一覧**を**固定の共有スプシに上書き出力して開く**（確認ダイアログ付き）。
  出力先は毎回同じスプシの `メンバー一覧` シートをまるごと書き換え（金額は出さない）。アプリ⇔スプシを行き来するだけ
- 各行を `<select>` でツール/プラン変更 → **月額費用が即時再計算**
- github-id・氏名・グループは **read-only表示**（`Organization` で一元管理。二重管理しない）
- 管理者は **費用サマリ**タブで部別・全社合計の月額を一覧
- **GitHub Enterprise Cloud のCSV（`github_licenses` シート）と突合**し、
  登録漏れ・退職放置を管理者に警告表示
- 権限はサーバー側で `Session.getActiveUser().getEmail()` を `roles` と照合
  - **`roles` に載っていないユーザーには中身を一切返さず「権限なし」画面を表示**
  - 部長は自部のみ編集可。他部はそもそもアプリに出ない
  - 保存時に github-id の所属部を `Organization` で再検証してなりすましを防止
- 変更は `log` シートに自動追記（簡易監査ログ）
- データは Google Workspace 内に閉じる（外部DB不要）

## シート構成

| シート | 列 | 役割 |
|--------|-----|------|
| `Organization` | github-id, 部, グループ, 氏名 | 人と所属のマスタ（ここでメンテ） |
| `licenses` | github-id, ツール, プラン | ライセンス付与のみ |
| `prices` | ツール, プラン, 月額単価 | 費用計算の元 |
| `roles` | メール, 部 | 編集権限（部=ALL で管理者） |
| `github_licenses` | github-id | GitHub Enterprise Cloud 出力CSVを貼る（突合用） |
| `log` | 日時, 操作者, 部, 内容 | 変更履歴（自動追記） |

## ファイル

| ファイル | 役割 |
|----------|------|
| `Code.gs` | サーバー：データ取得・保存・権限チェック・ログ |
| `Index.html` | 画面：タブ／セレクトボックス編集／費用ライブ計算 |
| `appsscript.json` | マニフェスト（Webアプリ：実行=デプロイ者 / アクセス=ドメイン内） |
| `.clasp.json.example` | clasp 設定の雛形 |

## セットアップ手順

### 1. スプレッドシートを用意

新規スプシを作るだけでOK（シートは後で `initSheets()` が自動で作ってくれる）。

スプシURLの `/d/<ここ>/edit` が **スプレッドシートID**。

### 2. clasp で配置

```bash
npm install -g @google/clasp
clasp login
cd gas
clasp create --type webapp --title "ライセンス管理"   # .clasp.json が生成される
clasp push                                             # Code.gs / Index.html を反映
```

### 3. スプシIDを設定・初期データ投入

Apps Scriptエディタで以下を順番に実行（各関数を選択して▶ボタン）：

```
① setSpreadsheetId('＜マスタースプレッドシートID＞')        // 管理用スプシIDを登録
② initSheets()                                            // 各シートを自動作成＆初期データ投入
③ setExportSpreadsheetId('＜エクスポート先スプシID＞')      // 書き出し先（固定・共有用）を登録
```

> エクスポート先は別スプシを1枚作っておく（中身は空でOK／`サマリー`・`明細`シートは自動生成）。
> 閲覧してほしい人にはこのスプシだけ共有する。Allタブの緑ボタンを押すたびに最新状態で上書きされる。

`initSheets()` が Organization / licenses / prices / roles / github_licenses / log を
まとめて作ってくれる。完了後、実データに置き換える：
- **roles** … メールを実際の部長・管理者アドレスに（部=ALL が管理者）
- **prices** … 月額単価を実額に
- **Organization** … 部・グループ・氏名・github-id を実データに
- **github_licenses** … GitHub Enterprise Cloud の出力CSV（github-id列）を貼る

### 4. デプロイ

```bash
clasp deploy --description "v1"
```

または エディタ → デプロイ → 新しいデプロイ → ウェブアプリ
（実行=自分 / アクセス=ドメイン内のユーザー）。発行されたURLを部長に配る。

> ⚠️ マスタースプシは**部長に共有しない**。アプリURLだけ配る。これで部長は生データに触れず、
> アプリ越しに自部署だけ編集できる（＝1ファイル1権限の壁を回避）。

## ローカル開発

`Code.gs` / `Index.html` を編集 → `clasp push`。git管理されるのでブラウザエディタと格闘不要。
