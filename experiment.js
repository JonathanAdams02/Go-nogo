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
    { prompt: "Please enter your participant ID:", name: "participant_id", required: true }
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
        <p>In this experiment, you will see different colored words.</p>
        <p>If you see the word 'ROOD' or 'GEEL', press the SPACEBAR as quickly as you can.</p>
        <p>If you see the word 'BLAUW', do NOT press any key - just wait for the next word.</p>
        <p>First, you will do 5 practice trials.</p>
        <p>Press any key to start the practice.</p>
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
                    feedbackMessage = `<p style="color: red;">Too slow! Remember to press space for this color.</p>`;
                } else if (!last_trial.is_go_trial && last_trial.response === null) {
                    feedbackMessage = `<p style="color: green;">Correct! Good job not responding.</p>`;
                } else {
                    feedbackMessage = `<p style="color: red;">Incorrect! Remember not to press space for this color.</p>`;
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

// Define end of practice message
let practice_end = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <p>You have completed the practice trials.</p>
        <p>The main experiment will now begin.</p>
        <p>Remember:</p>
        <p>Press SPACEBAR for ROOD and GEEL</p>
        <p>Do NOT press any key for BLAUW</p>
        <p>Press any key to begin the main experiment.</p>
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
    stimulus: "Welcome to the experiment. Press any key to begin."
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

// Add end screen
timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: "<p>Thank you for participating! The experiment is now complete.</p>",
    choices: "NO_KEYS",
    trial_duration: 1000,  // Display the end screen for 3 seconds
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
