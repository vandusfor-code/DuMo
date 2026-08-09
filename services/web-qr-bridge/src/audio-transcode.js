import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function normalizeMime(rawMime) {
  return String(rawMime ?? "")
    .trim()
    .toLowerCase()
    .split(";")[0]
    .trim();
}

/** WhatsApp Web solo entrega bien notas de voz en OGG/Opus; WebM del navegador se transcodifica. */
export async function prepareWhatsAppAudio(buffer, mimeType, wantPtt = true) {
  const base = normalizeMime(mimeType);

  if (base === "audio/ogg" || base === "audio/opus") {
    return {
      buffer,
      mimeType: wantPtt ? "audio/ogg; codecs=opus" : "audio/ogg",
      ptt: wantPtt,
    };
  }

  if (base === "audio/mpeg" || base === "audio/mp3") {
    return { buffer, mimeType: "audio/mpeg", ptt: false };
  }

  if (base !== "audio/webm") {
    throw new Error(`Formato de audio no compatible para envío (${mimeType || "desconocido"}).`);
  }

  const id = randomBytes(8).toString("hex");
  const inPath = path.join(os.tmpdir(), `wa-in-${id}.webm`);
  const outPath = path.join(os.tmpdir(), `wa-out-${id}.ogg`);

  try {
    await fs.writeFile(inPath, buffer);
    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-i",
        inPath,
        "-c:a",
        "libopus",
        "-b:a",
        "32k",
        "-application",
        "voip",
        "-f",
        "ogg",
        outPath,
      ],
      { timeout: 60_000 },
    );
    const ogg = await fs.readFile(outPath);
    if (!ogg.length) {
      throw new Error("La conversión de audio produjo un archivo vacío.");
    }
    return {
      buffer: ogg,
      mimeType: "audio/ogg; codecs=opus",
      ptt: true,
    };
  } catch (err) {
    const hint =
      err instanceof Error && /ENOENT.*ffmpeg/i.test(err.message)
        ? " ffmpeg no está instalado en el bridge."
        : "";
    throw new Error(
      `No se pudo convertir el audio grabado para WhatsApp.${hint} Usa un archivo OGG/MP3 adjunto.`,
    );
  } finally {
    await fs.unlink(inPath).catch(() => {});
    await fs.unlink(outPath).catch(() => {});
  }
}
