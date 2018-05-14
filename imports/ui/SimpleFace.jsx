import * as log from 'loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';

import { Faces } from '../api/faces.js';

 const logger = log.getLogger('SimpleFace');

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
    console.log(this.props.face);

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
  Meteor.subscribe('faces');

  return {
    face: Faces.findOne({owner: Meteor.userId()}),
  };
})(SimpleFace);
