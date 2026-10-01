// Manual sync: `npm run sync` (full) or `npm run sync -- --live` (live scores only).
import { fullSync, pollLiveScores } from "../src/lib/sync";
import { prisma } from "../src/lib/db";

const live = process.argv.includes("--live");
(live ? pollLiveScores() : fullSync())
  .then((r) => console.log(JSON.stringify(r, null, 2)))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit();
  });
