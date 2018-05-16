import util from 'util';
import * as log from 'loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

const logger = log.getLogger('faces');
logger.setLevel('debug');  // TODO: centralize 'setLevel's somewhere and configure them based on Meteor.settings

const obj2str = (obj) => { return util.inspect(obj, true, null, true); }

export const Faces = new Mongo.Collection('faces');

let facesObserveHandle = {};

const stopFacesObserveHandle = (key) => {
  if (facesObserveHandle[key]) {
    facesObserveHandle[key].stop();
    facesObserveHandle[key] = null;
  }
}


if (Meteor.isServer) {

  Meteor.startup(() => {

    const initialFace = {
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
    };

    // insert a test face
    if (!Faces.findOne('demo')) {
      Faces.insert(Object.assign({_id: 'demo', owner: 'demo'}, initialFace));
    }

    // insert a face obj on user creation
    Meteor.users.after.insert((userId, doc) => {
      logger.debug(`user created: ${userId} ${obj2str(doc)}`);
      Faces.insert(Object.assign({owner: doc._id}, initialFace));
    })

    // remove a face ob on user deletion
    Meteor.users.after.remove((userId, doc) => {
      logger.debug(`user removed: ${userId} ${obj2str(doc)}`);
      Faces.remove({owner: doc._id});
    });

  });


  Meteor.publish('faces', function facesPublication(query) {
    logger.debug(`facesPublication query: ${obj2str(query)}`);
    // TODO: restrict access based on user permission
    return Faces.find(query);
  });


  Meteor.methods({

    'faces.speechBubbles.setDisplayed'(faceId, speechBubbleId) {
      check(faceId, String);
      check(speechBubbleId, String);

      if (!this.userId && faceId !== 'demo') {
        throw new Meteor.Error('not-authorized');
      }

      Faces.update({
        _id: faceId,
        'speechBubbles._id': speechBubbleId,
        'speechBubbles.type':'message',
      }, {$set: {
        'speechBubbles.$.data.displayed': true,
      }});
    },

    'faces.speechBubbles.choices.setClicked'(faceId, speechBubbleId, choiceId) {
      check(faceId, String);
      check(speechBubbleId, String);
      check(choiceId, Number);

      if (!this.userId && faceId !== 'demo') {
        throw new Meteor.Error('not-authorized');
      }

      // Workaround for multiple positional operators, which MongoDB doesn't support:
      //   https://jira.mongodb.org/browse/SERVER-831
      const modifier = {};
      modifier[`speechBubbles.$.data.${choiceId}.clicked`] = true;
      Faces.update({
        _id: faceId,
        'speechBubbles._id': speechBubbleId,
        'speechBubbles.type': 'choices',
      }, {$set: modifier});
    },

    'faces.display_message'(faceId, text) {
      this.unblock();
      check(faceId, String);
      check(text, String);

      if (!this.userId && faceId !== 'demo') {
        throw new Meteor.Error('not-authorized');
      }

      return Meteor.wrapAsync((callback) => {
        stopFacesObserveHandle(faceId);
        const speechBubbleId = 'robot';
        Faces.update(
          {
            _id: faceId,
            'speechBubbles._id': speechBubbleId,
          }, {$set: {
            'speechBubbles.$.type': 'message',
            'speechBubbles.$.data': {
              text,
            }
          }}
        );

        facesObserveHandle[faceId] = Faces.find({
          _id: faceId,
          'speechBubbles._id': speechBubbleId,
        }).observeChanges({
          changed(id, fields) {
            logger.debug(`(display_message) id: ${id}; fields: ${obj2str(fields)}`);

            const speechBubble = fields.speechBubbles.find((elem) => {
              return elem._id === speechBubbleId;
            });
            logger.debug(`(display_message) speechBubble: ${obj2str(speechBubble)}`);

            if (speechBubble.data.displayed) {
              stopFacesObserveHandle(faceId);
              callback(null, true);
            }
          }
        })
      })();
    },

    'faces.ask_multiple_choice'(faceId, choices) {
      this.unblock();
      check(faceId, String);
      check(choices, [String]);

      if (!this.userId && faceId !== 'demo') {
        throw new Meteor.Error('not-authorized');
      }

      return Meteor.wrapAsync((callback) => {
        stopFacesObserveHandle(faceId);
        const speechBubbleId = 'human';
        Faces.update(
          {
            _id: faceId,
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

        facesObserveHandle[faceId] = Faces.find({
          _id: faceId,
          'speechBubbles._id': speechBubbleId,
        }).observeChanges({
          changed(id, fields) {
            logger.debug(`(ask_multiple_choice) id: ${id}; fields: ${obj2str(fields)}`);

            const speechBubble = fields.speechBubbles.find((elem) => {
              return elem._id === speechBubbleId;
            });
            logger.debug(`(ask_multiple_choice) speechBubble: ${obj2str(speechBubble)}`);

            const clickedChoice = speechBubble.data.find((choice) => {
              return !!choice.clicked;
            })
            stopFacesObserveHandle(faceId);
            Faces.update(  // TODO: allow selecting a face
              {
                _id: faceId,
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
    },

  });
}
