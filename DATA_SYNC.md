# Data ownership and offline synchronization

Firestore is the shared source of truth. Browser storage is an account-scoped working cache and an outbox, never an anonymous calendar or a first-login import.

## Persisted state

- `users/{uid}/settings/calendar`: categories, emoji, activities, colors, array order, objectives (units, rules, targets, periods, presentation).
- `users/{uid}/settings/preferences`: category/activity selections, year, theme, accent, objective priority, workspace page, calendar/day views and dates, goal category/status/date filters, journal category/year/search, expanded sections.
- `users/{uid}/days/{date}`: activity membership and count/distance/duration/note per activity.
- `users/{uid}/settings/profile`: recent Google sign-ins. Google identity itself remains managed by Firebase Auth.

Only valid edits are submitted. Invalid forms remain visibly invalid; opening a modal or a transient account menu does not create a data edit.

## Offline behavior

1. A first Google sign-in and initial download require Internet.
2. A service worker preloads application assets and the Firebase modules. The profile reports when the shell is ready.
3. Firebase Auth restores the previously signed-in identity. An account-specific local cache restores that account's workspace; no other user's cache is loaded.
4. Every valid change synchronously checkpoints the full workspace and an absolute delta `{before, after}` in a separate localStorage journal for each open tab before attempting network writes. Firestore also has a persistent IndexedDB cache.
5. Closing/reloading recovers pending journals, including abandoned tabs. Reconnection or an explicit retry submits it. Transient failures retry with exponential backoff.
6. The outbox is deleted only after Firebase acknowledges all batches. The status distinguishes offline changes from confirmed remote saves.

A service worker cannot provide offline access before the first successful online preparation. Clearing site data/private browsing/storage limits can remove or prevent browser persistence. The app warns if its durable outbox cannot be saved. Background synchronization is not guaranteed while the browser is closed; reopen the app online to resume.

Sign-out is blocked while changes are pending. After successful sign-out the account's application cache/outbox is removed. Firestore's internal cache remains browser-managed; the UI remains authentication-gated.

## Conflicts

Day membership uses atomic array union/removal, and detail updates replace only the changed activity's detail map. Clearing a field therefore clears it remotely, while unrelated activities on the same day are preserved. Replaying a delta does not duplicate membership.

Two competing edits to the same activity details, configuration document or preferences document follow last acknowledged write behavior. This is not an operation-by-operation collaborative editor. A future connector should store individual source records and stable external IDs rather than overwriting whole daily aggregates.

## Verification

`NODE_PATH=<jsdom-install>/node_modules node --test tests/workspace.cjs tests/objectives.cjs tests/cloud.cjs tests/offline.cjs`

The tests exercise rapid edits, cross-activity remote concurrency, removal, cleared measurements, durable offline reload, automatic reconnect, settings/filters migration, and shell/network-cache behavior. Real Google sign-in, deployed Firestore rules, browser storage eviction, and a physical two-device offline test require the owner's devices.
