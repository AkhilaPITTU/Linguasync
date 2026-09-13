# Secure Conversation PDF Download — Implementation Report

## 1. What was built

Every LinguaSync participant can now download their own view of a past
meeting's conversation as a professional, Unicode-correct PDF in their
preferred language, cryptographically signed by the server. Anyone can
later upload that PDF to a verification endpoint to confirm it is
authentic and unmodified. Every export and every verification is logged
and recorded in MongoDB.

The feature is fully additive: no existing route, controller, service,
schema, model, WebSocket handler, or database collection was changed in
a way that alters its behavior. Two existing files (`config/database.py`,
`config/settings.py`) each received a small, additive block; `main.py`
received two lines to register the new router; `RecentCalls.jsx/css`,
`Sidebar.jsx`, and `AppRoutes.jsx` each received a small, additive
insertion. Everything else is new files.

## 2. Files touched

### New backend files
- `backend/app/config/signing_config.py` — manages the server's signing identity (private key + self-signed certificate), generated once and reused.
- `backend/app/services/pdf_signature_service.py` — the only module that signs or verifies a PDF's cryptographic signature.
- `backend/app/services/conversation_pdf_service.py` — renders one participant's conversation into PDF bytes (layout, pagination, per-language fonts).
- `backend/app/services/conversation_export_service.py` — orchestrates authorization, reuses `meeting_service.get_meeting_history`, merges transcript/translation/chat records, calls the PDF + signature services, persists export metadata, and logs every export/verify event.
- `backend/app/controllers/conversation_export_controller.py` — HTTP-facing auth + error handling (JWT check, 401/403/404/400/500 mapping).
- `backend/app/routes/conversation_export_routes.py` — three endpoints (export, verify, public certificate) under `/api/conversation`.
- `backend/app/assets/fonts/*.ttf` — 9 embedded Noto font families (18 files, Regular + Bold), one per script LinguaSync supports.

### Backend files edited (additive only)
- `backend/app/config/database.py` — added `pdf_exports_collection = database["pdf_exports"]`.
- `backend/app/config/settings.py` — added `TRANSCRIPT_EXPORT_FOLDER` (this env var already existed, unused, in `.env.example`).
- `backend/app/main.py` — imported and registered the new router (2 lines).
- `backend/requirements.txt` — added `reportlab`, `pyhanko`, `pyhanko-certvalidator`, `asn1crypto`, `arabic-reshaper`, `python-bidi`; `cryptography` pinned explicitly (already an indirect dependency via `python-jose[cryptography]`).
- `backend/.env.example` — documented the new `PDF_SIGNING_CERT_DIR` variable.
- `backend/.gitignore` — added `certs/` so the private signing key can never be committed.

### New frontend files
- `frontend/src/services/conversationExportService.js` — calls the export/verify endpoints, triggers the browser download, parses blob-encoded error responses.
- `frontend/src/pages/VerifyPdfPage.jsx` + `.css` — the "Verify PDF" page (upload a PDF, see Valid/Invalid/Unsigned with details).

### Frontend files edited (additive only)
- `frontend/src/components/dashboard/RecentCalls.jsx` — added a "Download PDF" button per call with a loading state, reusing the existing `showToast` pattern for success/error.
- `frontend/src/components/dashboard/RecentCalls.css` — styles for that button.
- `frontend/src/components/dashboard/Sidebar.jsx` — added a "Verify PDF" nav entry.
- `frontend/src/routes/AppRoutes.jsx` — added the protected `/verify-pdf` route.

Nothing in `websocket/`, `translation_service.py`, `auth_*`, or any other existing controller/service/route/schema/model was touched.

## 3. Architecture

```
GET  /api/conversation/{meeting_id}/export-pdf?language=...
        -> conversation_export_controller  (JWT check via existing get_user_id)
        -> conversation_export_service.export_conversation_pdf
               -> meeting_service.get_meeting_history   (REUSED, unmodified)
               -> conversation_pdf_service.build_conversation_pdf   (reportlab)
               -> pdf_signature_service.sign_pdf_bytes              (pyHanko + server key)
               -> pdf_exports_collection.insert_one(...)             (MongoDB log)
        <- signed PDF bytes, Content-Disposition: attachment

POST /api/conversation/verify-pdf   (multipart file upload)
        -> conversation_export_controller
        -> conversation_export_service.verify_conversation_pdf
               -> pdf_signature_service.verify_pdf_bytes  (pyHanko, trust root = our own cert)
               -> pdf_exports_collection.find_one/update_one (correlate + log)
        <- { signature_valid, document_modified, verification_status, ... }

GET  /api/conversation/signing-certificate
        -> returns the PUBLIC certificate (never the private key) as a .pem download
```

Authorization reuses the exact same rule `meeting_service.get_meeting_history`
already enforces: only a user whose `user_id` appears in the meeting's
`participants` list can retrieve conversation data, and each participant
only ever gets *their own* translated view (transcripts owned by them,
plus `translations_collection` records where `recipient_id == user_id`).
No new authorization logic was invented — the export service simply
cannot ask for anyone else's data.

## 4. PDF generation workflow

