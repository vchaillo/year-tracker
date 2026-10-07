# Firebase setup

This branch requires configuration before merging into the GitHub Pages branch.

1. Create a Firebase project on the Spark plan. Analytics is optional and unused.
2. Register a Web app. Firebase Hosting is not required; GitHub Pages remains the host.
3. Copy the public web configuration into `firebase-config.js`.
4. Enable Authentication > Sign-in method > Google. Select a support email.
5. In Authentication > Settings > Authorized domains, add `vchaillo.github.io` (a domain only, without a path).
6. Create the default Cloud Firestore database in Standard edition, in a European location, in production mode.
7. Publish the contents of `firestore.rules` in Firestore > Rules. These rules restrict all user paths to their authenticated owner.
8. Test Google sign-in, import, save, reload, a second device, logout, and access isolation between two accounts. Then merge this branch.

## Data model

- `users/{uid}/settings/calendar`: categories, activities and schema versions.
- `users/{uid}/days/{YYYY-MM-DD}`: activity IDs for a day. Empty arrays record deletions.
- Filters and the displayed year are session UI state, not cloud data.

Day writes update only changed dates. The category/activity configuration is one document; simultaneous edits to that configuration use last-write-wins. Simultaneous edits to the same day also use last-write-wins.

## Existing data

New accounts receive example categories and activities with no calendar entries. A valid legacy `year-tracker-v2` localStorage value triggers an explicit import choice only for an account without cloud settings. The original local value remains untouched as a backup. Existing cloud data takes priority and is never replaced by an automatic local import.

## Offline and errors

Unauthenticated use is disabled. Initial account loading requires a server connection. Firestore uses its default in-memory cache; there is no persistent offline mode in this first version. Pending writes show a synchronization indicator; failed writes can be retried by clicking that indicator. Do not close the page with unsaved changes. Logging out is blocked while writes remain pending.

## Verification

JavaScript syntax and mocked persistence-controller checks pass: authentication gate, empty account, per-day writes, deletions, retry, logout, and explicit legacy import. Real Google OAuth, deployed security rules, browser layout, and multi-device behavior still require verification with a configured Firebase project.

The Firebase web configuration is public application configuration. Never place service-account credentials, admin keys, or passwords in this repository.
