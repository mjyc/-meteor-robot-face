import util from 'util';
import { EventEmitter } from 'events';
import * as log from 'loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Random } from 'meteor/random';

const obj2str = (obj) => { return util.inspect(obj, true, null, true); }


export const defaultAction = {
  goalId: '',
  status: '',  // 'pending', 'active', 'canceled', 'succeeded'
  goal: {},
  result: {},
  isPreemptRequested: false,
};


export class MeteorAction extends EventEmitter {
  constructor(collection, id) {
    super();

    this._collection = collection;
    this._id = id;

    // TODO: refactor this to "reset" or something
    this._collection.update({_id: this._id}, {$set: defaultAction});

    // TODO: do not allow creating more than one actions with same inputs
    this._collection.find(this._id).observeChanges({
      changed: (id, fields) => {
        console.log('id, fields', id, fields);

        if (
          fields.goalId
          && fields.status === 'pending'
          && fields.goal
          && !fields.result
        ) {
          this.emit('goal', {
            goalId: fields.goalId,
            status: fields.status,
            goal: fields.goal,
          })
        }

        if (fields.isPreemptRequested) {
          this.emit('cancel', {
            goalId: this._collection.findOne(this._id).goalId
          });
        }

        if (
          (fields.status === 'canceled' || fields.status === 'succeeded')
          && fields.result
        ) {
          this.emit('result', {
            goalId: this._collection.findOne(this._id).goalId,
            status: fields.status,
            result: fields.result,
          })
        }
      }
    });
  }

  // TODO: consider adding a callback argument
  once(eventName) {
    return new Promise((resolve, reject) => {
      super.once(eventName, resolve);
    });
  }

  // TODO: consider removing get & set
  // Collection methods

  get() {
    return this._collection.findOne(this._id);
  }

  set(doc = {}) {
    this._collection.update({_id: this._id}, {$set: doc});
  }

  // Action server methods

  registerGoalCallback(callback) {
    throw new Meteor.Error('not implemented');
  }

  registerPreemptCallback(callback) {
    throw new Meteor.Error('not implemented');
  }

  acceptNewGoal(goal) {
    throw new Meteor.Error('not implemented');
  }

  // Action client methods

  sendGoal(goal) {
    this.cancel();
    console.log('start waiting!');
    Promise.await( this.once('result') );  // TODO: check whether the action was canceled
    console.log('done waiting!');

    this.set({
      goalId: Random.id(),
      status: 'pending',
      goal,
    });
  }

  cancel() {
    this.set({
      isPreemptRequested: true,
    });
  }
}

MeteorAction._handles = [];
