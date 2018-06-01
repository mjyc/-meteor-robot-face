import util from 'util';
import { EventEmitter } from 'events';
import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { Promise } from 'meteor/promise';
import { defaultAction, getActionServer } from './action.js';

const logger = log.getLogger('speechbubbles');

const obj2str = (obj) => { return util.inspect(obj, true, null, true); }


export const Speechbubbles = new Mongo.Collection('speechbubbles');


if (Meteor.isClient) {

  export class SpeechbubbleAction {
    constructor(collection, id, mediaFilesCollection) {
      this._collection = collection;
      this._id = id;
      this._mediaFilesCollection = mediaFilesCollection;

      this._as = getActionServer(collection, id);
      this._as.registerGoalCallback(this.goalCB.bind(this));
      this._as.registerPreemptCallback(this.preemptCB.bind(this));
    }

    resetSpeechbubble(callback = () => {}) {
      this._collection.update(this._id, {
        $set: {
          type: '',
          data: {},
        },
      }, callback);
    }

    goalCB(action) {
      this._collection.update(this._id, {
        $set: {
          type: action.goal.type,
          data: action.goal.data,
        }
      });
    }

    preemptCB() {
      this._as.setPreempted();
    }
  }

}


if (Meteor.isServer) {

  Speechbubbles.allow({
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


  Meteor.publish('speechbubbles', function speechbubblesPublication() {
    // TODO: restrict access based on user permission; right now all speechbubbles public!
    return Speechbubbles.find();
  });


  Meteor.methods({
    'speechbubbles.addUser'(userId = this.userId) {
      if (!Meteor.users.findOne(userId)) {
        throw new Meteor.Error('invalid-input', `Invalid userId: ${userId}`);
      }

      if (Speechbubbles.findOne({owner: userId})) {
        logger.warn(`Skipping; user ${this.userId} already has speechbubble documents`);
        return;
      }

      Speechbubbles.insert(Object.assign({
        owner: userId,
        role: 'robot',
        type: '',
        data: {},
      }, defaultAction));
      Speechbubbles.insert(Object.assign({
        owner: userId,
        role: 'human',
        type: '',
        data: {},
      }, defaultAction));
    },
  });

}
