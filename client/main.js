export { default as SimpleFace } from '../imports/ui/SimpleFace.jsx';

Meteor.startup(() => {

  import { Speech } from '../imports/api/speech.js';
  import { getActionServer } from '../imports/api/action.js';

  console.log('Speech initialized!');

  synth = window.speechSynthesis;
  as = getActionServer(Speech, 'q96hiauAmJ5RnDLsm');
  // TODO: use ...
  as.on('goal', (actionGoal) => {
    console.log('goal', actionGoal);

    const utterThis = new SpeechSynthesisUtterance(actionGoal.goal.text);
    utterThis.onend = (event) => {
      console.log('SpeechSynthesisUtterance.onend');
      as._set({
        status: 'succeeded',
        results: {},
      });
    }
    synth.speak(utterThis);
  });
  as.on('cancel', (result) => {
    console.log('cancel', result);
    as._set({
      status: 'canceled',
      result: null,
    })
  });

});
