// BonVoyageAddPhotos.js
// Scriptable script for iOS to add photos to an existing Bon Voyage folder
// Usage: Select photos in Photos app, tap Share, run this script

const BASE_API_URL = "https://gracewilson.info/api/drive";
const AUTH_URL = "https://www.gracewilson.info/api/auth/google";

// 🔧 Tunable settings (match BonVoyageUploader.js)
const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.55;

async function main() {
    // 1. Get photos from Share Sheet
    const photos = args.images;

    if (!photos || photos.length === 0) {
        await showError(
            "No photos shared. Select photos in Photos app, tap Share, then run this script.",
        );
        return;
    }

    // 2. Fetch existing folders with sheetIds
    await notify("Bon Voyage", "Fetching folders...");

    let folders;
    try {
        const foldersRequest = new Request(`${BASE_API_URL}/add-photos`);
        const responseText = await foldersRequest.loadString();
        const response = parseJson(responseText);

        if (!response.ok) {
            await showError(response.error || "Failed to fetch folders");
            return;
        }
        folders = response.folders;
    } catch (error) {
        await showError(`Failed to fetch folders: ${error.message}`);
        return;
    }

    if (!folders || folders.length === 0) {
        await showError("No existing folders found");
        return;
    }

    // 3. Show folder picker
    const pickerAlert = new Alert();
    pickerAlert.title = "Select Folder";
    pickerAlert.message = `Adding ${photos.length} photo(s)`;

    for (const folder of folders) {
        pickerAlert.addAction(folder.name);
    }
    pickerAlert.addCancelAction("Cancel");

    const selectedIndex = await pickerAlert.present();
    if (selectedIndex === -1) return;

    const selectedFolder = folders[selectedIndex];

    try {
        let uploaded = 0;

        // 4. Upload each photo one at a time
        for (let i = 0; i < photos.length; i++) {
            await notify("Uploading...", `Photo ${i + 1} of ${photos.length}`);

            const payload = buildPhotoPayload(photos[i], i);

            const uploadReq = new Request(`${BASE_API_URL}/upload-photo`);
            uploadReq.method = "POST";
            uploadReq.headers = { "Content-Type": "application/json" };
            uploadReq.body = JSON.stringify({
                folderId: selectedFolder.id,
                sheetId: selectedFolder.sheetId,
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
        const folderUrl = `https://drive.google.com/drive/folders/${selectedFolder.id}`;
        const alert = new Alert();
        alert.title = "Success";
        alert.message = `Added ${uploaded} photos to "${selectedFolder.name}"`;
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

function isAuthError(msg) {
    const authErrors = ["invalid_grant", "token", "unauthorized", "401", "auth"];
    const lower = msg.toLowerCase();
    return authErrors.some(e => lower.includes(e));
}

async function showError(msg) {
    if (isAuthError(msg)) {
        const alert = new Alert();
        alert.title = "Authentication Required";
        alert.message = "Your Google token has expired. Open the auth page to re-authenticate?";
        alert.addAction("Open Auth Page");
        alert.addCancelAction("Cancel");

        const choice = await alert.present();
        if (choice === 0) {
            Safari.open(AUTH_URL);
        }
        return;
    }

    const alert = new Alert();
    alert.title = "Error";
    alert.message = msg;
    alert.addAction("OK");
    await alert.present();
}

await main();
