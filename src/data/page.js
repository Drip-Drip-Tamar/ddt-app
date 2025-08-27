import { client } from '@utils/sanity-client';
import { SECTIONS } from './blocks';

const PAGE_QUERY_OBJ = `{
  _id,
  slug,
  title,
  metaTitle,
  metaDescription,
  "socialImage": {
    "src": socialImage.asset->url
  },
  sections[] ${SECTIONS}
}`;

export async function fetchData() {
    return await client.fetch(`*[_type == "page"] ${PAGE_QUERY_OBJ}`);
}

export async function getPageById(id) {
    return await client.fetch(`*[_type == "page" && _id == "${id}"] ${PAGE_QUERY_OBJ}`);
}

export async function getPageBySlug(slug) {
    const query = slug 
        ? `*[_type == "page" && slug.current == "${slug}"] ${PAGE_QUERY_OBJ}`
        : `*[_type == "page" && slug.current == "/"] ${PAGE_QUERY_OBJ}`;
    return await client.fetch(query);
}
