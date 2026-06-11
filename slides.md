---
marp: true
theme: default
paginate: true
style: |
  section {
    background: #16130f;
    color: #ede6db;
    font-family: 'Hiragino Sans', 'Noto Sans JP', 'Helvetica Neue', sans-serif;
    font-size: 23px;
    padding: 55px 65px;
    line-height: 1.55;
  }
  section::after { color: #7a6f60; font-size: 16px; }
  h1 { color: #d97757; font-size: 42px; margin-bottom: 0.4em; }
  h2 { color: #e8a285; font-size: 30px; }
  h3 { color: #e8a285; font-size: 25px; }
  strong { color: #f0b27a; }
  em { color: #c9bba8; }
  a { color: #e8a285; }
  code { background: #2a241d; color: #f5c99b; padding: 2px 7px; border-radius: 4px; }
  pre { background: #211c16; border-left: 4px solid #d97757; border-radius: 6px; }
  pre code { background: transparent; }
  table { font-size: 19px; border-collapse: collapse; }
  th { background: #d97757; color: #16130f; border: none; padding: 7px 12px; }
  td { background: #211c16; border: 1px solid #3a322a; padding: 7px 12px; }
  blockquote {
    border-left: 6px solid #d97757; background: #241d15;
    padding: 0.6em 1.2em; border-radius: 0 8px 8px 0;
    color: #f5e9d8; font-size: 105%;
  }
  section.lead { text-align: center; justify-content: center;
    background: radial-gradient(ellipse at 30% 20%, #3d2317 0%, #16130f 70%); }
  section.lead h1 { font-size: 58px; }
  section.lead h2 { color: #c9bba8; font-weight: normal; }
  section.chapter { justify-content: center;
    background: linear-gradient(135deg, #b85c38 0%, #6e2f1a 100%); }
  section.chapter h1 { color: #fff7f0; font-size: 54px; }
  section.chapter p { color: #ffd9c4; font-size: 26px; }
  .cols { display: flex; gap: 36px; }
  .cols > div { flex: 1; }
  .stat { text-align: center; background: #211c16; border-radius: 12px; padding: 18px 10px; }
  .stat .n { font-size: 58px; font-weight: 800; color: #d97757; }
  .stat .l { font-size: 18px; color: #c9bba8; }
  .good { color: #9ec98f; }
  .bad { color: #d97766; }
---

<!-- _class: lead -->

# Claude Code の使い方

## GitHub Copilot から乗り換える人のための入門ハンズオン

2026年6月 社内勉強会（60分）

---

# 今日のゴール: 帰るときに「できる」状態にする

| ✅ できるようになること | どこで扱うか |
|---|---|
| Claude Code が Copilot と何が違うか説明できる | 背景編（前半15分） |
| 定額プランの正体と「ボーナスタイム」がわかる | 背景編 |
| **VS Code にインストールして最初のタスクを頼める** | **使い方・移行編（メイン35分）** |
| Copilot との差異・つまずきポイントを回避できる | 使い方・移行編 |
| **skill / customAgent / hooks のハーネス資産を両対応にできる** | 使い方・移行編 |
| 定額のうちにトークン感覚を鍛える理由がわかる | これから編（10分） |

> 構成: **① 背景編** → **② 使い方・移行編（ここがメイン）** → **③ これから編**

---

<!-- _class: chapter -->

# ① 背景編

そもそも何者で、なぜ乗り換えるのか（15分）

---

# Claude Code とは — 「答える」ではなく「やり遂げる」

**Anthropic 製の自律型 AI コーディングエージェント**（2025年2月登場）

> あなた:「ログイン後に500になるバグ、直しといて」
> Claude Code: リポジトリ探索 → 原因特定 → 修正 → **テスト実行** → 落ちたら自分で直して再実行 → 結果報告

- 中身は「エージェンティックループ」: **状況把握 → 行動 → 検証** をゴールまで繰り返す
- 道具: ファイル読み書き / コード検索 / **シェル実行(テスト・ビルド・git)** / Web 検索
- シェルが使えるから **「動くことを確認済み」で返してくる** — 補完 AI には構造的に不可能

<div class="cols">
<div class="stat"><div class="n">3→18%</div><div class="l">職場採用率の急成長<br>(2025/4→2026/1)</div></div>
<div class="stat"><div class="n">46%</div><div class="l">経験10年+の開発者の<br>第一choice (Copilotは9%)</div></div>
<div class="stat"><div class="n">80.8%</div><div class="l">SWE-bench Verified<br>実Issue自動解決率</div></div>
</div>

---

# 作っているのは Anthropic — OpenAI からの独立組

- **2021年、OpenAI の安全性研究の中核メンバーが独立して設立**
  - Dario Amodei（元 OpenAI 研究VP、GPT-3 開発主導）、Daniela Amodei ら
  - 「商業化スピード vs 安全性」の路線対立が背景 → **AI セーフティが企業理念の中心**
  - 実利: **Team/Enterprise の入力データはモデル学習に不使用**
- ChatGPT/Codex（OpenAI）と Claude（Anthropic）は**同根のライバル**

### ⚠️ 「Copilot で Claude を選ぶ」のと「Claude Code」は別物

| | Copilot のモデルピッカーで Claude | Claude Code |
|---|---|---|
| モデル | Claude（同じ） | Claude（同じ） |
| ハーネス（実行環境） | GitHub 製 | **Anthropic 製・モデルと共進化** |

エージェント性能は**モデル × ハーネス**で決まる。純正フルチューンと載せ替えエンジンの差。

---

# なぜ今乗り換えるか — 定額はどこに残っている？

**2026年6月1日、Copilot は AI Credits（1クレジット=$0.01）の従量制に移行。**
補完は無料のままだが、**Chat / Agent mode / CLI / レビュー = 全部クレジット消費**。
1タスク $1〜5 → 「今月あと何回頼めるか」を数えながら使う日々 😇

| プラン帯 | Copilot | Claude Code | Codex |
|---|---|---|---|
| 個人 | **従量**（2026/6〜） | ✅ 定額（Pro $20 / Max $100〜200） | ✅ 定額（Plus $20 / Pro $100〜） |
| **Team / Business** | **従量**（Credits） | ✅ **定額** Standard $25〜30/席（枠小）<br>✅ **定額 Premium $100〜125/席** | ✅ **定額** Business $25〜30/席（枠小） |
| Enterprise | 従量 | **従量**（pay-as-you-go） | **従量** |

- **Copilot だけが全プラン帯で従量**。Claude / Codex は個人〜Team/Business に定額が残る（エンプラは両社とも従量）→ だから定額帯を選ぶ
- Claude Team は **Standard（安いがトークン枠小）と Premium の2種**。Codex Business も安いが枠小
- エージェントをフル活用する前提なら枠の小さい席では足りない → うちは **Claude Team Premium**

---

# 「定額」の正体 — 上限・週次リミット・ボーナスタイム

Team Premium の定額は無制限ではない。正直に言うと:

- **5時間ごとにリセットされるセッション枠** ＋ **Weekly Limit（週次上限）** の二段構え
- 上限に当たっても → 待てば回復、**追加請求は1円も発生しない**（ここが従量制との決定的な差）

### 🎁 さらに、たまに「Limit リセット」が降ってくる

- Anthropic / OpenAI は**新モデルのリリース記念や障害のお詫びで、全ユーザーの Limit をリセット**することがある
- 従量制では絶対に起きない、**定額プランだけのボーナスタイム** — 来たら遠慮なく使い倒す日

> **「失敗してもお金が減らない」は行動を変える。**
> 雑に・大量に・実験的に頼める → 試行回数が稼げる → 上達する。

---

<!-- _class: chapter -->

# ② 使い方・移行編

インストール、Copilot との差異、ハーネス資産の引っ越し（35分）

---

# 実行方法は4つ（中身は同じエージェント）

| 入口 | 起動方法 | 向いている用途 |
|---|---|---|
| **VS Code / JetBrains 拡張** | 拡張インストール | **Copilot Chat 民はまずここ**。差分をエディタで確認 |
| **CLI（基本形）** | ターミナルで `claude` | すべての基本。SSH 先・コンテナ・サーバでも動く |
| **デスクトップアプリ** | Claude Desktop | 複数エージェントの並列セッション管理 |
| **Web / クラウド** | claude.ai/code | ローカル不要。クラウドサンドボックスで実行 |

ほか: GitHub Actions（PR で `@claude` メンション）、ヘッドレス `claude -p "..."`（CI から）
　⚠️ **この2つは API 従量の別料金**（定額シートの枠外）— CI に組み込むときは予算に注意

**今日のおすすめ: VS Code 拡張で始めて、慣れたら CLI に降りる**

---

# CLI を覚える価値 — 操作体系が「業界標準」になっている

```bash
curl -fsSL https://claude.ai/install.sh | bash   # または npm i -g @anthropic-ai/claude-code
cd your-repo && claude                            # 初回はブラウザ認証
```

### Claude Code CLI は各社にコピーされた「原型」

- **Copilot CLI も Codex CLI も Devin CLI も Antigravity CLI も、操作体系は Claude Code CLI の後追い**
  - REPL + スラッシュコマンド、`/init` 相当、`@` ファイル参照、許可モード… **コマンド互換性が大きい**
- つまり CLI で覚えた操作は**ツールを乗り換えても、ほぼそのまま通用する**
  - GUI はツールごとに画面も概念も違って学び直し。**CLI なら移行初日から同じ手が動く**
  - 今回 Copilot → Claude の移行で苦労する人も、CLI に慣れれば**次の乗り換えはタダ同然**
- おまけ: SSH 先・コンテナ・CI でも同じ体験。`claude -p "..."` でスクリプトからも呼べる（※API 従量・別料金）

---

# 🛠 ハンズオン1: VS Code へのインストール

**5分で Copilot Chat の隣に Claude Code が並ぶ:**

1. 拡張ビュー（`Cmd+Shift+X`）で **「Claude Code」を検索**（発行元: Anthropic）→ Install
2. サイドバーの Claude アイコン → **Sign in**（会社の Team アカウントで認証）
3. 開き方は3通り: サイドバーアイコン / **`Cmd+Esc`**（Win: `Ctrl+Esc`）/ コマンドパレット

<div class="cols">
<div>

### Copilot Chat と同じ操作感

- チャットパネルに日本語で依頼
- `@` でファイル・フォルダを添付
- 変更は**エディタにインライン diff** → 承認/拒否

</div>
<div>

### Copilot Chat に無いもの

- タブを増やして**複数セッション並列**
- 開いているファイル・選択範囲を自動認識
- コマンドパレットで plan モード切替
- 設定・履歴は CLI と共有（`~/.claude`）

</div>
</div>

✅ 動作確認: 「**このリポジトリの構成を説明して**」と聞いてみる

---

# Copilot Chat から来た人がつまずくポイント

| つまずき | どうする |
|---|---|
| 補完が出ない | 仕様。補完は Copilot 併用（無料のまま） |
| `Shift+Tab` が効かない（VS Code） | インデント解除と競合。`Cmd+Shift+P` → "Switch permission mode" |
| いちいち実行許可を聞かれる | ask がデフォルト。許可リスト（`.claude/settings.json`）を育てて auto へ |
| `copilot-instructions.md` が無視される | Claude が読むのは **CLAUDE.md**。次のスライドで移行 |
| 長く使うと遅く・鈍くなる | 1セッション=1タスク文化。区切りで **`/clear`** — 消しても **`/resume`** で過去セッションに復帰できる（VS Code でも可） |
| 勝手に動いて怖い | **plan モード**で計画だけ出させて、承認してから実装させる |

> Copilot Chat は「会話」、Claude Code は「タスク依頼」。
> <strong>ゴール・制約・完了の確認方法（テストコマンド）</strong>を渡すと、自分で検証してから報告してくる。

---

<!-- _class: lead -->

# 🖥️ ライブデモ

`/init` → plan モードで実バグの修正を依頼 → 計画レビュー → 実装

**見てほしいポイント:**
①計画を立ててから動く ②自分でテストを回す ③落ちたら自分でリトライ

---

# 🛠 ハンズオン2: ハーネス資産の移行マップ

みんなが作り込んだ Copilot ハーネスには、**全部に対応物がある**:

| Copilot で育てた資産 | Claude Code での対応物 | 移行の手間 |
|---|---|---|
| `copilot-instructions.md` | **`CLAUDE.md`** | `/init` ＋統合を Claude に依頼 |
| パス別 `*.instructions.md` | サブディレクトリ別 CLAUDE.md | ほぼ機械的 |
| プロンプトファイル `*.prompt.md` | `.claude/commands/*.md` | ほぼ機械的 |
| **カスタムエージェント** | **`.claude/agents/*.md`（サブエージェント）** | プロンプト本文は流用可 |
| **skill** | **`.claude/skills/`（スキル）** | ほぼそのまま |
| **hooks** | **`.claude/settings.json` の hooks** | イベント名の読み替えのみ |
| MCP 設定 | `.mcp.json` | **共通規格・コピーで OK** |

手順は「移行作業自体を Claude に頼む」:
*「`.github/` 配下の Copilot 設定を読んで Claude Code 用に変換して。**実コードと矛盾する古い記述は変換せず一覧で報告して**」*

---

# 移行の本質 — ハーネスを「ツール非依存」にする

`.github/` は**消さない**。両対応（マルチエージェント）repo にする:

```
repo/
├ .github/copilot-instructions.md   ← Copilot 用エントリ（薄く残す）
├ CLAUDE.md                         ← Claude Code 用エントリ
├ AGENTS.md                         ← Codex ほか各社が読む業界標準エントリ
├ docs/agents/                      ← ★知識の本体（規約・コマンド・禁止事項）
└ .claude/ .mcp.json                ← Claude 固有の設定
```

- 各エントリファイルは **`docs/agents/` を参照するだけの「薄いアダプタ」** にする
- 知識の本体が1箇所 → **Copilot でも Claude でも Codex でも動く repo**、二重メンテなし
- **次の乗り換え（必ず来る）が「エントリ1枚追加」で済む** — これがこのリファクタの本質
- 今日 Claude 用に作る構成は、**そのまま将来の Codex 移行にも効く**

---

<!-- _class: chapter -->

# ③ これから編

定額が終わる前に、学んでおくこと（10分）

---

# ⚠️ 定額は「ボーナスタイム」かもしれない

業界は明らかに従量制へ向かっている:

| 時期 | 出来事 |
|---|---|
| 2026年4月 | **Codex** がトークン従量課金へ移行 |
| 2026年4月 | **Anthropic も** Pro から Claude Code を一時削除（24時間で撤回）— *予兆* |
| 2026年6月 | **Copilot** が AI Credits 従量制へ移行 ← 今ここ |

> エージェントの消費トークンは年々増える（並列化・長時間化）。
> 定額モデルはベンダーにとって重くなる一方 — **いつ転換されてもおかしくない。**

**定額の今は「練習し放題の期間」。**
従量制になった日に、トークン効率の良い使い方が身についている人と、
青天井の請求に怯える人に分かれる。

---

# トークンの使い方 — 今日から鍛える5つの習慣

| 習慣 | 理由 |
|---|---|
| ① タスクの区切りで **`/clear`** | 長いコンテキストは高い・遅い・**精度も落ちる**。消しても **`/resume`** で戻れるから恐れない |
| ② 巨大なログ・JSON を貼らない | パスを渡して「必要な部分だけ読んで」 |
| ③ 調査は**サブエージェント**へ | 子が10万トークン読んでも親には結論だけ |
| ④ モデルを使い分ける | 軽作業は Haiku/Sonnet、難所だけ Opus（API 単価は**数十倍**違う） |
| ⑤ `/context` を見る癖 | 「今何トークン載ってるか」= 従量時代の**燃費計** |

> これは節約術ではなく**コンテキストエンジニアリング** — 「モデルに何を読ませるか」の設計技術。
> コンテキストを制する者が**エージェントの精度も制する**（料金は副産物）。
> つまり**良い使い方とトークン効率は同じもの**。

---

# ツールの使い方でなく「体系」を学ぶ

ツールは1年で入れ替わる（このプレゼン自体が乗り換えの話）。**残るのは概念:**

- **コンテキストエンジニアリング** — 何を読ませ、何を読ませないかの設計
- **検証可能性の設計** — テスト・型・lint が整った repo ほど AI は強く働く
  → **コード品質への投資 = AI の性能への投資**（2026年の新常識）
- **ハーネスのツール非依存設計** — 今日の移行リファクタがまさにこれ
- **権限設計** — 何を自動許可し、何を人間が握るか
- **エージェントマネジメント** — 1人が複数エージェントを並列監督する働き方へ

> 開発者の役割は「コードを書く人」から
> **「仕様を定義し、検証を設計し、エージェントを監督する人」へ**

---

<!-- _class: lead -->

# 帰ったらまず、自分のリポジトリで

# `/init`

<br>

**Q&A**

*Copilot は解約？ → 補完は無料枠で併用が現実解*
*コードは学習される？ → Team はデフォルトで学習に不使用（必ず会社アカウントで）*
*暴走しない？ → ask モード + 許可リスト + フック + サンドボックス*
*定額枠を使い切ったら？ → 5時間でリセット・追加請求なし。頻発するなら /clear 習慣を見直すサイン*
