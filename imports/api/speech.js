import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { defaultAction, getActionServer } from 'meteor/mjyc:action';

const logger = log.getLogger('speech');

export const SpeechActions = new Mongo.Collection('speech_actions');


if (Meteor.isClient) {

  export class SpeechSynthesisAction {
    constructor(collection, id) {
      this._as = getActionServer(collection, id);
      this._as.registerGoalCallback(this.goalCB.bind(this));
      this._as.registerPreemptCallback(this.preemptCB.bind(this));

      this._synth = window.speechSynthesis;
    }

    goalCB(actionGoal) {
      const utterThis = new SpeechSynthesisUtterance();
      ['lang', 'pitch', 'rate', 'text', 'volume'].map((param) => {
        if (param in actionGoal.goal) utterThis[param] = actionGoal.goal[param];
      });
      logger.debug('[SpeechSynthesisAction.goalCB] utterThis:', utterThis);
      utterThis.onend = (event) => {
        this._as.setSucceeded(event);
      }
      utterThis.onerror = (event) => {
        this._as.setAborted(event.error);
      }
      this._synth.speak(utterThis);
    }

    preemptCB(cancelGoal) {
      this._synth.cancel();
      this._as.setPreempted();
    }
  }

  const SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
  const SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;

  export class SpeechRecognitionAction {
    constructor(collection, id) {
      this._as = getActionServer(collection, id);
      this._as.registerGoalCallback(this.goalCB.bind(this));
      this._as.registerPreemptCallback(this.preemptCB.bind(this));

      this._recognition = new SpeechRecognition();
    }

    goalCB(actionGoal) {
      this._recognition.abort();
      ['lang', 'continuous', 'interimResults', 'maxAlternatives', 'serviceURI'].map((param) => {
        if (param in actionGoal.goal) this._recognition[param] = actionGoal.goal[param];
      });
      if ('grammars' in actionGoal.goal) {
        const speechRecognitionList = new SpeechGrammarList();
        actionGoal.goal.grammars.map(({string, weight = 1} = {}) => {
          speechRecognitionList.addFromString(string, weight);
        });
        this._recognition.grammars = speechRecognitionList;
      }

      this._recognition.onend = (event) => {
        logger.debug('[SpeechRecognitionAction.goalCB.onend] event:', event);
        this._as.setSucceeded(event.error);
      };
      this._recognition.onerror = (event) => {
        logger.debug('[SpeechRecognitionAction.goalCB.onerror] event:', event);
        this._as.setAborted(event.error);
      };
      this._recognition.onresult = (event) => {
        logger.debug('[SpeechRecognitionAction.goalCB.onresult] event:', event);
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
        this._as.setSucceeded(result);
      };

      this._recognition.start();
    }

    preemptCB(cancelGoal) {
      this._recognition.cancel();
      this._as.setPreempted();
    }
  }

}


if (Meteor.isServer) {

  SpeechActions.allow({
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


  Meteor.publish('speech_actions', function speechPublication() {
    // TODO: restrict access based on user permission; right now all docs are public!
    return SpeechActions.find();
  });


  Meteor.methods({
    'speech_actions.addUser'(userId = this.userId) {
      if (!Meteor.users.findOne(userId)) {
        throw new Meteor.Error('invalid-input', `Invalid userId: ${userId}`);
      }

      if (SpeechActions.findOne({owner: userId})) {
        logger.warn(`Skipping; user ${this.userId} already has speech action documents`);
        return;
      }
      SpeechActions.insert(Object.assign({owner: userId, type: 'synthesis'}, defaultAction));
      SpeechActions.insert(Object.assign({owner: userId, type: 'recognition'}, defaultAction));
    }
  });

}
