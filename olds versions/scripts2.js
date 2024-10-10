// Declare state globally
let state = {
  assistant_id: null,
  assistant_name: null,
  threadId: null,
  messages: [],
  user_message: null,
  run_id: null,
};

async function getAssistant() {
  const assistantId = document.getElementById('assistant_id').value;

  try {
    const response = await fetch('/api/assistants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: assistantId }), // Use ID to fetch the assistant
    });

    if (!response.ok) {
      throw new Error('Failed to get assistant');
    }

    const data = await response.json();
    const contextWindow = document.getElementById('context_window');
    contextWindow.value += `${data.assistant_name} is ready to chat.\n`;
    state.assistant_id = data.assistant_id; // Save assistant ID to state

  } catch (error) {
    console.error('Error fetching assistant:', error);
  }
}

async function getThread() {
  try {
    const response = await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to create thread');
    }

    const data = await response.json();
    document.getElementById('thread_id').value = data.threadId;
    state.threadId = data.threadId; // Save thread ID to state

  } catch (error) {
    console.error('Error creating thread:', error);
  }
}

async function inputUserPrompt() {
  const userPrompt = document.getElementById('user_prompt').value;

  console.log("User prompt:", userPrompt);

  if (!state.threadId) {
    alert("Please create a thread first!");
    return;
  }

  // Check for empty input
  if (!userPrompt.trim()) {
    alert("Please enter a prompt.");
    return;
  }

  state.user_message = userPrompt; // Store the user message in state

  try {
    // Send the user message to the thread
    await fetch(`/api/threads/${state.threadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: "user", content: userPrompt }),
    });

    // Clear the input field after sending the message
    document.getElementById('user_prompt').value = '';

    // Update the context window with the sent message
    const contextWindow = document.getElementById('context_window');
    contextWindow.value += `User: ${userPrompt}\n`;

    // Optionally, scroll to the bottom of the context window
    contextWindow.scrollTop = contextWindow.scrollHeight;
  } catch (error) {
    console.error('Error sending user prompt:', error);
  }
}

async function runAgent() {
  const contextWindow = document.getElementById('context_window');

  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: state.user_message }), // Send user message
    });

    if (!response.ok) {
      throw new Error('Failed to run agent');
    }

    const data = await response.json();

    // Log the entire data object to inspect its structure
    console.log('Response data from runAgent:', data);

    const messages = data.messages.data; // Get messages from the nested data property

    // Log the entire data object to inspect its structure
    console.log('messages:', messages);

    if (Array.isArray(messages)) {
      const allMessages = get_all_messages(messages);
      contextWindow.value += `Run completed. Messages:\n${allMessages}\n`;
    } else {
      contextWindow.value += `Error: Unexpected messages format\n`;
    }

    // Set the run_id in the input field
    document.getElementById('run_id').value = data.run_id; // Assuming run_id is returned in the response

  } catch (error) {
    console.error('Error running agent:', error);
    contextWindow.value += `Error: ${error.message}\n`; // Show error in context window
  }
}

function get_all_messages(messages) {
  return messages
    .filter(msg => msg.role === 'assistant') // Filter to only include assistant messages
    .map(msg => {
      const contentText = msg.content.map(part => part.text.value).join(''); // Extract and join text
      return `${msg.role}: ${contentText}`; // Format as "role: message"
    })
    .join('\n');
}

