import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';

import { MediaFiles } from '../api/media.js';

const logger = log.getLogger('MediaFileManager');

class MediaFileManager extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (this.props.loading) {
      return (
        <div>Loading...</div>
      )
    };

    return (
      <div>

        <input
          type="file"
          multiple
          onChange={(event) => {
            logger.debug('input changed', event.target.files);

            const reader  = new FileReader();
            reader.addEventListener("load", () => {
              logger.debug('file loaded');
              // Meteor.insert({
              //   filename
              // });

            }, false);
            const file = event.target.files[0]
            if (file) {
              reader.readAsDataURL(file);
            }
          }}
        />

      </div>
    );
  }
}

export default withTracker(({faceQuery}) => {
  const mediaFilesHandle = Meteor.subscribe('media_files');
  const loading = !mediaFilesHandle.ready();
  const mediaFiles = MediaFiles.find().fetch();

  return {
    loading,
    mediaFiles,
  };
})(MediaFileManager);
