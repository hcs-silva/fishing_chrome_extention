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

function sendRuntimeMessage(payload) {
  const MESSAGE_TIMEOUT_MS = 15000;

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Sem resposta da extensão/API (timeout)"));
    }, MESSAGE_TIMEOUT_MS);

    chrome.runtime.sendMessage(payload, (response) => {
      clearTimeout(timeoutId);

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
  const authEmailInput = document.getElementById("authEmail");
  const authPasswordInput = document.getElementById("authPassword");
  const authChoice = document.getElementById("authChoice");
  const authForm = document.getElementById("authForm");
  const authSubmitBtn = document.getElementById("authSubmitBtn");
  const cancelAuthBtn = document.getElementById("cancelAuthBtn");
  const billingActionsPanel = document.getElementById("billingActionsPanel");
  const registerBtn = document.getElementById("registerBtn");
  const loginBtn = document.getElementById("loginBtn");
  const statusBtn = document.getElementById("statusBtn");
  const upgradeBtn = document.getElementById("upgradeBtn");
  const upgradeMenu = document.getElementById("upgradeMenu");
  const portalBtn = document.getElementById("portalBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const billingMessage = document.getElementById("billingMessage");
  let authMode = null;
  let plansCache = null;

  const setBillingMessage = (message, isError = false) => {
    billingMessage.textContent = message;
    billingMessage.style.color = isError ? "#b91c1c" : "#1e293b";
  };

  const getSavedToken = async () => {
    const result = await chrome.storage.local.get(["authToken"]);
    return result.authToken || "";
  };

  const requireToken = async () => {
    const savedToken = await getSavedToken();
    if (!savedToken) {
      throw new Error("Cria conta FREE ou faz login primeiro");
    }

    return savedToken;
  };

  const saveToken = async (token) => {
    await chrome.storage.local.set({ authToken: token || "" });
  };

  const showUnauthenticatedState = () => {
    billingActionsPanel.classList.add("hidden");
    authChoice.classList.remove("hidden");
    authForm.classList.add("hidden");
    authMode = null;
  };

  const showAuthenticatedState = () => {
    authChoice.classList.add("hidden");
    authForm.classList.add("hidden");
    billingActionsPanel.classList.remove("hidden");
    authMode = null;
  };

  const startAuthFlow = (mode) => {
    authMode = mode;
    authForm.classList.remove("hidden");
    authSubmitBtn.textContent =
      mode === "register" ? "Criar conta FREE" : "Entrar";
    setBillingMessage(
      mode === "register"
        ? "Preenche email e password para criar conta FREE."
        : "Preenche email e password para entrar.",
    );
  };

  const getCredentials = () => {
    const email = (authEmailInput.value || "").trim();
    const password = (authPasswordInput.value || "").trim();

    if (!email || !password) {
      throw new Error("Preenche email e password");
    }

    return { email, password };
  };

  const fetchPlans = async () => {
    if (plansCache) {
      return plansCache;
    }

    const result = await sendRuntimeMessage({ type: "getPlans" });
    plansCache = result.plans || [];
    return plansCache;
  };

  const formatPrice = (amount, currency) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: currency || "EUR",
    }).format(amount);
  };

  const updatePlanPrices = async () => {
    try {
      const plans = await fetchPlans();

      const monthlyPlan = plans.find((p) => p.type === "monthly");
      const yearlyPlan = plans.find((p) => p.type === "yearly");

      const monthlyPriceEl = document.getElementById("monthlyPrice");
      const yearlyPriceEl = document.getElementById("yearlyPrice");

      if (monthlyPlan && monthlyPriceEl) {
        monthlyPriceEl.textContent = formatPrice(
          monthlyPlan.amount,
          monthlyPlan.currency,
        );
      }

      if (yearlyPlan && yearlyPriceEl) {
        yearlyPriceEl.textContent = formatPrice(
          yearlyPlan.amount,
          yearlyPlan.currency,
        );
      }
    } catch (error) {
      console.error("Erro ao obter preços:", error);
    }
  };

  const toggleUpgradeMenu = async () => {
    const isHidden = upgradeMenu.classList.contains("hidden");

    if (isHidden) {
      // Opening the menu - fetch and update prices
      await updatePlanPrices();
      upgradeMenu.classList.remove("hidden");
    } else {
      // Closing the menu
      upgradeMenu.classList.add("hidden");
    }
  };

  const closeUpgradeMenu = () => {
    upgradeMenu.classList.add("hidden");
  };

  const handlePlanSelection = async (planType) => {
    closeUpgradeMenu();

    try {
      setBillingMessage("A abrir checkout Stripe...");
      const token = await requireToken();

      const status = await sendRuntimeMessage({
        type: "subscriptionStatus",
        token,
      });

      if (
        (status.plano || "free") === "premium" &&
        (status.planoStatus === "active" || status.planoStatus === "trialing")
      ) {
        setBillingMessage("Já tens plano PREMIUM ativo. Usa 'Gerir plano'.");
        return;
      }

      const session = await sendRuntimeMessage({
        type: "createCheckout",
        token,
        planType: planType,
      });

      if (!session.url) {
        throw new Error("URL de checkout não encontrada");
      }

      await chrome.tabs.create({ url: session.url });
      setBillingMessage(
        "Checkout aberto. Após pagamento, o webhook ativa o PREMIUM; clica 'Ver estado'.",
      );
    } catch (error) {
      setBillingMessage(error.message || "Erro ao abrir checkout", true);
    }
  };

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

  // Estado inicial da área de autenticação/subscrição
  if (await getSavedToken()) {
    showAuthenticatedState();
  } else {
    showUnauthenticatedState();
  }

  // Muda spot
  spotSelect.addEventListener("change", (e) => {
    carregarDados(e.target.value);
  });

  registerBtn.addEventListener("click", async () => {
    startAuthFlow("register");
  });

  loginBtn.addEventListener("click", async () => {
    startAuthFlow("login");
  });

  cancelAuthBtn.addEventListener("click", () => {
    authForm.classList.add("hidden");
    authEmailInput.value = "";
    authPasswordInput.value = "";
    authMode = null;
    setBillingMessage("Autenticação cancelada.");
  });

  authSubmitBtn.addEventListener("click", async () => {
    try {
      if (!authMode) {
        throw new Error("Escolhe 'Criar conta FREE' ou 'Entrar'");
      }

      authSubmitBtn.disabled = true;

      const { email, password } = getCredentials();
      setBillingMessage(
        authMode === "register"
          ? "A criar conta FREE..."
          : "A iniciar sessão...",
      );

      const result = await sendRuntimeMessage(
        authMode === "register"
          ? {
              type: "registerAccount",
              email,
              password,
            }
          : {
              type: "loginAccount",
              email,
              password,
            },
      );

      await saveToken(result.token || "");
      showAuthenticatedState();
      authPasswordInput.value = "";
      setBillingMessage(
        authMode === "register"
          ? "Conta FREE criada. Agora podes fazer upgrade."
          : "Sessão iniciada. Podes avançar para upgrade.",
      );
    } catch (error) {
      setBillingMessage(
        error.message ||
          (authMode === "register" ? "Erro ao criar conta" : "Erro no login"),
        true,
      );
    } finally {
      authSubmitBtn.disabled = false;
    }
  });

  statusBtn.addEventListener("click", async () => {
    try {
      setBillingMessage("A verificar estado...");
      const token = await requireToken();
      const status = await sendRuntimeMessage({
        type: "subscriptionStatus",
        token,
      });

      const plan = (status.plano || "free").toUpperCase();
      const state = status.planoStatus || "unknown";
      setBillingMessage(`Plano: ${plan} | Estado: ${state}`);
    } catch (error) {
      setBillingMessage(error.message || "Erro ao obter estado", true);
    }
  });

  // Upgrade button - toggle dropdown menu
  upgradeBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await toggleUpgradeMenu();
  });

  // Handle plan selection from dropdown
  document.querySelectorAll(".dropdown-item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      const planType = e.currentTarget.getAttribute("data-plan");
      await handlePlanSelection(planType);
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !upgradeBtn.contains(e.target) &&
      !upgradeMenu.contains(e.target)
    ) {
      closeUpgradeMenu();
    }
  });

  portalBtn.addEventListener("click", async () => {
    try {
      setBillingMessage("A abrir portal Stripe...");
      const token = await requireToken();
      const portal = await sendRuntimeMessage({
        type: "createPortal",
        token,
      });

      if (!portal.url) {
        throw new Error("URL do portal não encontrada");
      }

      await chrome.tabs.create({ url: portal.url });
      setBillingMessage("Portal de faturação aberto");
    } catch (error) {
      setBillingMessage(error.message || "Erro ao abrir portal", true);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await saveToken("");
      authPasswordInput.value = "";
      showUnauthenticatedState();
      setBillingMessage("Sessão terminada. Token removido.");
    } catch (error) {
      setBillingMessage(error.message || "Erro ao terminar sessão", true);
    }
  });
});
