import util from 'util';
import * as log from 'loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

const logger = log.getLogger('speechbubbles');

const obj2str = (obj) => { return util.inspect(obj, true, null, true); }

export const Speechbubbles = new Mongo.Collection('speechbubbles');

if (Meteor.isServer) {

  Meteor.startup(() => {
    const initialSpeechbubbles = [
      {
        role: 'robot',
        type: '',
        status: 'idle',  // 'idle' or 'running'
        data: null,  // {} or []
      },
      {
        role: 'human',
        type: '',
        status: 'idle',  // 'idle' or 'running'
        data: null,  // {} or []
      },
    ];

    // insert a demo face
    if (!Speechbubbles.findOne('demo')) {
      initialSpeechbubbles.map((initialSpeechbubble) => {
        Speechbubbles.insert(Object.assign({_id: 'demo', owner: 'demo'}, initialSpeechbubble));
      });
    }
  });


  Meteor.publish('speechbubbles', function speechbubblesPublication() {
    // TODO: restrict access based on user permission; right now all speechbubbles public!
    return Speechbubbles.find();
  });


  const observeHandles = {};

  Meteor.methods({
    'speechbubbles.create'() {
      if (!this.userId) {
        throw new Meteor.Error('not-authorized');
      }

      const numSpeechbubbles = Speechbubbles.find({owner: this.userId}).count();
      if (numSpeechbubbles > 0) {
        logger.warn(`user (${this.userId}) already has ${numSpeechbubbles} speechbubbles.`);
      }

      Speechbubbles.insert({
        text,
        owner: this.userId,
        username: Meteor.users.findOne(this.userId).username,
      });
    },

    'speechbubbles.choices.setClicked'(speechBubbleId, choiceId) {
      check(speechBubbleId, String);
      check(choiceId, Number);

      if (!this.userId) {
        throw new Meteor.Error('not-authorized');
      }

      Speechbubbles.update({
        _id: speechBubbleId,
        type: : 'choices',
        'data.choices._id': choiceId,
      }, {$set: {
        'data.choices.$.clicked': true,
      }});
    },

    'speechbubbles.ask_multiple_choice'(speechbubbleId, choices) {
      this.unblock();
      check(speechbubbleId, String);
      check(choices, [String]);

      if (!this.userId) {
        throw new Meteor.Error('not-authorized');
      }

      return Meteor.wrapAsync((callback) => {

        Speechbubbles.update(
          {
            _id: speechbubbleId,
          }, {$set: {
            type: 'choices',
            data: choices.map((choice, index) => {
              return {
                _id: index,
                text: choice,
              };
            }),
            status: 'running',
          )
        }});

        // add $exists field to search for an event specifically
        observeHandles[speechbubbleId] = Faces.find({
          _id: speechbubbleId,
          type: 'choice',
          status: 'running',
        }).observeChanges({
          changed(id, fields) {
            logger.debug(`(ask_multiple_choice) id: ${id}; fields: ${obj2str(fields)}`);

            // TODO: Use different strategy
            // const clickedChoice = fields.data.find((choice) => {
            //   return !!choice.clicked;
            // })
            // stopFacesObserveHandle(faceId);

            // Faces.update(  // TODO: allow selecting a face
            //   {
            //     _id: faceId,
            //     'speechBubbles._id': speechBubbleId,
            //   },
            //   {$set: {
            //     'speechBubbles.$.type': '',
            //     'speechBubbles.$.data': null
            //   }}
            // );
            // callback (null, clickedChoice.text);
          }
        })
      })();
    },
  });
}
