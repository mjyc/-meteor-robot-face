import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { defaultAction, getActionServer } from './action.js';

const logger = log.getLogger('sound');

export const MediaActions = new Mongo.Collection('media_actions');

export const MediaFiles = new Mongo.Collection('media_files');


if (Meteor.isClient) {

  // const soundPlayActions = {};

  // export const serveSoundPlayAction = (id) => {

  //   if (soundPlayActions[id]) {
  //     logger.debug(`[serveSoundPlayAction] Skipping; already serving an action with id: ${id}`);
  //     return;
  //   }

  //   const soundPlayer = new Audio();
  //   const actionServer = getActionServer(Sounds, id);

  //   actionServer.registerGoalCallback((actionGoal) => {

  //     soundPlayer.load(Speech.findOne(id).data);

  //     soundPlayer.play();
  //   });

  //   actionServer.registerPreemptCallback((cancelGoal) => {
  //     synth.cancel();
  //     actionServer.setPreempted();
  //   });

  //   speechSynthesisActions[id] = actionServer;
  //   return actionServer;
  // }
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


  Meteor.publish('medial_actions', function mediaActionsPublication() {
    // TODO: restrict access based on user permission; right now all media actions are public!
    return MediaActions.find();
  });


  Meteor.methods({
    'media_actions.addUser'(userId = this.userId) {
      if (MediaActions.findOne({owner: userId})) {
        logger.warn(`Skipping; user ${this.userId} already has media action document`);
        return;
      }
      MediaActions.insert(Object.assign({owner: userId}, defaultAction));
      MediaActions.insert(Object.assign({owner: userId}, defaultAction));
      MediaActions.insert(Object.assign({owner: userId}, defaultAction));
    }
  });


  // TODO: remove or update after prototyping
  MediaActions.allow({
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
    return MediaActions.find();
  });

  // Meteor.methods({
  //   'media_files.addUser'(userId = this.userId) {
  //     //
  //   }
  // });
}
