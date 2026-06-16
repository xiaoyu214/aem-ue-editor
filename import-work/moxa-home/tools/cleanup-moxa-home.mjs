import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve('import-work/moxa-home');
const rawHtmlPath = path.join(rootDir, 'raw.html');
const resourceMapPath = path.join(rootDir, 'data/resource-map.json');
const indexPath = path.join(rootDir, 'index.html');
const componentDir = path.join(rootDir, 'components');
const cssDir = path.join(rootDir, 'assets/css');
const fontDir = path.join(rootDir, 'assets/fonts');
const imageDir = path.join(rootDir, 'assets/images');
const jsDir = path.join(rootDir, 'assets/js');
const localFixCssPath = path.join(cssDir, 'moxa-local-fixes.css');
const localRuntimeJsPath = path.join(jsDir, 'moxa-local.js');
const supplementalResources = {
  'https://cdn-cms-frontdoor-dfc8ebanh6bkb3hs.a02.azurefd.net/css/moxa/moxa-min.css?v=20.5': 'assets/css/moxa-min.css',
  'https://cdn-cms-frontdoor-dfc8ebanh6bkb3hs.a02.azurefd.net/css/moxa/print-min.css?v=20.5': 'assets/css/print-min.css',
  'https://cdn-cms-frontdoor-dfc8ebanh6bkb3hs.a02.azurefd.net/App_Themes/Moxa/SiteMeta/site.webmanifest': 'assets/site.webmanifest',
};

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content);
}

async function ensureSupplementalResources() {
  const failures = [];
  for (const [url, localPath] of Object.entries(supplementalResources)) {
    const outputPath = path.join(rootDir, localPath);
    if (fs.existsSync(outputPath)) continue;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      failures.push({ url, error: error.message });
    }
  }
  return failures;
}

function findMatchingTag(html, start, tagName) {
  const token = new RegExp(`</?${tagName}\\b[^>]*>`, 'ig');
  token.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = token.exec(html)) !== null) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return token.lastIndex;
  }
  return -1;
}

function removeElementsByOpenTag(html, openTagRegex) {
  let output = html;
  let match;
  while ((match = openTagRegex.exec(output)) !== null) {
    const openTag = match[0];
    const tagName = /^<([a-z0-9-]+)/i.exec(openTag)?.[1];
    if (!tagName) continue;
    const end = findMatchingTag(output, match.index, tagName);
    if (end === -1) {
      openTagRegex.lastIndex = match.index + openTag.length;
      continue;
    }
    output = `${output.slice(0, match.index)}${output.slice(end)}`;
    openTagRegex.lastIndex = 0;
  }
  return output;
}

function stripScripts(html) {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
}

function stripHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function stripPopupStyleTags(html) {
  return html.replace(/<style\b[^>]*>[\s\S]*?truste_box_overlay_inner[\s\S]*?<\/style>/gi, '');
}

function stripRuntimeAttributes(html) {
  return html
    .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\s+action\s*=\s*"file:\/\/\/[^"]*"/gi, '')
    .replace(/\s+action\s*=\s*'file:\/\/\/[^']*'/gi, '');
}

