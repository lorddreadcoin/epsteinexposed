# 🎯 IMMEDIATE IMPLEMENTATION - Copy These Files

## Files to Replace/Create

These 3 files complete the CTRL+Click multi-select feature. Copy them directly into your codebase:

### 1. Graph3DCore.tsx
**Location:** `apps/web/app/components/graph/Graph3DCore.tsx`
**Action:** REPLACE entire file

**Features added:**
- ✅ CTRL+Click multi-select (tracks selected nodes in Set)
- ✅ Visual white ring on multi-selected nodes
- ✅ "ANALYZE CONNECTION" button when 2+ nodes selected
- ✅ Selected entity chips showing names
- ✅ Smooth spring animations with damping
- ✅ Arkham-style glowing nodes
- ✅ Node size based on documentCount (logarithmic)
- ✅ Color coding by type (person=cyan, location=amber, org=red)
- ✅ Fog for depth perception
- ✅ Stats overlay (entity count, connection count)
- ✅ Instruction overlay for new users

---

### 2. page.tsx
**Location:** `apps/web/app/page.tsx`
**Action:** REPLACE entire file

**Features added:**
- ✅ Wires up `onAnalyzeConnection` callback
- ✅ Sets `selectedEntities` when user clicks "Analyze Connection"
- ✅ Auto-expands chat panel when analysis triggered
- ✅ Entity detail sidebar for single selection
- ✅ Document viewer modal integration
- ✅ Header with stats and toolbar buttons

---

### 3. DocumentViewer.tsx
**Location:** `apps/web/app/components/document/DocumentViewer.tsx`
**Action:** CREATE new file (create `document` folder if needed)

**Features:**
- ✅ Full-screen PDF viewer modal
- ✅ Zoom controls (+/- buttons and keyboard)
- ✅ Page navigation (arrow keys)
- ✅ Download button
- ✅ Highlighted entities display
- ✅ Keyboard shortcuts (Esc to close)

---

## Windsurf Prompt (Optional)

If you want Windsurf to do the replacement, paste this:

```
Replace the following files with the new implementations I'm providing:

1. apps/web/app/components/graph/Graph3DCore.tsx - Full replacement with CTRL+Click multi-select
2. apps/web/app/page.tsx - Full replacement with onAnalyzeConnection wiring  
3. apps/web/app/components/document/DocumentViewer.tsx - New file for PDF viewing

The Graph3DCore now:
- Tracks multi-selected nodes in a Set
- Shows "ANALYZE CONNECTION" button when 2+ nodes selected
- Calls onAnalyzeConnection(entities) when button clicked
- Has Arkham-style glowing nodes and smooth animations

The page.tsx now:
- Receives onAnalyzeConnection callback
- Sets selectedEntities state (triggers chat discovery prompt)
- Auto-expands chat panel
- Renders DocumentViewer modal when viewingDocument is set

Create the document folder if it doesn't exist.
```

---

## Testing After Implementation

```bash
pnpm dev

# In browser:
# 1. Graph loads with glowing nodes ✓
# 2. Hover shows label + doc count ✓
# 3. Click selects node (cyan ring) ✓
# 4. CTRL+Click adds to multi-select (white ring) ✓
# 5. "ANALYZE CONNECTION" button appears with 2+ nodes ✓
# 6. Clicking button expands chat + triggers discovery prompt ✓
# 7. Chat shows "Analyze connection between X and Y?" ✓
```

---

## Dependencies Check

Make sure these are in `apps/web/package.json`:

```json
{
  "dependencies": {
    "@react-three/fiber": "^8.x",
    "@react-three/drei": "^9.x",
    "three": "^0.160.x"
  }
}
```

If missing, run:
```bash
cd apps/web
pnpm add @react-three/fiber @react-three/drei three
pnpm add -D @types/three
```

---

## Ready to Push After This

Once these 3 files are in place and tested:

```bash
git add .
git commit -m "feat: Add CTRL+Click multi-select and connection analysis

- Graph3DCore: Multi-select with CTRL+Click, Arkham aesthetic
- page.tsx: Wire up onAnalyzeConnection to chat panel  
- DocumentViewer: Full-screen PDF viewer with zoom/nav"

git push origin main
```

🚀 Ship it.
