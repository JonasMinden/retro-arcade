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
- `src/snake-game.test.js` prueft die Kernregeln ohne Test-Framework.
- `privacy.html` ist eine einfache Datenschutz-Vorlage fuer spaetere Erweiterungen.

## Tests

- `node src/snake-game.test.js`

## Cloudflare Pages

Fuer dieses Projekt brauchst du keinen Build-Schritt:

- Build command: leer lassen
- Build output directory: `/`

Du kannst entweder Git-Integration oder Direct Upload nutzen. Fuer spaetere automatische Deployments ist Git-Integration die bessere Wahl.

## Manuell pruefen

- Startseite laedt und verlinkt korrekt auf Snake.
- Snake laesst sich mit Pfeiltasten, `WASD` und On-Screen-Buttons steuern.
- `Space` pausiert und setzt fort.
- Restart setzt Score, Snake und Food sauber zurueck.
- Kollision mit Wand oder eigenem Koerper fuehrt zu Game Over.
- Werbe-Platzhalter sind auf Startseite und Spieleseite sichtbar.
- Datenschutz-Seite ist erreichbar.
