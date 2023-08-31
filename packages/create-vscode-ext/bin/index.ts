#!/usr/bin/env node
import { createWorkspace } from 'create-nx-workspace';
import { prompt } from 'enquirer';

import yargs = require('yargs');

async function main() {
  const parsedArgs = yargs(process.argv.slice(2))
    .options({
      name: { type: 'string' },
    })
    .option('defaultBase', {
      defaultDescription: 'main',
      describe: `Default base to use for new projects`,
      type: 'string',
    })
    .option('skipGit', {
      describe: `Skip initializing a git repository`,
      type: 'boolean',
      default: false,
      alias: 'g',
    })
    .option('commit.name', {
      describe: `Name of the committer`,
      type: 'string',
    })
    .option('commit.email', {
      describe: `E-mail of the committer`,
      type: 'string',
    })
    .option('commit.message', {
      describe: `Commit message`,
      type: 'string',
      default: 'Initial commit',
    })
    .parseSync();

  let name = parsedArgs.name;
  if (!name) {
    name = (
      await prompt<{ name: string }>({
        type: 'input',
        name: 'name',
        message: 'What should be the name of the extension?',
        initial: 'my-vscode-extension',
        validate(value) {
          if (value.length === 0) return `Please specify a name!`;
          return true;
        },
      })
    ).name;
  }

  console.log(`Creating the workspace: ${name}`);

  // This assumes "nx-vscode" and "create-vscode-ext" are at the same version
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const presetVersion = require('../package.json').version;

  // TODO: update below to customize the workspace
  const { directory } = await createWorkspace(`nx-vscode@${presetVersion}`, {
    ...parsedArgs,
    name,
    nxCloud: false,
    packageManager: 'npm',
  });

  console.log(`Successfully created the workspace: ${directory}.`);
}

main();
