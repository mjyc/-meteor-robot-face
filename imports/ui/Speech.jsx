import * as log from 'loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';

import { Speech } from '../api/speech.js';
import { getActionServer } from '../api/action.js';

const logger = log.getLogger('Speech');

export default class SpeechUI extends Component {
  constructor(props) {
    super(props);

  }

  render() {
    console.log('Speech rendered!');

    return null;
    // switch (this.props.speech.type) {
    //   case '':
    //     return null;
    //   case 'synthesis':
    //     return null;
    //   default:
    //     logger.warn(`Unknown speechbubble.type: ${this.props.speech.type}`);
    //     return null;
    // }
  }
}
