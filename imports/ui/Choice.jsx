import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';

import { Choices } from '../api/choices.js';

// Choice component - represents a single message
export default class Choice extends Component {
  render() {
    return (
      <button onClick={() => {
        Choices.update(this.props.choice._id, {$set: {clicked: true}});
      }}
      >{this.props.choice.text}</button>
    );
  }
}
