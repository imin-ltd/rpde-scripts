/**
 * Instructions for running this script for imin users:
 * https://imin-dev.atlassian.net/wiki/spaces/SEAR/pages/2839183361/Upload-to-DB.
 */
const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');
const pgFormat = require('pg-format');

const fileNameRegex = /rpde-(\d+)\.json$/;

/**
 * @param {string} dirPath
 * @param {string} postgresUser
 * @param {string} postgresPassword
 * @param {string} postgresHost
 * @param {string} postgresDatabase
 */
async function uploadToDb(dirPath, postgresUser, postgresPassword, postgresHost, postgresDatabase) {
  const pgPool = new Pool({
    user: postgresUser,
    password: postgresPassword,
    host: postgresHost,
    database: postgresDatabase,
  });
  try {
    await pgPool.query(`
    CREATE TABLE IF NOT EXISTS rpde_items (
      internal_id SERIAL PRIMARY KEY,
      page INTEGER,
      kind TEXT,
      state TEXT,
      id TEXT,
      modified BIGINT,
      data JSONB
    )
  `);
    await pgPool.query('CREATE INDEX IF NOT EXISTS rpde_items_page_idx ON rpde_items (page)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS rpde_items_kind_idx ON rpde_items (kind)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS rpde_items_state_idx ON rpde_items (state)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS rpde_items_id_idx ON rpde_items (id)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS rpde_items_modified_idx ON rpde_items (modified)');
    console.log('Created table (if it did not already exist)');
    await pgPool.query('TRUNCATE rpde_items');
    console.log('Cleared table');
    const fileNames = await fs.readdir(dirPath);
    fileNames.sort();
    for (const fileName of fileNames) {
      const regexResult = fileNameRegex.exec(fileName);
      if (!regexResult) {
        console.log(`Skipping file: ${fileName} (fails regex)`);
        continue;
      }
      const page = Number(regexResult[1]);
      const filePath = path.join(dirPath, fileName);
      const rawFileData = await fs.readFile(filePath);
      const fileData = JSON.parse(rawFileData.toString());
      if ((fileData.items ?? []).length === 0) {
        console.log(`Skipping file: ${fileName} (no items)`);
        continue;
      }
      const query = pgFormat(`
    
      INSERT INTO rpde_items (page, kind, state, id, modified, data)
      VALUES %L
    
    `, fileData.items.map((item) => [
        page,
        item.kind,
        item.state,
        item.id,
        item.modified,
        item.data
      ]));
      const pgResult = await pgPool.query(query);
      console.log(`${fileName}: Processed ${pgResult.rowCount} rows`);
    }
    console.log('Done');
  } finally {
    await pgPool.end();
  }
}

if (require.main === module) {
  uploadToDb(
    process.env.REL_INPUT_DIR,
    process.env.POSTGRES_USER,
    process.env.POSTGRES_PASSWORD,
    process.env.POSTGRES_HOST,
    process.env.POSTGRES_DATABASE,
  );
}
