# Exporting AmazingWallet (React Native code) → Figma

Research done 2026-06-27. Goal: turn the existing app screens into editable Figma designs.

## Bottom line
- **Possible: yes.** Getting screens into Figma as real, editable layers works.
- **Pixel-perfect 1:1: no.** Expect ~80–95% fidelity, then manual polish.
- It's a **snapshot** — Figma does not stay synced with future code changes.

## Routes (most → least fidelity)

### 1. html2design (recommended for this app)
- Our app runs on **web** (`npx expo start --web` → react-native-web → real HTML/CSS).
- The html2design Figma plugin ingests rendered HTML/CSS from the browser and turns it
  into native Figma layers (frames, vector SVG icons, image fills). ~30s per screen.
- Highest fidelity because it uses the actual rendered output.
- **You drive it** (browser DevTools → copy → plugin); Claude can't operate the browser+plugin.
- Link: https://www.html2design.com/blog/react-component-to-figma

### 2. Figma MCP server — "Code to Design" (Claude can drive)
- Figma's MCP server can now **write native layers back to the canvas** (frames, components,
  variables, auto-layout) from an MCP client like Claude Code (shipped ~Mar 2026).
- Claude reads the screen code and **re-creates** it as Figma frames — faithful rebuild,
  not a screenshot. Layout/components/colors come over well; fine spacing/effects may drift.
- Setup needed: Figma account + authorize the **remote** MCP (`https://mcp.figma.com/mcp`)
  in Claude Code (browser/desktop auth — user must click through).
- Docs:
  - https://developers.figma.com/docs/figma-mcp-server/
  - https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server
  - https://github.blog/changelog/2026-03-06-figma-mcp-server-can-now-generate-design-layers-from-vs-code/

### 3. Screenshots → Figma (manual, not editable)
- Lowest effort, just images. Skip unless only mockups are needed.

## Caveats (any route)
- Fonts must exist in Figma (SourceSansPro) or they substitute.
- Native components (Actionsheet, Fab, charts) become approximations.
- Snapshot only — re-export after code changes.

## Note: opposite direction tools (NOT what we want)
Locofy, Builder Visual Copilot, CodeTea, etc. convert **Figma → React Native code**, not code → Figma.

## Decision pending
Waiting on client confirmation before starting. When ready, pick route #1 (user-driven, best
fidelity) or route #2 (Claude generates via Figma MCP — needs MCP setup + auth first).
