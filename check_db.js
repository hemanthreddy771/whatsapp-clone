const https = require('https');

const projectId = 'whatsapp-clone-7c929';
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`;

https.get(url, (res) => {
    console.log('Status Code:', res.statusCode);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response body:', data);
    });
}).on('error', (err) => {
    console.log('Error:', err.message);
});
