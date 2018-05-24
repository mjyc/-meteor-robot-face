import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { defaultAction, getActionServer } from './action.js';  // TODO: implement a speech action client wrapper

const logger = log.getLogger('action');

export const Speech = new Mongo.Collection('speech');


if (Meteor.isClient) {

  const speechSynthesisActions = {};
  const speechRecognitionActions = {};

  export const serveSpeechSynthesisAction = (id) => {

    if (speechSynthesisActions[id]) {
      logger.debug(`[serveSpeechSynthesisAction] Skipping; already serving an action with id: ${id}`);
      return;
    }

    const synth = window.speechSynthesis;
    const actionServer = getActionServer(Speech, id);

    actionServer.registerGoalCallback((actionGoal) => {
      const utterThis = new SpeechSynthesisUtterance();
      ['lang', 'pitch', 'rate', 'text', 'volume'].map((param) => {
        if (param in actionGoal.goal) utterThis[param] = actionGoal.goal[param];
      });
      logger.debug(`[serveSpeechSynthesisAction] utterThis: ${utterThis}`);
      utterThis.onend = (event) => {
        actionServer.setSucceeded(event);
      }
      utterThis.onerror = (event) => {
        actionServer.setAborted(event.error);
      }
      synth.speak(utterThis);
    });

    actionServer.registerPreemptCallback((cancelGoal) => {
      synth.cancel();
      actionServer.setPreempted();
    });

    speechSynthesisActions[id] = actionServer;
    return actionServer;
  }

  export const serveSpeechRecognitionAction = (id) => {
    if (speechRecognitionActions[id]) {
      logger.debug(`[serveSpeechSynthesisAction] Skipping; already serving an action with id: ${id}`);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    const actionServer = getActionServer(Speech, id);

    actionServer.registerGoalCallback((actionGoal) => {
      recognition.abort();
      ['grammars', 'lang', 'continuous', 'interimResults', 'maxAlternatives', 'serviceURI'].map((param) => {
        if (param in actionGoal.goal) recognition[param] = actionGoal.goal[param];
      });

      recognition.onend = (event) => {
        logger.debug('[serveSpeechSynthesisAction] onend event:', event);
      };
      recognition.onerror = (event) => {
        logger.debug('[serveSpeechSynthesisAction] onerror event:', event);
        actionServer.setAborted(event.error);
      };
      recognition.onresult = (event) => {
        logger.debug('[serveSpeechSynthesisAction] onresult event:', event);
        // NOTE: SpeechRecognition returns SpeechRecognitionResultList as a
        //   result; see https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionResultList
        const result = {
          length: event.results.length,
        };
        for (let i = event.results.length - 1; i >= 0; i--) {
          result[i] = {
            isFinal: event.results[i].isFinal,
            length: event.results[i].length,
          };
          for (let j = event.results[i].length - 1; j >= 0; j--) {
            result[i][j] = {
              transcript: event.results[i][j].transcript,
              confidence: event.results[i][j].confidence,
            };
          }
        }
        console.log('result', result);
        actionServer.setSucceeded(result);
      };

      recognition.start();
    });

    actionServer.registerPreemptCallback((cancelGoal) => {
      recognition.abort();
      actionServer.setPreempted();
    });

    speechRecognitionActions[id] = actionServer;
    return actionServer;
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
      Speech.insert(Object.assign({owner: userId, type: 'recognition'}, defaultAction));
    }
  });

}
