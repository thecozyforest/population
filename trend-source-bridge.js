(() => {
  "use strict";

  const YEARLY_URL = "https://raw.githubusercontent.com/greatsong/modudata/main/data/population_yearly.csv.gz";
  const ARCHIVE_API_URL = "https://api.github.com/repos/greatsong/modudata/contents/data/archive?ref=main";
  const labelOf = pop => window.populationRecordLabel?.(pop) || pop?.name || "";
  const idOf = pop => window.populationRecordId?.(pop) || pop?.id || pop?.code || pop?.name || "";
  let points = [], mode = "", focusId = "", busy = false;

  function replaceControl(id) {
    const old = $(id);
    if (!old) return null;
    const fresh = old.cloneNode(true);
    old.replaceWith(fresh);
    return fresh;
  }

  const monthlyButton = replaceControl("loadMonthlyTrend");
  const yearlyButton = replaceControl("loadYearlyTrend");
  const metricSelect = replaceControl("trendMetric");
  if (!monthlyButton || !yearlyButton || !metricSelect) return;

  function decodeFlexible(buffer) {
    try {
      const utf8 = new TextDecoder("utf-8", { fatal:true }).decode(buffer);
      if (/_(남|여)_\d+세/.test(utf8) || /^연도,/m.test(utf8)) return utf8;
    } catch (_) {}
    return new TextDecoder("euc-kr").decode(buffer);
  }

  const codeFrom = value => (String(value ?? "").match(/\((\d{8,12})\)\s*$/)?.[1] || String(value ?? "").replace(/\D/g, ""));
  const order = label => { const match=String(label).match(/(\d{4})\D+(\d{1,2})/); return match?Number(match[1])*100+Number(match[2]):0; };

  function hierarchy(code) {
    if (/^\d{2}0{8}$/.test(code)) return {type:"province",prefix:code.slice(0,2)};
    if (/^\d{5}0{5}$/.test(code)) return {type:"district",prefix:code.slice(0,5)};
    return {type:"unit",prefix:code};
  }

  function currentSnapshot(pop,label) {
    const m=pop.metrics;
    return {label,metrics:{total:m.total,elderlyRate:m.elderlyRate,youthRate:m.youthRate,age0Rate:m.age0Rate,age7Rate:m.age7Rate,age13Rate:m.age13Rate,age16Rate:m.age16Rate}};
  }

  async function monthlySnapshot(url,target) {
    const response=await fetch(url,{cache:"no-store"});
    if(!response.ok)throw new Error(`스냅샷 HTTP ${response.status}`);
    const text=decodeFlexible(await response.arrayBuffer());
    let headers=null,period="",male=[],female=[],result=null;
    parseCSV(text,row=>{
      if(!headers){
        headers=row.map((header,index)=>index?String(header??"").trim():String(header??"").trim().replace(/^\uFEFF/,""));
        headers.forEach((header,index)=>{const match=header.match(/^(\d{4}년\d{1,2}월)_(남|여)_(\d+)세(?:\s*이상)?$/);if(!match)return;if(!period)period=match[1];const age=Math.min(Number(match[3]),100);(match[2]==="남"?male:female).push({index,age})});
        return;
      }
      if(result||!row.length||codeFrom(row[0])!==target.code)return;
      const ageMale=Array(101).fill(0),ageFemale=Array(101).fill(0);
      male.forEach(column=>ageMale[column.age]+=num(row[column.index]));
      female.forEach(column=>ageFemale[column.age]+=num(row[column.index]));
      const pop={ageMale,ageFemale,male:ageMale.reduce((a,b)=>a+b,0),female:ageFemale.reduce((a,b)=>a+b,0)};
      pop.total=pop.male+pop.female;pop.metrics=metrics(pop);result=currentSnapshot(pop,period);
    });
    return result;
  }

  function totalsMetrics(ages){const total=ages.reduce((a,b)=>a+b,0);return{total,elderlyRate:pct(sum(ages,65,100),total),youthRate:pct(sum(ages,0,14),total),age0Rate:pct(ages[0]||0,total),age7Rate:pct(ages[7]||0,total),age13Rate:pct(ages[13]||0,total),age16Rate:pct(ages[16]||0,total)}}

  function meta(){const key=$("trendMetric").value;return{total:{label:"총인구",unit:"명",delta:"명",value:item=>item.metrics.total,format:value=>numberFmt.format(Math.round(value))},aging:{label:"고령화율",unit:"%",delta:"%p",value:item=>item.metrics.elderlyRate,format:value=>rateFmt.format(value)},youth:{label:"유소년 비율",unit:"%",delta:"%p",value:item=>item.metrics.youthRate,format:value=>rateFmt.format(value)},age0:{label:"0세 비율",unit:"%",delta:"%p",value:item=>item.metrics.age0Rate,format:value=>rateFmt.format(value)},age7:{label:"만 7세 비율",unit:"%",delta:"%p",value:item=>item.metrics.age7Rate,format:value=>rateFmt.format(value)},age13:{label:"만 13세 비율",unit:"%",delta:"%p",value:item=>item.metrics.age13Rate,format:value=>rateFmt.format(value)},age16:{label:"만 16세 비율",unit:"%",delta:"%p",value:item=>item.metrics.age16Rate,format:value=>rateFmt.format(value)}}[key]}

  function syncFocus(){const pop=focusPop();if(!pop)return;const id=idOf(pop);if(focusId&&focusId!==id){points=[];mode="";$("trendArchiveList").replaceChildren();$("trendTable").innerHTML="";if(window.Plotly)Plotly.purge($("trendChart"));$("trendProgress").textContent="기준 원본 행이 바뀌었습니다. 추이를 다시 불러와 주세요."}focusId=id;$("trendRegionLabel").textContent=`${labelOf(pop)} · ${mode==="monthly"?"최근 월별 스냅샷":mode==="yearly"?"매년 6월 시계열":"과거 자료를 불러와 주세요"}`}

  function render(){syncFocus();if(!points.length||!window.Plotly)return;const m=meta(),x=points.map(item=>item.label),y=points.map(m.value),formatted=y.map(m.format);Plotly.react($("trendChart"),[{type:"scatter",mode:"lines+markers",x,y,customdata:formatted,line:{color:css("--primary"),width:3},marker:{size:8,color:css("--primary2")},hovertemplate:`<b>%{x}</b><br>${m.label}: %{customdata}${m.unit}<extra></extra>`}],{paper_bgcolor:"rgba(0,0,0,0)",plot_bgcolor:"rgba(0,0,0,0)",margin:{t:35,r:20,b:55,l:70},xaxis:{gridcolor:css("--grid"),tickfont:{color:css("--muted")}},yaxis:{title:`${m.label}(${m.unit})`,gridcolor:css("--grid"),tickfont:{color:css("--muted")}},font:{family:'Pretendard,"Noto Sans KR",sans-serif',color:css("--text")},hoverlabel:{bgcolor:css("--solid"),font:{color:css("--text")}}},{displayModeBar:false,responsive:true});$("trendTable").innerHTML=`<thead><tr><th>시점</th><th>${m.label}</th><th>전 시점 대비</th></tr></thead><tbody>${points.map((item,index)=>{const value=m.value(item),previous=index?m.value(points[index-1]):null,difference=previous===null?"-":`${value-previous>0?"+":""}${m.format(value-previous)}${m.delta}`;return`<tr><th>${esc(item.label)}</th><td>${m.format(value)}${m.unit}</td><td>${difference}</td></tr>`}).join("")}</tbody>`}

  function setBusy(value){busy=value;monthlyButton.disabled=value;yearlyButton.disabled=value}

  async function loadMonthly(){if(busy)return;const pop=focusPop();if(!pop)return;const requested=idOf(pop);setBusy(true);$("trendProgress").textContent="월별 보관본 목록을 확인하는 중입니다…";$("trendArchiveList").replaceChildren();try{const response=await fetch(ARCHIVE_API_URL,{cache:"no-store",headers:{Accept:"application/vnd.github+json"}});if(!response.ok)throw new Error(`보관본 목록 HTTP ${response.status}`);const entries=await response.json();const files=(Array.isArray(entries)?entries:[]).filter(entry=>entry.type==="file"&&/^population_\d{4}_\d{2}\.csv$/i.test(entry.name)).sort((a,b)=>a.name.localeCompare(b.name)).slice(-5);files.forEach(file=>{const chip=document.createElement("span");chip.className="archive-chip";chip.textContent=file.name.replace("population_","").replace(".csv","").replace("_","-");$("trendArchiveList").appendChild(chip)});const loaded=[];for(let index=0;index<files.length;index++){if(idOf(focusPop())!==requested)throw new Error("기준 행이 변경되어 불러오기를 중단했습니다.");$("trendProgress").textContent=`월별 보관본 ${index+1}/${files.length} 불러오는 중…`;const point=await monthlySnapshot(files[index].download_url||`https://raw.githubusercontent.com/greatsong/modudata/main/${files[index].path}`,pop);if(point)loaded.push(point)}const latest=currentSnapshot(pop,dataPeriod||"최신");if(!loaded.some(point=>order(point.label)===order(latest.label)))loaded.push(latest);points=loaded.sort((a,b)=>order(a.label)-order(b.label));mode="monthly";focusId=requested;$("trendProgress").textContent=points.length?`${points.length}개 시점의 코드 일치 월별 추이를 불러왔습니다.`:"해당 코드의 월별 보관본을 찾지 못했습니다.";render()}catch(error){console.error(error);$("trendProgress").textContent=`월별 추이를 불러오지 못했습니다: ${error.message}`}finally{setBusy(false)}}

  async function unzip(buffer){if("DecompressionStream" in window){const stream=new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));return new Response(stream).text()}if(!window.pako)throw new Error("gzip 해제 라이브러리를 불러오지 못했습니다.");return window.pako.ungzip(new Uint8Array(buffer),{to:"string"})}

  async function loadYearly(){if(busy)return;const pop=focusPop();if(!pop)return;const requested=idOf(pop),scope=hierarchy(pop.code);setBusy(true);$("trendProgress").textContent="연도별 gzip 시계열을 내려받는 중입니다…";$("trendArchiveList").replaceChildren();try{const response=await fetch(YEARLY_URL,{cache:"no-store"});if(!response.ok)throw new Error(`연도별 자료 HTTP ${response.status}`);const text=await unzip(await response.arrayBuffer());let headers=null,indexes=null,ageColumns=[];const byYear=new Map();parseCSV(text,row=>{if(!headers){headers=row.map((header,index)=>index?String(header??"").trim():String(header??"").trim().replace(/^\uFEFF/,""));indexes={year:headers.indexOf("연도"),code:headers.indexOf("코드")};headers.forEach((header,index)=>{const match=header.match(/^계_(\d+)세(?:\s*이상)?$/);if(match)ageColumns.push({index,age:Math.min(Number(match[1]),100)})});return}if(!row.length)return;const rowCode=codeFrom(row[indexes.code]);const matched=scope.type==="unit"?rowCode===scope.prefix:rowCode.startsWith(scope.prefix);if(!matched)return;const year=String(row[indexes.year]??"").trim();if(!year)return;if(!byYear.has(year))byYear.set(year,Array(101).fill(0));const ages=byYear.get(year);ageColumns.forEach(column=>ages[column.age]+=num(row[column.index]))});if(idOf(focusPop())!==requested)throw new Error("기준 행이 변경되어 결과를 취소했습니다.");points=[...byYear.entries()].map(([year,ages])=>({label:`${year}년 6월`,metrics:totalsMetrics(ages)})).filter(item=>item.metrics.total>0).sort((a,b)=>order(a.label)-order(b.label));mode="yearly";focusId=requested;$("trendProgress").textContent=points.length?`${points.length}개 연도의 코드 기준 추이를 불러왔습니다.`:"해당 코드 범위의 연도별 자료를 찾지 못했습니다.";render()}catch(error){console.error(error);$("trendProgress").textContent=`연도별 추이를 불러오지 못했습니다: ${error.message}`}finally{setBusy(false)}}

  monthlyButton.addEventListener("click",loadMonthly);
  yearlyButton.addEventListener("click",loadYearly);
  metricSelect.addEventListener("change",render);
  document.querySelector('[data-tab="trend"]')?.addEventListener("click",()=>{syncFocus();if(points.length)render()});
  window.addEventListener("resize",()=>{if(points.length&&window.Plotly)Plotly.Plots.resize($("trendChart"))});
})();