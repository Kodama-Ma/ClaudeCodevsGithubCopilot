# ClaudeCodevsGithubCopilot

## AIツール ライセンス管理サンプル

GitHubリポジトリを台帳にして、全社のAIツール（ClaudeCode/Codex等）ライセンスを
**1リポジトリ・事業部ごとにファイル分割・部長は自部署だけ編集**で管理する構成のサンプル。

- データ: [`licenses/`](licenses/)（事業部ごとのCSV）
- 権限: [`.github/CODEOWNERS`](.github/CODEOWNERS)（自部署ファイルは自部長が承認）
- 集計: [`scripts/aggregate.py`](scripts/aggregate.py) → `master.csv` + ダッシュボード
- 自動化: [`.github/workflows/aggregate.yml`](.github/workflows/aggregate.yml)（mainマージで集計→Pages公開）
- 設計/技術スタック: [`docs/architecture.md`](docs/architecture.md)
