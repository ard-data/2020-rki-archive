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

## Beispiele

### Node.js

`bin/example_scan.js` ist, wie erwähnt, ein kleines Demo-Script.

### Shell

Die Daten kann man relativ leicht auf der Shell parsen und filtern. Beispiel:

`bzip2 -dkcq *.json.bz2 | jq -r '.[] | select (.IdLandkreis == "09162" and .Altersgruppe == "A05-A14") | [.Geschlecht, .AnzahlFall, .NeuerFall, .MeldedatumISO, .DatenstandISO, .RefdatumISO] | @tsv'`

Der Befehl besteht aus den folgenden Teilen:

- `bzip2 -dkcq *.json.bz2 | `  
Dekomprimiere alle Dateien (`-d`), die auf `.json.bz2` enden und pipe die Ergebnisse (`-c`) weiter.
- `jq -r '`…`'`  
Mit [jq](https://stedolan.github.io/jq/) kann man sehr effizient JSON verarbeiten. Die [Query- und Filtermöglichkeiten sind gut dokumentiert](https://stedolan.github.io/jq/manual/#Basicfilters).
- `.[] | select (.IdLandkreis == "09162" and .Altersgruppe == "A05-A14") | [.Geschlecht, .AnzahlFall, .NeuerFall, .MeldedatumISO, .DatenstandISO, .RefdatumISO] | @tsv'`  
Alle bekannten COVID19-Fälle aus dem Stadtkreis München (`.IdLandkreis == "09162"`), mit Patient_innen im Schulalter (`.Altersgruppe == "A05-A14"`) sollen als Tab-separierte Datei (`| @tsv`) exportiert werden, mit den 6 Spalten: Geschlecht, AnzahlFall, NeuerFall, MeldedatumISO, DatenstandISO, RefdatumISO

## weitere Ideen

- Man könnte einen tieferen Plausibilitäts-Check durchführen.
- Auch könnte man einen automatischen Report generieren, der mögliche Datenfehler oder fehlende Daten auflistet.
- Vielleicht findet jemand einen Weg, alle Daten zu einer großen Tabelle zu mergen.
