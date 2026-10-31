import { getShot } from '@ejm/shots';
import { Fact, Facts } from '@ejm/ui';
import { ProductShot } from '@ejm/ui/layout/ProductShot';

// Real captures for the layout showcase. The interactive demos keep their own simulated views.
// In a stage the windows overlap, so each capture drops its own caption and StageCaptions lists them under the stage.
const cli = getShot('cli', 'tui-read-refused');
const ide = getShot('ide', 'workspace-launch');
const harness = getShot('harness', 'journal');

export const Cli = () => <ProductShot shot={cli} alt="ejm-cli reads a file and refuses a write without a grant." frame caption={false} />;
export const Ide = () => <ProductShot shot={ide} alt="The native ejm-ide project tree, source editor and assistant before a model is connected." caption={false} />;
export const Harness = () => <ProductShot shot={harness} alt="ejm-harness runs an offline replay session and prints the durable journal events." frame caption={false} />;

export const StageCaptions = () => (
  <Facts>
    {[cli, ide, harness].map(s => <Fact key={s.caption} label={s.product}>{s.caption}</Fact>)}
  </Facts>
);
