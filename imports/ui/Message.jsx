import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';

import { Messages } from '../api/messages.js';

// Message component - represents a single choice
export default class Message extends Component {
  render() {
    Messages.update(this.props.message._id, {$set: {displayed: true}});
    return (
      <div>{this.props.message.text}</div>
    );
  }
}
