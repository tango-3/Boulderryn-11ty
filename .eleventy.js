const yaml = require("js-yaml");
const { DateTime } = require("luxon");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const htmlmin = require("html-minifier-terser");

module.exports = function (eleventyConfig) {
  // Disable automatic use of your .gitignore
  eleventyConfig.setUseGitIgnore(false);

  // Merge data instead of overriding
  eleventyConfig.setDataDeepMerge(true);

  // human readable date
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat(
      "dd LLL yyyy"
    );
  });

  // Syntax Highlighting for Code blocks
  eleventyConfig.addPlugin(syntaxHighlight);

  // To Support .yaml Extension in _data
  // You may remove this if you can use JSON
  eleventyConfig.addDataExtension("yaml", (contents) => yaml.load(contents));

  // Copy Static Files to /_Site
  eleventyConfig.addPassthroughCopy({
    "./src/admin/config.yml": "./admin/config.yml",
    "./node_modules/alpinejs/dist/cdn.min.js": "./static/js/alpine.js",
    "./node_modules/prismjs/themes/prism-tomorrow.css":
      "./static/css/prism-tomorrow.css",
  });

  // Copy Image Folder to /_site
  eleventyConfig.addPassthroughCopy("./src/static/img");
  // Copy JS Folder to /_site
  eleventyConfig.addPassthroughCopy("./src/static/js");
  // Copy Fonts Folder to /_site
  eleventyConfig.addPassthroughCopy("./src/static/fonts");
  // Copy Styles Folder to /_site
  eleventyConfig.addPassthroughCopy("./src/static/css");
  // Copy favicon to route of /_site
  eleventyConfig.addPassthroughCopy("./src/favicon.ico");
  // Copy svg to route of /_site
  eleventyConfig.addPassthroughCopy("./src/static/svg");

  // --- Navigation helpers & filters ---
  function normalizeUrl(u) {
    if (!u) return "/";
    let url = String(u).trim();
    // Strip index.html and ensure trailing slash for internal URLs
    url = url.replace(/index\.html$/i, "");
    if (url.startsWith("http")) return url; // external untouched
    if (url !== "/" && !url.endsWith("/")) url += "/";
    return url;
  }

  eleventyConfig.addFilter("isCurrentUrl", function (linkUrl, pageUrl) {
    return normalizeUrl(linkUrl) === normalizeUrl(pageUrl);
  });

  // Build nav collections based on front matter under `menu.*`
  function buildNav(collectionApi, desiredLocation) {
    return collectionApi
      .getAll()
      .filter((item) => {
        // Skip if no front matter data object or completely empty front matter
        if (!item.data || Object.keys(item.data).length === 0) return false;

        const d = item.data || {};
        // Require a meaningful title in front matter to be considered for nav
        if (!(typeof d.title === "string" && d.title.trim().length)) return false;

        const menu = d.menu || {};
        const url = item.url || "";
        const inputPath = item.inputPath || "";
        const tags = Array.isArray(d.tags) ? d.tags : d.tags ? [d.tags] : [];

        // Exclude drafts, hidden, no URL
        if (d.draft === true) return false;
        if (menu.hide === true) return false;
        if (!url) return false;

        // Exclude admin
        if (url.startsWith("/admin")) return false;

        // Exclude any blog posts (by tag or folder convention)
        if (tags.includes("post") || tags.includes("posts")) return false;
        if (inputPath.includes("/posts/") || inputPath.includes("\\posts\\")) return false;

        // Exclude Google site verification files like /googleXXXX.html
        if (/^\/google[a-z0-9]+\.html$/i.test(url)) return false;

        // Location: default to primary when not specified; allow explicit 'none'
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
        const aHas = a.order !== null && a.order !== undefined;
        const bHas = b.order !== null && b.order !== undefined;
        if (aHas && bHas) {
          if (a.order !== b.order) return a.order - b.order;
          return a.title.localeCompare(b.title);
        }
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        return a.title.localeCompare(b.title);
      });
  }

  eleventyConfig.addCollection("primaryNav", (collectionApi) =>
    buildNav(collectionApi, "primary")
  );
  eleventyConfig.addCollection("secondaryNav", (collectionApi) =>
    buildNav(collectionApi, "secondary")
  );

  eleventyConfig.addCollection("blogPosts", (collectionApi) => {
    return collectionApi
      .getAll()
      .filter((item) => {
        const d = item.data || {};
        const tags = Array.isArray(d.tags) ? d.tags : d.tags ? [d.tags] : [];
        return tags.includes("post") || tags.includes("posts");
      })
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  });

  // Minify HTML
  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    // Eleventy 1.0+: use this.inputPath and this.outputPath instead
    if (outputPath.endsWith(".html")) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
      return minified;
    }

    return content;
  });

  // Let Eleventy transform HTML files as nunjucks
  // So that we can use .html instead of .njk
  return {
    dir: {
      input: "src",
    },
    htmlTemplateEngine: "njk",
  };
};
