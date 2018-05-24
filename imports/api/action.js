import util from 'util';
import { EventEmitter } from 'events';
import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Random } from 'meteor/random';

const logger = log.getLogger('action');

const obj2str = (obj) => { return util.inspect(obj, true, null, true); }


export const goalStatus = {
  'pending': 'pending',
  'active': 'active',
  'preempted': 'preempted',
  'succeeded': 'succeeded',
  'aborted': 'aborted',
};

export const defaultAction = {
  goalId: '',
  status: goalStatus.succeeded,
  goal: {},
  result: {},
  isPreemptRequested: false,
};


class MeteorActionComm extends EventEmitter {

  constructor(collection, id) {  // TODO: check inputs
    super();

    this._collection = collection;
    this._id = id;

    this._collection.find(this._id).observeChanges({
      changed: (id, fields) => {
        logger.debug(`[MeteorActionComm] id: ${id}, fields: ${obj2str(fields)}`);

        // start action requested
        if (
          fields.goalId
          && fields.status === goalStatus.pending
        ) {
          const goal = this._collection.findOne(id).goal;
          logger.debug(`[MeteorActionComm] Received a new goal; goalId: ${fields.goalId}, status: ${fields.status}, goal: ${obj2str(goal)}`);

          this.emit('goal', {
            goalId: fields.goalId,
            status: fields.status,
            goal,
          });
        }

        // cancel action requested
        if (fields.isPreemptRequested) {
          const goalId = this._collection.findOne(id).goalId;
          logger.debug(`[MeteorActionComm] Cancel requested; goalId: ${goalId}`);

          this.emit('cancel', {
            goalId,
          });
        }

        // action is finished
        if (
          fields.status === goalStatus.preempted
          || fields.status === goalStatus.succeeded
          || fields.status === goalStatus.aborted
        ) {
          const goalId = this._collection.findOne(id).goalId;
          logger.debug(`[MeteorActionComm] Finished the goal; goalId: ${goalId}, status: ${fields.status}, result: ${fields.result}`);

          this.emit('result', {
            goalId: this._collection.findOne(id).goalId,
            status: fields.status,
            result: this._collection.findOne(id).result,
          });
        }
      }
    });
  }

  _get() {
    return this._collection.findOne(this._id);
  }

  _set(doc = {}) {
    this._collection.update(this._id, {$set: doc});
  }

  // NOTE: inspired from firebase's once
  //   https://firebase.google.com/docs/reference/js/firebase.database.Query#once
  once(eventName) {
    return new Promise((resolve, reject) => {
      super.once(eventName, resolve);
    });
  }

}


// TODO: consider composing MeteorActionCommon instead of inheriting it
class MeteorActionClient extends MeteorActionComm {

  constructor(collection, id) {
    super(collection, id);
  }

  sendGoal(goal) {
    logger.debug(`[MeteorActionClient.sendGoal] cancel goalId: ${this._get().goalId}`);
    const goalId = this._get().goalId;
    const result = Promise.await( this.cancel() );
    if (goalId !== result.goalId) {
      logger.warn('[MeteorActionClient.sendGoal] Not sending goal; cancel failed');
      return;
    }

    logger.debug(`[MeteorActionClient.sendGoal] Sending goal: ${obj2str(goal)}`);
    this._set({
      goalId: Random.id(),
      status: goalStatus.pending,
      goal,
    });

    return this.once('result');
  }

  cancel() {
    const goalId = this._get().goalId;
    const status = this._get().status;
    const result = this._get().result;

    if (
      status === goalStatus.preempted
      || status === goalStatus.succeeded
      || status === goalStatus.aborted
    ) {
      logger.debug(`[MeteorActionClient] Skipping; no active goal; goalId: ${goalId}, status: ${status}, result: ${obj2str(result)}`);
      return Promise.resolve({  // return current goalId, status, result
        goalId,
        status,
        result,
      });
    } else {
      this._set({
        isPreemptRequested: true,
      });
      return this.once('result');
    }
  }

}


// TODO: consider composing MeteorActionCommon instead of inheriting it
class MeteorActionServer extends MeteorActionComm {

  constructor(collection, id) {
    super(collection, id);

    // reset
    this._set(defaultAction);
  }

  registerGoalCallback(callback = () => {}) {
    if (this.goalCallback) {
      this.removeListener('goal', this.goalCallback)
    }

    this.goalCallback = (goal) => {
      this._set({status: goalStatus.active});  // acceptNewGoal
      callback(goal);
    }
    this.on('goal', this.goalCallback);
  }

  registerPreemptCallback(callback) {
    if (this.preemptCallback) {
      this.removeListener('cancel', this.preemptCallback)
    }

    this.preemptCallback = callback;
    this.on('cancel', this.preemptCallback);
  }

  setAborted(result = null) {
    if (this._get().status !== goalStatus.active) {
      logger.debug(`[MeteorActionServer] Cannot abort a goal in status: ${this._get().status}`);
      return;
    }

    this._set({
      status: goalStatus.aborted,
      result,
    })
  }

  setPreempted(result = null) {
    if (this._get().status !== goalStatus.pending && this._get().status !== goalStatus.active) {
      logger.debug(`[MeteorActionServer] Cannot preempt a goal in status: ${this._get().status}`);
      return;
    }

    this._set({
      status: goalStatus.preempted,
      result,
      isPreemptRequested: false,
    })
  }

  setSucceeded(result = {}) {
    if (this._get().status !== goalStatus.active) {
      logger.debug(`[MeteorActionServer] Cannot succeed a goal in status: ${this._get().status}`);
      return;
    }

    this._set({
      status: goalStatus.succeeded,
      result,
    })
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
