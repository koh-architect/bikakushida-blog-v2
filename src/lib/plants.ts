// ------------------------------------------------------------
// 植物データの読み取りを 1 か所に集約するための共通ロジックです。
// 一覧ページと詳細ページで別々に正規表現を書くと壊れやすいので、
// ここにまとめています。
// 今回は Android アプリ側が保存した
// "前後にクオート付きの画像パス" も安全に吸収します。
// ------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { stripWrappingQuotes } from './url';

// 日誌 1 件分の型です。
export type DiaryEntry = {
  date: string;
  type: string;
  image: string;
  note: string;
};

// 植物 1 件分の型です。
export type PlantRecord = {
  slug: string;
  path: string;
  title: string;
  species: string;
  acquiredDate: string;
  location: string;
  mount: string;
  status: string;
  coverImage: string;
  description: string;
  diary: DiaryEntry[];
  diaryCount: number;
  latestDiaryDate: string;
};

// content/plants ディレクトリの絶対パスです。
const plantsDir = path.resolve('./content/plants');

// frontmatter の先頭ブロックだけを抜き出します。
function extractFrontMatter(markdown: string): string {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---/);
  return match?.[1] ?? '';
}

// 単一行値を取り出しつつ、前後クオートも除去します。
// これで以下の両方を吸収できます。
//   cover_image: /images/uploads/a.jpg
//   cover_image: "/images/uploads/a.jpg"
function extractField(frontMatter: string, key: string): string {
  const regex = new RegExp(`^${key}:\\s*(.*)$`, 'm');
  const rawValue = frontMatter.match(regex)?.[1]?.trim() ?? '';
  return stripWrappingQuotes(rawValue);
}

// 日誌ブロックを frontmatter 内から取り出します。
function extractDiaryBlock(frontMatter: string): string {
  // "diary:" 以降を丸ごと抜き取ります。
  const match = frontMatter.match(/(?:^|\n)diary:\s*\n([\s\S]*)$/);
  return match?.[1] ?? '';
}

// 日誌ブロックを DiaryEntry[] に変換します。
// note は次の "- date:" までを拾うので、複数行にも多少強くしています。
// image は前後クオート付きでも stripWrappingQuotes で正規化します。
function parseDiaryEntries(frontMatter: string): DiaryEntry[] {
  const diaryBlock = extractDiaryBlock(frontMatter);

  // 日誌がない場合は空配列です。
  if (!diaryBlock.trim()) {
    return [];
  }

  const entryRegex =
    /(?:^|\n)\s*-\s*date:\s*(.+?)\n\s*type:\s*(.+?)(?:\n\s*image:\s*(.+?))?\n\s*note:\s*([\s\S]*?)(?=\n\s*-\s*date:|\s*$)/g;

  const entries = [...diaryBlock.matchAll(entryRegex)].map((match) => ({
    // trim して余計な空白を落とします。
    date: stripWrappingQuotes(match[1]?.trim() ?? ''),
    type: stripWrappingQuotes(match[2]?.trim() ?? ''),
    image: stripWrappingQuotes(match[3]?.trim() ?? ''),
    // note は複数行になっても一応読めるようにしています。
    note: stripWrappingQuotes((match[4] ?? '').trim()),
  }));

  // 新しい日付順に並べて返します。
  return entries.sort((a, b) => normalizeDate(b.date).localeCompare(normalizeDate(a.date)));
}

// ソート用に日付文字列を YYYY-MM-DD 形式へ寄せます。
// 読めない場合は空文字を返します。
export function normalizeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

// 1 ファイル分の Markdown を PlantRecord に変換します。
export function parsePlantMarkdown(filePath: string, markdown: string): PlantRecord {
  const frontMatter = extractFrontMatter(markdown);

  const diary = parseDiaryEntries(frontMatter);

  return {
    // ファイル名を slug に使います。
    slug: path.basename(filePath, '.md'),
    // 元ファイルパスも持たせておくと、後で追跡しやすいです。
    path: filePath,
    title: extractField(frontMatter, 'title'),
    species: extractField(frontMatter, 'species'),
    acquiredDate: extractField(frontMatter, 'acquired_date'),
    location: extractField(frontMatter, 'location'),
    mount: extractField(frontMatter, 'mount'),
    status: extractField(frontMatter, 'status'),
    coverImage: extractField(frontMatter, 'cover_image'),
    description: extractField(frontMatter, 'description'),
    diary,
    diaryCount: diary.length,
    latestDiaryDate: diary[0]?.date ?? '',
  };
}

// 植物ファイル一覧を取得します。
function getPlantFiles(): string[] {
  return fs
    .readdirSync(plantsDir)
    .filter((file) => file.endsWith('.md'))
    .sort();
}

// 全植物を取得します。
// 初期表示は「最新更新順」にしておくと、クライアント側で並べ替える前から自然です。
export function getAllPlants(): PlantRecord[] {
  return getPlantFiles()
    .map((file) => {
      const filePath = path.join(plantsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      return parsePlantMarkdown(filePath, content);
    })
    .sort((a, b) => normalizeDate(b.latestDiaryDate).localeCompare(normalizeDate(a.latestDiaryDate)));
}

// slug から 1 件取得します。
export function getPlantBySlug(slug: string): PlantRecord | undefined {
  return getAllPlants().find((plant) => plant.slug === slug);
}
