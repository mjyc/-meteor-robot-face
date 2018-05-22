import util from 'util';
import { EventEmitter } from 'events';
import * as log from 'loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Random } from 'meteor/random';

const logger = log.getLogger('action');
logger.setLevel('debug');  // TODO: do this in each application

const obj2str = (obj) => { return util.inspect(obj, true, null, true); }


export const defaultAction = {
  goalId: '',
  status: '',  // 'pending', 'active', 'canceled', 'succeeded', 'aborted'
  goal: {},
  result: {},
  isPreemptRequested: false,
};


class MeteorAction extends EventEmitter {

  constructor(collection, id) {
    super();

    // TODO: check inputs

    this._collection = collection;
    this._id = id;

    this._collection.find(this._id).observeChanges({
      changed: (id, fields) => {
        logger.debug(`[MeteorAction.constructor] id: ${id}, fields: ${obj2str(fields)}`);

        // start action requested
        if (
          fields.goalId
          && fields.status === 'pending'
        ) {
          this.emit('goal', {
            goalId: fields.goalId,
            status: fields.status,
            goal: this._collection.findOne(id).goal,
          })
        }

        // cancel action requested
        if (fields.isPreemptRequested) {
          this.emit('cancel', {
            goalId: this._collection.findOne(id).goalId
          });
        }

        // action is finished
        if (fields.status === 'canceled' || fields.status === 'succeeded') {
          this.emit('result', {
            goalId: this._collection.findOne(id).goalId,
            status: fields.status,
            result: fields.result,
          })
        }
      }
    });
  }

  _get() {
    return this._collection.findOne(this._id);
  }

  _set(doc = {}) {
    this._collection.update({_id: this._id}, {$set: doc});
  }

  // NOTE: inspired from firebase's once
  //   https://firebase.google.com/docs/reference/js/firebase.database.Query#once
  once(eventName) {
    return new Promise((resolve, reject) => {
      super.once(eventName, resolve);
    });
  }

}


class MeteorActionClient extends MeteorAction {

  constructor(collection, id) {
    super(collection, id);
  }

  sendGoal(goal) {
    logger.debug(`[MeteorActionClient.sendGoal] goal: ${obj2str(goal)}`);
    this.cancel();
    Promise.await( this.once('result') );
    // TODO: check whether the action was successfully canceled

    this._set({
      goalId: Random.id(),
      status: 'pending',
      goal,
    });
  }

  cancel() {
    this._set({
      isPreemptRequested: true,
    });
  }

}


class MeteorActionServer extends MeteorAction {
  constructor(collection, id) {
    super(collection, id);

    // reset the action
    this._set(defaultAction);
  }

  _acceptNewGoal(goal) {
    throw new Meteor.Error('not implemented');
  }

  registerGoalCallback(callback) {
    throw new Meteor.Error('not implemented');
  }

  registerPreemptCallback(callback) {
    throw new Meteor.Error('not implemented');
  }

}


const actionClients = {};

export const getActionClient = (collection, id) => {
  // TODO: check inputs
  if (!actionClients[`${collection._name}_${id}`]) {
    actionClients[`${collection._name}_${id}`] = new MeteorActionClient(collection, id);
  }
  return actionClients[`${collection._name}_${id}`];
};

const actionServers = {};

export const getActionServer = (collection, id) => {
  // TODO: check inputs
  if (!actionServers[`${collection._name}_${id}`]) {
    actionServers[`${collection._name}_${id}`] = new MeteorActionServer(collection, id);
  }
  return actionServers[`${collection._name}_${id}`];
};
