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
import { addTsConfigPath } from '@nx/js';

export async function libraryGenerator(
  tree: Tree,
  options: LibraryGeneratorSchema
) {
  // CREATE PROJECT
  const projectRoot = options.directory
    ? joinPathFragments(options.directory, options.name)
    : options.name;
  addProjectConfiguration(tree, options.name, {
    root: projectRoot,
    projectType: 'library',
    sourceRoot: `${projectRoot}/src`,
    targets: {},
  });

  const activateFunctionname = `activate${classify(options.name)}`;
  generateFiles(tree, path.join(__dirname, 'files'), projectRoot, {
    ...options,
    registerFunctionName: activateFunctionname,
  });

  const npmScope = getNpmScope(tree);
  const importPath = npmScope
    ? `${npmScope === '@' ? '' : '@'}${npmScope}/${options.name}`
    : options.name;

  console.log(importPath);
  addTsConfigPath(tree, importPath, [
    joinPathFragments(projectRoot, 'src', 'index.ts'),
  ]);

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
