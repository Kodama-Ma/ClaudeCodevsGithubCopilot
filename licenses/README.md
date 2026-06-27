# licenses/ — 事業部ごとのライセンス台帳

このディレクトリが**データの真実の置き場所（source of truth）**です。
1リポジトリで全事業部を管理し、ファイルを事業部ごとに分割しています。

## ファイルと事業部の対応

| ファイル | 事業部 | 編集できる人（CODEOWNERS） |
|----------|--------|----------------------------|
| `dev1.csv` | 開発1部 | `@dev1-lead` |
| `dev2.csv` | 開発2部 | `@dev2-lead` |
| `dev3.csv` | 開発3部 | `@dev3-lead` |
| `dev4.csv` | 開発4部 | `@dev4-lead` |
| `dev5.csv` | 開発5部 | `@dev5-lead` |

> `@devN-lead` はサンプルのプレースホルダです。実運用では各部長の実GitHubハンドルに
> `.github/CODEOWNERS` を書き換えてください。

## カラム定義

| カラム | 説明 |
|--------|------|
| `Github-id` | 対象メンバーのGitHub ID |
| `事業部` | 所属事業部（ファイルと一致させる） |
| `グループ` | 所属グループ |
| `氏名` | 氏名 |
| `ツール` | 付与ツール（例: ClaudeCode / Codex / 配布なし） |
| `プラン` | プラン（例: Premium / Standard / Business）。配布なしは空欄 |

## 編集のしかた（部長向け）

1. 自分の事業部のCSV（例: `dev1.csv`）を編集してPRを作成
2. 自部署ファイルなら CODEOWNERS により**自分の承認だけ**でマージ可能
3. main にマージされると GitHub Actions が自動で
   - 全事業部を集計した `master.csv` を生成
   - ダッシュボード（GitHub Pages）を更新

## 事業部を増やすには

1. `licenses/devN.csv` をヘッダー行つきで追加
2. `.github/CODEOWNERS` に1行追加
3. 以上。集計・ダッシュボードは自動で取り込む
