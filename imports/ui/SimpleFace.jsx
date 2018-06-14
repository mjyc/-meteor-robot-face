import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { Actions } from 'meteor/mjyc:action';

import { FacialExpressionActions } from '../api/facial_expression.js';
import {
  MediaFiles,
  SoundPlayAction,
} from '../api/media.js';
import {
  SpeechActions,
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
        this.actions[this.props.soundPlay._id]
          = new SoundPlayAction(Actions, this.props.soundPlay._id);
        this.actions[this.props.speechSynthesis._id]
          = new SpeechSynthesisAction(SpeechActions, this.props.speechSynthesis._id);
          this.actions[this.props.speechRecognition._id]
          = new SpeechRecognitionAction(SpeechActions, this.props.speechRecognition._id);
        this.actions[this.props.speechbubbleRobot._id]
          = new SpeechbubbleAction(Speechbubbles, this.props.speechbubbleRobot._id);
        this.actions[this.props.speechbubbleHuman._id]
          = new SpeechbubbleAction(Speechbubbles, this.props.speechbubbleHuman._id);
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

    const speechbubbleRobot = this.props.speechbubbleRobot;
    const speechbubbleHuman = this.props.speechbubbleHuman;
    const speechbubbleActionRobot = this.actions[speechbubbleRobot._id];
    const speechbubbleActionHuman = this.actions[speechbubbleHuman._id];
    return (
      <div style={styles.face}>
        <div>
          <div>
            <strong>Robot: </strong>
            {speechbubbleRobot ?
              <Speechbubble
                key={speechbubbleRobot._id}
                speechbubble={speechbubbleRobot}
                reset={speechbubbleActionRobot.resetSpeechbubble.bind(speechbubbleActionRobot)}
                setSucceeded={speechbubbleActionRobot._as.setSucceeded.bind(speechbubbleActionRobot._as)}
                setAborted={speechbubbleActionRobot._as.setAborted.bind(speechbubbleActionRobot._as)}
              /> : null
            }
          </div>
          <div>
            <strong>Human: </strong>
            {speechbubbleHuman ?
              <Speechbubble
                key={speechbubbleHuman._id}
                speechbubble={speechbubbleHuman}
                reset={speechbubbleActionHuman.resetSpeechbubble.bind(speechbubbleActionHuman)}
                setSucceeded={speechbubbleActionHuman._as.setSucceeded.bind(speechbubbleActionHuman._as)}
                setAborted={speechbubbleActionHuman._as.setAborted.bind(speechbubbleActionHuman._as)}
              /> : null
            }
          </div>
        </div>

        <Eyes
          facialExpression={this.props.facialExpression}
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
  const facialExpressionActionsHandle = Meteor.subscribe('facial_expression_actions');
  const mediaFilesHandle = Meteor.subscribe('media_files');
  const speechHandle = Meteor.subscribe('speech_actions');
  const speechbubblesHandle = Meteor.subscribe('speechbubbles');
  const visionActionsHandle = Meteor.subscribe('vision_actions');

  const loading = !actionsHandle.ready()
    || !facialExpressionActionsHandle.ready()
    || !mediaFilesHandle.ready()
    || !speechHandle.ready()
    || !speechbubblesHandle.ready()
    || !visionActionsHandle.ready();

  const facialExpression = FacialExpressionActions.findOne(query);
  const soundPlay = Actions.findOne(Object.assign({type: 'soundPlay'}, query));
  const speechSynthesis = SpeechActions.findOne(Object.assign({type: 'synthesis'}, query));
  const speechRecognition = SpeechActions.findOne(Object.assign({type: 'recognition'}, query));
  const speechbubbleRobot = Speechbubbles.findOne(Object.assign({role: 'robot'}, query));
  const speechbubbleHuman = Speechbubbles.findOne(Object.assign({role: 'human'}, query));
  const videoControl = VisionActions.findOne(Object.assign({type: 'video_control'}, query));
  const poseDetection = VisionActions.findOne(Object.assign({type: 'pose_detection'}, query));
  const faceDetection = VisionActions.findOne(Object.assign({type: 'face_detection'}, query));

  return {
    loading,
    facialExpression,
    soundPlay,
    speechSynthesis,
    speechRecognition,
    speechbubbleRobot,
    speechbubbleHuman,
    videoControl,
    poseDetection,
    faceDetection,
  };
})(SimpleFace);
