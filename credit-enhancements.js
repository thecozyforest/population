(() => {
  "use strict";

  if (document.getElementById("creatorCredit")) return;

  const style = document.createElement("style");
  style.textContent = `
    body{padding-bottom:max(54px,calc(42px + env(safe-area-inset-bottom)))}
    #creatorCredit{
      position:fixed;
      z-index:120;
      right:8px;
      bottom:max(7px,env(safe-area-inset-bottom));
      max-width:calc(100vw - 20px);
      padding:4px 8px;
      overflow:hidden;
      border:1px solid color-mix(in srgb,var(--border2) 72%,transparent);
      border-radius:999px;
      background:color-mix(in srgb,var(--solid) 82%,transparent);
      box-shadow:0 4px 14px color-mix(in srgb,var(--focus) 65%,transparent);
      color:var(--primary2);
      font-size:9px;
      font-weight:750;
      line-height:1.3;
      letter-spacing:-.01em;
      white-space:nowrap;
      text-overflow:ellipsis;
      opacity:.76;
      pointer-events:none;
      user-select:none;
      -webkit-user-select:none;
      backdrop-filter:blur(8px);
      -webkit-backdrop-filter:blur(8px);
    }
    @media(max-width:520px){
      #creatorCredit{right:5px;bottom:max(5px,env(safe-area-inset-bottom));padding:3px 6px;font-size:8px;opacity:.7}
    }
    @media print{#creatorCredit{display:none!important}}
  `;
  document.head.appendChild(style);

  const credit = document.createElement("div");
  credit.id = "creatorCredit";
  credit.setAttribute("role", "contentinfo");
  credit.textContent = "만든 사람 : 기경민(동덕여고)";
  document.body.appendChild(credit);
})();
