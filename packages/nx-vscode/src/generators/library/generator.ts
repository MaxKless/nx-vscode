import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  getProjects,
  joinPathFragments,
  Tree,
} from '@nx/devkit';
import { camelize, classify } from '@nx/devkit/src/utils/string-utils';
import { getNpmScope } from '@nx/js/src/utils/package-json/get-npm-scope';

import * as path from 'path';
import { LibraryGeneratorSchema } from './schema';
import { tsquery } from '@phenomnomnominal/tsquery';
import { libraryGenerator as jsLibraryGenerator } from '@nx/js';
import { Linter } from '@nx/linter';

export async function libraryGenerator(
  tree: Tree,
  options: LibraryGeneratorSchema
) {
  // CREATE PROJECT
  const projectRoot = options.directory ?? options.name;

  const npmScope = getNpmScope(tree);
  const importPath = npmScope
    ? `${npmScope === '@' ? '' : '@'}${npmScope}/${options.name}`
    : options.name;

  jsLibraryGenerator(tree, {
    name: options.name,
    buildable: false,
    directory: options.directory,
    js: false,
    linter: Linter.EsLint,
    unitTestRunner: 'none',
    minimal: true,
    projectNameAndRootFormat: 'as-provided',
    skipFormat: true,
  });

  const activateFunctionname = `activate${classify(options.name)}`;
  generateFiles(tree, path.join(__dirname, 'files'), projectRoot, {
    ...options,
    registerFunctionName: activateFunctionname,
  });

  // UPDATE ACTIVATE
  if (options.extensionProject) {
    const extensionRoot = getProjects(tree).get(options.extensionProject).root;
    const mainFilePath = joinPathFragments(extensionRoot, 'src', 'main.ts');
    const mainFileContents = tree.read(mainFilePath).toString();

    let newContents = tsquery.replace(
      mainFileContents,
      'FunctionDeclaration[name.text="activate"] > Block',
      (node) => {
        return node
          .getText()
          .replace('}', `${activateFunctionname}(context) }`);
      }
    );

    newContents =
      `import { ${activateFunctionname} } from '${importPath}' \n` +
      newContents;

    if (newContents !== mainFileContents) {
      tree.write(mainFilePath, newContents);
    }
  }

  await formatFiles(tree);
}

export default libraryGenerator;
