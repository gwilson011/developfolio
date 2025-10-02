// src/utils/notion.ts
import { Client } from "@notionhq/client";

export const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * HARD-CODED parent block/page id where the new dropdown section should be created.
 * (Use your toggle-heading page ID or a page ID.)
 */
const PARENT_ID = "2a1a3899-73b7-407d-b5a8-0cd1e970fffb";

/** Format a default section title like "haul @September 26, 2025". */
function defaultTitle(): string {
    const d = new Date();
    const pretty = d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    return `haul @${pretty}`;
}


/**
 * List all direct children under a given parent (page or block).
 * Returns array of { id, type }.
 */
export async function listAllChildren(
    parentId: string
): Promise<Array<{ id: string; type: string }>> {
    const out: Array<{ id: string; type: string }> = [];
    let cursor: string | undefined;

    do {
        const resp = await notion.blocks.children.list({
            block_id: parentId,
            start_cursor: cursor,
            page_size: 100,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const b of resp.results as any[]) {
            out.push({ id: b.id, type: b.type });
        }

        cursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
    } while (cursor);

    return out;
}

/** Create a toggle-heading (collapsible) near the top and return its id. */
export async function createToggleHeadingAtTop(
    title?: string
): Promise<string> {
    const addButton = "a16dc698-e4f4-4f35-aa0e-cc886564ac1e"; //await getFirstChildId(); // if exists, we'll insert right after it (i.e., position #2)
    //console.log(children); // array of block IDs
    const created = await notion.blocks.children.append({
        block_id: PARENT_ID,
        children: [
            {
                object: "block",
                heading_3: {
                    rich_text: [
                        {
                            type: "text",
                            text: { content: title?.trim() || defaultTitle() },
                        },
                    ],
                    is_toggleable: true, // 👈 makes it a dropdown
                },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
        ],
        ...(addButton ? { after: addButton } : {}), // best-effort "top"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (created.results[0] as any).id as string;
}

/** Append to-do items under a given parent (page/toggle/heading). */
export async function appendTodos(parentBlockId: string, items: string[]) {
    if (!items?.length) return;
    const children = items.map((text) => ({
        object: "block",
        to_do: {
            checked: false,
            rich_text: [{ type: "text", text: { content: text } }],
        },
    }));
    // batch append (keep it simple; Notion allows up to 100 per call)
    for (let i = 0; i < children.length; i += 90) {
        await notion.blocks.children.append({
            block_id: parentBlockId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            children: children.slice(i, i + 90) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
    }
}

/** Flatten { Category: [items] } to ["item — Category"] or just ["item"]. */
export function flattenGrocery(
    g: Record<string, string[]>,
    labelCategory = true
): string[] {
    const out: string[] = [];
    for (const [cat, arr] of Object.entries(g || {})) {
        for (const name of arr || []) {
            out.push(labelCategory ? `${name} — ${cat}` : name);
        }
    }
    return out;
}

/** Create title property for Notion */
export function titleProp(text: string) {
    return { title: [{ text: { content: text } }] };
}

/** Create rich text property for Notion */
export function textProp(text: string) {
    return { rich_text: [{ text: { content: text.slice(0, 2000) } }] };
}

/** Create date property for Notion */
export function dateProp(date: string) {
    return { date: { start: date } };
}

/** Create multi-select property for Notion */
export function tagsProp(tags: string[]) {
    return { multi_select: tags.map(name => ({ name })) };
}

/** Create select property for Notion (single choice) */
export function selectProp(value: string) {
    return { select: { name: value } };
}

/** Create checkbox property for Notion */
export function checkboxProp(checked: boolean) {
    return { checkbox: checked };
}

/** Create URL property for Notion */
export function urlProp(url: string | null) {
    return { url };
}

/** Create number property for Notion */
export function numberProp(value: number) {
    return { number: value };
}
