# NP Studio

Statische Puzzle-Web-App mit JavaScript-Modulen, getrennten Stylesheets und Vite. Ohne Account, ChatGPT-Hosting oder Backend.

## Lokal entwickeln

```sh
npm ci
npm run dev
# http://127.0.0.1:4173
```

`npm start` ist ein Alias für den Entwicklungsserver. Vite lädt Änderungen an CSS und JavaScript nach. Voraussetzung: Node.js ≥ 22.12. Die `index.html` ist der kleine HTML-Einstiegspunkt; `src/main.js` lädt die Styles und startet die App. ES-Module werden über HTTP bereitgestellt, daher die App über den lokalen Server öffnen.

## Bauen und statisch bereitstellen

```sh
npm run build
npm run preview
# http://127.0.0.1:4173
```

Der Build liegt in `dist/`: eine kleine `index.html` sowie separate JavaScript- und CSS-Dateien unter `assets/`. Das **gesamte Verzeichnis** auf einen beliebigen statischen Webserver kopieren. Relative Assetpfade erlauben auch Hosting unter einem Unterpfad wie `/puzzles/`. Der Server braucht weder Node.js noch eine Datenbank. Es werden keine Dateien mit Inline-Bundles mehr erzeugt. `dist/` ist generiert und wird nicht bearbeitet.

## Befehle

```sh
npm test             # Generatoren, Solver, Heuristiken, Bestwerte und Physik
npm run format       # Quellcode einheitlich formatieren
npm run format:check
npm run test:browser # Browserprüfungen gegen einen laufenden Server
```

## Code-Struktur

```text
index.html                       Schlanker HTML-Einstiegspunkt
vite.config.js                   Entwicklungsserver und statischer Build
src/
  main.js                        Bootstrap und CSS-Import
  generation-worker.js           Generator außerhalb des UI-Threads
  app.js                         PuzzleApp: Navigation und Spielzustand
  engine.js                      Registry und öffentliche Problem-API
  modes.js                       Deutsche Namen, Regeln und Bedienhinweise
  problems/                      Eine Klasse pro Problem
    problem.js                   Kandidat → exakte Lösung → Qualitätsprüfung
    tsp.js, coloring.js, dominating-set.js, sat.js, knapsack.js
    job-shop.js, facility-location.js, art-gallery.js, enclosing-squares.js
    grid-cover.js                Gemeinsame Rasterplatzierung
  core/
    graph.js                     Exakte Färbung und initiale Anordnung
    packing-cover.js             Exakte überlappungsfreie Punktüberdeckung
    square-cloud-quality.js      Prüfungen gegen sichtbare Lösungsschablonen
    puzzle-generator.js          Worker-Client für Hintergrundgenerierung
    spring-simulation.js         Fortlaufende Physik, Pinning und Planarität
    combinatorics.js             Teilmengen, Set Cover und Greedy-Baselines
    geometry.js                  Sichtlinien und Wandprüfung
    player-records.js            Lokaler TSP-Bestwertspeicher
    random.js                    Reproduzierbare Zufallszahlen
  ui/
    board.js                     Kleine Registry der Spielfeldansichten
    boards/                      Je eine Ansicht für TSP, Graphen, SAT usw.
      common.js                  Gemeinsame SVG-Bausteine
    graph-controller.js          Animationsschleife und Knoten-Dragging
    job-drag.js                  Drag-and-drop der Maschinenreihenfolgen
    game.js                      Aufgabenansicht und persönliche Bestleistung
    catalog.js, shell.js          Auswahl und Seitenrahmen
    html.js, icons.js            Darstellungshilfen
  styles/
    main.css                     Geordnete Stylesheet-Imports
    base.css, shell.css, catalog.css
    game.css, boards.css, graph.css, puzzle-details.css
    overlays.css, responsive.css
scripts/
  generate.mjs                   JSON-Generator
tests/                           Automatische Prüfungen und Browser-Smoke-Test
```

## Live-Graphen

Bei 3-Coloring und Dominating Set läuft die Federsimulation während der gesamten geöffneten Spielansicht über `requestAnimationFrame`. Es gibt keinen Abkühlungszähler und kein automatisches Abschalten. Durch Dämpfung darf der Graph zur Ruhe kommen; nach einem Eingriff reagiert er sofort weiter.

- Knoten anklicken: Farbe setzen beziehungsweise Knoten auswählen.
- Knoten ziehen: Mit Maus, Touch oder Stift verschieben. Währenddessen bleibt nur dieser Knoten an der Zeigerposition festgehalten; seine Nachbarn reagieren weiter.
- Loslassen: Der Knoten nimmt wieder an der Simulation teil. Ziehen zählt nicht als Spielzug.
- Bei 3-Coloring werden Bewegungen begrenzt, die Kantenkreuzungen erzeugen würden. Auch vorgegebene Farbknoten lassen sich innerhalb dieser Grenzen ziehen.

