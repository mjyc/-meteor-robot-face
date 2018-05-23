import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { defaultAction, getActionServer } from './action.js';  // TODO: implement a speech action client wrapper

const logger = log.getLogger('action');

export const Speech = new Mongo.Collection('speech');


if (Meteor.isClient) {

  const speechSynthesisActions = {};
  const speechRecognitionActions = {};

  export const serveSpeechSynthesisAction = (id, synth) => {

    if (speechSynthesisActions[id]) {
      logger.debug(`[serveSpeechSynthesisAction] Skipping; already serving an action with id: ${id}`);
      return;
    }

    const actionServer = getActionServer(Speech, id);

    actionServer.registerGoalCallback((actionGoal) => {
      const utterThis = new SpeechSynthesisUtterance(actionGoal.goal.text);
      utterThis.onend = (event) => {
        actionServer.setSucceeded(event);
      }
      utterThis.onerror = (event) => {
        actionServer.setAborted(event);
      }
      synth.speak(utterThis);
    });

    actionServer.registerPreemptCallback((cancelGoal) => {
      synth.cancel();
      actionServer.setPreempted();
    });

    speechSynthesisActions[id] = actionServer;
  }

  export const serveSpeechRecognitionAction = (id) => {
    if (speechRecognitionActions[id]) {
      logger.debug(`[serveSpeechSynthesisAction] Skipping; already serving an action with id: ${id}`);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const actionServer = getActionServer(Speech, id);

    recognition.addEventListener('speechstart', () => {
      console.log('Speech has been detected.');
    });

    recognition.addEventListener('result', (e) => {
      console.log('Result has been detected.', e);

      let last = e.results.length - 1;
      let text = e.results[last][0].transcript;

      // outputYou.textContent = text;
      console.log('Confidence: ' + e.results[0][0].confidence);

      actionServer.setSucceeded();
    });


    actionServer.registerGoalCallback((actionGoal) => {
      recognition.start();
    });

    actionServer.registerPreemptCallback((cancelGoal) => {
      actionServer.setPreempted();
    });

    speechRecognitionActions[id] = actionServer;
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
