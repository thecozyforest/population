/* 판정 실험실 · 헷갈리는 쌍 화면 (2026-11-26 판정순서판)
   script.js의 전역 key · state · save() · stats() · toast()를 함께 쓴다. */
"use strict";
window.MalangLab = (function () {
  const LK = "malangGrammarLab.lab.v1";
  const TYPES = { flow: ["🧭", "판정 흐름"], tinker: ["🧪", "직접 실험"], cut: ["✂️", "잘라 보기"], fix: ["📝", "친구 노트 고치기"], bogi: ["📋", "〈보기〉 탐구"] };
  const NUM = ["①", "②", "③", "④", "⑤", "⑥"];
  let L = readL(), li = 0, pi2 = 0, run = null, prun = null;

  function readL() { const d = { lab: {}, pair: {}, miss: {} }; try { return Object.assign(d, JSON.parse(localStorage.getItem(LK) || "{}")); } catch (e) { return d; } }
  function saveL() { try { localStorage.setItem(LK, JSON.stringify(L)); } catch (e) { /* 저장 불가 기기 */ } }
  const esc = s => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const $ = s => document.querySelector(s);
  function hl(s, h) { s = esc(s); if (!h) return s; h = esc(h); const i = s.indexOf(h); return i < 0 ? s : s.slice(0, i) + `<mark class="lab-hl">${h}</mark>` + s.slice(i + h.length); }
  function data(k) { return (window.MALANG_LAB || {})[k || key] || { lab: [], pairs: [] }; }
  function isDone(kind, id, k) { return (L[kind][k || key] || []).includes(id); }

  function finish(kind, id, clean) {
    const list = L[kind][key] || (L[kind][key] = []);
    const first = !list.includes(id);
    if (first) list.push(id);
    if (!clean) L.miss[id] = 1; else if (first) delete L.miss[id];
    saveL();
    if (first && typeof state === "object") {
      if (clean) { state.star++; state.streak++; } else state.streak = 0;
      save(); stats();
    }
  }

  /* ── 공통 조각 ── */
  function chips(items, kind, cur) {
    return `<div class="lab-chips" role="list">${items.map((x, i) => {
      const t = kind === "lab" ? TYPES[x.type][0] : "⚖️";
      return `<button type="button" class="lab-chip${i === cur ? " is-active" : ""}${isDone(kind, x.id) ? " is-done" : ""}" data-${kind === "lab" ? "lab" : "pair"}-go="${i}"><span aria-hidden="true">${t}</span>${i + 1}. ${esc(x.title)}${L.miss[x.id] ? '<em>다시</em>' : ""}${isDone(kind, x.id) ? '<b aria-label="완료">✓</b>' : ""}</button>`;
    }).join("")}</div>`;
  }
  function sentence(x) {
    if (!x.s) return "";
    return `<div class="lab-sentence">${hl(x.s, x.hl)}</div>${x.ctx ? `<p class="lab-ctx">상황 · ${esc(x.ctx)}</p>` : ""}`;
  }
  function opts(o, attr, vertical) {
    return `<div class="lab-options${vertical ? " is-vertical" : ""}">${o.map((t, k) => `<button type="button" class="option-button" data-${attr}="${k}">${vertical ? `<span class="lab-no">${NUM[k]}</span>` : ""}${esc(t)}</button>`).join("")}</div>`;
  }
  const nextBtn = kind => `<button type="button" class="primary-button lab-next" data-${kind}-next>다음 ${kind === "lab" ? "실험" : "쌍"} →</button>`;

  /* ── 판정 실험실 ── */
  function lab() {
    const items = data().lab, box = $("#labContent");
    if (!box) return;
    if (!items.length) { box.innerHTML = '<p class="lab-empty">이 단계의 실험을 준비하고 있어요.</p>'; return; }
    li = (li + items.length) % items.length;
    const x = items[li];
    if (!run || run.id !== x.id) run = { id: x.id, step: 0, wrong: 0, tried: [], cuts: new Set(), solved: false, fine: [] };
    const [ic, tn] = TYPES[x.type];
    $("#labCount").textContent = `${(L.lab[key] || []).length} / ${items.length} 완료`;
    box.innerHTML = chips(items, "lab", li) +
      `<article class="lab-card" data-type="${x.type}">
        <div class="lab-card-top"><span class="lab-type">${ic} ${tn}</span><span class="lab-pos">${li + 1} / ${items.length}</span></div>
        <h3 class="lab-title">${esc(x.title)}</h3>
        ${x.type === "cut" ? `<p class="lab-ctx">${esc(x.s)}</p>` : sentence(x)}
        <div class="lab-body">${body(x)}</div>
      </article>`;
  }

  function body(x) {
    const r = run;
    if (x.type === "flow") {
      let h = "";
      x.steps.forEach((st, k) => {
        if (k < r.step) h += `<div class="lab-step is-done"><span class="lab-num">✓</span><div><p class="lab-q">${esc(st.q)}</p>${st.tr ? `<p class="lab-tryres">${esc(st.tr[1])}</p>` : ""}<p class="lab-ans">→ ${esc(st.o[st.a])}</p>${st.ok ? `<p class="lab-ok">${esc(st.ok)}</p>` : ""}</div></div>`;
        else if (k === r.step) {
          const needTry = st.tr && !r.tried.includes(k);
          h += `<div class="lab-step is-now"><span class="lab-num">${k + 1}</span><div><p class="lab-q">${esc(st.q)}</p>
            ${st.tr ? (needTry ? `<button type="button" class="lab-try" data-lab-try="${k}">🔬 ${esc(st.tr[0])}</button>` : `<p class="lab-tryres">${esc(st.tr[1])}</p>`) : ""}
            ${needTry ? "" : opts(st.o, "lab-opt")}<div class="lab-fb" id="labFb" aria-live="polite"></div></div></div>`;
        } else h += `<div class="lab-step is-later"><span class="lab-num">${k + 1}</span><div><p class="lab-q">다음 질문</p></div></div>`;
      });
      if (r.step >= x.steps.length) h += `<div class="lab-end"><strong>✅ 판정 끝</strong><p>${esc(x.end)}</p></div>` + nextBtn("lab");
      return h;
    }
    if (x.type === "tinker") {
      let h = `<div class="lab-acts">${x.acts.map((a, k) => `<button type="button" class="lab-try${r.tried.includes(k) ? " is-tried" : ""}" data-lab-act="${k}">🔬 ${esc(a[0])}</button>`).join("")}</div>`;
      h += `<div class="lab-results">${r.tried.map(k => `<p class="lab-tryres"><b>${esc(x.acts[k][0])}</b> ${esc(x.acts[k][1])}</p>`).join("")}</div>`;
      if (!r.tried.length) return h + '<p class="lab-hint">위 실험 버튼부터 눌러 보세요.</p>';
      h += `<p class="lab-q">${esc(x.q)}</p>` + (r.solved ? `<p class="lab-ans">→ ${esc(x.o[x.a])}</p><div class="lab-end"><p>${esc(x.ok)}</p></div>` + nextBtn("lab") : opts(x.o, "lab-opt") + '<div class="lab-fb" id="labFb" aria-live="polite"></div>');
      return h;
    }
    if (x.type === "cut") {
      const words = x.cut.split(" ");
      let h = `<p class="lab-q">${esc(x.cutq || "형태소 사이를 눌러 칼집(｜)을 넣으세요. 다시 누르면 빠져요.")}</p><div class="cut-line">`;
      words.forEach((w, wi) => {
        const syl = [...w.replaceAll("|", "")];
        h += '<span class="cut-word">';
        syl.forEach((c, j) => {
          h += `<span class="cut-syl">${esc(c)}</span>`;
          if (j < syl.length - 1) { const id = wi + ":" + j, on = r.cuts.has(id); h += `<button type="button" class="cut-gap${on ? " is-on" : ""}" data-cut="${id}" ${r.solved ? "disabled" : ""} aria-label="${esc(c)} 뒤에서 자르기" aria-pressed="${on}">${on ? "｜" : ""}</button>`; }
        });
        h += "</span>";
      });
      h += "</div>";
      if (r.solved) return h + `<div class="lab-end"><p>${esc(x.ok)}</p></div>` + nextBtn("lab");
      return h + `<div class="lab-row"><button type="button" class="primary-button" data-cut-check>확인하기</button>${r.wrong >= 2 ? '<button type="button" class="secondary-button" data-cut-show>정답 보기</button>' : ""}</div><div class="lab-fb" id="labFb" aria-live="polite"></div>`;
    }
    if (x.type === "fix") {
      let h = `<p class="lab-q">${esc(x.q || "틀린 줄을 찾아 눌러 보세요.")}</p><div class="lab-note"><p class="lab-note-who">📒 ${esc(x.who)}의 노트</p>`;
      h += x.lines.map((t, k) => {
        const bad = r.solved && k === x.a, fine = r.fine.includes(k);
        return `<button type="button" class="lab-line${bad ? " is-bad" : ""}${fine ? " is-fine" : ""}" data-lab-line="${k}" ${r.solved ? "disabled" : ""}>${esc(t)}${fine ? '<small>이 줄은 맞아요</small>' : ""}</button>`;
      }).join("") + "</div>";
      if (r.solved) h += `<div class="lab-end"><strong>✏️ 이렇게 고쳐요</strong><p>${esc(x.fix)}</p></div>` + nextBtn("lab");
      else h += '<div class="lab-fb" id="labFb" aria-live="polite"></div>';
      return h;
    }
    if (x.type === "bogi") {
      let h = `<div class="lab-bogi"><span>〈보기〉</span><p>${esc(x.bogi)}</p>${x.list ? `<ul>${x.list.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}</div><p class="lab-q">${esc(x.q)}</p>`;
      if (r.solved) return h + `<p class="lab-ans">→ ${NUM[x.a]} ${esc(x.o[x.a])}</p><div class="lab-end"><p>${esc(x.ok)}</p></div>` + nextBtn("lab");
      return h + opts(x.o, "lab-opt", true) + '<div class="lab-fb" id="labFb" aria-live="polite"></div>';
    }
    return "";
  }

  function feedback(msg, ok) { const f = $("#labFb"); if (f) { f.className = `lab-fb is-visible ${ok ? "correct" : "wrong"}`; f.textContent = msg; } }

  function labClick(t) {
    const x = data().lab[li], r = run;
    let b;
    if ((b = t.closest("[data-lab-go]"))) { li = +b.dataset.labGo; run = null; return lab(), true; }
    if (t.closest("[data-lab-next]")) { li++; run = null; lab(); $("#labPanel")?.scrollIntoView({ block: "start", behavior: "smooth" }); return true; }
    if ((b = t.closest("[data-lab-try]"))) { r.tried.push(+b.dataset.labTry); return lab(), true; }
    if ((b = t.closest("[data-lab-act]"))) { const k = +b.dataset.labAct; if (!r.tried.includes(k)) r.tried.push(k); return lab(), true; }
    if ((b = t.closest("[data-lab-opt]"))) {
      const k = +b.dataset.labOpt;
      if (x.type === "flow") {
        const st = x.steps[r.step];
        if (k === st.a) { r.step++; if (r.step >= x.steps.length) finish("lab", x.id, r.wrong === 0); lab(); }
        else { r.wrong++; b.classList.add("is-wrong"); b.disabled = true; feedback(st.no || "다시 생각해 보세요. 앞에서 확인한 것을 떠올려 보세요.", false); }
      } else {
        if (k === x.a) { r.solved = true; finish("lab", x.id, r.wrong === 0); lab(); }
        else { r.wrong++; b.classList.add("is-wrong"); b.disabled = true; feedback(x.type === "tinker" ? "실험 결과를 다시 보세요." : "다시 골라 보세요. 〈보기〉의 기준을 하나씩 대어 보세요.", false); }
      }
      return true;
    }
    if ((b = t.closest("[data-cut]"))) { const id = b.dataset.cut; r.cuts.has(id) ? r.cuts.delete(id) : r.cuts.add(id); return lab(), true; }
    if (t.closest("[data-cut-check]") || t.closest("[data-cut-show]")) {
      const ans = new Set();
      x.cut.split(" ").forEach((w, wi) => { let j = -1; for (const c of w) { if (c === "|") ans.add(wi + ":" + j); else j++; } });
      if (t.closest("[data-cut-show]")) { r.cuts = ans; r.wrong++; r.solved = true; finish("lab", x.id, false); return lab(), true; }
      const miss = [...ans].filter(a => !r.cuts.has(a)).length, extra = [...r.cuts].filter(a => !ans.has(a)).length;
      if (!miss && !extra) { r.solved = true; finish("lab", x.id, r.wrong === 0); lab(); }
      else { r.wrong++; lab(); feedback(`${miss ? `더 잘라야 할 곳이 ${miss}군데` : ""}${miss && extra ? ", " : ""}${extra ? `자르면 안 되는 곳이 ${extra}군데` : ""} 있어요. ${x.cutno || "더 나누면 뜻이나 문법적인 일이 사라지는지 따져 보세요."}`, false); }
      return true;
    }
    if ((b = t.closest("[data-lab-line]"))) {
      const k = +b.dataset.labLine;
      if (k === x.a) { r.solved = true; finish("lab", x.id, r.wrong === 0); lab(); }
      else if (!r.fine.includes(k)) { r.wrong++; r.fine.push(k); lab(); feedback("그 줄은 맞게 썼어요. 다른 줄을 살펴보세요.", false); }
      return true;
    }
    return false;
  }

  /* ── 헷갈리는 쌍 ── */
  function pairs() {
    const items = data().pairs, box = $("#pairContent");
    if (!box) return;
    if (!items.length) { box.innerHTML = '<p class="lab-empty">이 단계의 쌍을 준비하고 있어요.</p>'; return; }
    pi2 = (pi2 + items.length) % items.length;
    const x = items[pi2];
    if (!prun || prun.id !== x.id) prun = { id: x.id, A: false, B: false, key: false, wrong: 0, bad: { A: [], B: [], K: [] } };
    const r = prun;
    $("#pairCount").textContent = `${(L.pair[key] || []).length} / ${items.length} 완료`;
    const side = s => {
      const it = x[s], ans = x["a" + s];
      return `<div class="pair-side${r[s] ? " is-solved" : ""}"><span class="pair-tag">${s}</span>${sentence(it)}
        <p class="lab-q">${esc(x.q)}</p>
        ${r[s] ? `<p class="lab-ans">→ ${esc(x.o[ans])}</p>` : `<div class="lab-options is-compact">${x.o.map((t, k) => `<button type="button" class="option-button${r.bad[s].includes(k) ? " is-wrong" : ""}" data-pair-opt="${s}:${k}" ${r.bad[s].includes(k) ? "disabled" : ""}>${esc(t)}</button>`).join("")}</div>`}
      </div>`;
    };
    let h = chips(items, "pair", pi2) + `<article class="lab-card pair-card">
      <div class="lab-card-top"><span class="lab-type">⚖️ 헷갈리는 쌍</span><span class="lab-pos">${pi2 + 1} / ${items.length}</span></div>
      <h3 class="lab-title">${esc(x.title)}</h3>${x.criterion ? `<p class="lab-criterion">${esc(x.criterion)}</p>` : ""}
      <div class="pair-grid">${side("A")}${side("B")}</div>`;
    if (r.A && r.B) {
      h += `<div class="pair-key"><p class="lab-q">🔑 ${esc(x.key.q)}</p>`;
      h += r.key ? `<p class="lab-ans">→ ${esc(x.key.o[x.key.a])}</p></div><div class="lab-end"><p>${esc(x.ok)}</p></div>` + nextBtn("pair")
        : `<div class="lab-options is-vertical">${x.key.o.map((t, k) => `<button type="button" class="option-button${r.bad.K.includes(k) ? " is-wrong" : ""}" data-pair-key="${k}" ${r.bad.K.includes(k) ? "disabled" : ""}>${esc(t)}</button>`).join("")}</div></div>`;
    }
    h += '<div class="lab-fb" id="pairFb" aria-live="polite"></div></article>';
    box.innerHTML = h;
  }

  function pairFeedback(msg) { const f = $("#pairFb"); if (f) { f.className = "lab-fb is-visible wrong"; f.textContent = msg; } }

  function pairClick(t) {
    const x = data().pairs[pi2], r = prun;
    let b;
    if ((b = t.closest("[data-pair-go]"))) { pi2 = +b.dataset.pairGo; prun = null; return pairs(), true; }
    if (t.closest("[data-pair-next]")) { pi2++; prun = null; pairs(); $("#pairPanel")?.scrollIntoView({ block: "start", behavior: "smooth" }); return true; }
    if ((b = t.closest("[data-pair-opt]"))) {
      const [s, k] = b.dataset.pairOpt.split(":");
      if (+k === x["a" + s]) { r[s] = true; pairs(); }
      else { r.wrong++; r.bad[s].push(+k); pairs(); pairFeedback(`${s} 문장을 다시 보세요. 두 문장이 어디서 갈리는지 견주어 보면 보여요.`); }
      return true;
    }
    if ((b = t.closest("[data-pair-key]"))) {
      const k = +b.dataset.pairKey;
      if (k === x.key.a) { r.key = true; finish("pair", x.id, r.wrong === 0); pairs(); }
      else { r.wrong++; r.bad.K.push(k); pairs(); pairFeedback("두 문장의 답을 가른 기준을 다시 생각해 보세요."); }
      return true;
    }
    return false;
  }

  document.addEventListener("click", e => {
    if (!e.target.closest) return;
    if (e.target.closest("#labContent")) labClick(e.target);
    else if (e.target.closest("#pairContent")) pairClick(e.target);
  });

  return {
    lab, pairs,
    reset() { li = 0; pi2 = 0; run = null; prun = null; },
    badge(k) { const d = data(k), n = (L.lab[k] || []).length + (L.pair[k] || []).length, all = d.lab.length + d.pairs.length; return all ? `<span class="path-lab">🧭 판정 실험·쌍 ${n}/${all}</span>` : ""; },
    clear() { localStorage.removeItem(LK); L = readL(); },
    /* 게임(game.js)이 쓰는 진도 정보 */
    info(k) { const d = data(k), lab = L.lab[k] || [], pair = L.pair[k] || []; return { lab: lab.length, labAll: d.lab.length, pair: pair.length, pairAll: d.pairs.length, pairIds: pair, clean: d.lab.length > 0 && lab.length === d.lab.length && pair.length === d.pairs.length && ![...d.lab, ...d.pairs].some(x => L.miss[x.id]) }; }
  };
})();
