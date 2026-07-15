# Claude Code 企業導入セキュリティハーネス(要約版)

> 出典: `harness.md`(メルカリ・Claude Code組織配布のセキュリティ設定 / Speaker Deck を基にした解説記事の要約)
> 設定キーの書き方はすべて Anthropic 公式ドキュメントで裏取り済み。

## 守るべき3つの観点

Claude Code はローカルPC上でファイル読み書き・シェルコマンド実行・ネットアクセスができるため、プロンプトインジェクション等により以下の事故が起こりうる。対策はすべてこの3観点に対応する。

1. **秘密情報を外に出さない**(`.env`、`~/.aws/credentials`、`~/.ssh/` など)
2. **危ない操作を勝手にさせない**(削除・公開・ネット送信)
3. **そもそも触れる範囲を狭める**(サンドボックスによる隔離)

## メルカリの5つの対策

### 対策① 人間の確認を「飛ばせなく」する

確認スキップモード(bypass permissions)を封じ、「AIが手を動かす前に必ず人間がOKを出す」を全社で強制する。

- 設定キー: `permissions.disableBypassPermissionsMode: "disable"`(自動モードを塞ぐ `disableAutoMode` も同様)
- 後述の**管理者設定**に置くと社員が自分で解除できない

### 対策② 危ないコマンドは止める(deny)/必ず確認する(ask)

```json
{
  "permissions": {
    "deny": [
      "Bash(curl:*)",
      "Bash(wget:*)"
    ],
    "ask": [
      "Bash(git push:*)"
    ]
  }
}
```

- `Bash(curl:*)` = 「curl で始まるコマンドを全部ブロック」(`:*` は「その後ろは何でも」)
- **重要**: 公式は「curl を特定URL宛てだけ許可、のような引数での細かい絞り込みは破られやすい」と明言。ネット通信系は丸ごと止め、必要な取得は行き先を許可制にできる **WebFetch** に一本化するのが公式の推奨

### 対策③ 秘密ファイルを読ませない・システムをいじらせない

```json
{
  "permissions": {
    "deny": [
      "Read(.env)",
      "Read(.env.*)",
      "Read(**/.ssh/**)",
      "Bash(sudo:*)"
    ]
  }
}
```

- `Read(.env)` は作業フォルダ配下のどの階層の `.env` も読み取り禁止(`Read(**/.env)` と同義)
- **限界**: この拒否リストは Claude 自身の読み取りや `cat` には効くが、AIが書いたスクリプトが裏でファイルを開く回り道までは止めきれない → 対策④が必要

### 対策④ サンドボックスで「触れる範囲」ごと囲う

OSレベルで壁を作り、作業フォルダの外・許可ドメイン以外への接続を物理的に遮断する。

```json
{
  "sandbox": {
    "enabled": true,
    "network": {
      "allowedDomains": ["*.github.com", "registry.npmjs.org"]
    }
  }
}
```

- 公式は「拒否リスト(②③)とサンドボックスの両方を重ねて最終的な境界にする」と説明(二重防御)
- **制約**: 対応は macOS / Linux / WSL2 のみ。ネイティブWindowsでは非対応 → Windows主体の職場は①〜③の権限設定を厚めにする

### 対策⑤ 「守ってほしいこと」を毎回AIに読ませる

設定ブロックが「物理的な鍵」なら、こちらは「就業ルールの読み合わせ」。作業フォルダ直下に `CLAUDE.md` を置くと Claude Code が毎回読み込む。

```markdown
# セキュリティのお願い
- .env や鍵ファイル（~/.ssh/ など）は開かない
- 顧客情報・社外秘を外部サービスに送らない
- 削除や公開の操作は、実行前に必ず人へ確認する
```

## 配り方(メルカリの実践ポイント)

- **管理者設定(managed-settings.json)で強制配布**: 通常のユーザー設定は社員が書き換えられる。MDM で本人が上書きできない管理者設定を一斉配布する
  - macOS の置き場所: `/Library/Application Support/ClaudeCode/managed-settings.json`
  - 個人設定より優先され、本人には変更不可
