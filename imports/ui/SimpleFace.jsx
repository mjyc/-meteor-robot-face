import React, { Component } from 'react';
import { withTracker } from 'meteor/react-meteor-data';

import { Messages } from '../api/messages.js';
import { Choices } from '../api/choices.js';

import Message from './Message.jsx';
import Choice from './Choice.jsx';

// SimpleFace component - represents the whole app
class SimpleFace extends Component {
  constructor(props) {
    super(props);
  }

  renderMessages() {
    return this.props.messages.map((message) => {
      return (
        <Message
          key={message._id}
          message={message}
        />
      );
    });
  }
  renderChoices() {
    return this.props.choices.map((choice) => {
      return (
        <Choice
          key={choice._id}
          choice={choice}
        />
      );
    });
  }

  render() {
    return (
      <div>
        {this.renderMessages()}
        {this.renderChoices()}
      </div>
    );
  }
}

export default withTracker(() => {
  return {
    messages: Messages.find().fetch(),
    choices: Choices.find().fetch(),
  };
})(SimpleFace);
