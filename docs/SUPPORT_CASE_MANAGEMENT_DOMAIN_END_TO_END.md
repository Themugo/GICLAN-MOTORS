# Support Case Management — End to End

The support domain now has one canonical ticket controller and one canonical frontend service. Customer access is owner-scoped; internal messages are restricted to support agents; status transitions are explicit; ticket numbers and SLA timestamps are persisted; admin compatibility routes reuse the same controller. The database migration adds missing operational fields, indexes and deny-by-default RLS for direct authenticated access.

## Status lifecycle
`open -> in_progress/waiting_on_internal/escalated/closed`
`in_progress -> waiting_on_user/waiting_on_internal/resolved/escalated/closed`
`waiting_on_user -> in_progress/resolved/escalated/closed`
`waiting_on_internal -> in_progress/resolved/escalated/closed`
`escalated -> in_progress/resolved/closed`
`resolved -> closed/in_progress`
`closed -> terminal`

## SLA
New tickets receive a 1-hour first-response target and 24-hour resolution target. Actual timestamps and met/not-met results are persisted.
