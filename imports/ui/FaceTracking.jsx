import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';

import {
  serveFaceTrackingAction,
} from '../api/vision.js';
import {
  bindPage,
  start,
} from '../api/posenet_utils.js';

const logger = log.getLogger('FaceTracking');


// FaceTracking component - the face tracking output and control
export default class FaceTracking extends Component {
  constructor(props) {
    super(props);

    this.elements = {};
  }

  componentDidMount() {

    setTimeout(() => {
      start();
      serveFaceTrackingAction(this._id, this.elements.video, this.elements.canvas);
    }, 100);
  }

  render() {
    const style = {
      position: 'absolute',
      bottom: 0,
      left: 0,
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
          id="output"
        />
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
