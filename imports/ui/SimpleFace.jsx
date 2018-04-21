import * as log from 'loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';

import { Face } from '../api/face.js';

 const logger = log.getLogger("SimpleFace");

class Message extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (!this.props.message.text) {
      return null;
    }
    this.props.onDisplay();
    return (
      <span>{this.props.message.text}</span>
    );
  }
}

class Choice extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <button onClick={this.props.choice.onClick}>
        {this.props.choice.text}
      </button>
    );
  }
}

class SpeechBubble extends Component {
  constructor(props) {
    super(props);
  }

  setDisplayed() {
    Meteor.call('face.setDisplayed', this.props.speechBubble._id);
  }

  setClicked(choiceID) {
    Meteor.call('face.setClicked', this.props.speechBubble._id, choiceID);
  }

  render() {
    switch (this.props.speechBubble.type) {
      case 'message':
        return (
          <Message
            message={this.props.speechBubble.data}
            onDisplay={this.setDisplayed.bind(this)}
          />
        )
      case 'choices':
        return this.props.speechBubble.data.map((choice, index) => {
          choice.onClick = this.setClicked.bind(this, choice._id)
          return (
            <Choice
              key={choice._id}
              choice={choice}
            />
          );
        });
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
