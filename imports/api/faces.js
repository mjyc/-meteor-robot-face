import util from 'util';
import * as log from 'loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

const logger = log.getLogger('faces');
logger.setLevel('debug');  // centralize setLevel somewhere

export const Faces = new Mongo.Collection('faces');

let facesObserveHandle = null;
const stopFacesObserveHandle = () => {
  if (facesObserveHandle) {
    facesObserveHandle.stop();
    facesObserveHandle = null;
  }
}

if (Meteor.isServer) {

  Meteor.startup(() => {
    // insert a face obj on user creation
    Meteor.users.after.insert((userId, doc) => {
      logger.debug(`user created: ${userId} ${util.inspect(doc,true,null)}`);
      Faces.insert({
        owner: doc._id,
        speechBubbles: [
          {
            _id: 'robot',
            type: '',
            data: null,  // {} or []
          },
          {
            _id: 'human',
            type: '',
            data: null,  // {} or []
          },
        ],
      })
    })

    // remove a face ob on user deletion
    Meteor.users.after.remove((userId, doc) => {
      logger.debug(`user removed: ${userId} ${util.inspect(doc,true,null)}`);
      Faces.remove({owner: doc._id});
    });
  });

  Meteor.publish('faces', function facesPublication() {
    // TODO: allow using someone else's face
    return Faces.find({owner: this.userId});
  });

  Meteor.methods({
    'faces.speechBubbles.setDisplayed'(speechBubbleId) {
      check(speechBubbleId, String);

      if (!this.userId) {  // TODO: allow calling it from servers
        throw new Meteor.Error('not-authorized');
      }

      Faces.update({
        owner: this.userId,  // TODO: allow using someone else's face
        'speechBubbles._id': speechBubbleId,
        'speechBubbles.type':'message',
      }, {$set: {
        'speechBubbles.$.data.displayed': true,
      }});
    },

    'faces.speechBubbles.choices.setClicked'(speechBubbleId, choiceId) {
      check(speechBubbleId, String);
      check(choiceId, Number);

      if (!this.userId) {
        throw new Meteor.Error('not-authorized');
      }

      // Workaround for multiple positional operators, which MongoDB doesn't support:
      //   https://jira.mongodb.org/browse/SERVER-831
      const modifier = {};
      modifier[`speechBubbles.$.data.${choiceId}.clicked`] = true;
      Faces.update({
        owner: this.userId,  // TODO: allow using someone else's face
        'speechBubbles._id': speechBubbleId,
        'speechBubbles.type': 'choices',
      }, {$set: modifier});
    },

    display_message(text) {
      this.unblock();
      check(text, String);

      if (!this.userId) {
        throw new Meteor.Error('not-authorized');
      }

      const speechBubbleId = 'robot';
      stopFacesObserveHandle();
      Faces.update(
        {
          owner: this.userId,  // TODO: allow selecting a face
          'speechBubbles._id': speechBubbleId,
        }, {$set: {
          'speechBubbles.$.type': 'message',
          'speechBubbles.$.data': {
            text,
          }
        }}
      );

      const userId = this.userId;
      return Meteor.wrapAsync((callback) => {
        facesObserveHandle = Faces.find({owner: userId}).observeChanges({  // TODO: allow selecting a face
          changed(id, fields) {
            logger.debug(`(display_message) id: ${id}; fields: ${util.inspect(fields,true,null)}`);

            const speechBubble = fields.speechBubbles.find((elem) => {
              return elem._id === speechBubbleId;
            });
            logger.debug(`(display_message) speechBubble: ${util.inspect(speechBubble,true,null)}`);

            if (speechBubble.data.displayed) {
              stopFacesObserveHandle();
              callback(null, true);
            }
          }
        })
      })();
    },

    ask_multiple_choice(choices) {
      this.unblock();
      check(choices, [String]);

      if (!this.userId) {  // TODO: allow selecting a face
        throw new Meteor.Error('not-authorized');
      }

      const speechBubbleId = 'robot';
      stopFacesObserveHandle();
      Faces.update(
        {
          owner: this.userId,  // TODO: allow selecting a face
          'speechBubbles._id': speechBubbleId,
        }, {$set: {
          'speechBubbles.$.type': 'choices',
          'speechBubbles.$.data': choices.map((choice, index) => {
            return {
              _id: index,
              text: choice,
            };
        }
      )
      }});

      const userId = this.userId;
      return Meteor.wrapAsync((callback) => {
        facesObserveHandle = Faces.find({owner: userId}).observeChanges({  // TODO: allow selecting a face
          changed(id, fields) {
            logger.debug(`(ask_multiple_choice) id: ${id}; fields: ${util.inspect(fields,true,null)}`);

            const speechBubble = fields.speechBubbles.find((elem) => {
              return elem._id === speechBubbleId;
            });
            logger.debug(`(ask_multiple_choice) speechBubble: ${util.inspect(speechBubble,true,null)}`);

            const clickedChoice = speechBubble.data.find((choice) => {
              return !!choice.clicked;
            })
            stopFacesObserveHandle();
            Faces.update(  // TODO: allow selecting a face
              {
                owner: userId,
                'speechBubbles._id': speechBubbleId,
              },
              {$set: {
                'speechBubbles.$.type': '',
                'speechBubbles.$.data': null
              }}
            );
            callback (null, clickedChoice.text);
          }
        })
      })();
    }
  });
}
