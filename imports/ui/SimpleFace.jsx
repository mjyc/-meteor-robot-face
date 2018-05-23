import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';

import { Speechbubbles } from '../api/speechbubbles.js';
import Speechbubble from '../ui/Speechbubble.jsx';
import { Speech, serveSpeechSynthesisAction } from '../api/speech.js';

const logger = log.getLogger('SimpleFace');

// SimpleFace component - represents the whole app
class SimpleFace extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (this.props.loading) {
      return (
        <div>Loading...</div>
      )
    }

    serveSpeechSynthesisAction(this.props.speech._id, window.speechSynthesis);

    return (
      <div>
        <div>
          <strong>Robot: </strong>
          {this.props.speechbubbleRobot ?
            <Speechbubble
              key={this.props.speechbubbleRobot._id}
              speechbubble={this.props.speechbubbleRobot}
            /> : null
          }
        </div>
        <div>
          <strong>Human: </strong>
          {this.props.speechbubbleHuman ?
            <Speechbubble
              key={this.props.speechbubbleHuman._id}
              speechbubble={this.props.speechbubbleHuman}
            /> : null
          }
        </div>
      </div>
    );
  }
}

export default withTracker(({faceQuery}) => {
  const speechbubblesHandle = Meteor.subscribe('speechbubbles');
  const speechHandle = Meteor.subscribe('speech');
  const loading = !speechbubblesHandle.ready() || !speechHandle.ready();
  const speechbubbleRobot = Speechbubbles.findOne(Object.assign({role: 'robot'}, faceQuery));
  const speechbubbleHuman = Speechbubbles.findOne(Object.assign({role: 'human'}, faceQuery));
  const speech = Speech.findOne();

  return {
    loading,
    speechbubbleRobot,
    speechbubbleHuman,
    speech,
  };
})(SimpleFace);
