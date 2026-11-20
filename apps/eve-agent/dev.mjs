/**
 * Local Eve: the same local models as production (Bionic, then Ollama) and a local Nest on :3001.
 * Listens on 4010 (Angular proxy / documented port), not eve's bare default 2000.
 */
import { checkEngines, loadEveEnv, run } from './cli-env.mjs';

loadEveEnv();
await checkEngines();

const code = await run('npx', ['eve', 'dev', '--host', '127.0.0.1', '--port', '4010', '--no-ui']);
process.exit(code);
