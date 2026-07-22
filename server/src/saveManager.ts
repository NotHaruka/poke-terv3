import fs from 'fs';
import path from 'path';
import { PlayerData } from 'poke-ter-shared';

const SAVES_DIR = path.join(process.cwd(), 'data', 'saves');

// Ensure directory exists
if (!fs.existsSync(SAVES_DIR)) {
  fs.mkdirSync(SAVES_DIR, { recursive: true });
}

export function savePlayerData(clientId: string, data: PlayerData): void {
  const filePath = path.join(SAVES_DIR, `${clientId}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`[SaveManager] Failed to save player data for ${clientId}:`, err);
  }
}

export function loadPlayerData(clientId: string): PlayerData | undefined {
  const filePath = path.join(SAVES_DIR, `${clientId}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const dataStr = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(dataStr) as PlayerData;
    }
  } catch (err) {
    console.error(`[SaveManager] Failed to load player data for ${clientId}:`, err);
  }
  return undefined;
}
