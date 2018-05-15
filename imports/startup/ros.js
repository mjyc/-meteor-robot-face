// TODO: move this out to "imports/server"
// TODO: organize this file according to https://guide.meteor.com/structure.html#example-app-structure
//   Connect immediately and use `rosnodejs.ok` to check the connection later in the startup file
import * as log from 'loglevel';
// import rosnodejs from 'rosnodejs'
import { EventEmitter } from 'events';

const logger = log.getLogger('ros');

let instance = null;
// NOTE: we assume connecting to ROS is instantaneous and reliable; otherwise,
//   we should to return nodeHandle (from "initNode") in a callback.
export const getInstance = () => {
  if (!instance) {
    logger.debug('waiting for ROS');
    // instance = Promise.await(rosnodejs.initNode('simple_face', {onTheFly: true}));
    logger.debug('connected to ROS');
  }
  return instance;
};
