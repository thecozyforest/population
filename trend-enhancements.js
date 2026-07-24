(() => {
  "use strict";

  const YEARLY_URL = "https://raw.githubusercontent.com/greatsong/modudata/main/data/population_yearly.csv.gz";
  const ARCHIVE_API_URL = "https://api.github.com/repos/greatsong/modudata/contents/data/archive?ref=main";
  let trendMode = "", trendPoints = [], trendFocus = "", busy = false;

  const style = document.createElement("style");
  style.textContent = `
    .trend-status{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.trend-status-card{padding:15px;border:1px solid var(--border);border-radius:17px;background:var(--solid)}.trend-status-card h3{margin:0;font-size:13px}.trend-status-card p{margin:7px 0 0;color:var(--muted);font-size:10px;font-weight:650;line-height:1.65}
    .trend-controls{display:flex;flex-wrap:wrap;align-items:end;gap:9px;margin-bottom:12px;padding:12px;border:1px solid var(--border);border-radius:16px;background:var(--soft)}.trend-action{min-height:38px;padding:0 12px;border:1px solid var(--border2);border-radius:999px;background:var(--solid);color:var(--muted);font-size:10px;font-weight:900}.trend-action.primary{border-color:var(--primary);background:var(--primary);color:#fff}.trend-action:hover:not(:disabled){background:var(--hover);color:var(--text)}.trend-action:disabled{cursor:wait;opacity:.58}
    .trend-progress{min-height:22px;margin:8px 2px;color:var(--muted);font-size:11px;font-weight:700;line-height:1.6}.trend-chart{width:100%;height:480px}.trend-table-wrap{overflow:auto;border:1px solid var(--border);border-radius:17px;background:var(--solid)}.archive-list{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 12px}.archive-chip{padding:6px 8px;border:1px solid var(--border);border-radius:999px;background:var(--soft);color:var(--muted);font-size:9px;font-weight:850}
    @media(max-width:1000px){.trend-status{grid-template-columns:1fr}}@media(max-width:720px){.trend-chart{height:430px}.trend-controls{align-items:stretch}.trend-action{width:100%}}
  `;
  document.head.appendChild(style);

  const tabs = document.querySelector(".tabs"), dashboard = $("dashboard");
  if (!tabs || !dashboard || $("panel-trend")) return;

  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "tab";
  tab.dataset.tab = "trend";
  tab.textContent = "📈 변화 추이";
  tabs.querySelector('[data-tab="compare"]')?.after(tab);

  const panel = document.createElement("div");
  panel.id = "panel-trend";
  panel.className = "panel";
  panel.innerHTML = `
    <section class="card">
      <header class="section-head"><div><h2 class="section-title">데이터 최신화와 보관 구조</h2><p class="section-copy">최신 월 자료와 과거 보관본은 원자료 저장소에서 관리됩니다.</p></div><span class="badge">필요할 때만 과거 자료 다운로드</span></header>
      <div class="trend-status">
        <article class="trend-status-card"><h3>최신 월 데이터</h3><p><code>population_latest.csv</code>를 접속할 때 캐시 없이 다시 읽습니다. 원자료 자동 갱신이 성공하면 HTML 수정 없이 새 월 자료가 표시됩니다.</p></article>
        <article class="trend-status-card"><h3>월별 보관본</h3><p><code>data/archive/</code>의 월별 스냅샷 중 최근 자료를 불러와 짧은 기간의 변화를 확인합니다.</p></article>
        <article class="trend-status-card"><h3>연도별 장기 추이</h3><p><code>population_yearly.csv.gz</code>의 2015년 이후 매년 6월 자료로 장기 변화를 확인합니다.</p></article>
      </div>
    </section>
    <section class="card">
      <header class="section-head"><div><h2 class="section-title">기준 지역 변화 추이</h2><p id="trendRegionLabel" class="section-copy"></p></div></header>
      <div class="trend-controls">
        <div class="control"><span class="control-label">그래프 지표</span><select id="trendMetric" class="select"><option value="total">총인구</option><option value="aging">고령화율</option><option value="youth">유소년 비율</option><option value="age0">0세 비율</option><option value="age7">만 7세 비율</option><option value="age13">만 13세 비율</option><option value="age16">만 16세 비율</option></select></div>
        <button id="loadMonthlyTrend" class="trend-action primary" type="button">최근 월별 추이 불러오기</button>
        <button id="loadYearlyTrend" class="trend-action" type="button">2015~ 연도별 추이 불러오기</button>
      </div>
      <p id="trendProgress" class="trend-progress">과거 자료는 용량이 크므로 버튼을 눌렀을 때만 내려받습니다.</p>
      <div id="trendArchiveList" class="archive-list"></div>
      <div id="trendChart" class="trend-chart"></div>
      <div class="trend-table-wrap"><table id="trendTable"></table></div>
      <div class="notice"><strong>해석 주의:</strong> 월별 자료는 최근 변화, 연도별 자료는 매년 6월 기준 장기 흐름에 적합합니다. 행정구역 신설·통폐합이나 코드 변경이 있으면 연속 비교가 끊길 수 있습니다.</div>
    </section>`;
  dashboard.insertBefore(panel, $("panel-curriculum") || null);

  function syncFocus() {
    const population = focusPop();
    if (!population) return;
    if (trendFocus && trendFocus !== population.name) {
      trendMode = ""; trendPoints = [];
      $("trendArchiveList").replaceChildren();
      $("trendTable").innerHTML = "";
      if (window.Plotly) Plotly.purge($("trendChart"));
      $("trendProgress").textContent = "기준 지역이 바뀌었습니다. 추이를 다시 불러와 주세요.";
    }
    trendFocus = population.name;
    $("trendRegionLabel").textContent = `${population.name} · ${trendMode === "monthly" ? "최근 월별 스냅샷" : trendMode === "yearly" ? "매년 6월 시계열" : "과거 자료를 불러와 주세요"}`;
  }

  tab.addEventListener("click", () => {
    activateTab("trend");
    syncFocus();
    if (trendPoints.length) renderTrend();
  });

  function decodeFlexible(buffer) {
    try {
      const utf8 = new TextDecoder("utf-8", { fatal:true }).decode(buffer);
      if (/_(남|여)_\d+세/.test(utf8) || /^연도,/m.test(utf8)) return utf8;
    } catch (_) {}
    return new TextDecoder("euc-kr").decode(buffer);
  }

  function order(label) {
    const match = String(label).match(/(\d{4})\D+(\d{1,2})/);
    return match ? Number(match[1]) * 100 + Number(match[2]) : 0;
  }

  function currentSnapshot(population, label) {
    const m = population.metrics;
    return { label, metrics:{ total:m.total, elderlyRate:m.elderlyRate, youthRate:m.youthRate, age0Rate:m.age0Rate, age7Rate:m.age7Rate, age13Rate:m.age13Rate, age16Rate:m.age16Rate } };
  }

  async function monthlySnapshot(url, targetName) {
    const response = await fetch(url, { cache:"no-store" });
    if (!response.ok) throw new Error(`스냅샷 HTTP ${response.status}`);
    const text = decodeFlexible(await response.arrayBuffer());
    let headers = null, period = "", male = [], female = [], result = null;
    parseCSV(text, row => {
      if (!headers) {
        headers = row.map((header,index) => index ? String(header ?? "").trim() : String(header ?? "").trim().replace(/^\uFEFF/, ""));
        headers.forEach((header,index) => {
          const match = header.match(/^(\d{4}년\d{1,2}월)_(남|여)_(\d+)세(?:\s*이상)?$/);
          if (!match) return;
          if (!period) period = match[1];
          const age = Math.min(Number(match[3]),100);
          (match[2] === "남" ? male : female).push({ index, age });
        });
        return;
      }
      if (result || !row.length || norm(clean(row[0])) !== norm(targetName)) return;
      const ageMale = Array(101).fill(0), ageFemale = Array(101).fill(0);
      male.forEach(column => ageMale[column.age] += num(row[column.index]));
      female.forEach(column => ageFemale[column.age] += num(row[column.index]));
      const population = { name:targetName, ageMale, ageFemale, male:ageMale.reduce((a,b) => a+b,0), female:ageFemale.reduce((a,b) => a+b,0) };
      population.total = population.male + population.female;
      population.metrics = metrics(population);
      result = currentSnapshot(population, period);
    });
    return result;
  }

  function totalsMetrics(ages) {
    const total = ages.reduce((a,b) => a+b,0);
    return { total, elderlyRate:pct(sum(ages,65,100),total), youthRate:pct(sum(ages,0,14),total), age0Rate:pct(ages[0] || 0,total), age7Rate:pct(ages[7] || 0,total), age13Rate:pct(ages[13] || 0,total), age16Rate:pct(ages[16] || 0,total) };
  }

  function meta() {
    const key = $("trendMetric").value;
    return {
      total:{ label:"총인구",unit:"명",delta:"명",value:item => item.metrics.total,format:value => numberFmt.format(Math.round(value)) },
      aging:{ label:"고령화율",unit:"%",delta:"%p",value:item => item.metrics.elderlyRate,format:value => rateFmt.format(value) },
      youth:{ label:"유소년 비율",unit:"%",delta:"%p",value:item => item.metrics.youthRate,format:value => rateFmt.format(value) },
      age0:{ label:"0세 비율",unit:"%",delta:"%p",value:item => item.metrics.age0Rate,format:value => rateFmt.format(value) },
      age7:{ label:"만 7세 비율",unit:"%",delta:"%p",value:item => item.metrics.age7Rate,format:value => rateFmt.format(value) },
      age13:{ label:"만 13세 비율",unit:"%",delta:"%p",value:item => item.metrics.age13Rate,format:value => rateFmt.format(value) },
      age16:{ label:"만 16세 비율",unit:"%",delta:"%p",value:item => item.metrics.age16Rate,format:value => rateFmt.format(value) }
    }[key];
  }

  function renderTrend() {
    syncFocus();
    if (!trendPoints.length || !window.Plotly) return;
    const m = meta(), x = trendPoints.map(item => item.label), y = trendPoints.map(m.value), formatted = y.map(m.format);
    Plotly.react($("trendChart"), [{ type:"scatter",mode:"lines+markers",x,y,customdata:formatted,line:{color:css("--primary"),width:3},marker:{size:8,color:css("--primary2")},hovertemplate:`<b>%{x}</b><br>${m.label}: %{customdata}${m.unit}<extra></extra>` }], {
      paper_bgcolor:"rgba(0,0,0,0)",plot_bgcolor:"rgba(0,0,0,0)",margin:{t:35,r:20,b:55,l:70},xaxis:{gridcolor:css("--grid"),tickfont:{color:css("--muted")}},yaxis:{title:`${m.label}(${m.unit})`,gridcolor:css("--grid"),tickfont:{color:css("--muted")}},font:{family:'Pretendard,"Noto Sans KR",sans-serif',color:css("--text")},hoverlabel:{bgcolor:css("--solid"),font:{color:css("--text")}}
    }, { displayModeBar:false,responsive:true });
    $("trendTable").innerHTML = `<thead><tr><th>시점</th><th>${m.label}</th><th>전 시점 대비</th></tr></thead><tbody>${trendPoints.map((item,index) => {
      const value = m.value(item), previous = index ? m.value(trendPoints[index - 1]) : null;
      const difference = previous === null ? "-" : `${value - previous > 0 ? "+" : ""}${m.format(value - previous)}${m.delta}`;
      return `<tr><th>${esc(item.label)}</th><td>${m.format(value)}${m.unit}</td><td>${difference}</td></tr>`;
    }).join("")}</tbody>`;
  }

  function setBusy(value) {
    busy = value;
    $("loadMonthlyTrend").disabled = value;
    $("loadYearlyTrend").disabled = value;
  }

  async function loadMonthly() {
    if (busy) return;
    const population = focusPop();
    if (!population) return;
    const requested = population.name;
    setBusy(true);
    $("trendProgress").textContent = "월별 보관본 목록을 확인하는 중입니다…";
    $("trendArchiveList").replaceChildren();
    try {
      const response = await fetch(ARCHIVE_API_URL, { cache:"no-store",headers:{Accept:"application/vnd.github+json"} });
      if (!response.ok) throw new Error(`보관본 목록 HTTP ${response.status}`);
      const entries = await response.json();
      const files = (Array.isArray(entries) ? entries : []).filter(entry => entry.type === "file" && /^population_\d{4}_\d{2}\.csv$/i.test(entry.name)).sort((a,b) => a.name.localeCompare(b.name)).slice(-5);
      files.forEach(file => {
        const chip = document.createElement("span");
        chip.className = "archive-chip";
        chip.textContent = file.name.replace("population_","").replace(".csv","").replace("_","-");
        $("trendArchiveList").appendChild(chip);
      });
      const points = [];
      for (let index = 0; index < files.length; index += 1) {
        if (focusPop()?.name !== requested) throw new Error("기준 지역이 변경되어 불러오기를 중단했습니다.");
        $("trendProgress").textContent = `월별 보관본 ${index + 1}/${files.length} 불러오는 중…`;
        const point = await monthlySnapshot(files[index].download_url || `https://raw.githubusercontent.com/greatsong/modudata/main/${files[index].path}`, requested);
        if (point) points.push(point);
      }
      const latest = currentSnapshot(population, dataPeriod || "최신");
      if (!points.some(point => order(point.label) === order(latest.label))) points.push(latest);
      trendPoints = points.sort((a,b) => order(a.label) - order(b.label));
      trendMode = "monthly"; trendFocus = requested;
      $("trendProgress").textContent = trendPoints.length ? `${trendPoints.length}개 시점의 월별 추이를 불러왔습니다.` : "해당 지역의 월별 보관본을 찾지 못했습니다.";
      renderTrend();
    } catch (error) {
      console.error(error);
      $("trendProgress").textContent = `월별 추이를 불러오지 못했습니다: ${error.message}`;
    } finally { setBusy(false); }
  }

  function yearlyMatch(row,indexes,targetName) {
    const candidate = clean([row[indexes.sido],row[indexes.sigungu],row[indexes.dong]].filter(value => String(value ?? "").trim()).join(" "));
    const target = norm(targetName), normalized = norm(candidate);
    return level(targetName) === "neighborhood" ? normalized === target : normalized === target || normalized.startsWith(`${target} `);
  }

  async function unzip(buffer) {
    if ("DecompressionStream" in window) {
      const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
      return new Response(stream).text();
    }
    if (!window.pako) throw new Error("gzip 해제 라이브러리를 불러오지 못했습니다.");
    return window.pako.ungzip(new Uint8Array(buffer), { to:"string" });
  }

  async function loadYearly() {
    if (busy) return;
    const population = focusPop();
    if (!population) return;
    const requested = population.name;
    setBusy(true);
    $("trendProgress").textContent = "연도별 gzip 시계열을 내려받는 중입니다. 파일이 커서 잠시 걸릴 수 있습니다…";
    $("trendArchiveList").replaceChildren();
    try {
      const response = await fetch(YEARLY_URL, { cache:"no-store" });
      if (!response.ok) throw new Error(`연도별 자료 HTTP ${response.status}`);
      const text = await unzip(await response.arrayBuffer());
      let headers = null,indexes = null,ageColumns = [];
      const byYear = new Map();
      parseCSV(text, row => {
        if (!headers) {
          headers = row.map((header,index) => index ? String(header ?? "").trim() : String(header ?? "").trim().replace(/^\uFEFF/,""));
          indexes = {year:headers.indexOf("연도"),sido:headers.indexOf("시도"),sigungu:headers.indexOf("시군구"),dong:headers.indexOf("동")};
          headers.forEach((header,index) => {
            const match = header.match(/^계_(\d+)세(?:\s*이상)?$/);
            if (match) ageColumns.push({index,age:Math.min(Number(match[1]),100)});
          });
          return;
        }
        if (!row.length || !yearlyMatch(row,indexes,requested)) return;
        const year = String(row[indexes.year] ?? "").trim();
        if (!year) return;
        if (!byYear.has(year)) byYear.set(year,Array(101).fill(0));
        const ages = byYear.get(year);
        ageColumns.forEach(column => ages[column.age] += num(row[column.index]));
      });
      if (focusPop()?.name !== requested) throw new Error("기준 지역이 변경되어 결과를 취소했습니다.");
      trendPoints = Array.from(byYear.entries()).map(([year,ages]) => ({label:`${year}년 6월`,metrics:totalsMetrics(ages)})).filter(item => item.metrics.total > 0).sort((a,b) => order(a.label) - order(b.label));
      trendMode = "yearly"; trendFocus = requested;
      $("trendProgress").textContent = trendPoints.length ? `${trendPoints.length}개 연도의 6월 추이를 불러왔습니다.` : "해당 지역의 연도별 자료를 찾지 못했습니다. 행정구역 신설·통폐합 가능성을 확인하세요.";
      renderTrend();
    } catch (error) {
      console.error(error);
      $("trendProgress").textContent = `연도별 추이를 불러오지 못했습니다: ${error.message}`;
    } finally { setBusy(false); }
  }

  $("loadMonthlyTrend").addEventListener("click",loadMonthly);
  $("loadYearlyTrend").addEventListener("click",loadYearly);
  $("trendMetric").addEventListener("change",renderTrend);
  window.addEventListener("resize",() => { if (trendPoints.length && window.Plotly) Plotly.Plots.resize($("trendChart")); });
})();