import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';

import { Speechbubbles } from '../api/speechbubbles.js';

const logger = log.getLogger('Speechbubble');

export default class Speechbubble extends Component {
  constructor(props) {
    super(props);
  }

  render() {

    switch (this.props.speechbubble.type) {
      case '':
        return null;
      case 'message':
        return (
          <span>{this.props.speechbubble.data.message}</span>
        )
      case 'choices':
        return this.props.speechbubble.data.choices.map((choice, index) => {
          return (
            <button
              key={index}
              onClick={() => {
                Meteor.call('speechbubbles.choices.setSelected', this.props.speechbubble._id, choice);
              }}
            >
              {choice}
            </button>
          );
        });
      default:
        logger.warn(`Unknown speechbubble.type: ${this.props.speechbubble.type}`);
        return null;
    }
  }
}
