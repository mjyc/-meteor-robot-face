import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { defaultAction, getActionServer } from './action.js';  // TODO: implement a speech action client wrapper

const logger = log.getLogger('action');

export const Speech = new Mongo.Collection('speech');


if (Meteor.isServer) {

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

} else {

  export const serveSpeechSynthesisAction = (id, synth) => {

    console.log(`[serveSpeechSynthesisAction] id: ${id}`);

    const as = getActionServer(Speech, id);

    as.on('goal', (actionGoal) => {
      console.log('goal', actionGoal);

      const utterThis = new SpeechSynthesisUtterance(actionGoal.goal.text);
      utterThis.onend = (event) => {
        console.log('SpeechSynthesisUtterance.onend');
        as._set({
          status: 'succeeded',
          results: {},
        });
      }
      synth.speak(utterThis);
    });

    as.on('cancel', (result) => {
      console.log('cancel', result);
      as._set({
        status: 'canceled',
        result: null,
      })
    });
  }

}
