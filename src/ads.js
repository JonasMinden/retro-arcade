import { initSiteUi } from "./site-ui.js";
import { siteConfig } from "./site-config.js";

initSiteUi();

function loadAdSense(client) {
  if (!client || document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
}

function createAdUnit(slotId, client) {
  const ad = document.createElement("ins");
  ad.className = "adsbygoogle ad-slot ad-slot--live";
  ad.style.display = "block";
  ad.dataset.adClient = client;
  ad.dataset.adSlot = slotId;
  ad.dataset.adFormat = "auto";
  ad.dataset.fullWidthResponsive = "true";
  return ad;
}

function renderPreparedNotice(element) {
  element.classList.add("ad-slot--placeholder");
  element.innerHTML = `
    <p class="ad-slot__label">Ad Slot</p>
    <p>Werbefläche vorbereitet. Aktivierung erfolgt nach AdSense-Freigabe und Consent-Setup.</p>
  `;
}

function upgradeSlot(element, slotId, client) {
  if (!slotId || !client) {
    renderPreparedNotice(element);
    return;
  }

  element.classList.remove("ad-slot--placeholder");
  element.innerHTML = "";
  element.appendChild(createAdUnit(slotId, client));

  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.push({});
}

function initAds() {
  const adElements = document.querySelectorAll("[data-ad-slot-key]");
  if (!adElements.length) {
    return;
  }

  const consent = window.retroArcadeConsent || null;
  if (!consent || !consent.marketing) {
    adElements.forEach((element) => renderPreparedNotice(element));
    return;
  }

  if (!siteConfig.enableAds || !siteConfig.adsenseClient) {
    adElements.forEach((element) => renderPreparedNotice(element));
    return;
  }

  loadAdSense(siteConfig.adsenseClient);

  adElements.forEach((element) => {
    const slotKey = element.getAttribute("data-ad-slot-key");
    upgradeSlot(element, siteConfig.adSlots[slotKey], siteConfig.adsenseClient);
  });
}

if (typeof document !== "undefined") {
  initAds();
}
