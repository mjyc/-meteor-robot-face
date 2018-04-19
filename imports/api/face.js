import * as log from 'loglevel';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

const logger = log.getLogger('face');

export const Face = new Mongo.Collection('face');

if (Meteor.isServer) {
  Meteor.publish('face', () => {
    return Face.find();
  });

  if (!Face.findOne('robot')) {
    Face.insert({
      _id: 'robot',
      type: '',
      data: null,  // {} or []
    })
  }

  if (!Face.findOne('human')) {
    Face.insert({
      _id: 'human',
      type: '',
      data: null,  // {} or []
    })
  }

  Meteor.methods({
    'face.setDisplayed'(id) {
      check(id, String);

      Face.update({
        _id: id,
        'type': 'message'
      }, {$set: {
        'data.displayed': true
      }});
    },

    'face.setClicked'(id, choiceID) {
      check(id, String);
      check(choiceID, Number);

      Face.update({
        _id: id,
        'type': 'choices',
        'data._id': choiceID
      }, {$set: {
        'data.$.clicked': true
      }});
    },

    display_message(id, message) {
      this.unblock();
      check(message, String);

      Face.upsert(id, {$set: {
        type: 'message',
        data: {
          text: message
        }
      }});

      return Meteor.wrapAsync((callback) => {
        // TODO: update find(id) to more specific query
        const handle = Face.find(id).observeChanges({
          changed(id, fields) {
            logger.debug(id, fields);
            if (fields.data.displayed) {
              handle.stop();
              callback(null, true);
            }
          }
        })
      })();
    },

    ask_question(id, choices) {
      this.unblock();
      check(choices, [String]);

      Face.upsert(id, {$set: {
        type: 'choices',
        data: choices.map((choice, index) => {
          return {
            _id: index,
            text: choice,
          };
        })
      }});

      return Meteor.wrapAsync((callback) => {
        const handle = Face.find(id).observeChanges({
          changed(id, fields) {
            logger.debug(id, fields);
            const clicked = fields.data.find((choice) => {
              return choice.clicked;
            })
            handle.stop();
            Face.upsert(id, {$set: {
              type: '',
              data: null
            }});
            callback (null, clicked.text);
          }
        })
      })();
    }
  });
}
