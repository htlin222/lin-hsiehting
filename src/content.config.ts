import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const post = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/posts" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    titleEn: z.string().optional(),
    date: z.string(),
    frontmatter: z.string(),
    tags: z.array(z.string()),
    citable: z.boolean().optional().default(false),
    image: image().optional(),
    draft: z.boolean().optional().default(false),
    updatedDate: z.string().optional(),
    medical: z.boolean().optional().default(false),
    reviewer: z.string().optional(),
    reviewerCredentials: z.string().optional(),
    reviewedDate: z.string().optional(),
    medicalCondition: z.string().optional(),
    faq: z
      .array(
        z.object({
          q: z.string(),
          a: z.string(),
        }),
      )
      .optional(),
    doi: z.string().optional(),
    conceptDoi: z.string().optional(),
  }),
});

export const collections = { post };
