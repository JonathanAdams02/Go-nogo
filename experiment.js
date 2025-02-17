// Initialize jsPsych
const jsPsych = initJsPsych({
    on_finish: function() {
        downloadData(); // Auto-download data at the end
    }
});

// -------------------------
// Collect Participant ID Before Trials Start
// -------------------------
let participant_id_trial = {
  type: jsPsychSurveyText,
  questions: [
    { prompt: "Voer hier je deelnemer ID in:", name: "participant_id", required: true }
  ],
  on_finish: function(data) {
    jsPsych.data.addProperties({ participant_id: data.response.participant_id });
  }
};

// Define stimuli
let goTrials = [
    { Word: 'ROOD', GO: true },
    { Word: 'GEEL', GO: true }
];

// Create practice trials (3 GO, 2 NO-GO)
let practiceTrial_go = [];
for (let i = 0; i < 3; i++) {
    practiceTrial_go.push(jsPsych.randomization.sampleWithoutReplacement(goTrials, 1)[0]);
}
practiceTrial_go = practiceTrial_go.map(trial => ({ ...trial, is_practice: true }));

let practiceTrial_nogo = Array(2)
    .fill()
    .map(() => ({ Word: 'BLAUW', GO: false, is_practice: true }));

let practiceTrials = [...practiceTrial_go, ...practiceTrial_nogo];
practiceTrials = jsPsych.randomization.shuffle(practiceTrials);

// Create the main trials
let allGoTrials = jsPsych.randomization.repeat(goTrials, 30);
let allNogoTrials = Array(20)
    .fill()
    .map(() => ({ Word: 'BLAUW', GO: false }));
let conditions = [...allGoTrials, ...allNogoTrials].map(trial => ({ ...trial, is_practice: false })); // Ensure is_practice is false

conditions = jsPsych.randomization.shuffle(conditions);

// Define instructions
let instructions = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <p>In dit experiment zie je steeds verschillende woorden.</p>
        <p>Als je op het scherm '<span style="color: red;">ROOD</span>' of '<span style="color: yellow;">GEEL</span>' ziet, druk dan zo snel mogelijk op spatie.</p>
        <p>Als je het woord '<span style="color: blue;">BLAUW</span>' ziet, druk NIET op spatie en wacht op het volgende woord.</p>
        <p>Je krijgt eerst 5 oefenrondes.</p>
        <p>In dit experiment is zowel snelheid als nauwkeurigheid van belang!</p>
        <p>Druk op een willekeurige toets om met het experiment te beginnen.</p>
    `,
    choices: "ALL_KEYS"
};


// Define the practice trial with feedback
let practice_single_trial = {
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
                return `<p style="font-size: 48px; color: ${getWordColor(jsPsych.timelineVariable('Word'))};">${jsPsych.timelineVariable('Word')}</p>`;
            },
            choices: [' '],
            trial_duration: 2000,
            response_ends_trial: true,
            data: function() {
                return {
                    word: jsPsych.timelineVariable('Word'),
                    is_go_trial: jsPsych.timelineVariable('GO'),
                    is_practice: true
                };
            }
        },
        {
            type: jsPsychHtmlKeyboardResponse,
            stimulus: function() {
                let last_trial = jsPsych.data.get().last(1).values()[0];
                let feedbackMessage = '';
                if (last_trial.is_go_trial && last_trial.response === ' ') {
                    feedbackMessage = `<p style="color: green;">Correct!</p>`;
                } else if (last_trial.is_go_trial) {
                    feedbackMessage = `<p style="color: red;">Incorrect!</p>`;
                } else if (!last_trial.is_go_trial && last_trial.response === null) {
                    feedbackMessage = `<p style="color: green;">Correct!</p>`;
                } else {
                    feedbackMessage = `<p style="color: red;">Incorrect!</p>`;
                }
                return feedbackMessage;
            },
            choices: "NO_KEYS",
            trial_duration: 1000
        }
    ],
    on_finish: function(data) {
        if (data.response !== null && data.response === ' ') {
            jsPsych.pluginAPI.clearAllTimeouts();
        }
    }
};

// Define the main trial (no feedback)
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
                return `<p style="font-size: 48px; color: ${getWordColor(jsPsych.timelineVariable('Word'))};">${jsPsych.timelineVariable('Word')}</p>`;
            },
            choices: [' '],
            trial_duration: 2000,
            response_ends_trial: true,
            data: function() {
                return {
                    word: jsPsych.timelineVariable('Word'),
                    is_go_trial: jsPsych.timelineVariable('GO'),
                    is_practice: false
                };
            }
        }
    ],
    on_finish: function(data) {
        if (data.response !== null && data.response === ' ') {
            jsPsych.pluginAPI.clearAllTimeouts();
        }
    }
};

// Define end of practice message (Dutch)
let practice_end = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <p>Je hebt de oefenrondes voltooid.</p>
        <p>Het hoofdexperiment zal nu beginnen.</p>
        <p>Druk op een willekeurige toets om te beginnen.</p>
    `,
    choices: "ALL_KEYS"
};


