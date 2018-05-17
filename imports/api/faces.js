import util from 'util';
import * as log from 'loglevel';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { Speechbubbles } from 'meteor/check';

const logger = log.getLogger('faces');

const obj2str = (obj) => { return util.inspect(obj, true, null, true); }

export const Faces = new Mongo.Collection('faces');

if (Meteor.isServer) {

  Meteor.publish('faces', function facesPublication() {
    // TODO: restrict access based on user permission
    return Faces.find();
  });

  Meteor.methods({
    'faces.create'(options = {assignOwner: true}) {
      if (!this.userId) {
        throw new Meteor.Error('not-authorized');
      }

      if (options.assignOwner && Faces.find({owner: this.userId}).count() > 0) {
        logger.warn(`Skipping; user (${this.userId}) already created a face`);
        return;
      }

      // TODO: create speechbubbles
      // TODO:

      const face = {
        owner: options.assignOwner ? this.userId : null,
        username: Meteor.users.findOne(this.userId).username,
      }
      if (options.faceId) {
        face._id = options.faceId;
      }
      Faces.insert(Object.assign({
        role: 'robot',
      }, face));
    },
  });
}
