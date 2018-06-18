import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { Actions } from 'meteor/mjyc:action';

import {
  MediaFiles,
  SoundPlayAction,
} from '../api/media.js';
import {
  SpeechSynthesisAction,
  SpeechRecognitionAction,
} from '../api/speech.js';
import {
  Speechbubbles,
  SpeechbubbleAction,
} from '../api/speechbubbles.js';

import Speechbubble from '../ui/Speechbubble.jsx';
import Eyes from '../ui/Eyes.jsx';
import Vision from '../ui/Vision.jsx';

const logger = log.getLogger('SimpleFace');


// SimpleFace component - represents the whole app
class SimpleFace extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ready: false,
    };

    this.elements = {};
    this.actions = {};
  }

  componentDidUpdate(prevProps) {
    if (prevProps.loading && !this.props.loading) {
      // the functions inside of setTimeout callback use .observeChanges, which
      //   don't work properly within withTracker
      setTimeout(() => {
        this.actions[this.props.actions.soundPlay._id]
          = new SoundPlayAction(Actions, this.props.actions.soundPlay._id);
        this.actions[this.props.actions.speechSynthesis._id]
          = new SpeechSynthesisAction(Actions, this.props.actions.speechSynthesis._id);
          this.actions[this.props.actions.speechRecognition._id]
          = new SpeechRecognitionAction(Actions, this.props.actions.speechRecognition._id);
        this.actions[this.props.actions.speechbubbleRobot._id]
          = new SpeechbubbleAction(Actions, this.props.actions.speechbubbleRobot._id);
        this.actions[this.props.actions.speechbubbleHuman._id]
          = new SpeechbubbleAction(Actions, this.props.actions.speechbubbleHuman._id);
        this.setState({ready: true});
      }, 0);
    }
  }

  render() {
    if (this.props.loading || !this.state.ready) {
      return (
        <div>Loading...</div>
      )
    };

    const faceColor = 'whitesmoke';
    const faceHeight = '100vh';
    const faceWidth = '100vw';
    const eyeColor = 'black';
    const eyeSize = '33.33vh';
    const eyelidColor = 'whitesmoke';

    const styles = {
      face: {
        backgroundColor: faceColor,
        margin: 'auto',
        height: faceHeight,
        width: faceWidth,
        position: 'relative',
        overflow: 'hidden',
      },
    };

    const speechbubbleRobotAction = this.actions[this.props.actions.speechbubbleRobot._id];
    const speechbubbleHumanAction = this.actions[this.props.actions.speechbubbleHuman._id];
    return (
      <div style={styles.face}>
        <div>
          <div>
            <strong>Robot: </strong>
            <Speechbubble
              key={this.props.actions.speechbubbleRobot._id}
              speechbubble={speechbubbleRobotAction.getSpeechbubble()}
              reset={speechbubbleRobotAction.resetSpeechbubble.bind(speechbubbleRobotAction)}
              setSucceeded={speechbubbleRobotAction._as.setSucceeded.bind(speechbubbleRobotAction._as)}
              setAborted={speechbubbleRobotAction._as.setAborted.bind(speechbubbleRobotAction._as)}
            />
          </div>
          <div>
            <strong>Human: </strong>
            <Speechbubble
              key={this.props.actions.speechbubbleHuman._id}
              speechbubble={speechbubbleHumanAction.getSpeechbubble()}
              reset={speechbubbleHumanAction.resetSpeechbubble.bind(speechbubbleHumanAction)}
              setSucceeded={speechbubbleHumanAction._as.setSucceeded.bind(speechbubbleHumanAction._as)}
              setAborted={speechbubbleHumanAction._as.setAborted.bind(speechbubbleHumanAction._as)}
            />
          </div>
        </div>

        <Eyes
          eyeExpressionAction={this.props.actions.eyeExpression}
          eyeColor={eyeColor}
          eyeSize={eyeSize}
          eyelidColor={eyelidColor}
        />

        <Vision
          videoControl={this.props.actions.videoControl}
          poseDetection={this.props.actions.poseDetection}
          faceDetection={this.props.actions.faceDetection}
          setVideo={this.props.setVideo}
        />
      </div>
    );
  }
}

export default withTracker(({query}) => {
  const actionsHandle = Meteor.subscribe('actions');
  const mediaFilesHandle = Meteor.subscribe('media_files');
  const speechbubblesHandle = Meteor.subscribe('speechbubbles');
  const detectionsHandle = Meteor.subscribe('detections');

  const loading = !actionsHandle.ready()
    || !mediaFilesHandle.ready()  // needed by SoundPlayAction
    || !speechbubblesHandle.ready()  // needed by SpeechbubbleAction
    || !detectionsHandle.ready();  // needed by Vision

  const actions = {
    eyeExpression: Actions.findOne(Object.assign({type: 'eyeExpression'}, query)),
    soundPlay: Actions.findOne(Object.assign({type: 'soundPlay'}, query)),
    speechSynthesis: Actions.findOne(Object.assign({type: 'speechSynthesis'}, query)),
    speechRecognition: Actions.findOne(Object.assign({type: 'speechRecognition'}, query)),
    speechbubbleRobot: Actions.findOne(Object.assign({type: 'speechbubbleRobot'}, query)),
    speechbubbleHuman: Actions.findOne(Object.assign({type: 'speechbubbleHuman'}, query)),
    videoControl: Actions.findOne(Object.assign({type: 'videoControl'}, query)),
    poseDetection: Actions.findOne(Object.assign({type: 'poseDetection'}, query)),
    faceDetection: Actions.findOne(Object.assign({type: 'faceDetection'}, query)),
  }

  return {
    loading,
    actions,
  };
})(SimpleFace);
