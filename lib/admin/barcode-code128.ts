/**
 * Minimal CODE128B barcode → SVG path (no external deps).
 * Suitable for admin label printing.
 */

const CODE128B: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (let i = 0; i < 95; i++) {
    map[String.fromCharCode(32 + i)] = i;
  }
  return map;
})();

/** Pattern widths for codes 0–106 (bars/spaces, 11 modules except STOP = 13). */
const PATTERNS: string[] = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112",
];

const START_B = 104;
const STOP = 106;

export function encodeCode128B(text: string): number[] {
  const value = text.replace(/[^\x20-\x7E]/g, "?").slice(0, 48);
  if (!value) return [];

  const codes: number[] = [START_B];
  let checksum = START_B;

  for (let i = 0; i < value.length; i++) {
    const code = CODE128B[value[i]] ?? CODE128B["?"];
    codes.push(code);
    checksum += code * (i + 1);
  }

  codes.push(checksum % 103);
  codes.push(STOP);
  return codes;
}

export function code128Svg(
  text: string,
  options?: { height?: number; moduleWidth?: number; showText?: boolean }
): string {
  const height = options?.height ?? 48;
  const moduleWidth = options?.moduleWidth ?? 1.5;
  const showText = options?.showText !== false;
  const codes = encodeCode128B(text);
  if (!codes.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="${height}"><text x="4" y="20" font-size="10">SIN CODIGO</text></svg>`;
  }

  let x = 10;
  const bars: string[] = [];
  for (const code of codes) {
    const pattern = PATTERNS[code];
    if (!pattern) continue;
    let bar = true;
    for (const ch of pattern) {
      const w = Number(ch) * moduleWidth;
      if (bar) {
        bars.push(`<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${height}" fill="#000"/>`);
      }
      x += w;
      bar = !bar;
    }
  }

  const quiet = 10;
  const width = Math.ceil(x + quiet);
  const textY = height + 14;
  const totalH = showText ? height + 20 : height;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalH}" viewBox="0 0 ${width} ${totalH}">`,
    ...bars,
    showText
      ? `<text x="${(width / 2).toFixed(1)}" y="${textY}" text-anchor="middle" font-family="ui-monospace, Consolas, monospace" font-size="11" fill="#000">${escapeXml(text)}</text>`
      : "",
    `</svg>`,
  ].join("");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
