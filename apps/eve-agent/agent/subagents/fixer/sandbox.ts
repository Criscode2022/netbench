import { defineSandbox } from 'eve/sandbox';
import { justbash } from 'eve/sandbox/just-bash';

/**
 * Pinned to the in-process just-bash. Without this file a subagent gets eve's default backend, which picks Docker when
 * a daemon is reachable and pulls a sandbox image: on the M6 that meant a container per build.
 */
export default defineSandbox({
  backend: justbash(),
});
