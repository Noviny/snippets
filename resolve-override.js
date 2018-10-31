// // @flow

/*
An explanation:

When running babel-node in the repository, we need to be able to override
the path resolution for atlaskit modules - most specifically so that the
`atlaskit:src` field is resolved before main.

Currently this is used in the css-packs.

Because of where and how it is run, we are modifying a method in the `module`
package, which is definitely not best practice.
*/

// $FlowFixMe - flow doesn't know module ¯\_(ツ)_/¯
const modulePkg = require('module');
const path = require('path');
const fs = require('fs');

const originalResolveFileName = modulePkg._resolveFilename;
const packagesPath = path.resolve(__dirname, 'packages');
// TODO - we are only looking at the packages/ directory.
// We should be resolving everything in bolt workspaces, not just packages
const packages = fs
  .readdirSync(packagesPath)
  .map(team => {
    const teamPath = path.resolve(packagesPath, team);
    return fs.readdirSync(teamPath).map(pkg => {
      // TODO - check that this is a folder, not just it's not .gitkeep
      if (pkg === '.gitkeep') return null;
      const pkgPath = path.resolve(teamPath, pkg);
      /* eslint-disable */
      // $FlowFixMe
      const pkgJSON = require(path.resolve(pkgPath, 'package.json'));
      /* eslint-enable */
      return { name: pkgJSON.name, pkgPath, main: pkgJSON['atlaskit:src'] };
    });
  })
  .reduce((a, t) => a.concat(t))
  .filter(a => a);

modulePkg._resolveFilename = (request, parent, isMain, options) => {
  if (request.includes('@atlaskit/')) {
    // $FlowFixMe filter fixed this
    const foundModule = packages.find(pkg => pkg.name === request);
    // TODO - for things such as icon, this needs to reach in and
    if (foundModule && foundModule.main) {
      /* eslint-disable */
      // $FlowFixMe
      return path.resolve(foundModule.pkgPath, foundModule.main);
      /* eslint-enable */
    }
  }
  return originalResolveFileName(request, parent, isMain, options);
};
