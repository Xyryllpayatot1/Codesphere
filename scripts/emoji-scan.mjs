import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(process.cwd(), "src");
const EXT = [".ts", ".tsx", ".css"];
// Extended_Pictographic minus (c) which is plain text, plus variation selector.
const EMOJI = /(?![\u00A9\u00AE])[\p{Extended_Pictographic}]\uFE0F?/u;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "generated") continue; // prisma output — never hand-edited
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (EXT.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

let report = [];
for (const file of walk(ROOT)) {
  const src = readFileSync(file, "utf8");
  const lines = src.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (EMOJI.test(line)) {
      report.push({ file: file.slice(ROOT.length + 1), line: i + 1, text: line.trim().slice(0, 100) });
    }
  });
}

if (process.argv.includes("--fix")) {
  for (const file of [...new Set(report.map((r) => r.file))]) {
    const p = join(process.cwd(), "src", file);
    let src = readFileSync(p, "utf8");
    // Remove emoji runs (with variation selectors / ZWJ) while preserving all
    // other whitespace and indentation exactly.
    src = src
      .split(/\r?\n/)
      .map((l) =>
        l.replace(new RegExp(" *" + EMOJI.source + "(\\uFE0F|\\u200D|" + EMOJI.source + ")* *", "gu"), "")
      )
      .join("\n");
    writeFileSync(p, src);
  }
  console.log(`cleaned ${new Set(report.map((r) => r.file)).size} files`);
}

console.log(report.length === 0 ? "NO EMOJIS FOUND" : `${report.length} hits in ${new Set(report.map((r) => r.file)).size} files:`);
for (const r of report.slice(0, 60)) console.log(`${r.file}:${r.line}: ${r.text}`);
