import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  GeneratorCallback,
  getProjects,
  joinPathFragments,
  runTasksInSerial,
  Tree,
} from '@nx/devkit';
import {
  camelize,
  classify,
  dasherize,
} from '@nx/devkit/src/utils/string-utils';
import { getNpmScope } from '@nx/js/src/utils/package-json/get-npm-scope';

import * as path from 'path';
import { LibraryGeneratorSchema } from './schema';
import { tsquery } from '@phenomnomnominal/tsquery';
import {
  addTsConfigPath,
  libraryGenerator as jsLibraryGenerator,
} from '@nx/js';
import { Linter } from '@nx/linter';

export async function libraryGenerator(
  tree: Tree,
  options: LibraryGeneratorSchema
) {
  const tasks: GeneratorCallback[] = [];

  // CREATE PROJECT
  const projectRoot = options.directory ?? options.name;

  const npmScope = getNpmScope(tree);
  const importPath = npmScope
    ? `${npmScope === '@' ? '' : '@'}${npmScope}/${options.name}`
    : options.name;

  tasks.push(
    await jsLibraryGenerator(tree, {
      name: options.name,
      buildable: false,
      bundler: 'none',
      directory: options.directory,
      js: false,
      linter: Linter.EsLint,
      unitTestRunner: 'none',
      minimal: true,
      projectNameAndRootFormat: 'as-provided',
      skipFormat: true,
      importPath: importPath,
    })
  );

  const activateFunctionName = `activate${classify(options.name)}`;
  const nameDasherized = dasherize(options.name);
  generateFiles(tree, path.join(__dirname, 'files'), projectRoot, {
    ...options,
    activateFunctionName,
    nameDasherized,
  });

  // // lib generator doesn't do it for me??
  // addTsConfigPath(tree, importPath, [
  //   joinPathFragments(projectRoot, 'src', 'index.ts'),
  // ]);

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
          .replace('}', `${activateFunctionName}(context) }`);
      }
    );

    newContents =
      `import { ${activateFunctionName} } from '${importPath}' \n` +
      newContents;

    if (newContents !== mainFileContents) {
      tree.write(mainFilePath, newContents);
    }
  }

  await formatFiles(tree);
  return runTasksInSerial(...tasks);
}

export default libraryGenerator;
