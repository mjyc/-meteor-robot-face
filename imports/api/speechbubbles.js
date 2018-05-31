import util from 'util';
import { EventEmitter } from 'events';
import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

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

    const synth = window.speechSynthesis;
    const actionServer = getActionServer(Speechbubbles, id);

    actionServer.registerGoalCallback((actionGoal) => {

      Speechbubbles.update(id, {
        $set: {
          type: 'choices',
          choices: 'chocies',
        },
        $unset: {
          selected: '',
        }
      });

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

  Meteor.publish('speechbubbles', function speechbubblesPublication() {
    // TODO: restrict access based on user permission; right now all speechbubbles public!
    return Speechbubbles.find();
  });


  Meteor.methods({
    'speechbubbles.addUser'(userId = this.userId) {
      if (!Meteor.users.findOne(userId)) {
        throw new Meteor.Error('invalid-input', `Invalid userId: ${userId}`);
      }

      if (Speechbubbles.findOne({owner: userId, type: 'synthesis'})) {
        logger.warn(`Skipping; user ${this.userId} already has speech synthesis & recognition actions documents`);
        return;
      }

      Speechbubbles.insert(Object.assign({owner: userId, role: 'robot'}, defaultAction));
      Speechbubbles.insert(Object.assign({owner: userId, role: 'human'}, defaultAction));
    },
  });

}
