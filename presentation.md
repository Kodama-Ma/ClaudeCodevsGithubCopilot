# Claude Code の使い方 — GitHub Copilot から乗り換える人のための入門（発表者用資料）

> 社内勉強会（60分）/ 2026年6月時点の情報
> **目的: Claude Code の使い方の習得と、Copilot ハーネス資産の移行。** 聴衆は AI エージェント自体には習熟している（skill / customAgent / hooks を作り込んでいる）前提。
> 構成: ① 背景編15分 → **② 使い方・移行編35分（メイン）** → ③ これから編10分

---

# ① 背景編（15分）

## 1-1. Claude Code とは — 「答える」ではなく「やり遂げる」

**Anthropic 製の自律型 AI コーディングエージェント**（2025年2月登場）。

> あなた:「ログイン後に500になるバグ、直しといて」
> Claude Code: リポジトリ探索 → 原因特定 → 修正 → テスト実行 → 落ちたら自分で直して再実行 → 結果報告

- エージェンティックループ: **状況把握 → 行動 → 検証** をゴールまで繰り返す
- 道具: ファイル読み書き、コード検索、**シェル実行（テスト・ビルド・git）**、Web 検索
- シェルが使えるから「**動くことを確認済み**」で返してくる — 補完 AI には構造的に不可能

数字（2026年初頭）: 職場採用率 **3%→18%**（2025/4→2026/1、同期間 Copilot は 67%→51%）/ **経験10年以上の46%が第一choice**（Copilot 9%）/ SWE-bench Verified **80.8%**

## 1-2. Anthropic と OpenAI の関係

- **2021年、OpenAI の安全性研究の中核メンバーが独立して設立**（Dario Amodei 元研究VP、Daniela Amodei 元安全・ポリシーVP ら）
- 「商業化スピード vs 安全性」の路線対立が背景 → AI セーフティが企業理念の中心
- 実利: **Team/Enterprise/API の入力はモデル学習に不使用（デフォルト）**
- ChatGPT/Codex と Claude は**同根のライバル**

### ⚠️ 「Copilot で Claude を選ぶ」のと「Claude Code」は別物

Copilot のモデルピッカーにも Claude Opus 4.8 等が並ぶが、ハーネス（システムプロンプト・ツール定義・ループ制御）が GitHub 製 vs **Anthropic 製・モデルと共進化**で別物。エージェント性能は「モデル × ハーネス」で決まる。純正フルチューンと載せ替えエンジンの差。

## 1-3. なぜ今乗り換えるか — 定額はどこに残っている？

**2026年6月1日、Copilot は AI Credits（1クレジット=$0.01）従量制に移行。** 補完は無料のままだが Chat / Agent mode / CLI / レビューは全部クレジット消費。1タスク $1〜5 → 「今月あと何回頼めるか」を数える日々。

### プラン帯別の課金方式（2026年6月）

| プラン帯 | Copilot | Claude Code | Codex |
|---|---|---|---|
| 個人 | **従量**（2026/6〜） | ✅ 定額（Pro $20 / Max $100〜200） | ✅ 定額（Plus $20 / Pro $100〜） |
| **Team / Business** | **従量**（Credits） | ✅ **定額** Standard $25〜30/席（枠小）/ **Premium $100〜125/席**（5席〜） | ✅ **定額** Business $25〜30/席（枠小） |
| Enterprise | 従量 | **従量**（pay-as-you-go） | **従量** |

話すポイント:
- **Copilot だけが全プラン帯で従量**。Claude / Codex は個人〜Team/Business に定額が残る（エンプラは両社とも従量）— だから定額帯を選ぶ
- Claude Team は **Standard（安いがトークン枠小）と Premium の2種**。Codex Business も安いが枠が小さい
- エージェントをフル活用する前提なら枠の小さい席では足りない → 結論: うちは **Claude Team Premium**

## 1-4. 「定額」の正体 — 上限、週次リミット、ボーナスタイム

誠実に説明する（ここをごまかすと後で信頼を失う）:

- 無制限ではない。**5時間ごとにリセットされるセッション枠 ＋ Weekly Limit（週次上限）** の二段構え
- 上限に当たっても → 待てば回復、**追加請求は1円も発生しない**（従量制との決定的な差）

