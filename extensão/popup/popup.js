const API_URL = "http://localhost:5005/api/previsao";

document.addEventListener("DOMContentLoaded", () => {
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
