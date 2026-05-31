# Task: Append-Only Event Store

## Summary

Every database (Postgres, SQLite, MongoDB) survives crashes the same way: write to an append-only log first. If the process dies, the file is intact. On restart, replay the log to rebuild state.

Build the smallest version of this: a key-value store on top of an append-only file with an in-memory index.

## What To Build

A small HTTP service that stores events in an append-only log and reads them back by ID, even after a restart. Use whatever language and framework you're comfortable with.

**Storage:** the log file *is* the database. **Do not** use SQLite, MongoDB, or a JSON file you rewrite. The on-disk format is one JSON object per line in `events.log`, and the in-memory index is rebuilt from that file on startup.

### Core requirements

1. **Append-only log**: each event is one JSON line ending in `\n`, appended to `events.log`. Never overwrite or delete — use whatever append-mode file API your language provides.
2. **In-memory index**: `Map<eventId, { offset, length }>`. Reads use this to seek directly to the right slice of the file.
3. **API**:
   - `POST /events`: take any JSON body, generate an ID (UUID v4), stamp `{ id, createdAt }`, append, update the index, return 201 with the full event.
   - `GET /events/:id`: look up the index, read exactly `length` bytes at `offset`, parse, return. 404 if not in the index.
   - `GET /stats`: `{ total, bytes }`.
4. **Recovery on startup**: stream `events.log`, rebuild the index from byte offsets, and print how many events were recovered.
5. **Restart test**: start the server, POST a few events (record their IDs), stop the server, restart, confirm every `GET /events/:id` still works and recovery logs the correct count.

### Deliverables

1. Working server. The restart test above should pass end-to-end.
2. A `README.md` in the repo (this is your write-up — keep it simple and practical). It should cover:
   - **Setup**: install + start instructions, and `curl` commands for every endpoint.
   - **An architecture diagram** of the log + in-memory index, showing how a `POST /events` write and a `GET /events/:id` read flow through both.
   - **The core concepts in your own words**: why append-only is safer than overwriting in place, and why an index makes reads fast.
   - **A screenshot of the recovery log** after a restart, showing the number of events rebuilt from the file.
   - **What you struggled with**: the bugs you hit, the things that didn't work the first time, the moments you were stuck.
   - **What you learned**: concepts, patterns, language/framework features, or debugging techniques that were new to you.
   - **Resources you consulted**: articles, docs, Stack Overflow threads, AI prompts, videos — anything that helped. Link them.
   - **Why this project made you a better backend developer**: be specific. What can you do now that you couldn't before? Which production scenarios will you think about differently?
3. A **demo video — 30 seconds maximum**. Screen recording showing: a few writes → stop the server → restart → recovery log line → reads of previously-written IDs still work. No voiceover required, but must be visually clear. Upload to YouTube (unlisted), Google Drive, or Loom. **One submission only — no retakes.**

## What We're Looking For

- Append-only discipline: no overwrites or in-place edits.
- Accurate offset and length tracking, including events with unicode.
- `GET /events/:id` uses the index to seek directly — it does not scan the whole file.
- Recovery rebuilds the index correctly from the log alone.
- You can explain _why_ append-only is safer than overwriting, and _why_ an index makes reads fast.

## Marking (Implementation: 50 / README + Demo Video: 50)

The implementation below is worth **50 marks**. The README write-up and demo video account for the other **50** (total **100**). See `STAGE7_OVERVIEW.md` for the README + demo breakdown.

| # | Criterion | Marks |
|---|---|---|
| 1 | `POST /events` stamps `{ id, createdAt }`, appends, returns 201 with the full event | 6 |
| 2 | Strictly append-only: one JSON object per line in `events.log`, no overwrites | 6 |
| 3 | In-memory index `Map<id, { offset, length }>` is maintained on every write | 8 |
| 4 | `GET /events/:id` seeks via `offset`/`length` (does **not** scan the whole file) | 10 |
| 5 | `GET /events/:id` returns 404 when the ID is not in the index | 4 |
| 6 | `GET /stats` returns `{ total, bytes }` correctly | 4 |
| 7 | On startup, log is streamed, index is rebuilt, recovered count is logged | 8 |
| 8 | Restart test passes: every recorded ID is still readable after stop/start | 4 |
| | **Total** | **50** |
