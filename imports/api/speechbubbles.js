import util from 'util';
import * as log from 'loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

const logger = log.getLogger('speechbubbles');
logger.setLevel('debug');

const obj2str = (obj) => { return util.inspect(obj, true, null, true); }

export const Speechbubbles = new Mongo.Collection('speechbubbles');

if (Meteor.isServer) {

  // SpeechBubbleAction: should have a static variable

  // AskMultipleChoiceAction {

  // }

  class DisplayMessageAction {
    constructor() {
      this._collection = collection;
    }

    // ~sendGoal (send_goal allowed attaching "callbacks")
    //
    execute(callbacks) {  // return this? to provide wait for result?
      // provide callback -> to get result : use "await" to get val / error
      // emit result ...
      // + result this.

      // should I use cancel here? maybe
      this.emit('result', {
        status: 'cancel',
        result: null,
      });
      // call older callback callbacks.on
      this.removeAllListeners();

      // maybe emit status running

      this._collection.update(
        {
          _id: speechbubbleId,
        }, {$set: {
          type: 'choices',
          data: {
            choices: choices,
            selected: null,
          }
        }}
      )

      // should it return promise?

      observeHandles[speechbubbleId] = Speechbubbles.find({
        _id: speechbubbleId,
        type: 'choices',
        'data.selected': {$exists: true},
      }).observeChanges({
        changed(id, fields) {
          logger.debug(`id: ${id}; fields: ${obj2str(fields)}`);
          observeHandles[speechbubbleId].stop();
          observeHandles[speechbubbleId] = null;
          callbacks[speechbubbleId](null, fields.data.selected);
          callbacks[speechbubbleId] = null;
        }
      });
    }

    // run(callback); node style; convert to promise to use promise style is possible

    cancel() {
      // provide callback -> to get result : use "await" to get val / error
    }

    // returns bool
    waitForResult(timeout) {
      // callback
      // allow timeout
      // blocks using promise?
    }

    // getStatus()
    // getResult()  // only return result without status
  }


  Meteor.publish('speechbubbles', function speechbubblesPublication() {
    // TODO: restrict access based on user permission; right now all speechbubbles public!
    return Speechbubbles.find();
  });

  // do I need one or many?
  // should be in SpeechBubble module
  const dispalyMessage = {

    // should this also be event emitter? publishing "goal, feedback, status"

    // callback for returning result (err, res)
    start(args, callback) {

      if (observeHandles[speechbubbleId]) {
          observeHandles[speechbubbleId].stop();
          observeHandles[speechbubbleId] = null;
          callbacks[speechbubbleId](new Meteor.Error('canceled'));
          callbacks[speechbubbleId] = null;
        }
        callbacks[speechbubbleId] = callback;

        this._collection.update(
          {
            _id: speechbubbleId,
          }, {$set: {
            type: 'choices',
            data: {
              choices: choices,
              selected: null,
            }
          }}
        )

        // should it return promise?

        observeHandles[speechbubbleId] = Speechbubbles.find({
          _id: speechbubbleId,
          type: 'choices',
          'data.selected': {$exists: true},
        }).observeChanges({
          changed(id, fields) {
            logger.debug(`id: ${id}; fields: ${obj2str(fields)}`);
            observeHandles[speechbubbleId].stop();
            observeHandles[speechbubbleId] = null;
            callbacks[speechbubbleId](null, fields.data.selected);
            callbacks[speechbubbleId] = null;
          }
        });

    }

    // callback(err, res)
    cancel(callback) {
      if (this._handle) {
        // cancel
        this._handle.stop();
      }
    }

    // return value "result"
    waitForResult() {

    }

    //
    getResult() {

    }
  }

  const observeHandles = {};
  const callbacks = {};

  Meteor.methods({
    'speechbubbles.create'() {
      if (!this.userId) {
        throw new Meteor.Error('not-authorized');
      }

      if (Speechbubbles.find({owner: this.userId}).count() > 0) {
        logger.warn(`Skipping speechbubbles.create; user (${this.userId}) already has speechbubbles`);
        return;
      }

      const speechbubble = {
        type: '',
        data: null,  // {} or []
        owner: this.userId,
        username: Meteor.users.findOne(this.userId).username,
      }
      Speechbubbles.insert(Object.assign({role: 'robot'}, speechbubble));
      Speechbubbles.insert(Object.assign({role: 'human'}, speechbubble));
    },

    'speechbubbles.choices.setSelected'(speechbubbleId, choice) {
      check(speechbubbleId, String);
      // check(choiceId, Number);  // TODO: update this

      if (!this.userId) {
        throw new Meteor.Error('not-authorized');
      }

      Speechbubbles.update({
        _id: speechbubbleId,
        type: 'choices',
        'data.selected': null,
      }, {$set: {
        'data.selected': choice,
      }});
    },

    'speechbubbles.display_message'(speechbubbleId, message) {
      this.unblock();
      check(speechbubbleId, String);
      check(choices, [String]);

      if (!this.userId) {
        throw new Meteor.Error('not-authorized');
      }

      return Meteor.wrapAsync((callback) => {
        if (observeHandles[speechbubbleId]) {
          observeHandles[speechbubbleId].stop();
          observeHandles[speechbubbleId] = null;
          callbacks[speechbubbleId](new Meteor.Error('canceled'));
          callbacks[speechbubbleId] = null;
        }
        callbacks[speechbubbleId] = callback;

        Speechbubbles.update(
          {
            _id: speechbubbleId,
          }, {$set: {
            type: 'message',
            data: message
          }}
        )

        callbacks[speechbubbleId](null, true);
        callbacks[speechbubbleId] = null;
      })();
    },

    'speechbubbles.ask_multiple_choice'(speechbubbleId, choices) {
      this.unblock();
      check(speechbubbleId, String);
      check(choices, [String]);

      if (!this.userId) {
        throw new Meteor.Error('not-authorized');
      }

      return Meteor.wrapAsync((callback) => {
        if (observeHandles[speechbubbleId]) {
          observeHandles[speechbubbleId].stop();
          observeHandles[speechbubbleId] = null;
          callbacks[speechbubbleId](new Meteor.Error('canceled'));
          callbacks[speechbubbleId] = null;
        }
        callbacks[speechbubbleId] = callback;

        Speechbubbles.update(
          {
            _id: speechbubbleId,
          }, {$set: {
            type: 'choices',
            data: {
              choices: choices,
              selected: null,
            }
          }}
        )

        observeHandles[speechbubbleId] = Speechbubbles.find({
          _id: speechbubbleId,
          type: 'choices',
          'data.selected': {$exists: true},
        }).observeChanges({
          changed(id, fields) {
            logger.debug(`id: ${id}; fields: ${obj2str(fields)}`);
            observeHandles[speechbubbleId].stop();
            observeHandles[speechbubbleId] = null;
            callbacks[speechbubbleId](null, fields.data.selected);
            callbacks[speechbubbleId] = null;
          }
        });
      })();
    },
  });
}
