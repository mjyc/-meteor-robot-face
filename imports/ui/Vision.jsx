import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';
import { Actions } from 'meteor/mjyc:action';

import {
  createDetector,
  DetectionAction,
  VideoControlAction,
} from '../api/vision.js';

import VisionViz from './VisionViz.jsx'

const logger = log.getLogger('Vision');


// Vision component - creates a video element and vision actions
export default class Vision extends Component {
  constructor(props) {
    super(props);
    this.state = {
      video: null,
    }

    this.actions = {};
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.video || !this.state.video) {
      return;
    }

    this.actions[this.props.videoControl._id] = new VideoControlAction(
      Actions,
      this.props.videoControl._id,
      this.state.video,
    );
    this.actions[this.props.poseDetection._id] = new DetectionAction(
      Actions,
      this.props.poseDetection._id,
      this.state.video,
      createDetector('pose'),
    );
    this.actions[this.props.faceDetection._id] = new DetectionAction(
      Actions,
      this.props.faceDetection._id,
      this.state.video,
      createDetector('face'),
    );

    if (this.props.setVideo) this.props.setVideo(this.elements.video);
  }

  render() {
    return (
      <div>
        <div>
          <video
            style={{display: 'none'}}
            ref={(element) => {
              if (!this.state.video) {
                this.setState({video: element});
              }
            }}
            width="600px"
            height="500px"
            autoPlay
          ></video>
        </div>
        <div>
          {this.state.video ? (
          <VisionViz
            video={this.state.video}
          />
          ) : null}
        </div>
      </div>
    );
  }
}
