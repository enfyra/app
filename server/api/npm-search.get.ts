import { defineEventHandler, getQuery, createError } from "h3";
import { $fetch } from "ofetch";

interface NpmPackage {
  package: {
    name: string;
    version: string;
    description?: string;
    keywords?: string[];
    links?: {
      npm?: string;
      homepage?: string;
      repository?: string;
    };
    author?: {
      name?: string;
    };
    publisher?: {
      username?: string;
    };
    date?: string;
  };
  score?: {
    final?: number;
    detail?: {
      quality?: number;
      popularity?: number;
      maintenance?: number;
    };
  };
  searchScore?: number;
  flags?: {
    unstable?: boolean;
  };
}

interface NpmSearchResponse {
  objects: NpmPackage[];
  total: number;
  time: string;
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const searchTerm = query.q as string;

  if (!searchTerm || searchTerm.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: "Search term must be at least 2 characters",
    });
  }

  try {
    const response = await $fetch<NpmSearchResponse>(
      `https://registry.npmjs.org/-/v1/search`,
      {
        query: {
          text: searchTerm,
          size: 10,
          quality: 0.5,
          popularity: 0.8,
          maintenance: 0.3,
        },
      }
    );

    const packages = response.objects.map((obj) => ({
      name: obj.package.name,
      version: obj.package.version,
      description: obj.package.description || "",
      keywords: obj.package.keywords || [],
      author: obj.package.author?.name || obj.package.publisher?.username || "Unknown",
      date: obj.package.date,
      score: obj.score?.final || 0,
      popularity: obj.score?.detail?.popularity || 0,
      quality: obj.score?.detail?.quality || 0,
      maintenance: obj.score?.detail?.maintenance || 0,
      searchScore: obj.searchScore || 0,
      links: {
        npm: `https://www.npmjs.com/package/${obj.package.name}`,
        homepage: obj.package.links?.homepage,
        repository: obj.package.links?.repository,
      },
    }));

    packages.sort((a, b) => {
      const scoreA = a.searchScore * 0.7 + a.score * 0.3;
      const scoreB = b.searchScore * 0.7 + b.score * 0.3;
      return scoreB - scoreA;
    });

    return {
      success: true,
      data: packages,
      total: response.total,
    };
  } catch (error: any) {
    console.error("NPM search error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Failed to search NPM packages",
    });
  }
});