// Function to get the color based on the word
function getWordColor(word) {
    switch (word) {
        case 'ROOD':
            return 'red';
        case 'GEEL':
            return 'yellow';
        case 'BLAUW':
            return 'blue';
        default:
            return 'black';
    }
}

// Timeline
let timeline = [];
timeline.push(participant_id_trial); // Ensure participant ID is first

// Add welcome screen
timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: "Welkom bij dit experiment, druk op een willekeurige toets om te beginnen."
});
timeline.push(instructions);

// Add practice trials with feedback
timeline.push({
    timeline: [practice_single_trial],
    timeline_variables: practiceTrials,
    repetitions: 1
});
timeline.push(practice_end);

// Add main trials
timeline.push({
    timeline: [single_trial],
    timeline_variables: conditions,
    repetitions: 1
});

// Add end screen with mean RT and mean accuracy
timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function() {
        // Get all trials (excluding practice trials)
        let trial_data = jsPsych.data.get().filter({ is_practice: false }).values();
        
        // Calculate the mean RT for GO trials
        let go_trials = trial_data.filter(trial => trial.is_go_trial === true);
        let mean_rt = go_trials.length > 0 ? 
                      go_trials.reduce((acc, trial) => acc + trial.rt, 0) / go_trials.length 
                      : 0;
        
        // Calculate the mean accuracy for all trials
        let total_trials = trial_data.length;
        let correct_trials = trial_data.filter(trial => {
            return (trial.is_go_trial && trial.response === ' ') || 
                   (!trial.is_go_trial && trial.response === null);
        }).length;

        let accuracy = total_trials > 0 ? correct_trials / total_trials : 0;

        return `
            <p>Bedankt voor het meedoen!</p>
            <p>Het experiment is nu voltooid.</p>
            <p>Wacht tot de data is gedownload, daarna kan je dit tabblad sluiten.</p>
            <p>Gemiddelde RT voor GO-trials: ${mean_rt.toFixed(2)} ms</p>
            <p>Gemiddelde nauwkeurigheid: ${(accuracy * 100).toFixed(2)}%</p>
        `;
    },
    choices: "NO_KEYS",
    trial_duration: 1000,  // Show this screen for 5 seconds
    on_finish: function() {
        downloadData(); // Automatically download the data when the end screen appears
    }
});

// Function to download data
function downloadData() {
    let trial_data = jsPsych.data.get().filter({ is_practice: false }).values();

    if (!Array.isArray(trial_data)) {
        console.error("Error: trial_data is not an array.");
        return;
    }

    let cleaned_data = trial_data.map(trial => {
        const correct = (trial.is_go_trial && trial.response === ' ') || 
                        (!trial.is_go_trial && trial.response === null) ? 1 : 0;

        return {
            participant_id: trial.participant_id || "UNKNOWN",
            trial_type: trial.is_go_trial ? 1 : 0, // 1 for GO, 0 for NO-GO
            response: trial.response === ' ' ? 1 : 0, // 1 for space, 0 for no space
            correct: correct, // 1 for correct, 0 for incorrect
            rt: trial.rt || 0 // Reaction time (default to 0 if missing)
        };
    });

    // Manually convert cleaned data to CSV format
    let csvContent = "participant_id,trial_type,response,correct,rt\n";
    cleaned_data.forEach(row => {
        csvContent += `${row.participant_id},${row.trial_type},${row.response},${row.correct},${row.rt}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gonogo_data_participant_${jsPsych.data.get().first(1).values()[0]?.participant_id || "UNKNOWN"}.csv`;
    
    // Check if automatic download fails
    link.click();

    // Create and show manual download button if download was blocked
    if (!link.download) {
        const manualDownloadDiv = document.createElement('div');
        manualDownloadDiv.innerHTML = `
            <p>If your download didn't start automatically, click below to download your data.</p>
            <button id="manualDownloadButton">Download Data</button>
        `;
        document.body.appendChild(manualDownloadDiv);
        
        // Add event listener for manual download button
        document.getElementById('manualDownloadButton').addEventListener('click', () => {
            link.click(); // Trigger download when button is clicked
        });
    }
}

// Start the experiment
jsPsych.run(timeline);
