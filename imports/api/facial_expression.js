import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import {
  Actions,
  defaultAction,
  getActionServer,
} from 'meteor/mjyc:action';

const logger = log.getLogger('facial_expresison');


if (Meteor.isClient) {

  export class EyeController {
    constructor(elements = {}) {
      this._blinkTimeoutID = null;

      this.setElements(elements);
    }

    setElements({
      leftEye,
      rightEye,
      upperLeftEyelid,
      upperRightEyelid,
      lowerLeftEyelid,
      lowerRightEyelid,
    } = {}) {
      this._leftEye = leftEye;
      this._rightEye = rightEye;
      this._upperLeftEyelid = upperLeftEyelid;
      this._upperRightEyelid = upperRightEyelid;
      this._lowerLeftEyelid = lowerLeftEyelid;
      this._lowerRightEyelid = lowerRightEyelid;
      return this;
    }

    _createKeyframes ({
      tgtTranYVal = 0,
      tgtRotVal = 0,
      enteredOffset = 1/3,
      exitingOffset = 2/3,
    } = {}) {
      return [
        {transform: `translateY(0px) rotate(0deg)`, offset: 0.0},
        {transform: `translateY(${tgtTranYVal}vh) rotate(${tgtRotVal}deg)`, offset: enteredOffset},
        {transform: `translateY(${tgtTranYVal}vh) rotate(${tgtRotVal}deg)`, offset: exitingOffset},
        {transform: `translateY(0px) rotate(0deg)`, offset: 1.0},
      ];
    }

    express({
      type = '',
      // level = 3,  // 1: min, 5: max
      duration = 1000,
      enterDuration = 75,
      exitDuration = 75,
    }) {
      if (!this._leftEye) {  // assumes all elements are always set together
        logger.warn('Skipping; eye elements are not set');
      }

      const options = {
        duration: duration,
      }

      switch(type) {
        case 'happy':
          return {
            lowerLeftEyelid: this._lowerLeftEyelid.animate(this._createKeyframes({
              tgtTranYVal: -20,
              tgtRotVal: 30,
              enteredOffset: enterDuration / duration,
              exitingOffset: 1 - (exitDuration / duration),
            }), options),
            lowerRightEyelid: this._lowerRightEyelid.animate(this._createKeyframes({
              tgtTranYVal: -20,
              tgtRotVal: -30,
              enteredOffset: enterDuration / duration,
              exitingOffset: 1 - (exitDuration / duration),
            }), options),
          };

        case 'sad':
          return {
            upperLeftEyelid: this._upperLeftEyelid.animate(this._createKeyframes({
              tgtTranYVal: 13.33,
              tgtRotVal: -20,
              enteredOffset: enterDuration / duration,
              exitingOffset: 1 - (exitDuration / duration),
            }), options),
            upperRightEyelid: this._upperRightEyelid.animate(this._createKeyframes({
              tgtTranYVal: 13.33,
              tgtRotVal: 20,
              enteredOffset: enterDuration / duration,
              exitingOffset: 1 - (exitDuration / duration),
            }), options),
          };

        case 'angry':
          return {
            upperLeftEyelid: this._upperLeftEyelid.animate(this._createKeyframes({
              tgtTranYVal: 8.33,
              tgtRotVal: 30,
              enteredOffset: enterDuration / duration,
              exitingOffset: 1 - (exitDuration / duration),
            }), options),
            upperRightEyelid: this._upperRightEyelid.animate(this._createKeyframes({
              tgtTranYVal: 8.33,
              tgtRotVal: -30,
              enteredOffset: enterDuration / duration,
              exitingOffset: 1 - (exitDuration / duration),
            }), options),
          };

        case 'focused':
          return {
            upperLeftEyelid: this._upperLeftEyelid.animate(this._createKeyframes({
              tgtTranYVal: 10,
              enteredOffset: enterDuration / duration,
              exitingOffset: 1 - (exitDuration / duration),
            }), options),
            upperRightEyelid: this._upperRightEyelid.animate(this._createKeyframes({
              tgtTranYVal: 10,
              enteredOffset: enterDuration / duration,
              exitingOffset: 1 - (exitDuration / duration),
            }), options),
            lowerLeftEyelid: this._lowerLeftEyelid.animate(this._createKeyframes({
              tgtTranYVal: -10,
              enteredOffset: enterDuration / duration,
              exitingOffset: 1 - (exitDuration / duration),
            }), options),
            lowerRightEyelid: this._lowerRightEyelid.animate(this._createKeyframes({
              tgtTranYVal: -10,
              enteredOffset: enterDuration / duration,
              exitingOffset: 1 - (exitDuration / duration),
            }), options),
          }

        case 'confused':
          return {
            upperRightEyelid: this._upperRightEyelid.animate(this._createKeyframes({
              tgtTranYVal: 10,
              tgtRotVal: -10,
              enteredOffset: enterDuration / duration,
              exitingOffset: 1 - (exitDuration / duration),
            }), options),
          }

        default:
          logger.warn(`Invalid input type: ${type}`);
      }
    }

    blink({
      duration = 150,  // in ms
    } = {}) {
      if (!this._leftEye) {  // assumes all elements are always set together
        logger.warn('Skipping; eye elements are not set');
      }

      [this._leftEye, this._rightEye].map((eye) => {
        eye.animate([
          {transform: 'rotateX(0deg)'},
          {transform: 'rotateX(90deg)'},
          {transform: 'rotateX(0deg)'},
        ], {
          duration,
          iterations: 1,
        });
      });
    }

    startBlinking({
      maxInterval = 5000
    } = {}) {
      if (this._blinkTimeoutID) {
        logger.warn(`Skipping; already blinking with timeoutID: ${this._blinkTimeoutID}`);
        return;
      }
      const blinkRandomly = (timeout) => {
        this._blinkTimeoutID = setTimeout(() => {
          this.blink();
          blinkRandomly(Math.random() * maxInterval);
        }, timeout);
      }
      blinkRandomly(Math.random() * maxInterval);
    }

    stopBlinking() {
      clearTimeout(this._blinkTimeoutID);
      this._blinkTimeoutID = null;
    }
  }

  export class EyeExpressionAction {
    constructor(collection, id, eyes = new EyeController()) {
      this._collection = collection;
      this._id = id;
      this._eyeController = eyes;

      this._as = getActionServer(collection, id);
      this._as.registerGoalCallback(this.goalCB.bind(this));
      this._as.registerPreemptCallback(this.preemptCB.bind(this));

      this._animations = [];
    }

    goalCB(action) {
      this._animations = this._eyeController.express(action.goal);
      const animations = Object.keys(this._animations).map((key) => {
        return new Promise((resolve, reject) => {
          this._animations[key].onfinish = resolve;
        })
      });
      Promise.all(animations).then(() => {
        this._as.setSucceeded();
      });
    }

    preemptCB() {
      Object.keys(this._animations).map((key) => {
        this._animations[key].cancel();
      });
      this._animations = [];
      this._as.setPreempted();
    }
  }

}
