import log from 'meteor/mjyc:loglevel';
import * as posenet from '@tensorflow-models/posenet';
import React, { Component } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import { VisionActions } from '../api/vision.js';

const logger = log.getLogger('VisionViz');


const toTuple = ({ y, x }) => {
  return [y, x];
}

const drawSegment = ([ay, ax], [by, bx], color, scale, ctx) => {
  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.stroke();
}

const drawSkeleton = (keypoints, minConfidence, ctx, scale = 1) => {
  const adjacentKeyPoints = posenet.getAdjacentKeyPoints(
    keypoints, minConfidence);

  adjacentKeyPoints.forEach((keypoints) => {
    drawSegment(toTuple(keypoints[0].position),
      toTuple(keypoints[1].position), 'aqua', scale, ctx);
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
    ctx.fillStyle = 'aqua';
    ctx.fill();
  }
}


class VisionViz extends Component {
  constructor(props) {
    super(props);

    this._intervalID = null;

    this.elements = {};
  }

  componentDidUpdate(prevProps) {
    if (!this.props.video || this.props.loading) {
      logger.warn('Input video or detection is not available');
      return;
    }

    // TODO: make a note that this is just a quick & dirty output

    const context = this.elements.canvas.getContext('2d');
    const width = this.elements.canvas.width;
    const height = this.elements.canvas.height;
    // TODO: read below two variables from somewhere else
    let minPoseConfidence = 0.1;
    let minPartConfidence = 0.5;
    // if (this.props.poseDetection._params.algorithm === 'single-pose') {
    //   minPoseConfidence = this.props.poseDetection._params.singlePoseDetection.minPoseConfidence;
    //   minPartConfidence = this.props.poseDetection._params.singlePoseDetection.minPartConfidence;
    // } else {
    //   minPoseConfidence = this.props.poseDetection._params.multiPoseDetection.minPoseConfidence;
    //   minPartConfidence = this.props.poseDetection._params.multiPoseDetection.minPartConfidence;
    // }

    context.clearRect(0, 0, width, height);
    context.save();
    context.scale(-1, 1);
    context.translate(-width, 0);
    context.drawImage(this.props.video, 0, 0, width, height);
    context.restore();

    const poses = this.props.poseDetection.data.data;
    poses && poses.forEach(({ score, keypoints }) => {
      if (score >= minPoseConfidence) {
        drawKeypoints(keypoints, minPartConfidence, context);
        drawSkeleton(keypoints, minPartConfidence, context);
      }
    });

    const faces = this.props.faceDetection.data.data;
    faces && faces.forEach((rect) => {
      context.strokeStyle = 'magenta';
      context.strokeRect(rect.x, rect.y, rect.width, rect.height);
      context.font = '11px Helvetica';
      context.fillStyle = "magenta";
      context.fillText('x: ' + rect.x + 'px', rect.x + rect.width + 5, rect.y + 11);
      context.fillText('y: ' + rect.y + 'px', rect.x + rect.width + 5, rect.y + 22);
    });
  }

  render() {
    return (
      <div>
        <canvas
          ref={(element) => { this.elements['canvas'] = element; }}
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
