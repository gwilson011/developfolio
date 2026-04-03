// BonVoyageAddPhotos.js
// Scriptable script for iOS to add photos to an existing Bon Voyage folder
// Usage: Select photos in Photos app, tap Share, run this script

const API_BASE = "https://gracewilson.info";

async function main() {
    // 1. Get photos from Share Sheet
    const photos = args.images;

    if (!photos || photos.length === 0) {
        await showError("No photos shared. Select photos in Photos app, tap Share, then run this script.");
        return;
    }

    // 2. Fetch existing folders (using lightweight endpoint)
    const foldersRequest = new Request(`${API_BASE}/api/drive/upload`);
    let folders;

    try {
        const responseText = await foldersRequest.loadString();
        let response;
        try {
            response = JSON.parse(responseText);
        } catch {
            await showError(`Invalid response: ${responseText.substring(0, 200)}`);
            return;
        }
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

    // 4. Show progress
    const progressNotification = new Notification();
    progressNotification.title = "Uploading...";
    progressNotification.body = `Adding ${photos.length} photos to "${selectedFolder.name}"`;
    await progressNotification.schedule();

    // 5. Convert photos to base64
    const photoData = [];
    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const data = Data.fromJPEG(photo, 0.8);
        const base64 = data.toBase64String();

        // Use timestamp to avoid filename collisions
        const timestamp = Date.now();
        photoData.push({
            filename: `IMG_${timestamp}_${String(i + 1).padStart(4, "0")}.jpg`,
            data: base64,
        });
    }

    // 6. POST to API
    const uploadRequest = new Request(`${API_BASE}/api/drive/upload`);
    uploadRequest.method = "POST";
    uploadRequest.headers = {
        "Content-Type": "application/json",
    };
    uploadRequest.body = JSON.stringify({
        folderId: selectedFolder.id,
        photos: photoData,
    });
    uploadRequest.timeoutInterval = 300;

    try {
        const responseText = await uploadRequest.loadString();
        let response;
        try {
            response = JSON.parse(responseText);
        } catch {
            await showError(`Invalid upload response: ${responseText.substring(0, 200)}`);
            return;
        }

        if (response.ok) {
            const successAlert = new Alert();
            successAlert.title = "Success!";
            successAlert.message = `Added ${response.data.photosUploaded} photos to "${selectedFolder.name}"`;
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
