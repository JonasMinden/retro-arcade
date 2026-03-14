# Retro Arcade

Statische Browser-Spieleseite mit Arcade-Styling, optionalem Nutzerkonto, persistenter Scoreboard-Schicht auf Cloudflare Pages Functions + D1 und zwölf spielbaren Klassikern.

## Lokal starten

1. Im Ordner `C:\Dokumente\Code Projekte\Classic Snake` ein Terminal öffnen.
2. Für die reine Frontend-Ansicht `python -m http.server` ausführen.
3. Für Login, Sessions und persistente Scoreboards brauchst du den Cloudflare-Pages-Deploy mit D1-Binding.

## Spiele

- Snake
- Pong
- Breakout
- Tetris
- Space Invaders
- Asteroids
- Pac-Man
- Pinball
- Doodle Jump
- Helicopter Game
- Crossy Road
- Runner Game

## Infrastruktur

- `account.html` für Registrierung und Login
- `src/site-ui.js` für Header-Status, Cookie-Banner und Scoreboard-Widgets
- `functions/api/*.js` für Registrierung, Login, Logout, Session-Status, Highscore-Feed und Score-Submit
- Die Kontaktseiten/-API bleiben als vorbereitete Struktur im Repo, sind aber aktuell nicht in der Oberfläche verlinkt.

## D1 / Cloudflare Setup

1. D1-Datenbank erstellen.
2. Die SQL aus `migrations/0001_auth_and_scores.sql` ausführen.
3. In `wrangler.toml` die echte `database_id` eintragen.
4. In Cloudflare Pages das D1 Binding `DB` setzen.
5. Danach neu deployen.

## Tests

- `node src/snake-game.test.js`
- `node --input-type=module -e "await import('./src/site-ui.js'); await import('./src/ads.js'); console.log('imports ok')"`

## Monitoring

Für Besucherzahlen und Pageviews eignet sich Cloudflare Web Analytics gut. Für tiefere Events wie Sitzungsdauer, Registrierungen, gespeicherte Scores oder Spielstarts ist Workers Analytics Engine oder Zaraz sinnvoller.
