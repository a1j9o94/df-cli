import index from "./index.html";

const port = Number(process.env.PORT) || 3000;

Bun.serve({
  port,
  routes: {
    "/": index,
  },
  fetch(req) {
    const url = new URL(req.url);
    const filePath = `${import.meta.dir}${url.pathname}`;
    const file = Bun.file(filePath);
    return new Response(file);
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Dark Factory landing page running at http://localhost:${port}`);
