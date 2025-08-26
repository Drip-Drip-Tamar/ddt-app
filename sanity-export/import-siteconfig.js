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

// Read and parse the siteConfig NDJSON file
const ndjsonPath = path.join(__dirname, 'siteconfig-update.ndjson');
const siteConfigData = fs.readFileSync(ndjsonPath, 'utf8');

try {
    const document = JSON.parse(siteConfigData);
    
    // Use the Sanity client to create or replace the document
    client
        .createOrReplace(document)
        .then((res) => {
            console.log('✅ Site navigation successfully updated!');
            console.log('Document ID:', res._id);
            console.log('\nNavigation now includes:');
            console.log('- Home page link');
            console.log('- About page link');
            console.log('- Log in button');
            console.log('- Sign up button');
            console.log('\nNote: You may need to refresh your browser to see the updated navigation.');
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