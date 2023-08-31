import {
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  installPackagesTask,
  readProjectConfiguration,
  Tree,
  updateJson,
  updateProjectConfiguration,
} from '@nx/devkit';
import * as path from 'path';
import { PresetGeneratorSchema } from './schema';
import { applicationGenerator as nodeAppGenerator } from '@nx/node';

const vscodeVersion = '1.81.0';

export async function presetGenerator(
  tree: Tree,
  options: PresetGeneratorSchema
) {
  // GENERATE NX STUFF
  await nodeAppGenerator(tree, {
    name: options.name,
    framework: 'none',
    rootProject: true,
    bundler: 'esbuild',
    e2eTestRunner: 'none',
    unitTestRunner: 'none',
  });

  const generatedProjectConfig = readProjectConfiguration(tree, options.name);
  generatedProjectConfig.targets.build.options = {
    ...generatedProjectConfig.targets.build.options,
    external: ['vscode'],
    bundle: true,
    generatePackageJson: false,
  };
  updateProjectConfiguration(tree, options.name, generatedProjectConfig);

  // UPDATE FILES
  generateFiles(tree, path.join(__dirname, 'files'), './', options);

  tree.write(
    'src/main.ts',
    `
    import { ExtensionContext, commands, window } from 'vscode';

    export async function activate(context: ExtensionContext) {
      commands.registerCommand("${options.name}.helloWorld", () =>
    window.showInformationMessage("Hello from ${options.name}")
  );
    }
  `
  );

  // UPDATE PACKAGE.JSON
  addDependenciesToPackageJson(
    tree,
    {},
    {
      '@types/vscode': vscodeVersion,
    }
  );
  updateJson(tree, 'package.json', (packageJson) => {
    return {
      ...packageJson,
      activationEvents: ['onStartupFinished'],
      engines: {
        vscode: `^${vscodeVersion}`,
      },
      main: 'main.js',
      contributes: {
        commands: [
          {
            command: `${options.name}.helloWorld`,
            title: `Hello World from ${options.name}`,
          },
        ],
      },
    };
  });
  await formatFiles(tree);
  return () => {
    installPackagesTask(tree);
  };
}

export default presetGenerator;
