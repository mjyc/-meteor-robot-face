import React, { Component } from 'react';
import { Actions } from 'meteor/mjyc:action';

import {
  EyeController,
  EyeExpressionAction,
} from '../api/facial_expression.js';


// Eyes component - represents the two eyes that can express basic emotions
export default class Eyes extends Component {
  constructor(props) {
    super(props);

    this.elements = {};
    this.action = null;
  }

  componentDidMount() {
    const eyeController = new EyeController({
      leftEye: this.elements.leftEye,
      rightEye: this.elements.rightEye,
      upperLeftEyelid: this.elements.upperLeftEyelid,
      upperRightEyelid: this.elements.upperRightEyelid,
      lowerLeftEyelid: this.elements.lowerLeftEyelid,
      lowerRightEyelid: this.elements.lowerRightEyelid,
    });
    eyeController.startBlinking();
    this.action = new EyeExpressionAction(
      Actions,
      this.props.eyeExpressionAction._id,
      eyeController,
    );
  }

  render() {
    const eyeColor = this.props.eyeColor ? this.props.eyeColor : 'black';
    const eyeSize = this.props.eyeSize ? this.props.eyeSize : '200px';  // 1/3 of 600px (height)
    const eyelidColor = this.props.eyelidColor ? this.props.eyelidColor : 'whitesmoke';

    const styles = {
      eye: {
        backgroundColor: eyeColor,
        borderRadius: '100%',
        height: eyeSize,
        width: eyeSize,
        bottom: `calc(${eyeSize} / 3)`,
        zIndex: 1,
        position: 'absolute',
      },
      left: {
        left: `calc(${eyeSize} / 3)`,
      },
      right: {
        right: `calc(${eyeSize} / 3)`,
      },
      eyelid: {
        backgroundColor: eyelidColor,
        height: eyeSize,
        width: `calc(${eyeSize} * 1.75)`,
        zIndex: 2,
        position: 'absolute',
      },
      upper: {
        bottom: `calc(${eyeSize} * 1)`,
        left: `calc(${eyeSize} * -0.375)`,
      },
      lower: {
        borderRadius: '100%',
        bottom: `calc(${eyeSize} * -1)`,
        left: `calc(${eyeSize} * -0.375)`,
      },
    }

    return (
      <div>
        <div
          style={Object.assign({}, styles.eye, styles.left)}
          ref={element => { this.elements['leftEye'] = element; }}
        >
          <div
            style={Object.assign({}, styles.eyelid, styles.upper)}
            ref={element => { this.elements['upperLeftEyelid'] = element; }}
          />
          <div
            style={Object.assign({}, styles.eyelid, styles.lower)}
            ref={element => { this.elements['lowerLeftEyelid'] = element; }}
          />
        </div>
        <div
          style={Object.assign({}, styles.eye, styles.right)}
          ref={element => { this.elements['rightEye'] = element; }}
        >
          <div
            style={Object.assign({}, styles.eyelid, styles.upper)}
            ref={element => { this.elements['upperRightEyelid'] = element; }}
          />
          <div
            style={Object.assign({}, styles.eyelid, styles.lower)}
            ref={element => { this.elements['lowerRightEyelid'] = element; }}
          />
        </div>
      </div>
    )
  }
}
