export { default as SimpleFace } from '../imports/ui/SimpleFace.jsx';

export { Speech as Speech } from '../imports/api/speech.js'


Meteor.startup(() => {

  console.log('---- simple-face client ----');

  var synth = window.speechSynthesis;

  // // findOne for {_id: xx, goalStatus: {exists: true}}
  // Speech.findOne().observeHandles({
  //   changed: (id, field) => {
  //     console.log(id, field);
  //     if (field.goalStatus.status === 'pending') {
  //       // set status to 'active' and start the action
  //       var utterThis = new SpeechSynthesisUtterance('Hello there? How are you doing today?');
  //       utterThis.onend = (event) => {
  //         console.log('SpeechSynthesisUtterance.onend');
  //         // stop the observe handle and change the status to
  //       }
  //       utterThis.onerror = (event) => {
  //         // stop the observe handle (handle.stop())
  //         console.error('SpeechSynthesisUtterance.onerror');
  //       }
  //       synth.speak(utterThis);
  //     }

  //   }
  // });

  // Meteor.setTimeout(() => {
  //   var utterThis = new SpeechSynthesisUtterance("Hello there? How are you doing today?");
  //   synth.speak(utterThis);
  // }, 1000);

});
