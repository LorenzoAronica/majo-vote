# Majorana Vote — v1.0

Mini-sito gratuito per gli studenti, pubblicabile su **GitHub Pages** senza server.

## Funzioni

- Materie personalizzabili
- Registrazione dei voti da 1 a 10 con pesi 25%, 50%, 100%, 150%, 200%
- Media ponderata di ogni materia e media generale indicativa (media delle medie delle materie che hanno voti)
- Obiettivo per materia (es. arrivare a 9)
- Simulazioni con 1, 2, 3, 4 nuovi voti da 1 a 10, in incrementi di 0,5, assumendo peso 100%
- Avviso se l'obiettivo è irraggiungibile in quel numero di prove
- Numero minimo teorico di nuovi 10 necessari
- Memorizzazione nel browser del dispositivo con `localStorage` (nessun server, nessun account)
- Layout ottimizzato anche per smartphone

**Attenzione:** la media matematica non è il voto finale di pagella. In particolare il criterio di calcolo della media generale è una scelta del progetto, non un criterio ministeriale.

## Come pubblicarlo su GitHub Pages

1. Accedi a [github.com](https://github.com) e crea un repository pubblico, ad esempio `majorana-vote`.
2. Clicca su **Add file → Upload files**.
3. Carica i tre file `index.html`, `styles.css`, `app.js` direttamente nella cartella principale del repository (non dentro una sottocartella).
4. Premi **Commit changes**.
5. Vai in **Settings → Pages**.
6. In **Build and deployment → Source** scegli **Deploy from a branch**.
7. Seleziona il branch **main**, la cartella **/(root)** e premi **Save**.
8. Dopo la pubblicazione, il sito avrà tipicamente un indirizzo come `https://TUOUSERNAME.github.io/majorana-vote/`.

Le impostazioni e l'interfaccia GitHub possono cambiare nel tempo. Per aggiornare il sito, sostituisci i file nel repository e conferma le modifiche.

## Aprirlo in locale

Apri `index.html` in un browser recente. Non servono compilazioni, account o API a pagamento.

## Privacy

I voti vengono salvati solo nel browser usato. Chi cancella i dati del browser o cambia dispositivo non ritrova i voti. Per questo prototipo non sono raccolti nomi, email o dati su un server.

## Struttura

- `index.html`: struttura della pagina
- `styles.css`: grafica responsive
- `app.js`: calcoli matematici, simulazioni, interazioni e salvataggio locale

## Esempio di controllo matematico

4 voti pari a 7 → media 7. Dopo 4 voti pari a 10 → media (4×7+4×10)/8 = 8,5. Per arrivare a 9 occorrono **8** voti pari a 10: (4×7+8×10)/12 = 9.

Versione dimostrativa indipendente, non affiliata ufficialmente all'istituto.
