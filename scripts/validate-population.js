/**
 * validate-population.js
 * Validates population-gather.json, splits into clean and exception sets.
 * Writes population-validated.json and population-exceptions.json.
 * Usage: node scripts/validate-population.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');

async function validatePopulation() {
  const gatherData = JSON.parse(
    await fs.readFile(path.join(DATA_DIR, 'population-gather.json'), 'utf8')
  );

  const validated = [];
  const exceptions = [];
  let suspiciousCount = 0;
  const sourceCounts = {};

  for (const record of gatherData) {
    const reasons = [];

    if (record.population === null) {
      reasons.push('Null population');
    } else if (record.population === 0) {
      reasons.push('Zero population');
    } else if (record.population > 15_000_000) {
      reasons.push('Population exceeds 15M — implausible for UK');
    }

    if (record.error !== null) {
      reasons.push(`Error: ${record.error}`);
    }

    if (record.qid_resolved === false) {
      reasons.push('QID unresolved');
    }

    // Suspicious but not hard-exception: City or Town with pop < 500
    const isSuspicious =
      reasons.length === 0 &&
      ['City', 'Town'].includes(record.place_type) &&
      record.population < 500;

    if (reasons.length > 0) {
      exceptions.push({ ...record, exception_reason: reasons.join('; ') });
    } else {
      validated.push(record);
      if (isSuspicious) suspiciousCount++;
      if (record.population_source) {
        sourceCounts[record.population_source] = (sourceCounts[record.population_source] || 0) + 1;
      }
    }
  }

  await fs.writeFile(
    path.join(DATA_DIR, 'population-validated.json'),
    JSON.stringify(validated, null, 2),
    'utf8'
  );

  await fs.writeFile(
    path.join(DATA_DIR, 'population-exceptions.json'),
    JSON.stringify(exceptions, null, 2),
    'utf8'
  );

  console.log(`Validation complete:`);
  console.log(`  Total               : ${gatherData.length}`);
  console.log(`  Validated (clean)   : ${validated.length}`);
  console.log(`  Exceptions          : ${exceptions.length}`);
  console.log(`  Suspicious-but-passed: ${suspiciousCount}`);
  console.log(`\nSource breakdown (validated set):`);
  for (const [source, count] of Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${source.padEnd(40)} ${count}`);
  }
}

validatePopulation().catch(console.error);
