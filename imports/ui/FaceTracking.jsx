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
    //   serveFaceTrackingAction(this._id, this.elements.video, this.elements.canvas);
      start();
    }, 100);
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

        <div id="info" style={{display:'none'}}>
        </div>
        <div id="loading">
            Loading the model...
        </div>

        <div id='main' style={{display: 'none'}}>
            <video id="video" style={{
              '-moz-transform': 'scaleX(-1)',
              '-o-transform': 'scaleX(-1)',
              '-webkit-transform': 'scaleX(-1)',
              'transform': 'scaleX(-1)',
              'display': 'none',
            }}>
            </video>
            <canvas id="output" />
        </div>

      </div>
    );
  }
}
