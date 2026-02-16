const EXTENSION_POPUP_PATH = "/popup/popup.html";

const normalizeReturnBaseUrl = (rawUrl) => {
  if (!rawUrl) {
    return null;
  }

  let normalized = rawUrl.trim();

  normalized = normalized
    .replace(/^([a-z][a-z0-9+.-]*)\/\//i, "$1://")
    .replace(/^([a-z][a-z0-9+.-]*):\/(?!\/)/i, "$1://");

  if (normalized.startsWith("chrome-extension//")) {
    normalized = normalized.replace(
      "chrome-extension//",
      "chrome-extension://",
    );
  }

  if (
    normalized.startsWith("chrome-extension://") &&
    !normalized.includes(EXTENSION_POPUP_PATH)
  ) {
    normalized = `${normalized.replace(/\/+$/, "")}${EXTENSION_POPUP_PATH}`;
  }

  return normalized.replace(/\/+$/, "");
};

const getExtensionOrigin = (originHeader) => {
  if (originHeader && originHeader.startsWith("chrome-extension://")) {
    return originHeader.replace(/\/+$/, "");
  }

  return null;
};

const buildStripeReturnUrls = ({ originHeader, frontendUrl }) => {
  const extensionOrigin = getExtensionOrigin(originHeader);
  const rawBaseReturnUrl = extensionOrigin
    ? `${extensionOrigin}${EXTENSION_POPUP_PATH}`
    : frontendUrl;
  const baseReturnUrl = normalizeReturnBaseUrl(rawBaseReturnUrl);

  if (!baseReturnUrl) {
    return null;
  }

  const separator = baseReturnUrl.includes("?") ? "&" : "?";

  return {
    successUrl: `${baseReturnUrl}${separator}billingStatus=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${baseReturnUrl}${separator}billingStatus=cancel`,
    returnUrl: baseReturnUrl,
  };
};

module.exports = {
  EXTENSION_POPUP_PATH,
  normalizeReturnBaseUrl,
  getExtensionOrigin,
  buildStripeReturnUrls,
};
