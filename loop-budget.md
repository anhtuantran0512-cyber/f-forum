# Loop Budget — F-Forum

> Primary loop: **Daily Triage** (scaffolded by loop-init)

## Daily limits

| Loop | Max runs/day | Max tokens/day | Max sub-agent spawns/run |
|------|--------------|----------------|--------------------------|
| Daily Triage | 2 | 100k | 0 (L1) / 2 (L2) |

## On budget exceed

1. Pause schedulers (scheduler_delete or disable automations)
2. Append event to `loop-run-log.md`
3. Notify human (Slack / issue / STATE.md High Priority)

## Kill switch

- Command or issue label: `loop-pause-all`
- Resume only after human clears the flag in STATE.md

## Resource guards (F-Forum)

- Đĩa hệ thống < 3GB trống → dừng mọi thao tác ghi file mới, escalate.
- Chỉ dọn cache tái tạo được (`~/.npm/_npx`, npm cache, `~/.cache/chromium`).

## Estimate spend

```bash
npx @cobusgreyling/loop-cost --pattern daily-triage
```
