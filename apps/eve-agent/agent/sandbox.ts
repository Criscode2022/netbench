import { defineSandbox } from 'eve/sandbox';
import { justbash } from 'eve/sandbox/just-bash';

/** In-process bash for the agent's scratch work; nothing leaves the Eve process. */
export default defineSandbox({
  backend: justbash(),
});
