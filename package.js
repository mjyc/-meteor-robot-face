Package.describe({
  name: 'simple-face',
  version: '0.0.1',
  summary: 'Meteor package providing a simple face React component.',
  git: 'https://gitlab.cs.washington.edu/mjyc/simple-face',
  documentation: 'README.md'
});

Npm.depends({
  'loglevel': '1.6.0',
  'react': '16.1.1'
});

Package.onUse(function(api) {
  api.versionsFrom('1.6');
  api.use('ecmascript');
  api.use('mongo');
  api.use('matb33:collection-hooks@0.8.4');
  api.use('react-meteor-data', 'client');
  api.mainModule('client/main.js', 'client');
  api.mainModule('server/main.js', 'server');
});
