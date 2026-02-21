// Service worker Manifest V3 (pode ficar vazio por agora)
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extensão instalada");
});

const API_BASE_URLS = [
  "http://localhost:5005/api",
  "https://fishing-chrome-extention.onrender.com/api",
];
const REQUEST_TIMEOUT_MS = 15000;

async function requestWithBaseUrl(baseUrl, path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error("Timeout na ligação à API");
    }
    throw new Error(
      `Falha de ligação a ${baseUrl} (backend offline, CORS ou rede)`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await response.text();
  const suspendedServiceMessage =
    "This service has been suspended by its owner.";

  if (text && text.includes(suspendedServiceMessage)) {
    throw new Error(`Serviço remoto suspenso (${baseUrl})`);
  }

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = { message: text || "Resposta inválida da API" };
  }

  if (!response.ok) {
    const message =
      (data && (data.erro || data.error || data.message)) ||
      `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

async function apiRequest(path, options = {}) {
  const errors = [];

  for (const baseUrl of API_BASE_URLS) {
    try {
      return await requestWithBaseUrl(baseUrl, path, options);
    } catch (error) {
      errors.push({ baseUrl, message: error?.message || "Erro desconhecido" });
    }
  }

  const localError = errors.find((entry) =>
    entry.baseUrl.includes("localhost"),
  );
  const suspendedError = errors.find((entry) =>
    entry.message.includes("suspenso"),
  );

  if (localError && suspendedError) {
    throw new Error(
      `Backend local indisponível (${localError.message}). O fallback remoto está suspenso.`,
    );
  }

  const remoteError = errors.find((entry) => !entry.baseUrl.includes("localhost"));
  throw new Error(remoteError?.message || errors[0]?.message || "API indisponível");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return;
  }

  if (message.type === "getPrevisao") {
    const spotId = message.spotId;
    const lat = message.lat;
    const lng = message.lng;
    
    let queryParams = [];
    if (spotId) queryParams.push(`spotId=${encodeURIComponent(spotId)}`);
    if (lat) queryParams.push(`lat=${encodeURIComponent(lat)}`);
    if (lng) queryParams.push(`lng=${encodeURIComponent(lng)}`);
    
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    
    apiRequest(`/previsao${queryString}`, {
      method: "GET",
      headers: message.token ? {
        Authorization: `Bearer ${message.token}`,
      } : {},
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: err && err.message ? err.message : "Erro",
        }),
      );

    return true;
  }

  if (message.type === "subscriptionStatus") {
    apiRequest("/subscription/status", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${message.token}`,
      },
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) =>
        sendResponse({ ok: false, error: err.message || "Erro" }),
      );

    return true;
  }

  if (message.type === "registerAccount") {
    apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: message.email,
        password: message.password,
      }),
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) =>
        sendResponse({ ok: false, error: err.message || "Erro" }),
      );

    return true;
  }

  if (message.type === "loginAccount") {
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: message.email,
        password: message.password,
      }),
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) =>
        sendResponse({ ok: false, error: err.message || "Erro" }),
      );

    return true;
  }

  if (message.type === "createCheckout") {
    apiRequest("/subscription/create-checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${message.token}`,
      },
      body: JSON.stringify({
        planType: message.planType || "monthly",
      }),
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) =>
        sendResponse({ ok: false, error: err.message || "Erro" }),
      );

    return true;
  }

  if (message.type === "createPortal") {
    apiRequest("/subscription/create-portal", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${message.token}`,
      },
      body: JSON.stringify({}),
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) =>
        sendResponse({ ok: false, error: err.message || "Erro" }),
      );

    return true;
  }

  if (message.type === "finalizeCheckout") {
    apiRequest("/subscription/finalize-checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${message.token}`,
      },
      body: JSON.stringify({
        sessionId: message.sessionId,
      }),
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) =>
        sendResponse({ ok: false, error: err.message || "Erro" }),
      );

    return true;
  }

  if (message.type === "getPlans") {
    apiRequest("/subscription/plans", {
      method: "GET",
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) =>
        sendResponse({ ok: false, error: err.message || "Erro" }),
      );

    return true;
  }

  if (message.type === "getCustomSpots") {
    apiRequest("/spots/personalizados", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${message.token}`,
      },
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) =>
        sendResponse({ ok: false, error: err.message || "Erro" }),
      );

    return true;
  }

  if (message.type === "addCustomSpot") {
    apiRequest("/spots/personalizados", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${message.token}`,
      },
      body: JSON.stringify({
        nome: message.nome,
        lat: message.lat,
        lng: message.lng,
      }),
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) =>
        sendResponse({ ok: false, error: err.message || "Erro" }),
      );

    return true;
  }

  if (message.type === "removeCustomSpot") {
    apiRequest(`/spots/personalizados/${message.spotId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${message.token}`,
      },
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) =>
        sendResponse({ ok: false, error: err.message || "Erro" }),
      );

    return true;
  }

  sendResponse({ ok: false, error: "Tipo de mensagem não suportado" });
  return false;
});
