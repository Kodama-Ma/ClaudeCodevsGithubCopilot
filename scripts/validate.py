#!/usr/bin/env python3
"""licenses/*.csv を検証する。手編集による壊れ（列数ズレ・ヘッダー違い・事業部不一致）を
PR時に検知するための安全網。外部依存なし。

エラーがあれば終了コード1で落ちる（CIを赤にする）。
"""
from __future__ import annotations

import csv
import glob
import os
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LICENSES_DIR = os.path.join(REPO_ROOT, "licenses")

EXPECTED_HEADER = ["Github-id", "事業部", "グループ", "氏名", "ツール", "プラン"]
# ライセンス未配布を表す許容値（プラン空欄を許す）
NO_TOOL = "配布なし"


def validate_file(path: str) -> list[str]:
    errors: list[str] = []
    name = os.path.basename(path)
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            return [f"{name}: 空ファイル（ヘッダー行が無い）"]

        if header != EXPECTED_HEADER:
            errors.append(
                f"{name}: ヘッダーが不正。\n"
                f"    期待: {EXPECTED_HEADER}\n"
                f"    実際: {header}"
            )
            # ヘッダーが違うと以降の判定が無意味なので打ち切り
            return errors

        depts_in_file: set[str] = set()
        seen_ids: dict[str, int] = {}
        for lineno, row in enumerate(reader, start=2):
            if not any(cell.strip() for cell in row):
                continue  # 空行は許容
            if len(row) != len(EXPECTED_HEADER):
                errors.append(
                    f"{name}:{lineno}: 列数が {len(row)}（期待 {len(EXPECTED_HEADER)}）。"
                    f" カンマの数を確認 → {row}"
                )
                continue
            gid, dept, group, person, tool, plan = (c.strip() for c in row)
            if not gid:
                errors.append(f"{name}:{lineno}: Github-id が空")
            if gid:
                if gid in seen_ids:
                    errors.append(
                        f"{name}:{lineno}: Github-id '{gid}' が重複"
                        f"（{seen_ids[gid]} 行目にも有り）"
                    )
                seen_ids[gid] = lineno
            if not dept:
                errors.append(f"{name}:{lineno}: 事業部が空")
            else:
                depts_in_file.add(dept)
            # ツールが配布なしならプラン空欄でOK、そうでなければプラン必須
            if tool and tool != NO_TOOL and not plan:
                errors.append(
                    f"{name}:{lineno}: ツール '{tool}' なのにプランが空"
                )

        # 1ファイル内の事業部は1種類であるべき（部署別ファイルの前提）
        if len(depts_in_file) > 1:
            errors.append(
                f"{name}: 1ファイルに複数の事業部が混在 → {sorted(depts_in_file)}。"
                f" ファイルは事業部ごとに分けてください"
            )
    return errors


def main() -> int:
    files = sorted(glob.glob(os.path.join(LICENSES_DIR, "*.csv")))
    if not files:
        print("licenses/*.csv が見つかりません", file=sys.stderr)
        return 1

    all_errors: list[str] = []
    for path in files:
        all_errors.extend(validate_file(path))

    if all_errors:
        print("❌ 検証エラー:\n")
        for e in all_errors:
            print(f"  - {e}")
        print(f"\n{len(all_errors)} 件のエラー。修正してください。")
        return 1

    print(f"✅ {len(files)} ファイル、検証OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
