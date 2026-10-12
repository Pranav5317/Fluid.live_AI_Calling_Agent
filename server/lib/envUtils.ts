import fs from 'fs';
import path from 'path';

/**
 * Safely updates or appends key-value pairs in the project's .env file.
 */
export function updateEnvVariables(updates: Record<string, string>): void {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    }

    const lines = content.split('\n');
    const remainingKeys = new Set(Object.keys(updates));

    const updatedLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        if (remainingKeys.has(key)) {
          const val = updates[key];
          remainingKeys.delete(key);
          return `${key}="${val}"`;
        }
      }
      return line;
    });

    for (const key of remainingKeys) {
      updatedLines.push(`${key}="${updates[key]}"`);
    }

    fs.writeFileSync(envPath, updatedLines.join('\n'), 'utf8');
  } catch (err: any) {
    console.error('[envUtils] Failed to update .env file:', err?.message);
  }
}

