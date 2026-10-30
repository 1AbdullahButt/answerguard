## gemini · `gemini-3.5-flash-lite`

- Runs per case: 3 · date: 2026-10-30T17:25:27.542Z · throttled to stay under the free tier
- Decision accuracy: **100.0%** (36/36)
- Quote validity: **100.0%** (38/38 extracted quotes/spans verbatim; 0 rejected)
- Extraction field accuracy (vs hand-written fixtures): **100.0%** (180/180)
- Gate (canonical tickets + B1, B2, B3, B7 correct on every run): **PASS**

| Case | | Expected | Runs | Correct |
|---|---|---|---|---|
| canon-9001 | gate | HOLD / CONTRADICTS_GOVERNING | ✓ · ✓ · ✓ | 3/3 |
| canon-9002 | gate | ESCALATE / SCOPE_UNKNOWN | ✓ · ✓ · ✓ | 3/3 |
| canon-9003 | gate | ALLOW / SUPPORTED | ✓ · ✓ · ✓ | 3/3 |
| B1 | gate | HOLD / CONTRADICTS_GOVERNING | ✓ · ✓ · ✓ | 3/3 |
| B2 | gate | CAUTION / CHANGE_SIGNALLED | ✓ · ✓ · ✓ | 3/3 |
| B3 | gate | ESCALATE / CONFLICT_UNRESOLVED | ✓ · ✓ · ✓ | 3/3 |
| B4 |  | CAUTION / CHANGE_SIGNALLED | ✓ · ✓ · ✓ | 3/3 |
| B5 |  | CAUTION / CHANGE_SIGNALLED | ✓ · ✓ · ✓ | 3/3 |
| B6 |  | CAUTION / WEAK_BASIS | ✓ · ✓ · ✓ | 3/3 |
| B7 | gate | CAUTION / WEAK_BASIS | ✓ · ✓ · ✓ | 3/3 |
| allow-1day |  | ALLOW / SUPPORTED | ✓ · ✓ · ✓ | 3/3 |
| no-claim |  | ALLOW / NO_POLICY_CLAIM | ✓ · ✓ · ✓ | 3/3 |
