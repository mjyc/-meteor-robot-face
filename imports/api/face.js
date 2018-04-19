import * as log from 'loglevel';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

const logger = log.getLogger("face");

export const Face = new Mongo.Collection('face');

if (Meteor.isServer) {
  Meteor.publish('face', () => {
    return Face.find();
  });

  if (!Face.findOne('robot')) {
    Face.insert({
      _id: 'robot',
      type: '',
      data: {}
    })
  }

  Meteor.methods({
    'display_message'(text) {
      this.unblock();

      check(text, String);
      Face.upsert('robot', {$set: {
        type: 'message',
        data: {
          text: text
        }
      }});

      return Meteor.wrapAsync((callback) => {
        const handle = Face.find('robot').observeChanges({
          changed(id, fields) {
            logger.debug(id, fields);
            if (fields.data.displayed) {
              handle.stop();
              callback(null, true);
            }
          }
        })
      })();
    }
  });
}


  // // robot = {  // speechbubble
  //   type: 'message, choice, etc.',
  //   data: {  // message
  //     message: //
  //     displayed: false,
  //     canceled: false,
  //   },
  //   // onClick
  //   data: { // choice
  //     choices: ['choice1', 'choice2', ..]  // take one with id
  //     selected: null, // filled with a string
  //     canceled: false,
  //   }
  // }