Die Physik besitzt eigene Positionen und Geschwindigkeiten; Puzzlekoordinaten, Kanten und Lösungen werden nicht verändert. Beim Ändern von Farben, Hinweisen oder Auswahl bleibt der Layoutzustand erhalten. Der Controller ändert pro Frame nur SVG-Attribute. Beim Seitenwechsel wird die alte Animationsschleife samt Pointer-Listenern beendet; beim Zurückkehren setzt die Sitzung ihren Layoutzustand fort.

Jede Problemklasse besitzt `create`, `solve`, `initial` und `evaluate`; die schwierigeren Generatoren definieren zusätzlich `baselines`, `accept` oder `layout`. Oberfläche und Problemlogik sind getrennt. `engine.js` delegiert an die Registry und enthält keine Fallunterscheidung über alle Solver.

## Schwierigkeit und Eindeutigkeit

Jeder Kandidat wird exakt gelöst. Es werden nur Instanzen mit einem eindeutigen Optimum zugelassen, deren Ausgangszustand noch keine Lösung ist. Bei TSP zählen Startpunkt und Laufrichtung nicht als unterschiedliche Lösungen; bei der Färbung heben zwei vorgegebene Nachbarfarben die Farbsymmetrie auf. Job Shop vergleicht Maschinenreihenfolgen mit frühestmöglichem Start ohne freiwillige Wartezeiten.

Zusätzlich müssen **alle für einen Modus definierten Baselines scheitern**:

| Problem | Geprüfte einfache Verfahren |
| --- | --- |
| 3-Coloring | First Fit nach Index, Grad und DSATUR, jeweils mit zwei Regeln zum Auflösen von Gleichständen; außerdem darf das reine Fortsetzen erzwungener Farben nicht den ganzen Graphen lösen |
| Dominating Set | Maximale neue Abdeckung, höchster Grad, zwei Reihenfolgen bei Gleichständen; zusätzlich Entfernung redundanter Greedy-Auswahlen in beiden Löschreihenfolgen |
| 3-SAT | Strikt verbessernde Ein-Variablen-Schritte ab „alles falsch“ und „alles wahr“, jeweils mit zwei Reihenfolgen |
| Knapsack | Höchster Wert, höchste Wertdichte, leichtester und schwerster Gegenstand zuerst, jeweils mit zwei Reihenfolgen bei Gleichständen |
| Facility Location | Bester Einzelstandort mit anschließendem Greedy-Öffnen sowie Greedy-Schließen ab allen Standorten, jeweils mit zwei Reihenfolgen |
| Art Gallery / Squares | Maximale neue Abdeckung mit zwei Reihenfolgen; bei Squares unter Einhaltung der Überlappungsregeln. Zusätzlich Entfernung redundanter Auswahlen in beiden Löschreihenfolgen |
| TSP / Job Shop | Exakte Eindeutigkeitsprüfung; keine zusätzliche Heuristikschranke |

Das ist eine konkrete, überprüfbare Qualitätsbedingung und keine Behauptung, dass jeder denkbare Greedy-Algorithmus scheitert. Eine schwierige Spielinstanz ist ebenfalls kein Komplexitätsbeweis. Das Niveau erhöht die Instanzgröße; die empfundene Schwierigkeit bleibt individuell.

Ein Kandidat mit mehreren Optima, erfolgreicher Baseline oder abgebrochener exakter Suche wird verworfen. Nach höchstens 6000 Kandidaten meldet der Generator einen Fehler. Er liefert dann keine ungeprüfte Ersatzaufgabe. Die allgemeine Set-Cover-Suche hat pro Kandidat ein Budget von 100000 Suchknoten. Der spezielle Packing-Solver für Squares prüft höchstens 5000 Suchknoten je Kandidat und verwirft abgebrochene Suchen. Die Generierung läuft in einem Web Worker, damit die Oberfläche während der Suche bedienbar bleibt.

## Spielmechanik