function stripRuntimeStateClasses(html) {
  return html.replace(/\bclass=(["'])(.*?)\1/gi, (match, quote, classValue) => {
    const cleaned = classValue
      .split(/\s+/)
      .filter((className) => className && !['modal-active', 'is-fixed'].includes(className))
      .join(' ');
    return `class=${quote}${cleaned}${quote}`;
  });
}

function stripBrokenRuntimeLinks(html) {
  return html
    .replace(/<li\b[^>]*class=["'][^"']*\bfooter__item\b[^"']*["'][^>]*>\s*<a\b[^>]+href=["']#TrustArcCookiePreferences["'][\s\S]*?<\/a>\s*<\/li>/gi, '')
    .replace(/<link\b[^>]+href=["'][^"']*(?:GetResource\.ashx\?stylesheetname=ColorPalette|GetResource\.ashx\?stylesheetname=StyleOverrides|BotDetectCaptcha\.ashx)[^"']*["'][^>]*>/gi, '')
    .replace(/<script\b[^>]+src=["'][^"']*(?:googletagmanager|gtag\/js|trustarc|WebResource\.axd|ScriptResource\.axd|GetResource\.ashx|quotation\.js|Activity\/SaveActivity|CultureRedirect|searchapi)[^"']*["'][^>]*>\s*<\/script>/gi, '');
}

function stripPopupDom(html) {
  let output = html;
  const classTokens = [
    'modal',
    'modal--region-redirect',
    'modal-feedback',
    'modal--newsletter',
    'truste',
    'trustarc',
    'cookie',
    'newsletter',
    'recaptcha',
    'usabilla',
  ];

  for (const token of classTokens) {
    output = removeElementsByOpenTag(
      output,
      new RegExp(`<(?:div|section|aside|iframe|form)\\b(?=[^>]*\\bclass=["'][^"']*\\b${token}[^"']*["'])[^>]*>`, 'ig'),
    );
  }

  const idTokens = [
    'teconsent',
    'consent',
    'truste',
    'trustarc',
    'newsletter',
    'recaptcha',
    'usabilla',
    'modal',
    'ProductQuotationBag',
  ];

  for (const token of idTokens) {
    output = removeElementsByOpenTag(
      output,
      new RegExp(`<(?:div|section|aside|iframe|form|span|a|button)\\b(?=[^>]*\\bid=["'][^"']*${token}[^"']*["'])[^>]*>`, 'ig'),
    );
  }

  return output;
}

function stripEmptyTrackingContainers(html) {
  return html
    .replace(/<iframe\b[^>]*(?:googletagmanager|doubleclick|trustarc)[\s\S]*?<\/iframe>/gi, '')
    .replace(/<noscript\b[\s\S]*?(?:googletagmanager|trustarc)[\s\S]*?<\/noscript>/gi, '');
}

function cleanHtml(html) {
  return stripRuntimeStateClasses(
    stripRuntimeAttributes(
      stripScripts(
        stripEmptyTrackingContainers(
          stripPopupDom(
            stripBrokenRuntimeLinks(
              stripPopupStyleTags(
                stripHtmlComments(html),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

function rewriteUrls(html, mapping) {
  let output = html;
  for (const [remote, local] of Object.entries(mapping)) {
    const escaped = remote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedAmp = remote.replace(/&/g, '&amp;').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    output = output.replace(new RegExp(escaped, 'g'), local);
    output = output.replace(new RegExp(escapedAmp, 'g'), local);
  }
  return output;
}

function findTagBlock(html, tagName, startAt = 0) {
  const open = new RegExp(`<${tagName}\\b[^>]*>`, 'ig');
  open.lastIndex = startAt;
  const openMatch = open.exec(html);
  if (!openMatch) return null;

  const start = openMatch.index;
  const end = findMatchingTag(html, start, tagName);
  if (end === -1) return null;
  return {
    start,
    end,
    html: html.slice(start, end),
  };
}

function findBlockByClass(html, tagName, className) {
  const classRe = new RegExp(`<${tagName}\\b(?=[^>]*class=["'][^"']*\\b${className}\\b)[^>]*>`, 'i');
  const match = classRe.exec(html);
  if (!match) return null;
  return findTagBlock(html, tagName, match.index);
}

function bodyContent(html) {
  const match = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  return match ? match[1] : html;
}

function writeComponents(html) {
  const body = bodyContent(html);
  const header = findTagBlock(body, 'header')?.html || '';
  const footer = findTagBlock(body, 'footer')?.html || '';
  const bodySection = findBlockByClass(body, 'div', 'body-section')?.html || '';
  const banner = findBlockByClass(bodySection || body, 'div', 'hero-carousel')?.html || '';
  const main = bodySection
    ? bodySection.replace(banner, '').trim()
    : body.replace(header, '').replace(footer, '').replace(banner, '').trim();

  const components = { header, banner, main, footer };
  for (const [name, value] of Object.entries(components)) {
    write(path.join(componentDir, `${name}.html`), `${componentRelativeAssets(value).trim()}\n`);
  }
  return components;
}

function cssUrlToLocal(url, prefixes = { fonts: '../fonts', images: '../images' }) {
  const cleanUrl = url.replace(/['"]/g, '').trim();
  if (!cleanUrl || cleanUrl.startsWith('data:') || cleanUrl.startsWith('#')) return url;

  const decoded = cleanUrl.replace(/&amp;/g, '&');
  const basename = path.basename(decoded.split('?')[0]);
  const extParam = /[?&]ext=(\.[a-z0-9]+)/i.exec(decoded)?.[1];
  const expectedExt = (extParam || path.extname(basename)).toLowerCase();
  const stem = basename.replace(/\.[a-z0-9]+$/i, '');

  const fontMatch = findAsset(fontDir, stem, expectedExt);
  if (fontMatch) return `${prefixes.fonts}/${fontMatch}`;

  const imageMatch = findAsset(imageDir, stem, expectedExt);
  if (imageMatch) return `${prefixes.images}/${imageMatch}`;

  return url;
}

function findAsset(dir, stem, ext) {
  if (!fs.existsSync(dir)) return null;
  const safeStem = stem.toLowerCase();
  const safeExt = ext.toLowerCase();
  return fs.readdirSync(dir).find((file) => {
    const lower = file.toLowerCase();
    return lower.startsWith(safeStem.toLowerCase()) && (!safeExt || lower.endsWith(safeExt));
  }) || null;
}

function cleanCss(css, prefixes, quote = '"') {
  return css.replace(/url\(([^)]+)\)/gi, (match, rawUrl) => `url(${quote}${cssUrlToLocal(rawUrl, prefixes)}${quote})`);
}

function componentRelativeAssets(html) {
  return html
    .replace(/\b(src|href)=("|')assets\//gi, '$1=$2../assets/')
    .replace(/url\(("|')?assets\//gi, 'url($1../assets/');
}

function localFixCss() {
  return `body {
  overflow-x: hidden;
}

.hero-carousel {
  overflow: hidden;
}

.hero-carousel,
.hero-carousel__slider,
.hero-carousel .slick-list,
.hero-carousel .slick-track,
.hero-carousel__slide,
.hero-carousel__item,
.hero-carousel__img {
  width: 100% !important;
}

.hero-carousel .slick-list,
.hero-carousel .slick-track,
.hero-carousel__slide,
.hero-carousel__item.-image,
.hero-carousel__img {
  min-height: 550px;
}

.hero-carousel .slick-track {
  display: block !important;
  transform: none !important;
}

.hero-carousel__slide {
  left: auto !important;
  top: auto !important;
  opacity: 1 !important;
}

.hero-carousel__img {
  background-position: center center !important;
  background-size: cover !important;
}

[data-aos].aos-init {
  opacity: 1 !important;
  transform: none !important;
}

.hero-carousel__container {
  box-sizing: border-box;
  max-width: 620px;
  margin-right: 0;
  margin-left: 0;
  padding-right: 0;
  padding-left: 0;
}

@media (max-width: 767px) {
  .hero-carousel .slick-list,
  .hero-carousel .slick-track,
  .hero-carousel__slide,
  .hero-carousel__item.-image,
  .hero-carousel__img {
    min-height: 440px;
  }

  .hero-carousel__container {
    max-width: 100%;
  }
}
`;
}

function localRuntimeJs() {
  return `(() => {
  const duration = 1500;
  const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

  function setFinalValue(element, target) {
    element.textContent = String(target);
  }

  function animateNumber(element) {
    const target = Number(element.dataset.count);
    if (!Number.isFinite(target)) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFinalValue(element, target);
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

      setFinalValue(element, target);
    };

    requestAnimationFrame(step);
  }

  function initGalaxyNumbers() {
    const numbers = [...document.querySelectorAll('.galaxy-section__number[data-count]')];
    if (!numbers.length) return;

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGalaxyNumbers, { once: true });
  } else {
    initGalaxyNumbers();
  }
})();
`;
}

function ensureLocalAssets() {
  fs.mkdirSync(cssDir, { recursive: true });
  fs.mkdirSync(jsDir, { recursive: true });
  write(localFixCssPath, localFixCss());
  write(localRuntimeJsPath, localRuntimeJs());
}

function injectLocalAssets(html) {
  let output = html;
  const cssTag = '<link rel="stylesheet" href="assets/css/moxa-local-fixes.css">';
  const jsTag = '<script defer src="assets/js/moxa-local.js"></script>';

  if (!output.includes(cssTag)) {
    output = output.replace(/<\/head>/i, `${cssTag}\n</head>`);
  }

  if (!output.includes(jsTag)) {
    output = output.replace(/<\/body>/i, `${jsTag}\n</body>`);
  }

  return output;
}

async function main() {
  const supplementalFailures = await ensureSupplementalResources();
  ensureLocalAssets();
  const mapping = {
    ...JSON.parse(read(resourceMapPath)),
    ...supplementalResources,
  };
  const rebuiltHtml = injectLocalAssets(cleanCss(
    cleanHtml(rewriteUrls(read(rawHtmlPath), mapping)),
    { fonts: 'assets/fonts', images: 'assets/images' },
    "'",
  ));
  write(indexPath, rebuiltHtml);
  const components = writeComponents(rebuiltHtml);

  for (const file of fs.readdirSync(cssDir).filter((name) => name.endsWith('.css'))) {
    const filePath = path.join(cssDir, file);
    write(filePath, cleanCss(read(filePath)));
  }

  console.log(JSON.stringify({
    cleanedFiles: [
      'index.html',
      'components/header.html',
      'components/banner.html',
      'components/main.html',
      'components/footer.html',
    ],
    cleanedCss: fs.readdirSync(cssDir).filter((name) => name.endsWith('.css')).length,
    componentLengths: Object.fromEntries(
      Object.entries(components).map(([name, value]) => [name, Buffer.byteLength(value || '')]),
    ),
    supplementalFailures,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
