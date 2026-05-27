import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const JD_DIR = 'career-ops/jds/to_evaluate';
const TRACKER_DIR = 'career-ops/batch/tracker-additions';
const files = readdirSync(JD_DIR).filter(f => f.endsWith('.txt'));

for (const file of files) {
  const jdPath = join(JD_DIR, file);
  console.log(`Evaluating ${jdPath}...`);
  try {
    const output = execSync(`node career-ops/gemini-eval.mjs --file ${jdPath}`).toString();
    console.log(output);

    // Extract tracker entry
    const match = output.match(/\|\s*\d{3}\s*\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|/);
    if (match) {
      const trackerLine = match[0];
      // extract num and company for filename
      const parts = trackerLine.split('|').map(s => s.trim());
      const num = parts[1];
      const company = parts[3].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const tsvPath = join(TRACKER_DIR, `${num}-${company}.tsv`);
      writeFileSync(tsvPath, trackerLine);
      console.log(`Saved tracker entry to ${tsvPath}`);
    } else {
      console.log(`Could not find tracker line in output for ${file}`);
    }
  } catch (error) {
    console.error(`Error evaluating ${file}: ${error.message}`);
    if (error.stdout) console.error(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
  }
}
