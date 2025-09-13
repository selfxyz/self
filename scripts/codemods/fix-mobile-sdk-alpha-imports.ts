import type { API, FileInfo, JSCodeshift } from 'jscodeshift';

export default function transform(file: FileInfo, api: API) {
  const j: JSCodeshift = api.jscodeshift;
  const root = j(file.source);

  root
    .find(j.ImportDeclaration, {
      source: { value: '@selfxyz/mobile-sdk-alpha/src/processing/generate-disclosure-inputs' },
    })
    .forEach(path => {
      path.value.source.value = '@selfxyz/mobile-sdk-alpha';
      const spec = path.value.specifiers?.[0];
      if (spec && spec.type === 'ImportDefaultSpecifier') {
        spec.type = 'ImportSpecifier';
        spec.imported = j.identifier('generateTeeInputsDisclose');
        spec.local = j.identifier('generateTeeInputsDisclose');
      }
    });

  return root.toSource();
}
