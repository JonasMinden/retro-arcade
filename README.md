# Retro Arcade

Kleine statische Browser-Spieleseite mit einheitlichem Arcade-Styling und sieben spielbaren Klassikern: Snake, Pong, Breakout, Tetris, Space Invaders, Asteroids und Pac-Man.

## Lokal starten

1. Im Ordner `C:\Dokumente\Code Projekte\Classic Snake` ein Terminal oeffnen.
2. `python -m http.server` ausfuehren.
3. `http://localhost:8000/` im Browser oeffnen.

## Struktur

- `index.html` ist die Startseite der kompletten Arcade-Sammlung.
- `games/snake/index.html`, `games/pong/index.html`, `games/breakout/index.html`, `games/tetris/index.html`, `games/space-invaders/index.html`, `games/asteroids/index.html` und `games/pac-man/index.html` sind die spielbaren Seiten.
- `styles.css` enthaelt das gemeinsame Arcade-Styling mit Cabinet-Look, Pixel-Art-Karten und Spielseiten-Rahmen.
- `src/*.js` enthaelt die Spielmodule fuer alle sieben Titel sowie die Werbevorbereitung.
- `privacy.html` und `impressum.html` enthalten die Rechtsseiten.

## Tests

- `node src/snake-game.test.js`
- `node --input-type=module -e "await import('./src/pong-game.js'); await import('./src/breakout-game.js'); await import('./src/tetris-game.js'); await import('./src/space-invaders-game.js'); await import('./src/asteroids-game.js'); await import('./src/pac-man-game.js'); await import('./src/snake-game.js'); console.log('imports ok')"`

## Cloudflare Pages

Fuer dieses Projekt brauchst du keinen Build-Schritt:

- Build command: leer lassen
- Build output directory: `.`

## Werbung spaeter aktivieren

1. AdSense-Konto freischalten lassen.
2. In `src/site-config.js` `adsenseClient` eintragen.
3. `enableAds` auf `true` setzen.
4. Pro Slot eine echte AdSense Slot-ID in `adSlots` eintragen.
5. `ads.txt` mit der echten Google-Zeile ersetzen.
6. Vor Aktivierung fuer EEA/UK/Schweiz ein passendes Consent-Setup einbauen.

## Manuell pruefen

- Startseite zeigt alle sieben Spiele im Arcade-Look.
- Snake, Pong, Breakout, Tetris, Space Invaders, Asteroids und Pac-Man sind erreichbar.
- Wave-1-Steuerung funktioniert weiter.
- Space Invaders: Bewegung, Schiessen, Lebensverlust und neue Wellen funktionieren.
- Asteroids: Drehen, Schub, Schuesse und Asteroiden-Splits funktionieren.
- Pac-Man: Pellets zaehlen runter, Geister bewegen sich, Leben werden bei Treffer abgezogen.
- Impressum, Datenschutz und Werbe-Platzhalter sind weiterhin erreichbar.
