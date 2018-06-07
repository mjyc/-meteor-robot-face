import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';

import {
  VisionActions,
  setupCamera,
  DetectionAction,
} from '../api/vision.js';

const logger = log.getLogger('FaceTracking');


// FaceTracking component - the face tracking output and control
export default class FaceTracking extends Component {
  constructor(props) {
    super(props);

    this.elements = {};
  }

  componentDidMount() {
    setupCamera(this.elements.video).then((video => {
      video.play();
      const action = new DetectionAction(this.props.faceTracking._id, VisionActions, this.elements.video);
      action.start();
    }));
  }

  render() {
    const style = {
      // position: 'absolute',
      // bottom: 0,
      // left: 0,
      // display: !!this.props.faceTracking.showVideo ? 'block' : 'none',
    };

    return (
      <div>

        <video
          id="video"
          style={style}
          ref={(element) => { this.elements['video'] = element; }}
          width="600px"
          height="500px"
          autoPlay
        ></video>
        <canvas
          width="600px"
          height="500px"
          style={style}
          ref={(element) => { this.elements['canvas'] = element; }}
        ></canvas>

      </div>
    );
  }
}
