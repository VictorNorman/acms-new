import axios from "axios";
import fs from "fs-extra";
import path from "path";
import { load } from "cheerio";
import TurndownService from "turndown";

const SITE = "https://acmsonline.org";

const PAGE_DIR = "src/pages";
const MEDIA_DIR = "public/media";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced"
});

async function fetchAllPages() {

  let page = 1;
  let results = [];

  while (true) {

    const url = `${SITE}/wp-json/wp/v2/pages?per_page=100&page=${page}`;

    try {

      const res = await axios.get(url);

      results = results.concat(res.data);

      if (res.data.length < 100) break;

      page++;

    } catch {
      break;
    }

  }

  return results;

}

function detectFrontPage(pages) {

  for (const p of pages) {

    if (!p.link) continue;

    const normalized = p.link.replace(/\/$/, "");

    if (normalized === SITE) return p.id;

  }

  return null;

}

function buildPagePaths(pages) {

  const map = {};
  pages.forEach(p => map[p.id] = p);

  const paths = {};

  function build(page) {

    if (paths[page.id]) return paths[page.id];

    if (!page.parent) {
      paths[page.id] = page.slug;
      return paths[page.id];
    }

    const parent = map[page.parent];

    const parentPath = build(parent);

    paths[page.id] = `${parentPath}/${page.slug}`;

    return paths[page.id];

  }

  pages.forEach(build);

  return paths;

}

function containsForm(html) {

  return html.includes("<form");

}

function sanitizeTitle(title) {

  return title
    .replace(/<[^>]*>/g, "")
    .replace(/"/g, "")
    .trim();

}

async function downloadFile(url) {

  try {

    const filename = url.split("/").pop().split("?")[0];

    const filepath = `${MEDIA_DIR}/${filename}`;

    if (await fs.pathExists(filepath)) return filename;

    const res = await axios.get(url, { responseType: "arraybuffer" });

    await fs.writeFile(filepath, res.data);

    console.log("download:", filename);

    return filename;

  } catch {

    console.log("download failed:", url);

    return null;

  }

}

async function rewriteMedia($) {

  const imgs = $("img");

  for (let i = 0; i < imgs.length; i++) {

    const img = imgs[i];

    let src = $(img).attr("src");

    if (!src) continue;

    if (!src.startsWith("http")) src = SITE + src;

    const file = await downloadFile(src);

    if (file) $(img).attr("src", `/media/${file}`);

  }

}

async function rewriteUploads($) {

  const links = $("a");

  for (let i = 0; i < links.length; i++) {

    const a = links[i];

    let href = $(a).attr("href");

    if (!href) continue;

    if (href.includes("/wp-content/uploads/")) {

      const url = href.startsWith("http") ? href : SITE + href;

      const file = await downloadFile(url);

      if (file) $(a).attr("href", `/media/${file}`);

    }

  }

}

function rewriteInternalLinks($) {

  $("a").each((i, el) => {

    let href = $(el).attr("href");

    if (!href) return;

    if (href.startsWith(SITE)) {

      const local = href.replace(SITE, "");

      $(el).attr("href", local);

    }

  });

}

async function convertPages(pages, frontPageId) {

  const paths = buildPagePaths(pages);

  for (const page of pages) {

    const html = page.content.rendered;

    if (containsForm(html)) {

      console.log("skip form page:", page.slug);

      continue;

    }

    let pagePath = paths[page.id];

    if (page.id === frontPageId) pagePath = "";

    const dir = pagePath
      ? `${PAGE_DIR}/${pagePath}`
      : PAGE_DIR;

    await fs.ensureDir(dir);

    const $ = load(html);

    await rewriteMedia($);

    await rewriteUploads($);

    rewriteInternalLinks($);

    const cleanedHtml = $.html();

    const markdown = turndown.turndown(cleanedHtml);

    const mdFile = pagePath
      ? `${dir}/index.md`
      : `${PAGE_DIR}/index.md`;

    const astroFile = pagePath
      ? `${dir}/index.astro`
      : `${PAGE_DIR}/index.astro`;

    if (await fs.pathExists(astroFile)) {
      await fs.remove(astroFile);
      console.log("removed conflicting astro route:", astroFile);
    }

    const depth = pagePath ? pagePath.split("/").length + 1 : 1;

    const layoutPath = "../".repeat(depth) + "layouts/MainLayout.astro";

    const content =
      `---
title: "${sanitizeTitle(page.title.rendered)}"
layout: ${layoutPath}
---

${markdown}
`;

    await fs.writeFile(mdFile, content);

    console.log("page:", pagePath || "index");

  }

}

async function migrate() {

  await fs.ensureDir(PAGE_DIR);
  await fs.ensureDir(MEDIA_DIR);

  const pages = await fetchAllPages();

  console.log("pages found:", pages.length);

  const frontPageId = detectFrontPage(pages);

  console.log("front page id:", frontPageId);

  await convertPages(pages, frontPageId);

}

migrate();