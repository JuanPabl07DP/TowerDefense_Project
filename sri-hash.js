// sri-hash.js
const crypto = require('crypto');
const https = require('https');

const url = 'https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js';

https.get(url, (res) => {
    const chunks = [];

    res.on('data', (chunk) => {
        chunks.push(chunk);
    });

    res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const hash = crypto.createHash('sha384').update(buffer).digest('base64');
        console.log(`integrity="sha384-${hash}"`);
    });
}).on('error', (e) => {
    console.error(e);
});