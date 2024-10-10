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
  
    if (!state.threadId) {
      alert("Please create a thread first!");
      return;
    }
  
    // Check for empty input
    if (!userPrompt.trim()) {
      alert("Please enter a prompt.");
      return;
    }

    // Concatenate the new user prompt to the existing prompts
    if (state.user_message) {
      state.user_message += '\n' + userPrompt; // Add a space for separation
    } else {
      state.user_message = userPrompt;
    }

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

      if (!state.user_message) {
        throw new Error('Please ensure you have entered a User Prompt.');
      }

      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: state.user_message }), // Send user message
      });
  
      if (!response.ok) {
        throw new Error('Failed to run agent');
      }
  
      const data = await response.json();
      state.messages = data.messages; // Get messages from the nested data property
      const messages = state.messages; 

      if (Array.isArray(messages)) {
        const allMessages = get_latest_message(messages);
        contextWindow.value += `Run completed. Messages:\n${allMessages}\n`;
      } else {
        contextWindow.value += `Error: Unexpected messages format\n`;
      }
  
      // Set the run_id in the input field
      document.getElementById('run_id').value = data.run_id; // Assuming run_id is returned in the response
      
      state.user_message = "";
  
    } catch (error) {
      console.error('Error running agent:', error);
      contextWindow.value += `Error: ${error.message}\n`; // Show error in context window
    }
  }
  
  function get_latest_message(messages) {
    const assistantMessages = messages.filter(msg => msg.role === 'assistant'); // Filter to include only assistant messages
  
    // Check if there are any assistant messages
    if (assistantMessages.length === 0) {
      return 'No messages from assistant.'; // Return a message if none exist
    }
  
    // Get the latest message
    const latestMessage = assistantMessages[0];
  
    return `${latestMessage.role}: ${latestMessage.content}`; // Return formatted string for the latest message
  }
  