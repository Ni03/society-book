const { google } = require('googleapis');
const express = require('express');
require('dotenv').config();

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3333/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Please add GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET to your .env file first!');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// We need either 'drive.file' (only files created by this app) or 'drive' (full access).
// 'drive.file' is recommended as it's the safest.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Crucial to get a Refresh Token
    prompt: 'consent',      // Force consent to guarantee we get a refresh token
    scope: SCOPES,
});

const app = express();

app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    if (code) {
        try {
            const { tokens } = await oauth2Client.getToken(code);
            console.log('\n==================================================');
            console.log('✅ SUCCESS! Add this to your .env file:');
            console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
            console.log('==================================================\n');
            console.log('Once added, restart your backend server with `npm run dev`.');
            res.send('<h1>Success! You can close this tab and check your terminal.</h1>');
            
            // Give it a second to send the response before exiting
            setTimeout(() => process.exit(0), 1000);
        } catch (error) {
            console.error('Error retrieving access token', error);
            res.status(500).send('Authentication failed');
        }
    } else {
        res.status(400).send('No code provided');
    }
});

app.listen(3333, () => {
    console.log('\n--- STEPS TO AUTHENTICATE ---');
    console.log('1. Go to your Google Cloud Console > "APIs & Services" > "Credentials".');
    console.log('2. Make sure you added this EXACT Redirect URI to your Web Application Client ID:');
    console.log('   http://localhost:3333/oauth2callback');
    console.log('\n3. Click the link below to authenticate with your Google account:');
    console.log(`\n👉 ${authUrl}\n`);
    console.log('Waiting for you to log in via your browser...');
});
