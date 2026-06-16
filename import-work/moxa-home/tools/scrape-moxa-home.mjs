import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const targetUrl = 'https://www.moxa.com/en';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const rootDir = path.resolve('import-work/moxa-home');
const assetDir = path.join(rootDir, 'assets');
const componentDir = path.join(rootDir, 'components');
const dataDir = path.join(rootDir, 'data');
const inlineScriptDir = path.join(dataDir, 'inline-scripts');
const rawHtmlPath = path.join(rootDir, 'raw.html');
const rewrittenHtmlPath = path.join(rootDir, 'index.html');
const screenshotPath = path.join(rootDir, 'screenshot.png');
const chromeErrorPath = path.join(rootDir, 'chrome.err');

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function removeIfExists(filePath) {
  if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
}

function runChrome(args, stdoutPath = null) {
  const profileDir = path.join(os.tmpdir(), `moxa-chrome-${crypto.randomUUID()}`);
  ensureDir(profileDir);
  removeIfExists(chromeErrorPath);
  const stdoutFd = stdoutPath ? fs.openSync(stdoutPath, 'w') : null;
  const stderrFd = fs.openSync(chromeErrorPath, 'w');

  const commonArgs = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--hide-scrollbars',
    `--user-agent=${userAgent}`,
    `--user-data-dir=${profileDir}`,
    '--window-size=1440,2400',
  ];

  const options = {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
    stdio: stdoutPath
      ? ['ignore', stdoutFd, stderrFd]
      : ['ignore', 'pipe', stderrFd],
  };

  const result = spawnSync(chromePath, [...commonArgs, ...args], options);
  if (stdoutFd !== null) fs.closeSync(stdoutFd);
  fs.closeSync(stderrFd);
  fs.rmSync(profileDir, { recursive: true, force: true });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const err = fs.existsSync(chromeErrorPath) ? fs.readFileSync(chromeErrorPath, 'utf8') : '';
    throw new Error(`Chrome exited with ${result.status}. ${err}`.trim());
  }
  return result.stdout || '';
}

function absoluteUrl(value, base = targetUrl) {
  if (!value || value.startsWith('data:') || value.startsWith('mailto:') || value.startsWith('tel:') || value.startsWith('#')) {
    return null;
  }
  try {
    return new URL(value.replace(/&amp;/g, '&'), base).toString();
  } catch {
    return null;
  }
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function collectMatches(html, regex, group = 1) {
  const values = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const value = decodeEntities(match[group] || '').trim();
    if (value) values.push(value);
  }
  return values;
}

