import util from 'util';
import { EventEmitter } from 'events';
import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { defaultAction, getActionServer } from './action.js';

const logger = log.getLogger('speechbubbles');

const obj2str = (obj) => { return util.inspect(obj, true, null, true); }


export const Speechbubbles = new Mongo.Collection('speechbubbles');


if (Meteor.isClient) {

  const speechbubbleActions = {};

  export const serveSpeechbubbleAction = (id) => {
    if (speechbubbleActions[id]) {
      logger.debug(`[serveSpeechbubbleAction] Skipping; already serving an action with id: ${id}`);
      return;
    }

    const actionServer = getActionServer(Speechbubbles, id);

    actionServer.registerGoalCallback((actionGoal) => {
      // TODO: check actionGoal.goal

      // if input is img, and has query field, do something

      Speechbubbles.update(id, {
        $set: {
          type: actionGoal.goal.type,
          data: actionGoal.goal.data,
        }
      });

      if (actionGoal.goal.type === 'message') {
        actionServers.setSucceeded();
      }
    });

    actionServer.registerPreemptCallback((cancelGoal) => {
      synth.cancel();
      actionServer.setPreempted();
    });

    speechbubbleActions[id] = actionServer;
    return actionServer;
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
      }, defaultAction));
      Speechbubbles.insert(Object.assign({
        owner: userId,
        role: 'human',
        type: '',
      }, defaultAction));
    },
  });

}
