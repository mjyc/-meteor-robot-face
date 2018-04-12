import React from 'react';
import { Meteor } from 'meteor/meteor';
import { render } from 'react-dom';

import SimpleFace from '../imports/ui/SimpleFace.jsx';

Meteor.startup(() => {
  render(<SimpleFace />, document.getElementById('render-target'));
});
