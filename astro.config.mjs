// @ts-check

import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";

/**
 * Wrap every <table> inside <div class="table-wrap"> so narrow viewports
 * can scroll horizontally instead of squeezing the columns to a few
 * characters wide. Pure tree-walk, no extra deps.
 */
function rehypeWrapTables() {
  return (tree) => {
    function walk(node) {
      if (!node || !Array.isArray(node.children)) return;
      node.children = node.children.map((child) => {
        if (child && child.type === "element" && child.tagName === "table") {
          return {
            type: "element",
            tagName: "div",
            properties: { className: ["table-wrap"] },
            children: [child],
          };
        }
        if (child && (child.type === "element" || child.type === "root")) {
          walk(child);
        }
        return child;
      });
    }
    walk(tree);
  };
}

// https://astro.build/config
export default defineConfig({
  site: "https://lin.hsiehting.com",
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    rehypePlugins: [rehypeWrapTables],
  },

  integrations: [
    expressiveCode({
      themes: ["github-light", "github-dark"],
      useDarkModeMediaQuery: false,
      themeCssSelector: (theme) => (theme.name.includes("dark") ? ".dark" : ":root"),
    }),
    mdx({
      rehypePlugins: [rehypeWrapTables],
    }),
    sitemap()
  ],
});
