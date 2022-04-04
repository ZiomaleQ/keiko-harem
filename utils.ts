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
  }`,
};

export function genRandom(min: number, max: number): number {
  return Math.floor(Math.random() * (+max - +min)) + +min;
}

export function chunk<T>(arr: T[], n: number): T[][] {
  if (!arr.length) {
    return [];
  }
  return [arr.slice(0, n)].concat(chunk(arr.slice(n), n));
}

export function wrap(str: string, length: number): string[] {
  return str.replace(
    new RegExp(`(?![^\\n]{1,${length}}$)([^\\n]{1,${length}})\\s`, "g"),
    "$1\n",
  ).split("\n");
}
