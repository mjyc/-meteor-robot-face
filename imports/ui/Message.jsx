import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';

// Message component - represents a single choice
export default class Message extends Component {
  render() {
    return (
      <div>{this.props.message.text}</div>
    );
  }
}
