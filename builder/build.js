/*
  Master_LP_Template Builder (v0)
  - 手動コピペを廃止して、page.json から index/thanks/script/variants を生成する
  - 依存なし（Node標準ライブラリのみ）

  使い方:
    1) Node.js を入れる
    2) ルートにある page.json を案件ごとに更新
    3) npm run build
    4) 生成された index.html / thanks.html / script.js / variants.css / variants.js を commit/push
*/

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function nowVersion() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '-' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function applyPlaceholders(text, map) {
  let out = text;
  for (const [key, value] of Object.entries(map)) {
    const safe = String(value ?? '');
    out = out.replaceAll(`{{${key}}}`, safe);
  }
  return out;
}

function injectVariants(indexBase, variantsHtml) {
  const START = '<!-- VARIANTS:START -->';
  const END = '<!-- VARIANTS:END -->';

  const startIdx = indexBase.indexOf(START);
  const endIdx = indexBase.indexOf(END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error('index.base.html に VARIANTS マーカーが見つからない/壊れてる');
  }

  const before = indexBase.slice(0, startIdx + START.length);
  const after = indexBase.slice(endIdx);

  return `${before}\n\n${variantsHtml}\n\n${after}`;
}

function loadVariants(variantNames) {
  let html = '';
  let css = '/* ===== variants.css (generated) ===== */\n';
  let js = '/* ===== variants.js (generated) ===== */\n';

  for (const name of variantNames) {
    const dir = path.join(ROOT, 'components', 'variants', name);
    const htmlPath = path.join(dir, `${name}.html`);
    const cssPath = path.join(dir, `${name}.css`);
    const jsPath = path.join(dir, `${name}.js`);

    if (!fs.existsSync(htmlPath)) throw new Error(`variant html が無い: ${htmlPath}`);

    html += `\n<!-- variant:${name} -->\n` + read(htmlPath) + '\n';

    if (fs.existsSync(cssPath)) {
      css += `\n/* --- ${name}.css --- */\n` + read(cssPath) + '\n';
    }

    if (fs.existsSync(jsPath)) {
      js += `\n/* --- ${name}.js --- */\n` + read(jsPath) + '\n';
    }
  }

  return { html, css, js };
}


function assertNoPlaceholders(label, text) {
  const re = /{{[A-Z0-9_]+}}/g;
  const hits = text.match(re);
  if (hits && hits.length) {
    const uniq = Array.from(new Set(hits)).slice(0, 80);
    throw new Error(`[${label}] 未置換のプレースホルダーが残っています: ${uniq.join(', ')}`);
  }
}

function main() {
  const cfgPath = path.join(ROOT, 'page.json');
  if (!fs.existsSync(cfgPath)) {
    throw new Error('page.json が見つからない（ルートに置け）');
  }

  const cfg = JSON.parse(read(cfgPath));
  const assetVersion = cfg.ASSET_VERSION || nowVersion();

  const placeholders = {
    ...cfg,
    ASSET_VERSION: assetVersion,
  };

  // 1) variants をロード
  const variantNames = Array.isArray(cfg.variants) ? cfg.variants : [];
  const { html: variantsHtmlRaw, css: variantsCssRaw, js: variantsJsRaw } = loadVariants(variantNames);

  // 2) index 生成
  const indexBasePath = path.join(ROOT, 'index.base.html');
  const indexBase = read(indexBasePath);
  const indexInjected = injectVariants(indexBase, variantsHtmlRaw);
  const indexFinal = applyPlaceholders(indexInjected, placeholders);
  assertNoPlaceholders("index.html", indexFinal);
  write(path.join(ROOT, 'index.html'), indexFinal);

  // 3) thanks 生成
  const thanksBasePath = path.join(ROOT, 'thanks.base.html');
  const thanksBase = read(thanksBasePath);
  const thanksFinal = applyPlaceholders(thanksBase, placeholders);
  assertNoPlaceholders("thanks.html", thanksFinal);
  write(path.join(ROOT, 'thanks.html'), thanksFinal);

  // 4) script 生成
  const scriptBasePath = path.join(ROOT, 'script.base.js');
  const scriptBase = read(scriptBasePath);
  const scriptFinal = applyPlaceholders(scriptBase, placeholders);
  assertNoPlaceholders("script.js", scriptFinal);
  write(path.join(ROOT, 'script.js'), scriptFinal);

  // 4.5) privacy 生成
  const privacyBasePath = path.join(ROOT, 'privacy.base.html');
  const privacyBase = read(privacyBasePath);
  const privacyFinal = applyPlaceholders(privacyBase, placeholders);
  assertNoPlaceholders("privacy.html", privacyFinal);
  write(path.join(ROOT, 'privacy.html'), privacyFinal);


  // 5) variants css/js 生成
  const variantsCssFinal = applyPlaceholders(variantsCssRaw, placeholders);
  const variantsJsFinal = applyPlaceholders(variantsJsRaw, placeholders);
  assertNoPlaceholders("variants.css", variantsCssFinal);
  write(path.join(ROOT, 'variants.css'), variantsCssFinal);
  assertNoPlaceholders("variants.js", variantsJsFinal);
  write(path.join(ROOT, 'variants.js'), variantsJsFinal);

  console.log('✅ build done');
  console.log(' - index.html / thanks.html / script.js / variants.css / variants.js generated');
  console.log(' - ASSET_VERSION:', assetVersion);
  console.log(' - variants:', variantNames.join(', ') || '(none)');
}

try {
  main();
} catch (e) {
  console.error('❌ build failed:', e.message);
  process.exit(1);
}
