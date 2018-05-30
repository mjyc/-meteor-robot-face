import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';

import { Speechbubbles } from '../api/speechbubbles.js';
import {
  Speech,
  serveSpeechSynthesisAction,
  serveSpeechRecognitionAction,
} from '../api/speech.js';
import {
  MediaActions,
  servePlaySoundAction,
} from '../api/media.js';
import { VisionActions } from '../api/vision.js';

import Speechbubble from '../ui/Speechbubble.jsx';
import FaceTracking from '../ui/FaceTracking.jsx';

const logger = log.getLogger('SimpleFace');


// SimpleFace component - represents the whole app
class SimpleFace extends Component {
  constructor(props) {
    super(props);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.loading && !this.props.loading) {
      // NOTE: the functions inside of setTimeout callback use .observeChanges,
      //  which won't work properly within in withTracker
      setTimeout(() => {
        serveSpeechSynthesisAction(this.props.speechSynthesis._id);
        serveSpeechRecognitionAction(this.props.speechRecognition._id);
        servePlaySoundAction(this.props.playSound._id);
      }, 0);
    }
  }

  render() {
    if (this.props.loading) {
      return (
        <div>Loading...</div>
      )
    };

    return (
      <div>

        <FaceTracking
          faceTracking={this.props.faceTracking}
        />

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
  const mediaActionsHandle = Meteor.subscribe('media_actions');
  const visionActionsHandle = Meteor.subscribe('vision_actions');
  const loading = !speechbubblesHandle.ready()
    || !speechHandle.ready()
    || !mediaActionsHandle.ready()
    || !visionActionsHandle.ready();

  const speechbubbleRobot = Speechbubbles.findOne(Object.assign({role: 'robot'}, faceQuery));
  const speechbubbleHuman = Speechbubbles.findOne(Object.assign({role: 'human'}, faceQuery));
  const speechSynthesis = Speech.findOne({type: 'synthesis'});
  const speechRecognition = Speech.findOne({type: 'recognition'});
  const playSound = MediaActions.findOne({type: 'sound'});  // TODO: refactor with type?
  const faceTracking = VisionActions.findOne({type: 'face_tracking'});

  return {
    loading,
    speechbubbleRobot,
    speechbubbleHuman,
    speechSynthesis,
    speechRecognition,
    playSound,
    faceTracking,
  };
})(SimpleFace);
