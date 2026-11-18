import 'reflect-metadata';
import { attachWs, createApp } from './create-app.ts';
import { getPool, initDb } from './db.ts';

const port = Number(process.env.PORT || 3001);
// A host that proxies to a local port (the hosting platform on the Mac) sets HOST=127.0.0.1; containers need 0.0.0.0.
const host = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  await initDb();
  const app = await createApp();
  attachWs(app);
  await app.listen(port, host);
  console.log(
    `NetBench API listening on ${host}:${port} (long-running Node, not a 10s serverless timeout)${getPool() ? ' [postgres]' : ' [memory store]'}`,
  );
}

void bootstrap();