- **TSP:** Jede vollständige, selbst erstellte Rundreise wird mit der bisherigen persönlichen Bestleistung dieser Aufgabe verglichen. Nur Verbesserungen werden gespeichert. Bestwert und Route überleben Zurücksetzen und Neuladen; „Beste Route laden“ stellt sie wieder her. Über die TSP-Auswahl wird die letzte Aufgabe fortgesetzt, „Neues Puzzle“ erzeugt einen neuen Seed. Aufgedeckte Lösungen verändern den persönlichen Bestwert nicht.
- **3-Coloring:** „Entspannt“ verwendet planare Teilgraphen eines Dreiecksgitters mit 20 Knoten und höchstens zwei automatisch ergänzten Startfarben. „Knifflig“ hat 38 Knoten und erfordert mindestens sechs eigene Farbsetzungen. „Anspruchsvoll“ hat 61 Knoten und erfordert mindestens zehn eigene Farbsetzungen. Beim Start sind dort nur 11 Knoten gefärbt (zwei Vorgaben und neun automatische Folgerungen); eine korrekte Farbsetzung ergänzt höchstens vier weitere Knoten. Die größeren Graphen erhalten eine entsprechend größere Zeichenfläche.
  Die Klick-Untergrenze wird durch disjunkte Entscheidungsbereiche nachgewiesen: Jeder Knoten sieht außerhalb seines Bereichs höchstens eine Lösungsfarbe. Ohne eine eigene Farbsetzung im Bereich kann dort niemals die erste automatische Farbe entstehen, selbst wenn der gesamte Rest bereits richtig gefärbt ist. Eine zusätzlich geprüfte Folge von sechs beziehungsweise zehn korrekten Farbsetzungen löst das Puzzle vollständig und bestätigt damit das exakte Minimum. Die Bereiche werden innerhalb von Dreiecksflächen planar eingebettet, gedreht, gespiegelt und zufällig umnummeriert. Die Farben sind exakt eindeutig. Aus zwei unterschiedlich gefärbten Nachbarn folgt automatisch die dritte Farbe; diese Regel wird beim Start und nach jedem Klick bis zum Stillstand angewendet. Beim Umfärben werden alle Folgerungen aus den manuellen Eingaben neu berechnet. Rückgängig nimmt einen Klick einschließlich seiner Folgerungen zurück. Eine fortlaufende Federsimulation verteilt die Knoten; Schritte, die Kantenkreuzungen erzeugen, werden verworfen.
- **Dominating Set:** Verbundene Graphen mit 10, 20 oder 24 Knoten und einer eindeutigen kleinsten dominierenden Menge. „Knifflig“ erfordert mindestens fünf ausgewählte Knoten, „Anspruchsvoll“ mindestens sechs. Der exakte Set-Cover-Solver prüft diese Untergrenzen und die Eindeutigkeit; die Greedy-Filter bleiben aktiv. Ebenfalls mit fortlaufender Federsimulation und ziehbaren Knoten.
- **3-SAT:** Jeder Graphknoten enthält eine Klausel mit drei anklickbaren Literalen. Kanten verbinden Vorkommen gemeinsamer Variablen. Ein Klick ändert die Variable überall, auch in negierten Literalen. Grüne Literale sind erfüllt.
- **Knapsack:** Die Gegenstandsrechtecke sind mit einem gemeinsamen Maßstab gezeichnet: Höhe = 6 px pro kg, Breite = 2 px pro Wertpunkt. Klicken packt einen Gegenstand ein oder aus.
- **Job Shop:** Schritte innerhalb derselben Maschine ziehen, mit Maus, Touch oder Stift. Die Maschinenzuordnung bleibt fest. Tastatur: Leertaste aufnehmen, Pfeile links/rechts verschieben, Enter ablegen, Esc abbrechen. Der Gantt-Plan wird nach dem Ablegen neu berechnet. Rückgängig stellt die vorige Reihenfolge wieder her.
- **Facility Location:** Diskrete unkapazitierte Variante. Minimiert werden Eröffnungskosten plus Kundendistanzen zum jeweils nächsten offenen Standort. Einzelne Distanzen sind auf eine Nachkommastelle gerundet.
- **Art Gallery:** Wachen können auf **jedem Bodenfeld** gesetzt werden. Die zusammenhängende Rastergalerie mit blockierenden Wänden wird bei jeder Aufgabe neu erzeugt; auch innere Hindernisse sind möglich. Sichtlinien werden an allen Rastergrenzen in Intervalle zerlegt und gegen den Bodenplan geprüft. Bewacht werden die markierten Kunstwerke, nicht die gesamte kontinuierliche Fläche. Das Optimum benötigt mindestens drei Wachen; zwei feste Ecken können keine zugelassene Aufgabe lösen.
- **Enclosing Squares:** Quadrate fester Seitenlänge können an **jeder Rasterposition** gesetzt oder entfernt werden. Das dichte Raster bietet 551 Positionen im Abstand von 18 px. Die 144 px großen Quadrate dürfen sich nicht überlappen; eine rote Vorschau zeigt blockierte Positionen und die Bedienung verhindert deren Platzierung. Gesucht ist die kleinste Anzahl Quadrate, die alle Punkte überdeckt. Statt vorgegebener Quadrat-Ecken werden 56, 70 oder 84 gleichmäßig zufällige Punkte in einer zusammenhängenden Fläche verteilt. Der genaue Solver erhält nur diese Punktwolke. Aufgaben mit vier Eckmarkierungen an einem Lösungsquadrat, isolierten Punktgruppen oder zu wenigen miteinander gekoppelten Platzierungen werden verworfen. Auch ein regelmäßiges Kachelraster wird in allen 64 Rasterphasen als Baseline geprüft. Berührungen sind erlaubt; feste Lücken werden nicht erzwungen, da sie die Punktgruppen und damit die Lösung verraten. Positionierung und Eindeutigkeitsprüfung umfassen das gesamte Raster, nicht eine handverlesene Kandidatenmenge.

