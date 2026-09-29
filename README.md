# Farm Tracker

Farm Tracker by All Pro Digital, a Valley Pro Logistics LLC company. Phone-first PWA for a working farm: fields (status, where it stands, next to do, notes, spray and harvest records, status history) and tractors (hours, service intervals with due/overdue, service and repair log). v1.3 adds a quick-action taskbar, voice notes, photos, service reminders and calendar files, printable records and backup/restore. Data stays on the phone (localStorage + IndexedDB for photos).

See [PLAN.md](PLAN.md) for scope and data model. Static site, no build step: serve the folder. Icons: `python3 tools/make_icon.py && node tools/render_icons.js`.
Tests (headless Chrome, iPhone viewport): `node tools/test.js <url> [shotsDir]` and `node tools/test13.js <url> [shotsDir]` (mocks speech, notifications, print and camera).
