// ------------------------------------------------------------
// URL を BASE_URL 対応で安全に組み立てるための補助関数です。
// 画像URL / 内部リンクURL は、基本的にこのファイルを通して作ります。
// 今回は Android アプリ側から保存された
// "前後にクオート付きの画像パス" も吸収するようにしています。
// 例:
//   "/images/uploads/a.jpg"
// → /images/uploads/a.jpg
// ------------------------------------------------------------

// Astro / Vite が持っている公開ベースパスです。
// 通常は "/" ですが、将来的にサブディレクトリ配信する場合にも対応できます。
const BASE_URL = import.meta.env.BASE_URL || '/';

// 文字列の前後に付いたクオートを外します。
// 例:
//   '"/images/a.jpg"' -> '/images/a.jpg'
//   "'/images/a.jpg'" -> '/images/a.jpg'
function stripWrappingQuotes(value: string): string {
  // 値が空ならそのまま返します。
  if (!value) {
    return value;
  }

  // まず前後の空白を落とします。
  const trimmed = value.trim();

  // 前後がダブルクオートなら外します。
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).trim();
  }

  // 前後がシングルクオートなら外します。
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).trim();
  }

  // それ以外はそのまま返します。
  return trimmed;
}

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
// - '"/images/uploads/a.jpg"'
// のどれでも受け取れるようにしています。
export function withBase(targetPath: string): string {
  // まずは前後のクオートを除去します。
  const cleanedPath = stripWrappingQuotes(targetPath);

  // 外部URLや data URL はそのまま返します。
  if (/^(https?:)?\/\//.test(cleanedPath) || cleanedPath.startsWith('data:')) {
    return cleanedPath;
  }

  return joinUrl(BASE_URL, cleanedPath);
}

// 他ファイルでも使えるように、必要に応じて再利用できる形で export します。
export { stripWrappingQuotes };
