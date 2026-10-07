# Roster DJ · Black Panther — pagina web

Pagina privata con l'elenco dei DJ registrati: nome, paese, generi e link stream.
I dati arrivano dall'API del bot che gira sul NAS.

`index.html` è in radice, pronta per GitHub Pages.

---

## Prima di pubblicare: il problema HTTPS

GitHub Pages serve la pagina in **HTTPS**. Un sito HTTPS **non può** chiamare un
indirizzo in `http://`: il browser blocca la richiesta e non la fa nemmeno partire.

Quindi, se metti la pagina su GitHub, il NAS deve rispondere in HTTPS.

**Come sistemarlo sul Synology** (una volta sola, gratis):

1. Pannello di controllo → **Accesso esterno** → **DDNS** → Aggiungi
   Scegli il servizio **Synology**, prendi un nome tipo `blackpanther.synology.me`
   e spunta **Ottieni un certificato Let's Encrypt**.
2. Pannello di controllo → **Portale di accesso** → **Proxy inverso** → Crea
   - Origine: `https://blackpanther.synology.me` porta `8787`
   - Destinazione: `http://localhost` porta `8787`
3. Sul router, apri la porta `8787` verso il NAS.
4. Nella pagina, come indirizzo del server metti `https://blackpanther.synology.me:8787`

**Se non vuoi fare tutto questo**, non pubblicare su GitHub: apri la pagina
direttamente dal NAS, che la serve già da sé all'indirizzo
`http://192.168.1.16:8787`. È la strada più semplice e funziona subito.

---

## Pubblicare su GitHub

1. Crea un repository su GitHub (può essere privato: GitHub Pages funziona lo
   stesso sui piani a pagamento; se è gratuito, il repository deve essere pubblico
   — ma **la pagina resta inutile senza la chiave**, quindi non espone nulla).
2. Copia questa cartella dentro al repository.
3. Lancia `PUBBLICA-SU-GITHUB.bat`.
4. Su GitHub: **Settings → Pages → Branch: `main` / `(root)`**.

Dopo un paio di minuti la pagina è online.

---

## Primo accesso

Al primo avvio la pagina chiede due cose:

- **Chiave** — è la `WEB_API_KEY` scritta nel file `.env` del bot sul NAS
- **Indirizzo del server** — per esempio `https://blackpanther.synology.me:8787`

Restano salvate su quel dispositivo. Per cambiarle, premi **Dimentica la chiave**
in fondo alla pagina.

> Chi apre la pagina senza la chiave non vede nessun dato: l'API risponde 401.

---

## Cosa c'è nella pagina

- elenco dei DJ con nome, paese, generi e link stream
- la **barra colorata a sinistra** dice se il profilo è completo: ambra se ha logo
  e link, rosa se manca qualcosa
- ricerca per nome, genere o paese — il tasto `/` porta subito nella ricerca,
  `Esc` la svuota
- filtro **Senza logo** per vedere chi deve ancora mandarlo
- **Copia link** copia lo stream con un clic
- scarica tutto in CSV, si apre in Excel

**Funziona anche a NAS spento**: mostra l'ultimo elenco scaricato, scrivendo in
alto di quando sono i dati. I font sono nella cartella `fonts/`, quindi la pagina
resta identica anche senza internet.

Dal telefono puoi aggiungerla alla schermata home: si comporta come un'app.

---

## File

```
index.html              la pagina
app.css                 grafica
app.js                  logica e chiamate all'API
sw.js                   service worker (funzionamento offline)
manifest.webmanifest    per l'installazione su telefono
icon.svg + icon-*.png   icone
fonts/                  i caratteri, inclusi nel pacchetto
```

Non c'è niente da compilare: sono file statici.
