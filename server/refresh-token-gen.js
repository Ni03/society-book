/**
 * One-time script — run with: node refresh-token-gen.js
 * Prints a new GOOGLE_DRIVE_REFRESH_TOKEN to copy into your .env
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
require('dotenv').config();

const CLIENT_ID     = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:3333/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌  GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET must be set in .env');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',          // forces Google to return a new refresh_token
    scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log('\n🔗  Open this URL in your browser and authorize the app:\n');
console.log(authUrl);
console.log('\n⏳  Waiting for the OAuth callback on http://localhost:3333 ...\n');

// Temporary HTTP server to catch the callback
const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);
    if (parsed.pathname !== '/oauth2callback') return;

    const code = parsed.query.code;
    if (!code) {
        res.end('❌ No code found in callback.');
        server.close();
        return;
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);

        res.end(`
            <h2 style="font-family:sans-serif;color:green">✅ Token received! Check your terminal.</h2>
            <p style="font-family:monospace">You can close this tab.</p>
        `);

        console.log('\n✅  New tokens received!\n');
        console.log('──────────────────────────────────────────────────────');
        console.log('Copy this line into your .env file:\n');
        console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('\n──────────────────────────────────────────────────────');
        if (!tokens.refresh_token) {
            console.warn('\n⚠️   No refresh_token in response.');
            console.warn('    Go to https://myaccount.google.com/permissions, revoke access');
            console.warn('    for your app, then run this script again.\n');
        }
    } catch (err) {
        res.end('❌ Error exchanging code: ' + err.message);
        console.error('Error exchanging code:', err.message);
    } finally {
        server.close();
    }
});

server.listen(3333, () => {
    console.log('Server listening on http://localhost:3333');
});
