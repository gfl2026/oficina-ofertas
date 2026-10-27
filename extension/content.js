// Oficina de Ofertas — content script injetado na Biblioteca de Anúncios da Meta.
// Como o Facebook usa classes CSS ofuscadas/aleatórias, a extração é baseada em
// padrões de TEXTO (que são estáveis em PT-BR), não em seletores CSS.
// Por isso o botão abre um painel editável — é esperado precisar revisar/corrigir
// alguns campos antes de salvar, igual fazíamos manualmente.

(function () {
  "use strict";

  const MONTHS_PT = {
    jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
    jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
  };

  const CTA_TEXTS = [
    "Saiba mais", "Baixar", "Comprar agora", "Ver detalhes",
    "Enviar mensagem", "Download", "Cadastre-se", "Inscreva-se",
    "Ver resumo", "Comprar", "Fazer pedido", "Reservar",
  ];

  const processed = new WeakSet();

  function textOf(el) {
    return el.innerText || el.textContent || "";
  }

  function linesOf(el) {
    return textOf(el)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function currentKeyword() {
    try {
      return new URL(location.href).searchParams.get("q") || "";
    } catch (_e) {
      return "";
    }
  }

  function extractDate(txt) {
    const m = txt.match(
      /Veiculaç[aã]o iniciada em\s+(\d{1,2})\s+de\s+([a-zçÇ]+)\s+de\s+(\d{4})/i
    );
    if (!m) return null;
    const mon = MONTHS_PT[m[2].toLowerCase().slice(0, 3)];
    if (mon === undefined) return null;
    return new Date(Number(m[3]), mon, Number(m[1]));
  }

  function daysActiveFrom(date) {
    if (!date) return "";
    const diff = Math.round((Date.now() - date.getTime()) / 86400000);
    return Math.max(diff, 0);
  }

  // Encontra os nós de texto que marcam o início de cada card ("Identificação da biblioteca:")
  function findLibraryIdNodes() {
    const candidates = document.querySelectorAll("div, span");
    const out = [];
    candidates.forEach((el) => {
      const ownText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent)
        .join("");
      if (/Identificaç[aã]o da biblioteca:/.test(ownText)) out.push(el);
    });
    return out;
  }

  // Sobe na árvore até o maior ancestral que ainda contém só 1 ocorrência do rótulo
  // de id — isso delimita o card inteiro sem depender de classes.
  function findCardRoot(labelNode) {
    let candidate = labelNode;
    let el = labelNode.parentElement;
    let steps = 0;
    while (el && el !== document.body && steps < 14) {
      const txt = textOf(el);
      const idCount = (txt.match(/Identificaç[aã]o da biblioteca:/g) || []).length;
      if (idCount > 1) break;
      candidate = el;
      el = el.parentElement;
      steps++;
    }
    return candidate;
  }

  function extractCardData(card) {
    const txt = textOf(card);
    const lines = linesOf(card);

    const idm = txt.match(/Identificaç[aã]o da biblioteca:\s*(\d+)/i);
    const libraryId = idm ? idm[1] : "";

    const date = extractDate(txt);
    const days = daysActiveFrom(date);

    const dupm = txt.match(/(\d+)\s+an[uú]ncios usam esse criativo/i);
    const creativeCount = dupm ? Number(dupm[1]) : "";

    const spIdx = lines.findIndex((l) => /^Patrocinado$/i.test(l));
    const advertiser = spIdx > 0 ? lines[spIdx - 1] : "";

    let body = "";
    if (spIdx !== -1) {
      const rest = lines.slice(spIdx + 1);
      const stopIdx = rest.findIndex(
        (l) =>
          CTA_TEXTS.some((c) => l.toLowerCase().startsWith(c.toLowerCase())) ||
          /^[A-Z0-9.\-]+\.(COM|COM\.BR|APP|SITE|SHOP|ONLINE|STORE|NET)(\b|$)/i.test(l)
      );
      body = (stopIdx === -1 ? rest : rest.slice(0, stopIdx)).join(" ").slice(0, 600);
    }

    const domainLine = lines.find((l) =>
      /^[A-Z0-9.\-]+\.(COM|COM\.BR|APP|SITE|SHOP|ONLINE|STORE|NET)(\b|$)/i.test(l)
    );

    let destHref = "";
    const links = card.querySelectorAll("a[href]");
    for (const a of links) {
      const t = (a.innerText || "").trim();
      if (CTA_TEXTS.some((c) => t.toLowerCase().startsWith(c.toLowerCase()))) {
        destHref = a.href;
        break;
      }
    }
    if (destHref && /l\.facebook\.com\/l\.php/.test(destHref)) {
      try {
        const u = new URL(destHref).searchParams.get("u");
        if (u) destHref = decodeURIComponent(u);
      } catch (_e) {
        /* mantém destHref original */
      }
    }
    if (!destHref && domainLine) {
      destHref = "https://" + domainLine.toLowerCase();
    }

    return {
      libraryId,
      daysActive: days,
      creativeCount,
      advertiser,
      body,
      destHref,
      keyword: currentKeyword(),
      pageUrl: location.href,
    };
  }

  // ---------- painel flutuante ----------

  let nichesCache = null;

  function ensurePanel() {
    let panel = document.getElementById("ofc-panel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "ofc-panel";
    panel.innerHTML = `
      <div class="ofc-panel-inner">
        <div class="ofc-panel-header">
          <span>Enviar pra Oficina de Ofertas</span>
          <button id="ofc-close" type="button" aria-label="Fechar">×</button>
        </div>
        <div class="ofc-body">
          <label>Título<input id="ofc-title" type="text"></label>
          <label>Nicho
            <input id="ofc-niche" list="ofc-niche-list" type="text" placeholder="escolha ou digite um novo">
            <datalist id="ofc-niche-list"></datalist>
          </label>
          <label>Palavra-chave<input id="ofc-keyword" type="text"></label>
          <div class="ofc-row">
            <label>Dias ativo<input id="ofc-days" type="number" min="0"></label>
            <label>Nº criativos<input id="ofc-creatives" type="number" min="0"></label>
          </div>
          <label>Link do site<input id="ofc-site" type="text"></label>
          <label>Link do checkout<input id="ofc-checkout" type="text" placeholder="opcional"></label>
          <label>Notas<textarea id="ofc-notes" rows="4"></textarea></label>
        </div>
        <div class="ofc-actions">
          <button id="ofc-save" type="button">Salvar no sistema</button>
          <span id="ofc-status"></span>
        </div>
      </div>`;
    document.body.appendChild(panel);

    document.getElementById("ofc-close").addEventListener("click", () => {
      panel.classList.remove("open");
    });
    panel.addEventListener("click", (e) => {
      if (e.target === panel) panel.classList.remove("open");
    });
    document.getElementById("ofc-save").addEventListener("click", onSave);

    return panel;
  }

  function populateNicheList(force) {
    const datalist = document.getElementById("ofc-niche-list");
    if (!datalist) return;
    if (nichesCache && !force) {
      datalist.innerHTML = nichesCache.map((n) => `<option value="${escapeAttr(n)}">`).join("");
      return;
    }
    chrome.runtime.sendMessage({ type: "GET_NICHES" }, (res) => {
      if (res && res.ok) {
        nichesCache = res.niches;
        datalist.innerHTML = nichesCache.map((n) => `<option value="${escapeAttr(n)}">`).join("");
      }
    });
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function openPanelFor(data) {
    const panel = ensurePanel();
    document.getElementById("ofc-title").value = data.advertiser || "";
    document.getElementById("ofc-niche").value = "";
    document.getElementById("ofc-keyword").value = data.keyword || "";
    document.getElementById("ofc-days").value = data.daysActive === "" ? "" : data.daysActive;
    document.getElementById("ofc-creatives").value = data.creativeCount || "";
    document.getElementById("ofc-site").value = data.destHref || "";
    document.getElementById("ofc-checkout").value = "";
    document.getElementById("ofc-notes").value = data.body || "";
    document.getElementById("ofc-status").textContent = "";
    panel.dataset.adLink = data.pageUrl || location.href;
    panel.classList.add("open");
    populateNicheList(false);
    document.getElementById("ofc-title").focus();
  }

  function onSave() {
    const statusEl = document.getElementById("ofc-status");
    const panel = document.getElementById("ofc-panel");
    const payload = {
      title: val("ofc-title"),
      niche: val("ofc-niche"),
      keyword: val("ofc-keyword"),
      country: "BR",
      days_active: Number(val("ofc-days")) || 0,
      creative_count: Number(val("ofc-creatives")) || 0,
      link: panel.dataset.adLink || location.href,
      site_link: val("ofc-site"),
      checkout_link: val("ofc-checkout") || null,
      notes: val("ofc-notes"),
      status: "unclassified",
      preview_images: [],
    };

    if (!payload.title) {
      statusEl.textContent = "Preencha o título.";
      return;
    }

    statusEl.textContent = "Salvando...";
    chrome.runtime.sendMessage({ type: "SAVE_OFFER", payload }, (res) => {
      if (res && res.ok) {
        statusEl.textContent = "Salvo ✓";
        nichesCache = null; // força atualizar lista de nichos na próxima abertura
        setTimeout(() => panel.classList.remove("open"), 900);
      } else {
        statusEl.textContent = "Erro: " + ((res && res.error) || "desconhecido");
      }
    });
  }

  // ---------- injeção dos botões ----------

  function injectButtons() {
    const labelNodes = findLibraryIdNodes();
    labelNodes.forEach((label) => {
      const card = findCardRoot(label);
      if (!card || processed.has(card)) return;
      processed.add(card);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ofc-add-btn";
      btn.textContent = "+ Oficina";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPanelFor(extractCardData(card));
      });

      const computedPos = window.getComputedStyle(card).position;
      if (computedPos === "static" || !computedPos) {
        card.style.position = "relative";
      }
      card.appendChild(btn);
    });
  }

  let scheduled = false;
  function scheduleInject() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      injectButtons();
    }, 400);
  }

  const observer = new MutationObserver(scheduleInject);
  observer.observe(document.body, { childList: true, subtree: true });

  injectButtons();
})();
