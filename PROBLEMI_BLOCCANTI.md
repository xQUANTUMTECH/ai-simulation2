# PROBLEMI BLOCCANTI - CAFASSO AI ACADEMY

Questo documento contiene la documentazione dettagliata dei problemi critici o bloccanti riscontrati durante lo sviluppo, che richiedono una risoluzione prioritaria. Un problema viene considerato "bloccante" quando impedisce il proseguimento di una task o quando rappresenta un rischio significativo per il funzionamento del sistema.

## FORMATO DOCUMENTAZIONE PROBLEMI

Ogni problema dovrebbe essere documentato nel seguente formato:

```
## [CODICE-PROBLEMA] Titolo del problema

### Informazioni generali
- **Data rilevamento**: YYYY-MM-DD
- **Rilevato da**: [Nome]
- **Task correlata**: [Riferimento alla task in TASK_IN_CORSO.md]
- **Priorità**: [CRITICA/ALTA/MEDIA]
- **Stato**: [APERTO/IN ANALISI/RISOLTO]

### Descrizione
Descrizione dettagliata del problema...

### Impatto
- Quali funzionalità sono bloccate o compromesse
- Conseguenze per gli utenti o il sistema

### Analisi tecnica
- File coinvolti
- Comportamento osservato vs comportamento atteso
- Eventuali stack trace o log di errore
- Cause probabili

### Soluzioni tentate
1. Soluzione A
   - Risultato: ...
2. Soluzione B
   - Risultato: ...

### Soluzione proposta
Dettagli sulla soluzione proposta...

### Note aggiuntive
Eventuali informazioni aggiuntive...
```

---

## PROBLEMI ATTUALMENTE APERTI

Nessun problema bloccante attualmente aperto. Quando riscontri un problema bloccante durante lo sviluppo, documentalo qui secondo il formato sopra indicato.

---

## PROBLEMI RISOLTI

Questa sezione contiene i problemi che sono stati completamente risolti.

---

## PROCEDURE DI AGGIORNAMENTO

1. Quando identifichi un nuovo problema bloccante:
   - Aggiungi una nuova sezione in "PROBLEMI ATTUALMENTE APERTI"
   - Aggiorna la task correlata in TASK_IN_CORSO.md con stato "BLOCCATA"
   - Codifica il problema con un identificatore univoco (es. AUTH-001, DB-002)

2. Durante l'analisi e la risoluzione:
   - Aggiorna regolarmente la sezione "Analisi tecnica" e "Soluzioni tentate"
   - Mantieni aggiornato lo stato del problema (APERTO → IN ANALISI)

3. Quando risolvi un problema:
   - Aggiorna lo stato a "RISOLTO"
   - Documenta la soluzione finale in dettaglio
   - Sposta il problema da "PROBLEMI ATTUALMENTE APERTI" a "PROBLEMI RISOLTI"
   - Aggiorna la task correlata in TASK_IN_CORSO.md tornando allo stato "IN CORSO"

4. Per problemi particolarmente significativi:
   - Crea una sezione dedicata in TASK_COMPLETATE.md quando la soluzione viene implementata e testata con successo
   - Considera l'opportunità di aggiungere test specifici per prevenire la ricomparsa del problema
