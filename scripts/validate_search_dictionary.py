from __future__ import annotations

import csv
import io
import json
import re
from collections import Counter
from difflib import get_close_matches
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
ALIASES_PATH = ROOT / "legal-admin-aliases.json"
OUTPUT = ROOT / "region-search-validation.json"
POPULATION_URL = "https://raw.githubusercontent.com/greatsong/modudata/main/data/population_latest.csv"


def clean_name(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def decode_flex(content: bytes) -> str:
    for encoding in ("utf-8-sig", "cp949", "euc-kr"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="replace")


def population_index() -> tuple[set[str], dict[str, str]]:
    response = requests.get(POPULATION_URL, timeout=180)
    response.raise_for_status()
    reader = csv.reader(io.StringIO(decode_flex(response.content)))
    next(reader)
    names: set[str] = set()
    code_to_name: dict[str, str] = {}
    for row in reader:
        if not row:
            continue
        raw = clean_name(row[0])
        name = clean_name(re.sub(r"\s*\(\d{8,12}\)\s*$", "", raw))
        match = re.search(r"\((\d{8,12})\)\s*$", raw)
        if name:
            names.add(name)
        if match and name:
            code_to_name[match.group(1)] = name
    return names, code_to_name


def candidate_names(missing: str, names: set[str]) -> list[str]:
    leaf = missing.split()[-1] if missing.split() else missing
    province = missing.split()[0] if missing.split() else ""
    same_leaf = sorted(name for name in names if name.split()[-1:] == [leaf])
    province_leaf = [name for name in same_leaf if name.startswith(province + " ") or name == province]
    if province_leaf:
        return province_leaf[:20]
    if same_leaf:
        return same_leaf[:20]
    province_names = sorted(name for name in names if name.startswith(province + " "))
    return get_close_matches(missing, province_names, n=10, cutoff=0.45)


def main() -> None:
    data = json.loads(ALIASES_PATH.read_text(encoding="utf-8"))
    aliases = data.get("aliases", [])
    mapping = {
        clean_name(item["legal"]): list(dict.fromkeys(clean_name(admin) for admin in item.get("admins", [])))
        for item in aliases
    }
    names, code_to_name = population_index()

    missing_admin_references = []
    missing_by_admin: dict[str, dict[str, object]] = {}
    empty_aliases = []
    for legal, admins in mapping.items():
        if not admins:
            empty_aliases.append(legal)
        missing = [admin for admin in admins if admin not in names]
        if missing:
            missing_admin_references.append({"legal": legal, "missing_admins": missing})
            for admin in missing:
                item = missing_by_admin.setdefault(
                    admin,
                    {"admin": admin, "legal_examples": [], "population_candidates": candidate_names(admin, names)},
                )
                if len(item["legal_examples"]) < 20:
                    item["legal_examples"].append(legal)

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
            "all_exist_in_population": bool(mapping.get(legal)) and all(admin in names for admin in mapping.get(legal, [])),
        }
        for legal in probes
    }
    failed_probes = [legal for legal, result in probe_results.items() if not result["all_exist_in_population"]]

    distribution = Counter(len(admins) for admins in mapping.values())
    missing_provinces = Counter(item["admin"].split()[0] for item in missing_by_admin.values() if item["admin"].split())
    valid = not missing_admin_references and not empty_aliases and not failed_probes
    report = {
        "scope": data.get("scope"),
        "population_period": data.get("population_period"),
        "population_cutoff": data.get("population_cutoff"),
        "official_mapping_date": data.get("updated"),
        "generated": data.get("generated"),
        "alias_count": len(mapping),
        "population_name_count": len(names),
        "population_code_count": len(code_to_name),
        "coverage": data.get("coverage", {}),
        "missing_admin_reference_count": len(missing_admin_references),
        "unique_missing_admin_count": len(missing_by_admin),
        "missing_by_province": dict(missing_provinces.most_common()),
        "empty_alias_count": len(empty_aliases),
        "failed_probe_count": len(failed_probes),
        "failed_probes": failed_probes,
        "missing_admin_diagnostics": list(missing_by_admin.values()),
        "missing_admin_reference_sample": missing_admin_references[:200],
        "empty_alias_sample": empty_aliases[:100],
        "admin_count_distribution": {str(key): value for key, value in sorted(distribution.items())},
        "probes": probe_results,
        "valid": valid,
    }
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")
    print(
        f"Search validation valid={valid}; aliases={len(mapping):,}; population={len(names):,}; "
        f"missing_refs={len(missing_admin_references)}; unique_missing={len(missing_by_admin)}; "
        f"empty={len(empty_aliases)}; failed_probes={len(failed_probes)}"
    )


if __name__ == "__main__":
    main()
