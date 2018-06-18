import log from 'meteor/mjyc:loglevel';
import util from 'util';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
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
  MediaFiles.allow({
    insert: (userId, doc) => {
      return false;
    },
    update: (userId, doc, fields, modifier) => {
      return userId && doc.owner === userId;
    },
    remove: (userId, doc) => {
      return userId && doc.owner === userId;
    },
    fetch: ['owner']
  });

  Meteor.publish('media_files', function mediaFilesPublication() {
    return MediaFiles.find();  // all media files are public!
  });

  Meteor.methods({
    'media_files.insert'(name, size, type, data) {
      check(name, String);
      check(size, Number);
      check(type, String);
      check(data, String);

      if (!this.userId) {
        throw new Meteor.Error('not-authorized');
      }

      const currentUser = Meteor.users.findOne(this.userId);
      MediaFiles.insert({
        name,
        size,
        type,
        data,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: this.userId,
        username: currentUser.username || currentUser.profile.name,
      });
    },
  });
}
