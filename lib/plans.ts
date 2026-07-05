/**
 * Saved plans: immutable snapshots behind unguessable nanoid slugs.
 * No accounts — the permalink is the whole access model, so slugs must be
 * random (not sequential) and pages must be noindex.
 */
import { nanoid } from "nanoid";
import { sql } from "./wiki";

const MAX_TITLE = 200;
const MAX_CONTENT = 50_000;

export interface SavedPlan {
  slug: string;
  title: string;
  content: string;
  createdAt: string;
}

export async function savePlan(
  title: string,
  content: string,
): Promise<{ slug: string }> {
  const slug = nanoid(12);
  await sql()`
    insert into plans (slug, title, content)
    values (${slug}, ${title.slice(0, MAX_TITLE)}, ${content.slice(0, MAX_CONTENT)})`;
  return { slug };
}

export async function getPlan(slug: string): Promise<SavedPlan | null> {
  const rows = await sql()`
    select slug, title, content, created_at from plans where slug = ${slug}`;
  const row = rows[0];
  if (!row) return null;
  return {
    slug: row.slug as string,
    title: row.title as string,
    content: row.content as string,
    createdAt: (row.created_at as Date).toISOString(),
  };
}
