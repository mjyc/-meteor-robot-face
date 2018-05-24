import '../imports/api/media.js'

// TODO: consider not exporting some variables
export * as action from '../imports/api/action.js'

export {
  Speechbubbles as Speechbubbles,
  DisplayMessageAction as DisplayMessageAction,
  AskMultipleChoiceAction as AskMultipleChoiceAction,
} from '../imports/api/speechbubbles.js'

export {
  Speech
} from '../imports/api/speech.js'
