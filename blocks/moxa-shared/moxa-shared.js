import { loadCSS } from '../../scripts/aem.js';

const MOXA_ASSETS_PATH = `${window.hlx.codeBasePath}/moxa-assets`;

const withAuthorTestRef = (url) => {
  if (!window.location.hostname.endsWith('.adobeaemcloud.com') || /[?&]ref=/.test(url)) return url;
  // Temporary workaround: author CDN can serve stale static resources without an explicit ref.
  // Force ref=main for testing until CDN/config behavior is resolved.
  return `${url}${url.includes('?') ? '&' : '?'}ref=main`;
};

const cssFiles = [
  'moxa-inline.css',
  'style-min-3f918a7a52.css',
  'moxa-min.css',
  'homepage-min-75ffe3fc4f.css',
  'footer-min-beb6c45c5c.css',
  'moxa-local-fixes.css',
];

let sharedAssetsPromise;

export function moxaAssetPath(relativePath) {
  return `${MOXA_ASSETS_PATH}/${relativePath.replace(/^\/+/, '')}`;
}

export async function loadMoxaSharedAssets() {
  if (!sharedAssetsPromise) {
    document.documentElement.classList.add('moxa-page');
    document.body.classList.add('moxa-page');
    sharedAssetsPromise = Promise.all(
      cssFiles.map((file) => loadCSS(`${MOXA_ASSETS_PATH}/css/${file}`)),
    );
  }
  await sharedAssetsPromise;
}

export async function loadMoxaStaticHtml(block, fileName) {
  await loadMoxaSharedAssets();
  const response = await fetch(withAuthorTestRef(`${window.hlx.codeBasePath}/blocks/${fileName}/${fileName}.html`));
  if (!response.ok) {
    throw new Error(`Failed to load ${fileName}.html`);
  }
  block.replaceChildren(document.createRange().createContextualFragment(await response.text()));
}

export function initMoxaCounters(root = document) {
  const numbers = [...root.querySelectorAll('.galaxy-section__number[data-count]')];
  if (!numbers.length) return;

  const duration = 1500;
  const easeOutCubic = (value) => 1 - ((1 - value) ** 3);

  const animateNumber = (element) => {
    const target = Number(element.dataset.count);
    if (!Number.isFinite(target)) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.textContent = String(target);
      return;
    }

    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      element.textContent = String(Math.round(target * easeOutCubic(progress)));

      if (progress < 1) {
        requestAnimationFrame(step);
        return;
      }

      element.textContent = String(target);
    };

    requestAnimationFrame(step);
  };

  if (!('IntersectionObserver' in window)) {
    numbers.forEach(animateNumber);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      animateNumber(entry.target);
    });
  }, { threshold: 0.25 });

  numbers.forEach((number) => observer.observe(number));
}
