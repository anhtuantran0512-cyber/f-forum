# Loop Run Log — F-Forum

Append one entry per run. Prune entries older than 30 days.

## Format

```json
{
  "run_id": "2026-06-09T08:15:00Z",
  "pattern": "daily-triage",
  "duration_s": 45,
  "items_found": 4,
  "actions_taken": 1,
  "escalations": 0,
  "tokens_estimate": 52000,
  "outcome": "report-only | fix-proposed | escalated | no-op"
}
```

## Recent Runs

<!-- Loop appends below this line -->

```json
{
  "run_id": "2026-10-19T01:50:00+07:00",
  "pattern": "daily-triage",
  "duration_s": 2400,
  "items_found": 3,
  "actions_taken": 1,
  "escalations": 1,
  "tokens_estimate": 45000,
  "outcome": "fix-proposed",
  "notes": "Fix og:image: PNG ngoai 10.4MB -> tu host 113KB (1200x630), verifier doc lap APPROVE (kiem pixel-level). Escalate: avatar admin 10.4MB (dung server - cho Sep), noi dung og-cover (cho Sep). L1 scan: toan bo xanh."
}
```

```json
{
  "run_id": "2026-10-19T15:30:00+07:00",
  "pattern": "human-attended",
  "duration_s": 5400,
  "items_found": 1,
  "actions_taken": 1,
  "escalations": 1,
  "tokens_estimate": 120000,
  "outcome": "fixed",
  "notes": "Ma hoa dinh danh Super Admin theo chi dao 'ma hoa' cua Chu tich: gom email + mat khau mau cu vao shared/identityStrings.ts (che giau charCode); bootstrap doi sang verifyPassword voi bam scrypt mac dinh (nguyen van bi xoa); ~120 vi tri literal trong server/src/tests/docs thay bang import. Rang buoc 'server/forumServer.ts khong dung' duoc Chu tich nang bang chi dao truc tiep. Verifier doc lap APPROVE (tai lap bam scrypt bang chung, e2e login 2 duong deu 200, 475/475 test). Ton dong: lich su git + HEAD cu van chua nguyen van -> cho Sep quyet private/rewrite; canh bao artifact build cu (da ghi chu rebuild)."
}
```

```json
{
  "run_id": "2026-10-19T13:07:46+07:00",
  "pattern": "human-attended",
  "duration_s": 420,
  "items_found": 1,
  "actions_taken": 1,
  "escalations": 0,
  "tokens_estimate": 12000,
  "outcome": "fixed",
  "notes": "Doi ten nhanh theo chi dao Chu tich qua GitHub API (giu lich su PR): f-forum-broamstuck-v2.5 -> f-forum_v1; fix_4 -> f-forum_v2; arena/62613a87-f-forum -> f-forum_v3. Chot luat moi: moi lan sua doi chi sua dung 1 nhanh roi push/FF len main; cap nhat AGENTS.md, loop-constraints.md, STATE.md."
}
```
