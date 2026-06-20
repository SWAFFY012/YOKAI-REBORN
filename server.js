const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = 4173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

http.createServer((request, response) => {
  const pathname = decodeURIComponent(request.url.split("?")[0]);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": types[extension] || "application/octet-stream",
      "Cache-Control": [".html", ".css", ".js"].includes(extension) ? "no-cache" : "public, max-age=3600",
      "Content-Length": stat.size,
    };
    const range = request.headers.range;

    if (extension === ".mp4") headers["Accept-Ranges"] = "bytes";

    if (extension === ".mp4" && range) {
      const match = range.match(/^bytes=(\d*)-(\d*)$/);
      const start = match?.[1] ? Number(match[1]) : 0;
      const end = match?.[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;

      if (!match || start > end || start >= stat.size) {
        response.writeHead(416, { "Content-Range": `bytes */${stat.size}` }).end();
        return;
      }

      response.writeHead(206, {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Content-Length": end - start + 1,
      });
      if (request.method === "HEAD") response.end();
      else fs.createReadStream(filePath, { start, end }).pipe(response);
      return;
    }

    response.writeHead(200, headers);
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    fs.createReadStream(filePath).pipe(response);
  });
}).listen(port, "0.0.0.0");

console.log(`Yokai Reborn: http://127.0.0.1:${port}`);
