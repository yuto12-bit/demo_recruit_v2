# Builder（v0）

目的：手動コピペをやめて `page.json` から生成する。

## 使い方
1. Node.js を入れる
2. ルート `page.json` を案件用に更新
3. `npm run build`
4. 生成物を commit/push

## 編集するのはこの3つだけ
- `page.json`
- `index.base.html`（マーカー間に手で貼らない）
- `components/variants/**`（棚）

## 生成されるファイル
- `index.html`
- `thanks.html`
- `script.js`
- `variants.css`
- `variants.js`
