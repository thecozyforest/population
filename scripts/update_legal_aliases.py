from __future__ import annotations

import io
import json
import re
import sys
import zipfile
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "legal-admin-aliases.json"
BASE_URL = "https://www.mois.go.kr"
LIST_URL = (
    f"{BASE_URL}/frt/bbs/type001/commonSelectBoardList.do"
    "?bbsId=BBSMSTR_000000000052"
)

# 최신 게시물 탐색이 일시적으로 실패할 때 사용할 검증된 공식 자료입니다.
FALLBACK_EFFECTIVE_DATE = "2026-07-20"
FALLBACK_ARTICLE_URL = (
    f"{BASE_URL}/frt/bbs/type001/commonSelectBoardArticle.do"
    "?bbsId=BBSMSTR_000000000052&nttId=127979"
)
FALLBACK_ZIP_URL = (
    f"{BASE_URL}/cmm/fms/FileDown.do"
    "?atchFileId=FILE_00147311ctH5-ah&fileSn=1"
)

HEADERS = {
    "시도명": ("시도명",),
    "시군구명": ("시군구명",),
    "읍면동명": ("읍면동명", "행정동명"),
    "동리명": ("동리명", "법정동명"),
}

SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "Chrome/124 Safari/537.36 population-dashboard-updater"
        )
    }
)


def clean(value: object) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.endswith(".0") and text[:-2].isdigit():
        text = text[:-2]
    return re.sub(r"\s+", " ", text)


def get_html(url: str) -> str:
    response = SESSION.get(url, timeout=90, allow_redirects=True)
    response.raise_for_status()
    response.encoding = response.apparent_encoding or "utf-8"
    return response.text


def discover_latest_source() -> tuple[str, str, str]:
    """Return effective_date, article_url, non-deleted-code ZIP URL."""
    try:
        list_soup = BeautifulSoup(get_html(LIST_URL), "html.parser")
        articles: list[tuple[int, str]] = []
        for anchor in list_soup.find_all("a", href=True):
            text = clean(anchor.get_text(" ", strip=True))
            href = anchor.get("href", "")
            if "commonSelectBoardArticle.do" not in href:
                continue
            if not (
                ("행정기관" in text and "관할구역" in text)
                or "주민등록주소코드" in text
            ):
                continue
            match = re.search(r"nttId=(\d+)", href)
            if match:
                articles.append((int(match.group(1)), urljoin(BASE_URL, href)))

        if not articles:
            raise RuntimeError("행안부 게시판에서 주소코드 게시물을 찾지 못했습니다.")

        _, article_url = max(articles)
        article_soup = BeautifulSoup(get_html(article_url), "html.parser")
        downloads: list[tuple[str, str]] = []
        for anchor in article_soup.find_all("a", href=True):
            text = clean(anchor.get_text(" ", strip=True))
            href = anchor.get("href", "")
            match = re.search(r"jscode(\d{8})\.zip", text, re.IGNORECASE)
            if not match or "말소" in text:
                continue
            if "FileDown.do" not in href:
                continue
            downloads.append((match.group(1), urljoin(BASE_URL, href)))

        if not downloads:
            raise RuntimeError("최신 게시물에서 말소코드 제외 jscode ZIP을 찾지 못했습니다.")

        yyyymmdd, zip_url = max(downloads)
        effective_date = f"{yyyymmdd[:4]}-{yyyymmdd[4:6]}-{yyyymmdd[6:]}"
        return effective_date, article_url, zip_url
    except Exception as error:
        print(f"Latest-source discovery failed; using verified fallback: {error}")
        return FALLBACK_EFFECTIVE_DATE, FALLBACK_ARTICLE_URL, FALLBACK_ZIP_URL


def find_header_indexes(rows: list[tuple[object, ...]]) -> tuple[int, dict[str, int]]:
    for row_index, row in enumerate(rows[:30]):
        normalized = [clean(value).replace(" ", "") for value in row]
        indexes: dict[str, int] = {}
        for canonical, variants in HEADERS.items():
            for variant in variants:
                target = variant.replace(" ", "")
                if target in normalized:
                    indexes[canonical] = normalized.index(target)
                    break
        if len(indexes) == len(HEADERS):
            return row_index, indexes
    raise RuntimeError("KiKmix 엑셀에서 시도명·시군구명·읍면동명·동리명 헤더를 찾지 못했습니다.")


