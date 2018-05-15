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
    Meteor.call('faces.speechBubbles.setDisplayed', this.props.speechBubble._id);
  }

  setClicked(choiceId) {
    Meteor.call('faces.speechBubbles.choices.setClicked', this.props.speechBubble._id, choiceId);
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
  const facesHandle = Meteor.subscribe('faces');
  const loading = !facesHandle.ready();
  const face = Faces.findOne();  // server publishes only one doc  // TODO: allow selecting a face


  return {
    loading,
    face,
  };
})(SimpleFace);
