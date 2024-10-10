// Route to handle incoming user messages
app.post('/api/threads/:threadId/messages', async (req, res) => {
    const { threadId } = req.params;
    const { role, content } = req.body;
    
    // Store message in the state
    state.messages.push({ role, content });
    
    // Acknowledge the message has been received
    res.status(200).json({ success: true });
  });
  
  // Route to run the Assistant
  app.post('/api/run', async (req, res) => {
    const { message } = req.body;
    state.messages.push({ role: 'user', content: message });
    state.user_message = message;
  
    try {
      // Send message to the thread
      await openai.beta.threads.messages.create(state.threadId, {
        role: "user",
        content: message,
      });
  
      // Run the assistant and poll for completion
      const run = await openai.beta.threads.runs.createAndPoll(state.threadId, {
        assistant_id: state.assistant_id
      });
  
      // Retrieve the messages after running the assistant
      const messages = await openai.beta.threads.messages.list(state.threadId);
      state.messages = messages; // Update state with all messages
  
      // Send the run_id along with messages
      res.json({ messages: state.messages, run_id: run.id }); // Include run_id in the response
  
    } catch (error) {
      console.error('Error running assistant:', error);
      res.status(500).json({ error: 'Failed to run assistant' });
    }
  });










  async function runAgent() {
    const contextWindow = document.getElementById('context_window');
  
    // Log the messages before sending
    //console.log('State.messages before sending to server:', state.messages);
  
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
      //console.log('Response data from runAgent:', data);
  
      const messages = data.messages.data; // Get messages from the nested data property
  
      // Set the run_id in the input field
      document.getElementById('run_id').value = data.run_id; // Assuming run_id is returned in the response
  
      if (Array.isArray(messages)) {
        const allMessages = get_all_messages(messages);
        contextWindow.value += `Run completed. Messages:\n${allMessages}\n`;
      } else {
        contextWindow.value += `Error: Unexpected messages format\n`;
      }
  
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


  <div class="mb-3">
      <label for="assistant_id" class="form-label">Assistant ID</label>
      <input id="assistant_id" type="text" class="form-control" placeholder="Enter Assistant ID" />
      <button id="get_assistant" class="btn btn-primary mt-2" onclick="getAssistant()">Get Assistant by ID</button>
    </div>

// Route to get the Assistant by ID
app.post('/api/assistants', async (req, res) => {
  const assistantId = req.body.id; // Get assistant ID from request
  try {
    const myAssistant = await openai.beta.assistants.retrieve(assistantId);
    if (myAssistant) {
      state.assistant_id = myAssistant.id;
      state.assistant_name = myAssistant.name;
      res.status(200).json(state);
    } else {
      res.status(404).json({ error: 'Assistant not found' });
    }
  } catch (error) {
    console.error('Error fetching assistant:', error);
    res.status(500).json({ error: 'Failed to fetch assistant' });
  }
});