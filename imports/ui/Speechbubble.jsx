import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';

import {
  Speechbubbles,
  serveSpeechbubbleAction,
} from '../api/speechbubbles.js';

const logger = log.getLogger('Speechbubble');

export default class Speechbubble extends Component {
  constructor(props) {
    super(props);

    this.actionServers = {};
  }

  componentDidMount() {
    const self = this;
    // NOTE: the functions inside of setTimeout callback use .observeChanges,
    //  which won't work properly within in withTracker
    setTimeout(() => {
      self.actionServers[this.props.speechbubble._id] = serveSpeechbubbleAction(this.props.speechbubble._id);
    }, 0);
  }

  render() {
    switch (this.props.speechbubble.type) {
      case '':
        return null;
      case 'message':
        return (
          <span>{this.props.speechbubble.message}</span>
        )
      case 'choices':
        return this.props.speechbubble.choices.map((choice, index) => {
          return (
            <button
              key={index}
              onClick={() => {
                Speechbubbles.update(this.props.speechbubble._id, {
                  $set: {
                    type: '',
                  },
                  $unset: {
                    choices: '',
                  }
                }, {}, (err, result) => {
                  this.actionServers[this.props.speechbubble._id].setSucceeded({text: choice});
                });
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
