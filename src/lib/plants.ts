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

// 1 行の scalar 値を取り出します。
// 例:
//   title: konan_1
//   cover_image: "/images/uploads/a.jpg"
function extractField(frontMatter: string, key: string): string {
  const regex = new RegExp(`^${key}:\\s*(.*)$`, 'm');
  const rawValue = frontMatter.match(regex)?.[1]?.trim() ?? '';
  return stripWrappingQuotes(rawValue);
}

// 日付文字列をソート用に YYYY-MM-DD へ寄せます。
export function normalizeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

// 日誌ブロックを行単位で読むパーサです。
// 正規表現 1 発より壊れにくく、クオート付き値にも対応します。
function parseDiaryEntries(frontMatter: string): DiaryEntry[] {
  // まず frontmatter を行単位で分解します。
  const lines = frontMatter.split(/\r?\n/);

  // diary: が始まる位置を探します。
  const diaryStartIndex = lines.findIndex((line) => /^\s*diary:\s*$/.test(line));

  // diary: がなければ空配列です。
  if (diaryStartIndex === -1) {
    return [];
  }

  // 日誌配列です。
  const entries: DiaryEntry[] = [];

  // 現在読み込み中の日誌です。
  let current: DiaryEntry | null = null;

  // note の複数行対応用です。
  let collectingNote = false;

  // diary: の次の行から順番に読みます。
  for (let i = diaryStartIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];

    // 次のトップレベルキーに来たら diary ブロック終了です。
    // 例:
    //   another_key: ...
    // のような行に当たったら抜けます。
    if (/^[A-Za-z0-9_-]+:\s*/.test(line) && !/^\s/.test(line)) {
      break;
    }

    // 新しい日誌開始行です。
    // 例:
    //   - date: 2026-03-30
    const dateMatch = line.match(/^\s*-\s*date:\s*(.*)$/);
    if (dateMatch) {
      // それまで読んでいた current があれば確定して追加します。
      if (current) {
        current.note = current.note.trim();
        entries.push(current);
      }

      // 新しい日誌を開始します。
      current = {
        date: stripWrappingQuotes(dateMatch[1]?.trim() ?? ''),
        type: '',
        image: '',
        note: '',
      };

      // 新しい行なので note 継続は切ります。
      collectingNote = false;
      continue;
    }

    // current がまだなければ、日誌開始前の行なので無視します。
    if (!current) {
      continue;
    }

    // type 行です。
    const typeMatch = line.match(/^\s*type:\s*(.*)$/);
    if (typeMatch) {
      current.type = stripWrappingQuotes(typeMatch[1]?.trim() ?? '');
      collectingNote = false;
      continue;
    }

    // image 行です。
    const imageMatch = line.match(/^\s*image:\s*(.*)$/);
    if (imageMatch) {
      current.image = stripWrappingQuotes(imageMatch[1]?.trim() ?? '');
      collectingNote = false;
      continue;
    }

    // note 開始行です。
    const noteMatch = line.match(/^\s*note:\s*(.*)$/);
    if (noteMatch) {
      current.note = stripWrappingQuotes(noteMatch[1] ?? '').trim();
      collectingNote = true;
      continue;
    }

    // note の続きを読む行です。
    // 例:
    //   note: 1行目
    //     2行目
    // のようなケースを吸収します。
    if (collectingNote) {
      // 次の日誌開始なら note 継続終了です。
      if (/^\s*-\s*date:\s*/.test(line)) {
        collectingNote = false;
        i -= 1;
        continue;
      }

      // 空行も note に含めます。
      if (current.note.length > 0) {
        current.note += `\n${line.trim()}`;
      } else {
        current.note = line.trim();
      }
    }
  }

  // 最後の current を追加します。
  if (current) {
    current.note = current.note.trim();
    entries.push(current);
  }

  // 日付の新しい順に並べて返します。
  return entries.sort((a, b) => normalizeDate(b.date).localeCompare(normalizeDate(a.date)));
}

// 1 ファイル分の Markdown を PlantRecord に変換します。
export function parsePlantMarkdown(filePath: string, markdown: string): PlantRecord {
  const frontMatter = extractFrontMatter(markdown);

  const diary = parseDiaryEntries(frontMatter);

  return {
    slug: path.basename(filePath, '.md'),
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