import * as log from 'loglevel';
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';

import { Speechbubbles } from '../api/speechbubbles.js';

const logger = log.getLogger('SimpleFace');

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

export default withTracker(({speechbubbleQuery}) => {
  const speechbubblesHandle = Meteor.subscribe('speechbubbles', speechbubbleQuery);
  const loading = !speechbubblesHandle.ready();
  const speechbubbles = Speechbubbles.find().fetch();

  return {
    loading,
    speechbubbles,
  };
})(Speechbubble);
