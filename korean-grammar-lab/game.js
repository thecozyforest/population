/* 게임 요소: 연구원 등급 · 단계 보스 실험 · 스피드 판정 · 배지 도감 (2026-11-26 확장판)
   script.js의 전역 K · D · key · state · QN · save() · stats() · toast() · mix() · choices()와
   lab.js의 MalangLab.info()를 함께 쓴다. 기록은 이 브라우저에만 저장한다. */
"use strict";
window.MalangGame = (function () {
  const GK = "malangGrammarLab.game.v1";
  const LV = [[0, "인턴 연구원", "🌱"], [15, "연구원", "🔍"], [40, "선임 연구원", "🧪"], [80, "책임 연구원", "📚"], [140, "수석 연구원", "🏅"], [220, "연구소장", "👑"]];
  const BOSS_N = 7, HEARTS = 3, SPEED_T = 60, PENALTY = 3;
  let G = readG(), boss = null, sp = null, tick = null;

  function readG() { const d = { boss: {}, speed: 0, badge: {}, maxStreak: 0, lv: -1 }; try { return Object.assign(d, JSON.parse(localStorage.getItem(GK) || "{}")); } catch (e) { return d; } }
  function saveG() { try { localStorage.setItem(GK, JSON.stringify(G)); } catch (e) { /* 저장 불가 기기 */ } }
  const esc = s => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const q$ = s => document.querySelector(s);

  function rank(star) {
    let i = 0; LV.forEach((l, k) => { if (star >= l[0]) i = k; });
    const c = LV[i], n = LV[i + 1];
    return { i, name: c[1], icon: c[2], next: n ? n[1] : "", need: n ? n[0] - star : 0, pct: n ? Math.round((star - c[0]) / (n[0] - c[0]) * 100) : 100 };
  }
  const pairDone = () => K.every(k => { const f = MalangLab.info(k); return f.pairAll > 0 && f.pair === f.pairAll; });
  const BADGES = [
    { id: "first", icon: "⭐", name: "첫 별", desc: "처음으로 별을 받았어요", t: () => state.star >= 1 },
    { id: "streak5", icon: "🔥", name: "불붙은 판정", desc: "연속 5번 맞히기", t: () => G.maxStreak >= 5 },
    { id: "rank2", icon: "🧪", name: "선임 연구원", desc: "별 40개 모으기", t: () => state.star >= 40 },
    { id: "boss1", icon: "⚔️", name: "첫 보스 격파", desc: "보스 실험 하나 통과하기", t: () => Object.keys(G.boss).length >= 1 },
    { id: "speed10", icon: "⚡", name: "번개 판정", desc: "스피드 판정 10점 넘기기", t: () => G.speed >= 10 },
    { id: "rank4", icon: "🏅", name: "수석 연구원", desc: "별 140개 모으기", t: () => state.star >= 140 },
    { id: "streak15", icon: "☄️", name: "흔들림 없는 판정", desc: "연속 15번 맞히기", hidden: 1, t: () => G.maxStreak >= 15 },
    { id: "speed20", icon: "🌩️", name: "광속 판정", desc: "스피드 판정 20점 넘기기", hidden: 1, t: () => G.speed >= 20 },
    { id: "clean", icon: "💎", name: "깔끔한 판정", desc: "한 단계의 실험과 쌍을 한 번도 틀리지 않고 끝내기", hidden: 1, t: () => K.some(k => MalangLab.info(k).clean) },
    { id: "dex", icon: "🗂️", name: "쌍 도감 완성", desc: "헷갈리는 쌍 카드를 모두 모으기", hidden: 1, t: pairDone },
    { id: "bossAll", icon: "👑", name: "모든 보스 격파", desc: "일곱 단계의 보스 실험을 모두 통과하기", hidden: 1, t: () => K.every(k => G.boss[k]) },
    { id: "quiz", icon: "🏆", name: "종합 게임 만점", desc: `종합 게임 ${QN}문제를 모두 맞히기`, hidden: 1, t: () => state.best >= QN }
  ];

  /* ── 등급·배지: stats()가 부를 때마다 확인 ── */
  function update() {
    G.maxStreak = Math.max(G.maxStreak, state.streak);
    const r = rank(state.star), up = G.lv >= 0 && r.i > G.lv;
    G.lv = r.i;
    const fresh = BADGES.filter(b => !G.badge[b.id] && b.t());
    fresh.forEach(b => { G.badge[b.id] = Date.now(); });
    saveG();
    if (up) toast(`${r.icon} 등급이 올랐어요 — ${r.name}!`);
    if (fresh.length) setTimeout(() => toast(`${fresh[0].icon} 배지를 얻었어요 — ${fresh[0].name}${fresh.length > 1 ? ` 외 ${fresh.length - 1}개` : ""}`), up ? 2400 : 0);
    const chip = q$("#rankChip");
    if (chip) chip.innerHTML = `<span aria-hidden="true">${r.icon}</span><strong>${r.name}</strong>`;
    const card = q$("#rankCard");
    if (card) {
      const got = BADGES.filter(b => G.badge[b.id]).length, bc = Object.keys(G.boss).length;
      card.innerHTML = `<div class="rank-main"><span class="rank-icon" aria-hidden="true">${r.icon}</span><div><span class="eyebrow">내 연구원 등급</span><h2>${r.name}</h2>
        <div class="rank-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${r.pct}" aria-label="다음 등급까지"><span style="width:${r.pct}%"></span></div>
        <p>${r.next ? `별 ${r.need}개 더 모으면 <b>${r.next}</b>` : "가장 높은 등급이에요!"} · 별은 처음 한 번에 맞힌 문제마다 하나, 보스를 넘으면 셋</p></div></div>
        <div class="rank-stats"><button type="button" data-view="dex"><b>${got}/${BADGES.length}</b><span>배지</span></button><button type="button" data-view="dex"><b>${bc}/${K.length}</b><span>보스 격파</span></button><button type="button" data-view="speed"><b>${G.speed}</b><span>스피드 최고</span></button></div>`;
    }
  }

  /* ── 단계 보스 실험 ── */
  function bossView() {
    const box = q$("#bossContent"); if (!box) return;
    const f = MalangLab.info(key), d = D[key];
    if (!boss || boss.k !== key) boss = null;
    if (!boss) {
      const open = f.lab >= f.labAll;
      box.innerHTML = `<article class="boss-card${open ? "" : " is-locked"}"><div class="boss-face" aria-hidden="true">${open ? "👾" : "🔒"}</div>
        <h3>${d.nav} 보스 실험${G.boss[key] ? ' <span class="boss-done">격파 ✓</span>' : ""}</h3>
        ${open ? `<p>이 단계의 새 문제 ${BOSS_N}개를 하트 ${HEARTS}개로 버텨야 해요. 틀릴 때마다 하트가 하나씩 줄어요.</p><p class="boss-hearts">${"❤️".repeat(HEARTS)}</p>
          <button type="button" class="primary-button" data-boss-start>${G.boss[key] ? "다시 도전" : "도전하기"}</button>${G.boss[key] ? "" : '<p class="lab-hint">처음 통과하면 별 3개를 받아요.</p>'}`
        : `<p>판정 실험실 ${f.lab} / ${f.labAll}개를 모두 풀면 열려요.</p><button type="button" class="secondary-button" data-mode="lab">판정 실험실로 →</button>`}</article>`;
      return;
    }
    const b = boss;
    if (b.over) {
      const win = b.i >= BOSS_N;
      box.innerHTML = `<article class="boss-card ${win ? "is-win" : "is-lose"}"><div class="boss-face" aria-hidden="true">${win ? "🏆" : "💥"}</div>
        <h3>${win ? "보스를 넘었어요!" : "하트가 다 떨어졌어요"}</h3><p>${win ? `${BOSS_N}문제를 하트 ${b.h}개 남기고 통과했어요.${b.first ? " 별 3개를 받았어요." : ""}` : `${b.ok}문제를 맞히고 ${b.i + 1}번째 문제에서 멈췄어요. 틀린 문제는 집중 복습에 모아 두었어요.`}</p>
        <div class="lab-row"><button type="button" class="primary-button" data-boss-start>다시 도전</button><button type="button" class="secondary-button" data-mode="review">새 예시 복습</button></div></article>`;
      return;
    }
    const e = b.q[b.i], ans = b.ans;
    box.innerHTML = `<article class="boss-card is-play"><div class="boss-top"><span>${b.i + 1} / ${BOSS_N}</span><span class="boss-hearts" aria-label="남은 하트 ${b.h}개">${"❤️".repeat(b.h)}${"🤍".repeat(HEARTS - b.h)}</span></div>
      <div class="progress-track"><span style="width:${b.i / BOSS_N * 100}%;background:${d.accent}"></span></div>
      <h3 class="boss-q">${esc(e.prompt)}</h3><div class="question-target">${esc(e.sentence)} → ${esc(e.target)}</div>
      <div class="lab-options">${b.o.map((t, k) => `<button type="button" class="option-button${ans != null && t === e.answer ? " is-correct" : ""}${ans === k && t !== e.answer ? " is-wrong" : ""}" data-boss-opt="${k}" ${ans != null ? "disabled" : ""}>${esc(t)}</button>`).join("")}</div>
      ${ans != null ? `<div class="lab-fb is-visible ${b.o[ans] === e.answer ? "correct" : "wrong"}"><b>${b.o[ans] === e.answer ? "정답!" : `정답은 ‘${esc(e.answer)}’ — 하트 하나를 잃었어요.`}</b> ${esc(e.explanation)}</div>
        <button type="button" class="primary-button lab-next" data-boss-next>${b.h === 0 ? "결과 보기" : b.i + 1 >= BOSS_N ? "결과 보기" : "다음 문제 →"}</button>` : ""}</article>`;
  }
  function bossStart() { boss = { k: key, q: mix(D[key].examples).slice(0, BOSS_N), i: 0, h: HEARTS, ok: 0, ans: null, over: false }; boss.o = choices(boss.q[0]); bossView(); }
  function bossPick(k) {
    const b = boss; if (!b || b.ans != null) return;
    b.ans = k; const e = b.q[b.i];
    if (b.o[k] === e.answer) b.ok++;
    else {
      b.h--; state.streak = 0;
      const w = state.wrong.find(x => x.k === key && x.id === e.id); w ? w.n++ : state.wrong.push({ k: key, id: e.id, n: 1 });
      save(); stats();
    }
    bossView();
  }
  function bossNext() {
    const b = boss; if (!b) return;
    if (b.h === 0) { b.over = true; return bossView(); }
    b.i++; b.ans = null;
    if (b.i >= BOSS_N) {
      b.over = true; b.first = !G.boss[key];
      if (b.first) { G.boss[key] = 1; state.star += 3; saveG(); save(); }
      stats(); return bossView();
    }
    b.o = choices(b.q[b.i]); bossView();
  }

  /* ── 스피드 판정 ── */
  function speedView() {
    const box = q$("#speedContent"); if (!box) return;
    if (!sp) {
      box.innerHTML = `<article class="speed-card"><div class="speed-big" aria-hidden="true">⚡</div><h2>60초 스피드 판정</h2>
        <p>일곱 단계의 문제가 섞여 나와요. 두 답 가운데 하나를 빠르게 고르세요. 맞히면 1점, 틀리면 ${PENALTY}초가 줄어요.</p>
        <p class="speed-best">최고 기록 <b>${G.speed}</b>점</p><button type="button" class="primary-button large" data-speed-start>시작!</button></article>`;
      return;
    }
    if (sp.over) {
      box.innerHTML = `<article class="speed-card"><div class="speed-big" aria-hidden="true">${sp.score > sp.prev ? "🎉" : "⏱️"}</div><h2>${sp.score}점</h2>
        <p>${sp.score > sp.prev ? "최고 기록을 새로 썼어요!" : `최고 기록은 ${G.speed}점이에요.`} 맞힌 ${sp.score}개 · 틀린 ${sp.miss}개</p>
        ${sp.log.length ? `<div class="speed-log"><b>틀린 문제 다시 보기</b>${sp.log.slice(0, 6).map(x => `<p>${esc(x.e.sentence)} · ‘${esc(x.e.target)}’ → <b>${esc(x.e.answer)}</b></p>`).join("")}</div>` : ""}
        <button type="button" class="primary-button large" data-speed-start>다시 도전</button></article>`;
      return;
    }
    const { k, e, o } = sp.cur;
    box.innerHTML = `<article class="speed-card is-play"><div class="speed-top"><span class="speed-time" id="speedTime">${Math.ceil(sp.left)}초</span><strong>${sp.score}점</strong></div>
      <div class="progress-track speed-track"><span id="speedBar" style="width:${sp.left / SPEED_T * 100}%"></span></div>
      <span class="question-tag">${D[k].icon} ${esc(D[k].nav)}</span><h3 class="boss-q">${esc(e.prompt)}</h3><div class="question-target">${esc(e.sentence)} → ${esc(e.target)}</div>
      <div class="speed-options">${o.map((t, i) => `<button type="button" class="option-button" data-speed-opt="${i}">${esc(t)}</button>`).join("")}</div>
      <p class="speed-flash ${sp.flash ? sp.flash[0] : ""}" aria-live="polite">${sp.flash ? esc(sp.flash[1]) : ""}</p></article>`;
  }
  function speedQ() {
    const k = K[Math.floor(Math.random() * K.length)], e = D[k].examples[Math.floor(Math.random() * D[k].examples.length)];
    const wrong = mix((e.options || []).filter(x => x !== e.answer))[0];
    sp.cur = { k, e, o: mix([e.answer, wrong]) };
  }
  function speedStart() {
    clearInterval(tick);
    sp = { score: 0, miss: 0, left: SPEED_T, end: Date.now() + SPEED_T * 1000, over: false, flash: null, log: [], prev: G.speed };
    speedQ(); speedView();
    tick = setInterval(() => {
      if (!sp || sp.over) return clearInterval(tick);
      sp.left = Math.max(0, (sp.end - Date.now()) / 1000);
      const t = q$("#speedTime"), bar = q$("#speedBar");
      if (t) t.textContent = Math.ceil(sp.left) + "초";
      if (bar) bar.style.width = sp.left / SPEED_T * 100 + "%";
      if (sp.left <= 0) speedEnd();
    }, 100);
  }
  function speedPick(i) {
    if (!sp || sp.over) return;
    const { k, e, o } = sp.cur;
    if (o[i] === e.answer) { sp.score++; sp.flash = ["ok", "정답! +1"]; }
    else { sp.miss++; sp.end -= PENALTY * 1000; sp.flash = ["no", `정답은 ‘${e.answer}’ · −${PENALTY}초`]; sp.log.push({ k, e }); }
    sp.left = Math.max(0, (sp.end - Date.now()) / 1000);
    if (sp.left <= 0) return speedEnd();
    speedQ(); speedView();
  }
  function speedEnd() {
    clearInterval(tick); if (!sp) return;
    sp.over = true; sp.left = 0;
    if (sp.score > G.speed) G.speed = sp.score;
    saveG(); stats(); speedView();
  }
  function speedStop() { clearInterval(tick); if (sp && !sp.over) sp = null; }

  /* ── 배지 도감 ── */
  function dexView() {
    const box = q$("#dexContent"); if (!box) return;
    const got = BADGES.filter(b => G.badge[b.id]).length;
    let h = `<section class="dex-section"><h2>🎖️ 배지 <small>${got} / ${BADGES.length}</small></h2><div class="badge-grid">${BADGES.map(b => {
      const on = G.badge[b.id];
      return `<article class="badge-card${on ? " is-on" : ""}"><span class="badge-icon" aria-hidden="true">${on || !b.hidden ? b.icon : "❔"}</span><strong>${on || !b.hidden ? b.name : "숨은 배지"}</strong><p>${on || !b.hidden ? b.desc : "조건은 얻으면 알 수 있어요"}</p></article>`;
    }).join("")}</div></section>`;
    h += `<section class="dex-section"><h2>👾 보스 실험 <small>${Object.keys(G.boss).length} / ${K.length}</small></h2><div class="boss-strip">${K.map(k => `<button type="button" class="boss-chip${G.boss[k] ? " is-on" : ""}" data-dex-boss="${k}" style="--chip:${D[k].accent}"><span aria-hidden="true">${G.boss[k] ? "🏆" : D[k].icon}</span>${esc(D[k].nav)}</button>`).join("")}</div></section>`;
    h += K.map(k => {
      const ps = (window.MALANG_LAB[k] || { pairs: [] }).pairs, f = MalangLab.info(k);
      return `<section class="dex-section"><h2>${D[k].icon} ${esc(D[k].nav)} 쌍 카드 <small>${f.pair} / ${ps.length}</small></h2><div class="dex-grid">${ps.map(p => f.pairIds.includes(p.id)
        ? `<article class="dex-card is-on" style="--chip:${D[k].accent};--chip-soft:${D[k].soft}"><strong>${esc(p.title)}</strong><p><b>A</b> ${esc(p.A.s)}</p><p><b>B</b> ${esc(p.B.s)}</p><small>🔑 ${esc(p.key.o[p.key.a])}</small></article>`
        : `<button type="button" class="dex-card" style="--chip:${D[k].accent};--chip-soft:${D[k].soft}" data-dex-pair="${k}"><span aria-hidden="true">❔</span><small>헷갈리는 쌍을 풀면 모여요</small></button>`).join("")}</div></section>`;
    }).join("");
    box.innerHTML = h;
  }

  document.addEventListener("click", e => {
    const t = e.target.closest ? e.target : null; if (!t) return;
    let b;
    if (t.closest("[data-boss-start]")) return bossStart();
    if ((b = t.closest("[data-boss-opt]"))) return bossPick(+b.dataset.bossOpt);
    if (t.closest("[data-boss-next]")) return bossNext();
    if (t.closest("[data-speed-start]")) return speedStart();
    if ((b = t.closest("[data-speed-opt]"))) return speedPick(+b.dataset.speedOpt);
    if ((b = t.closest("[data-dex-pair]"))) return openStage(b.dataset.dexPair, "pairs");
    if ((b = t.closest("[data-dex-boss]"))) return openStage(b.dataset.dexBoss, "boss");
  });

  return {
    update,
    boss: bossView,
    reset() { boss = null; },
    onView(v) { if (v !== "speed") speedStop(); if (v === "speed") speedView(); if (v === "dex") dexView(); },
    clear() { localStorage.removeItem(GK); G = readG(); }
  };
})();
