import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function findDatabases() {
    console.log("Searching for all databases...\n");

    const response = await notion.search({
        filter: { value: "data_source", property: "object" },
        page_size: 100,
    });

    console.log(`Found ${response.results.length} databases:\n`);

    for (const db of response.results) {
        const database = db as any;
        const title = database.title?.[0]?.plain_text || "Untitled";
        console.log(`Title: ${title}`);
        console.log(`ID: ${database.id}`);
        console.log(`URL: https://notion.so/${database.id.replace(/-/g, "")}`);
        console.log("---");
    }
}

findDatabases().catch(console.error);
