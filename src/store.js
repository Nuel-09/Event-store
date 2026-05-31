import fs from 'fs';
import fsPromises from 'fs/promises';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, '..', 'events.log');

// In-memory index: id → { offset, length }
// offset  = byte position where the JSON line starts in events.log
// length  = byte length of the JSON string (not including the trailing \n)
const index = new Map();

/**
 * Streams events.log on startup, rebuilds the index from byte offsets.
 * Skips gracefully if the file does not exist yet (first boot).
 */
export async function recoverIndex() {
  try {
    await fsPromises.access(LOG_PATH);
  } catch {
    console.log('No events.log found — starting fresh.');
    return;
  }

  let runningOffset = 0;
  let count = 0;

  const fileStream = fs.createReadStream(LOG_PATH, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) {
      // blank line — advance offset by the newline byte and skip
      runningOffset += Buffer.byteLength('\n', 'utf8');
      continue;
    }

    const lineBytes = Buffer.byteLength(line, 'utf8');

    try {
      const event = JSON.parse(line);
      if (event.id) {
        index.set(event.id, { offset: runningOffset, length: lineBytes });
        count++;
      }
    } catch {
      // corrupted line — skip it but still advance the offset
    }

    // +1 for the '\n' that readline strips from each line
    runningOffset += lineBytes + 1;
  }

  console.log(`Recovered ${count} event(s) from events.log`);
}

/**
 * Appends a new event to events.log and updates the in-memory index.
 * Uses fs.stat to get the current file size as the byte offset before writing.
 *
 * @param {object} event - Already-stamped event object (id, createdAt, + original body).
 * @returns {Promise<object>} The event as written.
 */
export async function appendEvent(event) {
  const line = JSON.stringify(event);
  const lineBytes = Buffer.byteLength(line, 'utf8');

  // Determine the current end of file — that is where this entry will land.
  let offset = 0;
  try {
    const stat = await fsPromises.stat(LOG_PATH);
    offset = stat.size;
  } catch {
    // File doesn't exist yet; offset stays 0.
  }

  // Append the JSON line followed by a newline.
  await fsPromises.appendFile(LOG_PATH, line + '\n', 'utf8');

  // Update the index after a successful write.
  index.set(event.id, { offset, length: lineBytes });

  return event;
}

/**
 * Reads a single event from events.log by seeking directly to its byte range.
 * Does NOT scan the file.
 *
 * @param {string} id
 * @returns {Promise<object|null>} Parsed event, or null if not in the index.
 */
export async function readEvent(id) {
  if (!index.has(id)) return null;

  const { offset, length } = index.get(id);
  const buffer = Buffer.alloc(length);

  const fd = await fsPromises.open(LOG_PATH, 'r');
  try {
    await fd.read(buffer, 0, length, offset);
  } finally {
    await fd.close();
  }

  return JSON.parse(buffer.toString('utf8'));
}

/**
 * Returns aggregate stats for the current log.
 *
 * @returns {Promise<{ total: number, bytes: number }>}
 */
export async function getStats() {
  let bytes = 0;
  try {
    const stat = await fsPromises.stat(LOG_PATH);
    bytes = stat.size;
  } catch {
    // File doesn't exist yet.
  }
  return { total: index.size, bytes };
}
