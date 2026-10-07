/* ============================================================
   Roster DJ · Black Panther
   Pagina privata: legge l'API del bot sul NAS.
   Se il NAS è spento mostra l'ultimo elenco salvato nel browser.
   ============================================================ */

"use strict";

const STORAGE = {
  key: "bp.apiKey",
  base: "bp.apiBase",
  cache: "bp.roster",
};

const el = {
  gate: document.getElementById("gate"),
  gateForm: document.getElementById("gateForm"),
  gateError: document.getElementById("gateError"),
  gateSubmit: document.getElementById("gateSubmit"),
  keyInput: document.getElementById("keyInput"),
  urlInput: document.getElementById("urlInput"),
  urlField: document.getElementById("urlField"),
  toggleUrl: document.getElementById("toggleUrl"),

  app: document.getElementById("app"),
  rack: document.getElementById("rack"),
  loading: document.getElementById("loading"),
  search: document.getElementById("search"),
  refresh: document.getElementById("refresh"),
  exportCsv: document.getElementById("exportCsv"),
  count: document.getElementById("count"),
  forget: document.getElementById("forget"),
  notice: document.getElementById("notice"),
  noticeText: document.getElementById("noticeText"),
  noticeAction: document.getElementById("noticeAction"),
  toast: document.getElementById("toast"),
  template: document.getElementById("rowTemplate"),
};

const state = {
  djs: [],
  query: "",
  filter: "tutti",
  stale: false,
};

/* ---------- Memoria locale (tollerante: può essere bloccata) ---------- */

const store = {
  get(name) {
    try { return localStorage.getItem(name); } catch { return null; }
  },
  set(name, value) {
    try { localStorage.setItem(name, value); } catch { /* ignorato */ }
  },
  remove(name) {
    try { localStorage.removeItem(name); } catch { /* ignorato */ }
  },
};

/** Indirizzo del server: quello salvato, altrimenti quello da cui arriva la pagina. */
function apiBase() {
  const saved = store.get(STORAGE.base);
  if (saved) return saved.replace(/\/+$/, "");
  return location.origin.startsWith("http") ? location.origin : "";
}

function apiKey() {
  return store.get(STORAGE.key) || "";
}

async function callApi(path, { key = apiKey(), base = apiBase() } = {}) {
  const response = await fetch(`${base}${path}`, {
    headers: { "x-api-key": key },
    cache: "no-store",
  });
  if (response.status === 401) throw Object.assign(new Error("chiave"), { code: 401 });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/* ---------- Accesso ---------- */

function showGate(message) {
  el.app.hidden = true;
  el.gate.hidden = false;
  el.gateError.hidden = !message;
  el.gateError.textContent = message || "";
  el.keyInput.focus();
}

el.toggleUrl.addEventListener("click", () => {
  el.urlField.hidden = !el.urlField.hidden;
  if (!el.urlField.hidden) {
    el.urlInput.value = store.get(STORAGE.base) || "";
    el.urlInput.focus();
  }
});

el.gateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const key = el.keyInput.value.trim();
  const base = (el.urlInput.value || "").trim().replace(/\/+$/, "");
  if (!key) return;

  // Una pagina servita in HTTPS non può chiamare un indirizzo in HTTP:
  // il browser blocca la richiesta senza dire niente. Meglio spiegarlo prima.
  const target = base || apiBase();
  if (location.protocol === "https:" && target.startsWith("http://")) {
    return showGate(
      "Questa pagina è su HTTPS e il server che hai indicato è su HTTP: il browser blocca il collegamento. " +
      "Serve un indirizzo https:// per il NAS (DDNS Synology con certificato), oppure apri la pagina direttamente dal NAS."
    );
  }

  el.gateSubmit.disabled = true;
  el.gateSubmit.textContent = "Verifico…";

  try {
    await callApi("/api/dj", { key, base: target });
    store.set(STORAGE.key, key);
    if (base) store.set(STORAGE.base, base);
    el.gate.hidden = true;
    el.app.hidden = false;
    start();
  } catch (error) {
    if (error.code === 401) showGate("Chiave non valida.");
    else showGate("Non riesco a raggiungere il server. Controlla che il NAS sia acceso e che l'indirizzo sia giusto.");
  } finally {
    el.gateSubmit.disabled = false;
    el.gateSubmit.textContent = "Entra";
  }
});