1. `conversation_export_service` calls the existing `get_meeting_history(meeting_id, user_id)` — the same function `GET /api/meeting/{id}/history` already uses.
2. It merges the three record types it returns into one chronological list. For each conversation turn:
   - If the viewer spoke it, the turn is shown in whatever language they actually spoke (their `source_language`/`language` on the transcript record).
   - If someone else spoke it, the turn is shown using the translation **already generated for this viewer** by the live pipeline (`translations_collection`, filtered by `recipient_id == user_id`) — nothing is re-translated.
   - Chat messages are merged in the same way and interleaved by timestamp.
3. `conversation_pdf_service.build_conversation_pdf` renders this with `reportlab`'s `Platypus` flowables (`SimpleDocTemplate` + `Paragraph`), which paginates automatically for long conversations and repeats a header/footer via `onFirstPage`/`onLaterPages`.
4. **Font handling**: structural text (title, "Meeting ID:", participant list, speaker names, timestamps) always uses a Latin font (`NotoSans`), because these Noto script fonts (Devanagari, Telugu, Tamil, Kannada, Bengali, Gujarati, Gurmukhi, Naskh Arabic) deliberately contain **no Latin letters**. Each conversation line's *body text* independently selects the correct embedded font for *that line's own language* — a viewer's own English words and another participant's Hindi-translated words can legitimately sit on the same page, each in the correct script. Urdu is additionally reshaped/right-to-left ordered via `arabic_reshaper` + `python-bidi` before rendering. This mixed-font-per-line behavior was caught and fixed during testing (see §7).
5. The Document ID is embedded in the PDF's own `/Subject` metadata field, so a later verification can look up the matching export-log entry.

## 5. Digital signature workflow (the actual security mechanism)

This is a **real PAdES-style PKCS#7/CMS cryptographic signature**, not a
watermark or checksum:

1. On first use, `signing_config.py` generates a 2048-bit RSA key pair and a self-signed X.509 certificate (`CN=LinguaSync Conversation PDF Signing`), and writes them to `backend/certs/pdf_signing/` (path configurable via `PDF_SIGNING_CERT_DIR`). This identity is reused for every export from then on — it is generated once, not per document.
2. `pdf_signature_service.sign_pdf_bytes` uses `pyHanko` to append an **incremental update** to the PDF containing a PKCS#7/CMS signature over every byte written so far, computed with the server's private key (RSA-2048 / SHA-256).
3. Because the signature is a hash-then-sign over the literal bytes of the document up to that point, **any edit to the PDF afterwards** (in Acrobat, a text editor, any tool) changes those bytes. Re-verifying recomputes the hash over the (now different) bytes, it no longer matches what was signed, and the signature reports `intact: False`.
4. Verification (`verify_pdf_bytes`) uses `pyHanko` to parse the embedded signature, validate it cryptographically against the server's own certificate (the sole trust anchor — this is intentionally a private/internal signer, not a publicly-trusted CA, since the question being answered is "did LinguaSync produce and leave this untouched", not "is this notarized by a public authority"), and reports `signature_valid` / `document_modified`.
5. The public certificate (never the private key) can be downloaded from `GET /api/conversation/signing-certificate` for anyone who wants to independently verify a LinguaSync signature outside the app.

**Important operational note**: the private key lives on disk at
`backend/certs/pdf_signing/` (gitignored). If that directory is deleted
or regenerated, every previously issued signature becomes unverifiable
by this server (it would need the *original* key to still validate old
documents) — back this directory up like any other credential, and do
not regenerate it casually.

## 6. Verification workflow

`POST /api/conversation/verify-pdf` (multipart file upload, JWT-authenticated
like every other endpoint) returns one of:

- **Signature Valid / Document Authentic** — `signature_valid: true`, `document_modified: false`, plus signer name, signing time, and (if the Document ID could be matched back to the export log) the original meeting ID, language, and generation timestamp.
- **Signature Invalid / Document Modified** — `signature_valid: false`, `document_modified: true` — the byte-level hash no longer matches what was signed.
- **No LinguaSync signature found** — for any PDF that was never exported by this feature.

Every verification attempt updates the corresponding `pdf_exports`
document's `verification_status`/`last_verified_at`/`last_verified_by`
fields (when the Document ID correlates to one), and is logged via
Python's standard `logging` module either way.

## 7. Testing performed

FastAPI/Motor could not be executed against the real Windows venv from
this environment, so extensive testing was done first with the exact
production code by copying it into an isolated Python 3.11 sandbox with
the same library versions this feature adds, before any file was written
into the project:

