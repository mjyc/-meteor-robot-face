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
import { VisionActions } from '../api/vision.js';

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
    const faceHeight = '375px';  // TODO: change to 100vh after moving SimpleFace out from EditPage
    const faceWidth = '600px';  // TODO: change to 100vw after moving SimpleFace out from EditPage
    const eyeColor = 'black';
    const eyeSize = '120px';  // TODO: change to 33.33vh after moving SimpleFace out from EditPage
    const eyelidColor = 'gray';  // for debug, use 'whitesmoke' for production

    const styles = {
      face: {
        backgroundColor: faceColor,
        // margin: 'auto',  // TODO: uncomment after moving SimpleFace out from EditPage
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
          facialExpressionAction={this.props.actions.facialExpression}
          eyeColor={eyeColor}
          eyeSize={eyeSize}
          eyelidColor={eyelidColor}
        />

        <Vision
          videoControl={this.props.videoControl}
          poseDetection={this.props.poseDetection}
          faceDetection={this.props.faceDetection}
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
  const visionActionsHandle = Meteor.subscribe('vision_actions');

  const loading = !actionsHandle.ready()
    || !mediaFilesHandle.ready()  // needed by SoundPlayAction
    || !speechbubblesHandle.ready()  // needed by SpeechbubbleAction
    || !visionActionsHandle.ready();

  const videoControl = !loading && VisionActions.findOne(Object.assign({type: 'video_control'}, query));
  const poseDetection = !loading && VisionActions.findOne(Object.assign({type: 'pose_detection'}, query));
  const faceDetection = !loading && VisionActions.findOne(Object.assign({type: 'face_detection'}, query));

  const actions = {
    facialExpression: Actions.findOne(Object.assign({type: 'facialExpression'}, query)),
    soundPlay: Actions.findOne(Object.assign({type: 'soundPlay'}, query)),
    speechSynthesis: Actions.findOne(Object.assign({type: 'speechSynthesis'}, query)),
    speechRecognition: Actions.findOne(Object.assign({type: 'speechRecognition'}, query)),
    speechbubbleRobot: Actions.findOne(Object.assign({type: 'speechbubbleRobot'}, query)),
    speechbubbleHuman: Actions.findOne(Object.assign({type: 'speechbubbleHuman'}, query)),
  }

  return {
    loading,
    videoControl,
    poseDetection,
    faceDetection,
    actions,
  };
})(SimpleFace);
