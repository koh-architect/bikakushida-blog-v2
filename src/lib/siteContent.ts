// ------------------------------------------------------------
// サイト共通文言を読み込むための共通ファイルです。
// 今回は content/site/archive-intro.md を読み込んで、
// トップページや株一覧ページで共通利用できるようにします。
// ------------------------------------------------------------

import fs from 'fs';
import path from 'path';

// ------------------------------------------------------------
// サイト文言の型です。
// ここでは、株一覧導入文だけを扱います。
// ------------------------------------------------------------
export type ArchiveIntroContent = {
  archiveIntroTitle: string;
  archiveIntroText: string;
};

// ------------------------------------------------------------
// site 用コンテンツファイルの絶対パスです。
// ------------------------------------------------------------
const archiveIntroPath = path.resolve('./content/site/archive-intro.md');

// ------------------------------------------------------------
// frontmatter を抜き出します。
// 最初の --- と最後の --- の間を返します。
// ------------------------------------------------------------
function extractFrontMatter(markdown: string): string {
  // frontmatter のブロックを正規表現で抜き出します。
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---/);

  // 見つからなければ空文字を返します。
  return match?.[1] ?? '';
}

// ------------------------------------------------------------
// 1行の値を取り出します。
// 例:
// archive_intro_title: "Archive"
// のような行から値だけ抜き出します。
// ------------------------------------------------------------
function extractField(frontMatter: string, key: string): string {
  // 指定キーの1行を探します。
  const regex = new RegExp(`^${key}:\\s*(.*)$`, 'm');

  // 値を取得します。
  const rawValue = frontMatter.match(regex)?.[1]?.trim() ?? '';

  // 前後のダブルクオートを外して返します。
  return rawValue.replace(/^"(.*)"$/, '$1').trim();
}

// ------------------------------------------------------------
// アーカイブ導入文を取得します。
// ファイルが存在しない場合でも、最低限のデフォルト値を返します。
// ------------------------------------------------------------
export function getArchiveIntro(): ArchiveIntroContent {
  // ファイルが無い場合の保険です。
  if (!fs.existsSync(archiveIntroPath)) {
    return {
      archiveIntroTitle: 'Archive',
      archiveIntroText: 'このページは、ビカクシダの育成記録アーカイブです。',
    };
  }

  // Markdown ファイルを読み込みます。
  const markdown = fs.readFileSync(archiveIntroPath, 'utf-8');

  // frontmatter 部分だけを抜き出します。
  const frontMatter = extractFrontMatter(markdown);

  // タイトルと本文を返します。
  return {
    archiveIntroTitle: extractField(frontMatter, 'archive_intro_title') || 'Archive',
    archiveIntroText:
      extractField(frontMatter, 'archive_intro_text') ||
      'このページは、ビカクシダの育成記録アーカイブです。',
  };
}