- **リテラシーに応じた出し分け**:
  - エンジニア向け: ある程度カスタマイズ可能、生産性を落としすぎない設定
  - 非エンジニア向け: いじる余地を減らした最も安全な初期設定

## 適用用テンプレート

### 最小セット(対策①〜③、エンジニア向けの土台)

```json
{
  "permissions": {
    "disableBypassPermissionsMode": "disable",
    "deny": [
      "Bash(curl:*)",
      "Bash(wget:*)",
      "Bash(sudo:*)",
      "Read(.env)",
      "Read(.env.*)",
      "Read(**/.ssh/**)"
    ],
    "ask": [
      "Bash(git push:*)",
      "Bash(rm:*)"
    ]
  }
}
```

上から順に: 確認スキップ禁止 → ネット通信・管理者操作ブロック → 秘密ファイル読み取り禁止 → 削除・公開操作は必ず確認。

### フルセット(対策①〜④、非エンジニア向け推奨)

```json
{
  "permissions": {
    "disableBypassPermissionsMode": "disable",
    "deny": [
      "Bash(curl:*)",
      "Bash(wget:*)",
      "Bash(sudo:*)",
      "Read(.env)",
      "Read(.env.*)",
      "Read(**/.ssh/**)"
    ],
    "ask": [
      "Bash(git push:*)",
      "Bash(rm:*)"
    ]
  },
  "sandbox": {
    "enabled": true,
    "network": {
      "allowedDomains": ["*.github.com", "registry.npmjs.org"]
    }
  }
}
```

- `allowedDomains` は自社で使うサービスに合わせて書き換える
- 置き場所: プロジェクト直下の `.claude/settings.json`(全プロジェクト共通なら `~/.claude/settings.json`、強制するなら managed-settings.json)

## 落とし穴(配布前に確認する3点)

1. **「拒否リストを書いたから安全」ではない** — AIが書いたスクリプトの裏側の動きまでは止めきれない。本気で囲うならサンドボックスまで重ねる
2. **引数で絞る書き方に頼らない** — 条件つき許可は公式自身が「破られやすい」と注意。危ないものは丸ごと止めて安全な代替口(WebFetch等)を1つ用意する
3. **設定を配って終わりにしない** — 別のツールを勝手に入れられれば意味がない。設定は「事故を減らす仕組み」であり、使い方の教育(対策⑤)とセットで効く

## FAQ要点

- **個人利用でも必要か**: パソコンに秘密情報があるかが基準。最低でも対策③(読み取り禁止)は入れる
- **権限を絞ると仕事にならないか**: 読み取り専用コマンド(`ls`/`cat`等)は元から確認なしで動く。止まるのは削除・公開・ネット通信だけ
- **settings.json と managed-settings.json の違い**: 前者は誰でも編集できる共有設定、後者は会社が配る本人変更不可の設定。「勝手に緩められると困る」段階になったら後者へ
- **他のAIツールにも使えるか**: 3観点(秘密情報・危険操作・触れる範囲)の発想は共通。ただし記法は Claude Code 専用

## 導入3ステップ

1. **`Read(.env)` を1行入れる** — 効果が最も大きい一手
2. **最小セットを1枚のファイルにする** — 上のテンプレートに自社で止めたいコマンドを追記
3. **社内の1人に配って試す** — `.claude/settings.json` に貼ってもらい、業務が止まらないか確認

## 参考リンク

- メルカリ・Claude Code組織配布のセキュリティ設定(発表資料 / Speaker Deck)
- [Configure permissions(権限設定・Anthropic公式)](https://code.claude.com/docs/en/permissions)
- [Sandboxing(サンドボックス・Anthropic公式)](https://code.claude.com/docs/en/sandboxing)
- [Claude Code settings(設定ファイル・Anthropic公式)](https://code.claude.com/docs/en/settings)
