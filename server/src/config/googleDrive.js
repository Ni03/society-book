const { google } = require('googleapis');
const streamifier = require('streamifier');
require('dotenv').config();

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

let drive;

const getDriveService = () => {
    if (!drive) {
        if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
            console.error('Missing Google Drive OAuth credentials in .env.');
            return null;
        }

        try {
            const oauth2Client = new google.auth.OAuth2(
                CLIENT_ID,
                CLIENT_SECRET,
                'http://localhost:3333/oauth2callback'
            );

            oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
            drive = google.drive({ version: 'v3', auth: oauth2Client });
        } catch (error) {
            console.error('Error initializing Google Drive service:', error);
            return null;
        }
    }
    return drive;
};

const uploadFileToGoogleDrive = async (fileObject, filename) => {
    const driveService = getDriveService();
    if (!driveService) throw new Error('Google Drive service not initialized.');
    
    // Clean up filename
    const cleanFilename = filename.replace(/\s+/g, '_');

    const fileMetadata = {
        name: cleanFilename,
        parents: FOLDER_ID ? [FOLDER_ID] : undefined,
    };

    const media = {
        mimeType: fileObject.mimetype,
        body: streamifier.createReadStream(fileObject.buffer),
    };

    try {
        const response = await driveService.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });
        
        // Share publicly with 'anyone'
        await driveService.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        return response.data.webViewLink;
    } catch (error) {
        console.error('Error uploading file to Google Drive:', error);
        throw error;
    }
};

module.exports = { uploadFileToGoogleDrive };
