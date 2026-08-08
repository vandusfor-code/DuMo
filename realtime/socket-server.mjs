import { Server } from "socket.io";
import { sessionFromSocket } from "./session-auth.mjs";

const ADMIN_ROLES = new Set(["administrador", "supervisor"]);

/**
 * @param {import("node:http").Server} httpServer
 */
export function attachSocketServer(httpServer) {
  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  globalThis.__dumoIo = io;

  io.use((socket, next) => {
    const session = sessionFromSocket(socket);
    if (!session?.userId) {
      next(new Error("unauthorized"));
      return;
    }
    socket.data.userId = session.userId;
    socket.data.role = session.role ?? "";
    next();
  });

  io.on("connection", (socket) => {
    const role = socket.data.role;
    const userId = socket.data.userId;

    if (ADMIN_ROLES.has(role)) {
      socket.join("admin:leads");
    }
    if (role === "asesora" && userId) {
      socket.join(`advisor:${userId}`);
    }

    socket.emit("leads:connected", { userId, role });
  });

  console.log("[realtime] Socket.io attached on /socket.io");
  return io;
}
