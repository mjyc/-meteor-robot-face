import log from 'meteor/mjyc:loglevel';
import * as posenet from '@tensorflow-models/posenet';
import React, { Component } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import { Actions } from 'meteor/mjyc:action';
import { Detections } from '../api/vision.js';

const logger = log.getLogger('VisionViz');


// IMPORTANT! This is an experimental feature and hence hidden by default. You
//  can display the visualizer by manually changing 'display' css property.

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

    this.elements = {};
  }

  componentDidUpdate(prevProps) {
    if (!this.props.video || this.props.loading) {
      logger.debug('Input video is not available or subscribing to collections');
      return;
    }

    const context = this.elements.canvas.getContext('2d');
    const width = this.elements.canvas.width;
    const height = this.elements.canvas.height;

    const poseDetection = this.props.detections.pose;
    const algorithm = poseDetection.data.params.algorithm;
    let minPoseConfidence
      = poseDetection.data.params[algorithm].minPoseConfidence;
    let minPartConfidence
      = poseDetection.data.params[algorithm].minPartConfidence;

    context.clearRect(0, 0, width, height);
    context.save();
    context.scale(-1, 1);
    context.translate(-width, 0);
    context.drawImage(this.props.video, 0, 0, width, height);
    context.restore();

    const poses = poseDetection.data.data;
    poses && poses.forEach(({ score, keypoints }) => {
      if (score >= minPoseConfidence) {
        drawKeypoints(keypoints, minPartConfidence, context);
        drawSkeleton(keypoints, minPartConfidence, context);
      }
    });

    const faceDetection = this.props.detections.face;
    const faces = faceDetection.data.data;
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
      <div style={{display: this.props.show ? 'block' : 'none'}}>
        <canvas
          ref={(element) => { this.elements['canvas'] = element; }}
          width={this.props.width ? this.props.width : "600px"}
          height={this.props.height ? this.props.height : "500px"}
        ></canvas>
      </div>
    );
  }
}

export default withTracker(({query}) => {
  const actionsHandle = Meteor.subscribe('actions');
  const detectionsHandle = Meteor.subscribe('detections');
  const loading = !actionsHandle.ready() || !detectionsHandle.ready();

  const actions = {
    poseDetection: Actions.findOne(Object.assign({type: 'poseDetection'}, query)),
    faceDetection: Actions.findOne(Object.assign({type: 'faceDetection'}, query)),
  }
  const detections = {
    pose: !loading ? Detections.findOne({actionId: actions.poseDetection._id})
      : undefined,
    face: !loading ? Detections.findOne({actionId: actions.faceDetection._id})
      : undefined,
  }

  return {
    loading,
    detections,
  };
})(VisionViz);
