/**
 * Run once to generate VAPID key pair:
 *   node src/generateVapidKeys.js
 *
 * Then copy the printed values into your .env file.
 */
const webPush = require('web-push');
const keys = webPush.generateVAPIDKeys();
console.log('\n✅  VAPID KEY PAIR GENERATED\n');
console.log('Add these to your server .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@societybook.local\n`);
