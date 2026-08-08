import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { attachSocketServer } from "./realtime/socket-server.mjs";

const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "8080", 10);
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, hostname, port, dir: import.meta.dirname });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer = createServer(async (req, res) => {
  try {
    const parsedUrl = parse(req.url ?? "", true);
    await handle(req, res, parsedUrl);
  } catch (err) {
    console.error("Request error:", err);
    res.statusCode = 500;
    res.end("internal server error");
  }
});

attachSocketServer(httpServer);

httpServer.listen(port, hostname, () => {
  console.log(`> DuMo CRM ready on http://${hostname}:${port} (HTTP + Socket.io)`);
});
