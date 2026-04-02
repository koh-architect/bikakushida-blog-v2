// ------------------------------------------------------------
// URL を BASE_URL 対応で安全に組み立てるための補助関数です。
// 画像URL / 内部リンクURL は、基本的にこのファイルを通して作ります。
// ------------------------------------------------------------

// Astro / Vite が持っている公開ベースパスです。
// 通常は "/" ですが、将来的にサブディレクトリ配信する場合にも対応できます。
const BASE_URL = import.meta.env.BASE_URL || '/';

// base と target を、余計なスラッシュ崩れなしで連結します。
function joinUrl(base: string, target: string): string {
  // base は末尾に "/" が 1 つある状態へ正規化します。
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;

  // target が空なら base をそのまま返します。
  if (!target) {
    return normalizedBase;
  }

  // target は先頭の "/" を落としてから結合します。
  const normalizedTarget = target.replace(/^\/+/, '');

  return `${normalizedBase}${normalizedTarget}`;
}

// 公開用の URL を返します。
// - "/images/logo.png"
// - "images/logo.png"
// のどちらでも受け取れます。
export function withBase(targetPath: string): string {
  // 外部URLはそのまま返します。
  if (/^(https?:)?\/\//.test(targetPath) || targetPath.startsWith('data:')) {
    return targetPath;
  }

  return joinUrl(BASE_URL, targetPath);
}
