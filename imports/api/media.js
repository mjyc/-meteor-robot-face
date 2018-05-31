import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { defaultAction, getActionServer } from './action.js';

const logger = log.getLogger('media');

export const MediaActions = new Mongo.Collection('media_actions');

export const MediaFiles = new Mongo.Collection('media_files');


if (Meteor.isClient) {

  const playSoundActions = {};

  export const serveSoundPlayAction = (id) => {

    if (playSoundActions[id]) {
      logger.debug(`[serveSoundPlayAction] Skipping; already serving an action with id: ${id}`);
      return;
    }

    let soundPlayer = null;
    const actionServer = getActionServer(MediaActions, id);

    actionServer.registerGoalCallback((actionGoal) => {
      soundPlayer = new Audio(MediaFiles.findOne({name: actionGoal.goal.name}).data);
      soundPlayer.onended = (event) => {
        actionServer.setSucceeded();
      }
      soundPlayer.play();
    });

    actionServer.registerPreemptCallback((cancelGoal) => {
      if (soundPlayer) {
        soundPlayer.pause();
      }
      actionServer.setPreempted();
    });

    playSoundActions[id] = actionServer;
    return actionServer;
  }
}


if (Meteor.isServer) {

  MediaActions.allow({
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


  Meteor.publish('media_actions', function mediaActionsPublication() {
    // TODO: restrict access based on user permission; right now all media actions are public!
    return MediaActions.find();
  });


  Meteor.methods({
    'media_actions.addUser'(userId = this.userId) {
      if (!Meteor.users.findOne(userId)) {
        throw new Meteor.Error('invalid-input', `Invalid userId: ${userId}`);
      }

      if (MediaActions.findOne({owner: userId})) {
        logger.warn(`Skipping; user ${this.userId} already has media action documents`);
        return;
      }
      MediaActions.insert(Object.assign({owner: userId, type: 'sound'}, defaultAction));
      MediaActions.insert(Object.assign({owner: userId, type: 'image'}, defaultAction));
      MediaActions.insert(Object.assign({owner: userId, type: 'video'}, defaultAction));
    }
  });


  // TODO: remove or update after prototyping, e.g., only "admin" should be able to edit this collection
  MediaFiles.allow({
    insert: (userId, doc) => {
      return true;
    },
    update: (userId, doc, fields, modifier) => {
      return true;
    },
    remove: (userId, doc) => {
      return true;
    },
    fetch: ['owner']
  });

  Meteor.publish('media_files', function mediaFilesPublication() {
    // TODO: restrict access based on user permission; right now all media files are public!
    return MediaFiles.find();
  });
}
