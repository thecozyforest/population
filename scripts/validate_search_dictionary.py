from __future__ import annotations

import csv
import io
import json
import re
from collections import Counter
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
ALIASES_PATH = ROOT / "legal-admin-aliases.json"
OUTPUT = ROOT / "region-search-validation.json"
POPULATION_URL = "https://raw.githubusercontent.com/greatsong/modudata/main/data/population_latest.csv"


def decode_flex(content: bytes) -> str:
    for encoding in ("utf-8-sig", "cp949", "euc-kr"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="replace")


def population_names() -> set[str]:
    response = requests.get(POPULATION_URL, timeout=180)
    response.raise_for_status()
    reader = csv.reader(io.StringIO(decode_flex(response.content)))
    next(reader)
    names: set[str] = set()
    for row in reader:
        if not row:
            continue
        name = re.sub(r"\s*\(\d{8,12}\)\s*$", "", row[0]).strip()
        if name:
            names.add(name)
    return names


def main() -> None:
    data = json.loads(ALIASES_PATH.read_text(encoding="utf-8"))
    aliases = data.get("aliases", [])
    mapping = {item["legal"]: list(dict.fromkeys(item.get("admins", []))) for item in aliases}
    names = population_names()

    missing_admin_references = []
    empty_aliases = []
    for legal, admins in mapping.items():
        if not admins:
            empty_aliases.append(legal)
        missing = [admin for admin in admins if admin not in names]
        if missing:
            missing_admin_references.append({"legal": legal, "missing_admins": missing})

    probes = [
        "서울특별시 서초구 방배동",
        "서울특별시 관악구 봉천동",
        "서울특별시 관악구 신림동",
        "서울특별시 강남구 역삼동",
        "서울특별시 송파구 잠실동",
        "서울특별시 노원구 상계동",
        "서울특별시 강서구 화곡동",
        "서울특별시 송파구 가락동",
        "서울특별시 구로구 구로동",
        "서울특별시 금천구 독산동",
        "서울특별시 종로구 창신동",
        "서울특별시 종로구 숭인동",
        "서울특별시 양천구 신정동",
        "서울특별시 양천구 신월동",
        "서울특별시 양천구 목동",
        "서울특별시 성동구 성수동1가",
        "부산광역시 해운대구 우동",
        "대구광역시 수성구 범어동",
        "인천광역시 연수구 송도동",
        "대전광역시 서구 둔산동",
        "울산광역시 남구 삼산동",
        "경기도 성남시 분당구 정자동",
        "경기도 고양시 일산동구 백석동",
        "경기도 용인시 수지구 죽전동",
    ]
    probe_results = {
        legal: {
            "count": len(mapping.get(legal, [])),
            "admins": mapping.get(legal, []),
            "all_exist_in_population": all(admin in names for admin in mapping.get(legal, [])),
        }
        for legal in probes
    }

    distribution = Counter(len(admins) for admins in mapping.values())
    report = {
        "scope": data.get("scope"),
        "population_period": data.get("population_period"),
        "population_cutoff": data.get("population_cutoff"),
        "official_mapping_date": data.get("updated"),
        "generated": data.get("generated"),
        "alias_count": len(mapping),
        "population_name_count": len(names),
        "coverage": data.get("coverage", {}),
        "missing_admin_reference_count": len(missing_admin_references),
        "empty_alias_count": len(empty_aliases),
        "missing_admin_reference_sample": missing_admin_references[:100],
        "empty_alias_sample": empty_aliases[:100],
        "admin_count_distribution": {str(key): value for key, value in sorted(distribution.items())},
        "probes": probe_results,
        "valid": not missing_admin_references and not empty_aliases,
    }
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")

    if missing_admin_references:
        raise SystemExit(f"Alias dictionary references {len(missing_admin_references)} legal areas with missing population rows")
    if empty_aliases:
        raise SystemExit(f"Alias dictionary contains {len(empty_aliases)} empty legal aliases")
    for legal in probes[:15]:
        if not mapping.get(legal):
            raise SystemExit(f"Required legal-dong probe has no result: {legal}")
    print(
        f"Validated {len(mapping):,} legal aliases against {len(names):,} population names; "
        f"period={data.get('population_period')}; official={data.get('updated')}"
    )


if __name__ == "__main__":
    main()
