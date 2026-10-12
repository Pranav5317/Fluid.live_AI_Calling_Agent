import { db } from '../server/db';

async function main() {
  const version = await db.agentVersion.findFirst();
  console.log("AGENT VERSION CONFIG:", JSON.stringify(version?.config, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
