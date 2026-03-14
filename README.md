# Retro Arcade

Kleine statische Browser-Spieleseite mit einer Startseite, einer Spielesammlung und dem ersten integrierten Game: Classic Snake.

## Lokal starten

1. Im Ordner `C:\Dokumente\Code Projekte\Classic Snake` ein Terminal oeffnen.
2. `python -m http.server` ausfuehren.
3. `http://localhost:8000/` im Browser oeffnen.

## Struktur

- `index.html` ist die Startseite der Spielesammlung.
- `games/snake/index.html` ist die Spieleseite fuer Snake.
- `styles.css` enthaelt das gemeinsame Styling fuer Portal und Spieleseiten.
- `src/snake-game.js` enthaelt die deterministische Spiellogik und den DOM-Controller.
- `src/ads.js` bereitet Werbeslots vor und aktiviert echte Anzeigen erst nach bewusster Freigabe.
- `src/site-config.js` ist die zentrale Schaltstelle fuer Publisher-ID und Ad-Slot-IDs.
- `src/snake-game.test.js` prueft die Kernregeln ohne Test-Framework.
- `privacy.html` und `impressum.html` enthalten die Rechtsseiten.

## Tests

- `node src/snake-game.test.js`

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

- Startseite laedt und verlinkt korrekt auf Snake.
- Snake laesst sich mit Pfeiltasten, `WASD` und On-Screen-Buttons steuern.
- `Space` pausiert und setzt fort.
- Restart setzt Score, Snake und Food sauber zurueck.
- Kollision mit Wand oder eigenem Koerper fuehrt zu Game Over.
- Werbe-Platzhalter sind auf Startseite und Spieleseite sichtbar.
- Datenschutz-Seite und Impressum sind erreichbar.
