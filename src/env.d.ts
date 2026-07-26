/// <reference types="astro/client" />
import type { SanityClient } from '@sanity/client';

declare global {
    namespace App {
        interface Locals {
            isPreview: boolean;
            sanityClient: SanityClient;
        }

        interface SessionData {
            sanityPreview: boolean;
        }
    }
}

export {};
