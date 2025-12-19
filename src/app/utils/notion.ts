// src/utils/notion.ts
import { Client } from "@notionhq/client";
import { NotionBlock, RichText } from "../types/recipe";

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
    return { multi_select: tags.map((name) => ({ name })) };
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

export async function getBlockById(blockId: string) {
    const response = await fetch("/api/notion/page");
    const data = await response.json();

    if (!data.ok) {
        throw new Error(data.error || "Failed to fetch blocks");
    }

    const block = data.blocks.find((b: { id: string }) => b.id === blockId);
    return block || null;
}

/**
 * Fetches all top-level blocks from the configured Notion page
 * @returns Array of raw Notion blocks
 * @throws Error if the API call fails
 */
export async function getAllPageBlocks(): Promise<NotionBlock[]> {
    const response = await fetch("/api/notion/page");
    const data = await response.json();

    if (!data.ok) {
        throw new Error(data.error || "Failed to fetch page blocks");
    }

    return data.blocks || [];
}

interface Exercise {
    name?: string;
    title?: string;
    sets_reps?: string;
    duration?: string;
    reps?: string;
    details?: string;
}

interface ExerciseGroup {
    name: string;
    exercises?: Exercise[];
}

interface ParsedPage {
    notes?: ParsedContent[];
    schedule?: Record<string, ParsedContent[]>;
    workout_plan?: Record<string, {
        title: string;
        duration?: string;
        exercises: (Exercise | ExerciseGroup)[];
    }>;
    archives?: Array<{
        title: string;
        content: ParsedContent[];
    }>;
    [key: string]: any;
}

type ParsedContent =
    | string
    | {
          text: string;
          children?: ParsedContent[];
          checked?: boolean;
      };

function extractText(richText: RichText[]): string {
    if (!richText || !Array.isArray(richText) || richText.length === 0) {
        return "";
    }
    return richText.map((rt) => rt.plain_text).join("");
}

/**
 * Parse title and duration from text like "Quick Cardio + Core (~40 min)"
 * Falls back to using entire text as title if pattern doesn't match
 */
function parseTitleDuration(text: string): { title: string; duration?: string } {
    if (!text) return { title: "" };

    const match = text.match(/^(.+?)\s+\((.+?)\)$/);
    if (match) {
        return { title: match[1].trim(), duration: match[2] };
    }
    // Fallback: entire text is title
    return { title: text };
}

/**
 * Convert ParsedContent to Exercise format
 */
function parseExercise(content: ParsedContent): Exercise | ExerciseGroup {
    if (typeof content === 'string') {
        return { name: content };
    }

    if (content.children && content.children.length > 0) {
        return {
            name: content.text,
            exercises: content.children.map(parseExercise) as Exercise[]
        };
    }

    return { name: content.text || '' };
}

function parseBlock(block: NotionBlock): ParsedContent {
    const blockContent = block[block.type as keyof NotionBlock];

    if (!blockContent || typeof blockContent !== "object") {
        return "";
    }

    let text = "";
    if ("rich_text" in blockContent) {
        text = extractText((blockContent as any).rich_text);
    }

    if (!block.children || block.children.length === 0) {
        if (block.type === "to_do" && "checked" in blockContent) {
            return {
                text,
                checked: (blockContent as any).checked || false,
            };
        }
        return text;
    }

    return {
        text,
        children: block.children.map(parseBlock),
    };
}

export function parseNotionPage(blocks: NotionBlock[]): ParsedPage {
    const result: ParsedPage = {};
    let currentSection: string | null = null;
    let currentDay: string | null = null;

    for (const block of blocks) {
        const blockContent = block[block.type as keyof NotionBlock];

        if (!blockContent || typeof blockContent !== "object") continue;

        // Handle toggles (notes, archives)
        if (block.type === "toggle" && "rich_text" in blockContent) {
            const title = extractText((blockContent as any).rich_text);

            if (title.toLowerCase() === "notes") {
                result.notes = block.children?.map(parseBlock) || [];
            } else if (title.toLowerCase().includes("archive")) {
                if (!result.archives) result.archives = [];
                result.archives.push({
                    title,
                    content: block.children?.map(parseBlock) || [],
                });
            }
            continue;
        }

        // Handle main heading (schedule)
        if (block.type === "heading_1" && "rich_text" in blockContent) {
            currentSection = extractText(
                (blockContent as any).rich_text
            ).toLowerCase();
            if (currentSection === "schedule") {
                result.schedule = {};
            }
            continue;
        }

        // Handle day headings
        if (
            block.type === "heading_3" &&
            currentSection === "schedule" &&
            "rich_text" in blockContent
        ) {
            currentDay = extractText((blockContent as any).rich_text);
            if (result.schedule) {
                result.schedule[currentDay] = [];
            }
            continue;
        }
        // Handle sub headings
        if (
            block.type === "paragraph" &&
            currentSection === "schedule" &&
            "rich_text" in blockContent
        ) {
            const paraText = extractText((blockContent as any).rich_text);
            if (result.schedule && currentDay) {
                result.schedule[currentDay].push(paraText);
            }
        }

        // Handle content under current day
        if (
            block.type === "bulleted_list_item" &&
            currentDay &&
            result.schedule
        ) {
            result.schedule[currentDay].push(parseBlock(block));
        }
    }

    // Transform schedule into workout_plan format
    if (result.schedule) {
        result.workout_plan = {};

        for (const [day, content] of Object.entries(result.schedule)) {
            if (!content || content.length === 0) continue;

            // First item should be paragraph with title/duration
            let workoutTitle = day; // Fallback to day name
            let workoutDuration: string | undefined;
            let exercises: ParsedContent[] = content;

            // Check if first item is a string (paragraph text)
            if (typeof content[0] === 'string') {
                const { title, duration } = parseTitleDuration(content[0]);
                workoutTitle = title || day;
                workoutDuration = duration;
                exercises = content.slice(1); // Rest are exercises
            }

            result.workout_plan[day] = {
                title: workoutTitle,
                duration: workoutDuration,
                exercises: exercises.map(parseExercise)
            };
        }
    }

    return result;
}
