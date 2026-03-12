import fs from "fs-extra";
import TurndownService from "turndown";
import slugify from "slugify";
import { load } from "cheerio";

const turndown = new TurndownService();

const pages = await fs.readJSON("data/pages.json");

for (const page of pages) {

  const slug = page.slug;

  const html = page.content.rendered;

  const $ = load(html);

  $("img").each((i, el) => {

    const src = $(el).attr("src");

    if (!src) return;

    const file = src.split("/").pop();

    $(el).attr("src", `/media/${file}`);

  });

  const md = turndown.turndown($.html());

  const dir = `src/pages/${slug}`;

  await fs.ensureDir(dir);

  const astro = `---
import MainLayout from "../../layouts/MainLayout.astro";
---

<MainLayout title="${page.title.rendered}">

${md}

</MainLayout>
`;

  await fs.writeFile(`${dir}/index.astro`, astro);

  console.log("Created page:", slug);

}
