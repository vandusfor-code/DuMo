import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.vercel.production", "utf8");
const m = env.match(/AUTH_SECRET="([^"]+)"/);
const secret = process.env.AUTH_SECRET || m?.[1];
if (!secret) throw new Error("AUTH_SECRET missing");

function token(userId, role) {
  const payload = { userId, role, exp: Math.floor(Date.now() / 1000) + 3600 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

console.log(JSON.stringify({
  admin: token("usr-1786124747997-nywgyb", "administrador"),
  advisor: token("usr-1786134226280-8zlbo6", "asesora"),
}));
