(() => {
  "use strict";

  const SOURCE_URL = CSV_URL;
  const sourceRecords = [];
  const sourceById = new Map();
  const sourceByName = new Map();
  let sourceReady = false;
  let sourceRowCount = 0;

  const original = {
    selectedPops, focusPop, filterRegions, renderDropdown, addRegion, removeRegion,
    setFocus, renderChips, renderOverview, renderCompareTable, populateDetailSelects,
    renderPyramids, findTwins, renderTwins, buildRanking, mapNamesForSelection,
    selectMapRegion, focusProvince, renderAll
  };

  const style = document.createElement("style");
  style.textContent = `
    .source-db-note{margin:9px 3px 0;padding:9px 11px;border:1px solid var(--border);border-radius:12px;background:var(--soft);color:var(--muted);font-size:10px;font-weight:700;line-height:1.62}
    .source-db-note strong{color:var(--text)}
    .source-code{display:block;margin-top:3px;color:var(--faint);font-size:9px;font-weight:750;letter-spacing:.02em}
    .region-option .source-option-main{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .region-option .source-option-state{flex:0 0 auto;color:var(--muted);font-size:9px;font-weight:850}
    .chip-name{display:grid;line-height:1.25}.chip-name small{color:var(--faint);font-size:8px;font-weight:750}
  `;
  document.head.appendChild(style);

  function exactRawLabel(value) {
    return String(value ?? "").replace(/^\uFEFF/, "").trim();
  }

  function extractCode(value) {
    const match = exactRawLabel(value).match(/\((\d{8,12})\)\s*$/);
    return match ? match[1] : "";
  }

  function sourceName(value) {
    return exactRawLabel(value).replace(/\s*\(\d{8,12}\)\s*$/, "").trim();
  }

  function recordLabel(record) {
    return record?.rawLabel || record?.name || "";
  }

  function recordId(record) {
    return record?.id || record?.code || "";
  }

  function indexRecord(record) {
    sourceById.set(record.id, record);
    const key = norm(record.name);
    if (!sourceByName.has(key)) sourceByName.set(key, []);
    sourceByName.get(key).push(record);
  }

  function resolveRecord(token) {
    if (!token) return null;
    const value = String(token);
    if (sourceById.has(value)) return sourceById.get(value);
    const code = extractCode(value);
    if (code && sourceById.has(code)) return sourceById.get(code);
    const matches = sourceByName.get(norm(value)) || [];
    return matches[0] || null;
  }

  function resolveAllByName(name) {
    return sourceByName.get(norm(name)) || [];
  }

  window.populationResolveRecord = resolveRecord;
  window.populationRecordLabel = recordLabel;
  window.populationRecordId = recordId;

  function decodeSource(buffer) {
    if (window.__decodePopulation) return window.__decodePopulation(buffer);
    try {
      const text = new TextDecoder("utf-8", { fatal:true }).decode(buffer);
      if (/_(남|여)_\d+세/.test(text)) return text;
    } catch (_) {}
    return new TextDecoder("euc-kr").decode(buffer);
  }

  async function waitForInitialLoad() {
    const started = Date.now();
    while (Date.now() - started < 15000) {
      if (regionMap.size && !$('regionInput').disabled) return;
      await new Promise(resolve => setTimeout(resolve, 80));
    }
  }

  async function loadExactSourceRows() {
    await waitForInitialLoad();
    const response = await fetch(`${SOURCE_URL}?source_rows=${Date.now()}`, { cache:"no-store" });
    if (!response.ok) throw new Error(`원본 DB HTTP ${response.status}`);
    const text = decodeSource(await response.arrayBuffer());
    let headers = null, male = [], female = [];

    parseCSV(text, row => {
      if (!headers) {
        headers = row.map((header,index) => index ? String(header ?? "").trim() : String(header ?? "").trim().replace(/^\uFEFF/, ""));
        headers.forEach((header,index) => {
          const match = header.match(/^(\d{4}년\d{1,2}월)_(남|여)_(\d+)세(?:\s*이상)?$/);
          if (!match) return;
          if (!dataPeriod) dataPeriod = match[1];
          const age = Math.min(Number(match[3]), 100);
          (match[2] === "남" ? male : female).push({ index, age });
        });
        return;
      }
      if (!row.length || row.every(value => !String(value ?? "").trim())) return;
      const rawLabel = exactRawLabel(row[0]);
      const code = extractCode(rawLabel);
      const name = clean(sourceName(rawLabel));
      if (!rawLabel || !code || !name) return;

      const ageMale = Array(101).fill(0), ageFemale = Array(101).fill(0);
      male.forEach(column => { ageMale[column.age] += num(row[column.index]); });
      female.forEach(column => { ageFemale[column.age] += num(row[column.index]); });
      const population = {
        id:code, code, rawLabel, rawName:sourceName(rawLabel), name,
        sourceRow:sourceRecords.length + 2,
        ageMale, ageFemale,
        male:ageMale.reduce((a,b) => a+b,0),
        female:ageFemale.reduce((a,b) => a+b,0)
      };
      population.total = population.male + population.female;
      population.metrics = metrics(population);
      sourceRecords.push(population);
      indexRecord(population);
    });

    if (!headers || !male.length || !female.length) throw new Error("원본 DB의 남녀 연령 열을 찾지 못했습니다.");
    sourceRowCount = sourceRecords.length;
    if (!sourceRowCount) throw new Error("원본 DB 행을 읽지 못했습니다.");

    regionMap.clear();
    sourceRecords.forEach(record => regionMap.set(record.id, record));
    regionNames = sourceRecords.map(record => record.id);

    const defaultRecord = resolveAllByName(DEFAULT_REGION)[0] || sourceRecords[0];
    selectedNames = defaultRecord ? [defaultRecord.id] : [];
    focusName = defaultRecord?.id || "";
    detailPair = defaultRecord ? [defaultRecord.id] : [];
    visibleNames = [];
    sourceReady = true;

    window.populationSourceAudit = {
      sourceRowCount,
      appRowCount:regionMap.size,
      uniqueCodeCount:sourceById.size,
      duplicateNormalizedNameCount:[...sourceByName.values()].filter(items => items.length > 1).length,
      period:dataPeriod
    };

    $("regionInput").placeholder = "원본 DB 행정구역명 또는 코드 검색";
    $("regionInput").value = "";
    renderAll();
    setStatus(`원본 DB ${numberFmt.format(sourceRowCount)}행을 코드 기준으로 모두 반영했습니다. 앱 등록 ${numberFmt.format(regionMap.size)}행 · ${dataPeriod || "자료 시점 확인 중"}.`);
  }

  selectedPops = function sourceSelectedPops() {
    if (!sourceReady) return original.selectedPops();
    return selectedNames.map(id => sourceById.get(String(id))).filter(Boolean);
  };

  focusPop = function sourceFocusPop() {
    if (!sourceReady) return original.focusPop();
    return sourceById.get(String(focusName)) || selectedPops()[0] || null;
  };

  filterRegions = function sourceFilterRegions(query) {
    if (!sourceReady) return original.filterRegions(query);
    const words = clean(query).toLocaleLowerCase("ko-KR").split(/\s+/).filter(Boolean);
    if (!words.length) return [...regionNames];
    return sourceRecords.filter(record => {
      const candidate = `${record.rawLabel} ${record.name} ${record.code}`.toLocaleLowerCase("ko-KR");
      return words.every(word => candidate.includes(word));
    }).map(record => record.id);
  };

  renderDropdown = function sourceRenderDropdown(showFullList=false) {
    if (!sourceReady) return original.renderDropdown(showFullList);
    const matches = showFullList ? [...regionNames] : filterRegions($("regionInput").value);
    visibleNames = matches.slice(0, MAX_OPTIONS);
    highlightIndex = -1;
    const list = $("regionList");
    list.replaceChildren();
    if (!visibleNames.length) {
      list.innerHTML = '<div class="empty">원본 DB에 일치하는 행이 없습니다.</div>';
      $("dropdownInfo").textContent = "원본 DB 검색 결과 0행";
      return;
    }
    const fragment = document.createDocumentFragment();
    visibleNames.forEach(id => {
      const record = sourceById.get(id);
      if (!record) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `region-option${selectedNames.includes(id) ? " selected" : ""}`;
      button.innerHTML = `<span class="source-option-main">${esc(record.rawLabel)}</span><span class="source-option-state">${selectedNames.includes(id) ? "선택됨" : `원본 ${record.sourceRow}행`}</span>`;
      button.addEventListener("mousedown", event => event.preventDefault());
      button.addEventListener("click", () => addRegion(id));
      fragment.appendChild(button);
    });
    list.appendChild(fragment);
    $("dropdownInfo").textContent = matches.length > MAX_OPTIONS
      ? `원본 ${numberFmt.format(matches.length)}행 중 ${MAX_OPTIONS}행 표시`
      : `원본 DB ${numberFmt.format(matches.length)}행`;
  };

  addRegion = function sourceAddRegion(token) {
    if (!sourceReady) return original.addRegion(token);
    const record = resolveRecord(token);
    if (!record) return;
    const id = record.id;
    if (selectedNames.includes(id)) focusName = id;
    else if (selectedNames.length >= MAX_SELECTED) {
      setStatus("비교 바구니는 최대 5행입니다. 하나를 지운 뒤 추가해 주세요.", true);
      closeDropdown();
      return;
    } else {
      selectedNames.push(id);
      focusName = id;
      if (detailPair.length < 2) detailPair.push(id);
    }
    $("regionInput").value = "";
    closeDropdown();
    renderAll();
    setStatus(`${record.rawLabel} 원본 행을 비교 바구니에 추가했습니다.`);
  };

  removeRegion = function sourceRemoveRegion(id) {
    if (!sourceReady) return original.removeRegion(id);
    selectedNames = selectedNames.filter(item => item !== id);
    detailPair = detailPair.filter(item => item !== id);
    if (focusName === id) focusName = selectedNames[0] || "";
    while (detailPair.length < Math.min(2, selectedNames.length)) {
      const next = selectedNames.find(item => !detailPair.includes(item));
      if (!next) break;
      detailPair.push(next);
    }
    renderAll();
    setStatus(selectedNames.length ? "비교 바구니를 업데이트했습니다." : "비교할 원본 DB 행을 추가해 주세요.");
  };

  setFocus = function sourceSetFocus(id) {
    if (!sourceReady) return original.setFocus(id);
    if (!selectedNames.includes(id)) return;
    focusName = id;
    renderAll();
    const record = sourceById.get(id);
    setStatus(`${recordLabel(record)}을 기준 행으로 설정했습니다.`);
  };

  renderChips = function sourceRenderChips() {
    if (!sourceReady) return original.renderChips();
    const box = $("selectedChips");
    box.replaceChildren();
    if (!selectedNames.length) {
      box.innerHTML = '<span class="chip-placeholder">아직 선택한 원본 DB 행이 없습니다.</span>';
      return;
    }
    selectedNames.forEach((id,index) => {
      const record = sourceById.get(id);
      if (!record) return;
      const chip = document.createElement("span");
      chip.className = `chip${id === focusName ? " focused" : ""}`;
      chip.style.setProperty("--chip", COLORS[index]);
      chip.innerHTML = `<span class="chip-key">${String.fromCharCode(65 + index)}</span><span class="chip-name">${esc(record.name)}<small>${esc(record.code)}</small></span>`;
      const focus = document.createElement("button");
      focus.type = "button"; focus.className = "chip-focus"; focus.title = "기준 행으로 설정";
      focus.textContent = id === focusName ? "★" : "☆"; focus.onclick = () => setFocus(id);
      const remove = document.createElement("button");
      remove.type = "button"; remove.className = "chip-remove"; remove.title = "선택 해제";
      remove.textContent = "×"; remove.onclick = () => removeRegion(id);
      chip.append(focus, remove); box.appendChild(chip);
    });
  };

  function tableHeading(record, letter) {
    return `<th>${letter} · ${esc(record.name)}<span class="source-code">${esc(record.code)}</span></th>`;
  }

  renderOverview = function sourceRenderOverview() {
    if (!sourceReady) return original.renderOverview();
    const p = focusPop(); if (!p) return; const m = p.metrics;
    $("overviewMetrics").innerHTML = `<article class="metric"><span class="metric-label">총인구</span><strong class="metric-value">${numberFmt.format(m.total)}<small>명</small></strong><span class="metric-sub">남 ${numberFmt.format(m.male)} · 여 ${numberFmt.format(m.female)}</span></article><article class="metric"><span class="metric-label">고령화율</span><strong class="metric-value ${m.elderlyRate>=20?"danger":""}">${rateFmt.format(m.elderlyRate)}%</strong><span class="metric-sub">65세 이상 ${numberFmt.format(m.elderly)}명</span>${m.elderlyRate>=20?'<div class="danger-box">20% 이상 · 빨간 경고 표시</div>':""}</article><article class="metric"><span class="metric-label">유소년 비율</span><strong class="metric-value">${rateFmt.format(m.youthRate)}%</strong><span class="metric-sub">0~14세 ${numberFmt.format(m.youth)}명</span></article><article class="metric"><span class="metric-label">추정 중위연령</span><strong class="metric-value">${m.medianAge}<small>세</small></strong><span class="metric-sub">1세 단위 주민등록 인구 누적 기준</span></article>`;
    const pops = selectedPops(), heads = pops.map((record,index) => tableHeading(record, String.fromCharCode(65 + index))).join("");
    const rows = [["총인구",x=>numberFmt.format(x.metrics.total)+"명"],["고령화율",x=>rateFmt.format(x.metrics.elderlyRate)+"%"],["유소년",x=>rateFmt.format(x.metrics.youthRate)+"%"],["0세",x=>rateFmt.format(x.metrics.age0Rate)+"%"],["20~39세",x=>rateFmt.format(x.metrics.youngRate)+"%"],["75세 이상",x=>rateFmt.format(x.metrics.careRate)+"%"]];
    $("quickTable").innerHTML = `<thead><tr><th>지표</th>${heads}</tr></thead><tbody>${rows.map(row=>`<tr><th>${row[0]}</th>${pops.map(x=>`<td class="${row[0]==="고령화율"&&x.metrics.elderlyRate>=20?"danger":""}">${row[1](x)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    const mapped = mapNamesForSelection(p.id)[0], rank = mapped ? mapRankByName.get(mapped) : null;
    $("focusSummary").innerHTML = `<h3>★ ${esc(p.name)}</h3><span class="source-code">원본 코드 ${esc(p.code)} · CSV ${numberFmt.format(p.sourceRow)}행</span><ul><li>고령화율 ${rateFmt.format(m.elderlyRate)}%, 유소년 ${rateFmt.format(m.youthRate)}%</li><li>0~6세 ${rateFmt.format(m.infantRate)}%, 25~44세 ${rateFmt.format(m.familyRate)}%</li><li>${rank?`현재 지도 지표 전국 ${rank.rank}위`:"지도 데이터를 불러오면 전국 순위를 표시합니다."}</li><li>이름을 합치거나 법정동으로 변환하지 않은 원본 DB 행입니다.</li></ul>`;
  };

  renderCompareTable = function sourceRenderCompareTable() {
    if (!sourceReady) return original.renderCompareTable();
    const pops = selectedPops(), heads = pops.map((record,index) => tableHeading(record, String.fromCharCode(65 + index))).join("");
    $("compareTable").innerHTML = `<thead><tr><th>지표</th>${heads}</tr></thead><tbody>${compareRows().map(([name,formatter])=>`<tr><th>${name}</th>${pops.map(pop=>`<td class="${name.includes("고령")&&pop.metrics.elderlyRate>=20?"danger":""}">${formatter(pop)}</td>`).join("")}</tr>`).join("")}</tbody>`;
  };

  populateDetailSelects = function sourcePopulateDetailSelects() {
    if (!sourceReady) return original.populateDetailSelects();
    const a = $("detailA"), b = $("detailB"); [a,b].forEach(select => select.replaceChildren());
    selectedNames.forEach(id => {
      const record = sourceById.get(id); if (!record) return;
      [a,b].forEach(select => { const option = document.createElement("option"); option.value = id; option.textContent = record.rawLabel; select.appendChild(option); });
    });
    if (!detailPair[0] && selectedNames[0]) detailPair[0] = selectedNames[0];
    if (!detailPair[1] && selectedNames[1]) detailPair[1] = selectedNames[1];
    a.value = detailPair[0] || ""; b.value = detailPair[1] || detailPair[0] || ""; b.disabled = selectedNames.length < 2;
  };

  renderPyramids = function sourceRenderPyramids() {
    if (!sourceReady) return original.renderPyramids();
    if (!window.Plotly) return; const box = $("chartGrid"); if (!box) return;
    const ids = selectedNames.length < 2 ? [selectedNames[0]] : [detailPair[0] || selectedNames[0], detailPair[1] || selectedNames[1]].filter((id,index,array)=>id&&array.indexOf(id)===index);
    const pops = ids.map(id => sourceById.get(id)).filter(Boolean);
    box.classList.toggle("single", pops.length === 1); box.replaceChildren();
    pops.forEach((p,index) => { const card = document.createElement("article"); card.className = "chart-card"; card.innerHTML = `<h3>${index?"B":"A"} · ${esc(p.name)}</h3><p>코드 ${esc(p.code)} · 고령 ${rateFmt.format(p.metrics.elderlyRate)}% · 유소년 ${rateFmt.format(p.metrics.youthRate)}%</p><div class="pyramid"></div>`; box.appendChild(card); drawPyramid(card.querySelector(".pyramid"), p); });
  };

  findTwins = function sourceFindTwins(base) {
    if (!sourceReady) return original.findTwins(base);
    return sourceRecords.filter(candidate => candidate.id !== base.id && candidate.total > 0 && level(candidate.name) === level(base.name)).filter(candidate => twinScope === "province" ? province(candidate.name) === province(base.name) : twinScope === "parent" ? parent(candidate.name) === parent(base.name) : true).map(candidate => ({ p:candidate, d:twinDistance(base,candidate) })).sort((a,b)=>a.d-b.d).slice(0,6);
  };

  renderTwins = function sourceRenderTwins() {
    if (!sourceReady) return original.renderTwins();
    const box = $("twins"), base = focusPop(); box.replaceChildren(); if (!base) return;
    const twins = findTwins(base); if (!twins.length) { box.innerHTML = '<div class="empty">같은 행정단위의 비교 행을 찾지 못했습니다.</div>'; return; }
    twins.forEach(({p,d}) => { const score = Math.max(0,Math.min(100,100/(1+d*.72))), card = document.createElement("article"); card.className = "twin"; card.innerHTML = `<h3>${esc(p.name)}</h3><span class="source-code">${esc(p.code)}</span><span class="similarity">구조 유사도 ${rateFmt.format(score)}%</span><p>고령화 차이 ${rateFmt.format(Math.abs(base.metrics.elderlyRate-p.metrics.elderlyRate))}%p · 유소년 차이 ${rateFmt.format(Math.abs(base.metrics.youthRate-p.metrics.youthRate))}%p · 중위연령 차이 ${Math.abs(base.metrics.medianAge-p.metrics.medianAge)}세</p>`; const button = document.createElement("button"); button.textContent = "비교 바구니에 추가"; button.onclick = () => addRegion(p.id); card.appendChild(button); box.appendChild(card); });
  };

  buildRanking = function sourceBuildRanking() {
    if (!sourceReady) return original.buildRanking();
    const definition = currentMetric(), ranking = [];
    mapRegions.forEach(region => {
      const population = resolveAllByName(region.name)[0];
      if (!population || !population.total) return;
      const value = metricValue(population, definition);
      ranking.push({ name:region.name, id:population.id, total:population.total, count:value.count, value:value.rate });
    });
    ranking.sort((a,b)=>b.value-a.value||b.total-a.total||a.name.localeCompare(b.name,"ko-KR"));
    mapRanking = ranking;
    mapRankByName = new Map(ranking.map((item,index)=>[item.name,{...item,rank:index+1}]));
  };

  mapNamesForSelection = function sourceMapNamesForSelection(token) {
    if (!sourceReady) return original.mapNamesForSelection(token);
    const record = resolveRecord(token); const name = clean(record?.name || token);
    if (!name || !mapRegions.size) return [];
    if (mapRegions.has(name)) return [name];
    const matches = [...mapRegions.keys()].filter(mapName => name.startsWith(`${mapName} `)).sort((a,b)=>b.length-a.length);
    if (matches.length) return [matches[0]];
    if (level(name) === "province") return [...mapRegions.keys()].filter(mapName => mapName.startsWith(`${name} `));
    return [];
  };

  selectMapRegion = function sourceSelectMapRegion(name) {
    if (!sourceReady) return original.selectMapRegion(name);
    const record = resolveAllByName(name)[0]; if (!record) return;
    addRegion(record.id); activateTab("overview", true);
  };

  focusProvince = function sourceFocusProvince() {
    if (!sourceReady) return original.focusProvince();
    const record = focusPop(); if (!record) return "";
    const mapped = mapNamesForSelection(record.id)[0];
    return mapped ? province(mapped) : province(record.name);
  };

  renderAll = function sourceRenderAll() {
    if (!sourceReady) return original.renderAll();
    original.renderAll();
    const badge = $("periodBadge");
    if (badge) badge.textContent = `${dataPeriod || "자료 시점 확인 중"} · 원본 DB ${numberFmt.format(sourceRowCount)}행`;
  };

  const selector = $("status")?.parentElement;
  if (selector) {
    selector.querySelector(".search-basis-note")?.remove();
    const note = document.createElement("div");
    note.className = "source-db-note";
    note.innerHTML = "<strong>검색 기준:</strong> 원본 <code>population_latest.csv</code>의 행정구역명과 코드를 그대로 사용합니다. 원본에 없는 법정동 별칭이나 임의 합산 지역은 만들지 않습니다.";
    $("status").after(note);
  }

  $("searchForm").onsubmit = event => {
    event.preventDefault();
    if (!sourceReady) return;
    const query = $("regionInput").value;
    const code = extractCode(query) || String(query).trim();
    if (sourceById.has(code)) return addRegion(code);
    const exact = sourceRecords.filter(record => record.rawLabel === exactRawLabel(query) || norm(record.name) === norm(query));
    if (exact.length === 1) return addRegion(exact[0].id);
    const matches = filterRegions(query);
    if (matches.length === 1) addRegion(matches[0]);
    else if (matches.length) { setStatus(`원본 DB에서 ${numberFmt.format(matches.length)}행이 검색되었습니다. 코드까지 확인해 선택해 주세요.`); openDropdown(false); }
    else { setStatus("원본 DB에 입력한 행정구역명이 없습니다.", true); openDropdown(false); }
  };

  loadExactSourceRows().catch(error => {
    console.error(error);
    setStatus(`원본 DB 재적재에 실패했습니다: ${error.message}`, true);
  });
})();