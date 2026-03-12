import fs from "fs-extra";

const pages = await fs.readJSON("data/pages.json");

const menu = pages
  .filter(p => p.parent === 0)
  .map(p => ({
    title: p.title.rendered,
    slug: p.slug
  }));

await fs.writeJSON("data/menu.json", menu, { spaces: 2 });
