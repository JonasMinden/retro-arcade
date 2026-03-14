# Retro Arcade

Kleine statische Browser-Spieleseite mit einer Startseite, Arcade-Styling und der ersten Spielwelle aus Snake, Pong, Breakout und Tetris.

## Lokal starten

1. Im Ordner `C:\Dokumente\Code Projekte\Classic Snake` ein Terminal oeffnen.
2. `python -m http.server` ausfuehren.
3. `http://localhost:8000/` im Browser oeffnen.

## Struktur

- `index.html` ist die Startseite der Spielesammlung.
- `games/snake/index.html`, `games/pong/index.html`, `games/breakout/index.html` und `games/tetris/index.html` sind die spielbaren Seiten aus Wave 1.
- `styles.css` enthaelt das gemeinsame Arcade-Styling mit Pixel-Look und Cabinet-Layouts.
- `src/snake-game.js`, `src/pong-game.js`, `src/breakout-game.js` und `src/tetris-game.js` enthalten die Spiellogik.
- `src/ads.js` bereitet Werbeslots vor und aktiviert echte Anzeigen erst nach bewusster Freigabe.
- `src/site-config.js` ist die zentrale Schaltstelle fuer Publisher-ID und Ad-Slot-IDs.
- `privacy.html` und `impressum.html` enthalten die Rechtsseiten.

## Tests

- `node src/snake-game.test.js`
- `node --input-type=module -e "await import('./src/pong-game.js'); await import('./src/breakout-game.js'); await import('./src/tetris-game.js'); await import('./src/snake-game.js'); console.log('imports ok')"`

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

- Startseite laedt im neuen Arcade-Look.
- Snake, Pong, Breakout und Tetris sind jeweils erreichbar.
- Snake laesst sich mit Pfeiltasten, `WASD` und On-Screen-Buttons steuern.
- Pong reagiert auf `W/S`, Pfeiltasten, Serve und Pause.
- Breakout reagiert auf `A/D`, Pfeiltasten, Launch und Pause.
- Tetris reagiert auf Pfeile beziehungsweise `A/D/W/S`, Rotation, Drop und Pause.
- Impressum, Datenschutz und Werbe-Platzhalter sind weiterhin erreichbar.
