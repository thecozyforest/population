(() => {
  "use strict";

  const style = document.createElement("style");
  style.textContent = `
    .hero-definition{margin-top:14px;padding:12px 14px;border-left:4px solid var(--primary);border-radius:12px;background:var(--psoft);color:var(--text);font-size:12px;font-weight:700;line-height:1.7}
    .guide-hero{padding:18px;border:1px solid var(--border);border-radius:19px;background:linear-gradient(140deg,var(--solid),var(--soft))}.guide-hero h3{margin:0;font-size:18px}.guide-hero p{margin:8px 0 0;color:var(--muted);font-size:11px;line-height:1.75}
    .guide-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.guide-card{padding:15px;border:1px solid var(--border);border-radius:17px;background:var(--solid)}.guide-card h3{margin:0 0 8px;font-size:13px}.guide-card p,.guide-card li{color:var(--muted);font-size:10px;font-weight:650;line-height:1.72}.guide-card ul,.guide-card ol{margin:0;padding-left:18px}
    .intro-copy-box{margin-top:12px;padding:15px;border-left:4px solid var(--primary);border-radius:13px;background:var(--psoft);color:var(--text);font-size:11px;font-weight:700;line-height:1.75}
    .guide-actions,.guide-source-links{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.guide-action{min-height:38px;padding:0 12px;border:1px solid var(--border2);border-radius:999px;background:var(--solid);color:var(--muted);font-size:10px;font-weight:900}.guide-action.primary{border-color:var(--primary);background:var(--primary);color:#fff}.guide-action:hover{background:var(--hover);color:var(--text)}
    .guide-source-links a{padding:6px 8px;border:1px solid var(--border);border-radius:999px;background:var(--solid);color:var(--primary2);font-size:9px;font-weight:850;text-decoration:none}
    @media(max-width:1000px){.guide-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:720px){.guide-grid{grid-template-columns:1fr}.guide-action{width:100%}}
  `;
  document.head.appendChild(style);

  const heroCopy = document.querySelector(".hero-copy");
  if (heroCopy) {
    heroCopy.textContent = "전국 행정구역의 연령·성별 인구를 지도와 인구 피라미드로 비교하고, 지역의 인구구조와 생활권 특성을 탐구하는 데이터 대시보드입니다. 최대 5개 지역을 비교하고 그중 두 지역은 정밀 분석할 수 있습니다.";
    const definition = document.createElement("div");
    definition.className = "hero-definition";
    definition.innerHTML = "<strong>이 도구의 성격:</strong> 단순 인구 조회기를 넘어 지역 차이를 발견하고 가설을 세우는 탐구 도구입니다. 부동산 가격이나 투자수익을 예측하는 프로그램은 아닙니다.";
    heroCopy.after(definition);
  }

  const tabs = document.querySelector(".tabs");
  const dashboard = $("dashboard");
  if (!tabs || !dashboard || $("panel-guide")) return;

  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "tab";
  tab.dataset.tab = "guide";
  tab.textContent = "ℹ️ 사용설명서";
  tabs.appendChild(tab);

  const panel = document.createElement("div");
  panel.id = "panel-guide";
  panel.className = "panel";
  panel.innerHTML = `
    <section class="card">
      <header class="section-head"><div><h2 class="section-title">간단 사용설명서</h2><p class="section-copy">처음 사용하는 사람은 이 탭만 읽고 시작해도 됩니다.</p></div><span class="badge">독립형 웹 대시보드</span></header>
      <div class="guide-hero"><h3>이 도구는 무엇인가요?</h3><p>전국 행정구역의 주민등록 연령·성별 인구를 지도, 표, 인구 피라미드로 비교하는 지역 탐구 도구입니다. 지역의 생활권 특성을 관찰하고 수업 탐구나 임장 전 확인 질문을 만들 수 있습니다.</p></div>
      <div class="guide-grid">
        <article class="guide-card"><h3>1. 기본 사용 순서</h3><ol><li>검색창에서 지역을 최대 5곳 추가합니다.</li><li>☆을 눌러 기준 지역을 정합니다.</li><li>한눈에 보기에서 핵심 지표를 봅니다.</li><li>지도·비교·추이 탭에서 패턴을 확인합니다.</li><li>목적에 따라 수업 탐구 또는 임장 체크를 활용합니다.</li></ol></article>
        <article class="guide-card"><h3>2. 탭별 기능</h3><ul><li><strong>한눈에 보기:</strong> 기준 지역과 5곳 빠른 비교</li><li><strong>전국 지도:</strong> 연령 비율의 전국 분포·순위</li><li><strong>지역 비교:</strong> 5곳 표 + 2곳 피라미드</li><li><strong>변화 추이:</strong> 최근 월별·2015~ 연도별 변화</li><li><strong>수업 탐구:</strong> 교육과정 연계·심화탐구</li><li><strong>임장 체크:</strong> 생활권 가설·현장 확인 항목</li></ul></article>
        <article class="guide-card"><h3>3. 데이터를 정확히 읽는 법</h3><ul><li>0세 비율은 출생률이 아닙니다.</li><li>7·13·16세 비율은 실제 입학생 수와 다를 수 있습니다.</li><li>비율과 절대 인구를 함께 봅니다.</li><li>상관관계를 원인으로 단정하지 않습니다.</li><li>한 시점 자료와 변화 추이를 구분합니다.</li></ul></article>
        <article class="guide-card"><h3>4. 데이터는 언제 최신화되나요?</h3><p>원자료 저장소의 <code>population_latest.csv</code>는 매월 1일 지난달 자료로 교체되고 실패하면 2일 재시도하도록 구성돼 있습니다. 이 페이지는 접속할 때 해당 파일을 캐시 없이 읽습니다.</p></article>
        <article class="guide-card"><h3>5. 과거 자료는 남나요?</h3><p>월별 스냅샷은 <code>data/archive/</code>에 보관되고, <code>population_yearly.csv.gz</code>에는 2015년부터 매년 6월 자료가 누적됩니다. 변화 추이 탭에서 필요할 때 불러옵니다.</p></article>
        <article class="guide-card"><h3>6. 무엇을 할 수 없나요?</h3><p>미래 인구, 출생률, 주택가격, 투자수익을 예측하지 않습니다. 실거래가·전입전출·세대수·주택 공급·교통·학교 자료와 교차 검증해야 합니다.</p></article>
      </div>
      <div id="guideIntroText" class="intro-copy-box">전국 행정구역의 연령·성별 인구를 지도와 인구 피라미드로 비교하고, 지역의 인구구조와 생활권 특성을 탐구할 수 있는 데이터 대시보드입니다. 최대 5개 지역 비교, 연령별 전국 지도, 변화 추이, 쌍둥이 동네 탐색, 수업 탐구와 임장 체크 기능을 제공합니다.</div>
      <div class="guide-actions"><button id="guideCopyIntro" class="guide-action primary" type="button">소개 문구 복사</button><button id="guideReloadData" class="guide-action" type="button">최신 데이터로 새로고침</button></div>
      <div class="notice"><strong>필수 주의 문구:</strong> 이 도구는 최신 한 시점의 주민등록 인구와 저장소에 보관된 과거 스냅샷을 사용합니다. 인구 증감, 출생률, 전입·전출, 가구 수 변화, 주택가격이나 투자 가치를 직접 보여 주거나 예측하지 않습니다.</div>
      <div class="guide-source-links"><a href="https://github.com/greatsong/modudata" target="_blank" rel="noopener">원자료 저장소</a><a href="https://github.com/greatsong/modudata/tree/main/data/archive" target="_blank" rel="noopener">월별 보관본</a><a href="https://jumin.mois.go.kr/" target="_blank" rel="noopener">행정안전부 주민등록 인구통계</a></div>
    </section>`;
  dashboard.appendChild(panel);

  tab.addEventListener("click", () => activateTab("guide"));
  $("guideCopyIntro").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("guideIntroText").textContent.trim());
      $("guideCopyIntro").textContent = "복사 완료";
      setTimeout(() => $("guideCopyIntro").textContent = "소개 문구 복사", 1400);
    } catch (_) {
      $("guideCopyIntro").textContent = "복사 실패";
    }
  });
  $("guideReloadData").addEventListener("click", () => location.reload());
})();