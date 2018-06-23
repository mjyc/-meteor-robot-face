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
      this._speechbubbleId = Speechbubbles.findOne({actionId: id})._id;

      this._as = getActionServer(collection, id);
      this._as.registerGoalCallback(this.goalCB.bind(this));
      this._as.registerPreemptCallback(this.preemptCB.bind(this));
    }

    getActionServer() {
      return this._as;
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
      Speechbubbles.update(this._speechbubbleId, {$set: {
        type: '',
        data: {},
      }});
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
      return userId && doc.owner === userId;
    },
    remove: (userId, doc) => {
      return userId && doc.owner === userId;
    },
    fetch: ['owner']
  });

  Meteor.publish('speechbubbles', function speechbubblesPublication() {
    return Speechbubbles.find({owner: this.userId});
  });

  Meteor.methods({
    'speechbubbles.insert'(owner, actionId) {
      check(owner, String);
      check(actionId, String);

      if (!Meteor.users.findOne(owner)) {
        throw new Meteor.Error('invalid-input', `Invalid owner: ${owner}`);
      }

      if (Speechbubbles.findOne({owner, actionId})) {
        logger.warn(`Skipping; user ${owner} already has a speechbubble doc with "actionId: ${actionId}" field`);
        return;
      }

      Speechbubbles.insert(Object.assign({owner, actionId, type: '', data: {}}, defaultAction));
    },
    'speechbubbles.remove'(owner) {

      if (this.userId || this.connection) {  // server-side call only
        throw new Meteor.Error('not-authorized');
      }

      Speechbubbles.remove({owner});
    }
  });
}
