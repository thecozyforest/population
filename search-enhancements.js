(() => {
  "use strict";

  const BOOTSTRAP_ALIASES = [
    {
      legal: "서울특별시 관악구 봉천동",
      admins: [
        "서울특별시 관악구 보라매동",
        "서울특별시 관악구 은천동",
        "서울특별시 관악구 성현동",
        "서울특별시 관악구 청림동",
        "서울특별시 관악구 중앙동",
        "서울특별시 관악구 행운동",
        "서울특별시 관악구 청룡동",
        "서울특별시 관악구 낙성대동",
        "서울특별시 관악구 인헌동"
      ]
    },
    {
      legal: "서울특별시 관악구 신림동",
      admins: [
        "서울특별시 관악구 신림동",
        "서울특별시 관악구 신사동",
        "서울특별시 관악구 조원동",
        "서울특별시 관악구 서원동",
        "서울특별시 관악구 신원동",
        "서울특별시 관악구 미성동",
        "서울특별시 관악구 난곡동",
        "서울특별시 관악구 난향동",
        "서울특별시 관악구 삼성동",
        "서울특별시 관악구 서림동",
        "서울특별시 관악구 대학동"
      ]
    },
    {
      legal: "서울특별시 관악구 남현동",
      admins: ["서울특별시 관악구 남현동"]
    }
  ];

  let officialAliases = [];
  let lastAliasResult = null;
  const originalFilterRegions = filterRegions;
  const originalRenderDropdown = renderDropdown;

  const style = document.createElement("style");
  style.textContent = `
    .search-basis-note{margin:9px 3px 0;padding:9px 11px;border:1px solid var(--border);border-radius:12px;background:var(--soft);color:var(--muted);font-size:10px;font-weight:700;line-height:1.62}
    .search-basis-note strong{color:var(--text)}
  `;
  document.head.appendChild(style);

  function normalizedSearchText(value) {
    return norm(value)
      .toLocaleLowerCase("ko-KR")
      .replace(/서울특별시/g, "서울")
      .replace(/부산광역시/g, "부산")
      .replace(/대구광역시/g, "대구")
      .replace(/인천광역시/g, "인천")
      .replace(/광주광역시/g, "광주")
      .replace(/대전광역시/g, "대전")
      .replace(/울산광역시/g, "울산")
      .replace(/세종특별자치시/g, "세종")
      .replace(/제주특별자치도/g, "제주")
      .replace(/전북특별자치도/g, "전북")
      .replace(/강원특별자치도/g, "강원")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compactAdministrativeLeaf(value) {
    const leaf = clean(value).split(" ").at(-1) || "";
    return leaf.replace(/제?\d+동$/, "동");
  }

  function dedupeNames(names) {
    const seen = new Set();
    return names.filter(name => {
      const key = norm(name);
      if (!key || seen.has(key) || !regionMap.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function aliasEntries() {
    const merged = new Map();
    [...BOOTSTRAP_ALIASES, ...officialAliases].forEach(entry => {
      if (!entry || !entry.legal || !Array.isArray(entry.admins)) return;
      const key = norm(entry.legal);
      if (!merged.has(key)) merged.set(key, { legal: clean(entry.legal), admins: [] });
      merged.get(key).admins.push(...entry.admins.map(clean));
    });
    return [...merged.values()].map(entry => ({ ...entry, admins: [...new Set(entry.admins)] }));
  }

  function matchesLegalQuery(entry, query) {
    const candidate = normalizedSearchText(entry.legal);
    const words = normalizedSearchText(query).split(/\s+/).filter(Boolean);
    return words.length > 0 && words.every(word => candidate.includes(word));
  }

  function numericDongFallback(query) {
    const q = normalizedSearchText(query);
    const words = q.split(/\s+/).filter(Boolean);
    const queryLeaf = words.at(-1) || "";
    if (!queryLeaf.endsWith("동") || /\d/.test(queryLeaf)) return [];

    const parentWords = words.slice(0, -1);
    return regionNames.filter(name => {
      const candidate = normalizedSearchText(name);
      if (!parentWords.every(word => candidate.includes(word))) return false;
      return compactAdministrativeLeaf(name).toLocaleLowerCase("ko-KR") === queryLeaf;
    });
  }

  filterRegions = function enhancedFilterRegions(query) {
    const text = clean(query);
    if (!text) {
      lastAliasResult = null;
      return originalFilterRegions(query);
    }

    const direct = originalFilterRegions(query);
    const exact = regionMap.get(norm(text));
    if (exact) {
      lastAliasResult = null;
      return [exact.name];
    }

    const matchedAliases = aliasEntries().filter(entry => matchesLegalQuery(entry, text));
    const aliasNames = dedupeNames(matchedAliases.flatMap(entry => entry.admins));
    const numericNames = dedupeNames(numericDongFallback(text));
    const combined = dedupeNames([...direct, ...aliasNames, ...numericNames]);

    if (aliasNames.length || numericNames.length) {
      lastAliasResult = {
        legalNames: matchedAliases.map(entry => entry.legal),
        count: combined.length,
        usedOfficialTable: matchedAliases.some(entry => officialAliases.includes(entry))
      };
    } else {
      lastAliasResult = null;
    }
    return combined;
  };

  renderDropdown = function enhancedRenderDropdown(showFullList = false) {
    lastAliasResult = null;
    originalRenderDropdown(showFullList);
    if (!showFullList && lastAliasResult) {
      const legalLabel = lastAliasResult.legalNames.length
        ? `법정동 ${lastAliasResult.legalNames.map(name => `‘${name}’`).join(", ")}`
        : "법정동 분동 이름";
      $("dropdownInfo").textContent = `${legalLabel}의 관할 행정동 ${lastAliasResult.count}개 · 인구 통계는 행정동 기준`;
    }
  };

  async function loadOfficialAliases() {
    try {
      const response = await fetch(`./legal-admin-aliases.json?v=20260720`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data)) officialAliases = data;
      else if (Array.isArray(data.aliases)) officialAliases = data.aliases;
    } catch (error) {
      console.warn("법정동 검색 사전을 불러오지 못해 기본 검색 사전을 사용합니다.", error);
    }
  }

  const input = $("regionInput");
  if (input) input.placeholder = "행정동·법정동 검색: 봉천동, 역삼동, 방배3동";

  const status = $("status");
  const selector = status?.parentElement;
  if (selector && !selector.querySelector(".search-basis-note")) {
    const note = document.createElement("div");
    note.className = "search-basis-note";
    note.innerHTML = "<strong>검색 기준 안내:</strong> 주민등록 인구는 행정동·읍·면 기준입니다. 봉천동·역삼동처럼 법정동으로 검색하면 관할 행정동을 목록으로 보여 줍니다.";
    status.after(note);
  }

  loadOfficialAliases();
})();
