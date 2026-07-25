// Shared CV data for /cv (web), /print/cv-zh, /print/cv-en routes.
// All English fields are required so the English page never falls back to Chinese.

export interface CvEntry {
    period: string;
    title: string;
    titleEn: string;
    org: string;
    orgEn: string;
}

export interface CvPublication {
    authors: string;
    title: string;
    venue: string;
    url: string | null;
}

export interface CvPresentation {
    date: string;
    venue: string;
    venueEn: string;
    title: string;
}

export const positions: CvEntry[] = [
    {
        period: "2026.08 –",
        title: "腫瘤內科專任主治醫師",
        titleEn: "Attending Physician, Medical Oncology",
        org: "腫瘤內科部，醫療財團法人辜公亮基金會和信治癌中心醫院",
        orgEn: "Department of Hematology & Medical Oncology, Koo Foundation Sun Yat-Sen Cancer Center",
    },
];

export const experience: CvEntry[] = [
    {
        period: "2023.08 – 2026.07",
        title: "血液腫瘤科專研醫師（Fellow）",
        titleEn: "Hematology & Medical Oncology Fellow",
        org: "腫瘤內科部，醫療財團法人辜公亮基金會和信治癌中心醫院",
        orgEn: "Department of Hematology & Medical Oncology, Koo Foundation Sun Yat-Sen Cancer Center",
    },
    {
        period: "2021.08 – 2023.08",
        title: "內科住院醫師",
        titleEn: "Internal Medicine Resident",
        org: "一般內科部，醫療財團法人辜公亮基金會和信治癌中心醫院",
        orgEn: "Department of General Internal Medicine, Koo Foundation Sun Yat-Sen Cancer Center",
    },
    {
        period: "2019.08 – 2021.07",
        title: "PGY 醫師（Post-graduate Year Residency）",
        titleEn: "Post-Graduate Year Physician (PGY)",
        org: "一般內科部，醫療財團法人辜公亮基金會和信治癌中心醫院",
        orgEn: "Department of General Internal Medicine, Koo Foundation Sun Yat-Sen Cancer Center",
    },
];

export const education: CvEntry[] = [
    {
        period: "2013 – 2019",
        title: "醫學系（Doctor of Medicine）",
        titleEn: "Doctor of Medicine (M.D.)",
        org: "國立成功大學",
        orgEn: "National Cheng Kung University, Tainan, Taiwan",
    },
];

export const publications: CvPublication[] = [
    {
        authors: "Lin HT, Huang CJ.",
        title: "The Use of High-Flow Nasal Oxygen in Cancer Patients.",
        venue: "Resuscitation & Intensive Care Med. 2023;8:37–42.",
        url: null,
    },
    {
        authors: "Lin HT, Chiou LW, Chu NM, et al.",
        title: "Impact of Early versus Delayed G-CSF Administration on Clinical Outcomes in Chemotherapy-induced Neutropenia: A Propensity Score-matching Cohort Study.",
        venue: "Journal of Cancer Research and Practice. Published online April 10, 2026.",
        url: "https://doi.org/10.4103/ejcrp.ejcrp-d-25-00039",
    },
    {
        authors: "Lin HT, Tan TD, Chiou LW.",
        title: "The Impact of Hematopoietic Stem Cell Transplantation to Overall Survival in T Cell Lymphoma: A Single-center Experience.",
        venue: "EHA Library. 06/13/2024; 421848; PB3082.",
        url: null,
    },
    {
        authors: "Lin HT, Hou TY.",
        title: "Readable Minds: Emergent Theory-of-Mind-Like Behavior in LLM Poker Agents.",
        venue: "arXiv. 2026.",
        url: "https://arxiv.org/abs/2604.04157",
    },
];

export const presentations: CvPresentation[] = [
    {
        date: "2026-01-30",
        venue: "第 189 次聯合學術研討會",
        venueEn: "189th Joint Academic Conference, Taiwan",
        title: "IT-MTX Prophylaxis in DLBCL — A Competing Risks Analysis of Secondary CNS Lymphoma Prevention",
    },
    {
        date: "2025-01-12",
        venue: "第 186 次聯合學術研討會",
        venueEn: "186th Joint Academic Conference, Taiwan",
        title: "The Outcome of Salvage Second or More Hematopoietic Stem Cell Transplantations in Late Relapsed Patients is not Inferior to a Single Transplant in Hematologic Patients — 20 Years of Experience in a Single Institute",
    },
    {
        date: "2024-01-15",
        venue: "第 183 次聯合學術研討會",
        venueEn: "183rd Joint Academic Conference, Taiwan",
        title: "Real-world Outcome of the Impact of Hematopoietic Stem Cell Transplant on the Treatment of Peripheral T-Cell Lymphoma",
    },
    {
        date: "2023-10-13",
        venue: "第 182 次聯合學術研討會",
        venueEn: "182nd Joint Academic Conference, Taiwan",
        title: "Nephrotic Syndrome after Hematopoietic Stem Cell Transplantation",
    },
];

export const certifications: string[] = [
    "台灣內科醫學會內科專科醫師",
    "台灣癌症醫學會腫瘤內科專科醫師",
];

export const certificationsEn: string[] = [
    "Board-Certified, Taiwan Society of Internal Medicine",
    "Board-Certified Medical Oncologist, Taiwan Oncology Society",
];

export const profiles: { label: string; href: string }[] = [
    {
        label: "Google Scholar",
        href: "https://scholar.google.com/citations?user=3-HCVDAAAAAJ&hl=zh-TW",
    },
    {
        label: "ORCID 0009-0002-3974-4528",
        href: "https://orcid.org/0009-0002-3974-4528",
    },
    {
        label: "GitHub @htlin222",
        href: "https://github.com/htlin222",
    },
];

export const cvHeader = {
    nameZh: "林協霆",
    nameEn: "Hsieh-Ting Lin",
    credentialsZh: "M.D.",
    credentialsEn: "M.D., Medical Oncologist",
    taglineZh: "腫瘤內科專任主治醫師",
    taglineEn:
        "Attending Physician, Medical Oncology, Koo Foundation Sun Yat-Sen Cancer Center · Taipei, Taiwan",
    email: "mail@hsiehting.com",
};