### 🎁 たまに「Limit リセット」が降ってくる

- Anthropic / OpenAI は**新モデルのリリース記念や障害のお詫びで、全ユーザーの Limit をリセット**することがある
- 従量制では絶対に起きない、**定額プランだけのボーナスタイム**。来たら遠慮なく使い倒す

> 「失敗してもお金が減らない」は行動を変える。雑に・大量に・実験的に頼める → 試行回数が稼げる → 上達する。

---

# ② 使い方・移行編（35分・メイン）

## 2-1. 実行方法は4つ（中身は同じエージェント）

| 入口 | 起動 | 用途 |
|---|---|---|
| **VS Code / JetBrains 拡張** | 拡張インストール | **Copilot Chat 民はまずここ** |
| **CLI（基本形）** | `claude` | すべての基本。SSH 先・コンテナでも動く |
| デスクトップアプリ | Claude Desktop | 並列セッション管理 |
| Web / クラウド | claude.ai/code | ローカル不要・サンドボックス実行 |

ほか: GitHub Actions（PR で `@claude`）、ヘッドレス `claude -p "..."`。
⚠️ **この2つは API 従量の別料金**（定額シートの枠外）。CI に組み込むときは予算に注意。
**おすすめ: VS Code 拡張で始めて、慣れたら CLI に降りる。**

## 2-2. CLI を覚える価値 — 操作体系が「業界標準」になっている

```bash
curl -fsSL https://claude.ai/install.sh | bash   # または npm i -g @anthropic-ai/claude-code
cd your-repo && claude                            # 初回はブラウザ認証
```

**Claude Code CLI は各社にコピーされた「原型」:**

- **Copilot CLI も Codex CLI も Devin CLI も Antigravity CLI も、操作体系は Claude Code CLI の後追い** — REPL + スラッシュコマンド、`/init` 相当、`@` ファイル参照、許可モード…コマンド互換性が大きい
- CLI で覚えた操作は**ツールを乗り換えてもほぼそのまま通用する**
- GUI はツールごとに画面も概念も違って学び直し。**CLI なら移行初日から同じ手が動く**
- 今回の移行で苦労する人も、CLI に慣れれば**次の乗り換えはタダ同然**
- おまけ: SSH 先・コンテナ・CI でも同じ体験（`claude -p` は API 従量・別料金）

## 2-3. ハンズオン1: VS Code へのインストール（5分）

1. 拡張ビュー（`Cmd+Shift+X`）で「**Claude Code**」検索（発行元: Anthropic）→ Install
2. サイドバーの Claude アイコン → **Sign in**（**必ず会社の Team アカウント**で — 個人アカウントは規約が違う）
3. 開き方: サイドバーアイコン / **`Cmd+Esc`**（Win: `Ctrl+Esc`）/ コマンドパレット

- Copilot Chat と同じ操作感: チャットに日本語で依頼、`@` でファイル添付、変更はインライン diff で承認/拒否
- 無いもの: 複数セッション並列（タブ）、開いているファイル・選択範囲の自動認識、plan モード切替（コマンドパレットから）、CLI と設定共有（`~/.claude`）
- ✅ 動作確認: 「このリポジトリの構成を説明して」

## 2-4. Copilot Chat から来た人がつまずくポイント

| つまずき | どうする |
|---|---|
| 補完が出ない | 仕様。補完は Copilot 併用（無料のまま） |
| `Shift+Tab` が効かない（VS Code） | インデント解除と競合。`Cmd+Shift+P` → "Switch permission mode"（CLI では `Shift+Tab` で切替） |
| いちいち実行許可を聞かれる | ask がデフォルト。許可リスト（`.claude/settings.json`）を育てて auto（acceptEdits）へ |
| `copilot-instructions.md` が無視される | Claude が読むのは **CLAUDE.md**。移行する（2-6） |
| 長く使うと遅く・鈍くなる | 1セッション=1タスク文化。区切りで `/clear` — 消しても **`/resume`** で過去セッションに復帰できる（VS Code でも可。続きの圧縮は `/compact`、確認は `/context`） |
| 勝手に動いて怖い | **plan モード**（読み取り専用）で計画だけ出させて、承認してから実装させる |

