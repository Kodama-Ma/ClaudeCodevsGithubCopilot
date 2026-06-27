# GAS版 ライセンス管理Webアプリ

スプレッドシート1枚を裏に持ち、**セレクトボックスで編集しながら費用をライブ表示**する
GAS（Google Apps Script）Webアプリ。clasp でローカル開発＋git管理する構成。

## 特徴

- 事業部タブ切替。各行を `<select>` でツール/プラン変更 → **月額費用が即時再計算**
- 管理者は **費用サマリ**タブで部署別・全社合計の月額を一覧
- 権限はサーバー側で `Session.getActiveUser().getEmail()` を `roles` シートと照合
  - 部長は自部署のみ編集可。他部署はそもそもアプリに出ない
  - 保存時に事業部を強制上書きしてなりすましを防止
- 変更は `log` シートに自動追記（簡易監査ログ）
- データは Google Workspace 内に閉じる（外部DB不要）

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
① setSpreadsheetId('＜スプレッドシートID＞')   // スプシIDを登録
② initSheets()                                  // 4シートを自動作成＆初期データ投入
```

`initSheets()` が licenses / pricing / roles / log の4シートをまとめて作ってくれる。
完了ダイアログが出たら、**roles シートのメールアドレスを実際の部長・管理者アドレスに書き換える**。
pricing の月額単価も実際の金額に直す。

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
