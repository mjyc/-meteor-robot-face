import util from 'util';
import * as log from 'loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

const logger = log.getLogger('faces');
logger.setLevel('debug');  // TODO: centralize 'setLevel's somewhere and configure them based on Meteor.settings

export const Faces = new Mongo.Collection('faces');


if (Meteor.isServer) {

  const obj2str = (obj) => { return util.inspect(obj,true,null); }

  Meteor.startup(() => {

    const face = {
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
      Faces.insert(Object.assign({_id: 'demo', owner: 'demo'}, face));
    }

    // insert a face obj on user creation
    Meteor.users.after.insert((userId, doc) => {
      logger.debug(`user created: ${userId} ${obj2str(doc)}`);
      Faces.insert(Object.assign({owner: doc._id}, face));
    })

    // remove a face ob on user deletion
    Meteor.users.after.remove((userId, doc) => {
      logger.debug(`user removed: ${userId} ${obj2str(doc)}`);
      Faces.remove({owner: doc._id});
    });

  });


  const isValidCaller = (userId, clientAddress = '') => {
    return !!userId;
    // return !!userId;
  }

  Meteor.publish('faces', function facesPublication() {
    console.log('publish faces', this.userId);
    console.log('publish user', Meteor.users.findOne(this.userId));
    if (!isValidCaller(this.userId, this.connection.clientAddress)) {
      return Faces.find({owner: 'demo'});
    }
    // TODO: allow using someone else's face
    return Faces.find({owner: this.userId});
  });


  let facesObserveHandle = {};
  const stopFacesObserveHandle = (owner) => {
    if (facesObserveHandle[owner]) {
      facesObserveHandle[owner].stop();
      facesObserveHandle[owner] = null;
    }
  }

  Meteor.methods({

    'faces.speechBubbles.setDisplayed'(speechBubbleId) {
      check(speechBubbleId, String);

      if (!isValidCaller(this.userId, this.connection.clientAddress)) {
        // throw new Meteor.Error('not-authorized');
        this.userId = 'demo';
      }

      const userId = this.userId;
      Faces.update({
        owner: userId,  // TODO: allow using someone else's face
        'speechBubbles._id': speechBubbleId,
        'speechBubbles.type':'message',
      }, {$set: {
        'speechBubbles.$.data.displayed': true,
      }});
    },

    'faces.speechBubbles.choices.setClicked'(speechBubbleId, choiceId) {
      check(speechBubbleId, String);
      check(choiceId, Number);

      if (!isValidCaller(this.userId, this.connection.clientAddress)) {
        // throw new Meteor.Error('not-authorized');
        this.userId = 'demo';
      }

      // Workaround for multiple positional operators, which MongoDB doesn't support:
      //   https://jira.mongodb.org/browse/SERVER-831
      const modifier = {};
      modifier[`speechBubbles.$.data.${choiceId}.clicked`] = true;
      const userId = this.userId;
      Faces.update({
        owner: userId,  // TODO: allow using someone else's face
        'speechBubbles._id': speechBubbleId,
        'speechBubbles.type': 'choices',
      }, {$set: modifier});
    },

    display_message(text) {
      this.unblock();
      check(text, String);

      if (!isValidCaller(this.userId, this.connection.clientAddress)) {
        // throw new Meteor.Error('not-authorized');
        this.userId = 'demo';
      }

      const userId = this.userId;
      stopFacesObserveHandle(userId);
      const speechBubbleId = 'robot';
      Faces.update(
        {
          owner: userId,  // TODO: allow selecting a face
          'speechBubbles._id': speechBubbleId,
        }, {$set: {
          'speechBubbles.$.type': 'message',
          'speechBubbles.$.data': {
            text,
          }
        }}
      );

      return Meteor.wrapAsync((callback) => {
        facesObserveHandle[userId] = Faces.find({owner: userId}).observeChanges({  // TODO: allow selecting a face
          changed(id, fields) {
            logger.debug(`(display_message) id: ${id}; fields: ${obj2str(fields)}`);

            const speechBubble = fields.speechBubbles.find((elem) => {
              return elem._id === speechBubbleId;
            });
            logger.debug(`(display_message) speechBubble: ${obj2str(speechBubble)}`);

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

      if (!isValidCaller(this.userId, this.connection.clientAddress)) {
        // throw new Meteor.Error('not-authorized');
        this.userId = 'demo';
      }

      const userId = this.userId;
      stopFacesObserveHandle(userId);
      const speechBubbleId = 'robot';
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

      return Meteor.wrapAsync((callback) => {
        facesObserveHandle[userId] = Faces.find({owner: userId}).observeChanges({  // TODO: allow selecting a face
          changed(id, fields) {
            logger.debug(`(ask_multiple_choice) id: ${id}; fields: ${obj2str(fields)}`);

            const speechBubble = fields.speechBubbles.find((elem) => {
              return elem._id === speechBubbleId;
            });
            logger.debug(`(ask_multiple_choice) speechBubble: ${obj2str(speechBubble)}`);

            const clickedChoice = speechBubble.data.find((choice) => {
              return !!choice.clicked;
            })
            stopFacesObserveHandle(userId);
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
