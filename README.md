# Retro Arcade

Statische Browser-Spieleseite mit Arcade-Styling, optionalem Nutzerkonto, persistenter Scoreboard-Schicht auf Cloudflare Pages Functions + D1 und acht spielbaren Klassikern.

## Lokal starten

1. Im Ordner `C:\Dokumente\Code Projekte\Classic Snake` ein Terminal oeffnen.
2. Fuer reine Frontend-Ansicht weiterhin `python -m http.server` ausfuehren.
3. Fuer Login, Sessions und Scoreboards brauchst du Cloudflare Pages Functions + D1 im Deploy oder eine lokale Wrangler-Session.

## Spiele

- Snake
- Pong
- Breakout
- Tetris
- Space Invaders
- Asteroids
- Pac-Man
- Pinball

## Backend fuer Accounts und Scoreboards

Neue Bausteine:

- `functions/api/*.js` fuer Registrierung, Login, Logout, aktuelle Session und Scoreboard-APIs
- `migrations/0001_auth_and_scores.sql` fuer die D1-Tabellen
- `wrangler.toml` als Grundlage fuer Pages Functions + D1 Binding
- `account.html` fuer Registrierung und Login
- `src/site-ui.js` fuer Header-Status, Scoreboard-Widgets und Account-Handling

## D1 / Cloudflare Setup

1. D1-Datenbank erstellen.
2. Die SQL aus `migrations/0001_auth_and_scores.sql` ausfuehren.
3. In `wrangler.toml` die echte `database_id` eintragen.
4. Sicherstellen, dass in Cloudflare Pages das D1 Binding `DB` gesetzt ist.

## Tests

- `node src/snake-game.test.js`
- `node --input-type=module -e "await import('./src/pong-game.js'); await import('./src/breakout-game.js'); await import('./src/tetris-game.js'); await import('./src/space-invaders-game.js'); await import('./src/asteroids-game.js'); await import('./src/pac-man-game.js'); await import('./src/pinball-game.js'); await import('./src/snake-game.js'); console.log('imports ok')"`

## Monitoring

Fuer Besucherzahlen und Pageviews eignet sich Cloudflare Web Analytics gut. Fuer tiefere Events wie Sessiondauer, Registrierungen oder Score-Submits ist Workers Analytics Engine oder Zaraz sinnvoller, weil du damit eigene Events sauber messen kannst.

## Manuell pruefen

- Startseite zeigt alle acht Spiele im Arcade-Look.
- Account-Seite laedt und Formulare reagieren.
- Scoreboards werden auf Spieleseiten geladen.
- Pac-Man ist langsamer, nutzt ein groesseres Labyrinth und hat Power-Kugeln.
- Asteroids hat ein klareres Raumschiff.
- Pinball ist spielbar.
- Favicon wird geladen.
