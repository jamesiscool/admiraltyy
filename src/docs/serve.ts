const server = Bun.serve({
	port: 3001,
	async fetch(req) {
		const url = new URL(req.url);
		const path = url.pathname === "/" ? "/index.html" : url.pathname;
		const file = Bun.file(`${import.meta.dirname}${path}`);

		if (await file.exists()) {
			return new Response(file);
		}
		return new Response("Not found", { status: 404 });
	},
});

console.log(`Docs: http://localhost:${server.port}`);

