// Initialize jsPsych
const jsPsych = initJsPsych({
    on_finish: function(data) {
        // Get participant ID
        let participant_id = jsPsych.data.get().first(1).values()[0].participant_id;
        
        // Get only main trial data (excluding practice and instructions)
        let trial_data = jsPsych.data.get().filter(trial => 
            trial.trial_type === 'html-keyboard-response' && 
            (trial.is_go_trial !== undefined) &&
            !trial.is_practice
        );
        
        // Calculate performance
        let go_trials = trial_data.filter({is_go_trial: true});
        let nogo_trials = trial_data.filter({is_go_trial: false});
        let correct_go = go_trials.filter({correct: 1}).count();
        let correct_nogo = nogo_trials.filter({correct: 1}).count();
        let avg_rt = Math.round(go_trials.filter({correct: 1}).select('rt').mean());
        
        alert(`Experiment complete! 
            \nGO accuracy: ${Math.round((correct_go/go_trials.count())*100)}%
            \nNO-GO accuracy: ${Math.round((correct_nogo/nogo_trials.count())*100)}%
            \nAverage reaction time: ${avg_rt}ms`);
        
        // Save data to CSV
        const csvContent = trial_data.csv();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `gonogo_data_participant_${participant_id}.csv`;
        link.click();
    }
 });
 
 [... participant_id and stimuli definitions remain the same ...]
 
 // Main trial definition
 let single_trial = {
    timeline: [
        {
            type: jsPsychHtmlKeyboardResponse,
            stimulus: '+',
            choices: "NO_KEYS",
            trial_duration: 500
        },
        {
            type: jsPsychHtmlKeyboardResponse,
            stimulus: function() {
                return `<p style="font-size: 48px;">${jsPsych.timelineVariable('Word')}</p>`;
            },
            choices: [' '],
            trial_duration: 2000,
            response_ends_trial: true,
            data: function() {
                return {
                    participant_id: jsPsych.data.get().first(1).values()[0].participant_id,
                    trial_type: jsPsych.timelineVariable('GO') ? 'go' : 'nogo',
                    response: null,
                    correct: null,
                    rt: null,
                    is_practice: false,
                    is_go_trial: jsPsych.timelineVariable('GO')
                };
            },
            on_finish: function(data) {
                data.response = data.response === ' ' ? 1 : 0;
                data.correct = (data.is_go_trial && data.response === 1) || 
                             (!data.is_go_trial && data.response === 0) ? 1 : 0;
                if (data.rt !== null) {
                    data.rt = Math.round(data.rt);
                }
                
                if (data.response !== null && data.response === 1) {
                    jsPsych.pluginAPI.clearAllTimeouts();
                }
            }
        }
    ]
 };
 
 // Define end screen
 let end_screen = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <p>Thank you for participating in this experiment!</p>
        <p>You may now close this window.</p>
    `,
    choices: "NO_KEYS",
    trial_duration: 3000
 };
 
 // Create the timeline
 let timeline = [];
 
 timeline.push(participant_id);
 timeline.push(welcome);
 timeline.push(instructions);
 
 // Practice procedure remains the same
 timeline.push(practice_procedure);
 timeline.push(practice_end);
 
 // Main trials
 let test_procedure = {
    timeline: [single_trial],
    timeline_variables: conditions,
    repetitions: 1
 };
 
 timeline.push(test_procedure);
 timeline.push(end_screen);
 
 // Start the experiment
 jsPsych.run(timeline);