function collectSrcsetUrls(srcset) {
  return srcset
    .split(',')
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function collectResourceUrls(html) {
  const stylesheets = collectMatches(html, /<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/gi)
    .map((url) => absoluteUrl(url))
    .filter(Boolean);
  const scripts = collectMatches(html, /<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)
    .map((url) => absoluteUrl(url))
    .filter(Boolean);
  const imgs = [
    ...collectMatches(html, /<(?:img|source)\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/gi),
    ...collectMatches(html, /<link\b[^>]*rel=["'][^"']*(?:icon|preload|prefetch)[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/gi),
    ...collectMatches(html, /url\((?:'|")?([^'")]+)(?:'|")?\)/gi),
  ];
  const srcsets = collectMatches(html, /<(?:img|source)\b[^>]*srcset=["']([^"']+)["'][^>]*>/gi)
    .flatMap(collectSrcsetUrls);

  return {
    stylesheets: [...new Set(stylesheets)],
    scripts: [...new Set(scripts)],
    media: [...new Set([...imgs, ...srcsets].map((url) => absoluteUrl(url)).filter(Boolean))],
  };
}

function groupFor(url, contentType = '') {
  const type = contentType.toLowerCase();
  if (type.includes('text/css') || /\.css(?:$|\?)/i.test(url)) return 'css';
  if (type.includes('javascript') || /\.js(?:$|\?)/i.test(url)) return 'js';
  if (type.startsWith('image/') || /\.(?:png|jpe?g|gif|webp|avif|svg|ico)(?:$|\?)/i.test(url) || /[?&]ext=\.(?:png|jpe?g|gif|webp|avif|svg|ico)/i.test(url)) return 'images';
  if (/\.(?:woff2?|ttf|otf|eot)(?:$|\?)/i.test(url) || type.includes('font')) return 'fonts';
  if (type.startsWith('video/') || /\.(?:mp4|webm|mov)(?:$|\?)/i.test(url)) return 'media';
  return 'other';
}

function extensionFor(url, contentType = '') {
  const parsed = new URL(url);
  const extParam = parsed.searchParams.get('ext');
  if (extParam && /^\.[a-z0-9]+$/i.test(extParam)) return extParam.toLowerCase();
  const ext = path.extname(parsed.pathname).toLowerCase();
  if (ext) return ext;
  const type = contentType.split(';')[0].toLowerCase();
  const byType = {
    'text/css': '.css',
    'application/javascript': '.js',
    'text/javascript': '.js',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/svg+xml': '.svg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'font/woff2': '.woff2',
    'font/woff': '.woff',
  };
  return byType[type] || '.bin';
}

function filenameFor(url, contentType = '') {
  const parsed = new URL(url);
  const cleanBase = path.basename(parsed.pathname).replace(/[^a-z0-9._-]/gi, '-').replace(/^-+/, '') || 'resource';
  const ext = extensionFor(url, contentType);
  const baseWithoutExt = cleanBase.toLowerCase().endsWith(ext) ? cleanBase.slice(0, -ext.length) : cleanBase;
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
  return `${baseWithoutExt}-${hash}${ext}`;
}

async function fetchWithTimeout(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': userAgent },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadResources(initialGroups) {
  const queue = [
    ...initialGroups.stylesheets,
    ...initialGroups.scripts,
    ...initialGroups.media,
  ];
  const seen = new Set();
  const mapping = {};
  const downloaded = [];
  const failures = [];

  for (let index = 0; index < queue.length; index += 1) {
    const url = queue[index];
    if (seen.has(url)) continue;
    seen.add(url);

    try {
      const response = await fetchWithTimeout(url);
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      const group = groupFor(url, contentType);
      const relativePath = `assets/${group}/${filenameFor(url, contentType)}`;
      const outputPath = path.join(rootDir, relativePath);
      ensureDir(path.dirname(outputPath));
      fs.writeFileSync(outputPath, buffer);
      mapping[url] = relativePath.replace(/\\/g, '/');
      downloaded.push({ url, localPath: mapping[url], contentType, bytes: buffer.byteLength });

      if (group === 'css') {
        const cssText = buffer.toString('utf8');
        const cssUrls = collectMatches(cssText, /url\((?:'|")?([^'")]+)(?:'|")?\)/gi)
          .map((cssUrl) => absoluteUrl(cssUrl, url))
          .filter(Boolean);
        cssUrls.forEach((cssUrl) => {
          if (!seen.has(cssUrl)) queue.push(cssUrl);
        });
      }
    } catch (error) {
      failures.push({ url, error: error.message });
    }
  }

  return { mapping, downloaded, failures };
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
  const token = new RegExp(`</?${tagName}\\b[^>]*>`, 'ig');
  token.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = token.exec(html)) !== null) {
    const isClose = match[0].startsWith('</');
    depth += isClose ? -1 : 1;
    if (depth === 0) {
      return {
        start,
        end: token.lastIndex,
        html: html.slice(start, token.lastIndex),
      };
    }
  }
  return null;
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

function extractInlineData(html) {
  ensureDir(inlineScriptDir);
  const scripts = [];
  let index = 0;
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html)) !== null) {
    if (/\bsrc=["']/i.test(match[1])) continue;
    const attrs = match[1].trim();
    const content = match[2].trim();
    if (!content) continue;
    index += 1;
    const type = /type=["']([^"']+)["']/i.exec(attrs)?.[1] || '';
    const ext = type.includes('json') ? '.json' : '.js';
    const file = `script-${String(index).padStart(3, '0')}${ext}`;
    fs.writeFileSync(path.join(inlineScriptDir, file), content);
    scripts.push({ file: `data/inline-scripts/${file}`, type, attrs, bytes: Buffer.byteLength(content) });
  }
  return scripts;
}

function extractMetadata(html, resourceGroups, downloadResult, components, inlineScripts) {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() || '';
  const description = /<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i.exec(html)?.[1] || '';
  return {
    sourceUrl: targetUrl,
    capturedAt: new Date().toISOString(),
    title: decodeEntities(title),
    description: decodeEntities(description),
    files: {
      rawHtml: 'raw.html',
      localHtml: 'index.html',
      screenshot: 'screenshot.png',
      components: {
        header: 'components/header.html',
        banner: 'components/banner.html',
        main: 'components/main.html',
        footer: 'components/footer.html',
      },
    },
    resourcesFound: {
      stylesheets: resourceGroups.stylesheets.length,
      scripts: resourceGroups.scripts.length,
      media: resourceGroups.media.length,
    },
    resourcesDownloaded: downloadResult.downloaded.length,
    resourceFailures: downloadResult.failures,
    inlineScripts,
    componentLengths: Object.fromEntries(
      Object.entries(components).map(([name, value]) => [name, Buffer.byteLength(value || '')]),
    ),
  };
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  ensureDir(rootDir);
  ensureDir(assetDir);
  ensureDir(componentDir);
  ensureDir(dataDir);

  runChrome([
    '--virtual-time-budget=12000',
    '--dump-dom',
    targetUrl,
  ], rawHtmlPath);

  runChrome([
    '--timeout=15000',
    `--screenshot=${screenshotPath}`,
    targetUrl,
  ]);

  const rawHtml = fs.readFileSync(rawHtmlPath, 'utf8');
  const resourceGroups = collectResourceUrls(rawHtml);
  const downloadResult = await downloadResources(resourceGroups);
  const localHtml = rewriteUrls(rawHtml, downloadResult.mapping);
  fs.writeFileSync(rewrittenHtmlPath, localHtml);

  const body = bodyContent(localHtml);
  const header = findTagBlock(body, 'header')?.html || '';
  const footer = findTagBlock(body, 'footer')?.html || '';
  const bodySection = findBlockByClass(body, 'div', 'body-section')?.html || '';
  const banner = findBlockByClass(bodySection || body, 'div', 'hero-carousel')?.html || '';
  const main = bodySection
    ? bodySection.replace(banner, '').trim()
    : body.replace(header, '').replace(footer, '').replace(banner, '').trim();

  const components = { header, banner, main, footer };
  for (const [name, value] of Object.entries(components)) {
    fs.writeFileSync(path.join(componentDir, `${name}.html`), `${value.trim()}\n`);
  }

  const inlineScripts = extractInlineData(rawHtml);
  writeJson(path.join(dataDir, 'stylesheets.json'), resourceGroups.stylesheets);
  writeJson(path.join(dataDir, 'scripts.json'), resourceGroups.scripts);
  writeJson(path.join(dataDir, 'media.json'), resourceGroups.media);
  writeJson(path.join(dataDir, 'resource-map.json'), downloadResult.mapping);
  writeJson(path.join(dataDir, 'downloaded-resources.json'), downloadResult.downloaded);
  writeJson(path.join(dataDir, 'metadata.json'), extractMetadata(rawHtml, resourceGroups, downloadResult, components, inlineScripts));

  console.log(JSON.stringify({
    rawHtml: rawHtmlPath,
    localHtml: rewrittenHtmlPath,
    screenshot: screenshotPath,
    components: Object.fromEntries(Object.entries(components).map(([name, value]) => [name, Buffer.byteLength(value || '')])),
    resourcesFound: resourceGroups,
    downloaded: downloadResult.downloaded.length,
    failures: downloadResult.failures.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
