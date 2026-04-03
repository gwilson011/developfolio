// BonVoyageUploader.js
// Scriptable script for iOS to upload photos to Bon Voyage

// Configuration - Update this to your deployed URL
const API_URL = "https://gracewilson.info/api/drive/upload";

async function main() {
    // 1. Prompt for folder name
    const folderAlert = new Alert();
    folderAlert.title = "New Trip";
    folderAlert.message = "Enter the trip/folder name:";
    folderAlert.addTextField("e.g., Split Croatia");
    folderAlert.addAction("Next");
    folderAlert.addCancelAction("Cancel");

    const folderResult = await folderAlert.present();
    if (folderResult === -1) return;

    const folderName = folderAlert.textFieldValue(0);
    if (!folderName || !folderName.trim()) {
        await showError("Folder name is required");
        return;
    }

    // 2. Prompt for trip notes
    const notesAlert = new Alert();
    notesAlert.title = "Trip Notes";
    notesAlert.message = "Enter a subtitle/description (optional):";
    notesAlert.addTextField("e.g., Summer 2024");
    notesAlert.addAction("Next");
    notesAlert.addCancelAction("Cancel");

    const notesResult = await notesAlert.present();
    if (notesResult === -1) return;

    const tripNotes = notesAlert.textFieldValue(0) || "";

    // 3. Get photos from Share Sheet
    const photos = args.images;

    if (!photos || photos.length === 0) {
        await showError("No photos shared. Select photos in Photos app, tap Share, then run this script.");
        return;
    }

    // Show progress
    const progressNotification = new Notification();
    progressNotification.title = "Uploading...";
    progressNotification.body = `Processing ${photos.length} photos`;
    await progressNotification.schedule();

    // 4. Convert photos to base64
    const photoData = [];
    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const data = Data.fromJPEG(photo, 0.8);
        const base64 = data.toBase64String();

        photoData.push({
            filename: `IMG_${String(i + 1).padStart(4, "0")}.jpg`,
            data: base64,
        });
    }

    // 5. POST to API
    const request = new Request(API_URL);
    request.method = "POST";
    request.headers = {
        "Content-Type": "application/json",
    };
    request.body = JSON.stringify({
        folderName: folderName.trim(),
        tripNotes: tripNotes.trim(),
        photos: photoData,
    });
    request.timeoutInterval = 300; // 5 minutes for large uploads

    try {
        const responseText = await request.loadString();
        let response;
        try {
            response = JSON.parse(responseText);
        } catch {
            await showError(`Invalid response: ${responseText.substring(0, 200)}`);
            return;
        }

        if (response.ok) {
            const successAlert = new Alert();
            successAlert.title = "Success!";
            successAlert.message = `Uploaded ${response.data.photosUploaded} photos to "${folderName}"`;
            successAlert.addAction("Open Folder");
            successAlert.addAction("Done");

            const action = await successAlert.present();
            if (action === 0) {
                Safari.open(response.data.folderUrl);
            }
        } else {
            await showError(response.error || "Upload failed");
        }
    } catch (error) {
        await showError(`Request failed: ${error.message}`);
    }
}

async function showError(message) {
    const alert = new Alert();
    alert.title = "Error";
    alert.message = message;
    alert.addAction("OK");
    await alert.present();
}

await main();
