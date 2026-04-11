export interface Snippet {
  label: string;
  language: string;
  code: string;
}

export function getSnippets(preset: string): Snippet[] {
  return [
    {
      label: 'HTML',
      language: 'html',
      code: `<script src="https://cdn.self.xyz/widget/self-verify.js"><\/script>

<self-verify
  app-name="My App"
  app-scope="my-app-id"
  app-endpoint="https://verify.self.xyz"
  preset="${preset}"
></self-verify>

<script>
  document.querySelector('self-verify')
    .addEventListener('self:success', (e) => {
      console.log('Verified:', e.detail);
    });
<\/script>`,
    },
    {
      label: 'React',
      language: 'tsx',
      code: `import { SelfVerify } from '@selfxyz/react';

function App() {
  return (
    <SelfVerify
      appName="My App"
      appScope="my-app-id"
      appEndpoint="https://verify.self.xyz"
      preset="${preset}"
      onSuccess={(detail) => console.log('Verified:', detail.claims)}
      onError={(detail) => console.error('Failed:', detail.reason)}
    />
  );
}`,
    },
  ];
}
