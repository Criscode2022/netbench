import { disableTool } from 'eve/tools';

/** Eve works on the simulator only. It runs on the owner's Mac, so a public chat must not make it fetch or search the web. */
export default disableTool();
