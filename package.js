Package.describe({
  name: 'mjyc:simple-face',
  version: '0.0.1',
  summary: 'Meteor package providing a simple face React component.',
  git: 'https://gitlab.cs.washington.edu/mjyc/simple-face',
  documentation: 'README.md'
});

Npm.depends({
  'react': '16.1.1',
  // 'material-ui': '0.20.0', // causes this problem https://reactjs.org/warnings/refs-must-have-owner.html because it pulls some react libraries
  'tracking': '1.1.3',
  '@tensorflow/tfjs': '0.11.4',
  '@tensorflow-models/posenet': '0.1.1',
  'stats.js': '0.17.0',
  'dat.gui': '0.7.1'
});

Package.onUse(function(api) {
  api.versionsFrom('1.6');
  api.use('ecmascript');
  api.use('mongo');
  api.use('mjyc:loglevel');
  api.use('mjyc:action');
  api.use('react-meteor-data', 'client');
  api.mainModule('client/main.js', 'client');
  api.mainModule('server/main.js', 'server');
});
