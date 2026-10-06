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

## Stato della verifica

Cinque test automatici JavaScript superati. Verifica grafica browser e confronto con i CSV Google Sheets live da completare prima di pubblicare. Le modifiche sono proposte su un ramo separato.
