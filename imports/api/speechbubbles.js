import util from 'util';
import { EventEmitter } from 'events';
import * as log from 'loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

const logger = log.getLogger('speechbubbles');
logger.setLevel('debug');  // TODO: do this in each application

const obj2str = (obj) => { return util.inspect(obj, true, null, true); }

export const Speechbubbles = new Mongo.Collection('speechbubbles');


if (Meteor.isServer) {

  Meteor.publish('speechbubbles', function speechbubblesPublication() {
    // TODO: restrict access based on user permission; right now all speechbubbles public!
    return Speechbubbles.find();
  });


  export class AskMultipleChoiceAction extends EventEmitter {

    constructor({speechbubbleId = ''}) {
      super();

      if (!Speechbubbles.findOne(speechbubbleId)) {
        throw new Meteor.Error('invalid-input');
      }

      // TODO: protect _id from overwriting
      this._id = speechbubbleId;

      // TODO: set logger with class name
    }

    _reset() {
      this.removeAllListeners();

      AskMultipleChoiceAction._handles[this._id].stop();
      AskMultipleChoiceAction._handles[this._id] = null;

      Speechbubbles.update({
        _id: this._id,
        type: 'choices',
      }, {$set: {
        type: '',
        data: {},
      }});
    }

    _isActive() {
      return AskMultipleChoiceAction._handles[speechbubbleId]
        && Speechbubbles.findOne({
          _id: this._id,
          type: 'choices'
        });
    }

    // NOTE: options for the last argument:
    //   (i) { onDone = () => {}, onFeedback = () => {} } = {}
    //   (ii) callback = (err, res) => {} // throw err on cancel or abort?
    execute({
      choices = []
    } = {}) {
      this.cancel();

      this._collection.update(
        {
          _id: this._id,
        }, {$set: {
          type: 'choices',
          data: {
            choices: choices,
            selected: null,
          }
        }}
      );

      AskMultipleChoiceAction._handles = Speechbubbles.find({
        _id: this._id,
        type: 'choices',
        'data.selected': {$exists: true},
      }).observeChanges({
        changed: (id, fields) => {
          logger.debug(`id: ${id}; fields: ${obj2str(fields)}`);
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

    // should be used with await?
    // or returns a classical callback
    getResult(callback) {
      // block if callback is not given...
      // return (err, result.result); err if canceled or aborted? or return everything in result?
      return;
    }
  }

  AskMultipleChoiceAction._handles = {};


  Meteor.methods({
    // TODO: use a static method from AskMultipleChoice
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
      }
      Speechbubbles.insert(Object.assign({role: 'robot'}, speechbubble));
      Speechbubbles.insert(Object.assign({role: 'human'}, speechbubble));
    },

    // TODO: use a static method from AskMultipleChoice
    'speechbubbles.choices.setSelected'(speechbubbleId, choice) {
      this.unblock();
      check(speechbubbleId, String);
      check(choice, String);

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
  });
}
