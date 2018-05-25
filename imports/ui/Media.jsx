import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';

import {
  MediaFiles,
} from '../api/media.js';

const logger = log.getLogger('MediaUI');

class MediaUI extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (this.props.loading) {
      return (
        <div>Loading...</div>
      )
    };

    const testFile = this.props.mediaFiles.find((mediaFile) => {
      return mediaFile.filename === 'test';
    });

    if (testFile && testFile.data) {
      return (
        <video src={testFile.data}/>
      );
    } else {
      return null;
    }

    // switch (this.props.speechbubble.type) {
    //   case '':
    //     return null;
    //   case 'image':
    //     return (
    //       <span>{this.props.speechbubble.data.message}</span>
    //     )
    //   case 'video':
    //     return this.props.speechbubble.data.choices.map((choice, index) => {
    //       return (
    //         <button
    //           key={index}
    //           onClick={() => {
    //             Meteor.call('speechbubbles.choices.setSelected', this.props.speechbubble._id, choice);
    //           }}
    //         >
    //           {choice}
    //         </button>
    //       );
    //     });
    //   default:
    //     logger.warn(`Unknown speechbubble.type: ${this.props.speechbubble.type}`);
    //     return null;
    // }

  }
}

export default withTracker(() => {
  const mediaFilesHandle = Meteor.subscribe('media_files');
  const loading = !mediaFilesHandle.ready();

  const mediaFiles = MediaFiles.find().fetch();

  return {
    loading,
    mediaFiles
  };
})(MediaUI);
