// BonVoyageNewTrip.js
// Creates a new Bon Voyage trip folder without uploading photos

const BASE_API_URL = "https://gracewilson.info/api/drive";

async function main() {
    // 1. Prompt for folder name
    const folderAlert = new Alert();
    folderAlert.title = "New Trip";
    folderAlert.message = "Enter the trip/folder name:";
    folderAlert.addTextField("e.g., Split Croatia");
    folderAlert.addAction("Next");
    folderAlert.addCancelAction("Cancel");

    if ((await folderAlert.present()) === -1) return;

    const folderName = folderAlert.textFieldValue(0).trim();
    if (!folderName) {
        await showError("Folder name is required");
        return;
    }

    // 2. Prompt for trip notes (optional)
    const notesAlert = new Alert();
    notesAlert.title = "Trip Notes";
    notesAlert.message = "Enter a subtitle/description (optional):";
    notesAlert.addTextField("e.g., Summer 2026");
    notesAlert.addAction("Create Folder");
    notesAlert.addCancelAction("Cancel");

    if ((await notesAlert.present()) === -1) return;

    const tripNotes = notesAlert.textFieldValue(0).trim();

    await notify("Bon Voyage", "Creating folder...");

    try {
        // 3. POST to /api/drive/setup
        const setupReq = new Request(`${BASE_API_URL}/setup`);
        setupReq.method = "POST";
        setupReq.headers = { "Content-Type": "application/json" };
        setupReq.body = JSON.stringify({
            folderName,
            tripNotes,
        });

        const setupRes = parseJson(await setupReq.loadString());

        if (!setupRes.ok) throw new Error(setupRes.error);

        const { folderUrl } = setupRes.data;

        // 4. Show success with "Open Folder" option
        const successAlert = new Alert();
        successAlert.title = "Success";
        successAlert.message = `Created folder "${folderName}"`;
        successAlert.addAction("Open Folder");
        successAlert.addAction("Done");

        const action = await successAlert.present();
        if (action === 0) {
            Safari.open(folderUrl);
        }
    } catch (err) {
        await showError(err.message || String(err));
    }
}

//
// HELPERS
//

function parseJson(str) {
    try {
        return JSON.parse(str);
    } catch {
        throw new Error("Invalid JSON response");
    }
}

async function notify(title, body) {
    const n = new Notification();
    n.title = title;
    n.body = body;
    await n.schedule();
}

async function showError(msg) {
    const alert = new Alert();
    alert.title = "Error";
    alert.message = msg;
    alert.addAction("OK");
    await alert.present();
}

await main();
