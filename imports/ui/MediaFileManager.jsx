import log from 'meteor/mjyc:loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';

import { MediaFiles } from '../api/media.js';

import Dialog from 'material-ui/Dialog';
import {
  Table,
  TableBody,
  TableHeader,
  TableHeaderColumn,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table';
import FlatButton from 'material-ui/FlatButton';
import RaisedButton from 'material-ui/RaisedButton';
import Checkbox from 'material-ui/Checkbox';

const logger = log.getLogger('MediaFileManager');


class MediaFileManager extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showAll: false,
      skippedFiles: null,
    };
  }

  renderMediaFile(mediaFile) {
    const type = mediaFile.type.substr(0, mediaFile.type.indexOf('/'));
    switch (type) {
      case 'audio':
        return (
          <audio
            controls
            src={mediaFile.data}
            controls
          />
        )
      case 'image':
        return (
          <img
            height="100"
            src={mediaFile.data}
          />
        );
      case 'video':
        return (
          <video
            height="150"
            controls
            src={mediaFile.data}
          />
        );
      default:
        logger.warn('[MediaFileManager.renderMediaFile] unknown type:', type);
        return null;
    }
  }

  render() {
    if (this.props.loading || !this.props.currentUser) {
      return null;
    };

    const previewColSpan = 3;
    return (
      <div>
        <div>
          <RaisedButton
            containerElement='label'
            label="Upload"
          >
            <input
              style={{display: 'none'}}
              type="file"
              multiple
              onChange={(event) => {
                const skippedFiles = [];
                for (let i = event.target.files.length - 1; i >= 0; i--) {
                  const file = event.target.files[i];
                  // default maxFileSize to 5mb
                  if (file.size > (this.props.maxFileSize ? this.props.maxFileSize : 5000000)) {
                    skippedFiles.push(file);
                    continue;
                  }
                  const reader  = new FileReader();
                  reader.addEventListener('load', () => {
                    logger.debug('[MediaFileManager] Inserting file:', file);
                    Meteor.call('media_files.insert', file.name, file.size, file.type, reader.result);
                  });
                  reader.readAsDataURL(file);
                }

                this.setState({
                  skippedFiles: skippedFiles.length > 0 ? skippedFiles : null,
                });
              }}
            />
          </RaisedButton>

          <Checkbox
            label="Show All"
            defaultChecked={this.state.showAll}
            onCheck={(event, isInputChecked) => {
              this.setState({showAll: isInputChecked});
            }}
          />

          <Dialog
            actions={[
              <FlatButton
                label="Ok"
                primary={true}
                onClick={() => {
                  this.setState({skippedFiles: null});
                }}
              />,
            ]}
            modal={false}
            open={!!this.state.skippedFiles}
            onRequestClose={() => {
              this.setState({skippedFiles: null});
            }}
          >
            The following files are too large:
            <ul>
            {
              this.state.skippedFiles && this.state.skippedFiles.map((skippedFile) => {
                return (
                  <li>{skippedFile.name}, {skippedFile.size}, {skippedFile.type}</li>
                );
              })
            }
            </ul>
          </Dialog>
        </div>

        <div>
          <Table
            fixedHeader={true}
            selectable={false}
            style={{margin: 0}}
          >
            <TableHeader
              displaySelectAll={false}
              adjustForCheckbox={false}
            >
              <TableRow>
                <TableHeaderColumn>ID</TableHeaderColumn>
                <TableHeaderColumn>Name</TableHeaderColumn>
                <TableHeaderColumn>Owner</TableHeaderColumn>
                <TableHeaderColumn>Size</TableHeaderColumn>
                <TableHeaderColumn>MIME type</TableHeaderColumn>
                <TableHeaderColumn>Last modified</TableHeaderColumn>
                <TableHeaderColumn colSpan={previewColSpan} >Preview</TableHeaderColumn>
              </TableRow>
            </TableHeader>
            <TableBody displayRowCheckbox={false}>
            {
              this.props.mediaFiles.filter((mediaFile) => {return this.state.showAll || (this.props.currentUser && mediaFile.owner === this.props.currentUser._id)}).map((mediaFile) => {
                return (
                  <TableRow key={mediaFile._id} >
                    <TableRowColumn>{mediaFile._id}</TableRowColumn>
                    <TableRowColumn>{mediaFile.name}</TableRowColumn>
                    <TableRowColumn>{mediaFile.username}</TableRowColumn>
                    <TableRowColumn>{mediaFile.size}</TableRowColumn>
                    <TableRowColumn>{mediaFile.type}</TableRowColumn>
                    <TableRowColumn>
                    {
                      // slice off a name of the day, e.g. 'Mon'
                      mediaFile.updatedAt.toDateString().slice(4)
                    }
                    </TableRowColumn>
                    <TableRowColumn colSpan={previewColSpan} >
                    {
                      this.renderMediaFile(mediaFile)
                    };</TableRowColumn>
                  </TableRow>
                );
              })
            }
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
}

export default withTracker(({maxFileSize}) => {
  const mediaFilesHandle = Meteor.subscribe('media_files');
  const loading = !mediaFilesHandle.ready();
  const mediaFiles = MediaFiles.find().fetch();
  const currentUser = Meteor.user();

  return {
    maxFileSize,
    loading,
    mediaFiles,
    currentUser,
  };
})(MediaFileManager);
