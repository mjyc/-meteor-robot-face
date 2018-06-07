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


  class PoseDetection {
    constructor(video) {
      this._video = video;

      this._net = null;
      this._params = {
        algorithm: 'single-pose',
        input: {
          mobileNetArchitecture: isMobile() ? '0.50' : '1.01',
          outputStride: 16,
          flipHorizontal: true,
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
      };
    }

    async detect() {
      if (!this._net) {
        this._net = await posenet.load(Number(this._params.input.mobileNetArchitecture));
      }
      if (this._params.changeToArchitecture) {
        this.net.dispose();
        this.net = await posenet.load(Number(this._params.changeToArchitecture));
        this._params.changeToArchitecture = null;
      }

      const imageScaleFactor = this._params.input.imageScaleFactor;
      const flipHorizontal = this._params.input.flipHorizontal;
      const outputStride = Number(this._params.input.outputStride);

      let poses = [];
      let minPoseConfidence;
      let minPartConfidence;
      switch (this._params.algorithm) {
        case 'single-pose':
          const pose = await this._net.estimateSinglePose(this._video, imageScaleFactor, flipHorizontal, outputStride);
          poses.push(pose);

          minPoseConfidence = Number(
            this._params.singlePoseDetection.minPoseConfidence);
          minPartConfidence = Number(
            this._params.singlePoseDetection.minPartConfidence);
          break;
        case 'multi-pose':
          poses = await this._net.estimateMultiplePoses(this._video, imageScaleFactor, flipHorizontal, outputStride,
            this._params.multiPoseDetection.maxPoseDetections,
            this._params.multiPoseDetection.minPartConfidence,
            this._params.multiPoseDetection.nmsRadius);

          minPoseConfidence = Number(this._params.multiPoseDetection.minPoseConfidence);
          minPartConfidence = Number(this._params.multiPoseDetection.minPartConfidence);
          break;
      }
      return poses;
    }
  }

  class FaceDetection {
    constructor(video) {
      this._video = video;

      this._tracker = new tracking.ObjectTracker('face');
      this._tracker.setInitialScale(4);
      this._tracker.setStepSize(2);
      this._tracker.setEdgesDensity(0.1);

      this._canvas = document.createElement('canvas');
      this._context = this._canvas.getContext('2d');
      this._canvas.width = this._video.width;
      this._canvas.height = this._video.height;
    }

    async detect() {
      this._context.drawImage(this._video, 0, 0, this._video.width, this._video.height);
      return new Promise(resolve => {
        this._tracker.once('track', (result) => {
          resolve(result.data);
        });
        tracking.trackCanvasInternal_(this._canvas, this._tracker);
      });
    }
  }

  export class DetectionAction {
    constructor(collection, id, video) {
      this._video = video;
      this._pose = new PoseDetection(this._video);
      this._face = new FaceDetection(this._video);
      this._intervalId = null;

      this._as = getActionServer(collection, id);
      this._as.registerGoalCallback(this.goalCB.bind(this));
      this._as.registerPreemptCallback(this.preemptCB.bind(this));

    }

    async goalCB({goal} = {}) {
      await setupCamera(this._video);

      const fps = (goal.fps && goal.fps > 0) ? goal.fps : 10;
      const interval = 1000 / fps;
      let start = Date.now();
      const execute = async () => {
        const elapsed = Date.now() - start;
        if (elapsed > interval) {
          start = Date.now();
          [poses, face] = await Promise.all([this._pose.detect(), this._face.detect()]);
          this._timeoutID = setTimeout(execute, 0);
        } else {
          this._timeoutID = setTimeout(execute, interval - elapsed);
        }
      }
      execute();
    }

    preemptCB() {
      clearTimeout(this._timeoutID);

      const tracks = this._video.srcObject.getVideoTracks();
      if (tracks.length != 1) {
        logger.error(`Invalid number of video tracks: ${tracks.length}`);
        this._as.setAborted();
        return;
      }
      tracks[0].stop();
      // NOTE: "tracks[0].onended" was not being called on stop and seems to set
      //   "tracks[0].readyState" to "ended" immediate; so considering stop sync
      this._as.setPreempted();
    }
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
