// Deterministic dashboard deployment artifact; never incorporates env or secrets.
import{readFile,writeFile,mkdir}from'node:fs/promises';import{createHash}from'node:crypto';
const core=await readFile('supabase/functions/_shared/notification-delivery.js','utf8'),entry=await readFile('supabase/functions/notifications/index.ts','utf8');
const source=entry.replace("import {dispatchNotifications,NOTIFICATION_COPY,notificationInput} from '../_shared/notification-delivery.js';",core);
await mkdir('.local/notifications-mvp',{recursive:true});await writeFile('.local/notifications-mvp/edge-bundle.ts',source);console.log('Notifications Edge source SHA256: '+createHash('sha256').update(source).digest('hex'));
