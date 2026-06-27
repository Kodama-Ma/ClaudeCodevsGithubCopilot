#!/usr/bin/env python3
"""licenses/*.csv を集計して dist/master.csv とダッシュボード dist/index.html を生成する。

外部依存なし（Python標準ライブラリのみ）。GitHub Actions 上でそのまま動く。
"""
from __future__ import annotations

import csv
import glob
import html
import os
from collections import Counter
from datetime import datetime, timezone, timedelta

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LICENSES_DIR = os.path.join(REPO_ROOT, "licenses")
DIST_DIR = os.path.join(REPO_ROOT, "dist")

HEADERS = ["Github-id", "事業部", "グループ", "氏名", "ツール", "プラン"]
JST = timezone(timedelta(hours=9))


def load_rows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for path in sorted(glob.glob(os.path.join(LICENSES_DIR, "*.csv"))):
        with open(path, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                # 空行スキップ
                if not (row.get("Github-id") or "").strip():
                    continue
                rows.append({h: (row.get(h) or "").strip() for h in HEADERS})
    return rows


def write_master(rows: list[dict[str, str]]) -> None:
    os.makedirs(DIST_DIR, exist_ok=True)
    with open(os.path.join(DIST_DIR, "master.csv"), "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(rows)


def render_table(rows: list[dict[str, str]]) -> str:
    body = []
    for r in rows:
        tds = "".join(f"<td>{html.escape(r[h])}</td>" for h in HEADERS)
        body.append(f"<tr>{tds}</tr>")
    head = "".join(f"<th>{html.escape(h)}</th>" for h in HEADERS)
    return f"<table><thead><tr>{head}</tr></thead><tbody>{''.join(body)}</tbody></table>"


def render_counts(title: str, counter: Counter) -> str:
    items = "".join(
        f"<tr><td>{html.escape(str(k) or '(空欄)')}</td><td class='num'>{v}</td></tr>"
        for k, v in counter.most_common()
    )
    return (
        f"<div class='card'><h3>{html.escape(title)}</h3>"
        f"<table class='mini'><tbody>{items}</tbody></table></div>"
    )


def build_dashboard(rows: list[dict[str, str]]) -> str:
    by_dept = Counter(r["事業部"] for r in rows)
    by_tool = Counter(r["ツール"] or "配布なし" for r in rows)
    by_plan = Counter(r["プラン"] for r in rows if r["プラン"])
    total = len(rows)
    distributed = sum(1 for r in rows if r["ツール"] and r["ツール"] != "配布なし")
    generated = datetime.now(JST).strftime("%Y-%m-%d %H:%M JST")
    rows_json = _json(rows)
    headers_json = _json(HEADERS)

    return f"""<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AIツール ライセンス台帳</title>
<style>
  :root {{ font-family: -apple-system, "Hiragino Sans", sans-serif; }}
  body {{ margin: 0; background: #f6f7f9; color: #1f2328; }}
  header {{ background: #1f2328; color: #fff; padding: 20px 28px; }}
  header h1 {{ margin: 0; font-size: 20px; }}
  header .meta {{ opacity: .7; font-size: 12px; margin-top: 4px; }}
  main {{ max-width: 1100px; margin: 0 auto; padding: 24px; }}
  .stats {{ display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }}
  .stat {{ background: #fff; border: 1px solid #d0d7de; border-radius: 10px;
           padding: 16px 20px; flex: 1; min-width: 140px; }}
  .stat .n {{ font-size: 30px; font-weight: 700; }}
  .stat .l {{ color: #656d76; font-size: 13px; }}
  .cards {{ display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }}
  .card {{ background: #fff; border: 1px solid #d0d7de; border-radius: 10px;
           padding: 12px 16px; flex: 1; min-width: 220px; }}
  .card h3 {{ margin: 4px 0 8px; font-size: 14px; }}
  table {{ border-collapse: collapse; width: 100%; background: #fff; }}
  th, td {{ border: 1px solid #d0d7de; padding: 7px 10px; font-size: 13px; text-align: left; }}
  th {{ background: #f0f3f6; }}
  .num {{ text-align: right; font-variant-numeric: tabular-nums; }}
  table.mini th, table.mini td {{ border: none; border-bottom: 1px solid #eaeef2; }}
  .tabs {{ display: flex; gap: 4px; margin: 8px 0 0; flex-wrap: wrap; }}
  .tabs button {{ border: 1px solid #d0d7de; background: #fff; padding: 6px 14px;
                  border-radius: 8px 8px 0 0; cursor: pointer; font-size: 13px; }}
  .tabs button.active {{ background: #1f2328; color: #fff; border-color: #1f2328; }}
  .panel {{ display: none; }}
  .panel.active {{ display: block; }}
</style></head>
<body>
<header>
  <h1>AIツール ライセンス台帳</h1>
  <div class="meta">自動集計 — 最終更新 {generated}（mainマージで更新）</div>
</header>
<main>
  <div class="stats">
    <div class="stat"><div class="n">{total}</div><div class="l">登録メンバー</div></div>
    <div class="stat"><div class="n">{distributed}</div><div class="l">ライセンス付与中</div></div>
    <div class="stat"><div class="n">{len(by_dept)}</div><div class="l">事業部</div></div>
  </div>

  <div class="cards">
    {render_counts("事業部別 人数", by_dept)}
    {render_counts("ツール別", by_tool)}
    {render_counts("プラン別", by_plan)}
  </div>

  <div class="tabs" id="tabs"></div>
  <div id="panels"></div>
</main>

<script>
const rows = {rows_json};
const headers = {headers_json};
// (上の2行は f-string で実データに置換される)
const depts = ["全体", ...[...new Set(rows.map(r => r["事業部"]))]];
const tabs = document.getElementById("tabs");
const panels = document.getElementById("panels");

function tableFor(filter) {{
  const data = filter === "全体" ? rows : rows.filter(r => r["事業部"] === filter);
  const head = headers.map(h => `<th>${{h}}</th>`).join("");
  const body = data.map(r => "<tr>" + headers.map(h => `<td>${{r[h] ?? ""}}</td>`).join("") + "</tr>").join("");
  return `<table><thead><tr>${{head}}</tr></thead><tbody>${{body}}</tbody></table>`;
}}

depts.forEach((d, i) => {{
  const btn = document.createElement("button");
  btn.textContent = d; btn.className = i === 0 ? "active" : "";
  btn.onclick = () => {{
    document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("panel-" + i).classList.add("active");
  }};
  tabs.appendChild(btn);
  const panel = document.createElement("div");
  panel.className = "panel" + (i === 0 ? " active" : "");
  panel.id = "panel-" + i;
  panel.innerHTML = tableFor(d);
  panels.appendChild(panel);
}});
</script>
</body></html>
"""


def _json(obj) -> str:
    import json
    return json.dumps(obj, ensure_ascii=False)


def main() -> None:
    rows = load_rows()
    write_master(rows)
    with open(os.path.join(DIST_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(build_dashboard(rows))
    print(f"集計完了: {len(rows)} 行 / 事業部 {len({r['事業部'] for r in rows})} → dist/")


if __name__ == "__main__":
    main()
