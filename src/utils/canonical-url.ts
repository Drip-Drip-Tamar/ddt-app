/** Use one query-free URL for metadata and sitemap entries. */
export function canonicalUrl(url: URL, site?: URL): string {
    const pathname = '/' + url.pathname.replace(/^\/+|\/+$/g, '');
    return new URL(pathname, site ?? url.origin).href;
}
