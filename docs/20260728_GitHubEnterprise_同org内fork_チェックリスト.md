---
title: GitHub Enterprise 同org内でベンダーにforkとadminを渡すときのチェックリスト
date: 2026-07-28
type: research
tags:
  - GitHub
  - セキュリティ
  - ガバナンス
  - 監査
status: completed
---

# 同org内で外部ベンダーに fork + admin を渡すときのチェックリスト

外部の開発ベンダーに、自社の GitHub Enterprise 内でリポジトリを fork させ、
その fork の admin 権限を渡す場合に必要な統制をまとめたもの。

**前提**：fork 先を production と同じ organization に置くケース。
別 org に置ければ org 境界が無料の防壁になるが、同 org の場合は
**設定だけが防壁**になるため、下記は「推奨」ではなく「必須」になる。

---

## 1. fork する前に（ここだけ取り返しがつかない）

fork はリポジトリの**全履歴の完全なコピー**。上流で履歴を消しても fork 側には残る。

- [ ] **全履歴のシークレットスキャン**（gitleaks / trufflehog / GitHub secret scanning）
- [ ] ヒットした認証情報は **fork 前にすべてローテーション**
- [ ] **長期の静的キーを OIDC に寄せる**（保存する secret 自体を減らす）

---

## 2. 設定（同 org なので全部必須）

### アクセス範囲

- [ ] **Base permissions = No permission**
      Read 以上だと、org 内の無関係な全リポジトリが見える
- [ ] **Outside collaborator の招待は org owner のみに制限**
      admin 権限があると契約外の第三者を勝手に追加できる
- [ ] **メンバーによる repository の削除・可視性変更を禁止**

### シークレット

- [ ] **Organization secrets の visibility = Selected repositories**（`All repositories` は厳禁）
- [ ] **org-level GitHub Apps のインストール範囲 = Selected repositories**
- [ ] リポジトリ設定の **「fork PR のワークフローに secret を渡す」オプションを OFF**
      （private リポジトリでのみ有効化できてしまう危険設定）

### GitHub Actions

- [ ] **self-hosted runner を禁止**（または厳格にラベル制限）
- [ ] **fork PR のワークフロー実行を承認制に**
- [ ] Allowed actions を制限（verified / 許可リストのみ）

### 統制の維持

- [ ] **Organization-level ruleset を敷く**
      組織レベルの ruleset は repository admin では編集できない（org owner のみ）
- [ ] **repository admin に bypass 権限を与えない**
- [ ] **secret scanning + push protection を fork 側にも有効化**

### 監査・ID

- [ ] **Audit log streaming を SIEM へ**
- [ ] SAML SSO + SCIM（IdP の退職処理を権限剥奪に直結させる）
- [ ] 2FA 必須 / 必要に応じて IP allow list

---

## 3. 運用（システムで守れない分）

- [ ] 契約に **プロジェクト終了後の fork 削除義務**・再配布禁止・監査受入義務を明記
- [ ] **四半期ごとのアクセスレビュー**（fork の collaborator 棚卸し）
- [ ] 離任・退職時の **即時削除フロー**
- [ ] 設定のドリフト検知（定期的に上記設定を再確認）

---

## 4. やらなかった場合のリスク

| 項目 | 起きること |
|---|---|
| 履歴スキャン | 過去コミットの本番キーが全員の手元に永久コピー。契約終了後も有効 |
| OIDC 化 | 1本漏れたら、人が気づくまで無期限に本番へ入れる |
| Base permissions | org 内の無関係な全リポジトリを閲覧される（他案件の情報も） |
| Org secrets = All | fork のワークフローから本番の認証情報を取得・外部送信できる |
| GitHub Apps 範囲 | App の権限経由で他リポジトリに到達される |
| self-hosted runner | ランナー上で任意コード実行 → 社内ネットワーク侵入、他ジョブの認証情報奪取 |
| fork PR に secret | PR を投げるだけで上流の secret が抜ける |
| fork PR 承認制 | 悪意ある PR が上流の CI を勝手に起動（pwn request） |
| Org ruleset | repo admin が保護を外して直 push・履歴改変。証跡が崩れる |
| Collaborator 制限 | 契約外の第三者を勝手に追加できる。誰が見たか追えなくなる |
| repo 削除禁止 | 証跡ごと消される |
| push protection | 新規の混入に気づけない |
| Audit log streaming | 監査要件を満たせない。保持期間を過ぎたら追跡不能 |
| 契約の削除義務 | 終了後も保持され、法的に回収を主張できない |
| アクセスレビュー | 退職者・異動者が残り続ける |

---

## 5. 全部やっても残るリスク

1. **ローカル clone は止められない** — 渡した時点のコードは物理的に回収不能。**最大の残存リスク**
2. **正規の admin 操作は防げない** — fork 上では相手が自由にできる（設計上そう）
3. **人と端末** — 権限保持者の悪意、端末侵害。GitHub の設定では防げない
4. **サプライチェーン** — 使用している Action が乗っ取られる
5. **設定のドリフト** — 一度入れても後から変更されうる
6. **監査ログは事後** — 起きたことは分かるが、止まらない
7. **「fork 削除」は削除であって回収ではない**

**到達点の認識**：これらをやっても「漏らさない」状態にはならない。
なるのは **漏れる範囲を限定し、漏れたと気づけて、契約で回収を主張できる状態**。

---

## 6. 味方になる GitHub の仕様

- **上流リポジトリへのアクセスを剥奪すると、その人の private fork は削除される**
  → 契約終了時の実効的なレバー
- **fork の可視性は単独で変更できない**
  → 勝手に public 化される心配はない
- **private fork はチーム権限のみ継承し、個人権限は継承しない**
- **fork PR のワークフローはデフォルトで secret にアクセスできず、`GITHUB_TOKEN` も read-only**

---

## 7. 補足：同 org にする理由について

「同 org のほうがマージしやすい」は技術的には成立しない。
fork 関係さえあれば **別 org の fork からでも通常どおり PR を出せる**
（OSS は基本的にこのパターン）。

同 org の利点はチーム権限の継承や設定の一元化。
逆に言えば、**後から別 org へ分離してもマージ運用は壊れない**ため、
分離は逃げ道として残しておける。

---

## 参考

- [Fork の権限と可視性について（GitHub Docs）](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/about-permissions-and-visibility-of-forks)
- [組織の fork ポリシー管理（GitHub Docs）](https://docs.github.com/en/enterprise-cloud@latest/organizations/managing-organization-settings/managing-the-forking-policy-for-your-organization)
- [GitHub Actions でのシークレットの使用（GitHub Docs）](https://docs.github.com/en/enterprise-cloud@latest/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [組織のリポジトリ ルールセット管理（GitHub Docs）](https://docs.github.com/en/enterprise-cloud@latest/organizations/managing-organization-settings/managing-rulesets-for-repositories-in-your-organization)
