import { Mongo } from 'meteor/mongo';

export const Choices = new Mongo.Collection('choices');

if (Meteor.isServer) {
  Meteor.publish('choices', () => {
    return Choices.find();
  });
}
