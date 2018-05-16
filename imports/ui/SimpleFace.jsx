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

  render() {
    switch (this.props.speechBubble.type) {
      case 'message':
        return (
          <Message
            message={this.props.speechBubble.data}
            onDisplay={this.props.onDisplay.bind(this, this.props.speechBubble._id)}
          />
        )
      case 'choices':
        return this.props.speechBubble.data.map((choice, index) => {
          choice.onClick = this.props.onClick.bind(this, this.props.speechBubble._id, choice._id)
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

  setDisplayed(faceId, speechBubbleId) {
    Meteor.call('faces.speechBubbles.setDisplayed', faceId, speechBubbleId);
  }

  setClicked(faceId, speechBubbleId, choiceId) {
    Meteor.call('faces.speechBubbles.choices.setClicked', faceId, speechBubbleId, choiceId);
  }

  render() {
    if (this.props.loading) {
      return (
        <div>Loading...</div>
      )
    }

    const face = this.props.face;
    // speechBubbles: [{_id: 'robot', ...}, {_id: 'human', ...}] is inserted on creation
    const robot = face.speechBubbles.find((elem) => { return elem._id === 'robot'; });
    const human = face.speechBubbles.find((elem) => { return elem._id === 'human'; });

    return (
      <div>
        <div>
          <strong>Robot: </strong><SpeechBubble
            key={robot._id}
            speechBubble={robot}
            onDisplay={this.setDisplayed.bind(this, this.props.face._id)}
          />
        </div>
        <div>
          <strong>Human: </strong><SpeechBubble
            key={human._id}
            speechBubble={human}
            onClick={this.setClicked.bind(this, this.props.face._id)}
          />
        </div>
      </div>
    );
  }
}

export default withTracker(({faceQuery}) => {
  const facesHandle = Meteor.subscribe('faces', faceQuery);
  const loading = !facesHandle.ready();
  const face = Faces.findOne();

  return {
    loading,
    face,
  };
})(SimpleFace);
