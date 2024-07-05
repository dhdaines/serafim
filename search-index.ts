import lunr from "lunr";
import fs from "node:fs";
import stemmerSupport from "lunr-languages/lunr.stemmer.support";
import lunrFR from "lunr-languages/lunr.fr";
import unidecode from "unidecode";

stemmerSupport(lunr);
lunrFR(lunr);

lunr.Pipeline.registerFunction(token => token.update(unidecode), "unifold")
const index = lunr.Index.load(JSON.parse(fs.readFileSync("public/index.json", "utf8")));

let i = 0;
for (const result of index.search("règlement de démolition")) {
    if (i++ == 5) break;
    console.log(JSON.stringify(result));
}
console.log();
i = 0;
for (const result of index.search("t4.2")) {
    if (i++ == 5) break;
    console.log(JSON.stringify(result));
}
