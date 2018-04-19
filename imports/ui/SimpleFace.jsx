import React, { Component } from 'react';
import { withTracker } from 'meteor/react-meteor-data';

import { Face } from '../api/face.js';


class Message extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (!this.props.message.text) {
      return null;
    }
    this.props.onDisplayed();
    return (
      <span>{this.props.message.text}</span>
    );
  }
}

class SpeechBubble extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    switch (this.props.speechBubble.type) {
      case 'message':
        return (
          <Message
            message={this.props.speechBubble.data}
            onDisplayed={() => {
              Face.upsert(this.props.speechBubble._id, {$set: {
                'data.displayed': true
              }})
            }}
          />
        )
      case 'choice':
        return (
          <div>Display choice here</div>
        )
      default:
        return null;
    }
  }
}

// SimpleFace component - represents the whole app
class SimpleFace extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const robot = this.props.robot ? this.props.robot : {};
    const human = this.props.human ? this.props.human : {};
    const eyes = this.props.eyes ? this.props.eyes : {};

    return (
      <div>
        <div>
          <strong>Robot: </strong><SpeechBubble
            key={robot._id}
            speechBubble={robot}
          />
        </div>
        <div>
          <strong>Human: </strong><SpeechBubble
            key={human._id}
            speechBubble={human}
          />
        </div>
      </div>
    );
  }
}

export default withTracker(() => {
  Meteor.subscribe('face');

  const robot = Face.findOne('robot');
  const human = Face.findOne('human');
  const eyes = Face.findOne('eyes');

  return {
    robot: Face.findOne('robot'),
    human: Face.findOne('human'),
    eyes: Face.findOne('eyes'),
  };
})(SimpleFace);
