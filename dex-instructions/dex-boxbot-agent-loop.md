# Dex Sprint -- box-bot agent loop
> Ali, 6 May 2026.
> Build target: C:\Users\phild\Desktop\Projects\Ali-Projects\agent\
> UKCP codebase is a source of data and a posting target only -- do not add agent files to it.

---

## What to build

One PowerShell script: agent-loop.ps1
Location: C:\Users\phild\Desktop\Projects\Ali-Projects\agent\agent-loop.ps1

All config is in: C:\Users\phild\Desktop\Projects\Ali-Projects\agent\config\
Read config files at cycle start. Do not hardcode any values -- everything comes from config.

---

## Config files (read these before building -- they define all schemas and parameters)

agent/config/rules.json          -- paths, endpoints, ollama params, batch settings
agent/config/sources.json        -- source definitions (id, type, base_url, active)
agent/config/content-types.json  -- target fields, schemas, examples, inclusions, exclusions, severity criteria
agent/config/prompts.json        -- system prompt fragments per agent role

---

## Loop flow (one full cycle)

```
1. Load config (rules, sources, content-types, prompts)
2. Load entry list from rules.source_data_path (geo-content.json)
   Filter to entry_types in rules.batch (e.g. county only)
   Filter out entries that already have content in target field (not empty/null)
   Take first max_entries_per_run entries
3. For each entry:
   a. GATHER  -- fetch source content (PowerShell HTTP, not AI)
   b. EXTRACT -- POST /api/chat (AI, extractor role, think:false, format:json)
   c. SCORE   -- POST /api/chat (AI, evaluator role, think:false, format:json)
      If score < scoring_threshold: write to review-queue, skip to next entry
   d. FORMAT  -- POST /api/chat (AI, formatter role, think:false, format:json)
   e. WRITE   -- write result to processed/[entry-key]-[field].json
   f. POST    -- PATCH posting_endpoint with result (PowerShell HTTP)
4. Write cycle summary to agent.log
5. Write any escalations to escalation.log
```

---

## Gather step detail

Source type: wikipedia-sections
URL pattern: https://en.wikipedia.org/api/rest_v1/page/mobile-sections/[slug]
Slug: derive from entry name -- replace spaces with underscores.
  e.g. entry name "Devon" -> slug "Devon"
  e.g. entry name "West Yorkshire" -> slug "West_Yorkshire"

Fetch the sections response. Extract text from sections whose titles match any of:
  History, Economy, Culture, Geography, Environment, Demographics
Concatenate matching section text. Truncate to 6000 characters (well inside context window).
If fetch fails: classify error via AI (classify_error role), retry or escalate per rules.

---

## AI call structure (all calls)

POST http://localhost:11434/api/chat
Content-Type: application/json

Body:
{
  model:    rules.ollama_model,
  think:    false,
  stream:   false,
  format:   "json",
  options:  rules.ollama_options,
  messages: [
    { role: "system", content: [prompt fragment from prompts.json for this role] },
    { role: "user",   content: [assembled user message for this step] }
  ]
}

Response value: $r.message.content (JSON string, parse it)
Log per call: entry key, role, prompt_eval_count, eval_count, total_duration

---

## User message assembly per step

EXTRACT:
  "Entry: [name], Type: [type]
   Target field: [target_field] -- [content-type name]
   Inclusions: [inclusions list]
   Exclusions: [exclusions list]
   Source text:
   [gathered text]
   
   Extract content relevant to the target field. Return JSON: { extract: string }"

SCORE:
  "Content type: [content-type name]
   Severity criteria: [severity_criteria object as JSON]
   Scoring threshold: [scoring_threshold]
   Content to score:
   [extract from previous step]
   
   Return JSON: { score: number, relevant: bool, reason: string (max 15 words) }"

FORMAT:
  "Target field: [target_field]
   Schema: [schema object as JSON]
   Examples: [examples array]
   Source extract:
   [extract from EXTRACT step]
   
   Format into the target schema. Stay within word limits. Do not invent content.
   Return JSON: { [target_field]: string }"

---

## Processed file format

Write one file per successful entry+field to rules.processed_path:
Filename: [entry-key]-[field].json  e.g. county-Devon-f10.json

Content:
{
  "manifest_id": "[ISO timestamp]-[4 char random]",
  "created_at": "[ISO8601]",
  "created_by": "box-bot",
  "source_instance": "dev-local",
  "target_instance": "dev-staging",
  "content_type": "[content-type id]",
  "target_collection": "geo_content",
  "target_field": "[field]",
  "record_count": 1,
  "records": [
    {
      "entry_key": "[type:name]",
      "field": "[field]",
      "value": "[formatted content]",
      "score": [score],
      "source_url": "[url fetched]",
      "generated_at": "[ISO8601]",
      "model": "[ollama_model]",
      "status": "approved"
    }
  ]
}

---

## POST step

PATCH [posting_endpoint]/[entry-key]
Body: { "[target_field]": "[value]" }
Headers: Content-Type: application/json

The PATCH endpoint is the existing UKCP admin endpoint.
No auth token needed for localhost. If 401 received, escalate -- do not retry.

---

## Logging

agent.log -- one line per entry processed:
[timestamp] | [entry-key] | [field] | [score] | [outcome: ok/review/escalated] | [total_tokens] | [total_ms]

escalation.log -- one block per escalation:
[timestamp]
Entry: [entry-key]
Field: [field]
Step: [gather/extract/score/format/post]
Error: [error detail]
Action taken: [skipped/halted]
---

---

## Smoke test

Run against one entry only first:
- Set max_entries_per_run: 1 in rules.json
- Set fields_per_entry: ["f10"]
- Confirm processed/ file written correctly
- Confirm PATCH posted to localhost:3000
- Confirm agent.log entry written
- Report token counts and timing per step

Do not run full batch until smoke test is clean.

---

## Do not build in this sprint

- Manifest promotion UI in DataManager (separate sprint)
- Multiple simultaneous fields per entry (sequential only for now)
- Any modifications to UKCP source files
- Any files placed inside the UKCP directory
