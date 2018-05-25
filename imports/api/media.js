import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { defaultAction, getActionServer } from './action.js';

const logger = log.getLogger('media');

export const MediaActions = new Mongo.Collection('media_actions');

export const MediaFiles = new Mongo.Collection('media_files');


if (Meteor.isClient) {

  const soundPlayActions = {};

  export const serveSoundPlayAction = (id) => {

    if (soundPlayActions[id]) {
      logger.debug(`[serveSoundPlayAction] Skipping; already serving an action with id: ${id}`);
      return;
    }

    // let soundPlayer = new Audio();
    // soundPlayer.onload = () => {
    //     console.log('onload');
    //   };
    //   soundPlayer.onloadeddata = () => {
    //     console.log('onloadeddata');
    //   };
    let soundPlayer = null;
    const actionServer = getActionServer(MediaActions, id);

    actionServer.registerGoalCallback((actionGoal) => {
      // soundPlayer.load(MediaFiles.findOne({filename: actionGoal.goal.name}).data);
      // soundPlayer.onended = () => {
      //   console.log('onended');
      // }
      soundPlayer = new Audio(MediaFiles.findOne({filename: actionGoal.goal.name}).data);
      soundPlayer.onclose = () => {
        console.log('onclose');
      }
      soundPlayer.oncancel = () => {
        console.log('oncancel');
      }
      soundPlayer.play();
    });

    actionServer.registerPreemptCallback((cancelGoal) => {
      if (soundPlayer) {

      }
      // soundPlayer.pause();
      actionServer.setPreempted();
    });

    soundPlayActions[id] = actionServer;
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
      if (MediaActions.findOne({owner: userId})) {
        logger.warn(`Skipping; user ${this.userId} already has media action document`);
        return;
      }
      MediaActions.insert(Object.assign({owner: userId}, defaultAction));
      // MediaActions.insert(Object.assign({owner: userId}, defaultAction));
      // MediaActions.insert(Object.assign({owner: userId}, defaultAction));
    }
  });


  // TODO: remove or update after prototyping
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

  // Meteor.methods({
  //   'media_files.addUser'(userId = this.userId) {
  //     //
  //   }
  // });
}
