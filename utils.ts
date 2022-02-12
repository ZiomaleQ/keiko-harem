export const graphql = {
  MEDIA_QUERY: `query ($search: String, $type: MediaType) {
    Media(search: $search, type: $type) {
      idMal
      title { romaji english }
      coverImage { large color }
      description
      bannerImage
      format
      status
      type
      meanScore
      startDate { year month day }
      endDate { year month day }
      duration
      source
      episodes
      chapters
      volumes
      studios { nodes { name } }
      synonyms
      genres
      trailer { id site }
      externalLinks { site url }
      siteUrl
      isAdult
      nextAiringEpisode { episode timeUntilAiring }
    }
  }`
}

export function genRandom(min: number, max: number): number {
  return Math.floor(Math.random() * (+max - +min)) + +min;
}