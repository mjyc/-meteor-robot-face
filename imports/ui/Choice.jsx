import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';

// Choice component - represents a single message
export default class Choice extends Component {
  render() {
    return (
      <button>{this.props.choice.text}</button>
    );
  }
}
