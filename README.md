# AnswerGuard

**An independent product concept for Slite Agent. Not affiliated with Slite. Synthetic data only.**

> Slite keeps the docs true. AnswerGuard checks the reply before it reaches the customer.

A support agent writes a reply. Before it's sent, AnswerGuard:

1. pulls the factual claims out of the draft (live AI),
2. finds the matching claims in the team's messy docs and Slack (live AI, every quote validated as verbatim),
3. weighs those sources with transparent, deterministic rules, and
4. returns **Allow, Caution, Hold or Escalate**, plus a rechecked safe reply and the full reasoning.

_Live demo, GIF and walkthrough links are added at deploy (Phase 4)._

## The hypothesis

Slite already has cited, permission-aware answers, drift detection, Ask Insights and a Chrome extension. This concept
tests something narrower, and it is presented as a hypothesis (Slite may have something similar internally):

- check the **agent's own draft reply** at the moment of sending, not just answer a question;
- weigh conflicting sources with **explicit, inspectable rules**, where verification is one signal among several;
- measure **customer exposure**: unsafe sends intercepted, and the false-alarm rate.

## AI vs rules

| The AI does | The rules do |
|---|---|
| Pull claims out of the draft and each source: topic, value, unit, scope, effective date, status wording, supersession sentence, **verbatim quote** | Validate every quote, assign each claim a standing, check scope, settle conflicts, compare values, pick the decision |
| Word the safe reply from given facts | Recheck the safe reply; fall back to a template if it fails |

**The AI never decides the outcome.** The decision is a pure function, `decide(extractions, sources, ticket, now)`
in [`lib/engine/decide.ts`](lib/engine/decide.ts). Every rule writes a trace entry that the Reasoning tab shows.
"The AI found nothing" is never treated as "safe": a deterministic policy-pattern detector catches timelines the AI missed.

## Architecture

```text
Browser (inbox + side panel, overrides in localStorage)
   │  POST /api/check {ticketId, rail, draft, role, overrides}
   ▼
lib/check/runCheck.ts
   1. merge overrides onto server seed  (lib/workspace/merge.ts)
   2. persona filter BEFORE extraction  (lib/workspace/permissions.ts)
   3. extract draft + sources           (lib/ai/aiDeps.ts: memory cache → saved responses → live provider → unavailable)
   4. quote validation                  (verbatim substring after whitespace/dash/quote normalization)
   5. decide()  — pure rules S, A, D0–D11 (lib/engine/)
   6. safe reply + recheck              (AI rewrite or template, both rechecked by the engine)
   ▼
CheckResult {decision, headline, claims[evidence, trace], suggestion, rejectedExtractions, ai}
```

- **AI providers:** two live providers behind one adapter ([`lib/ai/client.ts`](lib/ai/client.ts)): Groq
  (`openai/gpt-oss-120b`, strict JSON-schema output) and Google Gemini (`gemini-3.5-flash-lite`, native JSON-schema
  response). The eval decides which is primary (`AI_PROVIDER`) and which is the fallback (`AI_FALLBACK_PROVIDER`), tried
  once on a 429 or quota error before saved responses take over. An Anthropic adapter is kept, off by default.
  See [DECISIONS.md](DECISIONS.md) D-001, D-013 and D-017.
- **Saved responses:** `data/ai-cache/` holds recorded model outputs keyed by the full cache identity (task, prompt version,
  schema version, provider, model, input text, plus source kind or the safe-reply inputs). The canonical demo works with no API key.
- **Send integrity:** `POST /api/send` reruns the full check on the exact submitted text; the client's earlier result is never trusted.

## Run it

```bash
pnpm install
cp .env.example .env.local   # add GROQ_API_KEY for live AI, or set AI_MODE=saved
pnpm dev
```

| Command | What it does |
|---|---|
| `pnpm test` | Locked acceptance tests T1–T8 + cache identity + unit tests (fixtures, no network) |
| `pnpm eval` | Live-AI eval: 12 golden cases × 3 runs → `evals/results.md` |
| `pnpm eval --saved` | Replays saved responses only (no key needed) |
| `pnpm record` | Re-records `data/ai-cache/` from the live model |
| `pnpm e2e` | Playwright demo flow in saved mode |

## Limitations

- Fixed topic taxonomy (`reversal_window | other`) for the demo.
- Personas are simulated: anyone can switch. DOC-105 is synthetic. Never use this design with real restricted data.
- No real Slite or Intercom integration; all data is synthetic.

## What not to claim

- That Slite lacks this internally.
- That it connects to real Slite or Intercom data.
- That intercepted sends equal prevented customer harm.
- That the AI decides policy. The rules do, and they escalate when unsure.
- That it's production-ready. It still needs real permissions, integrations, security and legal review.
