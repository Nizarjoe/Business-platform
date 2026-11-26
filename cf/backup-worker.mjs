// F8: scheduled Worker "business-platform-backup". Cron Trigger runs runBackup
// against the same D1 database and a separate KV namespace (BACKUPS).
// Pages projects cannot have Cron Triggers, hence this separate Worker.
import backup from '../backup.js';

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(backup.runBackup(env.DB, env.BACKUPS, 'cron ' + controller.cron).then(r => console.log('backup', r.key, JSON.stringify(r.counts))));
  }
};
