import log from 'meteor/mjyc:loglevel';
import util from 'util';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import {
  Actions,
  defaultAction,
  getActionServer,
} from 'meteor/mjyc:action';

const logger = log.getLogger('media');

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

    preemptCB() {
      if (soundPlayer) {
        soundPlayer.pause();
      }
      this._as.setPreempted();
    }
  }

}


if (Meteor.isServer) {

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
    // TODO: restrict access based on user permission; right now docs are public!
    return MediaFiles.find();
  });

}
