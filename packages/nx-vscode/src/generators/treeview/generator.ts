import {
  formatFiles,
  generateFiles,
  getProjects,
  joinPathFragments,
  Tree,
  updateJson,
} from '@nx/devkit';
import * as path from 'path';
import { TreeviewGeneratorSchema } from './schema';
import {
  camelize,
  classify,
  dasherize,
} from '@nx/devkit/src/utils/string-utils';
import { tsquery } from '@phenomnomnominal/tsquery';

export async function treeviewGenerator(
  tree: Tree,
  options: TreeviewGeneratorSchema
) {
  const project = getProjects(tree).get(options.project);

  const treeviewNameDasherized = dasherize(options.name);
  const treeviewProvider = `${classify(options.name)}Provider`;

  // GENERATE PROVIDER FILE
  generateFiles(tree, path.join(__dirname, 'files'), project.sourceRoot, {
    ...options,
    treeviewNameDasherized,
    treeviewProvider,
  });

  // UPDATE ACTIVATE
  const activateFilePath = joinPathFragments(
    project.sourceRoot,
    'lib',
    `${dasherize(project.name)}.ts`
  );
  const activateFileContents = tree.read(activateFilePath).toString();

  let newContents = tsquery.replace(
    activateFileContents,
    'FunctionDeclaration[name.text=/activate.*/] > Block',
    (node) => {
      return node
        .getText()
        .replace(
          '}',
          `window.registerTreeDataProvider('${treeviewNameDasherized}', new ${treeviewProvider}())`
        );
    }
  );
  newContents =
    `import { ${treeviewProvider} } from './${treeviewNameDasherized}-provider' \n` +
    newContents;

  newContents = tsquery.replace(
    newContents,
    "ImportDeclaration[moduleSpecifier.text='vscode'] > ImportClause",
    (node) => {
      if (node.getText().includes('window')) {
        return undefined;
      }
      return node.getText().replace('}', ', window }');
    }
  );

  if (newContents !== activateFileContents) {
    tree.write(activateFilePath, newContents);
  }

  // UPDATE PACKAGE.JSON
  updateJson(tree, 'package.json', (packageJson) => {
    const viewContainer =
      packageJson.contributes?.viewsContainers?.activitybar?.find(
        (vc) => vc.id === options.viewContainer
      );
    if (!viewContainer) {
      if (!packageJson.contributes.viewsContainers) {
        packageJson.contributes.viewsContainers = {};
      }
      if (!packageJson.contributes.viewsContainers.activitybar) {
        packageJson.contributes.viewsContainers.activitybar = [];
      }
      packageJson.contributes.viewsContainers.activitybar = [
        ...(packageJson.contributes.viewsContainers.activitybar ?? []),
        {
          id: options.viewContainer,
          title: classify(options.viewContainer),
          icon: 'assets/icon.svg',
        },
      ];
    }
    if (!packageJson.contributes.views) {
      packageJson.contributes.views = {};
    }
    packageJson.contributes.views[options.viewContainer] = [
      ...(packageJson.contributes.views[options.viewContainer] ?? []),
      {
        id: treeviewNameDasherized,
        name: classify(options.name),
      },
    ];
    return packageJson;
  });

  await formatFiles(tree);
}

export default treeviewGenerator;
