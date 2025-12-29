import { Hono } from "hono";

export const searchRoutes = new Hono();

// GET /api/search/movies - Search for movies (TMDB)
searchRoutes.get("/movies", async (c) => {
	const query = c.req.query("q");
	if (!query) {
		return c.json(
			{ success: false, error: 'Query parameter "q" is required' },
			400,
		);
	}
	// TODO: Implement TMDB search
	return c.json({ data: [], success: true });
});

// GET /api/search/series - Search for series (TVDB)
searchRoutes.get("/series", async (c) => {
	const query = c.req.query("q");
	if (!query) {
		return c.json(
			{ success: false, error: 'Query parameter "q" is required' },
			400,
		);
	}
	// TODO: Implement TVDB search
	return c.json({ data: [], success: true });
});

// GET /api/search/releases/:type/:id - Search for releases on indexers
searchRoutes.get("/releases/:type/:id", async (c) => {
	const type = c.req.param("type");
	const id = c.req.param("id");

	if (type !== "movie" && type !== "episode") {
		return c.json(
			{ success: false, error: 'Type must be "movie" or "episode"' },
			400,
		);
	}

	// TODO: Implement indexer search
	return c.json({ data: [], success: true });
});
