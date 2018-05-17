import * as log from 'loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';

import { Speechbubbles } from '../api/speechbubbles.js';

const logger = log.getLogger('Speechbubbles');

class Message extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (!this.props.message.text) {
      return null;
    }
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

class Speechbubbles extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (this.props.loading) {
      return (
        <div>Loading...</div>
      )
    }

    this.props.speechbubbles.map((speechbubble) => {
      switch (speechbubble.type) {
        case 'message':
          return (
            <Message
              message={speechbubble.data}
            />
          )
        case 'choices':
          return speechbubble.data.map((choice, index) => {
            choice.onClick = () => {
              Meteor.call('speechbubbles.choices.setClicked', speechbubble._id, choice._id);
            };
            return (
              <Choice
                key={choice._id}
                choice={choice}
              />
            );
          });
        default:
          logger.warn(`Unknown speechbubble.type: ${speechbubble.type}`);
          return null;
      }
    });
  }
}

export default withTracker(({speechbubbleQuery}) => {
  const speechbubblesHandle = Meteor.subscribe('speechbubbles', speechbubbleQuery);
  const loading = !speechbubblesHandle.ready();
  const speechbubbles = Speechbubbles.find().fetch();

  return {
    loading,
    speechbubbles,
  };
})(Speechbubble);
