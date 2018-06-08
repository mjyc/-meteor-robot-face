import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { defaultAction, getActionServer } from './action.js';

const logger = log.getLogger('facial_expresison');

export const FacialExpressionActions = new Mongo.Collection('facial_expression_actions');


if (Meteor.isClient) {

  export class FacialExpressionAction {
    constructor(collection, id, eyes) {
      this._collection = collection;
      this._id = id;
      this._eyes = eyes;

      this._as = getActionServer(collection, id);
      this._as.registerGoalCallback(this.goalCB.bind(this));
      this._as.registerPreemptCallback(this.preemptCB.bind(this));
    }

    goalCB(action) {
      this._eyes.makeFacialExpression(action.goal);
      // this._collection.update(this._id, {
      //   $set: {
      //     type: action.goal.type,
      //     data: action.goal.data,
      //   }
      // });
    }

    preemptCB() {
      logger.warn('not implemented');
      this._as.setPreempted();
    }
  }

  export class ExpressiveEyes {
    constructor({
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

      this._blinkTimeoutID = null;
    }

    _createKeyframes ({
      tgtTranYVal = 0,
      tgtRotVal = 0,
      enteredOffset = 1/3,
      exitingOffset = 2/3,
    } = {}) {
      return [
        {transform: `translateY(0px) rotate(0deg)`, offset: 0.0},
        {transform: `translateY(${tgtTranYVal}px) rotate(${tgtRotVal}deg)`, offset: enteredOffset},
        {transform: `translateY(${tgtTranYVal}px) rotate(${tgtRotVal}deg)`, offset: exitingOffset},
        {transform: `translateY(0px) rotate(0deg)`, offset: 1.0},
      ];
    }

    makeFacialExpression({
      type = '',
      // level = 3,  // 1: min, 5: max  // TODO: implement this feature
      durationMs = 1000,
      enterDurationMs = 75,
      exitDurationMs = 75,
    }) {
      const options = {
        duration: durationMs,
      }
      switch(type) {
        case 'happy':
          this._lowerLeftEyelid.animate(this._createKeyframes({
            tgtTranYVal: -120,
            tgtRotVal: 30,
            enteredOffset: enterDurationMs / durationMs,
            exitingOffset: 1 - (exitDurationMs / durationMs),
          }), options);
          this._lowerRightEyelid.animate(this._createKeyframes({
            tgtTranYVal: -120,
            tgtRotVal: -30,
            enteredOffset: enterDurationMs / durationMs,
            exitingOffset: 1 - (exitDurationMs / durationMs),
          }), options);
          break;

        case 'sad':
          this._upperLeftEyelid.animate(this._createKeyframes({
            tgtTranYVal: 80,
            tgtRotVal: -20,
            enteredOffset: enterDurationMs / durationMs,
            exitingOffset: 1 - (exitDurationMs / durationMs),
          }), options);
          this._upperRightEyelid.animate(this._createKeyframes({
            tgtTranYVal: 80,
            tgtRotVal: 20,
            enteredOffset: enterDurationMs / durationMs,
            exitingOffset: 1 - (exitDurationMs / durationMs),
          }), options);
          break;

        case 'angry':
          this._upperLeftEyelid.animate(this._createKeyframes({
            tgtTranYVal: 50,
            tgtRotVal: 30,
            enteredOffset: enterDurationMs / durationMs,
            exitingOffset: 1 - (exitDurationMs / durationMs),
          }), options);
          this._upperRightEyelid.animate(this._createKeyframes({
            tgtTranYVal: 50,
            tgtRotVal: -30,
            enteredOffset: enterDurationMs / durationMs,
            exitingOffset: 1 - (exitDurationMs / durationMs),
          }), options);
          break;

        case 'focused':
          [this._upperLeftEyelid, this._upperRightEyelid].map(eyelid => {
            eyelid.animate(this._createKeyframes({
              tgtTranYVal: 60,
              enteredOffset: enterDurationMs / durationMs,
              exitingOffset: 1 - (exitDurationMs / durationMs),
            }), options);
          });
          [this._lowerLeftEyelid, this._lowerRightEyelid].map(eyelid => {
            eyelid.animate(this._createKeyframes({
              tgtTranYVal: -60,
              enteredOffset: enterDurationMs / durationMs,
              exitingOffset: 1 - (exitDurationMs / durationMs),
            }), options);
          });
          break;

        case 'confused':
          [this._upperRightEyelid].map(eyelid => {
            eyelid.animate(this._createKeyframes({
              tgtTranYVal: 60,
              tgtRotVal: -10,
              enteredOffset: enterDurationMs / durationMs,
              exitingOffset: 1 - (exitDurationMs / durationMs),
            }), options);
          });
          break;

        default:
          logger.warn(`Invalid input type: ${type}`);
      }
    }

    blink({
      duration = 150,  // in ms
    } = {}) {
      return [this._leftEye, this._rightEye].map((eye) => {
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

    startBlinking(maxIntervalMs = 5000) {
      const blinkRandomly = (timeoutMs) => {
        this._blinkTimeoutID = setTimeout(() => {
          this.blink();
          blinkRandomly(Math.random() * maxIntervalMs);
        }, timeoutMs);
      }
      blinkRandomly(Math.random() * maxIntervalMs);
    }

    stopBlinking() {
      clearTimeout(this._blinkTimeoutID);
    }
  }
}


if (Meteor.isServer) {

  FacialExpressionActions.allow({
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


  Meteor.publish('facial_expression_actions', function facialExpressionPublication() {
    // TODO: restrict access based on user permission; right now all docs are public!
    return FacialExpressionActions.find();
  });


  Meteor.methods({
    'facial_expression_actions.addUser'(userId = this.userId) {
      if (!Meteor.users.findOne(userId)) {
        throw new Meteor.Error('invalid-input', `Invalid userId: ${userId}`);
      }

      if (FacialExpressionActions.findOne({owner: userId})) {
        logger.warn(`Skipping; user ${this.userId} already has speech action documents`);
        return;
      }
      FacialExpressionActions.insert(Object.assign({owner: userId}, defaultAction));
    }
  });

}
