import util from 'util';
import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';

import { MediaFiles } from '../api/media.js';

const logger = log.getLogger('Speechbubble');

const obj2str = (obj) => { return util.inspect(obj, true, null, true); }


// Speechbubble component - represents a speech bubble that can display text,
//   image, or video
export default class Speechbubble extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const speechbubble = this.props.speechbubble;
    switch (speechbubble.type) {
      case '':
        return null;
      case 'message':
        this.props.setSucceeded();
        return (
          <span>{speechbubble.data.message}</span>
        )
      case 'choices':
        return speechbubble.data.choices.map((choice, index) => {
          return (
            <button
              key={index}
              onClick={() => {
                this.props.reset((err, result) => {
                  this.props.setSucceeded({choice, index});
                });
              }}
            >
              {choice}
            </button>
          );
        });
      case 'image':
        const image = MediaFiles.findOne(speechbubble.data.query);
        if (!image) {
          this.props.reset((err, res) => {
            this.props.setAborted({
              message: `Invalid input query: ${obj2str(speechbubble.data.query)}`
            });
          });
          return null;
        }
        this.props.setSucceeded();
        return (
          <img
            height="100"
            src={image.data}
          />
        );
      case 'video':
        const video = MediaFiles.findOne(speechbubble.data.query);
        if (!video) {
          this.props.reset((err, res) => {
            this.props.setAborted({
              message: `Invalid input query: ${obj2str(speechbubble.data.query)}`
            });
          });
          return null;
        }
        return (
          <video
            height="100"
            src={video.data}
            onEnded={() => {
              this.props.reset((err, res) => {
                this.props.setSucceeded();
              });
            }}
            onError={() => {
              this.props.reset((err, res) => {
                this.props.setAborted();
              });
            }}
            autoPlay
          />
        );
      default:
        logger.warn(`Unknown speechbubble.type: ${speechbubble.type}`);
        return null;
    }
  }
}
