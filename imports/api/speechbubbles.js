import log from 'meteor/mjyc:loglevel';
import { EventEmitter } from 'events';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { defaultAction, getActionServer } from 'meteor/mjyc:action';

const logger = log.getLogger('speechbubbles');

export const Speechbubbles = new Mongo.Collection('speechbubbles');


if (Meteor.isClient) {

  export class SpeechbubbleAction {
    constructor(collection, id) {
      this._collection = collection;
      this._id = id;
      this._speechbubbleId = Speechbubbles.findOne({actionId: id})._id;

      this._as = getActionServer(collection, id);
      this._as.registerGoalCallback(this.goalCB.bind(this));
      this._as.registerPreemptCallback(this.preemptCB.bind(this));
    }

    getSpeechbubble() {
      return Speechbubbles.findOne(this._speechbubbleId);
    }

    resetSpeechbubble(callback = () => {}) {
      Speechbubbles.update(this._speechbubbleId, {$set: {
        type: '',
        data: {},
      }}, callback);
    }

    goalCB(actionGoal) {
      Speechbubbles.update(this._speechbubbleId, {$set: {
        type: actionGoal.goal.type,
        data: actionGoal.goal.data,
      }});
    }

    preemptCB() {
      this._as.setPreempted();
    }
  }

}


if (Meteor.isServer) {

  Meteor.publish('speechbubbles', function speechbubblesPublication() {
    // TODO: restrict access based on user permission; right now all docs are public!
    return Speechbubbles.find();
  });

  // TODO: remove or update after prototyping, e.g., only "admin" should be able to edit this collection
  Speechbubbles.allow({
    insert: (userId, doc) => {
      return false;
    },
    update: (userId, doc, fields, modifier) => {
      return true;
    },
    remove: (userId, doc) => {
      return true;
    },
    fetch: ['owner']
  });

  Meteor.methods({
    'speechbubbles.insert'(owner, actionId) {
      check(owner, String);
      check(actionId, String);

      if (!Meteor.users.findOne(owner)) {
        throw new Meteor.Error('invalid-input', `Invalid owner: ${owner}`);
      }

      if (Speechbubbles.findOne({owner, actionId})) {
        logger.warn(`Skipping; user ${owner} already has speechbubble with "actionId: ${actionId}" field`);
        return;
      }
      Speechbubbles.insert(Object.assign({owner, actionId, type: '', data: {}}, defaultAction));
    },
  });

}
