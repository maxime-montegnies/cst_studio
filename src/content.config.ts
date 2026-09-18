import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const portfolio = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/portfolio' }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    image: z.string(),
    order: z.number().default(99),
    draft: z.boolean().default(false),
    excerpt: z.string().optional(),
  }),
});

export const collections = { portfolio };
