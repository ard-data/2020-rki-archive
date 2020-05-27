# 2020-rki-archive

- Quelle: https://npgeo-corona-npgeo-de.hub.arcgis.com/datasets/dd4580c810204019a7b8eb3e0b329dd6_0
- Archiv älterer Versionen
- Datenspenden älterer Versionen werden gesucht. Datenspenden sind willkommen.
- Rohdaten sind unter data/0_archived
- fehlerhafte oder doppelte Rohdaten werden nach data/1_ignored verschoben
- gesäuberte Daten landen unter data/2_parsed
- Unser scraper/säuberer läuft stündlich bei uns.
- Lizenz der Daten: Robert Koch-Institut (RKI), dl-de-by-2.0
- Lizenz des Codes: MIT
- Code:
	- läuft nur unter Linux/Mac OS
	- dient nur dem scrapen und säubern
	- 1_download.js ist der API Scraper, der bei uns stündlich läuft
	- 2_deduplicate.sh löscht doppelte Dateien
	- 3_parse.js parsed die API- und CSV-Rohdaten und macht daraus sauberes und einheitliches JSON
	- cronjob.sh ist das stündliche cronjob script
	- lib/config.js enthält einen Überblick über alle Felder
	- lib/helper.js sind die kleinen Helferlein
	- example_scan.js ist ein kleines Demo, wie man alle geparsten Daten einmal durchscannen kann
- Datenfelder:
	- Siehe npgeo
	- Datumsangaben sind eine Katastrophe. Da ist alles dabei. Auch Fälle, wo sich Leute bereits 1956 infiziert haben
	- deshalb gibt es zusätzlich gesäuberter Felder namens MeldedatumISO, DatenstandISO und RefdatumISO, der Form "YYYY-MM-DD"
	- Hinweis zum Feld Datenstand. Es gibt den Zeitpunkt der RKI-Veröffentlichung an, was üblicher Weise der Tag nach RKI-Eingang ist.

Für die Bewegung,
zum Runterladen,
für alle.
