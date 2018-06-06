import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { defaultAction, getActionServer } from './action.js';

const logger = log.getLogger('vision');

export const VisionActions = new Mongo.Collection('vision_actions');


if (Meteor.isClient) {

  // Code below are adapted from
  //   https://github.com/tensorflow/tfjs-models/blob/master/posenet/demos/camera.js
  //   https://github.com/tensorflow/tfjs-models/blob/master/posenet/demos/demo_util.js
  //   https://github.com/eduardolundgren/tracking.js/blob/master/examples/face_camera.html

  import dat from 'dat.gui';
  import Stats from 'stats.js';
  import * as posenet from '@tensorflow-models/posenet';
  import 'tracking';
  import 'tracking/build/data/face-min.js';

  const color = 'aqua';
  const lineWidth = 2;

  const isAndroid = () => {
    return /Android/i.test(navigator.userAgent);
  }

  const isiOS = () => {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  const isMobile = () => {
    return isAndroid() || isiOS();
  }

  export async function setupCamera(video) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw 'Browser API navigator.mediaDevices.getUserMedia not available';
    }

    const mobile = isMobile();
    const stream = await navigator.mediaDevices.getUserMedia({
      'audio': false,
      'video': {
        facingMode: 'user',
        width: mobile ? undefined : this.width,
        height: mobile ? undefined: this.height}
    });
    video.srcObject = stream;

    return new Promise(resolve => {
      video.onloadedmetadata = () => {
        resolve(video);
      };
    });
  }

  function toTuple({ y, x }) {
    return [y, x];
  }

  /**
   * Draws a line on a canvas, i.e. a joint
   */
  function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
    ctx.beginPath();
    ctx.moveTo(ax * scale, ay * scale);
    ctx.lineTo(bx * scale, by * scale);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  /**
   * Draws a pose skeleton by looking up all adjacent keypoints/joints
   */
  function drawSkeleton(keypoints, minConfidence, ctx, scale = 1) {
    const adjacentKeyPoints = posenet.getAdjacentKeyPoints(
      keypoints, minConfidence);

    adjacentKeyPoints.forEach((keypoints) => {
      drawSegment(toTuple(keypoints[0].position),
        toTuple(keypoints[1].position), color, scale, ctx);
    });
  }

  /**
   * Draw pose keypoints onto a canvas
   */
  function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {
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

  // TODO: Move viz code out from this class
  export class PoseNetAction {

    constructor(video, canvas) {
      this._video = video;
      this._canvas = canvas;

      this._stats = new Stats();
      this._guiState = {
        algorithm: 'single-pose',
        input: {
          mobileNetArchitecture: isMobile() ? '0.50' : '1.01',
          outputStride: 16,
          imageScaleFactor: 0.2,
        },
        singlePoseDetection: {
          minPoseConfidence: 0.1,
          minPartConfidence: 0.5,
        },
        multiPoseDetection: {
          maxPoseDetections: 2,
          minPoseConfidence: 0.1,
          minPartConfidence: 0.3,
          nmsRadius: 20.0,
        },
        output: {
          showVideo: true,
          showSkeleton: true,
          showPoints: true,
        },
        net: null,
      };
    }

    setupFPS() {
      this._stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
      document.body.appendChild(this._stats.dom);  // TODO: make the GUI location customizable
    }

    setupGui() {
      // TODO: make the GUI location customizable
      const gui = new dat.GUI({ width: 300 });

      // The single-pose algorithm is faster and simpler but requires only one person to be
      // in the frame or results will be innaccurate. Multi-pose works for more than 1 person
      const algorithmController = gui.add(
        this._guiState, 'algorithm', ['single-pose', 'multi-pose']);

      // The input parameters have the most effect on accuracy and speed of the network
      let input = gui.addFolder('Input');
      // Architecture: there are a few PoseNet models varying in size and accuracy. 1.01
      // is the largest, but will be the slowest. 0.50 is the fastest, but least accurate.
      const architectureController =
        input.add(this._guiState.input, 'mobileNetArchitecture', ['1.01', '1.00', '0.75', '0.50']);
      // Output stride:  Internally, this parameter affects the height and width of the layers
      // in the neural network. The lower the value of the output stride the higher the accuracy
      // but slower the speed, the higher the value the faster the speed but lower the accuracy.
      input.add(this._guiState.input, 'outputStride', [8, 16, 32]);
      // Image scale factor: What to scale the image by before feeding it through the network.
      input.add(this._guiState.input, 'imageScaleFactor').min(0.2).max(1.0);
      input.open();

      // Pose confidence: the overall confidence in the estimation of a person's
      // pose (i.e. a person detected in a frame)
      // Min part confidence: the confidence that a particular estimated keypoint
      // position is accurate (i.e. the elbow's position)
      let single = gui.addFolder('Single Pose Detection');
      single.add(this._guiState.singlePoseDetection, 'minPoseConfidence', 0.0, 1.0);
      single.add(this._guiState.singlePoseDetection, 'minPartConfidence', 0.0, 1.0);
      single.open();

      let multi = gui.addFolder('Multi Pose Detection');
      multi.add(
        this._guiState.multiPoseDetection, 'maxPoseDetections').min(1).max(20).step(1);
      multi.add(this._guiState.multiPoseDetection, 'minPoseConfidence', 0.0, 1.0);
      multi.add(this._guiState.multiPoseDetection, 'minPartConfidence', 0.0, 1.0);
      // nms Radius: controls the minimum distance between poses that are returned
      // defaults to 20, which is probably fine for most use cases
      multi.add(this._guiState.multiPoseDetection, 'nmsRadius').min(0.0).max(40.0);

      let output = gui.addFolder('Output');
      output.add(this._guiState.output, 'showVideo');
      output.add(this._guiState.output, 'showSkeleton');
      output.add(this._guiState.output, 'showPoints');
      output.open();


      architectureController.onChange((architecture) => {
        this._guiState.changeToArchitecture = architecture;
      });

      algorithmController.onChange((value) => {
        switch (this._guiState.algorithm) {
          case 'single-pose':
            multi.close();
            single.open();
            break;
          case 'multi-pose':
            single.close();
            multi.open();
            break;
        }
      });
    }

    // TODO: move drawing code out
    async detectPoseInRealTime() {
      this._guiState.net = await posenet.load();

      const ctx = this._canvas.getContext('2d');
      const flipHorizontal = true; // since images are being fed from a webcam

      this._canvas.width = this._video.width;
      this._canvas.height = this._video.height;

      const poseDetectionFrame = async () => {
        if (this._guiState.changeToArchitecture) {
          // Important to purge variables and free up GPU memory
          this._guiState.net.dispose();

          // Load the PoseNet model weights for either the 0.50, 0.75, 1.00, or 1.01 version
          this._guiState.net = await posenet.load(Number(this._guiState.changeToArchitecture));

          this._guiState.changeToArchitecture = null;
        }

        // Begin monitoring code for frames per second
        this._stats.begin();

        // Scale an image down to a certain factor. Too large of an image will slow down
        // the GPU
        const imageScaleFactor = this._guiState.input.imageScaleFactor;
        const outputStride = Number(this._guiState.input.outputStride);

        let poses = [];
        let minPoseConfidence;
        let minPartConfidence;
        switch (this._guiState.algorithm) {
          case 'single-pose':
            const pose = await this._guiState.net.estimateSinglePose(this._video, imageScaleFactor, flipHorizontal, outputStride);
            poses.push(pose);

            minPoseConfidence = Number(
              this._guiState.singlePoseDetection.minPoseConfidence);
            minPartConfidence = Number(
              this._guiState.singlePoseDetection.minPartConfidence);
            break;
          case 'multi-pose':
            poses = await this._guiState.net.estimateMultiplePoses(this._video, imageScaleFactor, flipHorizontal, outputStride,
              this._guiState.multiPoseDetection.maxPoseDetections,
              this._guiState.multiPoseDetection.minPartConfidence,
              this._guiState.multiPoseDetection.nmsRadius);

            minPoseConfidence = Number(this._guiState.multiPoseDetection.minPoseConfidence);
            minPartConfidence = Number(this._guiState.multiPoseDetection.minPartConfidence);
            break;
        }

        ctx.clearRect(0, 0, this._video.width, this._video.height);

        if (this._guiState.output.showVideo) {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.translate(-this._video.width, 0);
          ctx.drawImage(this._video, 0, 0, this._video.width, this._video.height);
          ctx.restore();
        }

        // For each pose (i.e. person) detected in an image, loop through the poses
        // and draw the resulting skeleton and keypoints if over certain confidence
        // scores
        poses.forEach(({ score, keypoints }) => {
          if (score >= minPoseConfidence) {
            if (this._guiState.output.showPoints) {
              drawKeypoints(keypoints, minPartConfidence, ctx);
            }
            if (this._guiState.output.showSkeleton) {
              drawSkeleton(keypoints, minPartConfidence, ctx);
            }
          }
        });

        // End monitoring code for frames per second
        this._stats.end();

        requestAnimationFrame(poseDetectionFrame);
      }

      poseDetectionFrame();
    }
  }


  const trackFaceActions = {};

  export const serveFaceTrackingAction = (id, video, canvas) => {
    if (trackFaceActions[id]) {
      logger.debug(`[serveFaceTrackingAction] Skipping; already serving an action with id: ${id}`);
      return;
    }

    // setup tracker
    const context = canvas.getContext('2d');

    const tracker = new tracking.ObjectTracker('face');
    tracker.setInitialScale(4);
    tracker.setStepSize(2);
    tracker.setEdgesDensity(0.1);
    tracking.track(video, tracker, {camera: true});

    tracker.on('track', (event) => {
      context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      event.data.forEach((rect) => {
        context.strokeStyle = '#a64ceb';
        context.strokeRect(rect.x, rect.y, rect.width, rect.height);
        context.font = '11px Helvetica';
        context.fillStyle = '#fff';
        context.fillText('x: ' + rect.x + 'px', rect.x + rect.width + 5, rect.y + 11);
        context.fillText('y: ' + rect.y + 'px', rect.x + rect.width + 5, rect.y + 22);
      });
    });

    // setup action server
    const actionServer = getActionServer(VisionActions, id);

    actionServer.registerGoalCallback((actionGoal) => {
      logger.debug('[serveFaceTrackingAction] actionGoal', actionGoal);
      // TODO: change
    });

    actionServer.registerPreemptCallback((cancelGoal) => {
      logger.debug('[serveFaceTrackingAction] cancelGoal', cancelGoal);
      // change the tracker setting
    });

    trackFaceActions[id] = actionServer;
    return actionServer;
  }

}


if (Meteor.isServer) {

  VisionActions.allow({
    insert: (userId, doc) => {
      return false;
    },
    update: (userId, doc, fields, modifier) => {
      return userId &&
        (doc.owner === userId);
    },
    remove: (userId, doc) => {
       return userId &&
        (doc.owner === userId);
    },
    fetch: ['owner']
  });


  Meteor.publish('vision_actions', function visionActionsPublication() {
    // TODO: restrict access based on user permission; right now all docs are public!
    return VisionActions.find();
  });


  Meteor.methods({
    'vision_actions.addUser'(userId = this.userId) {
      if (!Meteor.users.findOne(userId)) {
        throw new Meteor.Error('invalid-input', `Invalid userId: ${userId}`);
      }

      if (VisionActions.findOne({owner: userId})) {
        logger.warn(`Skipping; user ${this.userId} already has vidion action document`);
        return;
      }
      VisionActions.insert(Object.assign({
        owner: userId,
        type: 'face_tracking',
      }, defaultAction));
    }
  });
}
