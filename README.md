# RKI-Corona-Daten-Archiv

## Worum geht es?

Das RKI veröffentlicht täglich die [gemeldeten Coronafälle in einer Tabelle](https://npgeo-corona-npgeo-de.hub.arcgis.com/datasets/dd4580c810204019a7b8eb3e0b329dd6_0), aufgeschlüsselt u.a. nach Meldedatum, Alter, Geschlecht, Landkreis etc.

Diese Daten liegen unter einer offenen, mit CC-BY kompatiblen Lizenz vor: Robert Koch-Institut, [dl-de-by-2.0](https://www.govdata.de/dl-de/by-2-0)

Leider werden alte Versionen dieser Daten täglich überschrieben. Das hat zur Folge, dass man bspw. nicht den Verzug zwischen Erkrankungsbeginn und Veröffentlichung analysieren kann, was aber zentral für eigene Nowcasting-Berechnungen ist.

Daher haben wir allerhand alte Daten-Versionen gesammelt und stellen sie in diesem GitHub-Repo ebenfalls unter RKI dl-de-by-2.0 zur Verfügung. Per cronjob versuchen wir das Archiv täglich aktuell zu halten. Als Feature bereinigen wir sogar die Daten, um z.B. die Probleme mit den unterschiedlichen Datumsformaten zu korrigieren.

**Falls jemand noch andere alte Datenversionen rumliegen hat, freuen wir uns über Datenspenden.**

## Aufbau

### Verzeichnis `/data/`

- Die Rohdaten sind unter `data/0_archived` und werden täglich ergänzt.
- Fehlerhafte Rohdaten werden nach `data/1_ignored` verschoben, z.B. wenn durch technische Probleme nur die halbe CSV-Datei zum Download stand.
- Gesäuberte Daten landen täglich als JSON unter `data/2_parsed`.

### Datenfelder:

Die Datenfelder sind vom RKI [auf der ArcGIS-Plattform](https://npgeo-corona-npgeo-de.hub.arcgis.com/datasets/dd4580c810204019a7b8eb3e0b329dd6_0) beschrieben.

Es hat sich aber gezeigt, dass insbesondere die Datumsfelder in einem schlechten Zustand sind. Neben viel zu vielen unterschiedlichen Datumsformaten, gibt es sogar Fälle, wo sich Leute angeblich bereits 1956 infiziert haben. Der Parser korrigiert die gröbsten Fehler und ergänzt die Datensätze um die Felder `MeldedatumISO`, `DatenstandISO` und `RefdatumISO`, die das jeweilige Datum immer in der Form `"YYYY-MM-DD"` angeben.

Ansonsten haben wir uns bemüht darauf zu achten, keine Fehler zu machen. Falls uns trotzdem einer unterlaufen ist, freuen wir uns über Hinweise.

Diese Daten sind natürlich keine offizielle Veröffentlichung des RKI oder der ARD, sondern eine freundliche Unterstützung für Forschung und Recherche. Offizielle Daten gibt es nur beim RKI.

### Verzeichnis `/bin/`

Der Code läuft aktuell nur unter UNIX-Betriebssystemen, also z.B. Linux/Mac OS. Er dient dem Scrapen und Säubern der Daten.

- `bin/1_download.js` ist der API Scraper, der bei uns stündlich läuft.
- `bin/2_deduplicate.sh` löscht doppelte Dateien, also wenn es keine Änderungen an den Daten gab.
- `bin/3_parse.js` parst die API-/CSV-Rohdaten und macht daraus sauberes und einheitliches JSON.
- `bin/cronjob.sh` ist das stündliche cronjob-Script
- `bin/lib/config.js` enthält einen Überblick über alle Felder, inklusive einfacher Tests, ob die Felder richtig befüllt sind.
- `bin/lib/helper.js` sind die kleinen Helferlein, die man so braucht.
- `bin/example_scan.js` ist ein kleines Demo-Script, das zeigt, wie man alle geparsten Daten einmal durchscannen kann.

## weitere Ideen

- Man könnte einen tieferen Plausibilitäts-Check durchführen.
- Auch könnte man einen automatischen Report generieren, der mögliche Datenfehler oder fehlende Daten auflistet.
- Vielleicht findet jemand einen Weg, alle Daten zu einer großen Tabelle zu mergen.