補足トーク: Copilot Chat は「会話」、Claude Code は「タスク依頼」。**ゴール・制約・完了の確認方法（テストコマンド）**の3点を渡すと、自分で検証してから報告してくる。

## 2-5. ライブデモ

`/init` → plan モードで実バグ修正を依頼 → 計画レビュー → 実装。
見せるポイント: ①計画を立ててから動く ②自分でテストを回す ③落ちたら自分でリトライ。
準備: 再現可能なバグを仕込んだリポジトリ、ネットワーク断に備えた録画。

## 2-6. ハンズオン2: ハーネス資産の移行マップ

みんなが作り込んだ Copilot ハーネスには**全部に対応物がある**:

| Copilot で育てた資産 | Claude Code での対応物 | 移行の手間 |
|---|---|---|
| `copilot-instructions.md` | **`CLAUDE.md`** | `/init` ＋統合を Claude に依頼 |
| パス別 `*.instructions.md` | サブディレクトリ別 CLAUDE.md | ほぼ機械的 |
| プロンプトファイル `*.prompt.md` | `.claude/commands/*.md`（スラッシュコマンド） | ほぼ機械的 |
| **カスタムエージェント** | **`.claude/agents/*.md`（サブエージェント）** | プロンプト本文は流用可 |
| **skill** | **`.claude/skills/`（スキル）** | ほぼそのまま |
| **hooks** | **`.claude/settings.json` の hooks** | イベント名の読み替えのみ |
| MCP 設定 | `.mcp.json` | **共通規格・コピーで OK** |

手順 — 移行作業自体を Claude に頼む（最初の練習として最適）:
> 「`.github/` 配下の Copilot 設定を読んで Claude Code 用に変換して。**実コードと矛盾する古い記述は変換せず一覧で報告して**」

人間はレビューに徹する: ✅ コマンド・規約・禁止事項 / ❌ 理念・自明なこと（書きすぎると指示が薄まる）。PR でチームレビューしてマージ。

## 2-7. 移行の本質 — ハーネスを「ツール非依存」にリファクタする

`.github/` は**消さない**。両対応（マルチエージェント）repo にする:

```
repo/
├ .github/copilot-instructions.md   ← Copilot 用エントリ（薄く残す）
├ CLAUDE.md                         ← Claude Code 用エントリ
├ AGENTS.md                         ← Codex ほか各社が読む業界標準エントリ
├ docs/agents/                      ← ★知識の本体（規約・コマンド・禁止事項）
└ .claude/ .mcp.json                ← Claude 固有の設定
```

- 各エントリファイルは **`docs/agents/` を参照するだけの「薄いアダプタ」**にする
- 知識の本体が1箇所 → **Copilot でも Claude でも Codex でも動く repo**、二重メンテなし
- **次の乗り換え（必ず来る）が「エントリ1枚追加」で済む** — これがこのリファクタの本質
- 今日 Claude 用に作る構成は、そのまま将来の Codex 移行にも効く

---

# ③ これから編（10分）

## 3-1. ⚠️ 定額は「ボーナスタイム」かもしれない

| 時期 | 出来事 |
|---|---|
| 2026年4月 | Codex がトークン従量課金へ |
| 2026年4月 | **Anthropic も Pro から Claude Code を一時削除（24時間で撤回）— 予兆** |
| 2026年6月 | Copilot が AI Credits 従量制へ |

エージェントの消費トークンは年々増える（並列化・長時間化）。定額はベンダーにとって重くなる一方 — **いつ転換されてもおかしくない**。
**定額の今は「練習し放題の期間」。** 従量制になった日に、トークン効率の良い使い方が身についている人と、青天井の請求に怯える人に分かれる。

## 3-2. トークンの使い方 — 今日から鍛える5つの習慣

| 習慣 | 理由 |
|---|---|
| ① タスクの区切りで `/clear` | 長いコンテキストは高い・遅い・**精度も落ちる**。消しても `/resume` で戻れるから恐れない |
| ② 巨大ログ・JSON を貼らない | パスを渡して「必要な部分だけ読んで」 |
| ③ 調査はサブエージェントへ | 子が10万トークン読んでも親には結論だけ |
| ④ モデルの使い分け | 軽作業 Haiku/Sonnet、難所だけ Opus（API 単価は数十倍違う） |
| ⑤ `/context` を見る癖 | 「今何トークン載ってるか」= 従量時代の燃費計 |

