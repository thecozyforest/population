from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
base = (ROOT / "base.html").read_text(encoding="utf-8")
source_db = (ROOT / "source-db-enhancements.js").read_text(encoding="utf-8")
trend = (ROOT / "trend-enhancements.js").read_text(encoding="utf-8")
trend_source = (ROOT / "trend-source-bridge.js").read_text(encoding="utf-8")
guide = (ROOT / "guide-enhancements.js").read_text(encoding="utf-8")
fieldwork = (ROOT / "fieldwork-enhancements.js").read_text(encoding="utf-8")

old_decoder = 'new TextDecoder("euc-kr").decode(await r.arrayBuffer())'
new_decoder = 'window.__decodePopulation(await r.arrayBuffer())'
if old_decoder not in base:
    raise SystemExit("Population decoder integration point was not found in base.html")
base = base.replace(old_decoder, new_decoder, 1)

head_injection = r'''
<script>
window.__decodePopulation = function (buffer) {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    if (/_(남|여)_\d+세/.test(text)) return text;
  } catch (_) {}
  return new TextDecoder("euc-kr").decode(buffer);
};
</script>
<script src="https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js"></script>
'''

if "</head>" not in base or "</body>" not in base:
    raise SystemExit("base.html does not contain closing head/body tags")

base = base.replace("</head>", head_injection + "\n</head>", 1)
body_injection = (
    f"\n<script>\n{source_db}\n</script>\n"
    f"<script>\n{trend}\n</script>\n"
    f"<script>\n{trend_source}\n</script>\n"
    f"<script>\n{fieldwork}\n</script>\n"
    f"<script>\n{guide}\n</script>\n"
)
base = base.replace("</body>", body_injection + "</body>", 1)

(ROOT / "index.html").write_text(base, encoding="utf-8", newline="\n")
print("Built index.html from exact source DB rows and dashboard enhancements")