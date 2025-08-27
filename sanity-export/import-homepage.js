#!/usr/bin/env node

/**
 * Import homepage content to Sanity
 * 
 * Usage: node sanity-export/import-homepage.js
 */

import { config } from 'dotenv';
import { createClient } from '@sanity/client';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config();

const client = createClient({
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET || 'production',
    token: process.env.SANITY_TOKEN,
    apiVersion: '2024-01-01',
    useCdn: false
});

async function importHomepage() {
    try {
        console.log('🚀 Starting homepage import...');
        console.log(`📍 Project: ${process.env.SANITY_PROJECT_ID}`);
        console.log(`📍 Dataset: ${process.env.SANITY_DATASET || 'production'}`);
        
        // Read the homepage NDJSON file
        const filePath = path.join(__dirname, 'homepage.ndjson');
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const homepage = JSON.parse(fileContent);
        
        console.log('\n📄 Processing homepage document...');
        
        // Check if homepage already exists
        const existingPage = await client.fetch(
            `*[_type == "page" && slug.current == "/"][0]._id`
        );
        
        if (existingPage) {
            console.log(`📝 Updating existing homepage (ID: ${existingPage})`);
            
            // Update the existing homepage
            const result = await client
                .patch(existingPage)
                .set({
                    title: homepage.title,
                    metaTitle: homepage.metaTitle,
                    metaDescription: homepage.metaDescription,
                    sections: homepage.sections
                })
                .commit();
                
            console.log('✅ Homepage updated successfully!');
            console.log(`   Document ID: ${result._id}`);
        } else {
            console.log('📝 Creating new homepage...');
            
            // Create new homepage
            const result = await client.create(homepage);
            
            console.log('✅ Homepage created successfully!');
            console.log(`   Document ID: ${result._id}`);
        }
        
        console.log('\n🎉 Import completed successfully!');
        console.log('🌐 View your updated homepage at: http://localhost:3000/');
        console.log('📝 Edit in Sanity Studio at: http://localhost:3333/');
        
    } catch (error) {
        console.error('\n❌ Import failed:', error.message);
        if (error.details) {
            console.error('Details:', error.details);
        }
        process.exit(1);
    }
}

// Run the import
importHomepage();