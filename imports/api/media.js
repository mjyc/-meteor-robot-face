import log from 'meteor/mjyc:loglevel';
import util from 'util';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { defaultAction, getActionServer } from 'meteor/mjyc:action';

const logger = log.getLogger('media');

export const MediaActions = new Mongo.Collection('media_actions');

export const MediaFiles = new Mongo.Collection('media_files');


if (Meteor.isClient) {

  export class SoundPlayAction {
    constructor(collection, id) {
      this._as = getActionServer(collection, id);
      this._as.registerGoalCallback(this.goalCB.bind(this));
      this._as.registerPreemptCallback(this.preemptCB.bind(this));
    }

    goalCB(actionGoal) {
      const mediaFile = MediaFiles.findOne({name: actionGoal.goal.name});
      if (!mediaFile) {
        this._as.setAborted({
          message: `Invalid input: ${util.inspect(actionGoal, true, null)}; make sure it has ".goal.name" field`
        });
        return;
      }
      soundPlayer = new Audio(mediaFile.data);
      soundPlayer.onended = (event) => {
        this._as.setSucceeded();
      }
      soundPlayer.play();
    }

    preemptCB(cancelGoal) {
      if (soundPlayer) {
        soundPlayer.pause();
      }
      this._as.setPreempted();
    }
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
    // TODO: restrict access based on user permission; right now all docs are public!
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