el.forget.addEventListener("click", () => {
  store.remove(STORAGE.key);
  store.remove(STORAGE.cache);
  location.reload();
});

/* ---------- Avvisi ---------- */

function notify(text, action) {
  el.notice.hidden = false;
  el.noticeText.textContent = text;
  if (action) {
    el.noticeAction.hidden = false;
    el.noticeAction.textContent = action.label;
    el.noticeAction.onclick = action.run;
  } else {
    el.noticeAction.hidden = true;
  }
}

function clearNotice() {
  el.notice.hidden = true;
}

let toastTimer;
function toast(text) {
  el.toast.hidden = false;
  el.toast.textContent = text;
  requestAnimationFrame(() => el.toast.classList.add("is-on"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.toast.classList.remove("is-on");
    setTimeout(() => { el.toast.hidden = true; }, 200);
  }, 1600);
}

/* ---------- Caricamento dati ---------- */

async function load({ silent = false } = {}) {
  if (!silent) el.refresh.classList.add("is-busy");

  try {
    const data = await callApi("/api/dj");
    state.djs = data.djs;
    state.stale = false;
    store.set(STORAGE.cache, JSON.stringify({ at: Date.now(), djs: data.djs }));
    clearNotice();
    render();
  } catch (error) {
    if (error.code === 401) {
      store.remove(STORAGE.key);
      return showGate("La chiave non è più valida. Inseriscila di nuovo.");
    }

    // NAS spento o irraggiungibile: si lavora con l'ultima copia salvata.
    const cached = store.get(STORAGE.cache);
    if (cached) {
      const { at, djs } = JSON.parse(cached);
      state.djs = djs;
      state.stale = true;
      render();
      notify(
        `Server non raggiungibile. Stai vedendo l'elenco salvato il ${new Date(at).toLocaleString("it-IT")}.`,
        { label: "Riprova", run: () => load() }
      );
    } else {
      el.rack.innerHTML = "";
      const message = document.createElement("p");
      message.className = "rack__empty";
      message.innerHTML = "<strong>Server non raggiungibile.</strong><br>Accendi il NAS e riprova.";
      el.rack.append(message);
      notify("Nessun dato salvato su questo dispositivo.", { label: "Riprova", run: () => load() });
    }
  } finally {
    el.refresh.classList.remove("is-busy");
  }
}

/* ---------- Disegno dell'elenco ---------- */

