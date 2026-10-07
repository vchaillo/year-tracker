# Firebase setup

The application is hosted on GitHub Pages and uses Firebase Authentication and Cloud Firestore.

1. Create a Firebase project on the Spark plan. Analytics is optional and unused.
2. Register a Web app. Firebase Hosting is not required; GitHub Pages remains the host.
3. Copy the public web configuration into `firebase-config.js`.
4. Enable Authentication > Sign-in method > Google. Select a support email.
5. In Authentication > Settings > Authorized domains, add `vchaillo.github.io` (a domain only, without a path).
6. Create the default Cloud Firestore database in Standard edition, in a European location, in production mode.
7. Publish the contents of `firestore.rules` in Firestore > Rules. These rules restrict all user paths to their authenticated owner.
8. Test Google sign-in, save, reload, a second device, logout, and access isolation between two accounts.

## Data model

- `users/{uid}/settings/calendar`: categories, activities and schema versions.
- `users/{uid}/days/{YYYY-MM-DD}`: activity IDs for a day. Empty arrays record deletions.
- `users/{uid}/settings/preferences`: selected category, activity filters by category and displayed year.

Day writes update only changed dates. The category/activity configuration is one document; simultaneous edits to that configuration use last-write-wins. Simultaneous edits to the same day also use last-write-wins.

## Existing data

New accounts start with no categories, activities or calendar entries. LocalStorage is never read or imported. Existing cloud accounts retain their data.

## Offline and errors

Unauthenticated use is disabled. Initial account loading requires a server connection. Firestore uses its default in-memory cache; there is no persistent offline mode in this first version. Pending writes show a synchronization indicator; failed writes can be retried by clicking that indicator. Do not close the page with unsaved changes. Logging out is blocked while writes remain pending.

## Verification

JavaScript syntax and mocked regression checks cover direct day toggles, modal save/cancel, preservation of other activities, empty-day deletions, isolated persistence baselines, queued writes and empty new accounts. Real Google OAuth, security rules and multi-device behavior require browser verification.

The Firebase web configuration is public application configuration. Never place service-account credentials, admin keys, or passwords in this repository.
