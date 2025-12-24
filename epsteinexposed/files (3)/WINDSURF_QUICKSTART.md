# QUICK START - FEED THIS TO WINDSURF

## IMMEDIATE ACTIONS (Copy/paste these commands)

### 1. First, install missing dependency:
```bash
npm install @anthropic-ai/sdk
```

### 2. Add to .env.local:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
```

### 3. Feed Windsurf this prompt:

---

**WINDSURF PROMPT (copy everything below):**

```
Read the file WINDSURF_SURGICAL_FIX.md and execute tasks 1-8 in order.

PRIORITY ORDER:
1. Task 1: Fix orange document click handler in EntityDetailPanel.tsx
2. Task 2: Add deduplication to entity-data-loader.service.ts  
3. Task 3: Slow down OrbitControls in Graph3DCore.tsx
4. Task 4: Create InvestigationChat.tsx component
5. Task 5: Create /api/chat/investigate/route.ts
6. Task 6: Add CTRL+click multi-select to Graph3DCore.tsx
7. Task 7: Update page.tsx with split pane layout
8. Task 8: Create DocumentPopup.tsx component

For each task:
- Find the exact file mentioned
- Make the specific changes shown
- Test that it works before moving to next task

Key requirements:
- Chat panel should be 30% of screen height at bottom
- All Claude responses must ONLY cite actual documents
- Temperature must be 0 for Claude API calls
- CTRL+Click should multi-select nodes
- "Analyze Connection?" prompt should appear with 2+ nodes selected
```

---

## FILE LOCATIONS REFERENCE

| Component | Path |
|-----------|------|
| Main Graph | `apps/web/app/components/graph/Graph3DCore.tsx` |
| Entity Panel | `apps/web/app/components/graph/EntityDetailPanel.tsx` |
| Entity Loader | `apps/api/src/services/entity-data-loader.service.ts` |
| Entity Data | `apps/api/data/entities/*.json` |
| Main Page | `apps/web/app/page.tsx` |
| NEW: Chat | `apps/web/app/components/chat/InvestigationChat.tsx` |
| NEW: API | `apps/web/app/api/chat/investigate/route.ts` |
| NEW: Popup | `apps/web/app/components/document/DocumentPopup.tsx` |

---

## VERIFICATION TESTS

After Windsurf completes, test these:

1. **Document Links**: Click orange "documents" text → should open popup, not collapse
2. **No Duplicates**: Check connection list → no repeated entity pairs
3. **Smooth Graph**: Rotate graph → should be smooth, not jerky
4. **CTRL+Click**: Hold CTRL and click two nodes → "Analyze?" prompt appears
5. **Chat Works**: Type question → get response with citations
6. **Citations Clickable**: Click citation → document opens

---

## IF SOMETHING BREAKS

**Chat not responding:**
- Check ANTHROPIC_API_KEY is set in .env.local
- Check apps/api/data/entities/ has JSON files
- Check console for errors

**Documents not loading:**
- Check PDF paths match your local setup
- May need to adjust path in DocumentPopup.tsx

**Graph still jerky:**
- Lower dampingFactor to 0.02
- Lower all speed values to 0.2
