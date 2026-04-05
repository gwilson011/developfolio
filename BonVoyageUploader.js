// BonVoyageUploader.js

const BASE_API_URL = "https://gracewilson.info/api/drive";

// 🔧 Tunable settings
const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.55;

async function main() {
    const photos = args.images;

    if (!photos || photos.length === 0) {
        await showError(
            "No photos shared. Select photos in Photos app, tap Share, then run this script.",
        );
        return;
    }

    // 1. Folder name
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

    // 2. Notes
    const notesAlert = new Alert();
    notesAlert.title = "Trip Notes";
    notesAlert.message = "Enter a subtitle/description (optional):";
    notesAlert.addTextField("e.g., Summer 2026");
    notesAlert.addAction("Upload");
    notesAlert.addCancelAction("Cancel");

    if ((await notesAlert.present()) === -1) return;

    const tripNotes = notesAlert.textFieldValue(0).trim();

    await notify("Bon Voyage", `Creating folder...`);

    try {
        // 3. Setup folder + sheet
        const setupReq = new Request(`${BASE_API_URL}/setup`);
        setupReq.method = "POST";
        setupReq.headers = { "Content-Type": "application/json" };
        setupReq.body = JSON.stringify({
            folderName,
            tripNotes,
        });

        const setupRes = parseJson(await setupReq.loadString());

        if (!setupRes.ok) throw new Error(setupRes.error);

        const { folderId, folderUrl, sheetId } = setupRes.data;

        let uploaded = 0;

        // 4. Upload each photo
        for (let i = 0; i < photos.length; i++) {
            await notify("Uploading...", `Photo ${i + 1} of ${photos.length}`);

            const payload = buildPhotoPayload(photos[i], i);

            const uploadReq = new Request(`${BASE_API_URL}/upload-photo`);
            uploadReq.method = "POST";
            uploadReq.headers = { "Content-Type": "application/json" };
            uploadReq.body = JSON.stringify({
                folderId,
                sheetId,
                filename: payload.filename,
                data: payload.data,
            });
            uploadReq.timeoutInterval = 180;

            const uploadRes = parseJson(await uploadReq.loadString());

            if (!uploadRes.ok) {
                throw new Error(
                    uploadRes.error || `Failed on ${payload.filename}`,
                );
            }

            uploaded++;
        }

        // 5. Success UI
        const alert = new Alert();
        alert.title = "Success";
        alert.message = `Uploaded ${uploaded} photos`;
        alert.addAction("Open Folder");
        alert.addAction("Done");

        const action = await alert.present();
        if (action === 0) {
            Safari.open(folderUrl);
        }
    } catch (err) {
        await showError(err.message || String(err));
    }
}

//
// 🔥 IMAGE OPTIMIZATION (KEY PART)
//

function resizeImage(image, maxDimension = MAX_DIMENSION) {
    const w = image.size.width;
    const h = image.size.height;

    const scale = Math.min(maxDimension / w, maxDimension / h, 1);

    const newW = Math.round(w * scale);
    const newH = Math.round(h * scale);

    const ctx = new DrawContext();
    ctx.size = new Size(newW, newH);
    ctx.opaque = true;
    ctx.respectScreenScale = false;

    ctx.drawImageInRect(image, new Rect(0, 0, newW, newH));

    return ctx.getImage();
}

function buildPhotoPayload(photo, index) {
    // 🔥 Resize first (huge size reduction)
    const resized = resizeImage(photo);

    // 🔥 Then compress
    const data = Data.fromJPEG(resized, JPEG_QUALITY);

    const base64 = data.toBase64String();

    return {
        filename: `IMG_${Date.now()}_${index}.jpg`,
        data: base64,
    };
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
