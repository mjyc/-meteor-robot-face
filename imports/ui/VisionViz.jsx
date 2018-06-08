import log from 'meteor/mjyc:loglevel';
import * as posenet from '@tensorflow-models/posenet';
import React, { Component } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import { VisionActions } from '../api/vision.js';

const logger = log.getLogger('VisionViz');

const color = 'aqua';
const lineWidth = 2;


const toTuple = ({ y, x }) => {
  return [y, x];
}

const drawSegment = ([ay, ax], [by, bx], color, scale, ctx) => {
  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.stroke();
}

const drawSkeleton = (keypoints, minConfidence, ctx, scale = 1) => {
  const adjacentKeyPoints = posenet.getAdjacentKeyPoints(
    keypoints, minConfidence);

  adjacentKeyPoints.forEach((keypoints) => {
    drawSegment(toTuple(keypoints[0].position),
      toTuple(keypoints[1].position), color, scale, ctx);
  });
}

const drawKeypoints = (keypoints, minConfidence, ctx, scale = 1) => {
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];

    if (keypoint.score < minConfidence) {
      continue;
    }

    const { y, x } = keypoint.position;
    ctx.beginPath();
    ctx.arc(x * scale, y * scale, 3, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

class BackgroundLayer extends Component {
  constructor(props) {
    super(props);

    this._intervalID = null;

    this.elements = {};
    this.context = null;
  }

  componentDidUpdate(prevProps) {
    console.log('BackgroundLayer.componentDidUpdate');
  }

  render() {
    return (
      <div style={{position: 'absolute', top: 0}}>
        <video
          ref={(element) => { this.elements['video'] = element; }}
          width="600px"
          height="500px"
        ></video>
      </div>
    );
  }
}


class PoseLayer extends Component {
  constructor(props) {
    super(props);
  }

  componentDidUpdate() {
    console.log('PoseLayer.componentDidUpdate');
    // this.ctx.clearRect(0, 0, 600, 500);
    // this.ctx.save();
    // this.ctx.scale(-1, 1);
    // this.ctx.translate(-600, 0);
    // this.ctx.drawImag  e(this.props.video, 0, 0, 600, 500);
    // this.ctx.restore();
    // const poses = this.props.poseDetection.data;
    // poses.forEach(({ score, keypoints }) => {
    //   // if (score >= minPoseConfidence) {
    //     // if (guiState.output.showPoints) {
    //       drawKeypoints(keypoints, 0.1, this.ctx);
    //     // }
    //     // if (guiState.output.showSkeleton) {
    //       drawSkeleton(keypoints, 0.5, this.ctx);
    //     // }
    //   // }
    // });
  }

  render() {
    return (
      <div style={{position: 'absolute', top: 0}}>
      </div>
    );
  }
}

class FaceLayer extends Component {
  constructor(props) {
    super(props);
  }

  componentDidUpdate() {
    console.log('FaceLayer.componentDidUpdate');
    // this.ctx.clearRect(0, 0, 600, 500);
    // this.ctx.save();
    // this.ctx.scale(-1, 1);
    // this.ctx.translate(-600, 0);
    // this.ctx.drawImag  e(this.props.video, 0, 0, 600, 500);
    // this.ctx.restore();
    // const poses = this.props.poseDetection.data;
    // poses.forEach(({ score, keypoints }) => {
    //   // if (score >= minPoseConfidence) {
    //     // if (guiState.output.showPoints) {
    //       drawKeypoints(keypoints, 0.1, this.ctx);
    //     // }
    //     // if (guiState.output.showSkeleton) {
    //       drawSkeleton(keypoints, 0.5, this.ctx);
    //     // }
    //   // }
    // });
  }

  render() {
    return (
      <div style={{position: 'absolute', top: 0}}>
      </div>
    );
  }
}


class VisionViz extends Component {
  constructor(props) {
    super(props);

    this._intervalID = null;

    this.elements = {};
    this.contexts = {};
  }

  componentDidMount() {
    this.contexts.background = this.elements.background.getContext('2d');
    this.contexts.pose = this.elements.pose.getContext('2d');
  }

  componentDidUpdate(prevProps) {

    console.log('VisionViz.componentDidUpdate');

    // if (!this.props.video || this.props.loading) {
    //   logger.warn('Input video or detection output is not available');
    //   return;
    // }

    // if (!this._intervalID) {
    //   this._intervalID = setInterval(() => {
    //     this.contexts.background.clearRect(0, 0, 600, 500);
    //     this.contexts.background.save();
    //     this.contexts.background.scale(-1, 1);
    //     this.contexts.background.translate(-600, 0);
    //     this.contexts.background.drawImage(this.props.video, 0, 0, 600, 500);
    //     this.contexts.background.restore();
    //   }, 100);
    // }

    // this.ctx.clearRect(0, 0, 600, 500);
    // this.ctx.save();
    // this.ctx.scale(-1, 1);
    // this.ctx.translate(-600, 0);
    // this.ctx.drawImage(this.props.video, 0, 0, 600, 500);
    // this.ctx.restore();
    // const poses = this.props.poseDetection.data;
    // poses.forEach(({ score, keypoints }) => {
    //   // if (score >= minPoseConfidence) {
    //     // if (guiState.output.showPoints) {
    //       drawKeypoints(keypoints, 0.1, this.ctx);
    //     // }
    //     // if (guiState.output.showSkeleton) {
    //       drawSkeleton(keypoints, 0.5, this.ctx);
    //     // }
    //   // }
    // });
  }

  render() {
    return (
      <div style={{position: 'relative'}}>
        <PoseLayer
          poseDetection={this.props.poseDetection}
        />
        <FaceLayer
          faceDetection={this.props.faceDetection}
        />
        <canvas
          style={{position: 'absolute', top: 0}}
          ref={(element) => { this.elements['background'] = element; }}
          width="600px"
          height="500px"
        ></canvas>
        <canvas
          style={{position: 'absolute', top: 0}}
          ref={(element) => { this.elements['pose'] = element; }}
          width="600px"
          height="500px"
        ></canvas>
      </div>
    );
  }
}

export default withTracker(({detectionQuery, video}) => {
  const visionActionsHandle = Meteor.subscribe('vision_actions');
  const loading = !visionActionsHandle.ready();
  const poseDetection = VisionActions.findOne(Object.assign({type: 'pose_detection'}, detectionQuery));
  const faceDetection = VisionActions.findOne(Object.assign({type: 'face_detection'}, detectionQuery));

  return {
    video,
    loading,
    poseDetection,
    faceDetection,
  };
})(VisionViz);
