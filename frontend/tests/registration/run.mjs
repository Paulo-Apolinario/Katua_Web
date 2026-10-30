import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const panel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const server = process.env.KATUA_API_SERVER;
if (!server || !process.env.KATUA_VALIDATION_TOOLS) throw Error('Informe KATUA_API_SERVER e KATUA_VALIDATION_TOOLS.');
// Reuse the API disposable database fixture without changing server source.
const runner = path.join(server, 'tests/field-operations/.registration-run.mjs');
const source = fs.readFileSync(path.join(server, 'tests/field-operations/run.mjs'), 'utf8')
  .replace('"tests/field-operations/browser.mjs"', JSON.stringify(path.join(panel, 'tests/registration/browser.mjs')));
fs.writeFileSync(runner, source);
try {
  const child = spawn(process.execPath, [runner], {cwd:server, env:{...process.env,FIELD_UI:'1',KATUA_PANEL_FRONTEND:panel},stdio:'inherit'});
  process.exitCode = await new Promise(resolve => child.on('exit',resolve));
} finally {fs.unlinkSync(runner);}
