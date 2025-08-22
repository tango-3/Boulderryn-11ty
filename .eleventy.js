const yaml = require("js-yaml");
const { DateTime } = require("luxon");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const htmlmin = require("html-minifier-terser");
const markdownIt = require("markdown-it");

module.exports = function (eleventyConfig) {
  // Disable automatic use of your .gitignore
  eleventyConfig.setUseGitIgnore(false);

  // Merge data instead of overriding
  eleventyConfig.setDataDeepMerge(true);

  // Markdown-it instance + filter
  const md = markdownIt({ html: true, breaks: true, linkify: true });
  eleventyConfig.addFilter("markdown", (content) => (!content ? "" : md.render(String(content))));

  eleventyConfig.addFilter("markdownInline", (content) =>
  !content ? "" : md.renderInline(String(content))
  );

  // Human-readable date
  eleventyConfig.addFilter("readableDate", (dateObj) =>
    DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("dd LLL yyyy")
  );

  // Current year filter
  eleventyConfig.addFilter("year", () => {
    return DateTime.now().toFormat("yyyy");
  });
  
  // Syntax highlighting
  eleventyConfig.addPlugin(syntaxHighlight);

  // Support .yaml in _data
  eleventyConfig.addDataExtension("yaml", (contents) => yaml.load(contents));
  eleventyConfig.addDataExtension("yml",  (contents) => yaml.load(contents));

  // Passthroughs
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" }); // <-- serve /admin/ fully
  eleventyConfig.addPassthroughCopy({
    "./node_modules/alpinejs/dist/cdn.min.js": "./static/js/alpine.js",
    "./node_modules/prismjs/themes/prism-tomorrow.css": "./static/css/prism-tomorrow.css",
  });
  eleventyConfig.addPassthroughCopy("./src/static/img");
  eleventyConfig.addPassthroughCopy("./src/static/js");
  eleventyConfig.addPassthroughCopy("./src/static/fonts");
  eleventyConfig.addPassthroughCopy("./src/static/css");
  eleventyConfig.addPassthroughCopy("./src/static/svg");
  eleventyConfig.addPassthroughCopy("./src/favicon.ico");

  // --- Navigation helpers & filters ---
  function normalizeUrl(u) {
    if (!u) return "/";
    let url = String(u).trim().replace(/index\.html$/i, "");
    if (url.startsWith("http")) return url;
    if (url !== "/" && !url.endsWith("/")) url += "/";
    return url;
  }
  eleventyConfig.addFilter("isCurrentUrl", (linkUrl, pageUrl) => normalizeUrl(linkUrl) === normalizeUrl(pageUrl));

  function buildNav(collectionApi, desiredLocation) {
    return collectionApi
      .getAll()
      .filter((item) => {
        if (!item.data || Object.keys(item.data).length === 0) return false;
        const d = item.data || {};
        if (!(typeof d.title === "string" && d.title.trim().length)) return false;

        const menu = d.menu || {};
        const url = item.url || "";
        const inputPath = item.inputPath || "";
        const tags = Array.isArray(d.tags) ? d.tags : d.tags ? [d.tags] : [];

        if (d.draft === true) return false;
        if (menu.hide === true) return false;
        if (!url) return false;
        if (url.startsWith("/admin")) return false;

        if (tags.includes("post") || tags.includes("posts")) return false;
        if (inputPath.includes("/posts/") || inputPath.includes("\\posts\\")) return false;

        if (/^\/google[a-z0-9]+\.html$/i.test(url)) return false;

        const loc = menu.location || "primary";
        if (loc === "none") return false;
        return loc === desiredLocation;
      })
      .map((item) => {
        const d = item.data || {};
        const menu = d.menu || {};
        const ord = Number(menu.order);
        return {
          title: menu.title || d.title || item.fileSlug,
          url: menu.url || item.url,
          order: Number.isFinite(ord) ? ord : null,
          external: !!menu.external,
        };
      })
      .sort((a, b) => {
        const aHas = a.order != null;
        const bHas = b.order != null;
        if (aHas && bHas) return a.order === b.order ? a.title.localeCompare(b.title) : a.order - b.order;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        return a.title.localeCompare(b.title);
      });
  }

  eleventyConfig.addCollection("primaryNav", (c) => buildNav(c, "primary"));
  eleventyConfig.addCollection("secondaryNav", (c) => buildNav(c, "secondary"));

  eleventyConfig.addCollection("blogPosts", (c) =>
    c
      .getAll()
      .filter((item) => {
        const d = item.data || {};
        const tags = Array.isArray(d.tags) ? d.tags : d.tags ? [d.tags] : [];
        return tags.includes("post") || tags.includes("posts");
      })
      .sort((a, b) => (b.date || 0) - (a.date || 0))
  );

  // --- Video embed URL normaliser (YouTube/Vimeo) ---
  eleventyConfig.addFilter("embedUrl", (raw) => {
    try {
      if (!raw) return null;
      const u = new URL(raw);

      // Already an embed URL
      if (/youtube-nocookie\.com\/embed|youtube\.com\/embed|player\.vimeo\.com\/video/i.test(u.href)) {
        return u.href;
      }

      // YouTube / youtu.be
      if (/(^|\.)youtube\.com$/i.test(u.hostname) || /( ^|\. )?youtu\.be$/i.test(u.hostname.replace(/^www\./i, ""))) {
        let id = u.searchParams.get("v");
        if (!id) {
          const parts = u.pathname.split("/").filter(Boolean);
          id = parts[0] === "shorts" || parts[0] === "embed" ? parts[1] : parts[0];
        }
        if (!id) return null;
        const params = new URLSearchParams({ modestbranding: "1", rel: "0", playsinline: "1" });
        return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
      }

      // Vimeo
      if (/(^|\.)vimeo\.com$/i.test(u.hostname)) {
        const id = (u.pathname.match(/\/(\d+)/) || [])[1];
        if (!id) return null;
        return `https://player.vimeo.com/video/${id}`;
      }

      return null;
    } catch {
      return null;
    }
  });

  // Minify HTML
  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      return htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
    }
    return content;
  });

  // Treat .html as Nunjucks
  return {
    dir: { input: "src" },
    htmlTemplateEngine: "njk",
  };
};