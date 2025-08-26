const path = require('path');
const fs = require('fs');
const { createClient } = require('@sanity/client');
require('dotenv').config();

const projectId = process.env.SANITY_PROJECT_ID || 'i1ywpsq5';

if (!projectId || !process.env.SANITY_TOKEN) {
    console.error('Missing required environment variables: SANITY_PROJECT_ID and/or SANITY_TOKEN');
    console.error('Please ensure your .env file contains these values');
    process.exit(1);
}

const client = createClient({
    projectId: projectId,
    dataset: process.env.SANITY_DATASET || 'production',
    token: process.env.SANITY_TOKEN,
    apiVersion: '2024-01-31',
    useCdn: false
});

// Read and parse the About page NDJSON file
const ndjsonPath = path.join(__dirname, 'about-page.ndjson');
const aboutPageData = fs.readFileSync(ndjsonPath, 'utf8');

try {
    const document = JSON.parse(aboutPageData);
    
    // Use the Sanity client to create or replace the document
    client
        .createOrReplace(document)
        .then((res) => {
            console.log('✅ About page successfully imported to Sanity!');
            console.log('Document ID:', res._id);
            console.log('\nThe About page is now available at:');
            console.log('- Development: http://localhost:3000/about');
            console.log('- Sanity Studio: http://localhost:3333');
            console.log('\nNote: You may need to restart the dev server to see the new page.');
        })
        .catch((err) => {
            console.error('❌ Import failed:', err.message);
            if (err.response) {
                console.error('API Response:', err.response.body);
            }
        });
} catch (parseError) {
    console.error('❌ Failed to parse NDJSON file:', parseError.message);
}