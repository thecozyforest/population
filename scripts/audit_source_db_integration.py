from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "source-db-validation.json"
POPULATION_URL = "https://raw.githubusercontent.com/greatsong/modudata/main/data/population_latest.csv"


def decode_flex(content: bytes) -> tuple[str, str]:
    for encoding in ("utf-8-sig", "cp949", "euc-kr"):
        try:
            return content.decode(encoding), encoding
        except UnicodeDecodeError:
            pass
    return content.decode("utf-8", errors="replace"), "utf-8-replace"


def clean_name(raw: str) -> str:
    name = re.sub(r"\s*\(\d{8,12}\)\s*$", "", raw.strip())
    return re.sub(r"\s+", " ", name).strip()


def main() -> None:
    content = urllib.request.urlopen(POPULATION_URL, timeout=180).read()
    source_sha256 = hashlib.sha256(content).hexdigest()
    text, encoding = decode_flex(content)
    rows = list(csv.reader(io.StringIO(text)))
    if len(rows) < 2:
        raise SystemExit("Population CSV has no data rows")

    data_rows = [row for row in rows[1:] if row and any(str(value).strip() for value in row)]
    codes: list[str] = []
    names: defaultdict[str, list[dict[str, str | int]]] = defaultdict(list)
    missing_code_rows: list[int] = []

    for row_number, row in enumerate(data_rows, start=2):
        raw_label = row[0].strip()
        match = re.search(r"\((\d{8,12})\)\s*$", raw_label)
        if not match:
            missing_code_rows.append(row_number)
            continue
        code = match.group(1)
        codes.append(code)
        names[clean_name(raw_label)].append({"row": row_number, "code": code, "raw_label": raw_label})

    duplicate_codes = sorted(code for code in set(codes) if codes.count(code) > 1)
    duplicate_names = [
        {"name": name, "rows": entries}
        for name, entries in sorted(names.items())
        if len(entries) > 1
    ]

    index = (ROOT / "index.html").read_text(encoding="utf-8")
    source_script = (ROOT / "source-db-enhancements.js").read_text(encoding="utf-8")
    required_tokens = [
        "sourceRowCount",
        "sourceRecords.forEach(record => regionMap.set(record.id, record))",
        "원본 DB 행정구역명 또는 코드 검색",
        "window.populationSourceAudit",
    ]
    missing_tokens = [token for token in required_tokens if token not in index]
    forbidden_tokens = [token for token in ("BOOTSTRAP_ALIASES", "legal-admin-aliases.json") if token in index]

    report = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "source_url": POPULATION_URL,
        "source_size_bytes": len(content),
        "source_sha256": source_sha256,
        "encoding": encoding,
        "source_data_row_count": len(data_rows),
        "coded_row_count": len(codes),
        "unique_code_count": len(set(codes)),
        "unique_normalized_name_count": len(names),
        "missing_code_row_count": len(missing_code_rows),
        "duplicate_code_count": len(duplicate_codes),
        "duplicate_normalized_name_count": len(duplicate_names),
        "duplicate_normalized_names": duplicate_names,
        "deployed_index_sha_hint": len(index),
        "source_enhancement_size": len(source_script),
        "missing_integration_tokens": missing_tokens,
        "forbidden_alias_tokens": forbidden_tokens,
        "valid": (
            len(data_rows) == len(codes) == len(set(codes))
            and not missing_code_rows
            and not duplicate_codes
            and not missing_tokens
            and not forbidden_tokens
        ),
    }
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not report["valid"]:
        raise SystemExit("Exact source DB integration audit failed")


if __name__ == "__main__":
    main()
