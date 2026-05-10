import type { SiteConfig } from "./types";

export const siteConfig: SiteConfig = {
    title: "林協霆 · 臨床筆記",
    description: "腫瘤內科醫師。臨床筆記與閱讀記錄。",
    siteUrl: "https://lin.hsiehting.com",
    author: {
        name: "林協霆",
        bio: "腫瘤內科醫師。臨床筆記與閱讀記錄。",
    },
    nav: [
        { label: "文章", href: "/" },
        { label: "標籤", href: "/tags" },
        { label: "關於", href: "/about" },
    ],
    socials: {
        github: "https://github.com/htlin222",
        twitter: "",
        linkedin: "",
    },
    postsPerPage: 5,
    analytics: {
        umami: {
            websiteId: "",
            src: "",
        },
    },
    rss: {
        title: "林協霆 · 臨床筆記",
        description: "腫瘤內科醫師。臨床筆記與閱讀記錄。",
    },
};
