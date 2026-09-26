import { CronJob, CronJobs } from '@confect/server';
import * as Cron from 'effect/Cron';

import refs from './_generated/refs';

export default CronJobs.make().add(
  // 08:00 UTC is 03:00 in Bogotá, when portería is quietest.
  CronJob.make(
    'retention',
    Cron.parseUnsafe('0 8 * * *'),
    refs.internal.retention.run,
    {}
  )
);
