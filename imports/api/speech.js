import * as log from 'loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
// import { getActionClient } from './action.js';  // TODO: implement a speech action client wrapper

export const Speech = new Mongo.Collection('speech');


if (Meteor.isServer) {

  Meteor.publish('speech', function speechPublication() {
    // TODO: restrict access based on user permission; right now all speechbubbles public!
    return Speech.find();
  });

}
