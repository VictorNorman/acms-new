import axios from "axios";
import fs from "fs-extra";
import path from "path";

const BASE = "https://acmsonline.org/wp-json/wp/v2/media";

let page = 1;
let media = [];

while (true) {

  const res = await axios.get(`${BASE}?per_page=100&page=${page}`);

  if (!res.data.length) break;

  media = media.concat(res.data);

  page++;
}

await fs.ensureDir("public/media");

for (const m of media) {

  const url = m.source_url;

  const name = path.basename(url);

  const dest = `public/media/${name}`;

  const img = await axios.get(url, { responseType: "arraybuffer" });

  await fs.writeFile(dest, img.data);

  console.log("Downloaded", name);
}
