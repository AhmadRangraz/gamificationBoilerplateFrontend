import { PageHeading, Panel } from '@forge/ui';
import { notFound } from 'next/navigation';
import { AuthForm, type AuthFlow } from '../../../components/auth-form';
import { ui } from '../../../lib/account-copy';

const pages = {
  login: [ui.login, ui.loginDescription],
  register: [ui.register, ui.registerDescription],
  recover: [ui.recover, ui.recoverDescription],
  reset: [ui.reset, ui.resetDescription],
  verify: [ui.verify, ui.verifyDescription],
} satisfies Record<AuthFlow, [string, string]>;

function isFlow(value: string): value is AuthFlow {
  return Object.hasOwn(pages, value);
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ flow: string }>;
}) {
  const { flow } = await params;
  if (!isFlow(flow)) notFound();
  const [title, description] = pages[flow];
  return (
    <div className="auth-wrap">
      <Panel className="auth-card">
        <PageHeading title={title} description={description} />
        {flow !== 'login' && flow !== 'register' && (
          <p className="ui-hint">{ui.mailPreview}</p>
        )}
        <AuthForm key={flow} flow={flow} />
      </Panel>
    </div>
  );
}
