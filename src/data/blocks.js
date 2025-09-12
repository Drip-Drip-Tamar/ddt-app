export const IMAGE = `
  {
    "_id": image.asset->_id,
    "asset": image.asset,
    "dimensions": image.asset->metadata.dimensions,
    "alt": alt,
    "hotspot": image.hotspot,
    "crop": image.crop
  }
`;

export const SECTIONS = `{
  ...,
  backgroundImage {
    ...,
    "image": {
      "_id": image.asset->_id,
      "asset": image.asset,
      "dimensions": image.asset->metadata.dimensions,
      "hotspot": image.hotspot,
      "crop": image.crop
    }
  },
  _type == "cardsSection" => {
    items[] {
      ...,
      image ${IMAGE}
    }
  },
  _type == "logosSection" => {
    items[] ${IMAGE}
  },
  _type == "testimonialsSection" => {
    items[] {
        ...,
        author-> {
            _type,
            _id,
            name,
            title,
            image ${IMAGE},
            company-> {
                _type,
                _id,
                name,
                logo ${IMAGE}
            }
        }
    }
  },
}`;
