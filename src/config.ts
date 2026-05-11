import type { SiteConfig } from "./types";

export const siteConfig: SiteConfig = {
    title: "林協霆 · 臨床筆記",
    titleEn: "Hsieh-Ting Lin · Clinical Notes",
    description: "腫瘤內科醫師。臨床筆記與閱讀記錄。",
    siteUrl: "https://lin.hsiehting.com",
    author: {
        name: "林協霆",
        bio: "和信治癌中心醫院腫瘤內科部血液腫瘤科專研醫師。臨床筆記與閱讀記錄。",
        credentials: "MD, 內科專科醫師, 腫瘤內科專科醫師",
        specialty: "血液腫瘤內科 (Hematology & Medical Oncology)",
        affiliation: "醫療財團法人辜公亮基金會和信治癌中心醫院 腫瘤內科部",
        affiliationUrl: "https://www.kfsyscc.org/",
        orcid: "https://orcid.org/0009-0002-3974-4528",
        scholar:
            "https://scholar.google.com/citations?user=3-HCVDAAAAAJ&hl=zh-TW",
    },
    nav: [
        { label: "文章", href: "/" },
        { label: "標籤", href: "/tags" },
        { label: "CV", href: "/cv" },
        { label: "關於", href: "/about" },
    ],
    socials: {
        github: "https://github.com/htlin222",
        twitter: "",
        linkedin: "",
        line: "https://line.me/R/ti/p/@927pjtfa",
        email: "mail@hsiehting.com",
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
