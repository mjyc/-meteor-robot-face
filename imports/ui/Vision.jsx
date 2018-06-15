import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';
import { Actions } from 'meteor/mjyc:action';

import {
  createDetector,
  DetectionAction,
  VideoControlAction,
} from '../api/vision.js';

const logger = log.getLogger('Vision');


// Vision component - creates a video element and vision actions
export default class Vision extends Component {
  constructor(props) {
    super(props);

    this.elements = {};
    this.actions = {};
  }

  componentDidMount() {
    this.actions[this.props.videoControl._id] = new VideoControlAction(
      Actions,
      this.props.videoControl._id,
      this.elements.video,
    );
    this.actions[this.props.poseDetection._id] = new DetectionAction(
      Actions,
      this.props.poseDetection._id,
      this.elements.video,
      createDetector('pose'),
    );
    this.actions[this.props.faceDetection._id] = new DetectionAction(
      Actions,
      this.props.faceDetection._id,
      this.elements.video,
      createDetector('face'),
    );

    if (this.props.setVideo) this.props.setVideo(this.elements.video);
  }

  render() {
    return (
      <div>
        <video
          style={{display: 'none'}}
          ref={(element) => { this.elements['video'] = element; }}
          width="600px"
          height="500px"
          autoPlay
        ></video>
      </div>
    );
  }
}
