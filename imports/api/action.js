import log from 'meteor/mjyc:loglevel';
import util from 'util';
import { EventEmitter } from 'events';
import { Meteor } from 'meteor/meteor';
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


class WebActionComm extends EventEmitter {
  get() {
    new Error('Not implemented');
  }

  set(doc = {}) {
    new Error('Not implemented');
  }

  // promisify "once", similar to the Firebase's decision on "on" & "once"
  //   https://firebase.google.com/docs/reference/js/firebase.database.Query#on
  //   https://firebase.google.com/docs/reference/js/firebase.database.Query#once
  once(eventName) {
    return new Promise((resolve, reject) => {
      super.once(eventName, resolve);
    });
  }
}

class WebActionServer {
  constructor(comm) {
    this._comm = comm;
  }

  registerGoalCallback(callback = () => {}) {
    if (this.goalCallback) {
      this.removeListener('goal', this.goalCallback)
    }

    this.goalCallback = (goal) => {
      // "status" is set to "active" before calling "callback"
      this._comm.set({status: goalStatus.active});
      callback(goal);
    }
    this._comm.on('goal', this.goalCallback);
  }

  registerPreemptCallback(callback = () => {}) {
    if (this.preemptCallback) {
      this.removeListener('cancel', this.preemptCallback)
    }

    this.preemptCallback = callback;
    this._comm.on('cancel', this.preemptCallback);
  }

  setAborted(result = null) {
    if (this._comm.get().status !== goalStatus.active) {
      logger.debug(`[MeteorActionServer] Cannot abort a goal in status: ${this._comm.get().status}`);
      return;
    }

    this._comm.set({
      status: goalStatus.aborted,
      result,
    })
  }

  setPreempted(result = null) {
    if (this._comm.get().status !== goalStatus.pending && this._comm.get().status !== goalStatus.active) {
      logger.debug(`[MeteorActionServer] Cannot preempt a goal in status: ${this._comm.get().status}`);
      return;
    }

    this._comm.set({
      status: goalStatus.preempted,
      result,
      isPreemptRequested: false,
    })
  }

  setSucceeded(result = {}) {
    if (this._comm.get().status !== goalStatus.active) {
      logger.debug(`[MeteorActionServer] Cannot succeed a goal in status: ${this._comm.get().status}`);
      return;
    }

    this._comm.set({
      status: goalStatus.succeeded,
      result,
    })
  }
}

class WebActionClient {
  constructor(comm) {
    this._comm = comm;
  }

  getResult() {
    new Error('Not implemented');
  }

  getStatus() {
    new Error('Not implemented');
  }

  sendGoal(goal = {}) {
    logger.debug(`[MeteorActionClient.sendGoal] cancel goalId: ${this._comm.get().goalId}`);
    const goalId = this._comm.get().goalId;
    const result = Promise.await( this.cancelGoal() );
    if (goalId !== result.goalId) {
      logger.warn('[MeteorActionClient.sendGoal] Not sending goal; cancel failed');
      return;
    }

    logger.debug(`[MeteorActionClient.sendGoal] Sending goal: ${obj2str(goal)}`);
    this._comm.set({
      goalId: Random.id(),
      status: goalStatus.pending,
      goal,
    });
  }

  cancelGoal() {
    const goalId = this._comm.get().goalId;
    const status = this._comm.get().status;
    const result = this._comm.get().result;

    if (
      status === goalStatus.preempted
      || status === goalStatus.succeeded
      || status === goalStatus.aborted
    ) {
      logger.warn(`[MeteorActionClient] Skipping; no active goal; goalId: ${goalId}, status: ${status}, result: ${obj2str(result)}`);
      return Promise.resolve({  // return current goalId, status, result
        goalId,
        status,
        result,
      });
    } else {
      // NOTE: "isPreemptRequested" is set back to false in "setPreempted"
      this._comm.set({
        isPreemptRequested: true,
      });
     return this._comm.once('result');
    }
  }

  async waitForResult() {
    new Error('Not implemented');
  }
}

class MeteorActionComm extends WebActionComm {

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

  get() {
    return this._collection.findOne(this._id);
  }

  set(doc = {}) {
    this._collection.update(this._id, {$set: doc});
  }

}

const actionClients = {};

export const getActionClient = (collection, id) => {
  // TODO: check inputs
  if (!actionClients[`${collection._name}_${id}`]) {
    actionClients[`${collection._name}_${id}`] = new WebActionClient(new MeteorActionComm(collection, id));
  }
  return actionClients[`${collection._name}_${id}`];
};

const actionServers = {};

export const getActionServer = (collection, id) => {
  // TODO: check inputs
  if (!actionServers[`${collection._name}_${id}`]) {
    actionServers[`${collection._name}_${id}`] = new WebActionServer(new MeteorActionComm(collection, id));
  }

  return actionServers[`${collection._name}_${id}`];
};
