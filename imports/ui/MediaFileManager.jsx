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

    // TODOs:
    //   1. show available files
    //   2. support preview
    //   3. check filesize && name on upload
    return (
      <div>

        <input
          type="file"
          multiple
          onChange={(event) => {
            logger.debug('input changed', event.target.files);

            for (let i = event.target.files.length - 1; i >= 0; i--) {
              const file = event.target.files[i];
              const reader  = new FileReader();
              reader.addEventListener('load', () => {
                logger.debug('file loaded');
                MediaFiles.insert({
                  filename: 'test',
                  data: reader.result,
                });
              });
              reader.readAsDataURL(file);
            }

          }}
        />

      </div>
    );
  }
}

export default withTracker(() => {
  const mediaFilesHandle = Meteor.subscribe('media_files');
  const loading = !mediaFilesHandle.ready();
  const mediaFiles = MediaFiles.find().fetch();

  return {
    loading,
    // mediaFiles,
  };
})(MediaFileManager);
