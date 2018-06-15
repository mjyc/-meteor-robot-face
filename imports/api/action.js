import log from 'meteor/mjyc:loglevel';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import {
  Actions,
  defaultAction,
} from 'meteor/mjyc:action';

const logger = log.getLogger('action');


if (Meteor.isServer) {

  // TODO: remove or update after prototyping, e.g., only "admin" should be able to edit this collection
  Actions.allow({
    insert: (userId, doc) => {
      return false;
    },
    update: (userId, doc, fields, modifier) => {
      return true;
    },
    remove: (userId, doc) => {
      return true;
    },
    fetch: ['owner']
  });

  Meteor.publish('actions', function actionsPublication() {
    // TODO: restrict access based on user permission; right now all docs are public!
    return Actions.find();
  });

  Meteor.methods({
    'actions.insert'(owner, type) {
      check(owner, String);
      check(type, String);

      if (!Meteor.users.findOne(owner)) {
        throw new Meteor.Error('invalid-input', `Invalid owner: ${owner}`);
      }

      if (Actions.findOne({owner, type})) {
        logger.warn(`Skipping; user ${owner} already has an action doc with "type: ${type}" field`);
        return;
      }

      Actions.insert(Object.assign({owner, type}, defaultAction));
    },

    'actions.remove'(owner) {
      if (this.userId || this.connection) {  // server-side call only
        throw new Meteor.Error('not-authorized');
      }

      Actions.remove({owner});
    }
  });

}
