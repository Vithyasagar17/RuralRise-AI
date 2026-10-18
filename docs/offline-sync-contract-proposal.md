# Offline progress ordering — team discussion proposal

Status: **not enabled; shared API unchanged**. The supplied guide asks Member 3 to decide offline ordering. This document makes the decision concrete for Members 3 and 5 without silently changing POST /progress.

## Current guarantee

The accepted body remains `{student_id, course_id, completed, score?}` and the response remains `{saved:true, progress:{student_id,course_id,completed,score,updated_at}}`. Unknown fields, including client_updated_at, currently return 422. The backend upserts one row per student/course. Repeating an upload creates no duplicate row, but refreshes its server timestamp. Arrival order determines the final values, so an older offline completion/score can replace a newer online value.

Member 5's queue has one record per student/course and a local revision. That prevents double-tap duplicates and incorrectly marking a newer same-device edit synced. It does not compare edits across devices. Its savedAt is local metadata and is not currently sent to the backend.

## Recommended decision for shared-device/real-data use

Use a server revision and compare-and-set, after jointly agreeing the exact fields and enabling a way to read the student's current progress. Do not rely only on an optional client_updated_at: device clocks can be wrong, clocks can move backward, and different phones may disagree.

Suggested contract to review (names are proposals, not implemented fields):

- Each saved progress record has an integer revision, initialized to 1.
- A write supplies the revision it was based on; 0 means the client has confirmed no record exists. Unknown local state must first read the current record, rather than pretending no record exists.
- The database transaction writes only if the base revision equals the stored revision, then increments it. A stale revision returns 409 with the canonical current record. A concurrent insert uses the same condition under a unique key.
- Include a client-generated event ID for retry recognition. A lost successful response followed by the same event must receive the original successful result, rather than become a false conflict. Persist event identity and result atomically with the update; define its retention before claiming durable retry recognition.
- The queue retains a 409 entry and shows a conflict state for explicit resolution. It never labels a rejected/superseded update synced or silently replaces the canonical record.
- Secure routes enforce student ownership first. A teacher remains read-only. Cross-account rows never upload merely because another person signs in on the device.

This needs an agreed model change, new migration, updated API documentation, queue changes and tests on both JSON and PostgreSQL. Existing migration files must not be edited. We will implement it after Members 1/3/5 agree the contract and UI handling.

## Available demo decision

For the current fictional, single-device demonstration, the team can explicitly retain the existing arrival-order behavior and state its limitation. That needs no interface change. It must not be described as conflict-safe multi-device synchronization.

## Acceptance cases after agreement

Test same-device edits during an upload; double taps; lost successful responses and retries; two devices starting from the same version; an old offline event after a newer online change; incorrect device clocks; first write races; account switch/logout/token expiry; 409 UI resolution; database/server restart; and preservation of every pending entry when synchronization cannot complete.
