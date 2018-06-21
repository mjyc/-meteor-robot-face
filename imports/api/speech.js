import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import {
  Actions,
  defaultAction,
  getActionServer,
} from 'meteor/mjyc:action';

const logger = log.getLogger('speech');


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

    preemptCB() {
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

    preemptCB() {
      this._recognition.stop();
      this._as.setPreempted();
    }
  }

}
