# Statische Demo-Websites

Vier eigenständige, statische Websites (HTML, CSS, JavaScript – ohne Build und
ohne Abhängigkeiten) im Ordner `ki-labels/`. Jede Seite gibt es in zwei
Varianten, die über den URL-Parameter `label` (0 oder 1) gewählt werden:

| Ordner | Seite |
|---|---|
| `ki-labels/site/` | VELORA V7 (Automobil) |
| `ki-labels/novae-site/` | NOVAÉ Skin (Kosmetik) |
| `ki-labels/nordfeld-site/` | NORDFELD (Einzelhandel) |
| `ki-labels/arlowe-site/` | ARLOWE (Mode) |

Alle Marken und Angebote sind fiktiv. Alle Seiten dienen nur der
Produktinformation (keine Kauffunktionen); jeder Link führt zu einem Abschnitt
derselben Seite. Das Kennzeichnungs-Icon ist das offizielle EU-Icon der
Europäischen Kommission (frei nutzbar ohne Namensnennung), auf allen Seiten
dieselbe Datei in `ki-labels/shared/`.

`ki-labels/index.html` ist eine Übersichtsseite mit allen Links.

## Lokal ansehen

```bash
python3 -m http.server 3003 --directory ki-labels
```

Dann z. B. `http://localhost:3003/nordfeld-site/?label=0` bzw. `?label=1` öffnen.
