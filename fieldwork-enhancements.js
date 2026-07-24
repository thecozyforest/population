(() => {
  "use strict";

  const style = document.createElement("style");
  style.textContent = `
    #fieldSignals{display:block}
    .fw-toolbar{display:flex;flex-wrap:wrap;align-items:end;justify-content:space-between;gap:10px;margin-bottom:12px;padding:13px;border:1px solid var(--border);border-radius:17px;background:var(--soft)}
    .fw-toolbar-left,.fw-toolbar-actions{display:flex;flex-wrap:wrap;align-items:end;gap:8px}.fw-control{display:grid;gap:5px}.fw-control label{color:var(--muted);font-size:10px;font-weight:900}.fw-select{height:40px;max-width:min(460px,80vw);padding:0 34px 0 11px;border:1px solid var(--border2);border-radius:11px;background:var(--solid);color:var(--text);font-size:11px;font-weight:800}
    .fw-action{min-height:38px;padding:0 12px;border:1px solid var(--border2);border-radius:999px;background:var(--solid);color:var(--muted);font-size:10px;font-weight:900}.fw-action.primary{border-color:var(--primary);background:var(--primary);color:#fff}.fw-action:hover{background:var(--hover);color:var(--text)}
    .fw-period{padding:7px 10px;border:1px solid var(--border);border-radius:999px;background:var(--solid);color:var(--muted);font-size:10px;font-weight:850}
    .fw-data-title{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin:4px 0 9px}.fw-data-title h3{margin:0;font-size:16px}.fw-data-title p{margin:0;color:var(--muted);font-size:10px;font-weight:700}
    .fw-data-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:13px}.fw-data-card{padding:12px;border:1px solid var(--border);border-radius:14px;background:var(--solid)}.fw-data-card span{display:block;color:var(--muted);font-size:9px;font-weight:850}.fw-data-card strong{display:block;margin-top:6px;font-size:15px;letter-spacing:-.03em}.fw-data-card small{display:block;margin-top:4px;color:var(--muted);font-size:8px;line-height:1.45}
    .fw-hypothesis-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.fw-hypothesis{padding:15px;border:1px solid var(--border);border-radius:18px;background:var(--solid)}.fw-hypothesis-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.fw-hypothesis h3{margin:0;font-size:14px}.fw-status{height:34px;max-width:145px;padding:0 26px 0 8px;border:1px solid var(--border2);border-radius:9px;background:var(--soft);color:var(--text);font-size:9px;font-weight:850}.fw-evidence{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.fw-evidence-chip{padding:7px 8px;border-radius:10px;background:var(--soft);font-size:9px;font-weight:850;line-height:1.5}.fw-evidence-chip em{display:block;color:var(--muted);font-style:normal;font-size:8px}.fw-hypothesis-text{margin:0 0 10px;padding:10px;border-left:3px solid var(--primary);border-radius:10px;background:var(--psoft);color:var(--text);font-size:10px;font-weight:700;line-height:1.65}
    .fw-checks{display:grid;gap:6px}.fw-check{display:flex;align-items:flex-start;gap:7px;padding:7px 8px;border:1px solid var(--border);border-radius:10px;background:var(--soft);color:var(--muted);font-size:9px;font-weight:700;line-height:1.5}.fw-check input{margin-top:2px;accent-color:var(--primary)}
    .fw-note{width:100%;min-height:72px;margin-top:9px;padding:9px;border:1px solid var(--border2);border-radius:10px;background:var(--solid);color:var(--text);font-size:10px;resize:vertical}.fw-save-note{min-height:18px;margin:7px 1px 0;color:var(--muted);font-size:9px;font-weight:700}
    @media(max-width:1050px){.fw-data-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:760px){.fw-toolbar{align-items:stretch}.fw-toolbar-left,.fw-toolbar-actions{width:100%}.fw-control,.fw-select,.fw-action{width:100%;max-width:none}.fw-data-grid,.fw-hypothesis-grid{grid-template-columns:1fr 1fr}}
    @media(max-width:520px){.fw-data-grid,.fw-hypothesis-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const originalRenderFieldwork = renderFieldwork;

  const HYPOTHESES = [
    {
      id: "family",
      title: "영유아·가족 생활권",
      evidence: [
        { label: "0~6세", metric: "infantRate", range: [0, 6] },
        { label: "25~44세", metric: "familyRate", range: [25, 44] }
      ],
      high: "영유아와 가구 형성 연령층이 같은 행정단위 중 높은 편입니다. 가족형 생활서비스 수요가 실제로 나타나는지 우선 확인할 가치가 있습니다.",
      middle: "영유아와 가구 형성 연령층이 중간권입니다. 숫자 자체보다 최근 입주·전입과 생활서비스 접근성을 함께 확인해야 합니다.",
      low: "영유아 또는 가구 형성 연령층이 낮은 편입니다. 수요 부족을 단정하지 말고 인접 생활권 이용과 유동인구를 확인하세요.",
      checks: ["어린이집·유치원 위치와 실제 대기 여부", "소아청소년과·공원·보행환경", "가족형 주택 재고와 최근 입주 시기", "25~44세 전입·전출 및 세대수 변화"]
    },
    {
      id: "school",
      title: "학령인구·통학 생활권",
      evidence: [
        { label: "만 7세", metric: "age7Rate", range: [7, 7] },
        { label: "만 13세", metric: "age13Rate", range: [13, 13] },
        { label: "만 16세", metric: "age16Rate", range: [16, 16] }
      ],
      high: "입학 연령대 비율이 같은 행정단위 중 높은 편입니다. 학교 수용력과 통학환경이 실제 수요를 감당하는지 확인하세요.",
      middle: "입학 연령대 비율이 중간권입니다. 학교별 학생 수 변화와 인접 학군 이동을 함께 봐야 합니다.",
      low: "입학 연령대 비율이 낮은 편입니다. 학교 수요 감소를 단정하지 말고 전입·입주 예정과 학교 선택 이동을 확인하세요.",
      checks: ["학교알리미 학생 수·학급 수 변화", "실제 통학로·횡단보도·경사·거리", "학원가와 방과후 생활 동선", "입주 예정 단지와 학교 배정 변화"]
    },
    {
      id: "young",
      title: "청년·직장 생활권",
      evidence: [
        { label: "20~39세", metric: "youngRate", range: [20, 39] }
      ],
      high: "20~39세 비율이 같은 행정단위 중 높은 편입니다. 직장 접근성과 임대·생활서비스가 실제 거주 선택을 뒷받침하는지 확인하세요.",
      middle: "청년층 비율이 중간권입니다. 상주인구와 직장·대학 유동인구를 구분해 확인해야 합니다.",
      low: "청년층 비율이 낮은 편입니다. 단순 쇠퇴로 해석하지 말고 주거비·직장 접근·주택 유형의 제약을 확인하세요.",
      checks: ["역·버스·업무지까지 실제 소요시간", "원룸·소형주택·임대주택 구성", "저녁·주말 상권의 실제 이용 모습", "20~39세 전입·전출과 직장·대학 유동인구"]
    },
    {
      id: "senior",
      title: "고령·돌봄 생활권",
      evidence: [
        { label: "65세 이상", metric: "elderlyRate", range: [65, 100] },
        { label: "75세 이상", metric: "careRate", range: [75, 100] }
      ],
      high: "고령층과 후기고령층 비율이 높은 편입니다. 의료·교통·보행·주거 편의가 실제 생활을 지원하는지 확인해야 합니다.",
      middle: "고령층 비율이 중간권입니다. 절대 인구와 노후 주택 분포를 함께 봐야 서비스 수요를 가늠할 수 있습니다.",
      low: "고령층 비율이 낮은 편입니다. 고령친화 수요가 없다고 단정하지 말고 절대 인구와 인접 의료권을 확인하세요.",
      checks: ["병원·약국·복지관 접근성과 대기", "경사·보도 상태·대중교통 배차", "엘리베이터·무장애 출입 등 주거 편의", "75세 이상 추이와 돌봄시설·재가서비스"]
    },
    {
      id: "newborn",
      title: "0세 거주·신규 입주 단서",
      evidence: [
        { label: "0세", metric: "age0Rate", range: [0, 0] },
        { label: "1~4세", metric: null, range: [1, 4] }
      ],
      high: "0세와 어린 연령층 비율이 높은 편입니다. 출생률로 단정하지 말고 신규 입주와 영유아 가구 전입의 영향을 확인하세요.",
      middle: "0세 비율이 중간권입니다. 출생과 전입을 구분하려면 최근 월별 인구와 출생 통계가 필요합니다.",
      low: "0세 비율이 낮은 편입니다. 출산 감소만으로 설명하지 말고 주택 유형·전입·행정구역 규모를 함께 확인하세요.",
      checks: ["행정안전부 출생아 수와 0세 거주인구 구분", "최근 대단지 입주·재개발 입주 시기", "0~4세 월별 변화와 영유아 가구 전입", "어린이집 정원·대기와 소아의료 접근성"]
    }
  ];

  function ageCount(pop, start, end) {
    return sum(pop.ageMale, start, end) + sum(pop.ageFemale, start, end);
  }

  function metricValue(pop, evidence) {
    const count = ageCount(pop, evidence.range[0], evidence.range[1]);
    const rate = evidence.metric ? pop.metrics[evidence.metric] : pct(count, pop.total);
    return { count, rate };
  }

  function sameLevelRates(pop, evidence) {
    const targetLevel = level(pop.name);
    return [...regionMap.values()]
      .filter(item => item.total > 0 && level(item.name) === targetLevel)
      .map(item => metricValue(item, evidence).rate)
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
  }

  function percentile(pop, evidence, value) {
    const values = sameLevelRates(pop, evidence);
    if (!values.length) return 50;
    let atOrBelow = 0;
    values.forEach(item => { if (item <= value) atOrBelow += 1; });
    return atOrBelow / values.length * 100;
  }

  function relativeLabel(percentileValue) {
    if (percentileValue >= 50) return `같은 단위 상위 ${Math.max(1, Math.round(100 - percentileValue))}%`;
    return `같은 단위 하위 ${Math.max(1, Math.round(percentileValue))}%`;
  }

  function hypothesisBand(percentiles) {
    const average = percentiles.reduce((a, b) => a + b, 0) / Math.max(percentiles.length, 1);
    if (average >= 72) return "high";
    if (average <= 28) return "low";
    return "middle";
  }

  function storageKey(regionName) {
    return `population-fieldwork-check-v2:${regionName}`;
  }

  function readState(regionName) {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey(regionName)) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeState(regionName, state) {
    try { localStorage.setItem(storageKey(regionName), JSON.stringify(state)); } catch (_) {}
  }

  function snapshotItems(pop) {
    const items = [
      ["총인구", numberFmt.format(pop.total) + "명", "주민등록 총인구"],
      ["0세", `${numberFmt.format(ageCount(pop, 0, 0))}명 · ${rateFmt.format(pop.metrics.age0Rate)}%`, "출생률이 아닌 현재 거주인구"],
      ["0~6세", `${numberFmt.format(ageCount(pop, 0, 6))}명 · ${rateFmt.format(pop.metrics.infantRate)}%`, "영유아 생활권 단서"],
      ["만 7세", `${numberFmt.format(ageCount(pop, 7, 7))}명 · ${rateFmt.format(pop.metrics.age7Rate)}%`, "초등 입학 연령 단서"],
      ["만 13세", `${numberFmt.format(ageCount(pop, 13, 13))}명 · ${rateFmt.format(pop.metrics.age13Rate)}%`, "중학교 입학 연령 단서"],
      ["만 16세", `${numberFmt.format(ageCount(pop, 16, 16))}명 · ${rateFmt.format(pop.metrics.age16Rate)}%`, "고등학교 입학 연령 단서"],
      ["20~39세", `${numberFmt.format(ageCount(pop, 20, 39))}명 · ${rateFmt.format(pop.metrics.youngRate)}%`, "청년·직장 생활권 단서"],
      ["25~44세", `${numberFmt.format(ageCount(pop, 25, 44))}명 · ${rateFmt.format(pop.metrics.familyRate)}%`, "가구 형성 연령층 단서"],
      ["65세 이상", `${numberFmt.format(ageCount(pop, 65, 100))}명 · ${rateFmt.format(pop.metrics.elderlyRate)}%`, "고령 생활권 단서"],
      ["75세 이상", `${numberFmt.format(ageCount(pop, 75, 100))}명 · ${rateFmt.format(pop.metrics.careRate)}%`, "돌봄 수요 단서"]
    ];
    return items;
  }

  function stateText(status) {
    return ({unreviewed:"확인 전",field:"현장 확인 필요",keep:"가설 유지",counter:"반례 발견",hold:"판단 보류"})[status] || "확인 전";
  }

  function makeCopyText(pop, state) {
    const lines = [`[${pop.name} 임장 체크]`, `자료 시점: ${dataPeriod || "확인 중"}`, "", "■ 실제 인구 데이터"];
    snapshotItems(pop).forEach(item => lines.push(`- ${item[0]}: ${item[1]}`));
    lines.push("", "■ 가설별 확인");
    HYPOTHESES.forEach(def => {
      const saved = state[def.id] || {};
      lines.push(`\n[${def.title}] ${stateText(saved.status)}`);
      def.checks.forEach((check, index) => lines.push(`${saved.checks?.[index] ? "☑" : "☐"} ${check}`));
      if (saved.note) lines.push(`메모: ${saved.note}`);
    });
    lines.push("", "※ 인구구조는 현장 확인을 위한 단서이며 가격·투자수익을 예측하지 않습니다.");
    return lines.join("\n");
  }

  function enhancedRenderFieldwork() {
    const pop = focusPop();
    const box = $("fieldSignals");
    if (!pop || !box) {
      originalRenderFieldwork();
      return;
    }

    const state = readState(pop.name);
    box.replaceChildren();

    const toolbar = document.createElement("div");
    toolbar.className = "fw-toolbar";
    toolbar.innerHTML = `
      <div class="fw-toolbar-left">
        <div class="fw-control"><label for="fwRegionSelect">임장 체크 지역</label><select id="fwRegionSelect" class="fw-select">${selectedNames.map(name => `<option value="${esc(name)}"${name === pop.name ? " selected" : ""}>${esc(name)}</option>`).join("")}</select></div>
        <span class="fw-period">${esc(dataPeriod || "자료 시점 확인 중")}</span>
        <span class="fw-period">${level(pop.name) === "neighborhood" ? "읍·면·동" : level(pop.name) === "province" ? "시·도" : "시·군·구"} 비교</span>
      </div>
      <div class="fw-toolbar-actions"><button id="fwCopy" class="fw-action primary" type="button">체크 결과 복사</button><button id="fwReset" class="fw-action" type="button">이 지역 체크 초기화</button></div>`;
    box.appendChild(toolbar);

    const title = document.createElement("div");
    title.className = "fw-data-title";
    title.innerHTML = `<h3>${esc(pop.name)} 실제 인구 단서</h3><p>비율과 절대 인구를 함께 확인하세요.</p>`;
    box.appendChild(title);

    const dataGrid = document.createElement("div");
    dataGrid.className = "fw-data-grid";
    dataGrid.innerHTML = snapshotItems(pop).map(item => `<article class="fw-data-card"><span>${item[0]}</span><strong>${item[1]}</strong><small>${item[2]}</small></article>`).join("");
    box.appendChild(dataGrid);

    const grid = document.createElement("div");
    grid.className = "fw-hypothesis-grid";
    HYPOTHESES.forEach(def => {
      const saved = state[def.id] || { status:"unreviewed", checks:{}, note:"" };
      const values = def.evidence.map(evidence => {
        const value = metricValue(pop, evidence);
        const rank = percentile(pop, evidence, value.rate);
        return { evidence, ...value, rank };
      });
      const band = hypothesisBand(values.map(value => value.rank));
      const card = document.createElement("article");
      card.className = "fw-hypothesis";
      card.dataset.hypothesisId = def.id;
      card.innerHTML = `
        <div class="fw-hypothesis-head"><h3>${def.title}</h3><select class="fw-status" aria-label="${def.title} 상태"><option value="unreviewed"${saved.status === "unreviewed" ? " selected" : ""}>확인 전</option><option value="field"${saved.status === "field" ? " selected" : ""}>현장 확인 필요</option><option value="keep"${saved.status === "keep" ? " selected" : ""}>가설 유지</option><option value="counter"${saved.status === "counter" ? " selected" : ""}>반례 발견</option><option value="hold"${saved.status === "hold" ? " selected" : ""}>판단 보류</option></select></div>
        <div class="fw-evidence">${values.map(value => `<span class="fw-evidence-chip">${value.evidence.label} ${numberFmt.format(value.count)}명 · ${rateFmt.format(value.rate)}%<em>${relativeLabel(value.rank)}</em></span>`).join("")}</div>
        <p class="fw-hypothesis-text">${def[band]}</p>
        <div class="fw-checks">${def.checks.map((check, index) => `<label class="fw-check"><input type="checkbox" data-check-index="${index}"${saved.checks?.[index] ? " checked" : ""}><span>${check}</span></label>`).join("")}</div>
        <textarea class="fw-note" placeholder="이 가설의 현장 관찰·반례·추가 확인 사항을 기록하세요.">${esc(saved.note || "")}</textarea>`;
      grid.appendChild(card);
    });
    box.appendChild(grid);

    const saveNote = document.createElement("p");
    saveNote.className = "fw-save-note";
    saveNote.textContent = "체크 상태와 가설별 메모는 이 브라우저에 지역별로 자동 저장됩니다.";
    box.appendChild(saveNote);

    $("fwRegionSelect").addEventListener("change", event => setFocus(event.target.value));
    $("fwCopy").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(makeCopyText(pop, readState(pop.name)));
        $("fwCopy").textContent = "복사 완료";
        setTimeout(() => { if ($("fwCopy")) $("fwCopy").textContent = "체크 결과 복사"; }, 1400);
      } catch (_) {
        $("fwCopy").textContent = "복사 실패";
      }
    });
    $("fwReset").addEventListener("click", () => {
      if (!confirm(`${pop.name}의 임장 체크 상태와 가설별 메모를 초기화할까요?`)) return;
      try { localStorage.removeItem(storageKey(pop.name)); } catch (_) {}
      enhancedRenderFieldwork();
    });

    grid.querySelectorAll(".fw-hypothesis").forEach(card => {
      const id = card.dataset.hypothesisId;
      const ensure = () => {
        const latest = readState(pop.name);
        if (!latest[id]) latest[id] = { status:"unreviewed", checks:{}, note:"" };
        return latest;
      };
      card.querySelector(".fw-status").addEventListener("change", event => {
        const latest = ensure();
        latest[id].status = event.target.value;
        writeState(pop.name, latest);
      });
      card.querySelectorAll("input[data-check-index]").forEach(input => input.addEventListener("change", event => {
        const latest = ensure();
        latest[id].checks = latest[id].checks || {};
        latest[id].checks[event.target.dataset.checkIndex] = event.target.checked;
        writeState(pop.name, latest);
      }));
      card.querySelector(".fw-note").addEventListener("input", event => {
        const latest = ensure();
        latest[id].note = event.target.value;
        writeState(pop.name, latest);
      });
    });

    const general = focusPop();
    if (general) {
      $("notesLabel").textContent = `${general.name} · 전체 임장 메모 자동 저장`;
      const key = `population-field-note:${general.name}`;
      try { $("fieldNotes").value = localStorage.getItem(key) || ""; } catch (_) { $("fieldNotes").value = ""; }
      $("fieldNotes").oninput = () => { try { localStorage.setItem(key, $("fieldNotes").value); } catch (_) {} };
    }
  }

  renderFieldwork = enhancedRenderFieldwork;
  if (regionMap.size && !$('dashboard').hidden) enhancedRenderFieldwork();
})();