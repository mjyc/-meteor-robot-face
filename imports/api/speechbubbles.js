import util from 'util';
import { EventEmitter } from 'events';
import * as log from 'loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

const logger = log.getLogger('speechbubbles');
logger.setLevel('debug');  // TODO: do this in the main application

const obj2str = (obj) => { return util.inspect(obj, true, null, true); }


export const Speechbubbles = new Mongo.Collection('speechbubbles');


if (Meteor.isServer) {

  export class SpeechbubbleAction extends EventEmitter {

    static insertSpeechbubble(doc) {
      Speechbubbles.insert(Object.assign({}, doc, {
        type: '',
        data: {},
      }));
    }

    constructor({speechbubbleId = ''} = {}) {
      super();

      if (!Speechbubbles.findOne(speechbubbleId)) {
        throw new Meteor.Error('invalid-input', `Invalid speechbubbleId: ${speechbubbleId}`);
      }
      // TODO: protect _id from overwriting it
      this._id = speechbubbleId;
    }

    _reset() {
      this.removeAllListeners();

      if (SpeechbubbleAction._handles[this._id]) {
        SpeechbubbleAction._handles[this._id].stop();
        SpeechbubbleAction._handles[this._id] = null;
      }

      Speechbubbles.update({
        _id: this._id,
      }, {$set: {
        type: '',
        data: {},
      }});
    }

  }

  SpeechbubbleAction._handles = {};


  export class DisplayMessageAction extends SpeechbubbleAction {

    constructor({speechbubbleId = ''} = {}) {
      super({speechbubbleId});
    }

    execute({
      message = ''
    } = {}) {
      Speechbubbles.update(
        {
          _id: this._id,
        }, {$set: {
          type: 'message',
          data: {message}
        }}
      );

      Meteor.setTimeout(() => {
        this.emit('done', {
          status: 'succeeded',
          result: message,
        })
      }, 0);

      return this;
    }

    cancel() {
      // not emitting 'cancel' since it is not canceling any running action
      return this;
    }

  }


  export class AskMultipleChoiceAction extends SpeechbubbleAction {

    static setSelected(speechbubbleId, choice) {
      Speechbubbles.update({
        _id: speechbubbleId,
        type: 'choices',
      }, {$set: {
        'data.selected': choice,
      }});
    }

    constructor({speechbubbleId = ''} = {}) {
      super({speechbubbleId});
    }

    _isActive() {
      return SpeechbubbleAction._handles[this._id]
        && Speechbubbles.findOne({
          _id: this._id,
          type: 'choices',
          data: {$exists: true},
        });
    }

    // NOTE: options for the last argument:
    //   (i) { onDone = () => {}, onFeedback = () => {} } = {}
    //   (ii) callback = (err, res) => {} // throw err on cancel or abort?
    execute({
      choices = []
    } = {}) {
      this.cancel();

      Speechbubbles.update(
        {
          _id: this._id,
        }, {$set: {
          type: 'choices',
          data: {choices}
        }}
      );

      SpeechbubbleAction._handles = Speechbubbles.find({
        _id: this._id,
        type: 'choices',
      }).observeChanges({
        changed: (id, fields) => {
          logger.debug(`id: ${id}, fields: ${obj2str(fields)}`);
          this.emit('done', {
            status: 'succeeded',
            result: fields.data.selected,
          });
          this._reset();
        }
      });

      return this;
    }

    // NOTE: consider passing a callback-like arg
    cancel() {
      // double check with findOne
      if (this._isActive()) {
        this.emit('done', {
          status: 'canceled',
          result: null,
        });

        this._reset();
      }

      return this;
    }

    // NOTE: consider creating
    // getResult(callback) { ... }
  }


  Meteor.publish('speechbubbles', function speechbubblesPublication() {
    // TODO: restrict access based on user permission; right now all speechbubbles public!
    return Speechbubbles.find();
  });


  Meteor.methods({
    'speechbubbles.initialize'(userId = this.userId) {
      if (!userId) {
        throw new Meteor.Error('not-authorized');
      }

      if (Speechbubbles.find({owner: userId}).count() > 0) {
        logger.warn(`Skipping speechbubbles.initialize; user (${userId}) already has speechbubbles`);
        return;
      }

      SpeechbubbleAction.insertSpeechbubble({owner: userId, role: 'robot'});
      SpeechbubbleAction.insertSpeechbubble({owner: userId, role: 'human'});
    },

    'speechbubbles.choices.setSelected'(speechbubbleId, choice) {
      this.unblock();
      check(speechbubbleId, String);
      check(choice, String);

      if (!this.userId) {
        throw new Meteor.Error('not-authorized');
      }

      AskMultipleChoiceAction.setSelected(speechbubbleId, choice);
    },
  });

}
