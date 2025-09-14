#!/usr/bin/env node

/**
 * Migration script to move old 'image' field to new 'featuredImage' field for posts
 */

import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  token: process.env.SANITY_TOKEN,
  apiVersion: '2023-01-01',
  useCdn: false
});

async function migratePostImages() {
  console.log('Starting migration of post images...\n');

  try {
    // Fetch all posts with the old 'image' field
    const postsWithOldImage = await client.fetch(`
      *[_type == "post" && defined(image) && !defined(featuredImage)]{
        _id,
        _rev,
        title,
        image
      }
    `);

    if (postsWithOldImage.length === 0) {
      console.log('No posts found with old image field that need migration.');
      return;
    }

    console.log(`Found ${postsWithOldImage.length} post(s) to migrate:\n`);

    for (const post of postsWithOldImage) {
      console.log(`Migrating: ${post.title} (${post._id})`);

      try {
        // Create the new featuredImage structure
        const featuredImage = {
          _type: 'customImage',
          image: post.image,
          alt: post.title // Use title as default alt text
        };

        // Update the document
        await client
          .patch(post._id)
          .set({ featuredImage })
          .unset(['image'])
          .commit();

        console.log(`✓ Successfully migrated ${post.title}\n`);
      } catch (error) {
        console.error(`✗ Failed to migrate ${post.title}:`, error.message);
      }
    }

    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migratePostImages();