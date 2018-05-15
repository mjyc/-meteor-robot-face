import util from 'util';
import * as log from 'loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

const logger = log.getLogger('faces');
logger.setLevel('debug');  // centralize setLevel somewhere

export const Faces = new Mongo.Collection('faces');

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
    'faces.speechBubbles.setDisplayed'(id) {
      check(id, String);

      if (!this.userId) {  // TODO: allow calling it from servers
        throw new Meteor.Error('not-authorized');
      }

      Faces.update({
        owner: this.userId,  // TODO: allow using someone else's face
        'speechBubbles._id': id,
      }, {$set: {
        'speechBubbles.$.data.displayed': true,
      }});
    },

    // 'faces.speechBubbles.setClicked'(id, choiceID) {
    //   check(id, String);
    //   check(choiceID, Number);

    //   if (!this.userId) {
    //     throw new Meteor.Error('not-authorized');
    //   }

    //   Face.update({
    //     _id: id,
    //     'type': 'choices',
    //     'data._id': choiceID
    //   }, {$set: {
    //     'data.$.clicked': true
    //   }});
    // },

    display_message(text) {
      this.unblock();
      check(text, String);

      if (!this.userId) {
        throw new Meteor.Error('not-authorized');
      }

      const speechBubbleId = 'robot';
      Faces.update({
        owner: this.userId,  // TODO: allow selecting a face
        'speechBubbles._id': speechBubbleId,
      }, {
        $set: {
          'speechBubbles.$.type' : 'message',
          'speechBubbles.$.data' : {
            text,
          }
        }
      });

      const userId = this.userId;
      return Meteor.wrapAsync((callback) => {
        const handle = Faces.find({owner: userId}).observeChanges({
          changed(id, fields) {
            logger.debug(id, fields);
            const speechBubble = fields.speechBubbles.find((elem) => {
              return elem._id === speechBubbleId;
            });
            if (speechBubble.data.displayed) {
              handle.stop();
              callback(null, true);
            }
          }
        })
      })();
    },

  //   ask_multiple_choice(id, choices) {
  //     this.unblock();
  //     check(choices, [String]);

  //     if (!this.userId && !this.connection) {  // TODO: make it configurable
  //       throw new Meteor.Error('not-authorized');
  //     }

  //     Face.upsert(id, {$set: {
  //       type: 'choices',
  //       data: choices.map((choice, index) => {
  //         return {
  //           _id: index,
  //           text: choice,
  //         };
  //       })
  //     }});

  //     return Meteor.wrapAsync((callback) => {
  //       const handle = Face.find(id).observeChanges({
  //         changed(id, fields) {
  //           logger.debug(id, fields);
  //           const clicked = fields.data.find((choice) => {
  //             return choice.clicked;
  //           })
  //           handle.stop();
  //           Face.upsert(id, {$set: {
  //             type: '',
  //             data: null
  //           }});
  //           callback (null, clicked.text);
  //         }
  //       })
  //     })();
  //   }
  // });

  // if (Meteor.settings.ros.enabled) {
  //   import rosnodejs from 'rosnodejs'
  //   import ROS from '../startup/ros'

  //   const nh = ROS.getInstance();
  //   const as = new rosnodejs.ActionServer({
  //     nh,
  //     type: 'simple_face/AskMultipleChoice',
  //     actionServer: '/ask_multiple_choice'
  //   });

  //   as.on('goal', Meteor.bindEnvironment((handle) => {
  //     handle.setAccepted();
  //     const goal = handle.getGoal();
  //     logger.log(`goal: ${goal}`);
  //     handle.setSucceeded(as._createMessage('result'));
  //   }));

  //   as.start();
  });
}
