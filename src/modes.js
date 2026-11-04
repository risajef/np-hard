export const MODES = [
  {
    id: 'tsp',
    name: 'Traveling Salesperson',
    short: 'TSP',
    category: 'Routen',
    icon: 'route',
    description: 'Eine Rundreise. Alle Städte. Der kürzeste Weg.',
    goal: 'Besuche jede Stadt genau einmal und kehre zum Start zurück. Gesucht ist die kürzeste Rundreise.',
    action:
      'Klicke die Städte in der gewünschten Reihenfolge an. Die Route schließt sich automatisch.',
  },
  {
    id: 'color',
    name: 'Planare 3-Färbung',
    short: '3-Coloring',
    category: 'Graphen',
    icon: 'color',
    description: 'Drei Farben, keine gleichen Nachbarn.',
    goal: 'Färbe den planaren Graphen mit drei Farben. Benachbarte Knoten müssen unterschiedliche Farben haben.',
    action:
      'Wähle eine Farbe und klicke auf einen Knoten. Knoten mit zwei unterschiedlich gefärbten Nachbarn erhalten automatisch die dritte Farbe, auch in Ketten. Rückgängig nimmt den ganzen Schritt zurück. Zum Verschieben einen Knoten ziehen; nach dem Loslassen bewegt er sich wieder mit. Die beiden markierten Knoten sind zur Aufhebung der Farbsymmetrie vorgegeben.',
  },
  {
    id: 'dom',
    name: 'Minimum Dominating Set',
    short: 'Dominating Set',
    category: 'Graphen',
    icon: 'nodes',
    description: 'Wenige Knoten. Das ganze Netz erreicht.',
    goal: 'Wähle möglichst wenige Knoten, sodass jeder Knoten gewählt oder mit einem gewählten Knoten verbunden ist.',
    action:
      'Klicke auf Knoten, um sie auszuwählen. Ziehe sie, um den Graphen zu ordnen. Grün umrandete Knoten sind bereits abgedeckt.',
  },
  {
    id: 'sat',
    name: '3-SAT',
    short: '3-SAT',
    category: 'Logik',
    icon: 'logic',
    description: 'Finde die eine Belegung, die alles erfüllt.',
    goal: 'Belege jede Variable mit wahr oder falsch, sodass jede Klausel mindestens ein wahres Literal enthält.',
    action:
      'Jeder Knoten ist eine Klausel mit drei anklickbaren Literalen. Ein Klick schaltet die Variable überall um; ¬ bedeutet „nicht“.',
  },
  {
    id: 'knapsack',
    name: '0/1 Knapsack',
    short: 'Knapsack',
    category: 'Optimierung',
    icon: 'bag',
    description: 'Begrenzter Platz. Maximaler Wert.',
    goal: 'Packe Gegenstände mit maximalem Gesamtwert ein, ohne das Gewichtslimit zu überschreiten. Jeder Gegenstand ist nur einmal verfügbar.',
    action:
      'Klicke zum Einpacken. Die Höhe eines Gegenstands zeigt sein Gewicht, die Breite seinen Wert.',
  },
  {
    id: 'job',
    name: 'Job Shop Scheduling',
    short: 'Job Shop',
    category: 'Planung',
    icon: 'schedule',
    description: 'Koordiniere Maschinen. Spare Zeit.',
    goal: 'Ordne die Arbeitsschritte je Maschine so an, dass alle Aufträge möglichst früh fertig sind. Die Reihenfolge innerhalb eines Auftrags ist fest.',
    action:
      'Ziehe die Schritte innerhalb einer Maschine an die gewünschte Position. Der Zeitplan startet jeden Schritt zum frühestmöglichen Zeitpunkt; zyklische Reihenfolgen sind unzulässig.',
  },
  {
    id: 'facility',
    name: 'Facility Location',
    short: 'Facility Location',
    category: 'Optimierung',
    icon: 'pin',
    description: 'Die besten Standorte für ein gutes Netz.',
    goal: 'Minimiere Eröffnungskosten plus die Summe der Entfernungen aller Kunden zum jeweils nächsten offenen Standort.',
    action:
      'Klicke auf quadratische Standorte, um sie zu öffnen. Die kleinen Punkte sind Kunden. Entfernungen werden auf 0,1 gerundet.',
  },
  {
    id: 'gallery',
    name: 'Art Gallery Problem',
    short: 'Art Gallery',
    category: 'Geometrie',
    icon: 'gallery',
    description: 'Finde die Aussichtspunkte ohne blinde Flecken.',
    goal: 'Bewache alle markierten Kunstwerke mit möglichst wenigen Wachen. Wände blockieren die Sicht. Gespielt wird die diskrete Point-Guarding-Variante.',
    action:
      'Klicke auf ein beliebiges Bodenfeld, um dort eine Wache zu setzen oder zu entfernen. Gelbe Rauten sind Kunstwerke; grüne Rauten sind sichtbar.',
  },
  {
    id: 'squares',
    name: 'Minimum Enclosing Squares',
    short: 'Enclosing Squares',
    category: 'Geometrie',
    icon: 'square',
    description: 'Überdecke alle Punkte mit wenigen Quadraten.',
    goal: 'Überdecke alle Punkte mit möglichst wenigen Quadraten fester Seitenlänge. Die Quadrate dürfen sich nicht überlappen. Berührungen sind erlaubt.',
    action:
      'Klicke auf eine Rasterposition, um dort ein Quadrat zu setzen oder zu entfernen. Die Vorschau wird rot, wenn es sich mit einem gesetzten Quadrat überschneiden würde.',
  },
];
