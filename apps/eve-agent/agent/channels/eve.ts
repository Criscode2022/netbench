import { eveChannel } from 'eve/channels/eve';
import { localDev, none } from 'eve/channels/auth';

/**
 * Browser guests on the Angular canvas talk to this channel directly
 * (https://netbench-eve.cristiancode.dev, or local :4010). Health stays public; session routes
 * admit anonymous callers via none() so the drawer can stream without signing in.
 */
export default eveChannel({
  auth: [localDev(), none()],
  cors: true,
});