- **Unit-level**: built PDFs in English, Hindi, Telugu, Urdu (RTL) with 120-turn conversations; confirmed correct pagination (7–12 pages), signed each, verified `signature_valid: True`, flipped a byte, confirmed `signature_valid: False` / `document_modified: True` for all four languages.
- **Mixed-script regression**: an initial version chose one font for the whole document, which silently dropped every Latin character when a Devanagari font was selected (these fonts contain no Latin glyphs) — this was caught by rendering test output to PNG and inspecting it, then fixed by resolving fonts per conversation line instead of per document. Re-verified visually afterwards.
- **Integration-level**: mocked MongoDB collections and `get_meeting_history` to exercise `export_conversation_pdf`/`verify_conversation_pdf` end-to-end: correct participant sees their own words untouched and others' words in the already-generated translation, a non-participant is refused (403), a missing meeting 404s, export metadata is written with the right fields, and verify correlates back to the export record.
- **HTTP-level**: mounted the actual FastAPI router with `TestClient` and drove real HTTP requests (including real JWTs signed with `create_access_token`): 401 for an invalid token, 404/403 for meeting/participant checks, 200 with `application/pdf` + `Content-Disposition` for a real download, multipart upload verification (valid, tampered, non-PDF-rejected), and the public certificate endpoint.
- **A real, subtle async bug was caught and fixed this way**: pyHanko's synchronous `sign_pdf`/`validate_pdf_signature` convenience functions internally call `asyncio.run()`, which raises `RuntimeError: asyncio.run() cannot be called from a running event loop` when invoked from inside a FastAPI async endpoint. Fixed by running both calls via `asyncio.to_thread(...)` in `conversation_export_service.py` — the same pattern the existing codebase already uses for `translation_service.translate` in the live meeting pipeline. Without the HTTP-level test this would only have surfaced once deployed.
- All finished files were copied onto the real project and their MD5 checksums verified to match the tested versions byte-for-byte; the six new backend modules were also `py_compile`-checked directly on the real project tree.

## 8. Manual testing steps (for you to run locally)

1. `cd backend && pip install -r requirements.txt` (installs `reportlab`, `pyhanko`, and the other new dependencies into whichever venv you use).
2. Start the backend as usual (`python run.py`); on first request to any `/api/conversation/...` route it will auto-generate `backend/certs/pdf_signing/` (private key + self-signed cert) — check the log/folder appears.
3. `cd frontend && npm run dev` — no new npm packages were required.
4. Log in, join/host a meeting with at least one other participant so some conversation exists, end it.
5. Go to **Call History** — each entry now has a **Download PDF** button. Click it; confirm a PDF downloads, opens correctly, shows the right meeting id/participants/timestamps, and the conversation is in your own preferred language.
6. Log in as a different participant of the *same* meeting and download theirs — confirm it's their own view (own words in their language, others' words translated for them), not identical to the first user's file.
7. Try calling `GET /api/conversation/{meeting_id}/export-pdf` for a meeting you did *not* participate in (e.g. via curl with a valid token for an unrelated user) — confirm `403`.
8. Go to the new **Verify PDF** page (sidebar). Upload the PDF from step 5 — confirm "Signature Valid / Document Authentic" with the meeting id, signer, and timestamp shown.
9. Open that same PDF in any editor/viewer that lets you save a change (or just append a byte with a hex editor / `echo x >> file.pdf`), re-upload it to Verify PDF — confirm "Signature Invalid / Document Modified".
10. Upload an unrelated PDF (not from LinguaSync) — confirm it reports no LinguaSync signature was found, without crashing.
11. Check MongoDB's new `pdf_exports` collection — confirm one document per download with `user_id`, `meeting_id`, `document_id`, `language`, `generated_at`, `signature_algorithm`, `exported_by`, `verification_status` (and that it flips to `valid`/`tampered` after steps 8–9).
12. Confirm nothing else regressed: live meeting transcription/translation, chat, existing Chat History / Translation History / Recent Calls pages, login/register, and invitations all behave exactly as before.

## 9. Known limitations

- **Trust model is self-signed, by design.** The signature proves "this exact server produced and has not altered this PDF since," verifiable by anyone who trusts (or is handed) LinguaSync's own public certificate at `/api/conversation/signing-certificate`. It is not chained to a publicly trusted CA, so a generic PDF viewer's "trusted" checkmark won't light up on its own — only LinguaSync's own Verify PDF page (or a party who has imported the certificate) can confirm authenticity today.
- **Signing identity must persist.** If `backend/certs/pdf_signing/` is deleted/regenerated (e.g., a fresh deploy with no persistent disk), older exported PDFs can no longer be verified by the new key. Treat that folder like any other credential — back it up, don't recreate it casually across environments that need to keep verifying old exports.
- **Urdu rendering** uses `arabic_reshaper` + `python-bidi` for correct right-to-left shaping; this covers standard Arabic-script joining correctly (verified visually) but uses a Naskh-style font rather than the more decorative Nastaliq calligraphic style sometimes associated with Urdu specifically.
- **No revocation/timestamp authority** is used (no OCSP/CRL, no RFC 3161 timestamp token) — verification checks the signature and certificate as of now, not "as of a trusted point in time." Adequate for tamper-evidence, but a signed PDF's certificate validity window (10 years, configurable) is the only time bound today.
- Exported PDFs are also written to `backend/transcript_exports/signed/` on the server as an audit copy (mirroring the folder layout that already existed in the repo); this was not asked for but keeps a server-side record independent of what a user does with their downloaded copy. Disk cleanup/retention policy for that folder was not addressed, matching how `uploads/`/`generated_audio/` are already handled today.
