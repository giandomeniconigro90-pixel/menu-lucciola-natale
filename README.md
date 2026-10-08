# Menù La Lucciola

Base derivata da menu-lucciola-natale. Google Sheets continua ad alimentare prodotti e orari.

## Temi

Il tema normale è predefinito. Per riattivare neve, luci e bordi natalizi aprire `index.html?tema=natale` (oppure aggiungere `?tema=natale` all’URL del sito). Gli effetti sono conservati in `themes/natale.css`; le immagini originali restano disponibili.

## CSV

Menù: intestazioni `categoria,nome,prezzo`, più `descrizione,allergeni,tag,tipo,disponibile` facoltative. Prezzi numerici con virgola o punto e massimo due decimali; zero esplicito è valido, valori mancanti o errati mostrano “Prezzo da verificare”. `no`/`false` nascondono il prodotto; `soldout` lo marca terminato.

Orari: `day,start,end`, giorni italiani anche abbreviati, ore `HH:MM`, `24:00` consentito come fine. Per chiusura usare `CHIUSO` in start e end vuoto o `CHIUSO`. Giorni omessi restano chiusi. Fasce oltre mezzanotte sono supportate. Fuso orario Europe/Rome.

Cache disponibile dopo una visita riuscita; non è una PWA offline. Se il CSV non è valido o la rete fallisce si conservano i dati salvati, segnalandolo all’utente. Il foglio deve essere pubblicato in CSV.

## Verifica

`node --test tests/menu.test.cjs`

Partita IVA e allergeni richiedono verifica dei dati originali prima della pubblicazione; non sono stati ricostruiti automaticamente.

## Gestione dal Google Fogli

Nel foglio già pubblicato aggiungere I1 `data_inizio` e J1 `data_fine`. Non cambiare le otto intestazioni precedenti né il collegamento CSV. Queste date valgono solo per avvisi e impostazione del tema; i prodotti continuano a usare `disponibile`.

Le date accettano `2026-12-01` oppure `01/12/2026`. Inizio e fine sono inclusi, nel fuso Europe/Rome. Una data vuota lascia aperto quel limite; date errate o invertite disattivano la riga.

Per programmare l'avviso esistente impostare `disponibile` a TRUE e compilare le due date. Per nasconderlo usare FALSE. Le righe con categoria contenente AVVISO sono avvisi, non prodotti.

Per il tema aggiungere una riga vuota in fondo:

| Colonna | Valore di esempio |
| --- | --- |
| A categoria | IMPOSTAZIONE |
| B nome | tema |
| C prezzo | vuoto |
| D descrizione | natale |
| E allergeni | vuoto |
| F tag | vuoto |
| G disponibile | TRUE |
| H tipo | vuoto |
| I data_inizio | 2026-12-01 |
| J data_fine | 2026-12-31 |

Se la convalida della categoria impedisce di scrivere IMPOSTAZIONE, aggiungerla alle voci consentite per questa cella. Usare una sola riga tema: `normale` oppure `natale` in descrizione. Senza una riga attiva il tema è normale; quindi dopo il 31 dicembre dell'esempio torna normale automaticamente. Se esistono più righe tema attive, prevale l'ultima valida.

Gli URL `?tema=natale` e `?tema=normale` forzano il tema per le prove, indipendentemente dal foglio. Rimuovere il parametro per seguire il foglio.

Il sito rilegge il CSV ogni due minuti mentre la pagina è visibile e quando si torna alla pagina. Avvisi e tema vengono controllati ogni minuto anche sui dati salvati. La pubblicazione Google può aggiungere un ritardo. La ricerca corrente viene conservata durante gli aggiornamenti.

## Pubblicazione e verifica

Nove test automatici verificano parsing, ricerca, errori di rete, pillole, date, tema e aggiornamento. La nuova logica non modifica la disposizione grafica, ma va verificata sul tablet dopo il deploy.

Per un sito Netlify caricato manualmente occorre caricare nuovamente i file del ramo `fix/menu-affidabile-tema-natale` in Deploys. Dopo questo aggiornamento del codice, le modifiche al foglio non richiedono altri caricamenti del sito.
