#!/usr/bin/env node
/**
 * Dev-only static file server. Zero dependencies: `node:http` and `node:fs` only.
 *
 * The game is a static site, so this serves the repository root the way a static host would. It
 * exists because the service worker and the install flow both need a real origin and a secure
 * context; opening `index.html` from the filesystem is neither.
 */

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? "127.0.0.1";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
};

/**
 * @param {string} filePath
 * @returns {string} the content type to serve the file with
 */
function contentType(filePath) {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

/**
 * Resolves a request path to a location inside the served root.
 * @param {string} url
 * @returns {string | null} the absolute path, or null when the path escapes the root
 */
function resolveTarget(url) {
  let decoded;
  try {
    decoded = decodeURIComponent(url.split("?")[0].split("#")[0]);
  } catch {
    return null;
  }
  // A leading slash makes the path root-relative, and normalize collapses any `..` segments
  // against it, so a traversal attempt lands inside the root rather than outside it.
  const target = resolve(join(ROOT, normalize(decoded)));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null;
  return target;
}

const server = createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" });
    res.end("Method not allowed");
    return;
  }

  const target = resolveTarget(req.url ?? "/");
  if (target === null) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  let filePath = target;
  try {
    let info = await stat(filePath);
    if (info.isDirectory()) {
      filePath = join(filePath, "index.html");
      info = await stat(filePath);
    }
    res.writeHead(200, {
      "content-type": contentType(filePath),
      "content-length": info.size,
      // The service worker must never be served from a stale cache during development.
      "cache-control": "no-cache",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`1024 game served from ${ROOT}`);
  console.log(`Open http://${HOST}:${PORT}/`);
});