function initials(name) {
  return name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function matches(dj) {
  if (state.filter === "senza-logo" && dj.hasLogo) return false;
  if (!state.query) return true;
  const haystack = `${dj.djName} ${dj.styles} ${dj.timezone} ${dj.discordTag || ""}`.toLowerCase();
  return haystack.includes(state.query);
}

function render() {
  const visible = state.djs.filter(matches);
  el.rack.innerHTML = "";

  if (visible.length === 0) {
    const message = document.createElement("p");
    message.className = "rack__empty";
    message.innerHTML = state.djs.length === 0
      ? "<strong>Nessun DJ registrato.</strong><br>Le registrazioni fatte su Discord compaiono qui."
      : "<strong>Nessun risultato.</strong><br>Prova con un altro termine.";
    el.rack.append(message);
  } else {
    const fragment = document.createDocumentFragment();
    for (const dj of visible) fragment.append(row(dj));
    el.rack.append(fragment);
  }

  const total = state.djs.length;
  const senzaLogo = state.djs.filter((dj) => !dj.hasLogo).length;
  el.count.textContent = visible.length === total
    ? `${total} DJ · ${senzaLogo} senza logo${state.stale ? " · dati non aggiornati" : ""}`
    : `${visible.length} di ${total} DJ`;

  el.exportCsv.href = `${apiBase()}/api/export.csv?key=${encodeURIComponent(apiKey())}`;
}

function row(dj) {
  const node = el.template.content.firstElementChild.cloneNode(true);
  node.dataset.complete = dj.hasLogo && dj.link ? "yes" : "no";

  const img = node.querySelector("img");
  const initialsBadge = node.querySelector(".dj__initials");
  initialsBadge.textContent = initials(dj.djName);

  if (dj.hasLogo) {
    // L'identificativo può contenere ":" (schede importate): va codificato.
    const logoPath = dj.logoUrl.replace(/\/api\/dj\/(.+)\/logo$/, (_, id) =>
      `/api/dj/${encodeURIComponent(id)}/logo`
    );
    img.src = `${apiBase()}${logoPath}?key=${encodeURIComponent(apiKey())}`;
    img.alt = `Logo di ${dj.djName}`;
    img.addEventListener("error", () => { img.hidden = true; }, { once: true });
    img.addEventListener("load", () => { initialsBadge.hidden = true; }, { once: true });
  } else {
    img.remove();
  }

  node.querySelector(".dj__name").textContent = dj.djName;
  node.querySelector(".dj__meta").textContent =
    [dj.timezone, dj.discordTag].filter(Boolean).join(" · ") || "—";
  node.querySelector(".dj__styles").textContent = dj.styles || "—";

  const url = node.querySelector(".dj__url");
  url.textContent = dj.link || "";

  const copy = node.querySelector(".js-copy");
  const open = node.querySelector(".js-open");

  // "Apri" compare solo se il link è davvero un indirizzo: alcuni DJ hanno
  // scritto cose come "tba" al posto dello stream.
  const isUrl = (() => {
    try { return ["http:", "https:"].includes(new URL(dj.link).protocol); } catch { return false; }
  })();

  if (dj.link) {
    if (isUrl) open.href = dj.link;
    else open.remove();
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(dj.link);
        toast(`Link di ${dj.djName} copiato`);
      } catch {
        toast("Il browser ha bloccato la copia");
      }
    });
  } else {
    copy.remove();
    open.remove();
  }

  return node;
}

/* ---------- Controlli ---------- */

let searchTimer;
el.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = el.search.value.trim().toLowerCase();
    render();
  }, 120);
});

for (const chip of document.querySelectorAll(".chip")) {
  chip.addEventListener("click", () => {
    for (const other of document.querySelectorAll(".chip")) {
      other.classList.toggle("is-on", other === chip);
      other.setAttribute("aria-pressed", String(other === chip));
    }
    state.filter = chip.dataset.filter;
    render();
  });
}

el.refresh.addEventListener("click", () => load());

// "/" porta il cursore nella ricerca, Esc la svuota.
document.addEventListener("keydown", (event) => {
  if (el.app.hidden) return;
  if (event.key === "/" && document.activeElement !== el.search) {
    event.preventDefault();
    el.search.focus();
  }
  if (event.key === "Escape" && document.activeElement === el.search) {
    el.search.value = "";
    state.query = "";
    render();
  }
});

/* ---------- Avvio ---------- */

function start() {
  el.loading?.remove();
  load();
  // Ricontrolla quando si torna sulla pagina, così i dati non restano vecchi.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) load({ silent: true });
  });
}

/**
 * Capisce se la pagina è servita dal bot stesso o da un hosting esterno
 * (GitHub Pages). Nel secondo caso l'indirizzo del NAS va chiesto subito.
 */
async function needsServerAddress() {
  if (store.get(STORAGE.base)) return false;
  try {
    const response = await fetch("health", { cache: "no-store" });
    const data = await response.json();
    return data?.service !== "black-panther-dj";
  } catch {
    return true;
  }
}

if (!apiKey()) {
  showGate();
  needsServerAddress().then((needed) => {
    if (!needed) return;
    el.urlField.hidden = false;
    el.toggleUrl.hidden = true;
    el.urlInput.required = true;
    el.urlInput.placeholder = "https://ilmionas.synology.me:8787";
  });
} else {
  el.app.hidden = false;
  start();
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
