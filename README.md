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

## Backend für Accounts und Scoreboards

- `functions/api/*.js` für Registrierung, Login, Logout, Session-Status, Highscore-Feed und Score-Submit
- `migrations/0001_auth_and_scores.sql` für die D1-Tabellen
- `wrangler.toml` für Pages Functions und das D1-Binding `DB`
- `account.html` für Registrierung und Login
- `src/site-ui.js` für Header-Status, optionale Accounts, Scoreboard-Widgets und die Startseiten-Highscores

## D1 / Cloudflare Setup

1. D1-Datenbank erstellen.
2. Die SQL aus `migrations/0001_auth_and_scores.sql` ausführen.
3. In `wrangler.toml` die echte `database_id` eintragen.
4. In Cloudflare Pages das D1-Binding `DB` setzen.
5. Danach neu deployen.

## Tests

- `node src/snake-game.test.js`
- `node --input-type=module -e "await import('./src/snake-game.js'); await import('./src/pong-game.js'); await import('./src/breakout-game.js'); await import('./src/tetris-game.js'); await import('./src/space-invaders-game.js'); await import('./src/asteroids-game.js'); await import('./src/pac-man-game.js'); await import('./src/pinball-game.js'); await import('./src/doodle-jump-game.js'); await import('./src/helicopter-game.js'); await import('./src/crossy-road-game.js'); await import('./src/runner-game.js'); await import('./src/site-ui.js'); console.log('imports ok')"`

## Monitoring

Für Besucherzahlen und Pageviews eignet sich Cloudflare Web Analytics gut. Für tiefere Events wie Sitzungsdauer, Registrierungen, gespeicherte Scores oder Spielstarts ist Workers Analytics Engine oder Zaraz sinnvoller.

## Manuell prüfen

- Startseite zeigt zwölf Spiele und den Bereich `Letzte Highscores`.
- Registrierung und Login funktionieren weiterhin.
- Gäste können ohne Login spielen.
- Eingeloggte Nutzer können Scores speichern.
- Die neuen Spiele laden und reagieren auf Tastatur- sowie On-Screen-Steuerung.
- Die Texte zeigen Umlaute korrekt an.
