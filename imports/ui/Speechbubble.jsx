import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';

import {
  Speechbubbles,
  serveSpeechbubbleAction,
} from '../api/speechbubbles.js';
import { MediaFiles } from '../api/media.js';

const logger = log.getLogger('Speechbubble');


// TODO: write a note that this requires subscriptions

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
    const speechbubble = this.props.speechbubble;
    switch (speechbubble.type) {
      case '':
        return null;
      case 'message':
        return (
          <span>{speechbubble.data.message}</span>
        )
      case 'choices':
        return speechbubble.data.choices.map((choice, index) => {
          return (
            <button
              key={index}
              onClick={() => {
                Speechbubbles.update(speechbubble._id, {
                  $set: {
                    type: '',
                  },
                  $unset: {
                    choices: '',
                  }
                }, {}, (err, result) => {
                  this.actionServers[speechbubble._id].setSucceeded({
                    text: choice,
                  });
                });
              }}
            >
              {choice}
            </button>
          );
        });
      case 'image':
        const mediaFile = MediaFiles.findOne(speechbubble.data.query);
        return (
          <img
            height="100"
            src={mediaFile.data}
          />
        );
      default:
        logger.warn(`Unknown speechbubble.type: ${speechbubble.type}`);
        return null;
    }
  }
}
