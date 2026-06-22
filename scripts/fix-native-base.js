// Fixes a native-base ↔ modern React Native incompatibility.
//
// native-base 3.x hardcodes web-only CSS values like `outlineWidth: '0'` and
// `outlineWidth: '2px'` across its component themes. On React Native 0.76+,
// outlineWidth / outlineOffset became REAL native style props that must be
// NUMBERS, so the strings crash the app with:
//   "Error while updating property 'outlineWidth' ... String cannot be cast to Double"
//
// This rewrites those string values to numbers directly in native-base's source
// (Metro bundles native-base from its `react-native` field => src/). It runs
// automatically via the "postinstall" npm script, so `npm install` can never
// reintroduce the bug.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "node_modules", "native-base", "src");

if (!fs.existsSync(ROOT)) {
  console.log("[fix-native-base] native-base/src not found — skipping.");
  process.exit(0);
}

// outlineWidth: '0' | "2px" | '4px'  ->  outlineWidth: 0 | 2 | 4   (same for outlineOffset)
const PATTERN = /(outline(?:Width|Offset)):\s*(['"])(\d+)(?:px)?\2/g;

let filesChanged = 0;
let replacements = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      walk(p);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      const src = fs.readFileSync(p, "utf8");
      const next = src.replace(PATTERN, (_m, prop, _q, num) => {
        replacements++;
        return `${prop}: ${num}`;
      });
      if (next !== src) {
        fs.writeFileSync(p, next);
        filesChanged++;
      }
    }
  }
}

walk(ROOT);
console.log(
  `[fix-native-base] done — ${replacements} string outline props fixed across ${filesChanged} file(s).`
);
