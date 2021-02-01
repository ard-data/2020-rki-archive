# RKI-Corona-Daten-Archiv

## Worum geht es?

Das RKI veröffentlicht täglich die [gemeldeten Coronafälle in einer Tabelle](https://npgeo-corona-npgeo-de.hub.arcgis.com/datasets/dd4580c810204019a7b8eb3e0b329dd6_0), aufgeschlüsselt u.a. nach Meldedatum, Alter, Geschlecht, Landkreis etc.

Diese Daten liegen unter einer offenen, mit CC-BY kompatiblen Lizenz vor: Robert Koch-Institut, [dl-de-by-2.0](https://www.govdata.de/dl-de/by-2-0)

Leider werden die alten Versionen dieser Daten täglich überschrieben. Das hat zur Folge, dass man bspw. nicht den Verzug zwischen Erkrankungsbeginn und Veröffentlichung analysieren kann, was aber zentral z.B. für eigene Nowcasting-Berechnungen ist.

Daher haben wir allerhand alte Daten-Versionen gesammelt und stellen sie Online ebenfalls unter RKI dl-de-by-2.0 zur Verfügung. Per cronjob versuchen wir das Archiv täglich aktuell zu halten. Als Feature bereinigen wir sogar die Daten, um z.B. die Probleme mit den unterschiedlichen Datumsformaten zu korrigieren.

**Falls jemand noch andere alte Datenversionen rumliegen hat, freuen wir uns über Datenspenden.**

## Daten

Mit Ausbruch der 2. Welle ist die Datenmenge enorm gestiegen und würde langfristig mehrere Gigabytes benötigen. Daher mussten die Daten in ein Google Storage ausgelagert werden.

### Wo sind die Daten zu finden?

- Die Rohdaten werden täglich ergänzt im Ordner `0_archived` und im Anschluss [hier als HTML-Datei](https://storage.googleapis.com/brdata-public-data/rki-corona-archiv/0_archived/index.html) oder [wahlweise als TXT-Datei](https://storage.googleapis.com/brdata-public-data/rki-corona-archiv/0_archived/index.txt) chronologisch sortiert aufgelistet.
- Fehlerhafte Rohdaten werden nach `1_ignored` verschoben, z.B. wenn durch technische Probleme nur Teile der CSV-Datei zum Download standen: [HTML](https://storage.googleapis.com/brdata-public-data/rki-corona-archiv/1_ignored/index.html)/[TXT](https://storage.googleapis.com/brdata-public-data/rki-corona-archiv/1_ignored/index.txt)
- **Gesäuberte Daten werden täglich hochgeladen unter `2_parsed` und sind hier aufgelistet als [HTML](https://storage.googleapis.com/brdata-public-data/rki-corona-archiv/2_parsed/index.html) oder [TXT](https://storage.googleapis.com/brdata-public-data/rki-corona-archiv/2_parsed/index.txt)**

### Welches Format haben sie?

Da die Datenmenge sehr stark angewachsen ist und einzelne Dumps über 500 MB groß werden können, so dass die 1-GB-Stringlängenbegrenzung von JavaScript überschritten wird, musste auf ein neues Datenformat umgestiegen werden. Die Dateien liegen jetzt vor:
- als [NDJSON](http://ndjson.org) (jede Zeile ist ein Eintrag als JSON-Objekt und endet auf '\n') und
- mit [XZ-Utils](https://tukaani.org/xz/format.html) komprimiert (XZ/LZMA ist sehr effektiv, open-source, kostenlos, plattformübergreifend erhältlich und wird von vielen Kompressionsprogrammen unterstützt)

### Datenfelder

Die Datenfelder wurde vom RKI [auf der ArcGIS-Plattform](https://npgeo-corona-npgeo-de.hub.arcgis.com/datasets/dd4580c810204019a7b8eb3e0b329dd6_0) beschrieben. (Hinweis: Die komplette Beschreibung sieht man erst, wenn man auf den kleinen, blauen "Mehr"-Link klickt.)

Es hat sich aber gezeigt, dass insbesondere die Datumsfelder in einem schlechten Zustand sind. Neben viel zu vielen unterschiedlichen Datumsformaten, gibt es sogar Fälle, wo sich Leute angeblich bereits 1956 infiziert haben. Der Parser korrigiert die gröbsten Fehler und ergänzt die Datensätze um die Felder `MeldedatumISO`, `DatenstandISO` und `RefdatumISO`, die das jeweilige Datum immer in der Form `"YYYY-MM-DD"` angeben.

[Hier noch eine kurze Erklärung](https://github.com/ard-data/2020-rki-archive/issues/2#issuecomment-770791045), warum Fallzahlen negativ sein können.

Ansonsten haben wir uns bemüht darauf zu achten, keine Fehler zu machen. Falls uns trotzdem einer unterlaufen ist, freuen wir uns über Hinweise.

Diese Daten sind natürlich keine offizielle Veröffentlichung des RKI oder der ARD, sondern eine freundliche Unterstützung für Forschung und Recherche. Offizielle Daten gibt es nur beim RKI.

### Verzeichnis `/bin/`

Der Code läuft aktuell nur unter UNIX-Betriebssystemen, also z.B. Linux/Mac OS. Er dient dem Scrapen und Säubern der Daten.

- `bin/1_download.js` ist der API Scraper, der bei uns stündlich läuft.
- `bin/2_deduplicate.sh` löscht doppelte Dateien, also wenn es keine Änderungen an den Daten gab.
- `bin/3_parse.js` parst die API-/CSV-Rohdaten und macht daraus sauberes und einheitliches JSON.
- `bin/4_index_data.js` generiert HTML- und TXT-Listen als Hilfe for den Cloud Storage.
- `bin/6_upload.sh` lädt die Daten in den Cloud Storage hoch. Hier können Vorschläge gemacht werden, wohin die Dateien noch gesichert werden können.
- `bin/cronjob.sh` ist das stündliche cronjob-Script
- `bin/lib/config.js` enthält einen Überblick über alle Felder, inklusive einfacher Tests, ob die Felder richtig befüllt sind.
- `bin/lib/helper.js` sind die kleinen Helferlein, die man so braucht.

## Beispiel

Die [gesäuberten Daten aus `2_parsed`](https://storage.googleapis.com/brdata-public-data/rki-corona-archiv/2_parsed/index.html) kann man relativ leicht auf der Shell parsen und filtern. Beispiel:

`xz -dkc *.ndjson.xz | jq -r '. | select (.IdLandkreis == "09162" and .Altersgruppe == "A05-A14") | [.Geschlecht, .AnzahlFall, .NeuerFall, .MeldedatumISO, .DatenstandISO, .RefdatumISO] | @tsv'`

Der Befehl besteht aus den folgenden Teilen:

- `xz -dkc *.ndjson.xz | `  
Dekomprimiere alle Dateien (`-d`), die auf `.ndjson.xz` enden und pipe die Ergebnisse (`-c`) weiter.
- `jq -r '`…`'`  
Mit [jq](https://stedolan.github.io/jq/) kann man sehr effizient JSON verarbeiten. Die [Query- und Filtermöglichkeiten sind gut dokumentiert](https://stedolan.github.io/jq/manual/#Basicfilters).
- `. | select (.IdLandkreis == "09162" and .Altersgruppe == "A05-A14") | [.Geschlecht, .AnzahlFall, .NeuerFall, .MeldedatumISO, .DatenstandISO, .RefdatumISO] | @tsv'`  
Alle bekannten COVID19-Fälle aus dem Stadtkreis München (`.IdLandkreis == "09162"`), mit Patient_innen im Schulalter (`.Altersgruppe == "A05-A14"`) sollen als Tab-separierte Datei (`| @tsv`) exportiert werden, mit den 6 Spalten: Geschlecht, AnzahlFall, NeuerFall, MeldedatumISO, DatenstandISO, RefdatumISO

## weitere Ideen

- Man könnte einen tieferen Plausibilitäts-Check durchführen.
- Auch könnte man einen automatischen Report generieren, der mögliche Datenfehler oder fehlende Daten auflistet.
- Vielleicht findet jemand einen Weg, alle Daten zu einer großen Tabelle zu mergen.
