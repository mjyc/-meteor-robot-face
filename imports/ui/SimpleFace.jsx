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
        this.actions[this.props.soundPlay._id]
          = new SoundPlayAction(Actions, this.props.soundPlay._id);
        this.actions[this.props.speechSynthesis._id]
          = new SpeechSynthesisAction(Actions, this.props.speechSynthesis._id);
          this.actions[this.props.speechRecognition._id]
          = new SpeechRecognitionAction(Actions, this.props.speechRecognition._id);
        this.actions[this.props.speechbubbleRobot._id]
          = new SpeechbubbleAction(Actions, this.props.speechbubbleRobot._id);
        this.actions[this.props.speechbubbleHuman._id]
          = new SpeechbubbleAction(Actions, this.props.speechbubbleHuman._id);
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

    const query = this.props.query;
    const speechbubbleRobot = this.props.speechbubbleRobot;
    const speechbubbleHuman = this.props.speechbubbleHuman;
    const actionSpeechbubbleRobot = this.actions[speechbubbleRobot._id];
    const actionSpeechbubbleHuman = this.actions[speechbubbleHuman._id];
    return (
      <div style={styles.face}>
        <div>
          <div>
            <strong>Robot: </strong>
            {speechbubbleRobot ?
              <Speechbubble
                key={speechbubbleRobot._id}
                speechbubble={Speechbubbles.findOne(Object.assign({actionId: speechbubbleRobot._id}, query))}
                reset={actionSpeechbubbleRobot.resetSpeechbubble.bind(actionSpeechbubbleRobot)}
                setSucceeded={actionSpeechbubbleRobot._as.setSucceeded.bind(actionSpeechbubbleRobot._as)}
                setAborted={actionSpeechbubbleRobot._as.setAborted.bind(actionSpeechbubbleRobot._as)}
              /> : null
            }
          </div>
          <div>
            <strong>Human: </strong>
            {speechbubbleHuman ?
              <Speechbubble
                key={speechbubbleHuman._id}
                speechbubble={Speechbubbles.findOne(Object.assign({actionId: speechbubbleHuman._id}, query))}
                reset={actionSpeechbubbleHuman.resetSpeechbubble.bind(actionSpeechbubbleHuman)}
                setSucceeded={actionSpeechbubbleHuman._as.setSucceeded.bind(actionSpeechbubbleHuman._as)}
                setAborted={actionSpeechbubbleHuman._as.setAborted.bind(actionSpeechbubbleHuman._as)}
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
  const mediaFilesHandle = Meteor.subscribe('media_files');
  const speechbubblesHandle = Meteor.subscribe('speechbubbles');
  const visionActionsHandle = Meteor.subscribe('vision_actions');

  const loading = !actionsHandle.ready()
    || !mediaFilesHandle.ready()
    || !speechbubblesHandle.ready()
    || !visionActionsHandle.ready();

  const facialExpression = Actions.findOne(Object.assign({type: 'facialExpression'}, query));
  const soundPlay = Actions.findOne(Object.assign({type: 'soundPlay'}, query));
  const speechSynthesis = Actions.findOne(Object.assign({type: 'speechSynthesis'}, query));
  const speechRecognition = Actions.findOne(Object.assign({type: 'speechRecognition'}, query));
  const speechbubbleRobot = Actions.findOne(Object.assign({type: 'speechbubbleRobot'}, query));
  const speechbubbleHuman = Actions.findOne(Object.assign({type: 'speechbubbleHuman'}, query));
  const videoControl = VisionActions.findOne(Object.assign({type: 'video_control'}, query));
  const poseDetection = VisionActions.findOne(Object.assign({type: 'pose_detection'}, query));
  const faceDetection = VisionActions.findOne(Object.assign({type: 'face_detection'}, query));

  return {
    query,
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
