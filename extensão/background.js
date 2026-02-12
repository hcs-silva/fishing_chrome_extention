// Service worker Manifest V3 (pode ficar vazio por agora)
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extensão instalada");
});

const API_URL = "https://fishing-chrome-extention.onrender.com/api/previsao";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "getPrevisao") {
    return;
  }

  const spotId = message.spotId;
  const url = `${API_URL}?spotId=${encodeURIComponent(spotId)}`;

  fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json();
    })
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err) =>
      sendResponse({
        ok: false,
        error: err && err.message ? err.message : "Erro",
      }),
    );

  return true;
});
