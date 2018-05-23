import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { defaultAction, getActionServer } from './action.js';  // TODO: implement a speech action client wrapper

const logger = log.getLogger('action');

export const Speech = new Mongo.Collection('speech');


if (Meteor.isClient) {

  const speechSynthesisActions = {};

  export const serveSpeechSynthesisAction = (id, synth) => {
    console.log('serveSpeechSynthesisAction called');

    if (speechSynthesisActions[id]) {
      logger.debug(`[serveSpeechSynthesisAction] Skipping; already serving an action with id: ${id}`);
      return;
    }

    console.log('serveSpeechSynthesisAction starting');

    const actionServer = getActionServer(Speech, id);

    actionServer.registerGoalCallback((actionGoal) => {
      console.log('goal', actionGoal);
      const utterThis = new SpeechSynthesisUtterance(actionGoal.goal.text);
      utterThis.onend = (event) => {
        console.log('SpeechSynthesisUtterance.onend');
        actionServer.setSucceeded();
      }
      synth.speak(utterThis);
    });

    actionServer.registerPreemptCallback((cancelGoal) => {
      console.log('cancel', cancelGoal, this);
      actionServer.setPreempted();
    });

    speechSynthesisActions[id] = actionServer;

    // speechSynthesisActions[id].on('goal', (actionGoal) => {
    //   console.log('goal', actionGoal);
    //   const utterThis = new SpeechSynthesisUtterance(actionGoal.goal.text);
    //   utterThis.onend = (event) => {
    //     console.log('SpeechSynthesisUtterance.onend');
    //     speechSynthesisActions[id]._set({
    //       status: 'succeeded',
    //       results: {},
    //     });
    //   }
    //   synth.speak(utterThis);
    // });

    // return speechSynthesisActions[id].on('cancel', (result) => {
    //   console.log('cancel', result);
    //   speechSynthesisActions[id]._set({
    //     status: 'canceled',
    //     result: null,
    //   })
    // });
  }

}


if (Meteor.isServer) {

  Speech.allow({
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


  Meteor.publish('speech', function speechPublication() {
    // TODO: restrict access based on user permission; right now all speechbubbles public!
    return Speech.find();
  });


  Meteor.methods({
    'speech.addUser'(userId = this.userId) {
      if (Speech.findOne({owner: userId, type: 'synthesis'})) {
        logger.warn(`Skipping; user ${this.userId} already has a speech synthesis action document`);
        return;
      }
      Speech.insert(Object.assign({owner: userId, type: 'synthesis'}, defaultAction));
    }
  });

}
