import axios from "axios";
import fs from "fs-extra";

export async function fetchPages() {

  const BASE = "https://acmsonline.org/wp-json/wp/v2/pages";

  let page = 1;
  let pages = [];

  while (true) {

    const res = await axios.get(`${BASE}?per_page=100&page=${page}`);

    if (res.data.length === 0) break;

    pages = pages.concat(res.data);

    page++;

  }

  await fs.ensureDir("data");

  await fs.writeJSON("data/pages.json", pages, { spaces: 2 });

  console.log("Pages downloaded:", pages.length);

}
