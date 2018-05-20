import * as log from 'loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { MeteorAction, defaultAction } from './action.js';

export const Speech = new Mongo.Collection('speech');


if (Meteor.isServer) {

  // console.log(MeteorAction);

  // const id = Speech.insert(defaultAction);
  // const action = new MeteorAction(Speech, id);

  // export class SpeechSynthesisAction {
  //   constructor() {
  //     super();
  //   }
  // }

  console.log('---- speech server ----');

  // constructor() {
  //   // create an doc
  // }

  // // goalId
  // // status
  // // goal
  // // feedback
  // // result



  // getResult
  //   // return promise


  // Speech.deny({
  //   insert: function() { return true; },
  //   update: function() { return true; },
  //   remove: function() { return true; }
  // });

}
