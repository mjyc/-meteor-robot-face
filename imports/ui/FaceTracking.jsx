import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';

import { serveFaceTrackingAction } from '../api/vision.js';

const logger = log.getLogger('FaceTracking');


// FaceTracking component - the face tracking output and control
export default class FaceTracking extends Component {
  constructor(props) {
    super(props);

    this.elements = {};
  }

  componentDidMount() {
    const self = this;
    setTimeout(() => {
      serveFaceTrackingAction(self._id, self.elements.video, self.elements.canvas);
    }, 0);
  }

  render() {
    const style = {
      height: 240,
      width: 320,
      position: 'absolute',
      bottom: 0,
      left: 0,
      display: !!this.props.faceTracking.showVideo ? 'block' : 'none',
    };

    return (
      <div>
        <video
          style={style}
          ref={(element) => { this.elements['video'] = element; }}
          autoPlay
        ></video>
        <canvas
          style={style}
          ref={(element) => { this.elements['canvas'] = element; }}
        ></canvas>
      </div>
    );
  }
}
