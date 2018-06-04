import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { defaultAction, getActionServer } from './action.js';

const logger = log.getLogger('vision');

export const VisionActions = new Mongo.Collection('vision_actions');


if (Meteor.isClient) {

  import 'tracking';
  import 'tracking/build/data/face-min.js';

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
