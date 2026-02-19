function fetchPrevisao(spotId, coords = null) {
  return new Promise((resolve, reject) => {
    const messagePayload = { type: "getPrevisao", spotId };
    
    // Add coordinates if provided
    if (coords && coords.lat && coords.lng) {
      messagePayload.lat = coords.lat;
      messagePayload.lng = coords.lng;
    }
    
    // Add token if available for custom spots
    chrome.storage.local.get(["authToken"], (result) => {
      if (result.authToken) {
        messagePayload.token = result.authToken;
      }
      
      chrome.runtime.sendMessage(messagePayload, (response) => {
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
  const feedbackToggle = document.getElementById("feedbackToggle");
  const feedbackForm = document.getElementById("feedbackForm");
  const feedbackText = document.getElementById("feedbackText");
  const sendFeedbackBtn = document.getElementById("sendFeedbackBtn");
  
  // Custom spots elements
  const customSpotsToggle = document.getElementById("customSpotsToggle");
  const customSpotsPanel = document.getElementById("customSpotsPanel");
  const customSpotsList = document.getElementById("customSpotsList");
  const addByMapBtn = document.getElementById("addByMapBtn");
  const addByCoordsBtn = document.getElementById("addByCoordsBtn");
  const mapInterface = document.getElementById("mapInterface");
  const coordsInterface = document.getElementById("coordsInterface");
  const mapSpotName = document.getElementById("mapSpotName");
  const selectedLat = document.getElementById("selectedLat");
  const selectedLng = document.getElementById("selectedLng");
  const saveMapSpotBtn = document.getElementById("saveMapSpotBtn");
  const cancelMapBtn = document.getElementById("cancelMapBtn");
  const coordsSpotName = document.getElementById("coordsSpotName");
  const coordsLat = document.getElementById("coordsLat");
  const coordsLng = document.getElementById("coordsLng");
  const saveCoordsSpotBtn = document.getElementById("saveCoordsSpotBtn");
  const cancelCoordsBtn = document.getElementById("cancelCoordsBtn");
  
  let authMode = null;
  let plansCache = null;
  let map = null;
  let marker = null;
  let selectedCoords = null;
  let customSpots = [];

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

  const handleBillingRedirect = async () => {
    const params = new URLSearchParams(window.location.search);
    const billingStatus = params.get("billingStatus");
    const sessionId = params.get("session_id");

    if (!billingStatus) {
      return;
    }

    if (billingStatus === "success") {
      try {
        if (!sessionId) {
          setBillingMessage(
            "Pagamento concluído. Sessão não encontrada para sincronização automática; clica 'Ver estado'.",
          );
        } else {
          const token = await requireToken();
          const finalizeResult = await sendRuntimeMessage({
            type: "finalizeCheckout",
            token,
            sessionId,
          });

          setBillingMessage(
            `Pagamento concluído. Plano: ${(finalizeResult.plano || "premium").toUpperCase()} | Estado: ${finalizeResult.planoStatus || "active"}`,
          );
        }
      } catch (error) {
        setBillingMessage(
          error.message ||
            "Pagamento concluído, mas falhou a sincronização automática. Clica 'Ver estado'.",
          true,
        );
      }
    } else if (billingStatus === "cancel") {
      setBillingMessage(
        "Checkout cancelado. Podes tentar novamente quando quiseres.",
      );
    }

    window.history.replaceState({}, document.title, window.location.pathname);
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
        "Checkout aberto. Após pagamento, regressa à extensão para sincronizar o plano automaticamente.",
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

  const carregarDados = async (spotId, coords = null) => {
    try {
      document.getElementById("spotNome").textContent = "A carregar...";

      const data = await fetchPrevisao(spotId, coords);

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

  await handleBillingRedirect();

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
    if (!upgradeBtn.contains(e.target) && !upgradeMenu.contains(e.target)) {
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

  // Feedback form toggle
  feedbackToggle.addEventListener("click", () => {
    feedbackForm.classList.toggle("hidden");
  });

  // Send feedback
  sendFeedbackBtn.addEventListener("click", () => {
    const feedback = feedbackText.value.trim();
    if (!feedback) {
      alert("Por favor, escreve o teu feedback antes de enviar.");
      return;
    }

    const subject = encodeURIComponent("Feedback - Fishing Tides PT");
    const body = encodeURIComponent(feedback);
    const mailtoLink = `mailto:hcs.silva.dev@gmail.com?subject=${subject}&body=${body}`;

    chrome.tabs.create({ url: mailtoLink });
    feedbackText.value = "";
    feedbackForm.classList.add("hidden");
  });

  // Custom spots functionality
  const loadCustomSpots = async () => {
    try {
      const token = await getSavedToken();
      if (!token) {
        customSpotsList.innerHTML = '<div class="no-spots-message">Faz login para gerir os teus spots</div>';
        return;
      }

      const result = await sendRuntimeMessage({
        type: "getCustomSpots",
        token,
      });

      customSpots = result.spots || [];
      renderCustomSpots(result);
    } catch (error) {
      console.error("Error loading custom spots:", error);
      customSpotsList.innerHTML = '<div class="no-spots-message">Erro ao carregar spots</div>';
    }
  };

  const renderCustomSpots = (data) => {
    const spots = data.spots || [];
    const plano = data.plano || "free";
    const limite = data.limite;

    if (spots.length === 0) {
      let message = "Ainda não tens spots personalizados.";
      if (plano === "free") {
        message += " Podes adicionar 1 spot.";
      }
      customSpotsList.innerHTML = `<div class="no-spots-message">${message}</div>`;
    } else {
      let html = "";
      
      if (plano === "free" && limite === 1) {
        html += '<div class="spot-limit-warning">👤 FREE: 1 spot máximo. Upgrade para Premium para spots ilimitados.</div>';
      }

      spots.forEach((spot) => {
        html += `
          <div class="custom-spot-item" data-spot-id="${spot.id}" data-lat="${spot.lat}" data-lng="${spot.lng}">
            <div class="custom-spot-info">
              <div class="custom-spot-name">${spot.nome}</div>
              <div class="custom-spot-coords">Lat: ${spot.lat.toFixed(4)}, Lng: ${spot.lng.toFixed(4)}</div>
            </div>
            <button class="custom-spot-remove" data-spot-id="${spot.id}">✕</button>
          </div>
        `;
      });

      customSpotsList.innerHTML = html;

      // Add click handlers for spot selection
      document.querySelectorAll(".custom-spot-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          if (!e.target.classList.contains("custom-spot-remove")) {
            const spotId = item.getAttribute("data-spot-id");
            const lat = parseFloat(item.getAttribute("data-lat"));
            const lng = parseFloat(item.getAttribute("data-lng"));
            
            // Load forecast for this spot
            carregarDados(spotId, { lat, lng });
            
            // Highlight selected spot
            document.querySelectorAll(".custom-spot-item").forEach(s => s.classList.remove("selected"));
            item.classList.add("selected");
          }
        });
      });

      // Add click handlers for remove buttons
      document.querySelectorAll(".custom-spot-remove").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const spotId = btn.getAttribute("data-spot-id");
          
          if (!confirm("Remover este spot?")) {
            return;
          }

          try {
            const token = await requireToken();
            await sendRuntimeMessage({
              type: "removeCustomSpot",
              token,
              spotId,
            });

            setBillingMessage("Spot removido com sucesso");
            await loadCustomSpots();
          } catch (error) {
            setBillingMessage(error.message || "Erro ao remover spot", true);
          }
        });
      });
    }
  };

  const initMap = () => {
    if (map) {
      return;
    }

    // Center on Portugal
    map = L.map("map").setView([39.5, -8.0], 7);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    map.on("click", (e) => {
      selectedCoords = e.latlng;
      selectedLat.textContent = selectedCoords.lat.toFixed(6);
      selectedLng.textContent = selectedCoords.lng.toFixed(6);

      if (marker) {
        marker.setLatLng(selectedCoords);
      } else {
        marker = L.marker(selectedCoords).addTo(map);
      }
    });
  };

  const showMapInterface = () => {
    mapInterface.classList.remove("hidden");
    coordsInterface.classList.add("hidden");
    
    // Initialize map after showing the interface
    setTimeout(() => {
      initMap();
      map.invalidateSize();
    }, 100);
  };

  const hideMapInterface = () => {
    mapInterface.classList.add("hidden");
    mapSpotName.value = "";
    selectedCoords = null;
    selectedLat.textContent = "-";
    selectedLng.textContent = "-";
    
    if (marker && map) {
      map.removeLayer(marker);
      marker = null;
    }
  };

  const showCoordsInterface = () => {
    coordsInterface.classList.remove("hidden");
    mapInterface.classList.add("hidden");
  };

  const hideCoordsInterface = () => {
    coordsInterface.classList.add("hidden");
    coordsSpotName.value = "";
    coordsLat.value = "";
    coordsLng.value = "";
  };

  // Custom spots toggle
  customSpotsToggle.addEventListener("click", async () => {
    const isHidden = customSpotsPanel.classList.contains("hidden");
    
    if (isHidden) {
      customSpotsPanel.classList.remove("hidden");
      await loadCustomSpots();
    } else {
      customSpotsPanel.classList.add("hidden");
      hideMapInterface();
      hideCoordsInterface();
    }
  });

  // Add by map button
  addByMapBtn.addEventListener("click", () => {
    showMapInterface();
  });

  // Add by coords button
  addByCoordsBtn.addEventListener("click", () => {
    showCoordsInterface();
  });

  // Save map spot
  saveMapSpotBtn.addEventListener("click", async () => {
    try {
      const nome = mapSpotName.value.trim();
      
      if (!nome) {
        alert("Por favor, insere um nome para o spot");
        return;
      }

      if (!selectedCoords) {
        alert("Por favor, clica no mapa para escolher a localização");
        return;
      }

      const token = await requireToken();
      await sendRuntimeMessage({
        type: "addCustomSpot",
        token,
        nome,
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
      });

      setBillingMessage("Spot adicionado com sucesso!");
      hideMapInterface();
      await loadCustomSpots();
    } catch (error) {
      setBillingMessage(error.message || "Erro ao adicionar spot", true);
    }
  });

  // Cancel map
  cancelMapBtn.addEventListener("click", () => {
    hideMapInterface();
  });

  // Save coords spot
  saveCoordsSpotBtn.addEventListener("click", async () => {
    try {
      const nome = coordsSpotName.value.trim();
      const lat = parseFloat(coordsLat.value);
      const lng = parseFloat(coordsLng.value);

      if (!nome) {
        alert("Por favor, insere um nome para o spot");
        return;
      }

      if (isNaN(lat) || isNaN(lng)) {
        alert("Por favor, insere coordenadas válidas");
        return;
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        alert("Coordenadas fora do intervalo válido");
        return;
      }

      const token = await requireToken();
      await sendRuntimeMessage({
        type: "addCustomSpot",
        token,
        nome,
        lat,
        lng,
      });

      setBillingMessage("Spot adicionado com sucesso!");
      hideCoordsInterface();
      await loadCustomSpots();
    } catch (error) {
      setBillingMessage(error.message || "Erro ao adicionar spot", true);
    }
  });

  // Cancel coords
  cancelCoordsBtn.addEventListener("click", () => {
    hideCoordsInterface();
  });
});