節約術ではなく**コンテキストエンジニアリング**。コンテキストを制する者がエージェントの精度も制する（料金は副産物）。**良い使い方とトークン効率は同じもの。**

## 3-3. ツールの使い方でなく「体系」を学ぶ

ツールは1年で入れ替わる（このプレゼン自体が乗り換えの話）。残るのは概念:

- **コンテキストエンジニアリング** — 何を読ませ、何を読ませないか
- **検証可能性の設計** — テスト・型・lint が整った repo ほど AI は強く働く → **コード品質への投資 = AI の性能への投資**
- **ハーネスのツール非依存設計** — 今日の移行リファクタがまさにこれ
- **権限設計** — 何を自動許可し、何を人間が握るか
- **エージェントマネジメント** — 1人が複数エージェントを並列監督する働き方へ

> 開発者の役割は「コードを書く人」から **「仕様を定義し、検証を設計し、エージェントを監督する人」へ**

---

# 付録A: 60分タイムテーブル

| 時間 | 内容 |
|---|---|
| 0:00–0:04 | Claude Code とは |
| 0:04–0:08 | Anthropic と OpenAI / 「Copilot の中の Claude」との違い |
| 0:08–0:15 | 課金比較（Team/Business 帯だけ定額）+ 定額の正体・ボーナスタイム |
| 0:15–0:20 | 実行方法 4つ + CLI の互換性メリット |
| 0:20–0:27 | **ハンズオン1: VS Code インストール & 初回起動** |
| 0:27–0:33 | つまずきポイント |
| 0:33–0:40 | **ライブデモ** |
| 0:40–0:48 | **ハンズオン2: ハーネス移行マップ + ツール非依存リファクタ** |
| 0:48–0:57 | これから編（定額ボーナスタイム + トークン5習慣 + 体系） |
| 0:57–1:00 | Q&A |

# 付録B: 想定 Q&A

- **Q. Copilot は解約？** → 補完は無料枠で併用が現実解。エージェント用途を Claude Code に寄せる
- **Q. コードは学習される？** → Team/Enterprise/API はデフォルトで不使用。**必ず会社の Team アカウントで使う**（個人プランは規約が違う）
- **Q. 暴走しない？** → ask モード + 許可リスト + フック + サンドボックス。最初は plan モードで様子見も可
- **Q. 定額枠を使い切ったら？** → 5時間でリセット（週次上限あり）・追加請求なし。頻発するならタスク分割と `/clear` 習慣を見直すサイン
- **Q. `.github/` の Copilot 設定は消していい？** → 消さない。補完併用のためにも、両対応 repo 構成（2-7）で薄く残す
- **Q. 日本語で使える？** → 問題ない。CLAUDE.md も日本語で OK

# 出典

- [GitHub Copilot is moving to usage-based billing — GitHub Blog](https://github.blog/news-insights/company-news/github-copilot-is-moving-to-usage-based-billing/)
- [Devs Sound Off on Usage-Based Copilot Pricing Change — Visual Studio Magazine](https://visualstudiomagazine.com/articles/2026/04/27/devs-sound-off-on-usage-based-copilot-pricing-change-you-will-get-less-but-pay-the-same-price.aspx)
- [GitHub Copilot Plans & Pricing](https://github.com/features/copilot/plans)
- [Claude Plans & Pricing](https://claude.com/pricing)
- [What is the Max plan? — Claude Help Center](https://support.claude.com/en/articles/11049741-what-is-the-max-plan)
- [Claude Code Removed from Pro Plan (April 2026, 撤回済み)](https://pasqualepillitteri.it/en/news/1211/claude-code-removed-pro-plan-anthropic-april-2026)
- [Codex Pricing — OpenAI](https://developers.openai.com/codex/pricing)
- [Claude Code vs GitHub Copilot (2026) — morphllm](https://www.morphllm.com/comparisons/claude-code-vs-copilot)
- [Claude Code Docs — What's new](https://code.claude.com/docs/en/whats-new)