## Aufgaben als JSON erzeugen

```sh
node scripts/generate.mjs --type tsp --seed 42 --difficulty 2
node scripts/generate.mjs --type gallery --seed 42 --include-solution
node scripts/generate.mjs --type knapsack --seed 42 --count 10
```

Bei Squares enthält `cover` pro Rasterposition eine Liste überdeckter Punktindizes statt einer 32-Bit-Maske; so bleiben auch große Punktwolken als JSON darstellbar.

Typen: `tsp`, `color`, `dom`, `sat`, `knapsack`, `job`, `facility`, `gallery`, `squares`. Schwierigkeit: 1–3. Typ, Seed und Schwierigkeit reproduzieren eine Aufgabe innerhalb derselben Generatorversion. Ohne `--include-solution` fehlen die optimale Lösung und der optimale Zielfunktionswert. `baselines` dokumentiert die geprüften Heuristiken und ihre Ergebnisse.

## Speicherung

Der Browser speichert Fortschritt und TSP-Bestleistungen lokal. Es gibt keinen Server und keine Übertragung. Der Bestwert ist pro Generatorversion, Seed und Schwierigkeit getrennt. Aufgaben werden höchstens einmal als selbst gelöst gewertet; aufgedeckte Aufgaben bleiben auch nach dem Zurücksetzen Übung. Bei blockiertem Browser-Speicher bleibt die App in der laufenden Sitzung bedienbar.

## Prüfung

`npm test` prüft 135 Aufgaben über neun Modi und drei Schwierigkeitsgrade. Enthalten sind unabhängige Teilmengenprüfungen, die Greedy-Schranken, Planarität nach der Federsimulation, wechselnde Räume, Wandblockaden, alle Rasterpositionen und das Verbot von Zwei-Wachen-Lösungen. Der Set-Cover-Solver wird zusätzlich an 150 kleinen Zufallsinstanzen mit vollständiger unabhängiger Enumeration verglichen. Weitere 150 Instanzen prüfen Konflikte zwischen Platzierungen und sichere obere Schranken. Der BigInt-basierte Packing-Solver für dichte Punktwolken wird mit unabhängiger Enumeration verglichen und unterstützt mehr als 64 Punkte. Regressionstests weisen das frühere Muster aus vier Ecken plus Mittelpunkt ausdrücklich zurück. Squares wird auch aus einem JSON-Export allein anhand der Punkte erneut exakt gelöst. Weitere Tests prüfen TSP-Persistenz, Drag-and-drop-Reihenfolgen sowie lang laufende Physik, Pinning, Freigabe, Grenzen und Planarität.

Die Browserprüfung läuft gegen den Entwicklungsserver oder den gebauten statischen Build und kontrolliert alle neun Spielansichten, Bestwertverbesserung und Wiederherstellung, SAT-Literale, Gegenstandsmaße, Drag-and-drop samt Rückgängig, fortlaufende Graph-Animation, Knoten-Dragging ohne Antwortänderung, Weiterbewegung nach dem Loslassen, Erhalt des Layouts bei UI-Änderungen, Abbruch alter Animationsschleifen, Rasterplatzierung, Lösungen und Layout bei 1440 und 390 Pixeln.

Die wiederholbare Browserprüfung liegt in `tests/browser-smoke.mjs`. Dafür `npm run dev` oder `npm run preview` starten, Chromium mit einem **separaten Testprofil** und Debug-Port öffnen und in einem weiteren Terminal prüfen:

```sh
chromium --headless --remote-debugging-port=9222 --user-data-dir=/tmp/np-studio-test about:blank
npm run test:browser
```

Der Test setzt ausschließlich die NP-Studio-Daten in diesem Testprofil zurück. Screenshots landen standardmäßig in einem neuen temporären Verzeichnis. `NP_TEST_URL` kann die App-Adresse überschreiben (Standard: `http://127.0.0.1:4173`). `NP_CHROME_DEBUG_PORT` und `NP_SCREENSHOT_DIR` können Debug-Port und Screenshotverzeichnis überschreiben. Chromium gehört nicht zu den Laufzeit-Abhängigkeiten der Webseite.
