const DEFAULT_API_URL =
  "https://fishing-chrome-extention.onrender.com/api/previsao";
let API_URL = DEFAULT_API_URL;

async function getStoredApiUrl() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(["apiUrl"], (res) => {
        resolve(res && res.apiUrl ? res.apiUrl : DEFAULT_API_URL);
      });
    } catch (e) {
      resolve(DEFAULT_API_URL);
    }
  });
}

async function saveApiUrl(url) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ apiUrl: url }, () => resolve());
  });
}

function toggleSettings(show) {
  const panel = document.getElementById("settingsPanel");
  panel.classList.toggle("hidden", !show);
}

document.addEventListener("DOMContentLoaded", async () => {
  const spotSelect = document.getElementById("spotSelect");
  const settingsBtn = document.getElementById("settingsBtn");
  const saveApiBtn = document.getElementById("saveApiBtn");
  const resetApiBtn = document.getElementById("resetApiBtn");
  const apiUrlInput = document.getElementById("apiUrlInput");
  const settingsMsg = document.getElementById("settingsMsg");
  const currentApi = document.getElementById("currentApi");

  // Inicializa API_URL a partir do storage
  API_URL = await getStoredApiUrl();
  apiUrlInput.value = API_URL;
  currentApi.textContent = API_URL;

  settingsBtn.addEventListener("click", () => {
    const panel = document.getElementById("settingsPanel");
    panel.classList.toggle("hidden");
  });

  saveApiBtn.addEventListener("click", async () => {
    const val = apiUrlInput.value.trim();
    if (!val) {
      settingsMsg.textContent = "URL inválida";
      return;
    }
    await saveApiUrl(val);
    API_URL = val;
    currentApi.textContent = API_URL;
    settingsMsg.textContent = "Guardado ✅";
    setTimeout(() => (settingsMsg.textContent = ""), 2000);
    carregarDados(parseInt(document.getElementById("spotSelect").value));
  });

  resetApiBtn.addEventListener("click", async () => {
    await saveApiUrl(DEFAULT_API_URL);
    API_URL = DEFAULT_API_URL;
    apiUrlInput.value = API_URL;
    currentApi.textContent = API_URL;
    settingsMsg.textContent = "Reposto para default ✅";
    setTimeout(() => (settingsMsg.textContent = ""), 2000);
    carregarDados(parseInt(document.getElementById("spotSelect").value));
  });

  const atualizarBadge = (score) => {
    const badge = document.getElementById("scoreBadge");
    badge.textContent = score + "/10";
    badge.className = "badge";
    if (score >= 7) badge.classList.add("bom");
    else if (score >= 6) badge.classList.add("razoavel");
    else badge.classList.add("espera");
  };

  const atualizarRecomendacao = (recomendacao, bomAgora) => {
    const elem = document.getElementById("recomendacao");
    elem.textContent = recomendacao;
    elem.className = "recomendacao";
    if (recomendacao.includes("AGORA")) elem.classList.add("top");
    else if (recomendacao.includes("Razoável")) elem.classList.add("ok");
    else if (recomendacao.includes("Cuidados")) elem.classList.add("cuidado");
    else elem.classList.add("espera");
  };

  const carregarDados = async (spotId) => {
    try {
      document.getElementById("spotNome").textContent = "A carregar...";

      const res = await fetch(`${API_URL}?spotId=${spotId}`);
      const data = await res.json();

      document.getElementById("spotNome").textContent = data.spot;
      document.getElementById("mare").textContent =
        `${data.mare.estado} (${data.mare.altura})`;
      document.getElementById("ondas").textContent =
        data.ondas.altura + " " + data.ondas.direcao;
      document.getElementById("tempAgua").textContent = data.tempAgua;

      atualizarBadge(data.scorePeixe);
      atualizarRecomendacao(data.recomendacao, data.bomAgora);
    } catch (err) {
      console.error(err);
      document.getElementById("spotNome").textContent = "Erro conexão";
      document.getElementById("recomendacao").textContent = "Verifica backend";
      document.getElementById("recomendacao").className = "recomendacao espera";
    }
  };

  // Carrega Caparica por default
  carregarDados(1);

  // Muda spot
  spotSelect.addEventListener("change", (e) => {
    carregarDados(e.target.value);
  });
});
