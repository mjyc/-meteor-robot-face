import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';

import { getActionServer } from '../api/action.js';
import {
  Speechbubbles,
  SpeechbubbleAction,
} from '../api/speechbubbles.js';
import {
  SpeechActions,
  serveSpeechSynthesisAction,
  serveSpeechRecognitionAction,
} from '../api/speech.js';
import {
  MediaActions,
  MediaFiles,
  serveSoundPlayAction,
} from '../api/media.js';
import {
  FacialExpressionAction,
  FacialExpressionActions,
  ExpressiveEyes,
} from '../api/facial_expression.js';
import {
  VisionActions,
  DetectionAction,
} from '../api/vision.js';

import Speechbubble from '../ui/Speechbubble.jsx';
import FaceTracking from '../ui/FaceTracking.jsx';

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
      // NOTE: the functions inside of setTimeout callback use .observeChanges,
      //  which won't work properly within in withTracker
      setTimeout(() => {
        serveSpeechSynthesisAction(this.props.speechSynthesis._id);
        serveSpeechRecognitionAction(this.props.speechRecognition._id);
        serveSoundPlayAction(this.props.soundPlay._id);

        this.actions[this.props.speechbubbleRobot._id] = new SpeechbubbleAction(Speechbubbles, this.props.speechbubbleRobot._id);
        this.actions[this.props.speechbubbleHuman._id] = new SpeechbubbleAction(Speechbubbles, this.props.speechbubbleHuman._id);
        this.setState({ready: true});

        // TODO: do this in new FacialExpressionAction(...)
        const eyes = new ExpressiveEyes({
          leftEye: this.elements.leftEye,
          rightEye: this.elements.rightEye,
          upperLeftEyelid: this.elements.upperLeftEyelid,
          upperRightEyelid: this.elements.upperRightEyelid,
          lowerLeftEyelid: this.elements.lowerLeftEyelid,
          lowerRightEyelid: this.elements.lowerRightEyelid,
        });
        eyes.startBlinking();  // TODO: consolidate startBlinking into an action
        this.actions[this.props.facialExpression._id] = new FacialExpressionAction(
          FacialExpressionActions,
          this.props.facialExpression._id,
          eyes,
        );

        this.actions[this.props.poseDetection._id] = new DetectionAction(VisionActions, this.props.poseDetection._id, this.elements.video);
      }, 0);
    }
  }

  render() {
    if (this.props.loading || !this.state.ready) {
      return (
        <div>Loading...</div>
      )
    };

    // TODO: expose the variables below as props
    const faceColor = 'whitesmoke';
    const faceHeight = '426.67px';
    const faceWidth = '600px';
    const eyeColor = 'black';
    const eyeSize = '120px';  // 20% of faceWidth
    const eyelidColor = 'gray';

    const styles = {
      face: {
        backgroundColor: faceColor,
        // margin: 'auto',
        height: faceHeight,
        width: faceWidth,
        position: 'relative',
      },
      eye: {
        backgroundColor: eyeColor,
        borderRadius: '100%',
        height: eyeSize,
        width: eyeSize,
        bottom: `calc(${eyeSize} / 3)`,
        zIndex: 1,
        position: 'absolute',
      },
      left: {
        left: `calc(${eyeSize} / 3)`,
      },
      right: {
        right: `calc(${eyeSize} / 3)`,
      },
      eyelid: {
        backgroundColor: eyelidColor,
        height: eyeSize,
        width: `calc(${eyeSize} * 1.75)`,
        zIndex: 2,
        position: 'absolute',
      },
      upper: {
        bottom: `calc(${eyeSize} * 1)`,
        left: `calc(${eyeSize} * -0.375)`,
      },
      lower: {
        borderRadius: '100%',
        bottom: `calc(${eyeSize} * -1)`,
        left: `calc(${eyeSize} * -0.375)`,
      },
    }

    const speechbubbleRobot = this.props.speechbubbleRobot;
    const speechbubbleHuman = this.props.speechbubbleHuman;
    const speechbubbleActionRobot = this.actions[speechbubbleRobot._id];
    const speechbubbleActionHuman = this.actions[speechbubbleHuman._id];
    return (
      <div>
        <div style={styles.face}>
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

          <div
            style={Object.assign({}, styles.eye, styles.left)}
            ref={element => { this.elements['leftEye'] = element; }}
          >
            <div
              style={Object.assign({}, styles.eyelid, styles.upper)}
              ref={element => { this.elements['upperLeftEyelid'] = element; }}
            />
            <div
              style={Object.assign({}, styles.eyelid, styles.lower)}
              ref={element => { this.elements['lowerLeftEyelid'] = element; }}
            />
          </div>
          <div
            style={Object.assign({}, styles.eye, styles.right)}
            ref={element => { this.elements['rightEye'] = element; }}
          >
            <div
              style={Object.assign({}, styles.eyelid, styles.upper)}
              ref={element => { this.elements['upperRightEyelid'] = element; }}
            />
            <div
              style={Object.assign({}, styles.eyelid, styles.lower)}
              ref={element => { this.elements['lowerRightEyelid'] = element; }}
            />
          </div>
        </div>

        <div>
          <video
            id="video"
            style={{display: none}}
            ref={(element) => { this.elements['video'] = element; }}
            width="600px"
            height="500px"
            autoPlay
          ></video>
        </div>
      </div>
    );
  }
}

export default withTracker(({faceQuery}) => {
  const speechbubblesHandle = Meteor.subscribe('speechbubbles');
  const speechHandle = Meteor.subscribe('speech_actions');
  const mediaActionsHandle = Meteor.subscribe('media_actions');
  const visionActionsHandle = Meteor.subscribe('vision_actions');
  const facialExpressionActionsHandle = Meteor.subscribe('facial_expression_actions');
  const mediaFilesHandle = Meteor.subscribe('media_files');
  const loading = !speechbubblesHandle.ready()
    || !speechHandle.ready()
    || !mediaActionsHandle.ready()
    || !visionActionsHandle.ready()
    || !mediaFilesHandle.ready()
    || !facialExpressionActionsHandle.ready();

  const speechbubbleRobot = Speechbubbles.findOne(Object.assign({role: 'robot'}, faceQuery));
  const speechbubbleHuman = Speechbubbles.findOne(Object.assign({role: 'human'}, faceQuery));
  const speechSynthesis = SpeechActions.findOne(Object.assign({type: 'synthesis'}, faceQuery));
  const speechRecognition = SpeechActions.findOne(Object.assign({type: 'recognition'}, faceQuery));
  const soundPlay = MediaActions.findOne(Object.assign({type: 'sound'}, faceQuery));
  const facialExpression = FacialExpressionActions.findOne(faceQuery);
  const poseDetection = VisionActions.findOne(Object.assign({type: 'face_tracking'}, faceQuery));

  return {
    loading,
    speechbubbleRobot,
    speechbubbleHuman,
    speechSynthesis,
    speechRecognition,
    soundPlay,
    facialExpression,
    poseDetection,
  };
})(SimpleFace);