def workbook_rows(content: bytes) -> Iterable[tuple[object, ...]]:
    workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    worksheet = workbook.active
    yield from worksheet.iter_rows(values_only=True)


def build_full_names(sido: str, sigungu: str, admin: str, legal: str) -> tuple[str, str] | None:
    sido, sigungu, admin, legal = map(clean, (sido, sigungu, admin, legal))
    if not sido or not admin or not legal:
        return None

    admin_parts = [sido]
    if sigungu:
        admin_parts.append(sigungu)
    admin_parts.append(admin)
    admin_full = clean(" ".join(admin_parts))

    legal_parts = [sido]
    if sigungu:
        legal_parts.append(sigungu)

    # 법정리는 주소상 읍·면을 함께 써야 같은 이름의 리를 구별할 수 있습니다.
    if legal.endswith("리") and admin.endswith(("읍", "면")):
        legal_parts.extend([admin, legal])
    elif legal == admin:
        legal_parts.append(legal)
    else:
        legal_parts.append(legal)

    legal_full = clean(" ".join(legal_parts))
    return legal_full, admin_full


def parse_kikmix_xlsx(content: bytes) -> dict[str, set[str]]:
    rows = list(workbook_rows(content))
    header_row, indexes = find_header_indexes(rows)
    aliases: dict[str, set[str]] = defaultdict(set)

    for row in rows[header_row + 1 :]:
        if not row:
            continue
        try:
            names = build_full_names(
                row[indexes["시도명"]],
                row[indexes["시군구명"]],
                row[indexes["읍면동명"]],
                row[indexes["동리명"]],
            )
        except IndexError:
            continue
        if not names:
            continue
        legal_full, admin_full = names
        aliases[legal_full].add(admin_full)

    if len(aliases) < 1000:
        raise RuntimeError(f"전국 검색 사전 결과가 비정상적으로 적습니다: {len(aliases)}개")
    return aliases


def select_kikmix_xlsx(archive: zipfile.ZipFile) -> str:
    candidates = [
        name
        for name in archive.namelist()
        if "kikmix" in name.lower()
        and name.lower().endswith(".xlsx")
        and "말소" not in name
        and not Path(name).name.startswith("~$")
    ]
    if not candidates:
        raise RuntimeError("압축파일에서 말소코드 제외 KiKmix 엑셀을 찾지 못했습니다.")
    candidates.sort(key=lambda name: (len(Path(name).parts), len(name)))
    return candidates[0]


def fetch_zip(url: str, article_url: str) -> bytes:
    response = SESSION.get(
        url,
        timeout=120,
        allow_redirects=True,
        headers={"Referer": article_url},
    )
    response.raise_for_status()
    content = response.content
    if not content.startswith(b"PK"):
        preview = content[:160].decode("utf-8", errors="replace")
        raise RuntimeError(f"행안부 응답이 ZIP이 아닙니다: {preview!r}")
    return content


def main() -> None:
    effective_date, article_url, zip_url = discover_latest_source()
    if len(sys.argv) > 1 and sys.argv[1].strip():
        zip_url = sys.argv[1].strip()

    content = fetch_zip(zip_url, article_url)
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        xlsx_name = select_kikmix_xlsx(archive)
        aliases = parse_kikmix_xlsx(archive.read(xlsx_name))

    payload = {
        "updated": effective_date,
        "generated": date.today().isoformat(),
        "scope": "nationwide-official",
        "source": article_url,
        "download": zip_url,
        "aliases": [
            {"legal": legal, "admins": sorted(admins)}
            for legal, admins in sorted(aliases.items())
        ],
    }
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
        newline="\n",
    )
    print(
        f"Wrote {OUTPUT.name}: {len(payload['aliases']):,} legal areas, "
        f"{sum(len(item['admins']) for item in payload['aliases']):,} mappings; "
        f"effective={effective_date}; source={xlsx_name}"
    )


if __name__ == "__main__":
    main()
