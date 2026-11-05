/**
 * Reescribe lib/local-media-catalog.ts dejando solo entradas cuyo archivo existe en public/.
 */
const fs = require("fs");
const path = require("path");

const catalogPath = path.join(__dirname, "..", "lib", "local-media-catalog.ts");
const publicDir = path.join(__dirname, "..", "public");
const src = fs.readFileSync(catalogPath, "utf8");

const itemRe =
  /\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*path:\s*"([^"]+)",\s*category:\s*"([^"]+)",\s*type:\s*"([^"]+)",\s*previewUrl:\s*"([^"]+)"\s*\}/g;

const kept = [];
const removed = [];
let m;
while ((m = itemRe.exec(src))) {
  const item = {
    id: m[1],
    name: m[2],
    path: m[3],
    category: m[4],
    type: m[5],
    previewUrl: m[6],
  };
  const rel = path.join(publicDir, item.path.replace(/^\//, "").replace(/\//g, path.sep));
  if (fs.existsSync(rel)) kept.push(item);
  else removed.push(item);
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const lines = kept.map(
  (i) =>
    `  { id: "${esc(i.id)}", name: "${esc(i.name)}", path: "${esc(i.path)}", category: "${esc(i.category)}", type: "${esc(i.type)}", previewUrl: "${esc(i.previewUrl)}" },`
);

const out = `export interface LocalMediaItem {
  id: string;
  name: string;
  path: string;
  category: "products" | "brands" | "hero" | "about" | "categories" | "inicio" | "videos";
  type: "image" | "video";
  previewUrl: string;
}

export const LOCAL_MEDIA_ITEMS: LocalMediaItem[] = [
${lines.join("\n")}
];

export function getLocalMediaByCategory(category?: string): LocalMediaItem[] {
  if (!category || category === "all") return LOCAL_MEDIA_ITEMS;
  return LOCAL_MEDIA_ITEMS.filter((item) => item.category === category);
}

export function searchLocalMedia(query: string, category?: string): LocalMediaItem[] {
  let list = getLocalMediaByCategory(category);
  if (!query) return list;
  const q = query.toLowerCase();
  return list.filter(
    (item) => item.name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q)
  );
}
`;

fs.writeFileSync(catalogPath, out, "utf8");
console.log(
  JSON.stringify(
    {
      kept: kept.length,
      removed: removed.length,
      removedNames: removed.map((r) => r.name),
    },
    null,
    2
  )
);
