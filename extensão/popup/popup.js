function fetchPrevisao(spotId) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "getPrevisao", spotId }, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      if (!response || !response.ok) {
        reject(new Error((response && response.error) || "Erro"));
        return;
      }

      resolve(response.data);
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const spotSelect = document.getElementById("spotSelect");

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
    else if (recomendacao.includes("Cuidado")) elem.classList.add("cuidado");
    else elem.classList.add("espera");
  };

  const carregarDados = async (spotId) => {
    try {
      document.getElementById("spotNome").textContent = "A carregar...";

      const data = await fetchPrevisao(spotId);

      document.getElementById("spotNome").textContent = data.spot;
      document.getElementById("mare").textContent =
        `${data.mare.estado} (${data.mare.altura})`;
      document.getElementById("ondas").textContent =
        data.ondas.altura + " " + data.ondas.direcao;

      // Display wind data
      if (data.vento) {
        document.getElementById("vento").textContent =
          `${data.vento.velocidade} ${data.vento.direcao}`;
      } else {
        document.getElementById("vento").textContent = "";
      }

      document.getElementById("tempAgua").textContent = data.tempAgua;

      // Display solunar data
      if (data.solunar) {
        const solunarText = `☀️ ${data.solunar.nascerSol} - ${data.solunar.porSol}\n🌙 ${data.solunar.luaFase} (${data.solunar.luaFaseValor})`;
        document.getElementById("solunar").innerHTML = solunarText.replace(
          /\n/g,
          "<br>",
        );
      } else {
        document.getElementById("solunar").textContent = "";
      }

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
