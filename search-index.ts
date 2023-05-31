import { Index } from "flexsearch";
import * as fs from "node:fs";
import * as path from "node:path";

const textes = JSON.parse(fs.readFileSync("public/index/textes.json", "utf8"));
const index = new Index({
  tokenize: "forward",
  charset: "latin:simple",
});
const dir: fs.Dir = fs.opendirSync("public/index");
let dirent;
while ((dirent = dir.readSync()) !== null) {
  if (dirent.name == "textes.json") continue;
  console.log(path.basename(dirent.name, ".json"))
  index.import(
    path.basename(dirent.name, ".json"),
    JSON.parse(fs.readFileSync(path.join("public/index", dirent.name), "utf8"))
  );
  console.log(`Read public/index/${dirent.name}`);
}

for (const result of index.search("lotissement majeur")) {
  console.log(textes[result]);
}
