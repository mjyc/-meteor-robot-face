import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';

import {
  serveFaceTrackingAction,
} from '../api/vision.js';
import {
  bindPage,
} from '../api/posenet_utils.js';

const logger = log.getLogger('FaceTracking');


// FaceTracking component - the face tracking output and control
export default class FaceTracking extends Component {
  constructor(props) {
    super(props);

    this.elements = {};
  }

  componentDidMount() {
    bindPage(this.elements.video);

    setTimeout(() => {
      serveFaceTrackingAction(this._id, this.elements.video, this.elements.canvas);
    }, 1000);
  }

  render() {
    const style = {
      position: 'absolute',
      bottom: 0,
      left: 0,
      display: !!this.props.faceTracking.showVideo ? 'block' : 'none',
    };

    return (
      <div>
        <video
          id="video"
          style={style}
          ref={(element) => { this.elements['video'] = element; }}
          width="320"
          height="240"
          autoPlay
        ></video>
        <canvas
          id="output"
          style={style}
          ref={(element) => { this.elements['canvas'] = element; }}
          width="320"
          height="240"
        ></canvas>
      </div>
    );
  }
}
