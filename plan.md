# Active Users - Ping Monitoring & Response Indicator

- Added a response time (ms) indicator next to the reload and active users icons in the Desk navbar.
- Implemented 5-second ping timeout logic to `frappe.ping`:
  - If no response within 5 seconds, plays an alert sound (`public/sounds/error.mp3`).
  - Marks connection as lost and shows 999 ms in red.
  - When connection is restored, triggers an automatic reload via `window.clearCacheAndReload()`.
- Ping runs every 5 seconds, pauses when the tab is hidden, and resumes on visibility.
- Sound is enabled on first user interaction (click/touch) due to browser policies.

Files updated:

- `active_users/public/js/active_users_bundle.js`

Assets used:

- `active_users/public/sounds/error.mp3`

Notes:

- This mirrors the logic used in `posawesome` Navbar with adjustments for a 5-second timeout and integration into the Active Users navbar item.

Simplification (latest):

- Removed class-based ping state/methods from `ActiveUsers` to reduce coupling and complexity.
- Added a minimal standalone ping monitor (IIFE) at the bottom of `active_users_bundle.js` that:
  - Ensures the ping element exists beside reload.
  - Measures ping every 5s with a 5s timeout, plays sound on loss, auto-reloads on restore.
  - Handles sound enabling on first user interaction.
